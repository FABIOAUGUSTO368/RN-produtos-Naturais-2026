import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StoreProduct } from "@/lib/store";

interface ProductCardProps extends StoreProduct {
  onAddToCart?: (product: StoreProduct, weight: number) => void;
}

const WEIGHTS = [
  { label: "100g", value: 100 },
  { label: "250g", value: 250 },
  { label: "500g", value: 500 },
  { label: "1kg", value: 1000 },
];

export default function ProductCard({
  onAddToCart,
  ...product
}: ProductCardProps) {
  const [selectedWeight, setSelectedWeight] = useState(500);
  const [isWishlisted, setIsWishlisted] = useState(false);

  const weightMultiplier = selectedWeight / 500;
  const finalPrice = (product.price * weightMultiplier).toFixed(2);

  const badgeColors = {
    special: "bg-rose-100 text-rose-700 border-rose-200",
    premium: "bg-amber-100 text-amber-700 border-amber-200",
    certified: "bg-emerald-100 text-emerald-700 border-emerald-200",
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-[0_6px_20px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
      <div className="relative bg-[#f6efe0]">
        <img
          src={product.image}
          alt={product.name}
          className="h-64 w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />

        {product.badge && (
          <div className="absolute left-3 top-3">
            <Badge
              variant="outline"
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-[11px] font-semibold shadow-sm",
                badgeColors[product.badgeVariant ?? "certified"]
              )}
            >
              {product.badge}
            </Badge>
          </div>
        )}

        <button
          onClick={() => setIsWishlisted(!isWishlisted)}
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/95 text-foreground shadow-sm transition hover:bg-white"
        >
          <Heart
            className={cn(
              "h-4 w-4 transition-colors",
              isWishlisted ? "fill-rose-500 text-rose-500" : "text-foreground/70"
            )}
          />
        </button>
      </div>

      <div className="space-y-4 p-4">
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-700">
            {product.category}
          </p>
          <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-foreground">
            {product.name}
          </h3>
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {product.description}
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Escolha o peso
          </p>
          <div className="grid grid-cols-4 gap-2">
            {WEIGHTS.map((weight) => (
              <button
                key={weight.value}
                onClick={() => setSelectedWeight(weight.value)}
                className={cn(
                  "rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition-all",
                  selectedWeight === weight.value
                    ? "border-emerald-700 bg-emerald-700 text-white"
                    : "border-border bg-[#f3f3f1] text-foreground hover:border-emerald-400"
                )}
              >
                {weight.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-end gap-2">
          <span className="text-[28px] font-bold leading-none text-emerald-800">
            R$ {finalPrice}
          </span>
          <span className="pb-1 text-xs text-muted-foreground">{product.unit}</span>
        </div>

        <Button
          className="h-9 w-full rounded-md bg-emerald-800 text-sm font-semibold text-white hover:bg-emerald-900"
          onClick={() => onAddToCart?.(product, selectedWeight)}
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          Adicionar ao Carrinho
        </Button>

        <button className="flex h-9 w-full items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100">
          Fale conosco
        </button>
      </div>
    </div>
  );
}
