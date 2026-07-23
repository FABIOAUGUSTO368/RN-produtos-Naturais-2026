import { randomUUID } from "node:crypto";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { centsToReais, type OrderRecord } from "./store-db";

function getMercadoPagoClient() {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("Configure MERCADO_PAGO_ACCESS_TOKEN para ativar o pagamento real.");
  }

  return new MercadoPagoConfig({
    accessToken,
  });
}

function getMercadoPagoAccessToken() {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim();
  if (!accessToken) {
    throw new Error("Configure MERCADO_PAGO_ACCESS_TOKEN para ativar o pagamento real.");
  }

  return accessToken;
}

function getMercadoPagoErrorMessage(body: string) {
  try {
    const parsed = JSON.parse(body) as { message?: unknown; error?: unknown; cause?: unknown };
    const message = parsed.message ?? parsed.error ?? parsed.cause;
    return typeof message === "string" ? message : body;
  } catch {
    return body;
  }
}

function getWebhookUrl() {
  const webhookUrl = process.env.MERCADO_PAGO_WEBHOOK_URL?.trim();

  // Mercado Pago needs to reach this address from the internet. Localhost only
  // works on the merchant's own computer, so it must not be sent in development.
  return webhookUrl?.startsWith("https://") ? webhookUrl : undefined;
}

function getPreferenceReturnUrls(baseUrl: string, orderId: string) {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const isPublicHttpsUrl = /^https:\/\/.+/i.test(normalizedBaseUrl);

  if (!isPublicHttpsUrl) {
    return undefined;
  }

  return {
    success: `${normalizedBaseUrl}/checkout/result?order_id=${orderId}`,
    failure: `${normalizedBaseUrl}/checkout/result?order_id=${orderId}`,
    pending: `${normalizedBaseUrl}/checkout/result?order_id=${orderId}`,
  };
}

type MercadoPagoPixTransactionData = {
  qr_code?: string;
  qr_code_base64?: string;
  ticket_url?: string;
};

function extractPixTransactionData(payload: any) {
  const payment =
    payload?.transactions?.payments?.[0] ??
    payload?.point_of_interaction?.transaction_data ??
    payload?.payment ??
    null;

  const paymentMethod = payment?.payment_method ?? payment ?? {};
  const transactionData: MercadoPagoPixTransactionData =
    paymentMethod?.qr_code || paymentMethod?.qr_code_base64 || paymentMethod?.ticket_url
      ? paymentMethod
      : payload?.point_of_interaction?.transaction_data ?? {};

  const qrCode = String(transactionData.qr_code ?? "");
  const qrCodeBase64 = String(transactionData.qr_code_base64 ?? "");
  const ticketUrl = String(transactionData.ticket_url ?? "");

  if (!qrCode || !qrCodeBase64 || !ticketUrl) {
    return null;
  }

  return {
    paymentId: String(payment?.id ?? payload?.id ?? ""),
    status: String(payment?.status ?? payload?.status ?? "pending"),
    statusDetail: String(payment?.status_detail ?? payload?.status_detail ?? "waiting_transfer"),
    qrCode,
    qrCodeBase64,
    ticketUrl,
  };
}

export async function createMercadoPagoPreference(order: OrderRecord, baseUrl: string) {
  const backUrls = getPreferenceReturnUrls(baseUrl, order.id);

  const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getMercadoPagoAccessToken()}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": randomUUID(),
    },
    body: JSON.stringify({
      items: order.items.map((item) => ({
        id: item.productId,
        title: item.name,
        quantity: item.quantity,
        unit_price: centsToReais(item.priceCents),
        currency_id: "BRL",
      })),
      external_reference: order.id,
      ...(getWebhookUrl() ? { notification_url: getWebhookUrl() } : {}),
      ...(backUrls ? { auto_return: "approved", back_urls: backUrls } : {}),
    }),
  });

  const responseBody = await response.text();
  if (!response.ok) {
    const details = getMercadoPagoErrorMessage(responseBody);
    throw new Error(`Mercado Pago recusou a criacao do checkout (HTTP ${response.status}): ${details || "sem detalhes"}`);
  }

  let preference: { id?: string; init_point?: string; sandbox_init_point?: string };
  try {
    preference = JSON.parse(responseBody) as typeof preference;
  } catch {
    throw new Error("Mercado Pago retornou uma resposta vazia ao criar o checkout.");
  }

  return {
    preferenceId: preference.id ?? null,
    initPoint: preference.init_point ?? preference.sandbox_init_point ?? "",
    sandboxInitPoint: preference.sandbox_init_point ?? null,
  };
}

export async function createMercadoPagoPixPayment(order: OrderRecord, baseUrl: string) {
  const response = await fetch("https://api.mercadopago.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getMercadoPagoAccessToken()}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": randomUUID(),
    },
    body: JSON.stringify({
      type: "online",
      total_amount: (order.totalCents / 100).toFixed(2),
      external_reference: order.id,
      processing_mode: "automatic",
      ...(getWebhookUrl() ? { notification_url: getWebhookUrl() } : {}),
      transactions: {
        payments: [
          {
            amount: (order.totalCents / 100).toFixed(2),
            payment_method: {
              id: "pix",
              type: "bank_transfer",
            },
          },
        ],
      },
      payer: {
        email: order.customer.email,
      },
    }),
  });

  const responseBody = await response.text();
  if (!response.ok) {
    const details = getMercadoPagoErrorMessage(responseBody);
    throw new Error(`Mercado Pago recusou a criacao do PIX (HTTP ${response.status}): ${details || "sem detalhes"}`);
  }

  let payload: any;
  try {
    payload = JSON.parse(responseBody);
  } catch {
    throw new Error("Mercado Pago retornou uma resposta vazia ao criar o PIX.");
  }

  const pix = extractPixTransactionData(payload);
  if (!pix) {
    throw new Error("Mercado Pago não retornou os dados do PIX.");
  }

  return pix;
}

export async function fetchMercadoPagoPayment(paymentId: string | number) {
  const client = getMercadoPagoClient();
  const payment = new Payment(client);
  return payment.get({ id: Number(paymentId) });
}
