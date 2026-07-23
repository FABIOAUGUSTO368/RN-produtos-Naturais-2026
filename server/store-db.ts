import fs from "node:fs/promises";
import path from "node:path";
import initSqlJs from "sql.js";
import { PRODUCTS, findProductById, type CartItem, type StoreProduct } from "../shared/store-data.ts";

export type PaymentMethod = "pix" | "card";
export type OrderStatus = "pending_payment" | "paid" | "preparing" | "shipped" | "delivered" | "cancelled";
export type PaymentStatus = "pending" | "confirmed" | "failed";
export type ReservationStatus = "reserved" | "consumed" | "released";

export interface CheckoutPayload {
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
  paymentMethod: PaymentMethod;
  notes?: string;
  items: CartItem[];
}

export interface ProductRecord extends StoreProduct {
  priceCents: number;
  stockQuantity: number;
  lowStock: boolean;
}

export interface OrderItemRecord {
  id: string;
  orderId: string;
  productId: string;
  name: string;
  category: string;
  unit: string;
  weight: number;
  quantity: number;
  priceCents: number;
  subtotalCents: number;
}

export interface OrderRecord {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  paymentPreferenceId: string | null;
  paymentId: string | null;
  mercadopagoStatus: string | null;
  externalReference: string;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  reservationStatus: ReservationStatus;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  address: CheckoutPayload["address"];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItemRecord[];
}

export interface CheckoutResult {
  order: OrderRecord;
  initPoint: string;
  sandboxInitPoint?: string | null;
}

export interface AdminOverview {
  totalOrders: number;
  paidOrders: number;
  revenueCents: number;
  lowStockCount: number;
  activeProducts: number;
}

export interface StockRow extends ProductRecord {
  minThreshold: number;
}

const DB_FILE = path.resolve(process.cwd(), "data", "rn-casa-do-norte.sqlite");
const WASM_FILE = path.resolve(process.cwd(), "node_modules", "sql.js", "dist", "sql-wasm.wasm");

let sqlPromise: Promise<any> | null = null;
let dbPromise: Promise<any> | null = null;
let dbInstance: any | null = null;

function nowIso() {
  return new Date().toISOString();
}

function centsToReais(cents: number) {
  return Number((cents / 100).toFixed(2));
}

function reaisToCents(value: number) {
  return Math.round(value * 100);
}

function toJson(value: unknown) {
  return JSON.stringify(value);
}

function fromJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || !value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function run(db: any, sql: string, params: Array<string | number | null> = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  stmt.step();
  stmt.free();
}

function all(db: any, sql: string, params: Array<string | number | null> = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: Record<string, unknown>[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function get(db: any, sql: string, params: Array<string | number | null> = []) {
  return all(db, sql, params)[0] ?? null;
}

async function persist(db: any) {
  await fs.mkdir(path.dirname(DB_FILE), { recursive: true });
  await fs.writeFile(DB_FILE, Buffer.from(db.export()));
}

function createSchema(db: any) {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      category_id TEXT NOT NULL,
      category TEXT NOT NULL,
      price_cents INTEGER NOT NULL,
      unit TEXT NOT NULL,
      image TEXT NOT NULL,
      badge TEXT,
      badge_variant TEXT,
      initial_stock INTEGER NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inventory (
      product_id TEXT PRIMARY KEY,
      quantity INTEGER NOT NULL,
      min_threshold INTEGER NOT NULL DEFAULT 5000,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_number TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL,
      payment_status TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      payment_preference_id TEXT,
      payment_id TEXT,
      mercadopago_status TEXT,
      external_reference TEXT NOT NULL,
      subtotal_cents INTEGER NOT NULL,
      shipping_cents INTEGER NOT NULL,
      total_cents INTEGER NOT NULL,
      reservation_status TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      address_json TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      unit TEXT NOT NULL,
      weight INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      price_cents INTEGER NOT NULL,
      subtotal_cents INTEGER NOT NULL,
      FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      order_id TEXT,
      type TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      reason TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
    );
  `);
}

function seedCatalog(db: any) {
  const createdAt = nowIso();
  const insertProduct = db.prepare(`
    INSERT OR IGNORE INTO products (
      id, name, description, category_id, category, price_cents, unit, image, badge, badge_variant, initial_stock, active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);
  const insertInventory = db.prepare(`
    INSERT OR IGNORE INTO inventory (product_id, quantity, min_threshold, updated_at)
    VALUES (?, ?, ?, ?)
  `);

  for (const product of PRODUCTS) {
    insertProduct.run([
      product.id,
      product.name,
      product.description,
      product.categoryId,
      product.category,
      reaisToCents(product.price),
      product.unit,
      product.image,
      product.badge ?? null,
      product.badgeVariant ?? null,
      product.initialStock,
      createdAt,
      createdAt,
    ]);
    insertInventory.run([product.id, product.initialStock, 5000, createdAt]);
  }

  insertProduct.free();
  insertInventory.free();
}

async function initializeDb() {
  const SQL = await getSql();
  let db;

  try {
    const existing = await fs.readFile(DB_FILE);
    db = new SQL.Database(existing);
  } catch {
    db = new SQL.Database();
  }

  createSchema(db);
  seedCatalog(db);
  await persist(db);
  dbInstance = db;
  return db;
}

async function getSql() {
  if (!sqlPromise) {
    sqlPromise = initSqlJs({
      locateFile: () => WASM_FILE,
    });
  }

  return sqlPromise;
}

async function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  if (!dbPromise) {
    dbPromise = initializeDb();
  }

  dbInstance = await dbPromise;
  return dbInstance;
}

function mapProduct(row: Record<string, unknown>): ProductRecord {
  return {
    id: String(row.id),
    name: String(row.name),
    description: String(row.description),
    categoryId: String(row.category_id) as ProductRecord["categoryId"],
    category: String(row.category),
    price: centsToReais(Number(row.price_cents)),
    priceCents: Number(row.price_cents),
    unit: String(row.unit),
    image: String(row.image),
    badge: row.badge ? String(row.badge) : undefined,
    badgeVariant: row.badge_variant ? (String(row.badge_variant) as ProductRecord["badgeVariant"]) : undefined,
    initialStock: Number(row.initial_stock),
    stockQuantity: Number(row.quantity),
    lowStock: Number(row.quantity) <= Number(row.min_threshold),
  };
}

function mapOrderItem(row: Record<string, unknown>): OrderItemRecord {
  return {
    id: String(row.id),
    orderId: String(row.order_id),
    productId: String(row.product_id),
    name: String(row.name),
    category: String(row.category),
    unit: String(row.unit),
    weight: Number(row.weight),
    quantity: Number(row.quantity),
    priceCents: Number(row.price_cents),
    subtotalCents: Number(row.subtotal_cents),
  };
}

function mapOrder(row: Record<string, unknown>, items: OrderItemRecord[] = []): OrderRecord {
  return {
    id: String(row.id),
    orderNumber: String(row.order_number),
    status: String(row.status) as OrderStatus,
    paymentStatus: String(row.payment_status) as PaymentStatus,
    paymentMethod: String(row.payment_method) as PaymentMethod,
    paymentPreferenceId: row.payment_preference_id ? String(row.payment_preference_id) : null,
    paymentId: row.payment_id ? String(row.payment_id) : null,
    mercadopagoStatus: row.mercadopago_status ? String(row.mercadopago_status) : null,
    externalReference: String(row.external_reference),
    subtotalCents: Number(row.subtotal_cents),
    shippingCents: Number(row.shipping_cents),
    totalCents: Number(row.total_cents),
    reservationStatus: String(row.reservation_status) as ReservationStatus,
    customer: {
      name: String(row.customer_name),
      email: String(row.customer_email),
      phone: String(row.customer_phone),
    },
    address: fromJson(row.address_json, {
      zip: "",
      street: "",
      number: "",
      neighborhood: "",
      city: "",
      state: "",
      complement: "",
    }),
    notes: row.notes ? String(row.notes) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    items,
  };
}

function calculateSubtotalCents(items: CartItem[]) {
  return items.reduce((total, item) => total + Math.round(item.price * 100) * item.quantity, 0);
}

function calculateShippingCents(subtotalCents: number) {
  return subtotalCents >= 12000 ? 0 : 1890;
}

function buildOrderNumber() {
  return `RN-${Date.now().toString().slice(-8)}`;
}

async function getProductsWithRows(db?: any) {
  const database = db ?? (await getDb());
  return all(
    database,
    `
      SELECT
        p.*,
        i.quantity,
        i.min_threshold
      FROM products p
      LEFT JOIN inventory i ON i.product_id = p.id
      WHERE p.active = 1
      ORDER BY p.category, p.name
    `
  ).map(mapProduct);
}

async function getProductById(productId: string, db?: any) {
  const database = db ?? (await getDb());
  const row = get(
    database,
    `
      SELECT
        p.*,
        i.quantity,
        i.min_threshold
      FROM products p
      LEFT JOIN inventory i ON i.product_id = p.id
      WHERE p.id = ?
      LIMIT 1
    `,
    [productId]
  );

  return row ? mapProduct(row) : null;
}

function assertAvailability(items: CartItem[], productRows: Map<string, ProductRecord>) {
  const requiredByProduct = new Map<string, number>();

  for (const item of items) {
    const required = item.weight * item.quantity;
    requiredByProduct.set(item.productId, (requiredByProduct.get(item.productId) ?? 0) + required);
  }

  for (const [productId, required] of Array.from(requiredByProduct.entries())) {
    const product = productRows.get(productId);
    if (!product) {
      throw new Error(`Produto ${productId} não encontrado.`);
    }

    if (product.stockQuantity < required) {
      throw new Error(`Estoque insuficiente para ${product.name}.`);
    }
  }
}

async function syncOrderItems(orderId: string, items: OrderItemRecord[]) {
  const db = await getDb();
  const insertItem = db.prepare(`
    INSERT INTO order_items (
      id, order_id, product_id, name, category, unit, weight, quantity, price_cents, subtotal_cents
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const item of items) {
    insertItem.run([
      item.id,
      orderId,
      item.productId,
      item.name,
      item.category,
      item.unit,
      item.weight,
      item.quantity,
      item.priceCents,
      item.subtotalCents,
    ]);
  }

  insertItem.free();
}

async function syncStockMovement(db: any, movement: {
  id: string;
  productId: string;
  orderId?: string | null;
  type: string;
  quantity: number;
  reason?: string | null;
}) {
  const stmt = db.prepare(`
    INSERT INTO stock_movements (id, product_id, order_id, type, quantity, reason, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run([
    movement.id,
    movement.productId,
    movement.orderId ?? null,
    movement.type,
    movement.quantity,
    movement.reason ?? null,
    nowIso(),
  ]);
  stmt.free();
}

async function adjustInventory(db: any, productId: string, delta: number, reason: string, orderId?: string | null) {
  const current = get(db, `SELECT quantity FROM inventory WHERE product_id = ? LIMIT 1`, [productId]);
  if (!current) {
    throw new Error(`Produto ${productId} sem estoque cadastrado.`);
  }

  const nextQuantity = Number(current.quantity) + delta;
  if (nextQuantity < 0) {
    throw new Error("Estoque insuficiente para a operação.");
  }

  run(
    db,
    `UPDATE inventory SET quantity = ?, updated_at = ? WHERE product_id = ?`,
    [nextQuantity, nowIso(), productId]
  );

  await syncStockMovement(db, {
    id: crypto.randomUUID(),
    productId,
    orderId,
    type: delta >= 0 ? "in" : "out",
    quantity: Math.abs(delta),
    reason,
  });
}

export async function listProducts() {
  return getProductsWithRows(await getDb());
}

export async function listStock() {
  const db = await getDb();
  return all(
    db,
    `
      SELECT
        p.*,
        i.quantity,
        i.min_threshold
      FROM products p
      JOIN inventory i ON i.product_id = p.id
      WHERE p.active = 1
      ORDER BY p.category, p.name
    `
  ).map((row) => ({
    ...mapProduct(row),
    minThreshold: Number(row.min_threshold),
  })) as StockRow[];
}

export async function getOverview(): Promise<AdminOverview> {
  const db = await getDb();
  const totalOrders = Number(get(db, `SELECT COUNT(*) as count FROM orders`)?.count ?? 0);
  const paidOrders = Number(
    get(db, `SELECT COUNT(*) as count FROM orders WHERE payment_status = 'confirmed'`)?.count ?? 0
  );
  const revenueRow = get(
    db,
    `SELECT COALESCE(SUM(total_cents), 0) as total FROM orders WHERE payment_status = 'confirmed'`
  );
  const lowStockCount = Number(
    get(
      db,
      `
        SELECT COUNT(*) as count
        FROM inventory
        WHERE quantity <= min_threshold
      `
    )?.count ?? 0
  );
  const activeProducts = Number(get(db, `SELECT COUNT(*) as count FROM products WHERE active = 1`)?.count ?? 0);

  return {
    totalOrders,
    paidOrders,
    revenueCents: Number(revenueRow?.total ?? 0),
    lowStockCount,
    activeProducts,
  };
}

export async function getOrderById(orderId: string) {
  const db = await getDb();
  const row = get(db, `SELECT * FROM orders WHERE id = ? LIMIT 1`, [orderId]);
  if (!row) {
    return null;
  }

  const items = all(db, `SELECT * FROM order_items WHERE order_id = ? ORDER BY name`, [orderId]).map(mapOrderItem);
  return mapOrder(row, items);
}

export async function getOrderByExternalReference(externalReference: string) {
  const db = await getDb();
  const row = get(db, `SELECT * FROM orders WHERE external_reference = ? LIMIT 1`, [externalReference]);
  if (!row) {
    return null;
  }

  const items = all(db, `SELECT * FROM order_items WHERE order_id = ? ORDER BY name`, [String(row.id)]).map(mapOrderItem);
  return mapOrder(row, items);
}

export async function listOrders() {
  const db = await getDb();
  const orders = all(db, `SELECT * FROM orders ORDER BY created_at DESC`);

  return orders.map((order) => {
    const items = all(db, `SELECT * FROM order_items WHERE order_id = ? ORDER BY name`, [String(order.id)]).map(mapOrderItem);
    return mapOrder(order, items);
  });
}

export async function setInventoryQuantity(
  productId: string,
  quantity: number,
  reason = "Ajuste manual",
  adminOrderId?: string
) {
  const db = await getDb();
  const current = get(db, `SELECT quantity FROM inventory WHERE product_id = ? LIMIT 1`, [productId]);
  if (!current) {
    throw new Error("Produto não encontrado no estoque.");
  }

  const delta = quantity - Number(current.quantity);
  run(db, `UPDATE inventory SET quantity = ?, updated_at = ? WHERE product_id = ?`, [quantity, nowIso(), productId]);
  await syncStockMovement(db, {
    id: crypto.randomUUID(),
    productId,
    orderId: adminOrderId ?? null,
    type: "adjustment",
    quantity: Math.abs(delta),
    reason,
  });
  await persist(db);
  return getProductById(productId, db);
}

async function reserveStock(db: any, items: CartItem[], orderId: string, paymentMethod: PaymentMethod) {
  const products = new Map((await listProducts()).map((product) => [product.id, product]));
  assertAvailability(items, products);

  const insertOrder = db.prepare(`
    INSERT INTO orders (
      id, order_number, status, payment_status, payment_method, payment_preference_id, payment_id, mercadopago_status,
      external_reference, subtotal_cents, shipping_cents, total_cents, reservation_status,
      customer_name, customer_email, customer_phone, address_json, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const subtotalCents = calculateSubtotalCents(items);
  const shippingCents = calculateShippingCents(subtotalCents);
  const totalCents = subtotalCents + shippingCents;
  const orderNumber = buildOrderNumber();
  const createdAt = nowIso();

  insertOrder.run([
    orderId,
    orderNumber,
    "pending_payment",
    "pending",
    paymentMethod,
    null,
    null,
    null,
    orderId,
    subtotalCents,
    shippingCents,
    totalCents,
    "reserved",
    "",
    "",
    "",
    toJson({}),
    null,
    createdAt,
    createdAt,
  ]);
  insertOrder.free();

  await syncOrderItems(
    orderId,
    items.map((item) => {
      const priceCents = Math.round(item.price * 100);
      const subtotalItemCents = priceCents * item.quantity;

      return {
        id: crypto.randomUUID(),
        orderId,
        productId: item.productId,
        name: item.name,
        category: item.category,
        unit: item.unit,
        weight: item.weight,
        quantity: item.quantity,
        priceCents,
        subtotalCents: subtotalItemCents,
      };
    })
  );

  for (const item of items) {
    await adjustInventory(db, item.productId, -item.weight * item.quantity, `Reserva do pedido ${orderNumber}`, orderId);
  }

  const row = get(db, `SELECT * FROM orders WHERE id = ? LIMIT 1`, [orderId]);
  if (!row) {
    throw new Error("Falha ao registrar o pedido.");
  }

  return mapOrder(row, all(db, `SELECT * FROM order_items WHERE order_id = ? ORDER BY name`, [orderId]).map(mapOrderItem));
}

export async function createOrder(payload: CheckoutPayload) {
  const db = await getDb();

  if (!payload.items.length) {
    throw new Error("Carrinho vazio.");
  }

  const orderId = crypto.randomUUID();
  db.exec("BEGIN");

  try {
    const order = await reserveStock(db, payload.items, orderId, payload.paymentMethod);

    run(
      db,
      `
        UPDATE orders
        SET
          customer_name = ?,
          customer_email = ?,
          customer_phone = ?,
          address_json = ?,
          notes = ?,
          updated_at = ?
        WHERE id = ?
      `,
      [
        payload.customer.name,
        payload.customer.email,
        payload.customer.phone,
        toJson(payload.address),
        payload.notes ?? null,
        nowIso(),
        orderId,
      ]
    );

    db.exec("COMMIT");
    await persist(db);

    const refreshed = await getOrderById(orderId);
    if (!refreshed) {
      throw new Error("Pedido criado, mas não pôde ser lido.");
    }

    return refreshed;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export async function attachPaymentPreference(orderId: string, preferenceId: string) {
  return attachPaymentData(orderId, { paymentPreferenceId: preferenceId });
}

export async function attachPaymentData(
  orderId: string,
  data: { paymentId?: string | null; paymentPreferenceId?: string | null }
) {
  const db = await getDb();
  const order = await getOrderById(orderId);
  if (!order) {
    throw new Error("Pedido não encontrado.");
  }

  run(
    db,
    `UPDATE orders SET payment_preference_id = ?, payment_id = ?, updated_at = ? WHERE id = ?`,
    [data.paymentPreferenceId ?? null, data.paymentId ?? null, nowIso(), orderId]
  );
  await persist(db);
  return getOrderById(orderId);
}

export async function updateOrderAfterPayment(params: {
  orderId: string;
  paymentId?: string | null;
  paymentStatus: string;
  status: OrderStatus;
}) {
  const db = await getDb();
  const order = await getOrderById(params.orderId);
  if (!order) {
    throw new Error("Pedido não encontrado.");
  }

  run(
    db,
    `
      UPDATE orders
      SET payment_id = ?, mercadopago_status = ?, payment_status = ?, status = ?, reservation_status = ?, updated_at = ?
      WHERE id = ?
    `,
    [
      params.paymentId ?? null,
      params.paymentStatus,
      params.paymentStatus === "confirmed" ? "confirmed" : params.paymentStatus === "failed" ? "failed" : "pending",
      params.status,
      params.paymentStatus === "failed" && order.reservationStatus === "reserved" ? "released" : "consumed",
      nowIso(),
      params.orderId,
    ]
  );

  if (params.paymentStatus === "failed" && order.reservationStatus === "reserved") {
    for (const item of order.items) {
      await adjustInventory(db, item.productId, item.weight * item.quantity, `Liberação do pedido ${order.orderNumber}`, order.id);
    }
  }

  await persist(db);
  return getOrderById(params.orderId);
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const db = await getDb();
  const order = await getOrderById(orderId);
  if (!order) {
    throw new Error("Pedido não encontrado.");
  }

  run(db, `UPDATE orders SET status = ?, updated_at = ? WHERE id = ?`, [status, nowIso(), orderId]);
  await persist(db);
  return getOrderById(orderId);
}

export async function listDashboard() {
  const [overview, stock, orders] = await Promise.all([getOverview(), listStock(), listOrders()]);
  return { overview, stock, orders };
}

export async function getPublicOrder(orderId: string) {
  return getOrderById(orderId);
}

export { centsToReais, reaisToCents, findProductById };
