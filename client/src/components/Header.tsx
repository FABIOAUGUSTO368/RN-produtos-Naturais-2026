import { ShoppingCart, Search, Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border transition-all duration-300">
      <div className="container flex items-center justify-between h-16">
        <div className="flex items-center gap-2">
          <img
            src="/manus-storage/logo_leaf_de762ff6.png"
            alt="RN Naturais"
            className="w-8 h-8"
          />
          <span
            className="text-xl font-bold text-primary"
            style={{ fontFamily: "Playfair Display" }}
          >
            RN Naturais
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          <a
            href="#"
            className="text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            Castanhas
          </a>
          <a
            href="#"
            className="text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            Chás
          </a>
          <a
            href="#"
            className="text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            Farinhas
          </a>
          <a
            href="#"
            className="text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            Sobre
          </a>
        </nav>

        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-2 bg-muted rounded-full px-3 py-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar produtos..."
              className="bg-transparent text-sm outline-none w-32"
            />
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="relative hover:bg-primary/10"
          >
            <ShoppingCart className="w-5 h-5 text-primary" />
            <span className="absolute top-0 right-0 w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center font-bold">
              0
            </span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden border-t border-border bg-white">
          <nav className="container py-4 flex flex-col gap-4">
            <a href="#" className="text-sm font-medium text-foreground hover:text-primary">
              Castanhas
            </a>
            <a href="#" className="text-sm font-medium text-foreground hover:text-primary">
              Chás
            </a>
            <a href="#" className="text-sm font-medium text-foreground hover:text-primary">
              Farinhas
            </a>
            <a href="#" className="text-sm font-medium text-foreground hover:text-primary">
              Sobre
            </a>
            <div className="flex items-center gap-2 bg-muted rounded-full px-3 py-2 mt-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar..."
                className="bg-transparent text-sm outline-none flex-1"
              />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
