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
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
      },
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

export async function fetchMercadoPagoPayment(paymentId: string | number) {
  const client = getMercadoPagoClient();
  const payment = new Payment(client);
  return payment.get({ id: Number(paymentId) });
}
