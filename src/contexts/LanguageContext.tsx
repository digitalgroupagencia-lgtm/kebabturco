import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useResolvedStore } from "@/hooks/useResolvedStore";
import { getEmbedLang, isEmbedded } from "@/lib/embed-mode";
import { loadSavedLang, saveSavedLang } from "@/lib/customerSession";

type Lang = "pt" | "en" | "es" | "fr";

export const LANG_LABELS: Record<Lang, string> = {
  pt: "Português",
  en: "English",
  es: "Español",
  fr: "Français",
};

interface Translations {
  [key: string]: Record<Lang, string>;
}

const translations: Translations = {
  welcome: { pt: "Bem-vindo!", en: "Welcome!", es: "¡Bienvenido!", fr: "Bienvenue !" },
  chooseLanguage: { pt: "Escolha seu idioma", en: "Choose your language", es: "Elige tu idioma", fr: "Choisissez votre langue" },
  whereEat: { pt: "Onde você quer comer?", en: "Where do you want to eat?", es: "¿Dónde quieres comer?", fr: "Où voulez-vous manger ?" },
  eatHere: { pt: "Mesa", en: "Table", es: "Mesa", fr: "Table" },
  takeaway: { pt: "Levar", en: "Take away", es: "Para llevar", fr: "À emporter" },
  menu: { pt: "Cardápio", en: "Menu", es: "Menú", fr: "Menu" },
  bestsellers: { pt: "Mais vendidos", en: "Bestsellers", es: "Más vendidos", fr: "Meilleures ventes" },
  promotions: { pt: "Promoções", en: "Promotions", es: "Promociones", fr: "Promotions" },
  suggestions: { pt: "Sugestões", en: "Suggestions", es: "Sugerencias", fr: "Suggestions" },
  categories: { pt: "Categorias", en: "Categories", es: "Categorías", fr: "Catégories" },
  addToOrder: { pt: "Adicionar ao pedido", en: "Add to order", es: "Añadir al pedido", fr: "Ajouter à la commande" },
  size: { pt: "Tamanho", en: "Size", es: "Tamaño", fr: "Taille" },
  extras: { pt: "Adicionais", en: "Extras", es: "Extras", fr: "Suppléments" },
  upsellTitle: { pt: "Quer adicionar mais?", en: "Want to add more?", es: "¿Quieres añadir más?", fr: "Voulez-vous ajouter ?" },
  noThanks: { pt: "Não, obrigado", en: "No, thanks", es: "No, gracias", fr: "Non, merci" },
  cart: { pt: "Carrinho", en: "Cart", es: "Carrito", fr: "Panier" },
  finishOrder: { pt: "Finalizar pedido", en: "Finish order", es: "Finalizar pedido", fr: "Finaliser la commande" },
  orderReview: { pt: "Revisão do pedido", en: "Order review", es: "Revisión del pedido", fr: "Révision de la commande" },
  edit: { pt: "Editar", en: "Edit", es: "Editar", fr: "Modifier" },
  remove: { pt: "Remover", en: "Remove", es: "Eliminar", fr: "Supprimer" },
  total: { pt: "Total", en: "Total", es: "Total", fr: "Total" },
  payment: { pt: "Pagamento", en: "Payment", es: "Pago", fr: "Paiement" },
  card: { pt: "Cartão", en: "Card", es: "Tarjeta", fr: "Carte" },
  cash: { pt: "Dinheiro", en: "Cash", es: "Efectivo", fr: "Espèces" },
  applePay: { pt: "Apple Pay", en: "Apple Pay", es: "Apple Pay", fr: "Apple Pay" },
  googlePay: { pt: "Google Pay", en: "Google Pay", es: "Google Pay", fr: "Google Pay" },
  payNow: { pt: "Pagar agora", en: "Pay now", es: "Pagar ahora", fr: "Payer maintenant" },
  orderConfirmed: { pt: "Pedido confirmado!", en: "Order confirmed!", es: "¡Pedido confirmado!", fr: "Commande confirmée !" },
  orderNumber: { pt: "Número do pedido", en: "Order number", es: "Número de pedido", fr: "Numéro de commande" },
  estimatedTime: { pt: "Tempo estimado", en: "Estimated time", es: "Tiempo estimado", fr: "Temps estimé" },
  minutes: { pt: "minutos", en: "minutes", es: "minutos", fr: "minutes" },
  newOrder: { pt: "Novo pedido", en: "New order", es: "Nuevo pedido", fr: "Nouvelle commande" },
  items: { pt: "itens", en: "items", es: "artículos", fr: "articles" },
  oneItem: { pt: "item", en: "item", es: "artículo", fr: "article" },
  noExtra: { pt: "Sem suplemento", en: "No extra charge", es: "Sin suplemento", fr: "Sans supplément" },
  addressStreet: { pt: "Endereço (rua)", en: "Address (street)", es: "Dirección (calle)", fr: "Adresse (rue)" },
  addressStreetPh: { pt: "Ex: Rua Principal", en: "Ex: Main Street", es: "Ej: Calle Mayor", fr: "Ex : Rue Principale" },
  addressNumber: { pt: "Número", en: "Number", es: "Número", fr: "Numéro" },
  addressFloor: { pt: "Andar/Porta", en: "Floor/Door", es: "Piso/Puerta", fr: "Étage/Porte" },
  addressFloorPh: { pt: "3º B", en: "3rd B", es: "3º B", fr: "3e B" },
  addressPostal: { pt: "CEP", en: "ZIP", es: "CP", fr: "CP" },
  addressCity: { pt: "Cidade", en: "City", es: "Ciudad", fr: "Ville" },
  addressNotes: { pt: "Notas para o entregador", en: "Notes for the courier", es: "Notas para el repartidor", fr: "Notes pour le livreur" },
  addressNotesPh: { pt: "Ex: Portão azul, tocar campainha 2", en: "Ex: Blue gate, ring bell 2", es: "Ej: Portal azul, llamar al timbre 2", fr: "Ex : Portail bleu, sonner 2" },
  clearOrder: { pt: "Limpar pedido", en: "Clear order", es: "Vaciar pedido", fr: "Vider la commande" },
  confirmClear: { pt: "Tem certeza que deseja limpar todo o pedido?", en: "Are you sure you want to clear the entire order?", es: "¿Seguro que quieres vaciar todo el pedido?", fr: "Voulez-vous vraiment vider toute la commande ?" },
  freeKetchup: { pt: "Adicionar ketchup grátis?", en: "Add free ketchup?", es: "¿Añadir ketchup gratis?", fr: "Ajouter ketchup gratuit ?" },
  yes: { pt: "Sim", en: "Yes", es: "Sí", fr: "Oui" },
  goToPayment: { pt: "Ir para pagamento", en: "Go to payment", es: "Ir al pago", fr: "Aller au paiement" },
  back: { pt: "Voltar", en: "Back", es: "Volver", fr: "Retour" },
  offers: { pt: "Ofertas", en: "Offers", es: "Ofertas", fr: "Offres" },
  startOrder: { pt: "Fazer pedido", en: "Start order", es: "Hacer pedido", fr: "Commander" },
  choose: { pt: "Escolha", en: "Choose", es: "Elige", fr: "Choisir" },
  quantity: { pt: "Quantidade", en: "Quantity", es: "Cantidad", fr: "Quantité" },
  continueBtn: { pt: "Continuar", en: "Continue", es: "Continuar", fr: "Continuer" },
  update: { pt: "Actualizar", en: "Update", es: "Actualizar", fr: "Mettre à jour" },
  note: { pt: "Observações", en: "Notes", es: "Observaciones", fr: "Remarques" },
  notePlaceholder: {
    pt: "Ex.: sem cebola, molho à parte…",
    en: "E.g. no onion, sauce on the side…",
    es: "Ej.: sin cebolla, salsa aparte…",
    fr: "Ex. : sans oignon, sauce à part…",
  },
  included: { pt: "Incluído", en: "Included", es: "Incluido", fr: "Inclus" },
  removedLabel: { pt: "Removido", en: "Removed", es: "Quitado", fr: "Retiré" },
  required: { pt: "Obrigatório", en: "Required", es: "Obligatorio", fr: "Obligatoire" },
  optional: { pt: "Opcional", en: "Optional", es: "Opcional", fr: "Optionnel" },
  customize: { pt: "Personalizar", en: "Customize", es: "Personalizar", fr: "Personnaliser" },
  extraTag: { pt: "Extra", en: "Extra", es: "Extra", fr: "Extra" },
  chooseOne: { pt: "Escolhe 1", en: "Choose 1", es: "Elige 1", fr: "Choisissez 1" },
  chooseUpTo: { pt: "Escolhe até", en: "Choose up to", es: "Elige hasta", fr: "Choisissez jusqu'à" },
  missingChoice: { pt: "Falta escolher", en: "Pick one", es: "Falta elegir", fr: "À choisir" },
  comboChoices: { pt: "Escolhas do combo", en: "Combo choices", es: "Opciones del menú", fr: "Choix du menu" },
  errRequiredChoice: {
    pt: "Escolhe uma opção antes de continuar",
    en: "Choose an option before continuing",
    es: "Elige una opción antes de continuar",
    fr: "Choisissez une option avant de continuer",
  },
  errRequiredSubstitution: {
    pt: "Escolhe o acompanhamento",
    en: "Choose a side dish",
    es: "Elige el acompañamiento",
    fr: "Choisissez l'accompagnement",
  },
  errRequiredRemoval: {
    pt: "Completa a personalização",
    en: "Complete your customization",
    es: "Completa la personalización",
    fr: "Complétez la personnalisation",
  },
  errVerifyChoices: {
    pt: "Verifica as tuas escolhas",
    en: "Check your selections",
    es: "Revisa tus elecciones",
    fr: "Vérifiez vos choix",
  },
  errRequiredProduct: {
    pt: "Completa as escolhas obrigatórias",
    en: "Complete the required choices",
    es: "Completa las opciones obligatorias",
    fr: "Complétez les choix obligatoires",
  },
  errRequiredCombo: {
    pt: "Completa as escolhas do menu",
    en: "Complete the menu choices",
    es: "Completa las opciones del menú",
    fr: "Complétez les choix du menu",
  },
  errRequiredUnit: {
    pt: "Completa a personalização da unidade",
    en: "Complete customization for unit",
    es: "Completa la personalización de la unidad",
    fr: "Complétez la personnalisation de l'unité",
  },
  productUnavailable: {
    pt: "Produto indisponível",
    en: "Product unavailable",
    es: "Producto no disponible",
    fr: "Produit indisponible",
  },
  stepOf: { pt: "Passo", en: "Step", es: "Paso", fr: "Étape" },
  of: { pt: "de", en: "of", es: "de", fr: "sur" },
  unit: { pt: "Unidade", en: "Unit", es: "Unidad", fr: "Unité" },
  substitutionHint: {
    pt: "Substitui o acompanhamento — escolhe apenas uma opção",
    en: "Replaces the side — pick one option only",
    es: "Sustituye el acompañamiento — elige solo una opción",
    fr: "Remplace l'accompagnement — un seul choix",
  },
  // Review screen
  yourOrder: { pt: "Seu pedido", en: "Your order", es: "Tu pedido", fr: "Votre commande" },
  review: { pt: "Revisão", en: "Review", es: "Revisión", fr: "Révision" },
  modality: { pt: "Modalidade", en: "Mode", es: "Modalidad", fr: "Mode" },
  tableNumber: { pt: "Número da mesa", en: "Table number", es: "Número de mesa", fr: "Numéro de table" },
  tableHint: { pt: "Indique sua mesa para entregarmos o pedido.", en: "Tell us your table so we can deliver your order.", es: "Indica tu mesa para que te llevemos el pedido.", fr: "Indiquez votre table pour la livraison." },
  yourName: { pt: "Seu nome", en: "Your name", es: "Tu nombre", fr: "Votre prénom" },
  yourPhone: { pt: "Telefone", en: "Phone", es: "Teléfono", fr: "Téléphone" },
  phoneOrderHint: {
    pt: "Guardamos o teu número para acompanhar o pedido e pedir de novo mais tarde.",
    en: "We save your number so you can track your order and reorder later.",
    es: "Guardamos tu número para seguir el pedido y volver a pedir más tarde.",
    fr: "Nous enregistrons votre numéro pour suivre la commande et recommander plus tard.",
  },
  trackMyOrders: { pt: "Seguir pedido", en: "Track order", es: "Seguir pedido", fr: "Suivre commande" },
  myOrdersTitle: { pt: "Os meus pedidos", en: "My orders", es: "Mis pedidos", fr: "Mes commandes" },
  searchMyOrders: { pt: "Ver pedidos", en: "View orders", es: "Ver pedidos", fr: "Voir commandes" },
  phoneSearchHint: {
    pt: "Introduz o teu telemóvel para ver pedidos anteriores e o estado.",
    en: "Enter your phone to see past orders and their status.",
    es: "Introduce tu móvil para ver pedidos anteriores y su estado.",
    fr: "Entrez votre mobile pour voir vos commandes et leur statut.",
  },
  phoneHint: { pt: "Avisaremos quando estiver pronto.", en: "We will text you when ready.", es: "Te avisaremos cuando esté listo.", fr: "Nous vous préviendrons." },
  yourProducts: { pt: "Seus produtos", en: "Your products", es: "Tus productos", fr: "Vos produits" },
  emptyCart: { pt: "Carrinho vazio", en: "Empty cart", es: "Carrito vacío", fr: "Panier vide" },
  viewMenu: { pt: "Ver cardápio", en: "View menu", es: "Ver menú", fr: "Voir le menu" },
  addMore: { pt: "Quer adicionar algo mais?", en: "Want to add anything else?", es: "¿Quieres añadir algo más?", fr: "Voulez-vous ajouter ?" },
  addDrink: { pt: "Que tal uma bebida?", en: "How about a drink?", es: "¿Y una bebida?", fr: "Une boisson ?" },
  taxesIncluded: { pt: "Impostos incluídos", en: "Taxes included", es: "Impuestos incluidos", fr: "Taxes incluses" },
  enterName: { pt: "Indique seu nome", en: "Enter your name", es: "Indica tu nombre", fr: "Entrez votre prénom" },
  enterTable: { pt: "Indique sua mesa", en: "Enter your table", es: "Indica tu mesa", fr: "Entrez votre table" },
  enterPhone: { pt: "Indique seu telefone", en: "Enter your phone", es: "Indica tu teléfono", fr: "Entrez votre téléphone" },
  // Finalize modal
  finalizeOrder: { pt: "Finalizar pedido", en: "Finalize order", es: "Finalizar pedido", fr: "Finaliser la commande" },
  send: { pt: "Enviar", en: "Send", es: "Enviar", fr: "Envoyer" },
  finalizeHint: {
    pt: "Informe os dados para concluir o pedido.",
    en: "Please provide your details to complete the order.",
    es: "Indica tus datos para completar el pedido.",
    fr: "Indiquez vos données pour finaliser la commande.",
  },
  saveImage: { pt: "Salvar imagem", en: "Save image", es: "Guardar imagen", fr: "Enregistrer l'image" },
  saveImageHint: {
    pt: "Tire um print ou salve seu comprovante",
    en: "Take a screenshot or save your receipt",
    es: "Haz una captura o guarda tu comprobante",
    fr: "Faites une capture ou enregistrez votre reçu",
  },
  orderTime: { pt: "Horário", en: "Time", es: "Hora", fr: "Heure" },
  // Item details
  size_label: { pt: "Tamanho", en: "Size", es: "Tamaño", fr: "Taille" },
  without: { pt: "Sem", en: "No", es: "Sin", fr: "Sans" },
  remove2: { pt: "Remover", en: "Remove", es: "Quitar", fr: "Retirer" },
  edit2: { pt: "Editar", en: "Edit", es: "Editar", fr: "Modifier" },
  // Order type screen
  howOrder: { pt: "Como deseja fazer seu pedido?", en: "How would you like to order?", es: "¿Cómo deseas hacer tu pedido?", fr: "Comment souhaitez-vous commander ?" },
  pickOption: { pt: "Escolha uma opção para continuar", en: "Pick an option to continue", es: "Elige una opción para continuar", fr: "Choisissez une option" },
  eatHereSub: { pt: "Receba na mesa após o pedido", en: "Pick up at table after order", es: "Recoge en la mesa tras el pedido", fr: "Récupérez à table" },
  takeawaySub: { pt: "Retire no balcão", en: "Pick up at counter", es: "Recoge en el mostrador", fr: "Retrait au comptoir" },
  delivery: { pt: "A domicílio", en: "Delivery", es: "A domicilio", fr: "À domicile" },
  deliverySub: { pt: "Entrega no seu endereço", en: "Delivered to your address", es: "Entrega en tu dirección", fr: "Livré à votre adresse" },
  // Payment
  finalStep: { pt: "Última etapa", en: "Final step", es: "Paso final", fr: "Dernière étape" },
  pay: { pt: "Pagamento", en: "Payment", es: "Pago", fr: "Paiement" },
  totalToPay: { pt: "Total a pagar", en: "Total to pay", es: "Total a pagar", fr: "Total à payer" },
  pickMethod: { pt: "Escolha o método", en: "Pick your method", es: "Elige tu método", fr: "Choisissez votre méthode" },
  payAtCounterTitle: { pt: "Pagar no balcão", en: "Pay at counter", es: "Pago en mostrador", fr: "Payer au comptoir" },
  payAtCounterSub: { pt: "Você pagará ao retirar o pedido.", en: "You will pay when picking up.", es: "Realizarás el pago al recoger tu pedido.", fr: "Vous paierez au retrait." },
  processing: { pt: "Processando...", en: "Processing...", es: "Procesando...", fr: "Traitement..." },
  confirmOrder: { pt: "Confirmar pedido", en: "Confirm order", es: "Confirmar pedido", fr: "Confirmer la commande" },
  confirmPayment: { pt: "Confirmar pagamento", en: "Confirm payment", es: "Confirmar pago", fr: "Confirmer le paiement" },
  // Confirmation
  confirmedEyebrow: { pt: "Confirmado", en: "Confirmed", es: "Confirmado", fr: "Confirmé" },
  orderReceived: { pt: "Pedido recebido!", en: "Order received!", es: "¡Pedido recibido!", fr: "Commande reçue !" },
  preparingOrder: { pt: "Estamos preparando seu pedido", en: "We are preparing your order", es: "Estamos preparando tu pedido", fr: "Nous préparons votre commande" },
  yourNumber: { pt: "Seu número", en: "Your number", es: "Tu número", fr: "Votre numéro" },
  showAtPickup: { pt: "Mostre este número ao retirar", en: "Show this number when picking up", es: "Muestra este número al recoger tu pedido", fr: "Montrez ce numéro au retrait" },
  customerLabel: { pt: "Cliente", en: "Customer", es: "Cliente", fr: "Client" },
  phoneLabel: { pt: "Telefone", en: "Phone", es: "Teléfono", fr: "Téléphone" },
  tableLabel: { pt: "Mesa", en: "Table", es: "Mesa", fr: "Table" },
  modeLabel: { pt: "Modalidade", en: "Mode", es: "Modalidad", fr: "Mode" },
  paymentStatus: { pt: "Status do pagamento", en: "Payment status", es: "Estado de pago", fr: "État du paiement" },
  estTime: { pt: "Tempo estimado", en: "Estimated time", es: "Tiempo estimado", fr: "Temps estimé" },
  // Splash subtitle
  splashTagline: { pt: "Kebab · Pizza · Burger", en: "Kebab · Pizza · Burger", es: "Kebab · Pizza · Burger", fr: "Kebab · Pizza · Burger" },
};

interface LanguageContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
  tProduct: (obj: Record<string, string> | string | null | undefined) => string;
  /** Idioma principal definido para o projeto (vindo do banco) */
  primaryLang: Lang;
  /** Idiomas ativos do projeto (subset de Lang) */
  activeLangs: Lang[];
  /** URL de ícone (bandeira) por idioma */
  langIcons: Partial<Record<Lang, string>>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode; storeId?: string }> = ({
  children,
  storeId: storeIdProp,
}) => {
  const resolved = useResolvedStore();
  const storeId = storeIdProp ?? resolved.storeId ?? "";
  const [primaryLang, setPrimaryLang] = useState<Lang>("es");
  const [activeLangs, setActiveLangs] = useState<Lang[]>(["es"]);
  const [langIcons, setLangIcons] = useState<Partial<Record<Lang, string>>>({});
  const [lang, setLangState] = useState<Lang>(() => getEmbedLang() ?? loadSavedLang() ?? "es");

  const setLang = (next: Lang) => {
    setLangState(next);
    saveSavedLang(next);
  };

  useEffect(() => {
    const fromUrl = getEmbedLang();
    if (fromUrl) setLang(fromUrl);
  }, []);

  useEffect(() => {
    if (!storeId) return;
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("totem_config")
        .select("primary_language, active_languages, language_icons")
        .eq("store_id", storeId)
        .maybeSingle();
      if (!alive || !data) return;
      const valid: Lang[] = ["pt", "en", "es", "fr"];
      const primary = (valid.includes((data.primary_language as Lang)) ? data.primary_language : "es") as Lang;
      const actives = ((data.active_languages || []) as string[])
        .filter((l): l is Lang => valid.includes(l as Lang));
      setPrimaryLang(primary);
      setActiveLangs(actives.length ? actives : [primary]);
      setLangIcons((data.language_icons as Partial<Record<Lang, string>>) || {});
      const fromEmbed = isEmbedded() ? getEmbedLang() : null;
      const remembered = loadSavedLang();
      setLang(fromEmbed ?? remembered ?? primary);
    })();
    return () => {
      alive = false;
    };
  }, [storeId]);

  const t = (key: string) => translations[key]?.[lang] || translations[key]?.en || key;
  const tProduct = (obj: Record<string, string> | string | null | undefined) => {
    if (!obj) return "";
    if (typeof obj === "string") return obj;
    return obj[lang] || obj.en || Object.values(obj)[0] || "";
  };

  return (
    <LanguageContext.Provider
      value={{ lang, setLang, t, tProduct, primaryLang, activeLangs, langIcons }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
};
