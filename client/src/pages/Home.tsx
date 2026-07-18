import { useState } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import CategoryFilters from "@/components/CategoryFilters";
import ProductCard from "@/components/ProductCard";

const PRODUCTS = [
  {
    id: "1",
    name: "Castanha de Caju W1",
    category: "Castanhas",
    price: 74.9,
    image: "/manus-storage/product_castanha_6f2ce45e.png",
    badge: "Oferta Especial",
    badgeVariant: "special" as const,
  },
  {
    id: "2",
    name: "Damasco Turco Premium",
    category: "Frutas Secas",
    price: 49.9,
    image: "/manus-storage/product_cha_0bd0c440.png",
    badge: "Selecionado",
    badgeVariant: "premium" as const,
  },
  {
    id: "3",
    name: "Hibisco Desidratado",
    category: "Chás",
    price: 32.0,
    image: "/manus-storage/product_cha_0bd0c440.png",
    badge: "Oferta Especial",
    badgeVariant: "special" as const,
  },
  {
    id: "4",
    name: "Farinha de Amêndoas Premium",
    category: "Farinhas",
    price: 85.0,
    image: "/manus-storage/product_castanha_6f2ce45e.png",
    badgeVariant: "premium" as const,
  },
  {
    id: "5",
    name: "Mel Silvestre Orgânico",
    category: "Suplementos",
    price: 28.9,
    image: "/manus-storage/product_cha_0bd0c440.png",
    badge: "Granel Certificado",
    badgeVariant: "certified" as const,
  },
  {
    id: "6",
    name: "Castanha do Pará Selecionada",
    category: "Castanhas",
    price: 65.0,
    image: "/manus-storage/product_castanha_6f2ce45e.png",
    badgeVariant: "premium" as const,
  },
];

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState("all");

  const filteredProducts =
    selectedCategory === "all"
      ? PRODUCTS
      : PRODUCTS.filter((product) =>
          product.category.toLowerCase().includes(selectedCategory)
        );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero />

      <section className="py-16 md:py-24 bg-gradient-to-b from-background to-accent/3">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <aside className="lg:col-span-1">
              <div className="sticky top-24 bg-white rounded-xl p-6 border border-border">
                <CategoryFilters
                  selectedCategory={selectedCategory}
                  onCategoryChange={setSelectedCategory}
                />
              </div>
            </aside>

            <main className="lg:col-span-3">
              <div className="mb-8 animate-fade-up">
                <h2
                  className="text-3xl md:text-4xl font-bold text-foreground mb-2"
                  style={{ fontFamily: "Playfair Display" }}
                >
                  {selectedCategory === "all"
                    ? "Todos os Produtos"
                    : selectedCategory}
                </h2>
                <p className="text-muted-foreground">
                  {filteredProducts.length} produto
                  {filteredProducts.length !== 1 ? "s" : ""} encontrado
                  {filteredProducts.length !== 1 ? "s" : ""}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product, index) => (
                  <div
                    key={product.id}
                    className="animate-fade-up"
                    style={{ animationDelay: `${index * 80}ms` }}
                  >
                    <ProductCard {...product} />
                  </div>
                ))}
              </div>

              {filteredProducts.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-lg text-muted-foreground mb-4">
                    Nenhum produto encontrado nesta categoria.
                  </p>
                  <button
                    onClick={() => setSelectedCategory("all")}
                    className="text-primary font-semibold hover:underline"
                  >
                    Ver todos os produtos
                  </button>
                </div>
              )}
            </main>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-primary text-primary-foreground">
        <div className="container max-w-2xl">
          <div className="text-center space-y-6">
            <h2
              className="text-3xl md:text-4xl font-bold"
              style={{ fontFamily: "Playfair Display" }}
            >
              Receba Ofertas Exclusivas
            </h2>
            <p className="text-lg opacity-90">
              Inscreva-se na nossa newsletter e fique por dentro das novidades,
              promoções e dicas de bem-estar.
            </p>
            <form className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                placeholder="Seu e-mail"
                className="flex-1 px-4 py-3 rounded-lg bg-white/20 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-white text-primary font-semibold rounded-lg hover:bg-white/90 transition-colors"
              >
                Inscrever
              </button>
            </form>
          </div>
        </div>
      </section>

      <footer className="bg-foreground text-white py-12">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-bold mb-4">Sobre Nós</h3>
              <p className="text-sm text-white/70">
                RN Naturais Premium oferece os melhores produtos naturais a
                granel para sua saúde e bem-estar.
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-4">Categorias</h3>
              <ul className="text-sm text-white/70 space-y-2">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Castanhas
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Chás
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Farinhas
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Contato</h3>
              <ul className="text-sm text-white/70 space-y-2">
                <li>
                  <a
                    href="mailto:contato@rnnaturais.com"
                    className="hover:text-white transition-colors"
                  >
                    contato@rnnaturais.com
                  </a>
                </li>
                <li>
                  <a
                    href="tel:+5584999999999"
                    className="hover:text-white transition-colors"
                  >
                    (84) 99999-9999
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Redes Sociais</h3>
              <div className="flex gap-4">
                <a href="#" className="text-white/70 hover:text-white transition-colors">
                  Instagram
                </a>
                <a href="#" className="text-white/70 hover:text-white transition-colors">
                  Facebook
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 text-center text-sm text-white/60">
            <p>&copy; 2026 RN Naturais Premium. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
