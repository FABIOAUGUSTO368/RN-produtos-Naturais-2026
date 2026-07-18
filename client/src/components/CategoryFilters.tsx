import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { id: "all", label: "Todos os produtos", icon: "🛍️" },
  { id: "carnes secas", label: "Carnes secas", icon: "🥩" },
  { id: "cuscuz e massas", label: "Cuscuz e massas", icon: "🌾" },
  { id: "farinhas", label: "Farinhas", icon: "🌽" },
  { id: "laticínios", label: "Laticínios", icon: "🧀" },
  { id: "pratos regionais", label: "Pratos regionais", icon: "🍛" },
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
        <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-foreground">
          Categorias
        </h3>
        <div className="flex flex-col gap-2">
          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryChange(category.id)}
              className={cn(
                "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all",
                selected === category.id
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-white text-foreground hover:border-primary/40 hover:bg-primary/5"
              )}
            >
              <span>{category.icon}</span>
              <span>{category.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-foreground">
          Ordenar por
        </h3>
        <div className="space-y-2">
          {[
            { value: "popular", label: "Mais populares" },
            { value: "price-low", label: "Menor preço" },
            { value: "price-high", label: "Maior preço" },
            { value: "newest", label: "Mais recentes" },
          ].map((option) => (
            <label key={option.value} className="flex cursor-pointer items-center gap-3">
              <input
                type="radio"
                name="sort"
                value={option.value}
                checked={sortBy === option.value}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-4 w-4 accent-primary"
              />
              <span className="text-sm text-foreground">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-foreground">
          Faixa de preço
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            placeholder="Min"
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            type="number"
            placeholder="Max"
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <Button variant="outline" className="w-full border-primary text-primary hover:bg-primary/5">
          Aplicar filtro
        </Button>
      </div>

      <div className="space-y-3 pt-2">
        <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-foreground">
          Filtros ativos
        </h3>
        <div className="flex flex-wrap gap-2">
          {selected !== "all" && (
            <Badge
              variant="secondary"
              className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-primary"
            >
              {CATEGORIES.find((category) => category.id === selected)?.label}
              <button
                onClick={() => handleCategoryChange("all")}
                className="ml-2 text-primary/70 hover:text-primary"
              >
                ×
              </button>
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
