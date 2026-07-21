const WHATSAPP_PHONE = "5511962992187";

export function createWhatsAppUrl(message: string) {
  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`;
}

export function openWhatsApp(message: string) {
  const url = createWhatsAppUrl(message);

  if (typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return url;
}

export function createSupportMessage(question: string) {
  return [
    "Olá! Vim pelo site RN Casa do Norte.",
    "",
    `Minha dúvida: ${question}`,
    "",
    "Pode me ajudar?",
  ].join("\n");
}

export function createProductMessage(productName: string, weightLabel: string, price: string) {
  return [
    "Olá! Vim pelo site RN Casa do Norte.",
    "",
    `Tenho interesse no produto: ${productName}`,
    `Peso selecionado: ${weightLabel}`,
    `Valor exibido: R$ ${price}`,
    "",
    "Pode confirmar disponibilidade, entrega e forma de pagamento?",
  ].join("\n");
}
