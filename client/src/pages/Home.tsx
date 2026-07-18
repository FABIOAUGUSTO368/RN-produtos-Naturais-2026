import { useState } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import CategoryFilters from "@/components/CategoryFilters";
import ProductCard from "@/components/ProductCard";
import StoreExperience from "@/components/StoreExperience";

const PRODUCTS = [
  {
    id: "1",
    name: "Carne de Sol do Sertão",
    categoryId: "carnes secas",
    category: "Carnes secas",
    price: 39.9,
    unit: "/kg",
    image: "/menu-images/carne-de-sol.jpg",
    description: "Pedaços curados no ponto, ideais para baião, panelada e pratos regionais.",
    badge: "Mais pedido",
    badgeVariant: "premium" as const,
  },
  {
    id: "2",
    name: "Cuscuz Nordestino com Manteiga",
    categoryId: "cuscuz e massas",
    category: "Cuscuz e massas",
    price: 14.9,
    unit: "/kg",
    image: "/menu-images/cuscuz-nordestino.jpg",
    description: "Flocos macios com manteiga e preparo rápido para café da manhã ou jantar.",
    badge: "Tradicional",
    badgeVariant: "certified" as const,
  },
  {
    id: "3",
    name: "Cuscuz Tradicional da Casa",
    categoryId: "cuscuz e massas",
    category: "Cuscuz e massas",
    price: 13.4,
    unit: "/kg",
    image: "/menu-images/cuscuz-tradicional.jpg",
    description: "Versão rústica e caprichada para acompanhar carne seca, queijo ou ovos.",
    badge: "Clássico",
    badgeVariant: "special" as const,
  },
  {
    id: "4",
    name: "Farinha de Mandioca Fina",
    categoryId: "farinhas",
    category: "Farinhas",
    price: 11.8,
    unit: "/kg",
    image: "/menu-images/farinha-mandioca.jpg",
    description: "Leve e soltinha para pirão, feijão e acompanhamentos do dia a dia.",
    badge: "Seleção",
    badgeVariant: "certified" as const,
  },
  {
    id: "5",
    name: "Queijo Coalho na Brasa",
    categoryId: "laticínios",
    category: "Laticínios",
    price: 27.9,
    unit: "/kg",
    image: "/menu-images/queijo-coalho.jpg",
    description: "Grelhado no ponto e perfeito para lanche, porção ou café da tarde.",
    badge: "Sabor da casa",
    badgeVariant: "premium" as const,
  },
  {
    id: "6",
    name: "Baião de Dois da Casa",
    categoryId: "pratos regionais",
    category: "Pratos regionais",
    price: 31.5,
    unit: "/kg",
    image: "/menu-images/baiao-de-dois.jpg",
    description: "Mistura regional com feijão, arroz e queijo para um almoço completo.",
    badge: "Prato pronto",
    badgeVariant: "special" as const,
  },
];

const CATEGORY_TITLES: Record<string, string> = {
  all: "Cardápio da Casa do Norte",
  "carnes secas": "Carnes secas",
  "cuscuz e massas": "Cuscuz e massas",
  farinhas: "Farinhas",
  laticínios: "Laticínios",
  "pratos regionais": "Pratos regionais",
};

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState("all");

  const filteredProducts =
    selectedCategory === "all"
      ? PRODUCTS
      : PRODUCTS.filter((product) => product.categoryId === selectedCategory);

  return (
    <div className="min-h-screen bg-background">
      <Header />
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
              {filteredProducts.length} produto
              {filteredProducts.length !== 1 ? "s" : ""} encontrado
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 items-start lg:grid-cols-[270px_minmax(0,1fr)]">
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
                    <ProductCard {...product} />
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

      <StoreExperience />

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
    </div>
  );
}
