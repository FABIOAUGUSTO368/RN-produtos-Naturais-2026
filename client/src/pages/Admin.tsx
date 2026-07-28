import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Banknote,
  BarChart3,
  Boxes,
  ChevronRight,
  ClipboardList,
  Gauge,
  Megaphone,
  Package,
  PencilLine,
  PlusCircle,
  RefreshCw,
  Save,
  ShoppingCart,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type OrderStatus = "pending_payment" | "paid" | "preparing" | "shipped" | "delivered" | "cancelled";

interface AdminOverview {
  totalOrders: number;
  paidOrders: number;
  revenueCents: number;
  lowStockCount: number;
  activeProducts: number;
  suppliersCount: number;
  promotionsCount: number;
}

interface AdminProduct {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  category: string;
  price: number;
  basePriceCents: number;
  priceCents: number;
  unit: string;
  image: string;
  badge?: string | null;
  badgeVariant?: string | null;
  initialStock: number;
  stockQuantity: number;
  lowStock: boolean;
  active: boolean;
  supplierId?: string | null;
  supplierName?: string | null;
  promoActive: boolean;
  promoLabel?: string | null;
  promoPriceCents?: number | null;
  minThreshold?: number;
  createdAt: string;
  updatedAt: string;
}

interface AdminSupplier {
  id: string;
  name: string;
  contact: string;
  email?: string | null;
  city?: string | null;
  notes?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AdminOrderItem {
  id: string;
  name: string;
  quantity: number;
  priceCents: number;
  subtotalCents: number;
}

interface AdminOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: string;
  paymentMethod: string;
  totalCents: number;
  customer: {
    name: string;
    email: string;
  };
  createdAt: string;
  items: AdminOrderItem[];
}

interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  orderId?: string | null;
  type: "in" | "out" | "adjustment";
  quantity: number;
  reason?: string | null;
  createdAt: string;
}

interface DashboardResponse {
  overview: AdminOverview;
  stock: AdminProduct[];
  orders: AdminOrder[];
  products: AdminProduct[];
  suppliers: AdminSupplier[];
  movements: StockMovement[];
}

interface ProductDraft {
  name: string;
  description: string;
  categoryId: string;
  category: string;
  price: string;
  unit: string;
  image: string;
  badge: string;
  badgeVariant: string;
  initialStock: string;
  active: boolean;
  supplierId: string;
  promoLabel: string;
  promoActive: boolean;
  promoPrice: string;
}

interface SupplierDraft {
  name: string;
  contact: string;
  email: string;
  city: string;
  notes: string;
  active: boolean;
}

type StockMovementMode = "adjustment" | "in" | "out";

interface StockDraft {
  quantity: string;
  movementType: StockMovementMode;
  reason: string;
}

const STORAGE_KEY = "rn-admin-token";
const ORDER_STATUSES: OrderStatus[] = ["pending_payment", "paid", "preparing", "shipped", "delivered", "cancelled"];
const CATEGORY_OPTIONS = [
  { id: "carnes secas", label: "Carnes secas" },
  { id: "cuscuz e massas", label: "Cuscuz e massas" },
  { id: "farinhas", label: "Farinhas" },
  { id: "laticínios", label: "Laticínios" },
  { id: "pratos regionais", label: "Pratos regionais" },
  { id: "produtos naturais", label: "Produtos naturais" },
];

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function loadToken() {
  if (typeof window === "undefined") {
    return "admin-dev";
  }

  return window.localStorage.getItem(STORAGE_KEY) ?? "admin-dev";
}

function statusLabel(status: OrderStatus) {
  const labels: Record<OrderStatus, string> = {
    pending_payment: "Aguardando pagamento",
    paid: "Pago",
    preparing: "Preparando",
    shipped: "Saiu para entrega",
    delivered: "Entregue",
    cancelled: "Cancelado",
  };

  return labels[status];
}

function statusClass(status: OrderStatus) {
  const classes: Record<OrderStatus, string> = {
    pending_payment: "bg-amber-100 text-amber-900",
    paid: "bg-emerald-100 text-emerald-900",
    preparing: "bg-blue-100 text-blue-900",
    shipped: "bg-indigo-100 text-indigo-900",
    delivered: "bg-green-100 text-green-900",
    cancelled: "bg-rose-100 text-rose-900",
  };

  return classes[status];
}

function movementLabel(type: StockMovement["type"]) {
  const labels: Record<StockMovement["type"], string> = {
    in: "Entrada",
    out: "Saída",
    adjustment: "Ajuste",
  };

  return labels[type];
}

function movementClass(type: StockMovement["type"]) {
  const classes: Record<StockMovement["type"], string> = {
    in: "bg-emerald-100 text-emerald-900",
    out: "bg-rose-100 text-rose-900",
    adjustment: "bg-slate-100 text-slate-900",
  };

  return classes[type];
}

function createEmptyProductDraft(): ProductDraft {
  return {
    name: "",
    description: "",
    categoryId: "carnes secas",
    category: "Carnes secas",
    price: "",
    unit: "/kg",
    image: "",
    badge: "",
    badgeVariant: "certified",
    initialStock: "0",
    active: true,
    supplierId: "",
    promoLabel: "",
    promoActive: false,
    promoPrice: "",
  };
}

function createProductDraft(product: AdminProduct): ProductDraft {
  return {
    name: product.name,
    description: product.description,
    categoryId: product.categoryId,
    category: product.category,
    price: String(product.basePriceCents / 100),
    unit: product.unit,
    image: product.image,
    badge: product.badge ?? "",
    badgeVariant: product.badgeVariant ?? "certified",
    initialStock: String(product.initialStock),
    active: product.active,
    supplierId: product.supplierId ?? "",
    promoLabel: product.promoLabel ?? "",
    promoActive: product.promoActive,
    promoPrice:
      product.promoPriceCents == null ? "" : String(product.promoPriceCents / 100),
  };
}

function createEmptySupplierDraft(): SupplierDraft {
  return {
    name: "",
    contact: "",
    email: "",
    city: "",
    notes: "",
    active: true,
  };
}

function createSupplierDraft(supplier: AdminSupplier): SupplierDraft {
  return {
    name: supplier.name,
    contact: supplier.contact,
    email: supplier.email ?? "",
    city: supplier.city ?? "",
    notes: supplier.notes ?? "",
    active: supplier.active,
  };
}

export default function Admin() {
  const [tokenInput, setTokenInput] = useState(loadToken);
  const [token, setToken] = useState(loadToken);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [stockDrafts, setStockDrafts] = useState<Record<string, StockDraft>>({});
  const [statusDrafts, setStatusDrafts] = useState<Record<string, OrderStatus>>({});
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [productDraft, setProductDraft] = useState<ProductDraft>(createEmptyProductDraft());
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [supplierDraft, setSupplierDraft] = useState<SupplierDraft>(createEmptySupplierDraft());
  const [activeTab, setActiveTab] = useState("catalog");

  const overview = dashboard?.overview;
  const products = dashboard?.products ?? [];
  const stock = dashboard?.stock ?? [];
  const orders = dashboard?.orders ?? [];
  const suppliers = dashboard?.suppliers ?? [];
  const movements = dashboard?.movements ?? [];
  const latestMovementByProduct = useMemo(() => {
    const result = new Map<string, StockMovement>();
    for (const movement of movements) {
      if (!result.has(movement.productId)) {
        result.set(movement.productId, movement);
      }
    }
    return result;
  }, [movements]);
  const lowStockProducts = stock
    .filter((item) => item.lowStock || item.stockQuantity <= (item.minThreshold ?? 10))
    .slice(0, 3);
  const ticketAverage = overview?.paidOrders ? Math.round((overview.revenueCents ?? 0) / overview.paidOrders) : 0;
  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      "x-admin-token": token,
    }),
    [token]
  );

  useEffect(() => {
    if (token) {
      void refreshDashboard(token);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function apiFetch(path: string, init: RequestInit = {}) {
    const response = await fetch(path, {
      ...init,
      headers: {
        ...headers,
        ...(init.headers ?? {}),
      },
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error ?? "Falha na requisição do painel.");
    }

    return response.json();
  }

  async function refreshDashboard(currentToken = token) {
    if (!currentToken) {
      setError("Informe o token de acesso do admin.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = (await apiFetch("/api/admin/catalog")) as DashboardResponse;
      setDashboard(response);
      setStockDrafts(
        Object.fromEntries(
          response.stock.map((item) => [
            item.id,
            { quantity: String(item.stockQuantity), movementType: "adjustment", reason: "" },
          ])
        )
      );
      setStatusDrafts(Object.fromEntries(response.orders.map((order) => [order.id, order.status])));

      if (!selectedProductId && response.products.length > 0) {
        setSelectedProductId(response.products[0].id);
        setProductDraft(createProductDraft(response.products[0]));
      } else if (selectedProductId) {
        const current = response.products.find((item) => item.id === selectedProductId);
        if (current) {
          setProductDraft(createProductDraft(current));
        }
      }

      if (!selectedSupplierId && response.suppliers.length > 0) {
        setSelectedSupplierId(response.suppliers[0].id);
        setSupplierDraft(createSupplierDraft(response.suppliers[0]));
      } else if (selectedSupplierId) {
        const currentSupplier = response.suppliers.find((item) => item.id === selectedSupplierId);
        if (currentSupplier) {
          setSupplierDraft(createSupplierDraft(currentSupplier));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar o painel.");
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }

  async function connectToken() {
    const nextToken = tokenInput.trim();
    if (!nextToken) {
      toast.error("Informe um token válido.");
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, nextToken);
    setToken(nextToken);
    toast.success("Token salvo com sucesso.");
  }

  async function updateStock(product: AdminProduct) {
    const draft = stockDrafts[product.id] ?? {
      quantity: String(product.stockQuantity),
      movementType: "adjustment" as StockMovementMode,
      reason: "",
    };
    const quantityValue = Number(draft.quantity);
    if (Number.isNaN(quantityValue) || quantityValue < 0) {
      toast.error("Informe uma quantidade válida.");
      return;
    }

    const movementType = draft.movementType;
    const reason =
      draft.reason.trim() ||
      ({
        adjustment: "Ajuste manual do admin",
        in: "Entrada manual do admin",
        out: "Saída manual do admin",
      } as Record<StockMovementMode, string>)[movementType];

    let nextQuantity = quantityValue;
    if (movementType === "in") {
      if (quantityValue <= 0) {
        toast.error("Informe uma quantidade de entrada maior que zero.");
        return;
      }
      nextQuantity = product.stockQuantity + quantityValue;
    } else if (movementType === "out") {
      if (quantityValue <= 0) {
        toast.error("Informe uma quantidade de saída maior que zero.");
        return;
      }
      if (quantityValue > product.stockQuantity) {
        toast.error("Não é possível retirar mais do que há em estoque.");
        return;
      }
      nextQuantity = product.stockQuantity - quantityValue;
    }

    try {
      const payload = (await apiFetch(`/api/admin/stock/${product.id}`, {
        method: "PATCH",
        body: JSON.stringify({ quantity: nextQuantity, reason, movementType }),
      })) as { product: AdminProduct };

      setDashboard((current) => {
        if (!current) return current;
        return {
          ...current,
          stock: current.stock.map((item) => (item.id === product.id ? { ...item, ...payload.product } : item)),
          products: current.products.map((item) => (item.id === product.id ? { ...item, ...payload.product } : item)),
        };
      });
      setStockDrafts((current) => ({
        ...current,
        [product.id]: { quantity: String(payload.product.stockQuantity), movementType: "adjustment", reason: "" },
      }));
      toast.success("Estoque atualizado.");
      await refreshDashboard(token);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao atualizar estoque.");
    }
  }

  async function updateOrderStatus(orderId: string) {
    const nextStatus = statusDrafts[orderId];
    try {
      const payload = (await apiFetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      })) as { order: AdminOrder };

      setDashboard((current) => {
        if (!current) return current;
        return {
          ...current,
          orders: current.orders.map((order) => (order.id === orderId ? payload.order : order)),
        };
      });
      toast.success("Status do pedido atualizado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao atualizar pedido.");
    }
  }

  async function saveProduct() {
    const payload = {
      name: productDraft.name.trim(),
      description: productDraft.description.trim(),
      categoryId: productDraft.categoryId,
      category: productDraft.category,
      price: Number(productDraft.price),
      unit: productDraft.unit.trim(),
      image: productDraft.image.trim(),
      badge: productDraft.badge.trim() || null,
      badgeVariant: productDraft.badgeVariant.trim() || null,
      initialStock: Number(productDraft.initialStock),
      active: productDraft.active,
      supplierId: productDraft.supplierId || null,
      promoLabel: productDraft.promoLabel.trim() || null,
      promoActive: productDraft.promoActive,
      promoPrice: productDraft.promoPrice.trim() ? Number(productDraft.promoPrice) : null,
    };

    if (!payload.name || !payload.description || !payload.image || !payload.unit) {
      toast.error("Preencha os campos principais do produto.");
      return;
    }

    if (Number.isNaN(payload.price) || payload.price <= 0) {
      toast.error("Informe um preço válido.");
      return;
    }

    if (selectedProductId) {
      try {
        const response = (await apiFetch(`/api/admin/products/${selectedProductId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        })) as { product: AdminProduct };

        setDashboard((current) => {
          if (!current) return current;
          return {
            ...current,
            products: current.products.map((item) => (item.id === selectedProductId ? { ...item, ...response.product } : item)),
            stock: current.stock.map((item) => (item.id === selectedProductId ? { ...item, ...response.product } : item)),
          };
        });
        setSelectedProductId(response.product.id);
        setProductDraft(createProductDraft(response.product));
        toast.success("Produto atualizado.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Falha ao atualizar produto.");
      }
      return;
    }

    try {
      const response = (await apiFetch("/api/admin/products", {
        method: "POST",
        body: JSON.stringify(payload),
      })) as { product: AdminProduct };

      setDashboard((current) => {
        if (!current) return current;
        return {
          ...current,
          products: [response.product, ...current.products],
          stock: [{ ...response.product, minThreshold: response.product.minThreshold ?? 5000 }, ...current.stock],
        };
      });
      setSelectedProductId(response.product.id);
      setProductDraft(createProductDraft(response.product));
      toast.success("Produto criado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao criar produto.");
    }
  }

  async function saveSupplier() {
    const payload = {
      name: supplierDraft.name.trim(),
      contact: supplierDraft.contact.trim(),
      email: supplierDraft.email.trim() || null,
      city: supplierDraft.city.trim() || null,
      notes: supplierDraft.notes.trim() || null,
      active: supplierDraft.active,
    };

    if (!payload.name || !payload.contact) {
      toast.error("Preencha nome e contato do fornecedor.");
      return;
    }

    if (selectedSupplierId) {
      try {
        const response = (await apiFetch(`/api/admin/suppliers/${selectedSupplierId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        })) as { suppliers: AdminSupplier[] };

        const refreshedSupplier = response.suppliers.find((item) => item.id === selectedSupplierId);
        setDashboard((current) => {
          if (!current) return current;
          return {
            ...current,
            suppliers: response.suppliers,
            products: current.products.map((product) =>
              product.supplierId === selectedSupplierId ? { ...product, supplierName: refreshedSupplier?.name ?? product.supplierName ?? null } : product
            ),
          };
        });
        if (refreshedSupplier) {
          setSupplierDraft(createSupplierDraft(refreshedSupplier));
        }
        toast.success("Fornecedor atualizado.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Falha ao atualizar fornecedor.");
      }
      return;
    }

    try {
      const response = (await apiFetch("/api/admin/suppliers", {
        method: "POST",
        body: JSON.stringify(payload),
      })) as { suppliers: AdminSupplier[] };

      const created = response.suppliers.at(-1);
      setDashboard((current) => {
        if (!current) return current;
        return {
          ...current,
          suppliers: response.suppliers,
        };
      });
      if (created) {
        setSelectedSupplierId(created.id);
        setSupplierDraft(createSupplierDraft(created));
      }
      toast.success("Fornecedor criado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao criar fornecedor.");
    }
  }

  const activeProducts = products.filter((item) => item.active);
  const activePromotions = products.filter((item) => item.promoActive && item.promoPriceCents != null);

  return (
    <div className="admin-erp min-h-screen bg-[radial-gradient(circle_at_top,#223427_0%,#121922_50%,#090d12_100%)] px-4 py-6 text-slate-100">
      <style>{`
        .admin-erp [class*="bg-card"] {
          background: rgba(17, 25, 35, 0.94) !important;
          color: #e2e8f0 !important;
          border-color: rgba(255, 255, 255, 0.08) !important;
        }
        .admin-erp [class*="bg-white"] {
          background: rgba(15, 22, 31, 0.96) !important;
          color: #e2e8f0 !important;
        }
        .admin-erp [class*="border-border/70"],
        .admin-erp [class*="border-border"],
        .admin-erp [class*="border-input"] {
          border-color: rgba(255, 255, 255, 0.09) !important;
        }
        .admin-erp input,
        .admin-erp textarea,
        .admin-erp [role="combobox"] {
          background: rgba(255, 255, 255, 0.04) !important;
          color: #f8fafc !important;
          border-color: rgba(255, 255, 255, 0.12) !important;
        }
        .admin-erp input::placeholder,
        .admin-erp textarea::placeholder {
          color: rgba(226, 232, 240, 0.45) !important;
        }
        .admin-erp button[role="tab"] {
          background: rgba(255, 255, 255, 0.04) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          color: rgba(226, 232, 240, 0.8) !important;
        }
        .admin-erp button[role="tab"][data-state="active"] {
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.25), rgba(132, 204, 22, 0.16)) !important;
          color: #f8fafc !important;
          border-color: rgba(132, 204, 22, 0.35) !important;
          box-shadow: 0 0 0 1px rgba(132, 204, 22, 0.1) inset;
        }
      `}</style>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[28px] border border-white/10 bg-black/25 px-5 py-4 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400 font-black text-slate-950">
              RN
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-300">RN Naturais Premium</p>
              <h1 className="text-lg font-semibold text-white">Sistema Comercial Integrado</h1>
              <p className="text-sm text-slate-400">Controle de catálogo, estoque, preços e pedidos em um único painel.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/">
              <Button variant="outline" className="border-white/10 bg-white/5 text-slate-100 hover:bg-white/10 hover:text-white">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Visualizar loja
              </Button>
            </Link>
            <Button onClick={() => void refreshDashboard()} className="bg-emerald-500 text-slate-950 hover:bg-emerald-400">
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar painel
            </Button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <Card className="border-white/10 bg-white/5 text-slate-100 shadow-2xl shadow-black/20 backdrop-blur-xl">
              <CardHeader className="space-y-2">
                <CardTitle className="text-sm uppercase tracking-[0.26em] text-emerald-300">Navegação ERP</CardTitle>
                <CardDescription className="text-slate-400">Operação centralizada para gestão diária.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { label: "Painel Financeiro / Dashboard", icon: Gauge, value: "catalog" },
                  { label: "Estoque & Cadastros", icon: Boxes, value: "stock" },
                  { label: "Controle de Pedidos", icon: ClipboardList, value: "orders" },
                  { label: "Promoções", icon: Megaphone, value: "promotions" },
                  { label: "WhatsApp Bot & Auditoria", icon: ShoppingCart, value: "movements" },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.value;
                  return (
                    <button
                      type="button"
                      key={item.label}
                      onClick={() => setActiveTab(item.value)}
                      className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm transition ${
                        isActive
                          ? "border-emerald-400/35 bg-emerald-400/12 text-emerald-50"
                          : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={isActive ? "h-4 w-4 text-emerald-300" : "h-4 w-4 text-slate-400"} />
                        <span className="font-medium">{item.label}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-500" />
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/5 text-slate-100 shadow-2xl shadow-black/20 backdrop-blur-xl">
              <CardContent className="space-y-4 p-5">
                <div>
                  <p className="text-sm font-semibold text-white">Status do Workspace</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Banco local sincronizado, cache inteligente ativo e pedidos fluindo da vitrine para o painel.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-emerald-500/15 px-3 py-1.5 font-semibold text-emerald-200">Redis On</span>
                  <span className="rounded-full bg-white/10 px-3 py-1.5 font-semibold text-slate-200">Workers 3/3</span>
                  <span className="rounded-full bg-amber-500/15 px-3 py-1.5 font-semibold text-amber-200">ERP Ready</span>
                </div>
              </CardContent>
            </Card>
          </aside>

          <section className="space-y-6">
            <Card className="overflow-hidden border-white/10 bg-[linear-gradient(135deg,rgba(18,29,23,0.98)_0%,rgba(15,21,31,0.98)_100%)] text-slate-100 shadow-2xl shadow-black/30">
              <CardContent className="space-y-6 p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="max-w-3xl">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-200">
                      Painel de Indicadores Gerais <span className="rounded-full bg-white/10 px-2 py-0.5 normal-case tracking-normal">Real-Time</span>
                    </div>
                    <h2 className="font-serif text-3xl leading-tight text-white md:text-5xl" style={{ fontFamily: "Playfair Display" }}>
                      Gestão comercial para Casa do Norte
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm text-slate-300 md:text-base">
                      Cadastro de itens, definição de preços, controle de estoque e acompanhamento de pedidos em uma
                      interface executiva.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Link href="/">
                      <Button variant="secondary" className="border border-white/10 bg-white/10 text-slate-100 hover:bg-white/15 hover:text-white">
                        Visualizar loja (E-commerce)
                      </Button>
                    </Link>
                    <Button onClick={() => void refreshDashboard()} className="bg-gradient-to-r from-emerald-500 to-lime-400 text-slate-950 hover:from-emerald-400 hover:to-lime-300">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Sincronizar dados
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Faturamento bruto</p>
                    <div className="mt-3 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-2xl font-bold text-white">{formatCurrency(overview?.revenueCents ?? 0)}</p>
                        <p className="mt-1 text-sm text-emerald-300">+12,4% neste mês</p>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
                        <Wallet className="h-5 w-5" />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Pedidos pagos</p>
                    <div className="mt-3 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-2xl font-bold text-white">{overview?.paidOrders ?? 0}</p>
                        <p className="mt-1 text-sm text-slate-300">Concluídos com sucesso</p>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-300">
                        <ShoppingBag className="h-5 w-5" />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Ticket médio</p>
                    <div className="mt-3 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-2xl font-bold text-white">{formatCurrency(ticketAverage)}</p>
                        <p className="mt-1 text-sm text-slate-300">Média dos pedidos ativos</p>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-300">
                        <Banknote className="h-5 w-5" />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Estoque crítico</p>
                    <div className="mt-3 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-2xl font-bold text-white">{overview?.lowStockCount ?? 0}</p>
                        <p className="mt-1 text-sm text-rose-300">Atenção ao reabastecimento</p>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-300">
                        <Truck className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/5 text-slate-100 shadow-2xl shadow-black/20 backdrop-blur-xl">
              <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-end">
                <div className="grid flex-1 gap-2">
                  <Label htmlFor="admin-token" className="text-slate-200">
                    Token do admin
                  </Label>
                  <Input
                    id="admin-token"
                    value={tokenInput}
                    onChange={(event) => setTokenInput(event.target.value)}
                    placeholder="admin-dev"
                    className="border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500"
                  />
                  <p className="text-xs text-slate-500">
                    Use o token definido em <code className="rounded bg-white/10 px-1.5 py-0.5">ADMIN_ACCESS_TOKEN</code> ou o padrão{" "}
                    <code className="rounded bg-white/10 px-1.5 py-0.5">admin-dev</code>.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => void connectToken()} className="bg-white text-slate-950 hover:bg-slate-100">
                    Salvar token
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => void refreshDashboard()}
                    className="border-white/10 bg-white/5 text-slate-100 hover:bg-white/10 hover:text-white"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Atualizar
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
              <Card className="border-white/10 bg-white/5 text-slate-100 shadow-2xl shadow-black/20 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg text-white">
                    <BarChart3 className="h-5 w-5 text-emerald-300" />
                    Analytics & Performance de Receita
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Leitura rápida do faturamento, estoque e produtividade comercial.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
                    {["Fev", "Mar", "Abr", "Mai", "Jun", "Jul"].map((label, index) => {
                      const heights = [58, 72, 66, 78, 88, 62];
                      const secondary = [24, 28, 30, 35, 39, 22];
                      return (
                        <div key={label} className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-3">
                          <div className="flex h-40 items-end gap-2 rounded-xl bg-white/5 px-3 py-3">
                            <div className="w-full rounded-t-md bg-emerald-500/80" style={{ height: `${heights[index]}%` }} />
                            <div className="w-full rounded-t-md bg-slate-300/80" style={{ height: `${secondary[index]}%` }} />
                          </div>
                          <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-slate-400">{label}</p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5">
                      <span className="h-2 w-2 rounded-full bg-slate-300" />
                      Custo Mercadorias (CMV)
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      Faturamento Bruto
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-400" />
                      Lucro Líquido Real
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-white/5 text-slate-100 shadow-2xl shadow-black/20 backdrop-blur-xl">
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-lg text-white">
                        <Truck className="h-5 w-5 text-amber-300" />
                        Alertas de Reposição
                      </CardTitle>
                      <CardDescription className="text-slate-400">Produtos com atenção crítica no estoque.</CardDescription>
                    </div>
                    <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-200">
                      Urgente
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {lowStockProducts.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">
                      Nenhum produto exige reposição imediata.
                    </div>
                  ) : (
                    lowStockProducts.map((product) => (
                      <div key={product.id} className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-white">{product.name}</p>
                            <p className="text-sm text-slate-300">SKU: {product.category} · {product.unit}</p>
                          </div>
                          <span className="rounded-full bg-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-200">
                            {product.stockQuantity} un.
                          </span>
                        </div>
                        <p className="mt-3 text-sm text-rose-200">Repor antes de zerar o estoque e afetar a vitrine.</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </section>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 shadow-lg shadow-black/20">
            {error}
          </div>
        ) : null}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/5 p-2 md:grid-cols-6">
            <TabsTrigger value="catalog">Catálogo</TabsTrigger>
            <TabsTrigger value="stock">Estoque</TabsTrigger>
            <TabsTrigger value="movements">Movimentações</TabsTrigger>
            <TabsTrigger value="promotions">Promoções</TabsTrigger>
            <TabsTrigger value="suppliers">Fornecedores</TabsTrigger>
            <TabsTrigger value="orders">Pedidos</TabsTrigger>
          </TabsList>

          <TabsContent value="catalog" className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <Card className="border-border/70 shadow-sm">
                <CardHeader>
                  <CardTitle>Cadastro de produtos</CardTitle>
                  <CardDescription>Crie novos itens ou edite o catálogo com preços, promoções e fornecedor.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2 md:col-span-2">
                      <Label htmlFor="product-name">Nome</Label>
                      <Input
                        id="product-name"
                        value={productDraft.name}
                        onChange={(event) => setProductDraft((current) => ({ ...current, name: event.target.value }))}
                        placeholder="Ex.: Carne de Sol Premium"
                      />
                    </div>
                    <div className="grid gap-2 md:col-span-2">
                      <Label htmlFor="product-description">Descrição</Label>
                      <Textarea
                        id="product-description"
                        value={productDraft.description}
                        onChange={(event) =>
                          setProductDraft((current) => ({ ...current, description: event.target.value }))
                        }
                        placeholder="Descreva o produto com clareza."
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Categoria</Label>
                      <Select
                        value={productDraft.categoryId}
                        onValueChange={(value) => {
                          const label = CATEGORY_OPTIONS.find((category) => category.id === value)?.label ?? value;
                          setProductDraft((current) => ({ ...current, categoryId: value, category: label }));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORY_OPTIONS.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="product-price">Preço base</Label>
                      <Input
                        id="product-price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={productDraft.price}
                        onChange={(event) => setProductDraft((current) => ({ ...current, price: event.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="product-unit">Unidade</Label>
                      <Input
                        id="product-unit"
                        value={productDraft.unit}
                        onChange={(event) => setProductDraft((current) => ({ ...current, unit: event.target.value }))}
                        placeholder="/kg"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="product-stock">Estoque inicial</Label>
                      <Input
                        id="product-stock"
                        type="number"
                        min="0"
                        value={productDraft.initialStock}
                        onChange={(event) =>
                          setProductDraft((current) => ({ ...current, initialStock: event.target.value }))
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="product-image">Imagem</Label>
                      <Input
                        id="product-image"
                        value={productDraft.image}
                        onChange={(event) => setProductDraft((current) => ({ ...current, image: event.target.value }))}
                        placeholder="/menu-images/produto.jpg"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="product-badge">Selo</Label>
                      <Input
                        id="product-badge"
                        value={productDraft.badge}
                        onChange={(event) => setProductDraft((current) => ({ ...current, badge: event.target.value }))}
                        placeholder="Mais pedido"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Variante do selo</Label>
                      <Select
                        value={productDraft.badgeVariant}
                        onValueChange={(value) =>
                          setProductDraft((current) => ({ ...current, badgeVariant: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="special">Especial</SelectItem>
                          <SelectItem value="premium">Premium</SelectItem>
                          <SelectItem value="certified">Certificado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Fornecedor</Label>
                      <Select
                        value={productDraft.supplierId || "__none__"}
                        onValueChange={(value) =>
                          setProductDraft((current) => ({ ...current, supplierId: value === "__none__" ? "" : value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Nenhum" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Nenhum</SelectItem>
                          {suppliers.map((supplier) => (
                            <SelectItem key={supplier.id} value={supplier.id}>
                              {supplier.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">Promoção</p>
                        <p className="text-sm text-muted-foreground">Ative um destaque com valor promocional para o cardápio.</p>
                      </div>
                      <Switch
                        checked={productDraft.promoActive}
                        onCheckedChange={(checked) =>
                          setProductDraft((current) => ({ ...current, promoActive: checked }))
                        }
                      />
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="grid gap-2">
                        <Label htmlFor="promo-label">Texto da promoção</Label>
                        <Input
                          id="promo-label"
                          value={productDraft.promoLabel}
                          onChange={(event) =>
                            setProductDraft((current) => ({ ...current, promoLabel: event.target.value }))
                          }
                          placeholder="Oferta especial"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="promo-price">Preço promocional</Label>
                        <Input
                          id="promo-price"
                          type="number"
                          min="0"
                          step="0.01"
                          value={productDraft.promoPrice}
                          onChange={(event) =>
                            setProductDraft((current) => ({ ...current, promoPrice: event.target.value }))
                          }
                          placeholder="0,00"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
                      <Switch
                        checked={productDraft.active}
                        onCheckedChange={(checked) => setProductDraft((current) => ({ ...current, active: checked }))}
                      />
                      <span>Produto ativo</span>
                    </div>
                    <Button onClick={() => void saveProduct()}>
                      {selectedProductId ? <Save className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                      {selectedProductId ? "Salvar produto" : "Criar produto"}
                    </Button>
                    {selectedProductId ? (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedProductId(null);
                          setProductDraft(createEmptyProductDraft());
                        }}
                      >
                        Novo cadastro
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/70 shadow-sm">
                <CardHeader>
                  <CardTitle>Catálogo cadastrado</CardTitle>
                  <CardDescription>Escolha um item para editar os dados comerciais.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {products.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum produto encontrado.</p>
                  ) : (
                    products.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => {
                          setSelectedProductId(product.id);
                          setProductDraft(createProductDraft(product));
                        }}
                        className={`w-full rounded-2xl border p-4 text-left transition ${
                          selectedProductId === product.id
                            ? "border-emerald-400/45 bg-emerald-500/10"
                            : "border-white/10 bg-white/5"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <img src={product.image} alt={product.name} className="h-16 w-16 rounded-xl object-cover" />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-foreground">{product.name}</p>
                              {product.promoActive ? (
                                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                                  Promoção
                                </span>
                              ) : null}
                              {!product.active ? (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                                  Inativo
                                </span>
                              ) : null}
                            </div>
                            <p className="text-sm text-muted-foreground">{product.category}</p>
                            <p className="text-sm text-foreground">
                              Preço base: <span className="font-semibold">{formatCurrency(product.basePriceCents)}</span>
                            </p>
                            {product.promoActive && product.promoPriceCents != null ? (
                              <p className="text-sm text-rose-700">
                                Promoção: <span className="font-semibold">{formatCurrency(product.promoPriceCents)}</span>
                              </p>
                            ) : null}
                            <p className="text-xs text-muted-foreground">
                              Fornecedor: {product.supplierName ?? "Não informado"} • Estoque {product.stockQuantity}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Entrada: {new Date(product.createdAt).toLocaleDateString("pt-BR")} • Atualizado:{" "}
                              {new Date(product.updatedAt).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                          <PencilLine className="mt-1 h-4 w-4 text-muted-foreground" />
                        </div>
                      </button>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="stock" className="space-y-6">
            <Card className="border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle>Controle de estoque</CardTitle>
                <CardDescription>Registre entrada, saída ou ajuste manual com motivo e acompanhe o histórico por produto.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 md:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-emerald-700">Entrada</p>
                    <p className="mt-1 text-sm text-muted-foreground">Inclua mercadoria nova no estoque físico.</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-emerald-700">Saída</p>
                    <p className="mt-1 text-sm text-muted-foreground">Baixe o saldo por venda, perda ou consumo interno.</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-emerald-700">Ajuste</p>
                    <p className="mt-1 text-sm text-muted-foreground">Corrija o saldo após inventário ou conferência.</p>
                  </div>
                </div>
                {stock.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum item de estoque carregado.</p>
                ) : (
                  stock.map((product) => {
                    const draft =
                      stockDrafts[product.id] ?? {
                        quantity: String(product.stockQuantity),
                        movementType: "adjustment" as StockMovementMode,
                        reason: "",
                      };
                    const latestMovement = latestMovementByProduct.get(product.id);

                    return (
                    <div key={product.id} className="rounded-2xl border border-border bg-white p-4">
                      <div className="flex items-start gap-3">
                        <img src={product.image} alt={product.name} className="h-16 w-16 rounded-xl object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-foreground">{product.name}</p>
                          <p className="text-sm text-muted-foreground">{product.category}</p>
                          <p className="mt-1 text-sm text-foreground">
                            Atual: <span className="font-semibold">{product.stockQuantity}</span> | Mínimo:{" "}
                            <span className="font-semibold">{product.minThreshold}</span>
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Entrada: {new Date(product.createdAt).toLocaleDateString("pt-BR")} • Última revisão:{" "}
                            {new Date(product.updatedAt).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        {product.lowStock ? (
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
                            Estoque baixo
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-4 grid gap-4 lg:grid-cols-[180px_1fr_1.3fr]">
                        <div className="grid gap-2">
                          <Label htmlFor={`movement-${product.id}`}>Movimentação</Label>
                          <Select
                            value={draft.movementType}
                            onValueChange={(value) =>
                              setStockDrafts((current) => ({
                                ...current,
                                [product.id]: {
                                  ...draft,
                                  movementType: value as StockMovementMode,
                                },
                              }))
                            }
                          >
                            <SelectTrigger id={`movement-${product.id}`}>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="in">Entrada</SelectItem>
                              <SelectItem value="out">Saída</SelectItem>
                              <SelectItem value="adjustment">Ajuste</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor={`stock-${product.id}`}>
                            {draft.movementType === "adjustment" ? "Saldo final" : "Quantidade movimentada"}
                          </Label>
                          <Input
                            id={`stock-${product.id}`}
                            type="number"
                            min="0"
                            value={draft.quantity}
                            onChange={(event) =>
                              setStockDrafts((current) => ({
                                ...current,
                                [product.id]: {
                                  ...draft,
                                  quantity: event.target.value,
                                },
                              }))
                            }
                            placeholder={draft.movementType === "adjustment" ? "Saldo total desejado" : "Quantidade"}
                          />
                          <p className="text-xs text-muted-foreground">
                            {draft.movementType === "adjustment"
                              ? "Use quando quiser definir o saldo exato do produto."
                              : "Use a quantidade que será adicionada ou retirada do estoque."}
                          </p>
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor={`reason-${product.id}`}>Motivo / observação</Label>
                          <Textarea
                            id={`reason-${product.id}`}
                            rows={3}
                            value={draft.reason}
                            onChange={(event) =>
                              setStockDrafts((current) => ({
                                ...current,
                                [product.id]: {
                                  ...draft,
                                  reason: event.target.value,
                                },
                              }))
                            }
                            placeholder="Ex.: reposição do fornecedor, conferência, avaria ou inventário."
                          />
                          <p className="text-xs text-muted-foreground">
                            {latestMovement
                              ? `Último movimento: ${movementLabel(latestMovement.type)} em ${new Date(latestMovement.createdAt).toLocaleDateString("pt-BR")}`
                              : "Sem movimentação registrada ainda."}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs text-muted-foreground">
                          Estoque atual: <span className="font-semibold text-foreground">{product.stockQuantity}</span> • Mínimo:{" "}
                          <span className="font-semibold text-foreground">{product.minThreshold}</span>
                        </p>
                        <Button variant="outline" onClick={() => void updateStock(product)}>
                          Registrar movimento
                        </Button>
                      </div>
                    </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="movements" className="space-y-6">
            <Card className="border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle>Movimentações de estoque</CardTitle>
                <CardDescription>Entrada, saída e ajustes manuais com data, produto e motivo.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {movements.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada ainda.</p>
                ) : (
                  movements.map((movement) => (
                    <div key={movement.id} className="rounded-2xl border border-border bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-foreground">{movement.productName}</p>
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${movementClass(movement.type)}`}>
                              {movementLabel(movement.type)}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {movement.quantity} unidade(s)
                            {movement.orderId ? ` • Pedido ${movement.orderId}` : ""}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {new Date(movement.createdAt).toLocaleString("pt-BR")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Motivo</p>
                          <p className="text-sm font-medium text-foreground">{movement.reason ?? "Sem observação"}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="promotions" className="space-y-6">
            <Card className="border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle>Promoções ativas</CardTitle>
                <CardDescription>Acompanhe os produtos com preço promocional publicado na vitrine.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {activePromotions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma promoção ativa no momento.</p>
                ) : (
                  activePromotions.map((product) => (
                    <div key={product.id} className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-foreground">{product.name}</p>
                          <p className="text-sm text-muted-foreground">{product.promoLabel ?? "Promoção ativa"}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Preço promocional</p>
                          <p className="text-xl font-bold text-rose-700">
                            {formatCurrency(product.promoPriceCents ?? product.priceCents)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="suppliers" className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <Card className="border-border/70 shadow-sm">
                <CardHeader>
                  <CardTitle>Cadastro de fornecedores</CardTitle>
                  <CardDescription>Registre parceiros, contatos e observações operacionais.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="supplier-name">Nome</Label>
                      <Input
                        id="supplier-name"
                        value={supplierDraft.name}
                        onChange={(event) => setSupplierDraft((current) => ({ ...current, name: event.target.value }))}
                        placeholder="Ex.: Distribuidora Nordeste"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="supplier-contact">Contato</Label>
                      <Input
                        id="supplier-contact"
                        value={supplierDraft.contact}
                        onChange={(event) =>
                          setSupplierDraft((current) => ({ ...current, contact: event.target.value }))
                        }
                        placeholder="(11) 99999-9999"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="supplier-email">E-mail</Label>
                      <Input
                        id="supplier-email"
                        value={supplierDraft.email}
                        onChange={(event) => setSupplierDraft((current) => ({ ...current, email: event.target.value }))}
                        placeholder="contato@fornecedor.com.br"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="supplier-city">Cidade</Label>
                      <Input
                        id="supplier-city"
                        value={supplierDraft.city}
                        onChange={(event) => setSupplierDraft((current) => ({ ...current, city: event.target.value }))}
                        placeholder="Osasco"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="supplier-notes">Observações</Label>
                      <Textarea
                        id="supplier-notes"
                        value={supplierDraft.notes}
                        onChange={(event) => setSupplierDraft((current) => ({ ...current, notes: event.target.value }))}
                        placeholder="Prazos, condições de entrega, volume mínimo..."
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <div>
                        <p className="font-semibold text-foreground">Fornecedor ativo</p>
                        <p className="text-sm text-muted-foreground">Disponível para vincular em novos produtos.</p>
                      </div>
                      <Switch
                        checked={supplierDraft.active}
                        onCheckedChange={(checked) =>
                          setSupplierDraft((current) => ({ ...current, active: checked }))
                        }
                      />
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button onClick={() => void saveSupplier()}>
                        {selectedSupplierId ? <Save className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                        {selectedSupplierId ? "Salvar fornecedor" : "Criar fornecedor"}
                      </Button>
                      {selectedSupplierId ? (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedSupplierId(null);
                            setSupplierDraft(createEmptySupplierDraft());
                          }}
                        >
                          Novo cadastro
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/70 shadow-sm">
                <CardHeader>
                  <CardTitle>Fornecedores cadastrados</CardTitle>
                  <CardDescription>Selecione um fornecedor para editar seus dados.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {suppliers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum fornecedor cadastrado.</p>
                  ) : (
                    suppliers.map((supplier) => (
                      <button
                        key={supplier.id}
                        type="button"
                        onClick={() => {
                          setSelectedSupplierId(supplier.id);
                          setSupplierDraft(createSupplierDraft(supplier));
                        }}
                        className={`w-full rounded-2xl border p-4 text-left transition ${
                          selectedSupplierId === supplier.id
                            ? "border-emerald-400/45 bg-emerald-500/10"
                            : "border-white/10 bg-white/5"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Users className="mt-1 h-5 w-5 text-emerald-700" />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-foreground">{supplier.name}</p>
                              {!supplier.active ? (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                                  Inativo
                                </span>
                              ) : null}
                            </div>
                            <p className="text-sm text-muted-foreground">{supplier.contact}</p>
                            <p className="text-xs text-muted-foreground">
                              {supplier.city ?? "Cidade não informada"} • {supplier.email ?? "Sem e-mail"}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="orders" className="space-y-6">
            <Card className="border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle>Pedidos</CardTitle>
                <CardDescription>Atualize o andamento de cada pedido conforme a operação avança.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {orders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum pedido encontrado ainda.</p>
                ) : (
                  orders.map((order) => (
                    <div key={order.id} className="rounded-2xl border border-border bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-foreground">{order.orderNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            {order.customer.name} • {order.customer.email}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {new Date(order.createdAt).toLocaleString("pt-BR")}
                          </p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(order.status)}`}>
                          {statusLabel(order.status)}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <div className="rounded-xl bg-black/20 p-3">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Pagamento</p>
                          <p className="mt-1 font-semibold">{order.paymentStatus}</p>
                        </div>
                        <div className="rounded-xl bg-black/20 p-3">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Método</p>
                          <p className="mt-1 font-semibold">{order.paymentMethod}</p>
                        </div>
                        <div className="rounded-xl bg-black/20 p-3">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Total</p>
                          <p className="mt-1 font-semibold">{formatCurrency(order.totalCents)}</p>
                        </div>
                      </div>

                      <Separator className="my-4" />

                      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                        <div className="grid flex-1 gap-2">
                          <Label htmlFor={`status-${order.id}`}>Status operacional</Label>
                          <Select
                            value={statusDrafts[order.id] ?? order.status}
                            onValueChange={(value) =>
                              setStatusDrafts((current) => ({
                                ...current,
                                [order.id]: value as OrderStatus,
                              }))
                            }
                          >
                            <SelectTrigger id={`status-${order.id}`}>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {ORDER_STATUSES.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {statusLabel(status)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button onClick={() => void updateOrderStatus(order.id)}>Salvar status</Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {loading ? <div className="text-sm text-muted-foreground">Carregando painel...</div> : null}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <div className="rounded-full border border-border bg-white px-3 py-2">
            <Tag className="mr-2 inline-block h-3.5 w-3.5" />
            {activeProducts.length} produtos ativos
          </div>
          <div className="rounded-full border border-border bg-white px-3 py-2">
            <Users className="mr-2 inline-block h-3.5 w-3.5" />
            {overview?.suppliersCount ?? 0} fornecedores ativos
          </div>
          <div className="rounded-full border border-border bg-white px-3 py-2">
            <Tag className="mr-2 inline-block h-3.5 w-3.5" />
            {overview?.promotionsCount ?? 0} promoções em destaque
          </div>
        </div>
      </div>
    </div>
  );
}
