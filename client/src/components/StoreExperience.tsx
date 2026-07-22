import { useState } from "react";
import { Banknote, CheckCircle2, CreditCard, ShieldCheck, WalletCards } from "lucide-react";
import { cn } from "@/lib/utils";

const PAYMENT_METHODS = [
  { id: "pix", label: "PIX", description: "Confirmacao rapida e segura", icon: Banknote },
  { id: "card", label: "Cartao", description: "Credito e debito", icon: CreditCard },
  { id: "boleto", label: "Boleto", description: "Pague conforme o vencimento", icon: WalletCards },
];

export default function StoreExperience() {
  const [selectedPayment, setSelectedPayment] = useState("pix");

  return (
    <section id="pagamento" className="border-t border-emerald-950/10 bg-[#f5f7f2] py-14 md:py-16">
      <div className="container">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Pagamento</p>
          <h2 className="mt-3 font-serif text-3xl font-bold text-emerald-950 md:text-4xl">Escolha como prefere pagar</h2>
          <p className="mt-3 text-base leading-relaxed text-slate-600">No checkout, voce seleciona a opcao mais conveniente para finalizar seu pedido.</p>
        </div>
        <div className="mx-auto mt-8 grid max-w-4xl gap-4 md:grid-cols-3">
          {PAYMENT_METHODS.map((method) => {
            const Icon = method.icon;
            const active = method.id === selectedPayment;
            return (
              <button key={method.id} onClick={() => setSelectedPayment(method.id)} className={cn("relative rounded-2xl border bg-white p-6 text-left shadow-sm transition", active ? "border-emerald-600 ring-2 ring-emerald-100" : "border-emerald-950/10 hover:border-emerald-400") }>
                {active && <CheckCircle2 className="absolute right-4 top-4 h-5 w-5 text-emerald-700" />}
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800"><Icon className="h-5 w-5" /></span>
                <p className="mt-5 text-lg font-bold text-emerald-950">{method.label}</p>
                <p className="mt-1 text-sm text-slate-600">{method.description}</p>
              </button>
            );
          })}
        </div>
        <div className="mx-auto mt-5 flex max-w-4xl items-start gap-3 rounded-xl border border-emerald-900/10 bg-white px-5 py-4 text-sm text-slate-600 shadow-sm">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
          <p><strong className="text-emerald-950">Compra protegida.</strong> A confirmacao e os dados de pagamento sao tratados no momento de finalizar o pedido.</p>
        </div>
      </div>
    </section>
  );
}
