import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BellRing,
  BarChart3,
  Boxes,
  CircleDollarSign,
  Download,
  LayoutDashboard,
  Package,
  PlusCircle,
  RefreshCw,
  Save,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Truck,
  Users,
  Warehouse,
} from "lucide-react";
import { Link } from "wouter";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type OrderStatus = "pending_payment" | "paid" | "preparing" | "shipped" | "delivered" | "cancelled";
type MovementType = "in" | "out" | "adjustment";

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
  type: MovementType;
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

const STORAGE_KEY = "rn-admin-token";
const ORDER_STATUSES: OrderStatus[] = ["pending_payment", "paid", "preparing", "shipped", "delivered", "cancelled"];
const CATEGORY_OPTIONS = [
  { id: "carnes secas", label: "Carnes secas" },
  { id: "cuscuz e massas", label: "Cuscuz e massas" },
  { id: "farinhas", label: "Farinhas" },
  { id: "laticinios", label: "Laticinios" },
  { id: "pratos regionais", label: "Pratos regionais" },
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
    pending_payment: "bg-amber-500/15 text-amber-200 border border-amber-400/20",
    paid: "bg-emerald-500/15 text-emerald-200 border border-emerald-400/20",
    preparing: "bg-sky-500/15 text-sky-200 border border-sky-400/20",
    shipped: "bg-indigo-500/15 text-indigo-200 border border-indigo-400/20",
    delivered: "bg-green-500/15 text-green-200 border border-green-400/20",
    cancelled: "bg-rose-500/15 text-rose-200 border border-rose-400/20",
  };
  return classes[status];
}

function movementLabel(type: MovementType) {
  const labels: Record<MovementType, string> = {
    in: "Entrada",
    out: "Saida",
    adjustment: "Ajuste",
  };
  return labels[type];
}

function movementClass(type: MovementType) {
  const classes: Record<MovementType, string> = {
    in: "bg-emerald-500/15 text-emerald-200 border border-emerald-400/20",
    out: "bg-rose-500/15 text-rose-200 border border-rose-400/20",
    adjustment: "bg-slate-500/15 text-slate-200 border border-slate-400/20",
  };
  return classes[type];
}

type StockHealth = "healthy" | "attention" | "critical";

function stockThreshold(item: AdminProduct) {
  return item.minThreshold ?? 10;
}

function stockHealth(item: AdminProduct): StockHealth {
  const threshold = stockThreshold(item);
  if (item.stockQuantity <= threshold) {
    return "critical";
  }
  if (item.stockQuantity <= threshold * 1.5) {
    return "attention";
  }
  return "healthy";
}

function stockHealthLabel(health: StockHealth) {
  const labels: Record<StockHealth, string> = {
    healthy: "Saudável",
    attention: "Atenção",
    critical: "Crítico",
  };
  return labels[health];
}

function stockHealthClass(health: StockHealth) {
  const classes: Record<StockHealth, string> = {
    healthy: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
    attention: "border-amber-400/20 bg-amber-500/10 text-amber-200",
    critical: "border-rose-400/20 bg-rose-500/10 text-rose-200",
  };
  return classes[health];
}

function shortMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(date).replace(".", "");
}

function toCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
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
    promoPrice: product.promoPriceCents == null ? "" : String(product.promoPriceCents / 100),
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

export default function Erp() {
  const [tokenInput, setTokenInput] = useState(loadToken);
  const [token, setToken] = useState(loadToken);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [stockDrafts, setStockDrafts] = useState<Record<string, string>>({});
  const [statusDrafts, setStatusDrafts] = useState<Record<string, OrderStatus>>({});
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [productDraft, setProductDraft] = useState<ProductDraft>(createEmptyProductDraft());
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [supplierDraft, setSupplierDraft] = useState<SupplierDraft>(createEmptySupplierDraft());
  const [activeModule, setActiveModule] = useState("dashboard");

  const overview = dashboard?.overview;
  const products = dashboard?.products ?? [];
  const stock = dashboard?.stock ?? [];
  const orders = dashboard?.orders ?? [];
  const suppliers = dashboard?.suppliers ?? [];
  const movements = dashboard?.movements ?? [];

  const monthlyChartData = useMemo(() => {
    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - index), 1);
      const monthOrders = orders.filter((order) => {
        const orderDate = new Date(order.createdAt);
        return orderDate.getFullYear() === date.getFullYear() && orderDate.getMonth() === date.getMonth();
      });
      const revenueCents = monthOrders.reduce(
        (sum, order) => sum + (order.paymentStatus === "confirmed" ? order.totalCents : 0),
        0
      );
      const estimatedCostCents = Math.round(revenueCents * 0.58);
      return {
        month: shortMonthLabel(date),
        revenue: revenueCents / 100,
        cost: estimatedCostCents / 100,
        profit: (revenueCents - estimatedCostCents) / 100,
      };
    });
  }, [orders]);

  const lowStockItems = useMemo(
    () => [...stock].sort((a, b) => a.stockQuantity - b.stockQuantity).slice(0, 4),
    [stock]
  );
  const stockHealthSummary = useMemo(() => {
    return stock.reduce(
      (acc, item) => {
        const health = stockHealth(item);
        acc[health] += 1;
        return acc;
      },
      { healthy: 0, attention: 0, critical: 0 } as Record<StockHealth, number>
    );
  }, [stock]);

  const stockMonitorItems = useMemo(
    () => [...stock].sort((a, b) => a.stockQuantity - b.stockQuantity).slice(0, 6),
    [stock]
  );

  const activeProducts = products.filter((item) => item.active);
  const activePromotions = products.filter((item) => item.promoActive && item.promoPriceCents != null);
  const activeSuppliers = suppliers.filter((item) => item.active);
  const pendingOrders = orders.filter((order) => order.status === "pending_payment" || order.status === "preparing");
  const fulfilledOrders = orders.filter((order) => order.status === "paid" || order.status === "shipped" || order.status === "delivered");
  const todayRevenue = useMemo(() => {
    const today = new Date();
    return orders.reduce((sum, order) => {
      const orderDate = new Date(order.createdAt);
      if (
        orderDate.getFullYear() === today.getFullYear() &&
        orderDate.getMonth() === today.getMonth() &&
        orderDate.getDate() === today.getDate() &&
        order.paymentStatus === "confirmed"
      ) {
        return sum + order.totalCents;
      }
      return sum;
    }, 0);
  }, [orders]);
  const averageTicket = overview?.paidOrders ? Math.round(overview.revenueCents / overview.paidOrders) : 0;
  const estimatedProfitCents = Math.round(overview?.revenueCents ?? 0) - Math.round((overview?.revenueCents ?? 0) * 0.58);
  const criticalStockCount = stockHealthSummary.critical;
  const attentionStockCount = stockHealthSummary.attention;
  const healthyStockCount = stockHealthSummary.healthy;

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
      throw new Error(payload?.error ?? "Falha na requisicao do painel.");
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
      const stockRows = Array.isArray(response.stock) ? response.stock : [];
      const orderRows = Array.isArray(response.orders) ? response.orders : [];
      const productRows = Array.isArray(response.products) ? response.products : [];
      const supplierRows = Array.isArray(response.suppliers) ? response.suppliers : [];

      setDashboard(response);
      setStockDrafts(Object.fromEntries(stockRows.map((item) => [item.id, String(item.stockQuantity)])));
      setStatusDrafts(Object.fromEntries(orderRows.map((order) => [order.id, order.status])));

      if (!selectedProductId && productRows.length > 0) {
        setSelectedProductId(productRows[0].id);
        setProductDraft(createProductDraft(productRows[0]));
      } else if (selectedProductId) {
        const current = productRows.find((item) => item.id === selectedProductId);
        if (current) {
          setProductDraft(createProductDraft(current));
        }
      }

      if (!selectedSupplierId && supplierRows.length > 0) {
        setSelectedSupplierId(supplierRows[0].id);
        setSupplierDraft(createSupplierDraft(supplierRows[0]));
      } else if (selectedSupplierId) {
        const currentSupplier = supplierRows.find((item) => item.id === selectedSupplierId);
        if (currentSupplier) {
          setSupplierDraft(createSupplierDraft(currentSupplier));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel carregar o painel.");
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }

  async function connectToken() {
    const nextToken = tokenInput.trim();
    if (!nextToken) {
      toast.error("Informe um token valido.");
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, nextToken);
    setToken(nextToken);
    toast.success("Token salvo com sucesso.");
  }

  async function updateStock(productId: string) {
    const nextQuantity = Number(stockDrafts[productId]);
    if (Number.isNaN(nextQuantity) || nextQuantity < 0) {
      toast.error("Informe uma quantidade valida.");
      return;
    }

    try {
      const payload = (await apiFetch(`/api/admin/stock/${productId}`, {
        method: "PATCH",
        body: JSON.stringify({ quantity: nextQuantity, reason: "Ajuste manual do admin" }),
      })) as { product: AdminProduct };

      setDashboard((current) => {
        if (!current) return current;
        return {
          ...current,
          stock: current.stock.map((item) => (item.id === productId ? { ...item, ...payload.product } : item)),
          products: current.products.map((item) => (item.id === productId ? { ...item, ...payload.product } : item)),
        };
      });
      toast.success("Estoque atualizado.");
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
      toast.error("Informe um preco valido.");
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
            products: current.products.map((item) =>
              item.supplierId === selectedSupplierId && refreshedSupplier
                ? { ...item, supplierName: refreshedSupplier.name }
                : item
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

  const sidebarItems = [
    { id: "dashboard", label: "Painel Financeiro / Dashboard", icon: LayoutDashboard },
    { id: "catalog", label: "Estoque & Cadastros", icon: Boxes },
    { id: "orders", label: "Controle de Pedidos", icon: ShoppingBag },
    { id: "suppliers", label: "Cadastro de Fornecedores", icon: Warehouse },
    { id: "movements", label: "Movimentações", icon: BarChart3 },
    { id: "promotions", label: "Promoções", icon: Sparkles },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#193629_0%,#0e151d_44%,#081015_100%)] text-slate-100">
      <div className="border-b border-white/10 bg-[#102019]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1680px] flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400 text-base font-black text-slate-950 shadow-lg shadow-amber-500/30">
              RN
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-emerald-300">
                Casa do Norte · ERP integrado
              </p>
              <h1 className="text-2xl font-semibold text-white">Painel Administrativo / Visão Geral</h1>
              <p className="text-sm text-slate-300">
                Estoque, preços, promoções, pedidos e fornecedores em um único centro de operação.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/">
              <Button className="border border-white/15 bg-white/5 text-slate-100 hover:bg-white/10">
                <Store className="mr-2 h-4 w-4" />
                Visualizar loja
              </Button>
            </Link>
            <Button
              className="bg-emerald-500 text-slate-950 hover:bg-emerald-400"
              onClick={() => void refreshDashboard()}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Sincronizar dados
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1680px] gap-6 px-4 py-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <Card className="border-white/10 bg-[#121d2a] text-slate-100 shadow-2xl shadow-black/20">
            <CardHeader>
              <CardTitle className="text-base text-white">Navegação ERP</CardTitle>
              <CardDescription className="text-slate-300">
                Acesso rápido aos módulos de gestão comercial.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeModule === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveModule(item.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                      isActive
                        ? "border-emerald-400 bg-emerald-500/15 text-white shadow-lg shadow-emerald-500/10"
                        : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? "text-emerald-300" : "text-slate-400"}`} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 text-slate-100 shadow-2xl shadow-black/20">
            <CardHeader>
              <CardTitle className="text-base text-white">Status do workspace</CardTitle>
              <CardDescription className="text-slate-300">
                Monitoramento do catálogo e da base operacional.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                <p className="text-xs uppercase tracking-[0.25em] text-emerald-300">Conexão</p>
                <p className="mt-1 text-sm font-semibold text-white">Backend sincronizado</p>
                <p className="text-xs text-slate-300">API interna em operação com leitura e gravação.</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-white/10 px-3 py-1 text-emerald-200">Produtos ativos {activeProducts.length}</span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-emerald-200">
                  Fornecedores {overview?.suppliersCount ?? 0}
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-emerald-200">
                  Promoções {overview?.promotionsCount ?? 0}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 text-slate-100 shadow-2xl shadow-black/20">
            <CardHeader>
              <CardTitle className="text-base text-white">Acesso administrativo</CardTitle>
              <CardDescription className="text-slate-300">
                Configure o token do painel para liberar as operações.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="admin-token" className="text-slate-200">
                  Token do admin
                </Label>
                <Input
                  id="admin-token"
                  value={tokenInput}
                  onChange={(event) => setTokenInput(event.target.value)}
                  placeholder="admin-dev"
                  className="border-white/10 bg-[#0f1823] text-white placeholder:text-slate-500"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Button className="bg-emerald-500 text-slate-950 hover:bg-emerald-400" onClick={() => void connectToken()}>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Salvar token
                </Button>
                <Button
                  variant="outline"
                  className="border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                  onClick={() => void refreshDashboard()}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Recarregar visao
                </Button>
              </div>
            </CardContent>
          </Card>
        </aside>

        <main className="space-y-6">
          <Card className="border-white/10 bg-[#111b26] text-slate-100 shadow-2xl shadow-black/20">
            <CardContent className="flex flex-col gap-4 p-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-emerald-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  Painel de Indicadores Gerais
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-white">Controle financeiro, operacional e comercial em tempo real</h2>
                  <p className="mt-1 max-w-3xl text-sm text-slate-300">
                    Analise receitas, estoque, promoções, pedidos e fornecedores em uma interface pensada para operação diária.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">Pedidos hoje</p>
                  <p className="mt-1 text-lg font-semibold text-white">{overview?.totalOrders ?? 0}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">Faturamento</p>
                  <p className="mt-1 text-lg font-semibold text-white">{formatCurrency(overview?.revenueCents ?? 0)}</p>
                </div>
                <Button className="bg-emerald-500 text-slate-950 hover:bg-emerald-400">
                  <Download className="mr-2 h-4 w-4" />
                  Exportar visao
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.25em] text-emerald-300">Estoque saudável</p>
                  <p className="mt-1 text-lg font-semibold text-white">{healthyStockCount}</p>
                  <p className="text-xs text-emerald-200/90">Itens com cobertura acima do mínimo.</p>
                </div>
                <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.25em] text-amber-200">Estoque em atenção</p>
                  <p className="mt-1 text-lg font-semibold text-white">{attentionStockCount}</p>
                  <p className="text-xs text-amber-100/90">Revisar giro e necessidade de reposição.</p>
                </div>
                <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.25em] text-rose-200">Estoque crítico</p>
                  <p className="mt-1 text-lg font-semibold text-white">{criticalStockCount}</p>
                  <p className="text-xs text-rose-100/90">Reposição prioritária para não faltar na loja.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">Pedidos em andamento</p>
                  <p className="mt-1 text-lg font-semibold text-white">{pendingOrders.length}</p>
                  <p className="text-xs text-slate-300">{fulfilledOrders.length} pedidos já fluindo na operação.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {error ? (
            <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          ) : null}

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="border-white/10 bg-[#121d2a] text-slate-100 shadow-2xl shadow-black/20">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Faturamento bruto</p>
                  <CircleDollarSign className="h-5 w-5 text-emerald-300" />
                </div>
                <p className="text-3xl font-semibold text-white">{formatCurrency(overview?.revenueCents ?? 0)}</p>
                <p className="text-sm text-emerald-300">{toCurrency(todayRevenue)} registrado hoje</p>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-[#121d2a] text-slate-100 shadow-2xl shadow-black/20">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Lucro estimado</p>
                  <ArrowUpRight className="h-5 w-5 text-sky-300" />
                </div>
                <p className="text-3xl font-semibold text-white">{formatCurrency(estimatedProfitCents)}</p>
                <p className="text-sm text-sky-300">Margem projetada com base no mix atual</p>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-[#121d2a] text-slate-100 shadow-2xl shadow-black/20">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Ticket médio</p>
                  <ShoppingBag className="h-5 w-5 text-amber-300" />
                </div>
                <p className="text-3xl font-semibold text-white">{formatCurrency(averageTicket)}</p>
                <p className="text-sm text-amber-300">Baseado em pedidos pagos</p>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-[#121d2a] text-slate-100 shadow-2xl shadow-black/20">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Estoque crítico</p>
                  <BellRing className="h-5 w-5 text-rose-300" />
                </div>
                <p className="text-3xl font-semibold text-white">{overview?.lowStockCount ?? 0}</p>
                <p className="text-sm text-rose-300">Itens abaixo do limite mínimo</p>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <Card className="border-white/10 bg-[#111b26] text-slate-100 shadow-2xl shadow-black/20">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-white">Analytics & Performance de Receita</CardTitle>
                  <CardDescription className="text-slate-300">
                    Evolucao mensal de faturamento, custo estimado e lucro liquido.
                  </CardDescription>
                </div>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                  Real-time
                </span>
              </CardHeader>
              <CardContent className="h-[360px]">
                <div className="h-full rounded-3xl border border-white/10 bg-[#0c141d] p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyChartData} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="rgba(148,163,184,0.15)" vertical={false} />
                      <XAxis dataKey="month" stroke="#94a3b8" tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                      <Tooltip
                        cursor={{ fill: "rgba(255,255,255,0.05)" }}
                        contentStyle={{
                          borderRadius: 16,
                          border: "1px solid rgba(255,255,255,0.1)",
                          background: "rgba(9,16,21,0.95)",
                          color: "#fff",
                        }}
                      />
                      <Bar dataKey="cost" fill="#475569" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="revenue" fill="#16a34a" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="profit" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-slate-500" />
                      Custo Mercadorias (CMV)
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      Faturamento Bruto
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                      Lucro Liquido
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-[#111b26] text-slate-100 shadow-2xl shadow-black/20">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-white">Alertas de reposição</CardTitle>
                  <CardDescription className="text-slate-300">
                    Itens que merecem atenção imediata do estoque.
                  </CardDescription>
                </div>
                <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200">
                  Urgente
                </span>
              </CardHeader>
              <CardContent className="space-y-3">
                {lowStockItems.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                    Nenhum alerta crítico por enquanto.
                  </div>
                ) : (
                  lowStockItems.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">{item.name}</p>
                          <p className="text-sm text-slate-300">
                            {item.category} · {item.stockQuantity} {item.unit}
                          </p>
                          <p className="mt-2 text-xs text-rose-200">{item.description}</p>
                        </div>
                        <span className="rounded-full bg-rose-400 px-3 py-1 text-xs font-semibold text-slate-950">
                          {Math.max(0, Math.round((item.stockQuantity / (item.minThreshold ?? 5000)) * 100))}% rest.
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
            <Card className="border-white/10 bg-[#111b26] text-slate-100 shadow-2xl shadow-black/20">
              <CardHeader>
                <CardTitle className="text-white">Indicadores e Fechamento de Caixa</CardTitle>
                <CardDescription className="text-slate-300">
                  Resumo rápido de operação, estoque e rentabilidade.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Pedidos ativos</p>
                  <p className="mt-2 text-3xl font-semibold text-white">{orders.length}</p>
                  <p className="mt-1 text-sm text-slate-300">Pedidos em acompanhamento operacional.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Produtos ativos</p>
                  <p className="mt-2 text-3xl font-semibold text-white">{activeProducts.length}</p>
                  <p className="mt-1 text-sm text-slate-300">Itens disponíveis para venda no catálogo.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Promoções ativas</p>
                  <p className="mt-2 text-3xl font-semibold text-white">{activePromotions.length}</p>
                  <p className="mt-1 text-sm text-slate-300">Destaques promocionais publicados na loja.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-[#111b26] text-slate-100 shadow-2xl shadow-black/20">
              <CardHeader>
                <CardTitle className="text-white">Movimentações recentes</CardTitle>
                <CardDescription className="text-slate-300">
                  Entradas, saídas e ajustes manuais registrados no sistema.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {movements.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                    Nenhuma movimentação registrada.
                  </div>
                ) : (
                  movements.slice(0, 5).map((movement) => (
                    <div key={movement.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">{movement.productName}</p>
                          <p className="text-sm text-slate-300">
                            {movement.reason ?? "Sem observacao"} · {new Date(movement.createdAt).toLocaleString("pt-BR")}
                          </p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${movementClass(movement.type)}`}>
                          {movementLabel(movement.type)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-200">Quantidade: {movement.quantity}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </section>

          {activeModule === "catalog" ? (
            <section className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
              <Card className="border-white/10 bg-[#111b26] text-slate-100 shadow-2xl shadow-black/20">
                <CardHeader>
                  <CardTitle className="text-white">Cadastro de itens</CardTitle>
                  <CardDescription className="text-slate-300">
                    Inclua produtos, ajuste preços e configure promoções.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="product-name" className="text-slate-200">Nome do item</Label>
                      <Input
                        id="product-name"
                        value={productDraft.name}
                        onChange={(event) => setProductDraft((current) => ({ ...current, name: event.target.value }))}
                        placeholder="Ex.: Carne de sol do Sertao"
                        className="border-white/10 bg-[#0f1823] text-white placeholder:text-slate-500"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="product-category" className="text-slate-200">Categoria</Label>
                      <Select
                        value={productDraft.categoryId}
                        onValueChange={(value) => {
                          const category = CATEGORY_OPTIONS.find((item) => item.id === value)?.label ?? value;
                          setProductDraft((current) => ({
                            ...current,
                            categoryId: value,
                            category,
                          }));
                        }}
                      >
                        <SelectTrigger id="product-category" className="border-white/10 bg-[#0f1823] text-white">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORY_OPTIONS.map((option) => (
                            <SelectItem key={option.id} value={option.id}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="product-price" className="text-slate-200">Preco base</Label>
                      <Input
                        id="product-price"
                        type="number"
                        step="0.01"
                        value={productDraft.price}
                        onChange={(event) => setProductDraft((current) => ({ ...current, price: event.target.value }))}
                        placeholder="39.90"
                        className="border-white/10 bg-[#0f1823] text-white placeholder:text-slate-500"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="product-promo-price" className="text-slate-200">Preco promocional</Label>
                      <Input
                        id="product-promo-price"
                        type="number"
                        step="0.01"
                        value={productDraft.promoPrice}
                        onChange={(event) => setProductDraft((current) => ({ ...current, promoPrice: event.target.value }))}
                        placeholder="34.90"
                        className="border-white/10 bg-[#0f1823] text-white placeholder:text-slate-500"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="product-unit" className="text-slate-200">Unidade</Label>
                      <Input
                        id="product-unit"
                        value={productDraft.unit}
                        onChange={(event) => setProductDraft((current) => ({ ...current, unit: event.target.value }))}
                        placeholder="/kg"
                        className="border-white/10 bg-[#0f1823] text-white placeholder:text-slate-500"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="product-stock" className="text-slate-200">Estoque inicial</Label>
                      <Input
                        id="product-stock"
                        type="number"
                        value={productDraft.initialStock}
                        onChange={(event) => setProductDraft((current) => ({ ...current, initialStock: event.target.value }))}
                        placeholder="5000"
                        className="border-white/10 bg-[#0f1823] text-white placeholder:text-slate-500"
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="product-description" className="text-slate-200">Descricao</Label>
                    <Textarea
                      id="product-description"
                      value={productDraft.description}
                      onChange={(event) => setProductDraft((current) => ({ ...current, description: event.target.value }))}
                      placeholder="Descreva o item com foco comercial."
                      className="min-h-32 border-white/10 bg-[#0f1823] text-white placeholder:text-slate-500"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="product-image" className="text-slate-200">Imagem</Label>
                      <Input
                        id="product-image"
                        value={productDraft.image}
                        onChange={(event) => setProductDraft((current) => ({ ...current, image: event.target.value }))}
                        placeholder="https://..."
                        className="border-white/10 bg-[#0f1823] text-white placeholder:text-slate-500"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="product-badge" className="text-slate-200">Selo</Label>
                      <Input
                        id="product-badge"
                        value={productDraft.badge}
                        onChange={(event) => setProductDraft((current) => ({ ...current, badge: event.target.value }))}
                        placeholder="Oferta especial"
                        className="border-white/10 bg-[#0f1823] text-white placeholder:text-slate-500"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="product-supplier" className="text-slate-200">Fornecedor</Label>
                      <Select
                        value={productDraft.supplierId || "none"}
                        onValueChange={(value) =>
                          setProductDraft((current) => ({ ...current, supplierId: value === "none" ? "" : value }))
                        }
                      >
                        <SelectTrigger id="product-supplier" className="border-white/10 bg-[#0f1823] text-white">
                          <SelectValue placeholder="Selecione o fornecedor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem fornecedor vinculado</SelectItem>
                          {suppliers.map((supplier) => (
                            <SelectItem key={supplier.id} value={supplier.id}>
                              {supplier.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="product-promo-label" className="text-slate-200">Legenda promocional</Label>
                      <Input
                        id="product-promo-label"
                        value={productDraft.promoLabel}
                        onChange={(event) => setProductDraft((current) => ({ ...current, promoLabel: event.target.value }))}
                        placeholder="Oferta especial"
                        className="border-white/10 bg-[#0f1823] text-white placeholder:text-slate-500"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <div>
                        <p className="font-semibold text-white">Produto ativo</p>
                        <p className="text-sm text-slate-300">Visivel na loja e disponível no checkout.</p>
                      </div>
                      <Switch
                        checked={productDraft.active}
                        onCheckedChange={(checked) => setProductDraft((current) => ({ ...current, active: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <div>
                        <p className="font-semibold text-white">Promoção ativa</p>
                        <p className="text-sm text-slate-300">Exibe destaque e preco promocional.</p>
                      </div>
                      <Switch
                        checked={productDraft.promoActive}
                        onCheckedChange={(checked) =>
                          setProductDraft((current) => ({ ...current, promoActive: checked }))
                        }
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button className="bg-emerald-500 text-slate-950 hover:bg-emerald-400" onClick={() => void saveProduct()}>
                      {selectedProductId ? <Save className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                      {selectedProductId ? "Salvar produto" : "Criar produto"}
                    </Button>
                    {selectedProductId ? (
                      <Button
                        variant="outline"
                        className="border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
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

              <Card className="border-white/10 bg-[#111b26] text-slate-100 shadow-2xl shadow-black/20">
                <CardHeader>
                  <CardTitle className="text-white">Itens cadastrados</CardTitle>
                  <CardDescription className="text-slate-300">
                    Edite dados, preco, promoção e estoque rapidamente.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {products.length === 0 ? (
                    <p className="text-sm text-slate-300">Nenhum produto encontrado.</p>
                  ) : (
                    products.map((product) => (
                      <div
                        key={product.id}
                        className={`rounded-2xl border p-4 transition ${
                          selectedProductId === product.id
                            ? "border-emerald-400 bg-emerald-500/10"
                            : "border-white/10 bg-white/5"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProductId(product.id);
                            setProductDraft(createProductDraft(product));
                          }}
                          className="mb-4 flex w-full items-start gap-3 text-left"
                        >
                          <Package className="mt-1 h-5 w-5 text-emerald-300" />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-white">{product.name}</p>
                              {!product.active ? (
                                <span className="rounded-full bg-slate-700 px-2 py-0.5 text-[11px] font-semibold text-slate-200">
                                  Inativo
                                </span>
                              ) : null}
                              {product.promoActive ? (
                                <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-semibold text-slate-950">
                                  Promoção
                                </span>
                              ) : null}
                            </div>
                            <p className="text-sm text-slate-300">{product.category}</p>
                            <p className="text-xs text-slate-400">
                              {formatCurrency(product.priceCents)} • Estoque {product.stockQuantity} {product.unit}
                            </p>
                          </div>
                        </button>

                        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                          <div className="grid gap-2">
                            <Label className="text-slate-200">Ajuste manual de estoque</Label>
                            <Input
                              type="number"
                              min={0}
                              value={stockDrafts[product.id] ?? String(product.stockQuantity)}
                              onChange={(event) =>
                                setStockDrafts((current) => ({
                                  ...current,
                                  [product.id]: event.target.value,
                                }))
                              }
                              className="border-white/10 bg-[#0f1823] text-white"
                            />
                          </div>
                          <Button
                            variant="outline"
                            className="border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                            onClick={() => void updateStock(product.id)}
                          >
                            <Save className="mr-2 h-4 w-4" />
                            Salvar estoque
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </section>
          ) : null}

          {activeModule === "suppliers" ? (
            <section className="grid gap-6 xl:grid-cols-[1.15fr_1fr]">
              <Card className="border-white/10 bg-[#111b26] text-slate-100 shadow-2xl shadow-black/20">
                <CardHeader>
                  <CardTitle className="text-white">Cadastro de fornecedores</CardTitle>
                  <CardDescription className="text-slate-300">
                    Registre parceiros comerciais e vincule-os aos produtos.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="supplier-name" className="text-slate-200">Nome</Label>
                      <Input
                        id="supplier-name"
                        value={supplierDraft.name}
                        onChange={(event) => setSupplierDraft((current) => ({ ...current, name: event.target.value }))}
                        placeholder="Ex.: Distribuidora Nordeste"
                        className="border-white/10 bg-[#0f1823] text-white placeholder:text-slate-500"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="supplier-contact" className="text-slate-200">Contato</Label>
                      <Input
                        id="supplier-contact"
                        value={supplierDraft.contact}
                        onChange={(event) =>
                          setSupplierDraft((current) => ({ ...current, contact: event.target.value }))
                        }
                        placeholder="(11) 99999-9999"
                        className="border-white/10 bg-[#0f1823] text-white placeholder:text-slate-500"
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="supplier-email" className="text-slate-200">E-mail</Label>
                      <Input
                        id="supplier-email"
                        value={supplierDraft.email}
                        onChange={(event) => setSupplierDraft((current) => ({ ...current, email: event.target.value }))}
                        placeholder="contato@fornecedor.com.br"
                        className="border-white/10 bg-[#0f1823] text-white placeholder:text-slate-500"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="supplier-city" className="text-slate-200">Cidade</Label>
                      <Input
                        id="supplier-city"
                        value={supplierDraft.city}
                        onChange={(event) => setSupplierDraft((current) => ({ ...current, city: event.target.value }))}
                        placeholder="Osasco"
                        className="border-white/10 bg-[#0f1823] text-white placeholder:text-slate-500"
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="supplier-notes" className="text-slate-200">Observações</Label>
                    <Textarea
                      id="supplier-notes"
                      value={supplierDraft.notes}
                      onChange={(event) => setSupplierDraft((current) => ({ ...current, notes: event.target.value }))}
                      placeholder="Prazos, condições de entrega, volume mínimo..."
                      className="min-h-32 border-white/10 bg-[#0f1823] text-white placeholder:text-slate-500"
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <div>
                      <p className="font-semibold text-white">Fornecedor ativo</p>
                      <p className="text-sm text-slate-300">Disponível para cadastro de itens e promoções.</p>
                    </div>
                    <Switch
                      checked={supplierDraft.active}
                      onCheckedChange={(checked) =>
                        setSupplierDraft((current) => ({ ...current, active: checked }))
                      }
                    />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button className="bg-emerald-500 text-slate-950 hover:bg-emerald-400" onClick={() => void saveSupplier()}>
                      {selectedSupplierId ? <Save className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                      {selectedSupplierId ? "Salvar fornecedor" : "Criar fornecedor"}
                    </Button>
                    {selectedSupplierId ? (
                      <Button
                        variant="outline"
                        className="border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                        onClick={() => {
                          setSelectedSupplierId(null);
                          setSupplierDraft(createEmptySupplierDraft());
                        }}
                      >
                        Novo cadastro
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-[#111b26] text-slate-100 shadow-2xl shadow-black/20">
                <CardHeader>
                  <CardTitle className="text-white">Fornecedores cadastrados</CardTitle>
                  <CardDescription className="text-slate-300">
                    Toque em um registro para carregar os dados no formulário.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {suppliers.length === 0 ? (
                    <p className="text-sm text-slate-300">Nenhum fornecedor cadastrado.</p>
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
                            ? "border-emerald-400 bg-emerald-500/10"
                            : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Users className="mt-1 h-5 w-5 text-emerald-300" />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-white">{supplier.name}</p>
                              {!supplier.active ? (
                                <span className="rounded-full bg-slate-700 px-2 py-0.5 text-[11px] font-semibold text-slate-200">
                                  Inativo
                                </span>
                              ) : null}
                            </div>
                            <p className="text-sm text-slate-300">{supplier.contact}</p>
                            <p className="text-xs text-slate-400">
                              {supplier.city ?? "Cidade nao informada"} • {supplier.email ?? "Sem e-mail"}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </CardContent>
              </Card>
            </section>
          ) : null}

          {activeModule === "orders" ? (
            <Card className="border-white/10 bg-[#111b26] text-slate-100 shadow-2xl shadow-black/20">
              <CardHeader>
                <CardTitle className="text-white">Controle de pedidos</CardTitle>
                <CardDescription className="text-slate-300">
                  Atualize o andamento de cada pedido conforme a operação avança.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {orders.length === 0 ? (
                  <p className="text-sm text-slate-300">Nenhum pedido encontrado ainda.</p>
                ) : (
                  orders.map((order) => (
                    <div key={order.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">{order.orderNumber}</p>
                          <p className="text-sm text-slate-300">
                            {order.customer.name} • {order.customer.email}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {new Date(order.createdAt).toLocaleString("pt-BR")}
                          </p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(order.status)}`}>
                          {statusLabel(order.status)}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <div className="rounded-xl bg-black/20 p-3">
                          <p className="text-xs uppercase tracking-wide text-slate-400">Pagamento</p>
                          <p className="mt-1 font-semibold text-white">{order.paymentStatus}</p>
                        </div>
                        <div className="rounded-xl bg-black/20 p-3">
                          <p className="text-xs uppercase tracking-wide text-slate-400">Metodo</p>
                          <p className="mt-1 font-semibold text-white">{order.paymentMethod}</p>
                        </div>
                        <div className="rounded-xl bg-black/20 p-3">
                          <p className="text-xs uppercase tracking-wide text-slate-400">Total</p>
                          <p className="mt-1 font-semibold text-white">{formatCurrency(order.totalCents)}</p>
                        </div>
                      </div>

                      <Separator className="my-4 bg-white/10" />

                      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                        <div className="grid flex-1 gap-2">
                          <Label htmlFor={`status-${order.id}`} className="text-slate-200">
                            Status operacional
                          </Label>
                          <Select
                            value={statusDrafts[order.id] ?? order.status}
                            onValueChange={(value) =>
                              setStatusDrafts((current) => ({
                                ...current,
                                [order.id]: value as OrderStatus,
                              }))
                            }
                          >
                            <SelectTrigger id={`status-${order.id}`} className="border-white/10 bg-[#0f1823] text-white">
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
                        <Button className="bg-emerald-500 text-slate-950 hover:bg-emerald-400" onClick={() => void updateOrderStatus(order.id)}>
                          <Save className="mr-2 h-4 w-4" />
                          Salvar status
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ) : null}

          {activeModule === "movements" ? (
            <Card className="border-white/10 bg-[#111b26] text-slate-100 shadow-2xl shadow-black/20">
              <CardHeader>
                <CardTitle className="text-white">Movimentações de estoque</CardTitle>
                <CardDescription className="text-slate-300">
                  Acompanhe entradas, saídas e ajustes manuais por produto.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {movements.length === 0 ? (
                  <p className="text-sm text-slate-300">Nenhuma movimentação registrada.</p>
                ) : (
                  movements.map((movement) => (
                    <div key={movement.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">{movement.productName}</p>
                          <p className="text-sm text-slate-300">
                            {movement.reason ?? "Sem observacao"} • {new Date(movement.createdAt).toLocaleString("pt-BR")}
                          </p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${movementClass(movement.type)}`}>
                          {movementLabel(movement.type)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-200">Quantidade: {movement.quantity}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ) : null}

          {activeModule === "promotions" ? (
            <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
              <Card className="border-white/10 bg-[#111b26] text-slate-100 shadow-2xl shadow-black/20">
                <CardHeader>
                  <CardTitle className="text-white">Promoções em destaque</CardTitle>
                  <CardDescription className="text-slate-300">
                    Produtos com campanha ativa e preço especial.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {activePromotions.length === 0 ? (
                    <p className="text-sm text-slate-300">Nenhuma promoção ativa no momento.</p>
                  ) : (
                    activePromotions.map((product) => (
                      <div key={product.id} className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-white">{product.name}</p>
                            <p className="text-sm text-slate-300">{product.promoLabel ?? "Oferta ativa"}</p>
                          </div>
                          <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-semibold text-slate-950">
                            {formatCurrency(product.promoPriceCents ?? product.priceCents)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-[#111b26] text-slate-100 shadow-2xl shadow-black/20">
                <CardHeader>
                  <CardTitle className="text-white">Resumo de catálogo</CardTitle>
                  <CardDescription className="text-slate-300">
                    Composição atual do portfólio da loja.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Produtos ativos</p>
                    <p className="mt-2 text-3xl font-semibold text-white">{activeProducts.length}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Produtos com promoção</p>
                    <p className="mt-2 text-3xl font-semibold text-white">{activePromotions.length}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Fornecedores</p>
                    <p className="mt-2 text-3xl font-semibold text-white">{suppliers.length}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Estoque crítico</p>
                    <p className="mt-2 text-3xl font-semibold text-white">{overview?.lowStockCount ?? 0}</p>
                  </div>
                </CardContent>
              </Card>
            </section>
          ) : null}

          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
              Carregando painel...
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
