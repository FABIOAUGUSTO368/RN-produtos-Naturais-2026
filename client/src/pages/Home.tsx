import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import CategoryFilters from "@/components/CategoryFilters";
import ProductCard from "@/components/ProductCard";
import WhatsAppFloatingButton from "@/components/WhatsAppFloatingButton";
import StoreAssistantChat from "@/components/StoreAssistantChat";
import CartSheet, { type CheckoutPayload, type CheckoutResult } from "@/components/CartSheet";
import { PRODUCTS, CATEGORY_TITLES, type CartItem, type StoreProduct, toCartItem } from "@/lib/store";
import { toast } from "sonner";

const CART_STORAGE_KEY = "rn-casa-do-norte-cart";

function loadCart(): CartItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [cart, setCart] = useState<CartItem[]>(() => loadCart());
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  const cartCount = useMemo(() => cart.reduce((total, item) => total + item.quantity, 0), [cart]);

  const subtotal = useMemo(
    () => Number(cart.reduce((total, item) => total + item.price * item.quantity, 0).toFixed(2)),
    [cart]
  );

  const shipping = subtotal >= 120 || cart.length === 0 ? 0 : 18.9;
  const total = Number((subtotal + shipping).toFixed(2));

  const filteredProducts =
    selectedCategory === "all"
      ? PRODUCTS
      : PRODUCTS.filter((product) => product.categoryId === selectedCategory);

  const addToCart = (product: StoreProduct, weight: number) => {
    const cartItem = toCartItem(product, weight);
    setCart((current) => {
      const existingIndex = current.findIndex(
        (item) => item.productId === cartItem.productId && item.weight === cartItem.weight
      );

      if (existingIndex >= 0) {
        return current.map((item, index) =>
          index === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      return [...current, cartItem];
    });
    toast.success(`${product.name} adicionado ao carrinho`);
    setIsCartOpen(true);
  };

  const increaseItem = (item: CartItem) => {
    setCart((current) =>
      current.map((currentItem) =>
        currentItem.productId === item.productId && currentItem.weight === item.weight
          ? { ...currentItem, quantity: currentItem.quantity + 1 }
          : currentItem
      )
    );
  };

  const decreaseItem = (item: CartItem) => {
    setCart((current) =>
      current
        .map((currentItem) =>
          currentItem.productId === item.productId && currentItem.weight === item.weight
            ? { ...currentItem, quantity: currentItem.quantity - 1 }
            : currentItem
        )
        .filter((currentItem) => currentItem.quantity > 0)
    );
  };

  const removeItem = (item: CartItem) => {
    setCart((current) =>
      current.filter(
        (currentItem) => !(currentItem.productId === item.productId && currentItem.weight === item.weight)
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const submitOrder = async (payload: CheckoutPayload): Promise<CheckoutResult> => {
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(errorBody?.error ?? "Não foi possível finalizar o pedido.");
    }

    const data = (await response.json()) as CheckoutResult;

    toast.success("Pedido criado com sucesso", {
      description: `Pedido ${data.order.orderNumber} encaminhado para pagamento.`,
    });

    return data;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header cartCount={cartCount} onCartClick={() => setIsCartOpen(true)} />
      <Hero />

      <section id="cardapio" className="bg-[#fbf8f2] py-14 md:py-16">
        <div className="container">
          <div className="mb-8 flex max-w-4xl flex-col gap-3">
            <h2
              className="text-3xl font-bold text-foreground md:text-4xl"
              style={{ fontFamily: "Playfair Display" }}
            >
              {CATEGORY_TITLES[selectedCategory] ?? "Cardápio da Casa do Norte"}
            </h2>
            <p className="text-sm text-muted-foreground md:text-base">
              {filteredProducts.length} produto{filteredProducts.length !== 1 ? "s" : ""} encontrado
            </p>
          </div>

          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[270px_minmax(0,1fr)]">
            <aside className="lg:sticky lg:top-24">
              <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
                <CategoryFilters
                  selectedCategory={selectedCategory}
                  onCategoryChange={setSelectedCategory}
                />
              </div>
            </aside>

            <main>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {filteredProducts.map((product, index) => (
                  <div
                    key={product.id}
                    className="animate-fade-up"
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    <ProductCard {...product} onAddToCart={addToCart} />
                  </div>
                ))}
              </div>

              {filteredProducts.length === 0 && (
                <div className="py-16 text-center">
                  <p className="mb-4 text-lg text-muted-foreground">
                    Nenhum item encontrado nesta categoria.
                  </p>
                  <button
                    onClick={() => setSelectedCategory("all")}
                    className="font-semibold text-primary hover:underline"
                  >
                    Voltar para todos os produtos
                  </button>
                </div>
              )}
            </main>
          </div>
        </div>
      </section>

      <WhatsAppFloatingButton />
      <StoreAssistantChat />

      <section className="bg-primary py-16 text-primary-foreground">
        <div className="container max-w-2xl">
          <div className="space-y-5 text-center">
            <h2 className="text-3xl font-bold md:text-4xl" style={{ fontFamily: "Playfair Display" }}>
              Uma vitrine fictícia pronta para vender mais
            </h2>
            <p className="text-base opacity-90 md:text-lg">
              Este layout já combina produtos regionais, imagens coerentes com cada item e
              interações que simulam a experiência completa da compra.
            </p>
          </div>
        </div>
      </section>

      <CartSheet
        open={isCartOpen}
        onOpenChange={setIsCartOpen}
        items={cart}
        subtotal={subtotal}
        shipping={shipping}
        total={total}
        onIncrease={increaseItem}
        onDecrease={decreaseItem}
        onRemove={removeItem}
        onClear={clearCart}
        onSubmitOrder={submitOrder}
      />
    </div>
  );
}
