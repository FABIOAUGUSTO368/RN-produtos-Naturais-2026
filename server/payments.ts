import { MercadoPagoConfig, Payment, Preference } from "mercadopago";
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

export async function createMercadoPagoPreference(order: OrderRecord, baseUrl: string) {
  const client = getMercadoPagoClient();
  const preference = new Preference(client);

  const response = await preference.create({
    body: {
      items: order.items.map((item) => ({
        id: item.productId,
        title: item.name,
        quantity: item.quantity,
        unit_price: centsToReais(item.priceCents),
        currency_id: "BRL",
      })),
      external_reference: order.id,
      notification_url: process.env.MERCADO_PAGO_WEBHOOK_URL ?? `${baseUrl}/api/payments/mercadopago/webhook`,
      auto_return: "approved",
      back_urls: {
        success: `${baseUrl}/checkout/result?order_id=${order.id}`,
        failure: `${baseUrl}/checkout/result?order_id=${order.id}`,
        pending: `${baseUrl}/checkout/result?order_id=${order.id}`,
      },
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
      },
    },
  });

  return {
    preferenceId: response.id ?? null,
    initPoint: response.init_point ?? response.sandbox_init_point ?? "",
    sandboxInitPoint: response.sandbox_init_point ?? null,
  };
}

export async function fetchMercadoPagoPayment(paymentId: string | number) {
  const client = getMercadoPagoClient();
  const payment = new Payment(client);
  return payment.get({ id: Number(paymentId) });
}
