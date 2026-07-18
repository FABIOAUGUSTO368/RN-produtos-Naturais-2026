import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-accent/5">
      <div className="container py-16 md:py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col gap-6 order-2 md:order-1">
            <div className="flex gap-2 flex-wrap">
              <Badge
                variant="outline"
                className="border-primary/30 text-primary bg-primary/5"
              >
                ✓ Granel Certificado
              </Badge>
              <Badge
                variant="outline"
                className="border-accent text-accent bg-accent/5"
              >
                ⚡ Entrega Rápida
              </Badge>
            </div>

            <div className="space-y-4">
              <h1
                className="text-4xl md:text-5xl font-bold text-foreground leading-tight"
                style={{ fontFamily: "Playfair Display" }}
              >
                Sabor Natural e Qualidade Premium para a sua mesa
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Castanhas torradas na hora, farinhas funcionais, temperos selecionados e chás
                desidratados. Tudo vendido por peso, com a qualidade que você merece.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-full gap-2 group btn-press"
              >
                Explorar Produtos
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-primary text-primary hover:bg-primary/5 font-semibold rounded-full btn-press"
              >
                Saiba Mais
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 pt-8 border-t border-border">
              <div>
                <p className="text-sm font-semibold text-primary">100% Natural</p>
                <p className="text-xs text-muted-foreground">Sem aditivos ou conservantes</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-primary">Entrega Rápida</p>
                <p className="text-xs text-muted-foreground">Envio local em 24-48h</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-primary">Garantia</p>
                <p className="text-xs text-muted-foreground">Satisfação ou devolução</p>
              </div>
            </div>
          </div>

          <div className="order-1 md:order-2 relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <img
                src="/manus-storage/hero_naturais_ce7372c3.png"
                alt="Produtos Naturais Premium"
                className="w-full h-auto object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>

            <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-lg p-4 max-w-xs border border-border">
              <p className="text-sm font-semibold text-foreground mb-2">
                Vendido por Quilo
              </p>
              <p className="text-xs text-muted-foreground">
                Escolha o peso que melhor se adequa a você. Sem desperdício, sem compromissos.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl -z-10" />
    </section>
  );
}
