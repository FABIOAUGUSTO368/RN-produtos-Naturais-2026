import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { createSupportMessage, openWhatsApp } from "@/lib/whatsapp";
import {
  Banknote,
  Bot,
  CheckCircle2,
  CreditCard,
  MessageCircleMore,
  Send,
  ShieldCheck,
  Star,
  Truck,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";

type ChatMessage = {
  id: number;
  role: "bot" | "user";
  text: string;
};

const PAYMENT_METHODS = [
  {
    id: "pix",
    label: "PIX",
    description: "Confirmação instantânea",
    icon: Banknote,
  },
  {
    id: "card",
    label: "Cartão",
    description: "Crédito e débito",
    icon: CreditCard,
  },
  {
    id: "boleto",
    label: "Boleto",
    description: "Pagamento posterior",
    icon: WalletCards,
  },
];

const CHECKOUT_STEPS = [
  {
    label: "Confirmação do pedido",
    description: "Recebemos o seu pedido e validamos os itens.",
  },
  {
    label: "Pagamento confirmado",
    description: "A transação foi aprovada com segurança.",
  },
  {
    label: "Pedido em preparação",
    description: "Separação e embalagem dos produtos regionais.",
  },
  {
    label: "Saiu para entrega",
    description: "O pedido já está com o entregador.",
  },
  {
    label: "Entregue com sucesso",
    description: "Pedido finalizado com experiência positiva.",
  },
];

const QUICK_PROMPTS = [
  "Tem carne de sol disponível?",
  "Aceita PIX e boleto?",
  "Qual o prazo de entrega?",
  "Quero saber mais sobre o cuscuz",
];

function getBotReply(message: string) {
  const text = message.toLowerCase();

  if (text.includes("pix") || text.includes("boleto") || text.includes("cart")) {
    return "Aceitamos PIX, cartão e boleto. O fluxo foi pensado para ficar rápido, seguro e com confirmação automática.";
  }

  if (text.includes("entrega") || text.includes("prazo") || text.includes("frete")) {
    return "A entrega é simulada no painel e mostra as etapas até o pedido chegar. Em um projeto real, podemos ligar isso ao rastreamento da transportadora.";
  }

  if (text.includes("carne") || text.includes("cuscuz") || text.includes("farinha") || text.includes("queijo") || text.includes("baiao") || text.includes("baião")) {
    return "Temos itens fictícios como carne de sol, cuscuz, farinha de mandioca, queijo coalho e baião de dois. Posso detalhar cada um deles para você.";
  }

  if (text.includes("avali") || text.includes("satisf")) {
    return "Também dá para capturar avaliação com estrelas, comentário e feedback sobre o atendimento do bot após a compra.";
  }

  return "Posso te ajudar com produtos, pagamento, entrega e avaliação. Se quiser, me pergunte sobre um item específico da vitrine.";
}

export default function StoreExperience() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "bot",
      text: "Olá! Sou o atendimento da Casa do Norte RN. Clique em uma pergunta ou escreva sua dúvida para abrir uma conversa no WhatsApp.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [selectedPayment, setSelectedPayment] = useState("pix");
  const [checkoutStep, setCheckoutStep] = useState(-1);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [botFeedback, setBotFeedback] = useState("resolveu_rapido");
  const timersRef = useRef<number[]>([]);
  const nextIdRef = useRef(2);

  const selectedPaymentLabel =
    PAYMENT_METHODS.find((method) => method.id === selectedPayment)?.label ?? "PIX";

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const clearTimers = () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  };

  const appendBotMessage = (text: string) => {
    setMessages((current) => [...current, { id: nextIdRef.current++, role: "bot", text }]);
  };

  const sendMessage = (customMessage?: string) => {
    const text = (customMessage ?? draft).trim();

    if (!text) {
      return;
    }

    openWhatsApp(createSupportMessage(text));
    setMessages((current) => [...current, { id: nextIdRef.current++, role: "user", text }]);
    setDraft("");

    window.setTimeout(() => {
      appendBotMessage("Abri o WhatsApp com sua mensagem pronta. Se o navegador bloquear a nova aba, clique em Enviar novamente.");
    }, 250);

    toast.success("WhatsApp aberto", {
      description: "A mensagem foi preparada para o atendimento da loja.",
    });
  };

  const startCheckoutDemo = () => {
    clearTimers();
    toast.info("Checkout iniciado", {
      description: "Os popups das etapas da compra vão aparecer em sequência.",
    });

    CHECKOUT_STEPS.forEach((step, index) => {
      const timer = window.setTimeout(() => {
        setCheckoutStep(index);
        const title = `${index + 1}. ${step.label}`;

        if (index === 1) {
          toast.success(title, { description: step.description });
        } else if (index === CHECKOUT_STEPS.length - 1) {
          toast.success(title, { description: step.description });
          toast.success("Compra concluída com sucesso", {
            description: "Você pode pedir a avaliação do cliente logo abaixo.",
          });
        } else {
          toast.message(title, { description: step.description });
        }
      }, index * 1400);

      timersRef.current.push(timer);
    });
  };

  const submitReview = () => {
    toast.success("Avaliação registrada", {
      description: `${rating} estrelas e feedback sobre o bot enviados com sucesso.`,
    });
  };

  const progressValue = checkoutStep < 0 ? 0 : ((checkoutStep + 1) / CHECKOUT_STEPS.length) * 100;

  return (
    <section id="atendimento" className="border-t border-border bg-white py-16">
      <div className="container space-y-8">
        <div className="max-w-3xl space-y-3">
          <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/5 px-3 py-1 text-primary">
            Funcionalidades da loja
          </Badge>
          <h2
            className="text-3xl font-bold text-foreground md:text-4xl"
            style={{ fontFamily: "Playfair Display" }}
          >
            WhatsApp, pagamento, satisfação e status do pedido
          </h2>
          <p className="text-base text-muted-foreground md:text-lg">
            Esta área conecta o cliente ao WhatsApp da loja e também apresenta as principais
            etapas da compra em uma experiência visual clara.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <div id="atendimento-chat" className="rounded-2xl border border-border bg-[#fbf8f2] p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
                    <MessageCircleMore className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Atendimento via WhatsApp</h3>
                    <p className="text-sm text-muted-foreground">Perguntas prontas e mensagem direta para a loja</p>
                  </div>
                </div>
                <Badge variant="secondary" className="rounded-full bg-emerald-100 text-emerald-700">
                  WhatsApp
                </Badge>
              </div>

              <div className="mb-4 space-y-3 rounded-2xl border border-border bg-white p-4">
                <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
                        message.role === "bot"
                          ? "bg-muted text-foreground"
                          : "ml-auto bg-primary text-primary-foreground"
                      )}
                    >
                      <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] opacity-80">
                        {message.role === "bot" ? <Bot className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
                        {message.role === "bot" ? "Atendimento" : "Cliente"}
                      </div>
                      {message.text}
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => sendMessage(prompt)}
                      className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary transition hover:bg-primary/10"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Escreva sua dúvida para enviar no WhatsApp..."
                    className="flex-1"
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        sendMessage();
                      }
                    }}
                  />
                  <Button onClick={() => sendMessage()} className="gap-2">
                    Enviar no WhatsApp
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
                <div className="rounded-xl border border-border bg-white p-3">
                  <p className="font-semibold text-foreground">Perguntas comuns</p>
                  <p className="mt-1">Produto, valor, peso e entrega</p>
                </div>
                <div className="rounded-xl border border-border bg-white p-3">
                  <p className="font-semibold text-foreground">Mensagem pronta</p>
                  <p className="mt-1">O texto já sai organizado para o WhatsApp</p>
                </div>
                <div className="rounded-xl border border-border bg-white p-3">
                  <p className="font-semibold text-foreground">WhatsApp ativo</p>
                  <p className="mt-1">Abre conversa direta com a loja</p>
                </div>
              </div>
            </div>

            <div id="pagamento" className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-500/10 text-emerald-700">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Métodos de pagamento</h3>
                    <p className="text-sm text-muted-foreground">Escolha a forma de pagamento do pedido</p>
                  </div>
                </div>
                <Badge variant="outline" className="rounded-full border-emerald-200 text-emerald-700">
                  Seguro
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {PAYMENT_METHODS.map((method) => {
                  const Icon = method.icon;
                  const active = selectedPayment === method.id;

                  return (
                    <button
                      key={method.id}
                      onClick={() => setSelectedPayment(method.id)}
                      className={cn(
                        "rounded-2xl border p-4 text-left transition-all",
                        active
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border bg-[#fbf8f2] hover:border-primary/40 hover:bg-primary/5"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <Icon className={cn("h-5 w-5", active ? "text-primary" : "text-foreground")} />
                        {active && (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <p className="mt-3 font-semibold text-foreground">{method.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{method.description}</p>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-[#fbf8f2] p-4">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Confirmação de pagamento</p>
                  <p className="text-sm text-muted-foreground">
                    Simulação de checkout com {selectedPaymentLabel} e validação imediata.
                  </p>
                </div>
                <Button onClick={() => toast.success(`Pagamento via ${selectedPaymentLabel} confirmado.`)}>
                  Confirmar pagamento
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-[#d98b41]/10 text-[#d98b41]">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Popups das etapas da compra</h3>
                    <p className="text-sm text-muted-foreground">Sequência visual do pedido até a entrega</p>
                  </div>
                </div>
                <Badge variant="secondary" className="rounded-full bg-[#d98b41]/10 text-[#d98b41]">
                  Em demo
                </Badge>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">Progresso do pedido</span>
                    <span className="text-muted-foreground">
                      {checkoutStep < 0 ? "0/5" : `${checkoutStep + 1}/5`}
                    </span>
                  </div>
                  <Progress value={progressValue} className="h-2" />
                </div>

                <div className="grid gap-3">
                  {CHECKOUT_STEPS.map((step, index) => {
                    const completed = checkoutStep >= index;

                    return (
                      <div
                        key={step.label}
                        className={cn(
                          "rounded-2xl border p-4 transition-all",
                          completed
                            ? "border-emerald-200 bg-emerald-50"
                            : "border-border bg-[#fbf8f2]"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              "mt-0.5 grid h-8 w-8 place-items-center rounded-full text-sm font-semibold",
                              completed ? "bg-emerald-600 text-white" : "bg-white text-muted-foreground"
                            )}
                          >
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-foreground">{step.label}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Button onClick={startCheckoutDemo} className="w-full gap-2">
                  <Truck className="h-4 w-4" />
                  Disparar popups da compra
                </Button>
              </div>
            </div>

            <div id="avaliacao" className="rounded-2xl border border-border bg-[#fbf8f2] p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-amber-500/10 text-amber-700">
                    <Star className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Rastreamento de satisfação</h3>
                    <p className="text-sm text-muted-foreground">Avaliação após a compra e feedback do bot</p>
                  </div>
                </div>
                <Badge variant="outline" className="rounded-full border-amber-200 text-amber-700">
                  Pesquisa
                </Badge>
              </div>

              <div className="space-y-4 rounded-2xl border border-border bg-white p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Nota da experiência</p>
                  <div className="mt-2 flex gap-2">
                    {Array.from({ length: 5 }).map((_, index) => {
                      const value = index + 1;
                      const active = value <= rating;

                      return (
                        <button
                          key={value}
                          onClick={() => setRating(value)}
                          className={cn(
                            "grid h-11 w-11 place-items-center rounded-full border transition-all",
                            active
                              ? "border-amber-500 bg-amber-500 text-white"
                              : "border-border bg-[#fbf8f2] text-muted-foreground hover:border-amber-300"
                          )}
                        >
                          <Star className={cn("h-4 w-4", active && "fill-current")} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-3">
                  <div>
                    <label className="text-sm font-medium text-foreground">Comentário</label>
                    <textarea
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                      placeholder="Conte como foi a experiência com a loja..."
                      className="mt-2 min-h-28 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground">Feedback sobre o bot</label>
                    <select
                      value={botFeedback}
                      onChange={(event) => setBotFeedback(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-primary"
                    >
                      <option value="resolveu_rapido">Resolveu rápido</option>
                      <option value="precisa_melhorar">Precisa melhorar</option>
                      <option value="quero_mais_receitas">Quero mais receitas e dicas</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-border bg-[#fbf8f2] px-4 py-3 text-sm text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  A pesquisa de satisfação ajuda a medir atendimento, pagamento e entrega.
                </div>

                <Button onClick={submitReview} className="w-full gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Enviar avaliação
                </Button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-white p-4">
                  <p className="text-sm font-semibold text-foreground">Métrica do bot</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {botFeedback === "resolveu_rapido"
                      ? "Atendimento percebido como rápido e útil."
                      : botFeedback === "precisa_melhorar"
                        ? "Ponto de atenção para novas respostas."
                        : "Ótimo para engajar com dicas e receitas."}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-white p-4">
                  <p className="text-sm font-semibold text-foreground">Resumo da compra</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Método: {selectedPaymentLabel} | Nota: {rating} estrelas
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
