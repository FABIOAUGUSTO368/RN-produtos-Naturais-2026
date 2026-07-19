import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, RefreshCw, ShieldCheck, ShoppingBag, Package, Truck, Banknote } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

type OrderStatus = "pending_payment" | "paid" | "preparing" | "shipped" | "delivered" | "cancelled";

interface AdminOverview {
  totalOrders: number;
  paidOrders: number;
  revenueCents: number;
  lowStockCount: number;
  activeProducts: number;
}

interface AdminProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  image: string;
  stockQuantity: number;
  minThreshold: number;
  lowStock: boolean;
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

interface DashboardResponse {
  overview: AdminOverview;
  stock: AdminProduct[];
  orders: AdminOrder[];
}

const STORAGE_KEY = "rn-admin-token";
const ORDER_STATUSES: OrderStatus[] = ["pending_payment", "paid", "preparing", "shipped", "delivered", "cancelled"];

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

export default function Admin() {
  const [tokenInput, setTokenInput] = useState(loadToken);
  const [token, setToken] = useState(loadToken);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [stockDrafts, setStockDrafts] = useState<Record<string, string>>({});
  const [statusDrafts, setStatusDrafts] = useState<Record<string, OrderStatus>>({});

  const overview = dashboard?.overview;
  const stock = dashboard?.stock ?? [];
  const orders = dashboard?.orders ?? [];

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
      const response = (await apiFetch("/api/admin/dashboard")) as DashboardResponse;
      setDashboard(response);
      setStockDrafts(Object.fromEntries(response.stock.map((item) => [item.id, String(item.stockQuantity)])));
      setStatusDrafts(Object.fromEntries(response.orders.map((order) => [order.id, order.status])));
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
          stock: current.stock.map((item) => (item.id === productId ? payload.product : item)),
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
              Painel Admin
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Pedidos, estoque e status da operação em uma única visão.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <ShieldCheck className="h-4 w-4" />
            Token local para ambiente de administração
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

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
                  <p className="text-sm text-muted-foreground">Estoque baixo</p>
                  <p className="mt-1 text-3xl font-bold">{overview?.lowStockCount ?? 0}</p>
                </div>
                <Package className="h-8 w-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
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

          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle>Estoque</CardTitle>
              <CardDescription>Ajuste os números e mantenha o catálogo alinhado com a operação.</CardDescription>
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
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">Carregando painel...</div>
        ) : null}
      </div>
    </div>
  );
}
