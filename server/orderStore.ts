import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type OrderPaymentMethod = "pix" | "card" | "boleto";

export interface OrderItemInput {
  productId: string;
  name: string;
  image: string;
  category: string;
  unit: string;
  weight: number;
  quantity: number;
  price: number;
}

export interface OrderInput {
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  address: {
    zip: string;
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    complement?: string;
  };
  paymentMethod: OrderPaymentMethod;
  notes?: string;
  items: OrderItemInput[];
}

export interface OrderRecord extends OrderInput {
  id: string;
  orderNumber: string;
  createdAt: string;
  subtotal: number;
  shipping: number;
  total: number;
  status: "received" | "paid" | "preparing" | "out_for_delivery" | "delivered";
}

const ORDERS_FILE = path.resolve(process.cwd(), "data", "orders.json");

async function ensureOrdersFile() {
  await mkdir(path.dirname(ORDERS_FILE), { recursive: true });

  try {
    await readFile(ORDERS_FILE, "utf-8");
  } catch {
    await writeFile(ORDERS_FILE, "[]", "utf-8");
  }
}

export async function readOrders(): Promise<OrderRecord[]> {
  await ensureOrdersFile();
  const raw = await readFile(ORDERS_FILE, "utf-8");
  const parsed = JSON.parse(raw) as OrderRecord[];
  return Array.isArray(parsed) ? parsed : [];
}

export async function writeOrders(orders: OrderRecord[]) {
  await ensureOrdersFile();
  await writeFile(ORDERS_FILE, `${JSON.stringify(orders, null, 2)}\n`, "utf-8");
}

export function calculateSubtotal(items: OrderItemInput[]) {
  return Number(
    items
      .reduce((total, item) => total + item.price * item.quantity, 0)
      .toFixed(2)
  );
}

export function calculateShipping(subtotal: number) {
  return subtotal >= 120 ? 0 : 18.9;
}

export function buildOrderRecord(input: OrderInput, sequence: number): OrderRecord {
  const subtotal = calculateSubtotal(input.items);
  const shipping = calculateShipping(subtotal);
  const total = Number((subtotal + shipping).toFixed(2));
  const orderNumber = `RN-${String(sequence).padStart(4, "0")}`;

  return {
    ...input,
    id: crypto.randomUUID(),
    orderNumber,
    createdAt: new Date().toISOString(),
    subtotal,
    shipping,
    total,
    status: "received",
  };
}

export async function createOrder(input: OrderInput) {
  const orders = await readOrders();
  const order = buildOrderRecord(input, orders.length + 1);
  orders.push(order);
  await writeOrders(orders);
  return order;
}

export async function getLatestOrder() {
  const orders = await readOrders();
  return orders.at(-1) ?? null;
}
