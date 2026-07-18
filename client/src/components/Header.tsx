import { Menu, Search, ShoppingCart, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur-sm transition-all duration-300">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/manus-storage/logo_leaf_de762ff6.png"
            alt="RN Casa do Norte"
            className="h-8 w-8"
          />
          <span
            className="text-xl font-bold text-primary"
            style={{ fontFamily: "Playfair Display" }}
          >
            RN Casa do Norte
          </span>
        </div>

        <nav className="hidden items-center gap-8 md:flex">
          <a
            href="#cardapio"
            className="text-sm font-medium text-foreground transition-colors hover:text-primary"
          >
            Cardápio
          </a>
          <a
            href="#atendimento"
            className="text-sm font-medium text-foreground transition-colors hover:text-primary"
          >
            Atendimento
          </a>
          <a
            href="#pagamento"
            className="text-sm font-medium text-foreground transition-colors hover:text-primary"
          >
            Pagamento
          </a>
          <a
            href="#avaliacao"
            className="text-sm font-medium text-foreground transition-colors hover:text-primary"
          >
            Avaliação
          </a>
        </nav>

        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-2 rounded-full bg-muted px-3 py-2 lg:flex">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar carne, cuscuz..."
              className="w-32 bg-transparent text-sm outline-none"
            />
          </div>

          <Button variant="ghost" size="icon" className="relative hover:bg-primary/10">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <span className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
              0
            </span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="border-t border-border bg-white md:hidden">
          <nav className="container flex flex-col gap-4 py-4">
            <a href="#cardapio" className="text-sm font-medium text-foreground hover:text-primary">
              Cardápio
            </a>
            <a href="#atendimento" className="text-sm font-medium text-foreground hover:text-primary">
              Atendimento
            </a>
            <a href="#pagamento" className="text-sm font-medium text-foreground hover:text-primary">
              Pagamento
            </a>
            <a href="#avaliacao" className="text-sm font-medium text-foreground hover:text-primary">
              Avaliação
            </a>
            <div className="mt-2 flex items-center gap-2 rounded-full bg-muted px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar..."
                className="flex-1 bg-transparent text-sm outline-none"
              />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
