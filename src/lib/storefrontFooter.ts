/** Rodapé das páginas iniciais, margem extra no preview desktop (moldura arredondada). */
export const STOREFRONT_FOOTER_PAD_CLASS =
  "pb-[max(1.25rem,env(safe-area-inset-bottom))] [@media(hover:hover)_and_(pointer:fine)]:pb-10";

export const STOREFRONT_FOOTER_WRAP_CLASS = `shrink-0 px-4 pt-2 [@media(hover:hover)_and_(pointer:fine)]:px-6 ${STOREFRONT_FOOTER_PAD_CLASS}`;

/** Para rodapés com position absolute (ex.: splash). */
export const STOREFRONT_FOOTER_BOTTOM_STYLE = {
  bottom: "max(1.25rem, env(safe-area-inset-bottom))",
} as const;

export const STOREFRONT_FOOTER_BOTTOM_CLASS =
  "[@media(hover:hover)_and_(pointer:fine)]:!bottom-10";

/** Rodapé fixo com Continuar / Adicionar / Pagar — margem para o indicador do iPhone. */
export const CUSTOMER_ACTION_FOOTER_PAD_CLASS =
  "pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]";

export const CUSTOMER_TAB_BAR_SAFE_AREA_CLASS = "";

export const CUSTOMER_ACTION_FOOTER_CLASS = `shrink-0 z-20 border-t border-border/60 bg-card px-4 pt-3 backdrop-blur-md shadow-[0_-4px_20px_-16px_rgba(0,0,0,0.12)] ${CUSTOMER_ACTION_FOOTER_PAD_CLASS}`;
