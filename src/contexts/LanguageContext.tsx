import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  eatHere: { pt: "Comer aqui", en: "Eat here", es: "Comer aquí", fr: "Manger ici" },
  takeaway: { pt: "Para levar", en: "Take away", es: "Para llevar", fr: "À emporter" },
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
  freeKetchup: { pt: "Adicionar ketchup grátis?", en: "Add free ketchup?", es: "¿Añadir ketchup gratis?", fr: "Ajouter ketchup gratuit ?" },
  yes: { pt: "Sim", en: "Yes", es: "Sí", fr: "Oui" },
  goToPayment: { pt: "Ir para pagamento", en: "Go to payment", es: "Ir al pago", fr: "Aller au paiement" },
  back: { pt: "Voltar", en: "Back", es: "Volver", fr: "Retour" },
  offers: { pt: "Ofertas", en: "Offers", es: "Ofertas", fr: "Offres" },
  startOrder: { pt: "Fazer pedido", en: "Start order", es: "Hacer pedido", fr: "Commander" },
  choose: { pt: "Escolha", en: "Choose", es: "Elige", fr: "Choisir" },
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
const DEFAULT_STORE_ID = "b0000000-0000-0000-0000-000000000001";

export const LanguageProvider: React.FC<{ children: React.ReactNode; storeId?: string }> = ({
  children,
  storeId = DEFAULT_STORE_ID,
}) => {
  const [primaryLang, setPrimaryLang] = useState<Lang>("es");
  const [activeLangs, setActiveLangs] = useState<Lang[]>(["es"]);
  const [langIcons, setLangIcons] = useState<Partial<Record<Lang, string>>>({});
  const [lang, setLang] = useState<Lang>("es");

  useEffect(() => {
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
      setLang(primary);
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
