import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, ChevronDown, ChevronUp, MessageCircleMore, Send, Sparkles, Store, UserCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { openWhatsApp, createSupportMessage } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

type ChatRole = "bot" | "user";

interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
}

const QUICK_ACTIONS = [
  "Quais produtos vocês vendem?",
  "Como funciona o pagamento?",
  "Qual o prazo de entrega?",
  "Quero falar com o Fabio",
];

function buildBotReply(message: string) {
  const text = message.toLowerCase();

  if (/(produto|cardap[íi]o|carnes?|cuscuz|farinha|tempero|latic[ií]nio|massa|regional)/i.test(text)) {
    return "Temos carnes secas, cuscuz, farinhas, temperos, laticínios e sabores regionais. Se quiser, eu também posso te indicar os mais vendidos para venda rápida ou consumo em casa.";
  }

  if (/(pagamento|pix|cart[aã]o|boleto|parcela|checkout)/i.test(text)) {
    return "Você pode finalizar por PIX, cartão ou boleto. No PIX, o site gera o QR Code e o código copia e cola na hora. Se quiser, eu posso te explicar o passo a passo.";
  }

  if (/(entrega|frete|prazo|envio|receber|delivery)/i.test(text)) {
    return "Fazemos a finalização do pedido aqui no site e o acompanhamento segue no atendimento. Se você me disser o bairro ou cidade, eu te oriento melhor sobre a entrega.";
  }

  if (/(pedido|status|acompanhamento|rastreamento|andamento)/i.test(text)) {
    return "Depois que o pedido é criado, ele fica registrado para acompanhamento. Se preferir, eu também posso te encaminhar para o WhatsApp para falar com alguém da loja.";
  }

  if (/(fabio|humano|atendente|vendedor|pessoa)/i.test(text)) {
    return "Claro. Eu posso te encaminhar para o Fabio agora mesmo no WhatsApp para um atendimento mais direto.";
  }

  return "Entendi. Pode me mandar um pouco mais de detalhe para eu te ajudar melhor? Se preferir, também posso te encaminhar para o WhatsApp da loja.";
}

export default function StoreAssistantChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen || messages.length > 0) {
      return;
    }

    setMessages([
      {
        id: "greeting",
        role: "bot",
        text: "Olá, aqui é o Fabio. Em que posso ajudar você hoje na Casa do Norte?",
      },
    ]);
  }, [isOpen, messages.length]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const canSend = useMemo(() => draft.trim().length > 0, [draft]);

  const pushBotMessage = (text: string) => {
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "bot",
        text,
      },
    ]);
  };

  const pushUserMessage = (text: string) => {
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "user",
        text,
      },
    ]);
  };

  const handleSend = (text = draft) => {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }

    pushUserMessage(trimmed);
    setDraft("");

    window.setTimeout(() => {
      pushBotMessage(buildBotReply(trimmed));
    }, 250);
  };

  const handleQuickAction = (label: string) => {
    if (label === "Quero falar com o Fabio") {
      openWhatsApp(createSupportMessage("Quero falar com o Fabio sobre atendimento na loja."));
      return;
    }

    handleSend(label);
  };

  const handleWhatsAppHandoff = () => {
    openWhatsApp(createSupportMessage(draft.trim() || "Quero continuar o atendimento pelo chat."));
  };

  return (
    <div className="fixed bottom-5 left-5 z-50 flex flex-col items-start gap-3">
      {isOpen ? (
        <div className="w-[min(92vw,380px)] overflow-hidden rounded-[28px] border border-emerald-200 bg-white shadow-[0_24px_60px_rgba(16,24,40,0.22)]">
          <div className="bg-[linear-gradient(135deg,#0f5132_0%,#166534_55%,#1f7a46_100%)] px-5 py-4 text-white">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">Atendimento da loja</p>
                  <p className="font-serif text-lg font-bold">Fabio responde por aqui</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white"
                aria-label="Minimizar atendimento"
              >
                <ChevronDown className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-3 text-sm leading-6 text-emerald-50">
              Pergunte sobre produtos, pagamento, entrega ou peça ajuda para fechar seu pedido.
            </p>
          </div>

          <div ref={listRef} className="max-h-[340px] space-y-3 overflow-y-auto bg-[#f8fbf7] px-4 py-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex items-end gap-2",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "bot" ? (
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                    <Store className="h-4 w-4" />
                  </div>
                ) : null}
                <div
                  className={cn(
                    "max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm",
                    message.role === "user"
                      ? "rounded-br-md bg-emerald-600 text-white"
                      : "rounded-bl-md border border-emerald-100 bg-white text-slate-700"
                  )}
                >
                  {message.text}
                </div>
                {message.role === "user" ? (
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-200 text-slate-600">
                    <UserCircle2 className="h-4 w-4" />
                  </div>
                ) : null}
              </div>
            ))}

            <div className="flex flex-wrap gap-2 pt-1">
              {QUICK_ACTIONS.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleQuickAction(label)}
                  className="rounded-full border border-emerald-200 bg-white px-3 py-2 text-left text-xs font-medium text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-50"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-emerald-100 bg-white p-4">
            <div className="flex gap-2">
              <Input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Digite sua dúvida..."
                className="h-11 rounded-full border-emerald-200 bg-[#fbfef9]"
              />
              <Button
                type="button"
                onClick={() => handleSend()}
                disabled={!canSend}
                className="h-11 rounded-full px-4"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleWhatsAppHandoff}
                className="h-10 rounded-full border-emerald-200 text-emerald-800 hover:bg-emerald-50"
              >
                <MessageCircleMore className="mr-2 h-4 w-4" />
                Falar no WhatsApp
              </Button>
              <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
                <Sparkles className="h-3.5 w-3.5" />
                Resposta automática da loja
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex items-center gap-3 rounded-full bg-emerald-950 px-5 py-3.5 text-sm font-bold text-white shadow-[0_12px_28px_rgba(15,81,50,0.3)] transition hover:-translate-y-0.5 hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-200"
        aria-label="Abrir atendimento da loja"
      >
        <div className="grid h-8 w-8 place-items-center rounded-full bg-white/10">
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </div>
        <span>{isOpen ? "Fechar bot" : "Bot da loja"}</span>
      </button>
    </div>
  );
}
