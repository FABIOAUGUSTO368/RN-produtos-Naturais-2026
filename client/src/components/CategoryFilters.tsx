import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { id: "all", label: "Todos os Produtos", icon: "🛍️" },
  { id: "nuts", label: "Castanhas e Frutas Secas", icon: "🥜" },
  { id: "tea", label: "Chás e Ervas", icon: "🍵" },
  { id: "flour", label: "Farinhas e Grãos", icon: "🌾" },
  { id: "spices", label: "Temperos", icon: "🌶️" },
  { id: "supplements", label: "Suplementos", icon: "💊" },
];

interface CategoryFiltersProps {
  onCategoryChange?: (categoryId: string) => void;
  selectedCategory?: string;
}

export default function CategoryFilters({
  onCategoryChange,
  selectedCategory = "all",
}: CategoryFiltersProps) {
  const [selected, setSelected] = useState(selectedCategory);
  const [sortBy, setSortBy] = useState("popular");

  const handleCategoryChange = (categoryId: string) => {
    setSelected(categoryId);
    onCategoryChange?.(categoryId);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
          Categorias
        </h3>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryChange(category.id)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-semibold transition-all border",
                selected === category.id
                  ? "bg-primary text-primary-foreground border-primary shadow-md"
                  : "bg-white text-foreground border-border hover:border-primary/50 hover:bg-primary/5"
              )}
            >
              <span className="mr-2">{category.icon}</span>
              {category.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
          Ordenar por
        </h3>
        <div className="space-y-2">
          {[
            { value: "popular", label: "Mais Popular" },
            { value: "price-low", label: "Menor Preço" },
            { value: "price-high", label: "Maior Preço" },
            { value: "newest", label: "Mais Recente" },
          ].map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <input
                type="radio"
                name="sort"
                value={option.value}
                checked={sortBy === option.value}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-4 h-4 text-primary accent-primary"
              />
              <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                {option.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
          Faixa de Preço
        </h3>
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Min"
              className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <input
              type="number"
              placeholder="Max"
              className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <Button
            variant="outline"
            className="w-full border-primary text-primary hover:bg-primary/5"
          >
            Aplicar Filtro
          </Button>
        </div>
      </div>

      <div className="space-y-3 pt-4 border-t border-border">
        <h3 className="text-sm font-semibold text-foreground">Filtros Ativos</h3>
        <div className="flex flex-wrap gap-2">
          {selected !== "all" && (
            <Badge
              variant="secondary"
              className="bg-primary/10 text-primary border-primary/20 cursor-pointer hover:bg-primary/20"
            >
              {CATEGORIES.find((c) => c.id === selected)?.label}
              <button
                onClick={() => handleCategoryChange("all")}
                className="ml-2 text-primary/70 hover:text-primary"
              >
                ✕
              </button>
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
