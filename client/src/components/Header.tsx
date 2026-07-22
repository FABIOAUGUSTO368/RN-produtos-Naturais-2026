import { Menu, Search, ShoppingCart, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface HeaderProps { cartCount?: number; onCartClick?: () => void; }

const NAVIGATION = [
  ["Cardapio", "#cardapio"],
  ["Pagamento", "#pagamento"],
];

export default function Header({ cartCount = 0, onCartClick }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-emerald-950/10 bg-white/95 shadow-sm backdrop-blur">
      <div className="bg-emerald-950 text-emerald-50"><div className="container flex min-h-8 items-center justify-between text-[11px] font-medium"><span>Produtos regionais selecionados para a sua mesa</span><span className="hidden sm:block">Atendimento e pedidos pelo WhatsApp</span></div></div>
      <div className="container flex h-[72px] items-center justify-between gap-5">
        <a href="#topo" className="flex shrink-0 items-center gap-2.5" aria-label="RN Casa do Norte - inicio">
          <img src="/manus-storage/logo_leaf_de762ff6.png" alt="" className="h-9 w-9" />
          <span className="font-serif text-xl font-bold leading-none text-emerald-950">RN <span className="text-emerald-700">Casa do Norte</span></span>
        </a>
        <nav className="hidden items-center gap-5 lg:flex">{NAVIGATION.map(([label, href]) => <a key={href} href={href} className="text-sm font-semibold text-slate-600 transition-colors hover:text-emerald-800">{label}</a>)}</nav>
        <div className="ml-auto hidden max-w-[245px] items-center rounded-lg border border-emerald-950/15 bg-[#f7faf5] px-3 py-2 lg:flex"><Search className="h-4 w-4 text-emerald-700" /><input type="text" placeholder="Buscar no cardapio" className="ml-2 min-w-0 bg-transparent text-xs outline-none placeholder:text-slate-400" /></div>
        <Button variant="ghost" size="icon" className="relative shrink-0 rounded-lg hover:bg-emerald-50" onClick={onCartClick} aria-label="Abrir carrinho"><ShoppingCart className="h-5 w-5 text-emerald-800" /><span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-700 px-1 text-[10px] font-bold text-white">{cartCount}</span></Button>
        <Button variant="ghost" size="icon" className="shrink-0 rounded-lg text-emerald-900 hover:bg-emerald-50 lg:hidden" onClick={() => setIsMenuOpen((open) => !open)} aria-label="Abrir menu">{isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</Button>
      </div>
      {isMenuOpen && <div className="border-t border-emerald-950/10 bg-white lg:hidden"><nav className="container flex flex-col py-4">{NAVIGATION.map(([label, href]) => <a key={href} href={href} onClick={() => setIsMenuOpen(false)} className="border-b border-emerald-950/5 py-3 text-sm font-semibold text-slate-700 last:border-0">{label}</a>)}<div className="mt-3 flex items-center rounded-lg border border-emerald-950/15 bg-[#f7faf5] px-3 py-2"><Search className="h-4 w-4 text-emerald-700" /><input type="text" placeholder="Buscar no cardapio" className="ml-2 flex-1 bg-transparent text-sm outline-none" /></div></nav></div>}
    </header>
  );
}
