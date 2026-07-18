import { ArrowRight, BadgeCheck, MessageCircleMore, ShieldCheck, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-[linear-gradient(180deg,#fbf8f2_0%,#ffffff_100%)]">
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2">
          <div className="order-2 flex flex-col gap-6 md:order-1">
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className="rounded-full border-primary/35 bg-primary/5 px-3 py-1 text-primary"
              >
                Casa do Norte
              </Badge>
              <Badge
                variant="outline"
                className="rounded-full border-[#d98b41]/40 bg-[#d98b41]/5 px-3 py-1 text-[#d98b41]"
              >
                Chat ao vivo
              </Badge>
              <Badge
                variant="outline"
                className="rounded-full border-emerald-500/30 bg-emerald-500/5 px-3 py-1 text-emerald-700"
              >
                PIX e cartão
              </Badge>
            </div>

            <div className="space-y-4">
              <h1
                className="max-w-xl text-4xl font-bold leading-tight text-foreground md:text-[2.75rem]"
                style={{ fontFamily: "Playfair Display" }}
              >
                Sabor de Casa do Norte com atendimento, pagamento e entrega em um só lugar
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
                Um catálogo fictício com produtos regionais, imagens alinhadas a cada descrição e
                uma experiência de compra que já mostra chat de atendimento, confirmação de
                pagamento, avaliação e popups das etapas do pedido.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                className="group rounded-full bg-primary px-6 font-semibold text-primary-foreground btn-press hover:bg-primary/90"
                onClick={() => document.getElementById("cardapio")?.scrollIntoView({ behavior: "smooth" })}
              >
                Ver cardápio
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-full border-primary px-6 font-semibold text-primary btn-press hover:bg-primary/5"
                onClick={() => document.getElementById("atendimento")?.scrollIntoView({ behavior: "smooth" })}
              >
                Falar com o bot
                <MessageCircleMore className="ml-2 h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 border-t border-border pt-6 sm:grid-cols-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-primary">Pedido assistido</p>
                <p className="text-xs text-muted-foreground">Chat integrado para dúvidas sobre produtos</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-primary">Pagamento seguro</p>
                <p className="text-xs text-muted-foreground">PIX, cartão e boleto no fluxo da loja</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-primary">Pós-venda</p>
                <p className="text-xs text-muted-foreground">Avaliação e pesquisa de satisfação</p>
              </div>
            </div>
          </div>

          <div className="order-1 relative md:order-2">
            <div className="overflow-hidden rounded-2xl border border-white/70 shadow-[0_18px_50px_rgba(0,0,0,0.12)]">
              <img
                src="/menu-images/carne-de-sol.jpg"
                alt="Carne de sol servida em foto de catálogo para Casa do Norte"
                className="h-[260px] w-full object-cover md:h-[320px]"
              />
            </div>

            <div className="absolute -bottom-5 left-4 max-w-xs rounded-xl border border-border bg-white p-4 shadow-lg">
              <div className="mb-2 flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Imagens ligadas ao item</p>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Cada card da vitrine usa uma imagem que conversa com a descrição do produto, para
                deixar o menu mais confiável e convincente.
              </p>
            </div>

            <div className="absolute -top-4 right-4 hidden rounded-full bg-white px-3 py-2 text-xs font-semibold text-primary shadow-md md:flex md:items-center md:gap-2">
              <ShieldCheck className="h-4 w-4" />
              Compra fictícia com experiência completa
            </div>
            <div className="absolute bottom-6 right-4 hidden rounded-full bg-white px-3 py-2 text-xs font-semibold text-[#d98b41] shadow-md md:flex md:items-center md:gap-2">
              <Truck className="h-4 w-4" />
              Etapas de entrega simuladas
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
