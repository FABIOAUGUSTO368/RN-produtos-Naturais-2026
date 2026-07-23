import { useMemo, useState } from "react";
import { Copy, Check, ExternalLink, QrCode, Minus, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { CartItem } from "@/lib/store";

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
  paymentMethod: string;
  notes?: string;
  items: CartItem[];
}

export interface CheckoutResult {
  order: {
    id: string;
    orderNumber: string;
  };
  paymentMethod?: string;
  initPoint?: string;
  sandboxInitPoint?: string | null;
  pix?: {
    paymentId: string;
    status: string;
    statusDetail: string;
    ticketUrl: string;
    qrCode: string;
    qrCodeBase64: string;
  } | null;
}

interface CartSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CartItem[];
  subtotal: number;
  shipping: number;
  total: number;
  onIncrease: (item: CartItem) => void;
  onDecrease: (item: CartItem) => void;
  onRemove: (item: CartItem) => void;
  onClear: () => void;
  onSubmitOrder: (payload: CheckoutPayload) => Promise<CheckoutResult>;
}

const initialForm = {
  name: "",
  email: "",
  phone: "",
  zip: "",
  street: "",
  number: "",
  neighborhood: "",
  city: "",
  state: "RN",
  complement: "",
  paymentMethod: "pix",
  notes: "",
};

export default function CartSheet({
  open,
  onOpenChange,
  items,
  subtotal,
  shipping,
  total,
  onIncrease,
  onDecrease,
  onRemove,
  onClear,
  onSubmitOrder,
}: CartSheetProps) {
  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pixPayment, setPixPayment] = useState<CheckoutResult["pix"]>(null);
  const [pixOrderNumber, setPixOrderNumber] = useState("");
  const [isPixDialogOpen, setIsPixDialogOpen] = useState(false);
  const [isPixCopied, setIsPixCopied] = useState(false);

  const itemCount = useMemo(() => items.reduce((acc, item) => acc + item.quantity, 0), [items]);

  const copyPixCode = async () => {
    if (!pixPayment?.qrCode) {
      return;
    }

    try {
      await navigator.clipboard.writeText(pixPayment.qrCode);
      setIsPixCopied(true);
      toast.success("Código Pix copiado.");
      window.setTimeout(() => setIsPixCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar o código Pix.");
    }
  };

  const submitCheckout = async () => {
    if (items.length === 0) {
      toast.error("Seu carrinho está vazio.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await onSubmitOrder({
        customer: {
          name: form.name,
          email: form.email,
          phone: form.phone,
        },
        address: {
          zip: form.zip,
          street: form.street,
          number: form.number,
          neighborhood: form.neighborhood,
          city: form.city,
          state: form.state,
          complement: form.complement,
        },
        paymentMethod: form.paymentMethod,
        notes: form.notes,
        items,
      });

      if (form.paymentMethod === "pix") {
        if (!result.pix) {
          throw new Error("Não foi possível gerar os dados do PIX.");
        }

        setPixPayment(result.pix);
        setPixOrderNumber(result.order.orderNumber);
        setIsPixDialogOpen(true);
        setForm(initialForm);
        onClear();
        onOpenChange(false);
        return;
      }

      const paymentUrl = result.initPoint || result.sandboxInitPoint;
      if (!paymentUrl) {
        throw new Error("Não foi possível gerar o link de pagamento.");
      }

      setForm(initialForm);
      onClear();
      onOpenChange(false);
      window.location.assign(paymentUrl);
    } catch (error) {
      toast.error("Não foi possível concluir o pedido.", {
        description: String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-[520px]">
          <SheetHeader>
            <SheetTitle>Seu carrinho</SheetTitle>
            <SheetDescription>
              {itemCount} item(ns) pronto(s) para checkout com PIX, cartão ou boleto.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-4 overflow-y-auto px-4">
            {items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-[#fbf8f2] p-6 text-center">
                <p className="font-semibold text-foreground">Seu carrinho está vazio</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Adicione produtos da vitrine para montar seu pedido.
                </p>
              </div>
            ) : (
              items.map((item) => (
                <div key={`${item.productId}-${item.weight}`} className="rounded-2xl border border-border bg-white p-4 shadow-sm">
                  <div className="flex gap-3">
                    <img src={item.image} alt={item.name} className="h-20 w-20 rounded-xl object-cover" />
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.category} • {item.weight}g
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemove(item)}
                          className="rounded-full p-1 text-muted-foreground transition hover:bg-muted hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <p className="text-sm font-semibold text-emerald-800">
                          R$ {(item.price * item.quantity).toFixed(2)}
                        </p>
                        <div className="flex items-center gap-2 rounded-full border border-border px-2 py-1">
                          <button
                            type="button"
                            onClick={() => onDecrease(item)}
                            className="grid h-6 w-6 place-items-center rounded-full hover:bg-muted"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="min-w-5 text-center text-sm font-semibold">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => onIncrease(item)}
                            className="grid h-6 w-6 place-items-center rounded-full hover:bg-muted"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}

            <Separator />

            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void submitCheckout();
              }}
            >
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zip">CEP</Label>
                    <Input id="zip" value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="street">Endereço</Label>
                  <Input id="street" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} required />
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="number">Número</Label>
                    <Input id="number" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="neighborhood">Bairro</Label>
                    <Input id="neighborhood" value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">Estado</Label>
                    <Input id="state" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input id="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
                </div>

                <div className="space-y-2">
                  <Label>Pagamento</Label>
                  <Select value={form.paymentMethod} onValueChange={(value) => setForm({ ...form, paymentMethod: value })}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Escolha o pagamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="card">Cartão</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Ex.: deixar na portaria, trocar peso, etc."
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-[#fbf8f2] p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold text-foreground">R$ {subtotal.toFixed(2)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Frete</span>
                  <span className="font-semibold text-foreground">{shipping === 0 ? "Grátis" : `R$ ${shipping.toFixed(2)}`}</span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-base">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="text-lg font-bold text-primary">R$ {total.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                <ShieldCheck className="h-4 w-4" />
                Checkout seguro, pedido salvo na API local e pronto para integração real.
              </div>
            </form>
          </div>

          <SheetFooter className="border-t border-border">
            <div className="flex w-full flex-col gap-3">
              <Button
                type="button"
                onClick={() => void submitCheckout()}
                disabled={isSubmitting || items.length === 0}
                className="w-full"
              >
                {isSubmitting ? "Finalizando..." : "Finalizar pedido"}
              </Button>
              <Button type="button" variant="outline" onClick={onClear} className="w-full">
                Limpar carrinho
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog
        open={isPixDialogOpen}
        onOpenChange={(open) => {
          setIsPixDialogOpen(open);
          if (!open) {
            setPixPayment(null);
            setPixOrderNumber("");
            setIsPixCopied(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-[840px] rounded-[28px] border border-emerald-100 bg-gradient-to-b from-white via-[#f9fbf7] to-[#f5f9f1] p-0 shadow-[0_30px_80px_rgba(16,24,40,0.22)]">
          <div className="border-b border-emerald-100 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.08),transparent_42%)] px-6 pt-6 pb-5 sm:px-8">
            <DialogHeader className="text-left">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">PIX disponível</Badge>
                {pixOrderNumber ? <Badge variant="secondary">Pedido {pixOrderNumber}</Badge> : null}
              </div>
              <DialogTitle className="mt-3 flex items-center gap-3 text-2xl text-emerald-950">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-600 text-white shadow-sm">
                  <QrCode className="h-5 w-5" />
                </span>
                Pagamento PIX gerado com sucesso
              </DialogTitle>
              <DialogDescription className="max-w-2xl text-sm leading-6 text-slate-600">
                Escaneie o QR Code ou copie o código Pix abaixo para concluir o pagamento. Assim que o banco
                confirmar a transação, o pedido seguirá para processamento automaticamente.
              </DialogDescription>
            </DialogHeader>
          </div>

          {pixPayment ? (
            <div className="grid gap-6 px-6 py-6 sm:px-8 lg:grid-cols-[300px_minmax(0,1fr)]">
              <div className="rounded-[24px] border border-emerald-100 bg-white p-4 shadow-[0_12px_30px_rgba(16,24,40,0.08)]">
                <div className="rounded-[20px] border border-emerald-100 bg-[linear-gradient(180deg,#f8fff8_0%,#eef8ee_100%)] p-4">
                  <div className="rounded-[18px] bg-white p-3 shadow-inner">
                    <img
                      src={`data:image/png;base64,${pixPayment.qrCodeBase64}`}
                      alt="QR Code Pix"
                      className="mx-auto aspect-square w-full max-w-[240px] rounded-[14px] object-contain"
                    />
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-semibold text-emerald-950">Escaneie com seu banco</p>
                  <p className="text-sm leading-6 text-slate-600">
                    Abra o app do banco, selecione PIX e leia o QR Code para pagar sem digitar nada.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(16,24,40,0.06)]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
                        Copia e cola PIX
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        Use esse código se preferir pagar manualmente no aplicativo do banco.
                      </p>
                    </div>
                    <Badge className="bg-emerald-50 text-emerald-800 hover:bg-emerald-50">Status: {pixPayment.status}</Badge>
                  </div>

                  <div className="mt-4 rounded-[18px] border border-slate-200 bg-slate-50 p-4">
                    <Textarea
                      readOnly
                      value={pixPayment.qrCode}
                      className="min-h-[132px] resize-none border-0 bg-transparent p-0 font-mono text-[11px] leading-5 text-slate-700 shadow-none outline-none"
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button type="button" onClick={copyPixCode} className="gap-2 rounded-full px-5">
                      {isPixCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {isPixCopied ? "Código copiado" : "Copiar código"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => window.open(pixPayment.ticketUrl, "_blank", "noopener,noreferrer")}
                      className="gap-2 rounded-full px-5"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Ver instruções do Pix
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 rounded-[24px] border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-950">
                  <p className="font-semibold">Seu pedido está reservado</p>
                  <p className="leading-6 text-emerald-950/90">
                    Assim que o pagamento for confirmado pelo Mercado Pago, o pedido será atualizado para
                    preparação e você poderá acompanhar tudo pelo painel.
                  </p>
                  <p className="text-xs font-medium text-emerald-800">
                    Situação técnica: {pixPayment.status} • {pixPayment.statusDetail}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
