import { ArrowRight, ChevronRight, MessageCircleMore, Search, ShoppingCart, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openWhatsApp } from "@/lib/whatsapp";

const DEPARTMENTS = ["Carnes secas", "Cuscuz e massas", "Farinhas", "Laticinios", "Pratos regionais", "Temperos"];

const CART_STEPS = ["Escolha seus produtos", "Finalize no WhatsApp", "Receba com seguranca"];

export default function Hero() {
  return (
    <section className="border-b border-emerald-950/10 bg-[#f5f7f2] py-6 md:py-8">
      <div className="container grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)_255px]">
        <aside className="rounded-2xl border border-emerald-950/10 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Compre por categoria</p>
          <h1 className="mt-3 font-serif text-2xl font-bold leading-tight text-emerald-950">Raízes do Nordeste, tradição que vende e chega à sua mesa</h1>
          <div className="mt-5 flex items-center rounded-lg border border-emerald-900/15 bg-[#f7faf5] px-3 py-2">
            <Search className="h-4 w-4 text-emerald-700" />
            <input className="ml-2 w-full bg-transparent text-xs outline-none placeholder:text-slate-400" placeholder="Buscar produtos" />
          </div>
          <nav className="mt-5 space-y-1">
            {DEPARTMENTS.map((department) => (
              <a key={department} href="#cardapio" className="group flex items-center justify-between rounded-lg px-2 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-800">
                {department}
                <ChevronRight className="h-4 w-4 text-emerald-500 transition-transform group-hover:translate-x-0.5" />
              </a>
            ))}
          </nav>
          <div className="mt-5 rounded-xl bg-emerald-950 p-4 text-white">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-200">Atendimento rapido</p>
            <p className="mt-2 text-sm leading-relaxed text-emerald-50">Duvidas sobre pesos, entrega ou pedidos? Fale com a loja.</p>
            <button onClick={() => openWhatsApp("Ola! Preciso de ajuda com um produto da Casa do Norte.")} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-200 hover:text-white">Abrir atendimento <ArrowRight className="h-3.5 w-3.5" /></button>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="relative min-h-[390px] overflow-hidden rounded-2xl bg-emerald-950 p-7 shadow-[0_16px_40px_rgba(6,78,59,0.18)] md:p-10">
            <img src="/menu-images/carne-de-sol.jpg" alt="Carne de sol preparada para a vitrine da Casa do Norte" className="absolute inset-0 h-full w-full object-cover opacity-70" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,44,34,0.96)_0%,rgba(3,79,57,0.78)_46%,rgba(3,79,57,0.13)_100%)]" />
            <div className="relative z-10 max-w-lg">
              <span className="inline-flex rounded-full border border-emerald-200/50 bg-emerald-100/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-emerald-50">Ofertas da Casa do Norte</span>
              <h2 className="mt-5 font-serif text-4xl font-bold leading-[1.04] text-white md:text-5xl">Compre agora os sabores mais pedidos do Nordeste, com preço justo e entrega ágil.</h2>
              <p className="mt-5 max-w-md text-sm leading-relaxed text-emerald-50 md:text-base">Carnes secas, cuscuz, farinhas, temperos e itens regionais selecionados para quem quer praticidade, boa margem e compra rápida sem complicação.</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button className="rounded-lg bg-white px-5 font-bold text-emerald-900 hover:bg-emerald-50" onClick={() => document.getElementById("cardapio")?.scrollIntoView({ behavior: "smooth" })}>Ver ofertas <ArrowRight className="ml-2 h-4 w-4" /></Button>
                <Button variant="outline" className="rounded-lg border-white/50 bg-white/10 px-5 font-bold text-white hover:bg-white/20 hover:text-white" onClick={() => openWhatsApp("Olá! Vim pelo site Casa do Norte Raízes do Nordeste e gostaria de atendimento.")}><MessageCircleMore className="mr-2 h-4 w-4" />Falar com a loja</Button>
              </div>
            </div>
            <div className="absolute bottom-0 right-0 hidden max-w-[240px] rounded-tl-2xl bg-white/95 p-5 text-emerald-950 shadow-lg md:block">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Mais vendido da semana</p>
              <p className="mt-2 font-serif text-xl font-bold">Carne de sol sertaneja</p>
              <p className="mt-1 text-xs text-slate-600">Produto campeão para quem quer vender mais ou abastecer a casa com um sabor que chama atenção.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-emerald-950/10 bg-white p-4"><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Mais saída</p><p className="mt-1 text-sm font-medium text-slate-700">Itens campeões de venda para giro rápido</p></div>
            <div className="rounded-xl border border-emerald-950/10 bg-white p-4"><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Compra sem demora</p><p className="mt-1 text-sm font-medium text-slate-700">Pedido digital com atendimento direto no WhatsApp</p></div>
            <div className="rounded-xl border border-emerald-950/10 bg-white p-4"><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Pronto para vender</p><p className="mt-1 text-sm font-medium text-slate-700">Seleção pensada para quem busca margem e praticidade</p></div>
          </div>
        </div>

        <aside className="rounded-2xl border border-emerald-950/10 bg-white shadow-sm">
          <div className="border-b border-emerald-950/10 p-5"><div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100"><ShoppingCart className="h-4 w-4 text-emerald-800" /></span><div><p className="font-serif text-xl font-bold text-emerald-950">Meu carrinho</p><p className="text-xs text-slate-500">Seu pedido em um so lugar</p></div></div></div>
          <div className="p-5"><p className="text-sm font-semibold text-slate-800">Pronto para comecar?</p><p className="mt-1 text-sm leading-relaxed text-slate-500">Adicione os itens do cardapio e acompanhe o seu pedido.</p><div className="mt-6 space-y-4">{CART_STEPS.map((step, index) => <div key={step} className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">{index + 1}</span><p className="pt-0.5 text-sm font-medium text-slate-700">{step}</p></div>)}</div><div className="mt-7 rounded-lg bg-emerald-50 p-3"><div className="flex items-center gap-2 text-sm font-semibold text-emerald-900"><Truck className="h-4 w-4" />Entrega acompanhada</div><p className="mt-1 text-xs leading-relaxed text-emerald-800">Receba notificacoes de cada etapa do pedido.</p></div></div>
        </aside>
      </div>
    </section>
  );
}
