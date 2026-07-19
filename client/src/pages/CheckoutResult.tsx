import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, PackageCheck, Truck, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type OrderStatus = "pending_payment" | "paid" | "preparing" | "shipped" | "delivered" | "cancelled";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  subtotalCents: number;
}

interface OrderData {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: string;
  paymentMethod: string;
  totalCents: number;
  subtotalCents: number;
  shippingCents: number;
  createdAt: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  address: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    zip: string;
  };
  items: OrderItem[];
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function statusLabel(status: OrderStatus) {
  const labels: Record<OrderStatus, string> = {
    pending_payment: "Aguardando pagamento",
    paid: "Pagamento confirmado",
    preparing: "Pedido em preparação",
    shipped: "Saiu para entrega",
    delivered: "Entregue com sucesso",
    cancelled: "Pedido cancelado",
  };

  return labels[status];
}

function statusTone(status: OrderStatus) {
  const tones: Record<OrderStatus, string> = {
    pending_payment: "text-amber-700",
    paid: "text-emerald-700",
    preparing: "text-blue-700",
    shipped: "text-indigo-700",
    delivered: "text-green-700",
    cancelled: "text-rose-700",
  };

  return tones[status];
}

export default function CheckoutResult() {
  const orderId = useMemo(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return new URLSearchParams(window.location.search).get("order_id") ?? "";
  }, []);

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(Boolean(orderId));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      setError("Nenhum pedido foi informado na URL.");
      return;
    }

    let intervalId: number | undefined;
    let cancelled = false;

    const loadOrder = async () => {
      try {
        const response = await fetch(`/api/orders/${orderId}`);
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? "Não foi possível carregar o pedido.");
        }

        const data = (await response.json()) as { order: OrderData };
        if (!cancelled) {
          setOrder(data.order);
          setError("");
        }

        if (data.order.status === "pending_payment" || data.order.status === "paid" || data.order.status === "preparing") {
          intervalId = window.setTimeout(() => {
            void loadOrder();
          }, 5000);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Falha ao carregar o pedido.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadOrder();

    return () => {
      cancelled = true;
      if (intervalId) {
        window.clearTimeout(intervalId);
      }
    };
  }, [orderId]);

  const timeline = [
    { key: "pending_payment", icon: Clock3, title: "Pedido recebido" },
    { key: "paid", icon: CheckCircle2, title: "Pagamento confirmado" },
    { key: "preparing", icon: PackageCheck, title: "Pedido em preparação" },
    { key: "shipped", icon: Truck, title: "Saiu para entrega" },
  ] as const;

  const activeIndex = order ? timeline.findIndex((step) => step.key === order.status) : -1;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff7e6_0%,#fbf8f2_45%,#ffffff_100%)] px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link href="/">
          <Button variant="ghost" className="px-0 text-muted-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para a loja
          </Button>
        </Link>

        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle className="text-3xl" style={{ fontFamily: "Playfair Display" }}>
              Acompanhamento do pedido
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? <p className="text-sm text-muted-foreground">Carregando pedido...</p> : null}
            {error ? <p className="text-sm text-rose-700">{error}</p> : null}

            {order ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Pedido</p>
                    <p className="text-2xl font-bold text-foreground">{order.orderNumber}</p>
                  </div>
                  <div className={`text-right text-sm font-semibold ${statusTone(order.status)}`}>
                    {statusLabel(order.status)}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl bg-[#fbf8f2] p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Cliente</p>
                    <p className="mt-1 font-semibold">{order.customer.name}</p>
                    <p className="text-sm text-muted-foreground">{order.customer.email}</p>
                  </div>
                  <div className="rounded-2xl bg-[#fbf8f2] p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Pagamento</p>
                    <p className="mt-1 font-semibold">{order.paymentStatus}</p>
                    <p className="text-sm text-muted-foreground">{order.paymentMethod}</p>
                  </div>
                  <div className="rounded-2xl bg-[#fbf8f2] p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Total</p>
                    <p className="mt-1 text-xl font-bold text-primary">{formatCurrency(order.totalCents)}</p>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-3 md:grid-cols-4">
                  {timeline.map((step, index) => {
                    const Icon = step.icon;
                    const isActive = activeIndex >= index || order.status === "delivered";
                    return (
                      <div
                        key={step.key}
                        className={`rounded-2xl border p-4 ${isActive ? "border-primary/20 bg-primary/5" : "border-border bg-white"}`}
                      >
                        <Icon className={`h-5 w-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                        <p className="mt-3 text-sm font-semibold text-foreground">{step.title}</p>
                      </div>
                    );
                  })}
                  <div className={`rounded-2xl border p-4 ${order.status === "delivered" ? "border-emerald-200 bg-emerald-50" : "border-border bg-white"}`}>
                    <CheckCircle2 className={`h-5 w-5 ${order.status === "delivered" ? "text-emerald-700" : "text-muted-foreground"}`} />
                    <p className="mt-3 text-sm font-semibold text-foreground">Entregue</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-white p-4">
                  <p className="text-sm font-semibold text-foreground">Endereço de entrega</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {order.address.street}, {order.address.number} - {order.address.neighborhood}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {order.address.city}/{order.address.state} - CEP {order.address.zip}
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-white p-4">
                  <p className="text-sm font-semibold text-foreground">Itens do pedido</p>
                  <div className="mt-3 space-y-3">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">{item.name}</p>
                          <p className="text-sm text-muted-foreground">Qtd. {item.quantity}</p>
                        </div>
                        <p className="font-semibold text-foreground">{formatCurrency(item.subtotalCents)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : null}

            {!loading && !order && !error ? (
              <p className="text-sm text-muted-foreground">Nenhum pedido disponível no momento.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
