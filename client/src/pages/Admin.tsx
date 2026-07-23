import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Banknote,
  Package,
  PencilLine,
  PlusCircle,
  RefreshCw,
  Save,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Truck,
  Users,
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

const STORAGE_KEY = "rn-admin-token";
const ORDER_STATUSES: OrderStatus[] = ["pending_payment", "paid", "preparing", "shipped", "delivered", "cancelled"];
const CATEGORY_OPTIONS = [
  { id: "carnes secas", label: "Carnes secas" },
  { id: "cuscuz e massas", label: "Cuscuz e massas" },
  { id: "farinhas", label: "Farinhas" },
  { id: "laticínios", label: "Laticínios" },
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
  const [stockDrafts, setStockDrafts] = useState<Record<string, string>>({});
  const [statusDrafts, setStatusDrafts] = useState<Record<string, OrderStatus>>({});
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [productDraft, setProductDraft] = useState<ProductDraft>(createEmptyProductDraft());
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [supplierDraft, setSupplierDraft] = useState<SupplierDraft>(createEmptySupplierDraft());

  const overview = dashboard?.overview;
  const products = dashboard?.products ?? [];
  const stock = dashboard?.stock ?? [];
  const orders = dashboard?.orders ?? [];
  const suppliers = dashboard?.suppliers ?? [];
  const movements = dashboard?.movements ?? [];
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
      setStockDrafts(Object.fromEntries(response.stock.map((item) => [item.id, String(item.stockQuantity)])));
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

  async function updateStock(productId: string) {
    const nextQuantity = Number(stockDrafts[productId]);
    if (Number.isNaN(nextQuantity) || nextQuantity < 0) {
      toast.error("Informe uma quantidade válida.");
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
    <div className="min-h-screen bg-[linear-gradient(180deg,#fbf8f2_0%,#ffffff_100%)] px-4 py-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/">
              <Button variant="ghost" className="mb-3 px-0 text-muted-foreground">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para a loja
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-foreground md:text-4xl" style={{ fontFamily: "Playfair Display" }}>
              Painel administrativo
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Catálogo, estoque, preços, promoções e fornecedores em uma visão profissional.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <ShieldCheck className="h-4 w-4" />
            Acesso administrativo protegido por token
          </div>
        </div>

        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>Acesso ao painel</CardTitle>
            <CardDescription>Use o token configurado em `ADMIN_ACCESS_TOKEN` ou o padrão `admin-dev`.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="grid flex-1 gap-2">
              <Label htmlFor="admin-token">Token do admin</Label>
              <Input
                id="admin-token"
                value={tokenInput}
                onChange={(event) => setTokenInput(event.target.value)}
                placeholder="admin-dev"
              />
            </div>
            <div className="flex gap-3">
              <Button onClick={() => void connectToken()}>Salvar token</Button>
              <Button variant="outline" onClick={() => void refreshDashboard()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Atualizar
              </Button>
            </div>
          </CardContent>
        </Card>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pedidos totais</p>
                  <p className="mt-1 text-3xl font-bold">{overview?.totalOrders ?? 0}</p>
                </div>
                <ShoppingBag className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pedidos pagos</p>
                  <p className="mt-1 text-3xl font-bold">{overview?.paidOrders ?? 0}</p>
                </div>
                <Banknote className="h-8 w-8 text-emerald-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Faturamento</p>
                  <p className="mt-1 text-3xl font-bold">{formatCurrency(overview?.revenueCents ?? 0)}</p>
                </div>
                <Truck className="h-8 w-8 text-indigo-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Produtos ativos</p>
                  <p className="mt-1 text-3xl font-bold">{overview?.activeProducts ?? 0}</p>
                </div>
                <Package className="h-8 w-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Estoque baixo</p>
                  <p className="mt-1 text-3xl font-bold">{overview?.lowStockCount ?? 0}</p>
                </div>
                <Truck className="h-8 w-8 text-rose-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="catalog" className="space-y-6">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-2 bg-transparent p-0 md:grid-cols-6">
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

                  <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/40 p-4">
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
                    <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
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
                          selectedProductId === product.id ? "border-emerald-400 bg-emerald-50" : "border-border bg-white"
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
                <CardDescription>Ajuste quantidades manualmente e mantenha os números alinhados com a operação.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {stock.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum item de estoque carregado.</p>
                ) : (
                  stock.map((product) => (
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

                      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                        <div className="grid flex-1 gap-2">
                          <Label htmlFor={`stock-${product.id}`}>Quantidade</Label>
                          <Input
                            id={`stock-${product.id}`}
                            type="number"
                            min="0"
                            value={stockDrafts[product.id] ?? String(product.stockQuantity)}
                            onChange={(event) =>
                              setStockDrafts((current) => ({
                                ...current,
                                [product.id]: event.target.value,
                              }))
                            }
                          />
                        </div>
                        <Button variant="outline" onClick={() => void updateStock(product.id)}>
                          Salvar estoque
                        </Button>
                      </div>
                    </div>
                  ))
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
                    <div key={product.id} className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4">
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
                    <div className="flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50/50 px-4 py-3">
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
                          selectedSupplierId === supplier.id ? "border-emerald-400 bg-emerald-50" : "border-border bg-white"
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
                        <div className="rounded-xl bg-[#fbf8f2] p-3">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Pagamento</p>
                          <p className="mt-1 font-semibold">{order.paymentStatus}</p>
                        </div>
                        <div className="rounded-xl bg-[#fbf8f2] p-3">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Método</p>
                          <p className="mt-1 font-semibold">{order.paymentMethod}</p>
                        </div>
                        <div className="rounded-xl bg-[#fbf8f2] p-3">
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
