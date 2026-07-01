-- Oculta bebidas genéricas «Refresco Botella/Lata» — o cardápio usa só marcas reais (Coca-Cola 2L, etc.).
UPDATE public.products
SET
  is_active = false,
  updated_at = now()
WHERE is_active = true
  AND (
    COALESCE(name->>'es', '') ~* '^refresco\s+(botella|lata)\b'
    OR COALESCE(name->>'pt', '') ~* '^refresco\s+(botella|lata)\b'
    OR (
      COALESCE(name->>'es', name->>'pt', '') ~* '^refresco\b'
      AND COALESCE(name->>'es', name->>'pt', '') ~* '(botella|lata|2\s*l|33\s*cl|1[\.,]25)'
      AND COALESCE(name->>'es', name->>'pt', '') !~* '(coca|fanta|sprite|nestea|aquarius|pepsi|7up|monster)'
    )
    OR COALESCE(name->>'es', '') ~* '^bebida\s+(a\s+elegir|inclu)'
    OR COALESCE(name->>'pt', '') ~* '^bebida\s+(a\s+escolher|inclu)'
  );
