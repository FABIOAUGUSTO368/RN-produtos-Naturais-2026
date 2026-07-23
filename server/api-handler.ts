import { z } from "zod";
import {
  attachPaymentPreference,
  attachPaymentData,
  createOrder,
  getOverview,
  getOrderById,
  getOrderByExternalReference,
  listOrders,
  listProducts,
  listStock,
  listDashboard,
  setInventoryQuantity,
  updateOrderAfterPayment,
  updateOrderStatus,
  type CheckoutPayload,
  type OrderStatus,
} from "./store-db.js";
import { createMercadoPagoPreference, createMercadoPagoPixPayment, fetchMercadoPagoPayment } from "./payments.js";

const checkoutSchema = z.object({
  customer: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(8),
  }),
  address: z.object({
    zip: z.string().min(5),
    street: z.string().min(3),
    number: z.string().min(1),
    neighborhood: z.string().min(2),
    city: z.string().min(2),
    state: z.string().min(2),
    complement: z.string().optional(),
  }),
  paymentMethod: z.enum(["pix", "card"]),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.string().min(1),
      name: z.string().min(1).optional(),
      image: z.string().optional(),
      category: z.string().optional(),
      unit: z.string().optional(),
      weight: z.number().positive(),
      quantity: z.number().int().positive(),
      price: z.number().positive(),
    })
  ).min(1),
});

const stockUpdateSchema = z.object({
  quantity: z.number().int().nonnegative(),
  reason: z.string().optional(),
});

const orderStatusSchema = z.object({
  status: z.enum(["pending_payment", "paid", "preparing", "shipped", "delivered", "cancelled"]),
});

const adminTokenSchema = z.string().min(1);

function jsonResponse(status: number, body: unknown) {
  return {
    status,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function textResponse(status: number, body: string) {
  return {
    status,
    headers: { "Content-Type": "text/plain" },
    body,
  };
}

function getBaseUrl(headers: Record<string, string | string[] | undefined>, fallback = "http://localhost:3000") {
  const explicit = process.env.PUBLIC_APP_URL;
  if (explicit) {
    return explicit.replace(/\/+$/, "");
  }

  const hostHeader = headers.host;
  const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
  if (!host) {
    return fallback;
  }

  const protoHeader = headers["x-forwarded-proto"];
  const proto = Array.isArray(protoHeader) ? protoHeader[0] : protoHeader;
  return `${proto ?? "http"}://${host}`.replace(/\/+$/, "");
}

function getAdminToken(headers: Record<string, string | string[] | undefined>) {
  const header = headers["x-admin-token"];
  if (Array.isArray(header)) {
    return header[0];
  }

  return header;
}

function isAdminAuthorized(headers: Record<string, string | string[] | undefined>) {
  const expected = process.env.ADMIN_ACCESS_TOKEN ?? "admin-dev";
  return adminTokenSchema.safeParse(getAdminToken(headers)).success && getAdminToken(headers) === expected;
}

function parseJsonBody(body: string | undefined) {
  if (!body) {
    return {};
  }

  return JSON.parse(body) as unknown;
}

export interface ApiRequestLike {
  method?: string;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: string;
}

export async function handleApiRequest(request: ApiRequestLike) {
  const method = (request.method ?? "GET").toUpperCase();
  const url = new URL(request.url ?? "/", "http://local.test");
  const pathname = url.pathname;
  const headers = request.headers ?? {};

  try {
    if (method === "GET" && pathname === "/api/products") {
      return jsonResponse(200, { products: await listProducts() });
    }

    if (method === "POST" && pathname === "/api/checkout") {
      const payload = checkoutSchema.parse(parseJsonBody(request.body)) as CheckoutPayload;
      const order = await createOrder(payload);
      try {
        if (payload.paymentMethod === "pix") {
          const pix = await createMercadoPagoPixPayment(order, getBaseUrl(headers));
          if (pix.paymentId) {
            await attachPaymentData(order.id, { paymentId: pix.paymentId });
          }

          const freshOrder = await getOrderById(order.id);

          return jsonResponse(201, {
            order: freshOrder,
            paymentMethod: payload.paymentMethod,
            pix,
          });
        }

        const preference = await createMercadoPagoPreference(order, getBaseUrl(headers));
        if (preference.preferenceId) {
          await attachPaymentPreference(order.id, preference.preferenceId);
        }

        const freshOrder = await getOrderById(order.id);

        return jsonResponse(201, {
          order: freshOrder,
          paymentMethod: payload.paymentMethod,
          initPoint: preference.initPoint,
          sandboxInitPoint: preference.sandboxInitPoint,
        });
      } catch (error) {
        await updateOrderAfterPayment({
          orderId: order.id,
          paymentStatus: "failed",
          status: "cancelled",
        });
        throw error;
      }
    }

    if (method === "GET" && pathname.match(/^\/api\/orders\/[^/]+$/)) {
      const orderId = pathname.split("/").pop() ?? "";
      const order = await getOrderById(orderId);
      if (!order) {
        return jsonResponse(404, { error: "Pedido não encontrado." });
      }

      return jsonResponse(200, { order });
    }

    if (method === "GET" && pathname === "/api/admin/overview") {
      if (!isAdminAuthorized(headers)) {
        return jsonResponse(401, { error: "Não autorizado." });
      }

      return jsonResponse(200, await getOverview());
    }

    if (method === "GET" && pathname === "/api/admin/products") {
      if (!isAdminAuthorized(headers)) {
        return jsonResponse(401, { error: "Não autorizado." });
      }

      return jsonResponse(200, { products: await listStock() });
    }

    if (method === "GET" && pathname === "/api/admin/orders") {
      if (!isAdminAuthorized(headers)) {
        return jsonResponse(401, { error: "Não autorizado." });
      }

      return jsonResponse(200, { orders: await listOrders() });
    }

    if (method === "GET" && pathname === "/api/admin/dashboard") {
      if (!isAdminAuthorized(headers)) {
        return jsonResponse(401, { error: "Não autorizado." });
      }

      return jsonResponse(200, await listDashboard());
    }

    if (method === "PATCH" && pathname.match(/^\/api\/admin\/stock\/[^/]+$/)) {
      if (!isAdminAuthorized(headers)) {
        return jsonResponse(401, { error: "Não autorizado." });
      }

      const productId = pathname.split("/").pop() ?? "";
      const payload = stockUpdateSchema.parse(parseJsonBody(request.body));
      const updated = await setInventoryQuantity(productId, payload.quantity, payload.reason);
      return jsonResponse(200, { product: updated });
    }

    if (method === "PATCH" && pathname.match(/^\/api\/admin\/orders\/[^/]+\/status$/)) {
      if (!isAdminAuthorized(headers)) {
        return jsonResponse(401, { error: "Não autorizado." });
      }

      const orderId = pathname.split("/")[4];
      const payload = orderStatusSchema.parse(parseJsonBody(request.body));
      const updated = await updateOrderStatus(orderId, payload.status as OrderStatus);
      return jsonResponse(200, { order: updated });
    }

    if (method === "POST" && pathname === "/api/payments/mercadopago/webhook") {
      const payload = request.body ? parseJsonBody(request.body) : {};
      const paymentId = String(
        (payload as any)?.data?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? ""
      );

      if (!paymentId) {
        return jsonResponse(200, { ok: true });
      }

      const payment = await fetchMercadoPagoPayment(paymentId);
      const externalReference = String((payment as any).external_reference ?? "");
      const order = externalReference ? await getOrderByExternalReference(externalReference) : null;

      if (!order) {
        return jsonResponse(200, { ok: true });
      }

      const paymentStatus = String((payment as any).status ?? "pending");
      if (paymentStatus === "approved") {
        await updateOrderAfterPayment({
          orderId: order.id,
          paymentId: String((payment as any).id ?? paymentId),
          paymentStatus: "confirmed",
          status: "preparing",
        });
      } else if (["rejected", "cancelled", "refunded", "charged_back"].includes(paymentStatus)) {
        await updateOrderAfterPayment({
          orderId: order.id,
          paymentId: String((payment as any).id ?? paymentId),
          paymentStatus: "failed",
          status: "cancelled",
        });
      }

      return jsonResponse(200, { ok: true });
    }

    return null;
  } catch (error) {
    return jsonResponse(400, { error: error instanceof Error ? error.message : String(error) });
  }
}
