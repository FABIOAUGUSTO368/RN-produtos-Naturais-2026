import { MessageCircleMore } from "lucide-react";
import { openWhatsApp } from "@/lib/whatsapp";

export default function WhatsAppFloatingButton() {
  return (
    <button
      type="button"
      onClick={() => openWhatsApp("Ola! Vim pelo site RN Casa do Norte e preciso de atendimento.")}
      className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-full bg-[#25D366] px-5 py-3.5 text-sm font-bold text-white shadow-[0_12px_28px_rgba(22,163,74,0.32)] transition hover:-translate-y-0.5 hover:bg-[#1fbd59] focus:outline-none focus:ring-4 focus:ring-emerald-200"
      aria-label="Falar com a Casa do Norte pelo WhatsApp"
    >
      <MessageCircleMore className="h-5 w-5" />
      <span className="hidden sm:inline">Atendimento no WhatsApp</span>
    </button>
  );
}
