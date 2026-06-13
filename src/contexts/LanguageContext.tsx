import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useResolvedStore } from "@/hooks/useResolvedStore";
import { getEmbedLang, isEmbedded } from "@/lib/embed-mode";
import { loadSavedLang, readLangFromUrl, saveSavedLang } from "@/lib/customerSession";
import { pickSourceText, readLocalized, type AppLang } from "@/lib/localizedText";
import { getCachedMenuTranslation } from "@/lib/menuTranslationCache";
import { translateMenuTexts } from "@/services/menuTranslationService";

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
  storeOpen: { pt: "Aberto", en: "Open", es: "Abierto", fr: "Ouvert" },
  loadingMenu: { pt: "A carregar menu…", en: "Loading menu…", es: "Cargando menú…", fr: "Chargement du menu…" },
  loadingGeneric: { pt: "A carregar…", en: "Loading…", es: "Cargando…", fr: "Chargement…" },
  menuUnavailable: {
    pt: "Menu indisponível",
    en: "Menu unavailable",
    es: "Menú no disponible",
    fr: "Menu indisponible",
  },
  menuUnavailableHint: {
    pt: "Esta loja ainda não tem produtos activos. Tente mais tarde.",
    en: "This store has no active products yet. Please try again later.",
    es: "Esta tienda aún no tiene productos activos. Inténtalo más tarde.",
    fr: "Ce restaurant n'a pas encore de produits actifs. Réessayez plus tard.",
  },
  storeNotFound: { pt: "Loja não encontrada", en: "Store not found", es: "Local no encontrado", fr: "Restaurant introuvable" },
  storeNotFoundHint: {
    pt: "Não foi possível identificar a loja. Actualize a página.",
    en: "We couldn't identify the store. Refresh the page.",
    es: "No pudimos identificar el local. Actualiza la página.",
    fr: "Impossible d'identifier le restaurant. Actualisez la page.",
  },
  menuLoadError: {
    pt: "Erro ao carregar menu",
    en: "Couldn't load menu",
    es: "Error al cargar el menú",
    fr: "Erreur de chargement du menu",
  },
  menuLoadErrorHint: {
    pt: "Verifique a ligação e tente novamente.",
    en: "Check your connection and try again.",
    es: "Comprueba tu conexión e inténtalo de nuevo.",
    fr: "Vérifiez votre connexion et réessayez.",
  },
  tryAgainBtn: { pt: "Tentar novamente", en: "Try again", es: "Intentar de nuevo", fr: "Réessayer" },
  errPickMeatBeforeAdd: {
    pt: "Escolhe pollo, ternera ou mixto antes de adicionar ao pedido",
    en: "Choose chicken, beef or mixed before adding to cart",
    es: "Elige pollo, ternera o mixto antes de añadir al pedido",
    fr: "Choisissez poulet, bœuf ou mixte avant d'ajouter",
  },
  errPickDrinkBeforeAdd: {
    pt: "Escolhe o refresco antes de adicionar ao pedido",
    en: "Choose your drink before adding to cart",
    es: "Elige tu refresco antes de añadir al pedido",
    fr: "Choisissez votre boisson avant d'ajouter",
  },
  bestsellers: { pt: "Mais vendidos", en: "Bestsellers", es: "Más vendidos", fr: "Meilleures ventes" },
  promotions: { pt: "Promoções", en: "Promotions", es: "Promociones", fr: "Promotions" },
  suggestions: { pt: "Sugestões", en: "Suggestions", es: "Sugerencias", fr: "Suggestions" },
  categories: { pt: "Categorias", en: "Categories", es: "Categorías", fr: "Catégories" },
  addToOrder: { pt: "Adicionar ao pedido", en: "Add to order", es: "Añadir al pedido", fr: "Ajouter à la commande" },
  addToCartBtn: { pt: "Adicionar ao carrinho", en: "Add to cart", es: "Añadir al carrito", fr: "Ajouter au panier" },
  customizeProduct: {
    pt: "Personaliza o teu produto",
    en: "Customize your item",
    es: "Personaliza tu pedido",
    fr: "Personnalisez votre produit",
  },
  securePaymentHint: {
    pt: "Pagamento 100% seguro",
    en: "100% secure payment",
    es: "Pago 100% seguro",
    fr: "Paiement 100% sécurisé",
  },
  size: { pt: "Tamanho", en: "Size", es: "Tamaño", fr: "Taille" },
  extras: { pt: "Adicionais", en: "Extras", es: "Extras", fr: "Suppléments" },
  upsellTitle: { pt: "Quer adicionar mais?", en: "Want to add more?", es: "¿Quieres añadir más?", fr: "Voulez-vous ajouter ?" },
  upsellComboSide: {
    pt: "Quer um acompanhamento?",
    en: "Something on the side?",
    es: "¿Algo para acompañar?",
    fr: "Un accompagnement ?",
  },
  upsellEyebrow: { pt: "Sugestão", en: "Suggestion", es: "Sugerencia", fr: "Suggestion" },
  upsellSkip: {
    pt: "Continuar sem adicionar",
    en: "Continue without adding",
    es: "Continuar sin añadir",
    fr: "Continuer sans ajouter",
  },
  close: { pt: "Fechar", en: "Close", es: "Cerrar", fr: "Fermer" },
  noThanks: { pt: "Não, obrigado", en: "No, thanks", es: "No, gracias", fr: "Non, merci" },
  cart: { pt: "Carrinho", en: "Cart", es: "Carrito", fr: "Panier" },
  navHome: { pt: "Início", en: "Home", es: "Inicio", fr: "Accueil" },
  navOrders: { pt: "Pedidos", en: "Orders", es: "Pedidos", fr: "Commandes" },
  navCart: { pt: "Carrinho", en: "Cart", es: "Carrito", fr: "Panier" },
  navAccount: { pt: "Conta", en: "Account", es: "Cuenta", fr: "Compte" },
  myAccountTitle: { pt: "A minha conta", en: "My account", es: "Mi cuenta", fr: "Mon compte" },
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
  orderConfirmedTitle: { pt: "Pedido confirmado", en: "Order confirmed", es: "Pedido confirmado", fr: "Commande confirmée" },
  viewOrder: { pt: "Ver pedido", en: "View order", es: "Ver pedido", fr: "Voir la commande" },
  paymentConfirmedShort: { pt: "Pago confirmado", en: "Payment confirmed", es: "Pago confirmado", fr: "Paiement confirmé" },
  stepReceived: { pt: "Recebido", en: "Received", es: "Recibido", fr: "Reçu" },
  stepPreparing: { pt: "Preparando", en: "Preparing", es: "Preparando", fr: "En préparation" },
  stepReady: { pt: "Pronto", en: "Ready", es: "Listo", fr: "Prêt" },
  stepDelivered: { pt: "Entregue", en: "Delivered", es: "Entregado", fr: "Livré" },
  stepCollected: { pt: "Recolhido", en: "Collected", es: "Recogido", fr: "Récupéré" },
  viewOrderStatus: {
    pt: "Ver estado do pedido",
    en: "View order status",
    es: "Ver estado del pedido",
    fr: "Voir le statut",
  },
  customerStatusPending: {
    pt: "Pedido recebido",
    en: "Order received",
    es: "Pedido recibido",
    fr: "Commande reçue",
  },
  customerStatusPreparing: {
    pt: "Em preparação",
    en: "Preparing",
    es: "En preparación",
    fr: "En préparation",
  },
  customerStatusReady: {
    pt: "Pronto para entrega",
    en: "Ready for pickup",
    es: "Listo para entrega",
    fr: "Prêt",
  },
  customerStatusOutForDelivery: {
    pt: "Saiu para entrega",
    en: "Out for delivery",
    es: "En reparto",
    fr: "En livraison",
  },
  customerStatusDelivered: {
    pt: "Entregue",
    en: "Delivered",
    es: "Entregado",
    fr: "Livré",
  },
  customerStatusCollected: {
    pt: "Recolhido",
    en: "Collected",
    es: "Recogido",
    fr: "Récupéré",
  },
  customerStatusServed: {
    pt: "Servido",
    en: "Served",
    es: "Servido",
    fr: "Servi",
  },
  reviewTitle: {
    pt: "Avalie o seu pedido",
    en: "Rate your order",
    es: "Valora tu pedido",
    fr: "Évaluez votre commande",
  },
  reviewSubtitle: {
    pt: "A sua opinião ajuda o restaurante e o entregador.",
    en: "Your feedback helps the restaurant and driver.",
    es: "Tu opinión ayuda al restaurante y al repartidor.",
    fr: "Votre avis aide le restaurant et le livreur.",
  },
  reviewCommentPlaceholder: {
    pt: "Deixe um comentário (opcional)",
    en: "Leave a comment (optional)",
    es: "Deja un comentario (opcional)",
    fr: "Laissez un commentaire (optionnel)",
  },
  reviewSubmit: {
    pt: "Enviar avaliação",
    en: "Submit review",
    es: "Enviar valoración",
    fr: "Envoyer l'avis",
  },
  reviewThanks: {
    pt: "Obrigado pela sua avaliação!",
    en: "Thanks for your review!",
    es: "¡Gracias por tu valoración!",
    fr: "Merci pour votre avis !",
  },
  reviewFailed: {
    pt: "Não foi possível enviar a avaliação.",
    en: "Could not submit review.",
    es: "No se pudo enviar la valoración.",
    fr: "Impossible d'envoyer l'avis.",
  },
  reviewPickRating: {
    pt: "Escolha uma nota de 1 a 5.",
    en: "Pick a rating from 1 to 5.",
    es: "Elige una valoración de 1 a 5.",
    fr: "Choisissez une note de 1 à 5.",
  },
  orderCancelled: {
    pt: "Pedido cancelado",
    en: "Order cancelled",
    es: "Pedido cancelado",
    fr: "Commande annulée",
  },
  orderNotFound: {
    pt: "Pedido não encontrado",
    en: "Order not found",
    es: "Pedido no encontrado",
    fr: "Commande introuvable",
  },
  backToMenu: {
    pt: "Voltar ao menu",
    en: "Back to menu",
    es: "Volver al menú",
    fr: "Retour au menu",
  },
  trackingAutoUpdate: {
    pt: "Actualização automática activa",
    en: "Automatic updates active",
    es: "Actualización automática activa",
    fr: "Mise à jour automatique active",
  },
  trackingCurrentStatus: {
    pt: "Estado actual",
    en: "Current status",
    es: "Estado actual",
    fr: "Statut actuel",
  },
  trackingInProgress: {
    pt: "Em curso…",
    en: "In progress…",
    es: "En curso…",
    fr: "En cours…",
  },
  trackingEstimatedTime: {
    pt: "Tempo estimado: ~{n} min",
    en: "Estimated time: ~{n} min",
    es: "Tiempo estimado: ~{n} min",
    fr: "Temps estimé : ~{n} min",
  },
  trackingReadyAt: {
    pt: "Pronto ~",
    en: "Ready ~",
    es: "Listo ~",
    fr: "Prêt ~",
  },
  trackingDriver: {
    pt: "Entregador",
    en: "Driver",
    es: "Repartidor",
    fr: "Livreur",
  },
  trackingOutForDelivery: {
    pt: "O seu pedido saiu para entrega",
    en: "Your order is out for delivery",
    es: "Tu pedido salió en reparto",
    fr: "Votre commande est en livraison",
  },
  trackingDeliveryCode: {
    pt: "Código para o estafeta",
    en: "Code for the courier",
    es: "Código para el repartidor",
    fr: "Code pour le livreur",
  },
  trackingShowCode: {
    pt: "Mostre este código quando receber o pedido",
    en: "Show this code when you receive the order",
    es: "Muestra este código al recibir el pedido",
    fr: "Montrez ce code à la réception",
  },
  trackingDeliveryTo: {
    pt: "Entrega em",
    en: "Delivery to",
    es: "Entrega en",
    fr: "Livraison à",
  },
  errStoreNotReady: {
    pt: "A loja ainda está a carregar. Aguarde um momento e tente novamente.",
    en: "The store is still loading. Please wait and try again.",
    es: "La tienda aún se está cargando. Espera un momento e inténtalo de nuevo.",
    fr: "Le magasin se charge encore. Patientez et réessayez.",
  },
  errStorePreviewOnly: {
    pt: "Não é possível finalizar pedidos no modo pré-visualização. Use o site publicado (kebabturco.net).",
    en: "Orders cannot be placed in preview mode. Use the published site.",
    es: "No se pueden hacer pedidos en la vista previa. Usa el sitio publicado.",
    fr: "Impossible de commander en mode aperçu. Utilisez le site publié.",
  },
  etaMinutesLeft: { pt: "Pronto em ~{n} min", en: "Ready in ~{n} min", es: "Listo en ~{n} min", fr: "Prêt dans ~{n} min" },
  etaWaitingAccept: { pt: "Aguardando confirmação", en: "Waiting for confirmation", es: "Esperando confirmación", fr: "En attente de confirmation" },
  orderDelayTitle: {
    pt: "O restaurante está a demorar mais do que o normal",
    en: "The restaurant is taking longer than usual",
    es: "El restaurante está tardando más de lo normal",
    fr: "Le restaurant met plus de temps que d'habitude",
  },
  orderDelayBody: {
    pt: "O seu pagamento está confirmado. Se precisar de ajuda, contacte o restaurante.",
    en: "Your payment is confirmed. If you need help, contact the restaurant.",
    es: "Su pago está confirmado. Si necesita ayuda, contacte al restaurante.",
    fr: "Votre paiement est confirmé. Si vous avez besoin d'aide, contactez le restaurant.",
  },
  orderDelayWhatsappMessage: {
    pt: "Olá, fiz o pedido #{n} e ainda está à espera. Podem ajudar?",
    en: "Hi, I placed order #{n} and it's still waiting. Can you help?",
    es: "Hola, hice el pedido #{n} y sigue en espera. ¿Pueden ayudar?",
    fr: "Bonjour, j'ai passé la commande #{n} et elle attend toujours. Pouvez-vous aider?",
  },
  orderDelayWhatsappMessageGeneric: {
    pt: "Olá, o meu pedido está à espera há bastante tempo. Podem ajudar?",
    en: "Hi, my order has been waiting a long time. Can you help?",
    es: "Hola, mi pedido lleva mucho tiempo en espera. ¿Pueden ayudar?",
    fr: "Bonjour, ma commande attend depuis longtemps. Pouvez-vous aider?",
  },
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
  addressFloor: { pt: "Andar", en: "Floor", es: "Piso", fr: "Étage" },
  addressFloorPh: { pt: "Ex: 3 ou 3º", en: "Ex: 3 or 3rd", es: "Ej: 3 o 3º", fr: "Ex : 3 ou 3e" },
  addressDoor: { pt: "Porta", en: "Door", es: "Puerta", fr: "Porte" },
  addressDoorPh: { pt: "Ex: 12", en: "Ex: 12", es: "Ej: 12", fr: "Ex : 12" },
  addressBlock: { pt: "Bloco", en: "Block", es: "Bloque", fr: "Bâtiment" },
  addressBlockPh: { pt: "Ex: A", en: "Ex: A", es: "Ej: A", fr: "Ex : A" },
  addressFloorDoorHint: {
    pt: "Opcional — andar, porta e bloco (importante em prédios)",
    en: "Optional — floor, door and block (important for buildings)",
    es: "Opcional — piso, puerta y bloque (importante en edificios)",
    fr: "Facultatif — étage, porte et bâtiment (important en immeuble)",
  },
  addressPostal: { pt: "CEP", en: "ZIP", es: "CP", fr: "CP" },
  addressCity: { pt: "Cidade", en: "City", es: "Ciudad", fr: "Ville" },
  addressNotes: { pt: "Notas para o entregador", en: "Notes for the courier", es: "Notas para el repartidor", fr: "Notes pour le livreur" },
  addressNotesPh: { pt: "Ex: Portão azul, tocar campainha 2", en: "Ex: Blue gate, ring bell 2", es: "Ej: Portal azul, llamar al timbre 2", fr: "Ex : Portail bleu, sonner 2" },
  clearOrder: { pt: "Limpar pedido", en: "Clear order", es: "Vaciar pedido", fr: "Vider la commande" },
  confirmClear: { pt: "Tem certeza que deseja limpar todo o pedido?", en: "Are you sure you want to clear the entire order?", es: "¿Seguro que quieres vaciar todo el pedido?", fr: "Voulez-vous vraiment vider toute la commande ?" },
  confirmClearTitle: { pt: "Limpar pedido?", en: "Clear order?", es: "¿Vaciar pedido?", fr: "Vider la commande ?" },
  confirmRemoveItem: {
    pt: "Quer remover este produto do pedido?",
    en: "Remove this item from your order?",
    es: "¿Quitar este producto del pedido?",
    fr: "Retirer cet article de la commande ?",
  },
  confirmRemoveTitle: { pt: "Remover produto?", en: "Remove item?", es: "¿Quitar producto?", fr: "Retirer l'article ?" },
  cancelBtn: { pt: "Cancelar", en: "Cancel", es: "Cancelar", fr: "Annuler" },
  freeKetchup: { pt: "Adicionar ketchup grátis?", en: "Add free ketchup?", es: "¿Añadir ketchup gratis?", fr: "Ajouter ketchup gratuit ?" },
  yes: { pt: "Sim", en: "Yes", es: "Sí", fr: "Oui" },
  goToPayment: { pt: "Ir para pagamento", en: "Go to payment", es: "Ir al pago", fr: "Aller au paiement" },
  checkoutNeedOrderType: {
    pt: "Escolha como quer pedir (mesa, levar ou entrega) para continuar.",
    en: "Choose how you want to order (table, takeaway or delivery) to continue.",
    es: "Elige cómo quieres pedir (mesa, para llevar o a domicilio) para continuar.",
    fr: "Choisissez comment commander (table, à emporter ou livraison) pour continuer.",
  },
  checkoutNeedMesa: {
    pt: "Indique a mesa (QR ou número) para continuar.",
    en: "Enter your table (QR or number) to continue.",
    es: "Indica tu mesa (QR o número) para continuar.",
    fr: "Indiquez votre table (QR ou numéro) pour continuer.",
  },
  checkoutPickPayment: {
    pt: "Escolha uma forma de pagamento abaixo.",
    en: "Choose a payment method below.",
    es: "Elige una forma de pago abajo.",
    fr: "Choisissez un mode de paiement ci-dessous.",
  },
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
  customizationSummary: {
    pt: "Resumo",
    en: "Summary",
    es: "Resumen",
    fr: "Récapitulatif",
  },
  customizationSummaryHint: {
    pt: "Confirme as suas escolhas antes de adicionar ao carrinho.",
    en: "Confirm your choices before adding to cart.",
    es: "Confirma tus elecciones antes de añadir al carrito.",
    fr: "Confirmez vos choix avant d'ajouter au panier.",
  },
  unit: { pt: "Unidade", en: "Unit", es: "Unidad", fr: "Unité" },
  substitutionHint: {
    pt: "Substitui o acompanhamento — escolhe apenas uma opção",
    en: "Replaces the side — pick one option only",
    es: "Sustituye el acompañamiento — elige solo una opción",
    fr: "Remplace l'accompagnement — un seul choix",
  },
  potatoUpsellTitle: {
    pt: "Quer melhorar as batatas?",
    en: "Want to upgrade your fries?",
    es: "¿Quieres mejorar tus patatas?",
    fr: "Envie d'améliorer vos frites ?",
  },
  potatoUpgradeHint: {
    pt: "Adicionar por +0,50€",
    en: "Add for +€0.50",
    es: "Añadir por +0,50€",
    fr: "Ajouter pour +0,50€",
  },
  potatoStepHint: {
    pt: "Patatas incluídas — ou melhore por +0,50€",
    en: "Fries included — or upgrade for +€0.50",
    es: "Patatas incluidas — o mejora por +0,50€",
    fr: "Frites incluses — ou améliorez pour +0,50€",
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
  myProfileSection: {
    pt: "Os meus dados neste telemóvel",
    en: "My details on this phone",
    es: "Mis datos en este móvil",
    fr: "Mes données sur ce téléphone",
  },
  myProfileHint: {
    pt: "Guardamos nome, telemóvel e morada só neste aparelho — no próximo pedido os campos aparecem preenchidos. Podes alterar quando quiseres.",
    en: "We save name, phone and address only on this device — next time fields are prefilled. You can change them anytime.",
    es: "Guardamos nombre, móvil y dirección solo en este dispositivo — en el próximo pedido los campos aparecen rellenados. Puedes cambiarlos cuando quieras.",
    fr: "Nom, mobile et adresse enregistrés sur cet appareil uniquement.",
  },
  savedProfileHint: {
    pt: "Dados guardados neste telemóvel — podes editar abaixo.",
    en: "Saved on this phone — you can edit below.",
    es: "Datos guardados en este móvil — puedes editarlos abajo.",
    fr: "Enregistré sur ce téléphone — modifiable ci-dessous.",
  },
  saveMyData: {
    pt: "Guardar os meus dados",
    en: "Save my details",
    es: "Guardar mis datos",
    fr: "Enregistrer mes données",
  },
  profileSaved: {
    pt: "Dados guardados neste telemóvel!",
    en: "Details saved on this phone!",
    es: "¡Datos guardados en este móvil!",
    fr: "Données enregistrées !",
  },
  editMyData: {
    pt: "Editar os meus dados",
    en: "Edit my details",
    es: "Editar mis datos",
    fr: "Modifier mes données",
  },
  pushOptInTitle: {
    pt: "Notificações no telemóvel",
    en: "Phone notifications",
    es: "Notificaciones en el móvil",
    fr: "Notifications sur le téléphone",
  },
  pushOptInHint: {
    pt: "Active para receber promoções e avisos do restaurante neste telemóvel.",
    en: "Enable to get offers and updates from the restaurant on this phone.",
    es: "Activa para recibir promociones y avisos del restaurante en este móvil.",
    fr: "Activez pour recevoir promos et alertes du restaurant sur ce téléphone.",
  },
  pushOptInButton: {
    pt: "Activar notificações",
    en: "Enable notifications",
    es: "Activar notificaciones",
    fr: "Activer les notifications",
  },
  pushActivated: {
    pt: "Notificações activadas!",
    en: "Notifications enabled!",
    es: "¡Notificaciones activadas!",
    fr: "Notifications activées !",
  },
  pushActivateFailed: {
    pt: "Não foi possível activar. Tente nas definições do telemóvel.",
    en: "Could not enable. Try in your phone settings.",
    es: "No se pudo activar. Prueba en los ajustes del móvil.",
    fr: "Impossible d'activer. Essayez dans les réglages du téléphone.",
  },
  deliveryAddressSection: {
    pt: "Morada habitual (entrega)",
    en: "Usual address (delivery)",
    es: "Dirección habitual (entrega)",
    fr: "Adresse habituelle",
  },
  openMyOrders: {
    pt: "Os meus pedidos",
    en: "My orders",
    es: "Mis pedidos",
    fr: "Mes commandes",
  },
  phoneHint: { pt: "Avisaremos quando estiver pronto.", en: "We will text you when ready.", es: "Te avisaremos cuando esté listo.", fr: "Nous vous préviendrons." },
  yourProducts: { pt: "Seus produtos", en: "Your products", es: "Tus productos", fr: "Vos produits" },
  emptyCart: { pt: "Carrinho vazio", en: "Empty cart", es: "Carrito vacío", fr: "Panier vide" },
  viewMenu: { pt: "Ver cardápio", en: "View menu", es: "Ver menú", fr: "Voir le menu" },
  addMore: { pt: "Quer adicionar algo mais?", en: "Want to add anything else?", es: "¿Quieres añadir algo más?", fr: "Voulez-vous ajouter ?" },
  addMoreItems: {
    pt: "Adicionar mais produtos",
    en: "Add more items",
    es: "Añadir más productos",
    fr: "Ajouter d'autres produits",
  },
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
  cashCheckoutTitle: {
    pt: "Pagamento no caixa",
    en: "Pay at the register",
    es: "Pago en caja",
    fr: "Paiement à la caisse",
  },
  cashCheckoutHint: {
    pt: "Depois de confirmar, dirija-se ao caixa do restaurante para pagar em dinheiro.",
    en: "After confirming, go to the restaurant register to pay in cash.",
    es: "Tras confirmar, acude a la caja del restaurante para pagar en efectivo.",
    fr: "Après confirmation, rendez-vous à la caisse pour payer en espèces.",
  },
  recommended: { pt: "Principal", en: "Primary", es: "Principal", fr: "Principal" },
  cashPendingTitle: {
    pt: "Dirija-se ao balcão",
    en: "Go to the counter",
    es: "Dirígete al mostrador",
    fr: "Rendez-vous au comptoir",
  },
  cashPendingBody: {
    pt: "O seu pedido só será confirmado depois de pagar em dinheiro no restaurante.",
    en: "Your order will only be confirmed after you pay in cash at the restaurant.",
    es: "Tu pedido solo se confirmará después de pagar en efectivo en el restaurante.",
    fr: "Votre commande ne sera confirmée qu'après le paiement en espèces au restaurant.",
  },
  cashPendingHint: {
    pt: "Mostre este número no balcão para pagar.",
    en: "Show this number at the counter to pay.",
    es: "Muestra este número en el mostrador para pagar.",
    fr: "Montrez ce numéro au comptoir pour payer.",
  },
  cashPendingReference: {
    pt: "Referência do pedido",
    en: "Order reference",
    es: "Referencia del pedido",
    fr: "Référence de commande",
  },
  cashPendingWaiting: {
    pt: "A aguardar confirmação do pagamento…",
    en: "Waiting for payment confirmation…",
    es: "Esperando confirmación del pago…",
    fr: "En attente de confirmation du paiement…",
  },
  processing: { pt: "Processando...", en: "Processing...", es: "Procesando...", fr: "Traitement..." },
  confirmOrder: { pt: "Confirmar pedido", en: "Confirm order", es: "Confirmar pedido", fr: "Confirmer la commande" },
  confirmPayment: { pt: "Confirmar pagamento", en: "Confirm payment", es: "Confirmar pago", fr: "Confirmer le paiement" },
  stripePayBizum: { pt: "Pagamento com Bizum", en: "Pay with Bizum", es: "Pago con Bizum", fr: "Paiement avec Bizum" },
  stripePayCard: { pt: "Pagamento com cartão", en: "Card payment", es: "Pago con tarjeta", fr: "Paiement par carte" },
  stripeBizumPhoneHint: {
    pt: "Introduza o telemóvel associado ao Bizum e confirme na app do seu banco.",
    en: "Enter the mobile number linked to Bizum and confirm in your banking app.",
    es: "Introduce el móvil asociado a Bizum y confirma en la app de tu banco.",
    fr: "Saisissez le mobile associé à Bizum et confirmez dans l'app de votre banque.",
  },
  stripeBizumDesktopHint: {
    pt: "Bizum funciona melhor no telemóvel. Abra kebabturco.net no telemóvel para pagar com Bizum.",
    en: "Bizum works best on mobile. Open kebabturco.net on your phone to pay with Bizum.",
    es: "Bizum funciona mejor en el móvil. Abre kebabturco.net en el teléfono para pagar con Bizum.",
    fr: "Bizum fonctionne mieux sur mobile. Ouvrez kebabturco.net sur votre téléphone.",
  },
  stripeCardDesktopHint: {
    pt: "No computador só aparece o cartão. No telemóvel podem surgir Apple Pay ou Google Pay.",
    en: "On desktop only card is shown. On mobile Apple Pay or Google Pay may appear.",
    es: "En el ordenador solo aparece la tarjeta. En el móvil pueden aparecer Apple Pay o Google Pay.",
    fr: "Sur ordinateur, seule la carte s'affiche. Sur mobile, Apple Pay ou Google Pay peuvent apparaître.",
  },
  stripeWaitingBank: {
    pt: "A aguardar confirmação do banco…",
    en: "Waiting for bank confirmation…",
    es: "Esperando confirmación del banco…",
    fr: "En attente de confirmation de la banque…",
  },
  stripeWaitingBankSub: {
    pt: "Não feche nem saia desta página até o pedido aparecer confirmado.",
    en: "Do not close or leave this page until your order is confirmed.",
    es: "No cierres ni salgas de esta página hasta que el pedido quede confirmado.",
    fr: "Ne fermez pas cette page avant la confirmation de la commande.",
  },
  stripePayLabel: { pt: "Pagar", en: "Pay", es: "Pagar", fr: "Payer" },
  stripeConfirmBizumPhone: {
    pt: "Confirme o número Bizum",
    en: "Confirm your Bizum number",
    es: "Confirma el número de Bizum",
    fr: "Confirmez le numéro Bizum",
  },
  stripeConfirmCard: {
    pt: "Confirme os dados do cartão",
    en: "Confirm your card details",
    es: "Confirma los datos de la tarjeta",
    fr: "Confirmez les données de la carte",
  },
  stripePaymentDeclined: {
    pt: "Pagamento recusado",
    en: "Payment declined",
    es: "Pago rechazado",
    fr: "Paiement refusé",
  },
  stripePaymentPending: {
    pt: "Pagamento ainda não confirmado. Tente novamente em alguns segundos.",
    en: "Payment not confirmed yet. Try again in a few seconds.",
    es: "El pago aún no está confirmado. Inténtalo de nuevo en unos segundos.",
    fr: "Paiement pas encore confirmé. Réessayez dans quelques secondes.",
  },
  stripePreparingPayment: {
    pt: "A abrir pagamento seguro…",
    en: "Opening secure payment…",
    es: "Abriendo pago seguro…",
    fr: "Ouverture du paiement sécurisé…",
  },
  stripePreparingPaymentSub: {
    pt: "Só um momento — estamos a ligar ao banco.",
    en: "One moment — connecting to the bank.",
    es: "Un momento — conectando con el banco.",
    fr: "Un instant — connexion à la banque.",
  },
  stripeRecoveringPayment: {
    pt: "A confirmar o seu pagamento…",
    en: "Confirming your payment…",
    es: "Confirmando tu pago…",
    fr: "Confirmation de votre paiement…",
  },
  stripeRecoveringPaymentSub: {
    pt: "O banco já recebeu o pagamento. Aguarde — não volte ao carrinho nem pague outra vez.",
    en: "The bank already received the payment. Wait — do not return to the cart or pay again.",
    es: "El banco ya recibió el pago. Espera — no vuelvas al carrito ni pagues otra vez.",
    fr: "La banque a déjà reçu le paiement. Attendez — ne retournez pas au panier.",
  },
  stripeBizumMismatchTitle: {
    pt: "Bizum ainda não está activo no servidor de pagamentos.",
    en: "Bizum is not active on the payment server yet.",
    es: "Bizum aún no está activo en el servidor de pagos.",
    fr: "Bizum n'est pas encore actif sur le serveur de paiement.",
  },
  stripeBizumMismatchBody: {
    pt: "O sistema abriu o cartão por engano. Volte e escolha Tarjeta, ou peça ao restaurante para publicar a última actualização.",
    en: "The system opened card by mistake. Go back and choose Card, or ask the restaurant to publish the latest update.",
    es: "El sistema abrió la tarjeta por error. Vuelve y elige Tarjeta, o pide al restaurante que publique la última actualización.",
    fr: "Le système a ouvert la carte par erreur. Revenez en arrière et choisissez Carte.",
  },
  stripeBizumMismatchBack: {
    pt: "Voltar e escolher outro método",
    en: "Back and choose another method",
    es: "Volver y elegir otro método",
    fr: "Retour et autre méthode",
  },
  stripeOnlineUnavailable: {
    pt: "Pagamento online ainda não está disponível neste site. Peça ao restaurante para activar os recebimentos.",
    en: "Online payment is not available on this site yet. Ask the restaurant to enable payments.",
    es: "El pago online aún no está disponible en este sitio. Pide al restaurante que active los cobros.",
    fr: "Le paiement en ligne n'est pas encore disponible. Demandez au restaurant d'activer les paiements.",
  },
  stripePaymentCanceled: {
    pt: "Pagamento cancelado ou recusado pelo banco",
    en: "Payment canceled or declined by the bank",
    es: "Pago cancelado o rechazado por el banco",
    fr: "Paiement annulé ou refusé par la banque",
  },
  stripeOrderConfirmFailed: {
    pt: "Não foi possível confirmar o pedido",
    en: "Could not confirm the order",
    es: "No se pudo confirmar el pedido",
    fr: "Impossible de confirmer la commande",
  },
  stripeRecoverFailed: {
    pt: "Não foi possível recuperar o pagamento",
    en: "Could not recover the payment",
    es: "No se pudo recuperar el pago",
    fr: "Impossible de récupérer le paiement",
  },
  // Confirmation
  confirmedEyebrow: { pt: "Confirmado", en: "Confirmed", es: "Confirmado", fr: "Confirmé" },
  orderReceived: { pt: "Pedido recebido!", en: "Order received!", es: "¡Pedido recibido!", fr: "Commande reçue !" },
  preparingOrder: { pt: "Estamos preparando seu pedido", en: "We are preparing your order", es: "Estamos preparando tu pedido", fr: "Nous préparons votre commande" },
  yourNumber: { pt: "Seu número", en: "Your number", es: "Tu número", fr: "Votre numéro" },
  showAtPickup: { pt: "Mostre este número ao retirar", en: "Show this number when picking up", es: "Muestra este número al recoger tu pedido", fr: "Montrez ce numéro au retrait" },
  customerLabel: { pt: "Cliente", en: "Customer", es: "Cliente", fr: "Client" },
  phoneLabel: { pt: "Telefone", en: "Phone", es: "Teléfono", fr: "Téléphone" },
  tableLabel: { pt: "Mesa", en: "Table", es: "Mesa", fr: "Table" },
  scanQrHint: {
    pt: "Para pedir na mesa, escaneie o QR code da sua mesa.",
    en: "To order at your table, scan the QR code on your table.",
    es: "Para pedir en la mesa, escanea el código QR de tu mesa.",
    fr: "Pour commander à table, scannez le QR code de votre table.",
  },
  mesaDialogTitle: {
    pt: "Pedir na mesa",
    en: "Order at your table",
    es: "Pedir en la mesa",
    fr: "Commander à table",
  },
  mesaScanInstruction: {
    pt: "Abra a câmara do telemóvel e leia o QR code que está na sua mesa.",
    en: "Open your phone camera and scan the QR code on your table.",
    es: "Abre la cámara del móvil y lee el código QR de tu mesa.",
    fr: "Ouvrez l'appareil photo et scannez le QR code de votre table.",
  },
  mesaScanCameraHint: {
    pt: "Aponte a câmara para o código na mesa — o pedido abre automaticamente.",
    en: "Point your camera at the code on the table — your order opens automatically.",
    es: "Apunta la cámara al código de la mesa — el pedido se abre solo.",
    fr: "Pointez la caméra vers le code sur la table — la commande s'ouvre automatiquement.",
  },
  mesaOrManual: {
    pt: "ou",
    en: "or",
    es: "o",
    fr: "ou",
  },
  mesaManualContinue: {
    pt: "Continuar com esta mesa",
    en: "Continue with this table",
    es: "Continuar con esta mesa",
    fr: "Continuer avec cette table",
  },
  mesaManualRequired: {
    pt: "Introduza o número da mesa.",
    en: "Enter your table number.",
    es: "Introduce el número de mesa.",
    fr: "Saisissez le numéro de table.",
  },
  mesaManualNotFound: {
    pt: "Mesa não encontrada. Verifique o número ou leia o QR code.",
    en: "Table not found. Check the number or scan the QR code.",
    es: "Mesa no encontrada. Comprueba el número o lee el QR.",
    fr: "Table introuvable. Vérifiez le numéro ou scannez le QR.",
  },
  mesaManualHint: {
    pt: "Número da mesa indicado manualmente",
    en: "Table number entered manually",
    es: "Número de mesa indicado manualmente",
    fr: "Numéro de table saisi manuellement",
  },
  mesaQrScanLabel: {
    pt: "Ler QR da mesa",
    en: "Scan table QR",
    es: "Leer QR de la mesa",
    fr: "Scanner le QR de la table",
  },
  mesaQrStarting: {
    pt: "A abrir a câmara…",
    en: "Opening camera…",
    es: "Abriendo la cámara…",
    fr: "Ouverture de la caméra…",
  },
  mesaQrScanning: {
    pt: "Aponte para o código na mesa",
    en: "Point at the code on your table",
    es: "Apunta al código de la mesa",
    fr: "Pointez vers le code sur la table",
  },
  mesaQrValidating: {
    pt: "A confirmar a mesa…",
    en: "Confirming table…",
    es: "Confirmando la mesa…",
    fr: "Confirmation de la table…",
  },
  mesaQrInvalid: {
    pt: "QR inválido. Use o código da mesa do restaurante.",
    en: "Invalid QR. Use the restaurant table code.",
    es: "QR no válido. Usa el código de la mesa del restaurante.",
    fr: "QR invalide. Utilisez le code de table du restaurant.",
  },
  mesaQrCameraDenied: {
    pt: "Permita o acesso à câmara nas definições do telemóvel, ou escreva o número da mesa abaixo.",
    en: "Allow camera access in your phone settings, or enter the table number below.",
    es: "Permite el acceso a la cámara en los ajustes del móvil, o escribe el número de mesa abajo.",
    fr: "Autorisez la caméra dans les réglages du téléphone, ou saisissez le numéro ci-dessous.",
  },
  mesaQrUnsupported: {
    pt: "Câmara indisponível neste dispositivo. Escreva o número da mesa abaixo.",
    en: "Camera unavailable on this device. Enter the table number below.",
    es: "Cámara no disponible en este dispositivo. Escribe el número de mesa abajo.",
    fr: "Caméra indisponible sur cet appareil. Saisissez le numéro de table ci-dessous.",
  },
  mesaQrValidated: {
    pt: "Mesa validada por QR code",
    en: "Table confirmed via QR code",
    es: "Mesa validada por código QR",
    fr: "Table confirmée par QR code",
  },
  poweredBy: {
    pt: "Desenvolvido por Euro Business Group",
    en: "Powered by Euro Business Group",
    es: "Desarrollado por Euro Business Group",
    fr: "Propulsé par Euro Business Group",
  },
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
  /** Totem language config loaded (avoids flashing a single flag before fetch completes) */
  langsReady: boolean;
  /** URL de ícone (bandeira) por idioma */
  langIcons: Partial<Record<Lang, string>>;
  /** Pré-carrega traduções automáticas de nomes/descrições do cardápio */
  preloadMenuTranslations: (items: (Record<string, string> | string | null | undefined)[]) => void;
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
  const [langsReady, setLangsReady] = useState(false);
  const [langIcons, setLangIcons] = useState<Partial<Record<Lang, string>>>({});
  const [lang, setLangState] = useState<Lang>(() => getEmbedLang() ?? loadSavedLang() ?? "es");
  const [translationTick, setTranslationTick] = useState(0);
  const pendingTexts = useRef(new Set<string>());
  const flushTimer = useRef<number | null>(null);

  const setLang = (next: Lang) => {
    setLangState(next);
    saveSavedLang(next);
  };

  useEffect(() => {
    const fromUrl = getEmbedLang() ?? readLangFromUrl();
    if (fromUrl) setLang(fromUrl);
  }, []);

  useEffect(() => {
    if (!storeId) {
      setLangsReady(false);
      return;
    }
    let alive = true;
    setLangsReady(false);
    (async () => {
      try {
        const { data } = await supabase
          .from("totem_config")
          .select("primary_language, active_languages, language_icons")
          .eq("store_id", storeId)
          .maybeSingle();
        if (!alive) return;
        if (data) {
          const valid: Lang[] = ["pt", "en", "es", "fr"];
          const primary = (valid.includes((data.primary_language as Lang)) ? data.primary_language : "es") as Lang;
          const actives = ((data.active_languages || []) as string[])
            .filter((l): l is Lang => valid.includes(l as Lang));
          setPrimaryLang(primary);
          setActiveLangs(actives.length ? actives : [primary]);
          setLangIcons((data.language_icons as Partial<Record<Lang, string>>) || {});
          const fromEmbed = isEmbedded() ? getEmbedLang() : null;
          const fromQr = readLangFromUrl();
          const remembered = loadSavedLang();
          setLang(fromEmbed ?? fromQr ?? remembered ?? primary);
        }
      } finally {
        if (alive) setLangsReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [storeId]);

  const flushTranslations = useCallback(async (from: AppLang, to: AppLang) => {
    const batch = [...pendingTexts.current];
    pendingTexts.current.clear();
    flushTimer.current = null;
    if (!batch.length || from === to) return;
    await translateMenuTexts(batch, from, to);
    setTranslationTick((n) => n + 1);
  }, []);

  const scheduleTranslation = useCallback(
    (text: string, from: AppLang, to: AppLang) => {
      const trimmed = text.trim();
      if (!trimmed || from === to) return;
      if (getCachedMenuTranslation(trimmed, from, to)) return;
      pendingTexts.current.add(trimmed);
      if (flushTimer.current != null) window.clearTimeout(flushTimer.current);
      flushTimer.current = window.setTimeout(() => void flushTranslations(from, to), 40);
    },
    [flushTranslations],
  );

  useEffect(() => {
    if (lang === primaryLang) return;
    if (flushTimer.current != null) {
      window.clearTimeout(flushTimer.current);
      flushTimer.current = null;
    }
    if (pendingTexts.current.size > 0) {
      void flushTranslations(primaryLang, lang);
    }
  }, [lang, primaryLang, flushTranslations]);

  const t = (key: string) => translations[key]?.[lang] || translations[key]?.en || key;

  const tProduct = useCallback(
    (obj: Record<string, string> | string | null | undefined) => {
      void translationTick;
      if (typeof obj === "string") {
        const trimmed = obj.trim();
        if (!trimmed) return "";
        if (lang === primaryLang) return trimmed;
        const cached = getCachedMenuTranslation(trimmed, primaryLang, lang);
        if (cached) return cached;
        scheduleTranslation(trimmed, primaryLang, lang);
        return trimmed;
      }

      const record = readLocalized(obj);
      const inUserLang = record[lang]?.trim();
      if (inUserLang) return inUserLang;

      const source = pickSourceText(obj, primaryLang);
      if (!source) return "";
      if (lang === primaryLang) return source;

      const cached = getCachedMenuTranslation(source, primaryLang, lang);
      if (cached) return cached;
      scheduleTranslation(source, primaryLang, lang);
      return source;
    },
    [lang, primaryLang, translationTick, scheduleTranslation],
  );

  const preloadMenuTranslations = useCallback(
    (items: (Record<string, string> | string | null | undefined)[]) => {
      if (lang === primaryLang) return;
      for (const item of items) {
        const record = readLocalized(item);
        if (record[lang]?.trim()) continue;
        const source = pickSourceText(item, primaryLang);
        if (!source || getCachedMenuTranslation(source, primaryLang, lang)) continue;
        pendingTexts.current.add(source);
      }
      if (pendingTexts.current.size === 0) return;
      if (flushTimer.current != null) window.clearTimeout(flushTimer.current);
      flushTimer.current = window.setTimeout(() => void flushTranslations(primaryLang, lang), 0);
    },
    [lang, primaryLang, flushTranslations],
  );

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <LanguageContext.Provider
      value={{ lang, setLang, t, tProduct, primaryLang, activeLangs, langsReady, langIcons, preloadMenuTranslations }}
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
