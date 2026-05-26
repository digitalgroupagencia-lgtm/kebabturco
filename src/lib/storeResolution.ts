export type StoreOption = {
  id: string;
  name: string;
  address: string | null;
  image_url: string | null;
  short_description: string | null;
};

export const KEBAB_FALLBACK_STORE_ID = "22222222-2222-2222-2222-222222222222";

export function isGenericFallbackStores(stores: StoreOption[]): boolean {
  return (
    stores.length === 1 &&
    stores[0].id === KEBAB_FALLBACK_STORE_ID &&
    stores[0].name === "Kebab Turco" &&
    !stores[0].image_url &&
    !stores[0].address &&
    !stores[0].short_description
  );
}

export function mergeStoreOption(prev: StoreOption, next: StoreOption): StoreOption {
  return {
    id: next.id,
    name: next.name?.trim() ? next.name : prev.name,
    address: next.address ?? prev.address,
    image_url: next.image_url ?? prev.image_url,
    short_description: next.short_description ?? prev.short_description,
  };
}

/** Mantém dados configurados quando uma nova resposta vem incompleta ou genérica. */
export function mergeStoreLists(prev: StoreOption[], next: StoreOption[]): StoreOption[] {
  if (!next.length) return prev;
  if (!prev.length) return next;

  if (isGenericFallbackStores(next) && !isGenericFallbackStores(prev)) {
    return prev;
  }

  const prevById = new Map(prev.map((s) => [s.id, s]));
  const merged = next.map((nextStore) => {
    const prevStore = prevById.get(nextStore.id);
    return prevStore ? mergeStoreOption(prevStore, nextStore) : nextStore;
  });

  const prevImages = prev.filter((s) => s.image_url).length;
  const mergedImages = merged.filter((s) => s.image_url).length;
  if (prevImages > mergedImages && prev.length === merged.length) {
    return merged.map((store) => {
      const prevStore = prevById.get(store.id);
      return prevStore ? mergeStoreOption(prevStore, store) : store;
    });
  }

  return merged;
}

export function preferResolvedStores(prev: StoreOption[], next: StoreOption[]): StoreOption[] {
  if (!prev.length) return next;
  if (!next.length) return prev;
  return mergeStoreLists(prev, next);
}
