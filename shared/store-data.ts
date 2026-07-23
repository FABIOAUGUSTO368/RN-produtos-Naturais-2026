export type ProductCategory =
  | "carnes secas"
  | "cuscuz e massas"
  | "farinhas"
  | "laticínios"
  | "pratos regionais";

export type ProductBadgeVariant = "special" | "premium" | "certified";

export interface StoreProduct {
  id: string;
  name: string;
  categoryId: ProductCategory;
  category: string;
  price: number;
  unit: string;
  image: string;
  description: string;
  badge?: string;
  badgeVariant?: ProductBadgeVariant;
  initialStock: number;
  supplierId?: string | null;
  supplierName?: string | null;
  promoActive?: boolean;
  promoLabel?: string | null;
  promoPrice?: number | null;
}

export interface CartItem {
  productId: string;
  name: string;
  image: string;
  category: string;
  unit: string;
  weight: number;
  quantity: number;
  price: number;
}

export const PRODUCTS: StoreProduct[] = [
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
    badgeVariant: "premium",
    initialStock: 24000,
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
    badgeVariant: "certified",
    initialStock: 32000,
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
    badgeVariant: "special",
    initialStock: 26000,
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
    badgeVariant: "certified",
    initialStock: 42000,
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
    badgeVariant: "premium",
    initialStock: 18000,
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
    badgeVariant: "special",
    initialStock: 15000,
  },
];

export const CATEGORY_TITLES: Record<string, string> = {
  all: "Cardápio da Casa do Norte",
  "carnes secas": "Carnes secas",
  "cuscuz e massas": "Cuscuz e massas",
  farinhas: "Farinhas",
  "laticínios": "Laticínios",
  "pratos regionais": "Pratos regionais",
};

export function findProductById(productId: string) {
  return PRODUCTS.find((product) => product.id === productId);
}

export function toCartItem(product: StoreProduct, weight: number, quantity = 1): CartItem {
  const unitPrice = product.price * (weight / 500);

  return {
    productId: product.id,
    name: product.name,
    image: product.image,
    category: product.category,
    unit: product.unit,
    weight,
    quantity,
    price: Number(unitPrice.toFixed(2)),
  };
}
