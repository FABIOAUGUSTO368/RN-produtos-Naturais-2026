import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  badge?: string;
  badgeVariant?: "special" | "premium" | "certified";
}

const WEIGHTS = [
  { label: "100g", value: 100 },
  { label: "250g", value: 250 },
  { label: "500g", value: 500 },
  { label: "1kg", value: 1000 },
];

export default function ProductCard({
  id,
  name,
  category,
  price,
  image,
  badge,
  badgeVariant = "certified",
}: ProductCardProps) {
  const [selectedWeight, setSelectedWeight] = useState(500);
  const [isWishlisted, setIsWishlisted] = useState(false);

  const weightMultiplier = selectedWeight / 500;
  const finalPrice = (price * weightMultiplier).toFixed(2);

  const badgeColors = {
    special: "bg-red-100 text-red-700 border-red-200",
    premium: "bg-amber-100 text-amber-700 border-amber-200",
    certified: "bg-green-100 text-green-700 border-green-200",
  };

  return (
    <div className="group relative bg-white rounded-xl overflow-hidden border border-border hover:border-primary/30 transition-all duration-300 hover:shadow-lg product-card-hover">
      {/* Image Container */}
      <div className="relative overflow-hidden bg-muted h-64 md:h-72">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Badge */}
        {badge && (
          <div className="absolute top-3 left-3">
            <Badge
              variant="outline"
              className={cn(
                "border font-semibold text-xs",
                badgeColors[badgeVariant]
              )}
            >
              {badge}
            </Badge>
          </div>
        )}

        {/* Wishlist Button */}
        <button
          onClick={() => setIsWishlisted(!isWishlisted)}
          className="absolute top-3 right-3 bg-white rounded-full p-2 shadow-md hover:shadow-lg transition-all"
        >
          <Heart
            className={cn(
              "w-5 h-5 transition-colors",
              isWishlisted
                ? "fill-red-500 text-red-500"
                : "text-muted-foreground hover:text-red-500"
            )}
          />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Category & Name */}
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-wide">
            {category}
          </p>
          <h3
            className="text-lg font-semibold text-foreground mt-1 line-clamp-2"
            style={{ fontFamily: "Playfair Display" }}
          >
            {name}
          </h3>
        </div>

        {/* Weight Selector */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase">
            Escolha o peso
          </label>
          <div className="grid grid-cols-4 gap-2">
            {WEIGHTS.map((weight) => (
              <button
                key={weight.value}
                onClick={() => setSelectedWeight(weight.value)}
                className={cn(
                  "py-2 px-2 rounded-lg text-xs font-semibold transition-all border",
                  selectedWeight === weight.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted text-foreground border-border hover:border-primary/50"
                )}
              >
                {weight.label}
              </button>
            ))}
          </div>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span
            className="text-2xl font-bold text-primary"
            style={{ fontFamily: "Playfair Display" }}
          >
            R$ {finalPrice}
          </span>
          <span className="text-xs text-muted-foreground">/kg</span>
        </div>

        {/* Add to Cart Button */}
        <Button
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg gap-2 group/btn btn-press"
        >
          <ShoppingCart className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
          Adicionar ao Carrinho
        </Button>

        {/* WhatsApp Contact */}
        <button className="w-full py-2 px-3 rounded-lg border border-green-200 bg-green-50 text-green-700 text-sm font-semibold hover:bg-green-100 transition-colors flex items-center justify-center gap-2">
          <svg
            className="w-4 h-4"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004a9.87 9.87 0 00-4.255.949c-1.238.503-2.37 1.236-3.356 2.241-1.645 1.69-2.633 3.93-2.633 6.158 0 2.227.988 4.468 2.633 6.158 1.645 1.69 3.817 2.633 6.157 2.633 2.34 0 4.512-.943 6.157-2.633 1.645-1.69 2.633-3.931 2.633-6.158 0-2.227-.988-4.468-2.633-6.158-1.645-1.69-3.817-2.633-6.157-2.633z" />
          </svg>
          Fale conosco
        </button>
      </div>
    </div>
  );
}
