-- Backend recalculation hardening:
-- 1) Compute canonical unit_price from product + modifiers/extras stored in order_items.
-- 2) Trigger: overwrite unit_price/total_price and recompute orders subtotal/total.
-- This prevents frontend from setting final price/total/discount values.

CREATE OR REPLACE FUNCTION public.compute_order_item_unit_price(
  _store_id uuid,
  _product_id uuid,
  _size_name text,
  _selections jsonb,
  _extras jsonb
) RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base numeric := 0;
  v_size_add numeric := 0;
  v_selections_total numeric := 0;
  v_extras_total numeric := 0;

  v_solo_units int := 0;
  v_allows_solo boolean := false;

  v_name jsonb;
  v_desc jsonb;

  v_required_global uuid[] := ARRAY[]::uuid[];
  v_required_unit uuid[] := ARRAY[]::uuid[];

  v_unit_indices int[] := ARRAY[]::int[];
  v_unit_idx int;

  v_selected_ids uuid[] := ARRAY[]::uuid[];

  -- Legacy extras loop helpers
  v_extra jsonb;
  v_qty numeric;
  v_extra_price numeric;
  v_extra_id uuid;
  v_extra_name text;
BEGIN
  -- Base product price
  SELECT p.price
    INTO v_base
  FROM public.products p
  WHERE p.id = _product_id
    AND p.store_id = _store_id
  LIMIT 1;

  IF v_base IS NULL THEN
    RAISE EXCEPTION 'Produto inválido';
  END IF;

  -- Size add (legacy support)
  IF NULLIF(trim(_size_name), '') IS NOT NULL THEN
    SELECT COALESCE(ps.price_add, 0)
      INTO v_size_add
    FROM public.product_sizes ps
    WHERE ps.product_id = _product_id
      AND (
        lower(trim(ps.name->>'es')) = lower(trim(_size_name))
        OR lower(trim(ps.name->>'pt')) = lower(trim(_size_name))
        OR lower(trim(ps.name->>'en')) = lower(trim(_size_name))
        OR lower(trim(ps.name->>'fr')) = lower(trim(_size_name))
      )
    LIMIT 1;
  END IF;

  -- Solo carne rule (structured modifiers)
  -- It is computed only when we have selections; for legacy orders we keep 0 (selectors-based pricing is used by the UI).
  IF jsonb_typeof(_selections) = 'array' AND jsonb_array_length(_selections) > 0 THEN
    SELECT p.name, p.description
      INTO v_name, v_desc
    FROM public.products p
    WHERE p.id = _product_id
      AND p.store_id = _store_id
    LIMIT 1;

    v_allows_solo :=
      lower(concat_ws(' ',
        COALESCE(v_name->>'es',''),
        COALESCE(v_name->>'pt',''),
        COALESCE(v_name->>'en',''),
        COALESCE(v_name->>'fr',''),
        COALESCE(v_desc->>'es',''),
        COALESCE(v_desc->>'pt',''),
        COALESCE(v_desc->>'en',''),
        COALESCE(v_desc->>'fr','')
      )) ~* '(?:\bpita\b|\brollo\b|\bdurum\b|\bd[oö]ner\b|\bshawarma\b|\bkebab\b)';

    IF v_allows_solo THEN
      -- Required removal option ids for each repeat_per_unit tier
      SELECT COALESCE(array_agg(mo.id), ARRAY[]::uuid[])
        INTO v_required_global
      FROM public.product_modifier_groups pmg
      JOIN public.modifier_groups mg ON mg.id = pmg.group_id
      JOIN public.modifier_options mo ON mo.group_id = mg.id
      WHERE pmg.product_id = _product_id
        AND pmg.repeat_per_unit = false
        AND mg.group_kind = 'removal'
        AND mg.store_id = _store_id
        AND mg.is_active = true
        AND mo.is_active = true;

      SELECT COALESCE(array_agg(mo.id), ARRAY[]::uuid[])
        INTO v_required_unit
      FROM public.product_modifier_groups pmg
      JOIN public.modifier_groups mg ON mg.id = pmg.group_id
      JOIN public.modifier_options mo ON mo.group_id = mg.id
      WHERE pmg.product_id = _product_id
        AND pmg.repeat_per_unit = true
        AND mg.group_kind = 'removal'
        AND mg.store_id = _store_id
        AND mg.is_active = true
        AND mo.is_active = true;

      -- Detect combo units by presence of non-null unitIndex in selections
      SELECT COALESCE(array_agg(DISTINCT (s->>'unitIndex')::int), ARRAY[]::int[])
        INTO v_unit_indices
      FROM jsonb_array_elements(_selections) s
      WHERE s->>'groupKind' = 'removal'
        AND NULLIF(trim(s->>'unitIndex'), '') IS NOT NULL;

      IF array_length(v_unit_indices, 1) IS NOT NULL AND array_length(v_unit_indices, 1) > 0 THEN
        -- Combo: count each unitIndex that satisfies all required unit removal options
        IF array_length(v_required_unit, 1) IS NOT NULL AND array_length(v_required_unit, 1) > 0 THEN
          FOREACH v_unit_idx IN ARRAY v_unit_indices LOOP
            SELECT COALESCE(array_agg(DISTINCT (s->>'optionId')::uuid), ARRAY[]::uuid[])
              INTO v_selected_ids
            FROM jsonb_array_elements(_selections) s
            WHERE s->>'groupKind' = 'removal'
              AND NULLIF(trim(s->>'unitIndex'), '') IS NOT NULL
              AND (s->>'unitIndex')::int = v_unit_idx
              AND (s->>'optionId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

            -- Must contain all required option ids
            IF NOT EXISTS (
              SELECT 1 FROM unnest(v_required_unit) req_id(opt_id)
              WHERE NOT (req_id.opt_id = ANY(v_selected_ids))
            ) THEN
              v_solo_units := v_solo_units + 1;
            END IF;
          END LOOP;
        END IF;
      ELSE
        -- Non-combo: count 1 if all required global removal options are selected
        SELECT COALESCE(array_agg(DISTINCT (s->>'optionId')::uuid), ARRAY[]::uuid[])
          INTO v_selected_ids
        FROM jsonb_array_elements(_selections) s
        WHERE s->>'groupKind' = 'removal'
          AND (NULLIF(trim(s->>'unitIndex'), '') IS NULL)
          AND (s->>'optionId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

        IF array_length(v_required_global, 1) IS NOT NULL AND array_length(v_required_global, 1) > 0 THEN
          IF NOT EXISTS (
            SELECT 1 FROM unnest(v_required_global) req_id(opt_id)
            WHERE NOT (req_id.opt_id = ANY(v_selected_ids))
          ) THEN
            v_solo_units := 1;
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;

  -- Selections-based pricing (structured modifiers)
  IF jsonb_typeof(_selections) = 'array' AND jsonb_array_length(_selections) > 0 THEN
    WITH sel_ok AS (
      SELECT s
      FROM jsonb_array_elements(_selections) s
      WHERE (s->>'optionId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    )
    SELECT COALESCE(SUM(mo.price_delta * COALESCE((sel_ok.s->>'quantity')::numeric, 1)), 0)
      INTO v_selections_total
    FROM sel_ok
    JOIN public.modifier_options mo
      ON mo.id = (sel_ok.s->>'optionId')::uuid
    JOIN public.modifier_groups mg
      ON mg.id = mo.group_id
    JOIN public.product_modifier_groups pmg
      ON pmg.group_id = mg.id
     AND pmg.product_id = _product_id
    WHERE mg.store_id = _store_id
      AND mg.is_active = true
      AND mo.is_active = true;
  END IF;

  -- Extras-based pricing (legacy)
  IF (jsonb_typeof(_selections) IS NULL OR jsonb_array_length(_selections) = 0)
     AND jsonb_typeof(_extras) = 'array'
     AND jsonb_array_length(_extras) > 0 THEN
    FOR v_extra IN SELECT * FROM jsonb_array_elements(_extras) LOOP
      v_qty := COALESCE((v_extra->>'quantity')::numeric, 1);
      v_extra_price := NULL;
      v_extra_id := NULL;
      v_extra_name := NULL;

      IF v_extra ? 'id' AND NULLIF(trim(v_extra->>'id'), '') IS NOT NULL
         AND (v_extra->>'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        v_extra_id := (v_extra->>'id')::uuid;
        SELECT pe.price
          INTO v_extra_price
        FROM public.product_extras pe
        WHERE pe.id = v_extra_id
          AND pe.product_id = _product_id;
      END IF;

      IF v_extra_price IS NULL AND (v_extra ? 'name') THEN
        v_extra_name := trim(v_extra->>'name');
        SELECT pe.price
          INTO v_extra_price
        FROM public.product_extras pe
        WHERE pe.product_id = _product_id
          AND (
            lower(trim(pe.name->>'es')) = lower(v_extra_name)
            OR lower(trim(pe.name->>'pt')) = lower(v_extra_name)
            OR lower(trim(pe.name->>'en')) = lower(v_extra_name)
            OR lower(trim(pe.name->>'fr')) = lower(v_extra_name)
          )
        LIMIT 1;
      END IF;

      IF v_extra_price IS NULL THEN
        RAISE EXCEPTION 'Extra inválido';
      END IF;

      v_extras_total := v_extras_total + (v_extra_price * v_qty);
    END LOOP;
  END IF;

  RETURN ROUND(v_base + v_size_add + v_selections_total + v_extras_total + (v_solo_units * 1.0), 2);
END;
$$;

-- Trigger: overwrite order_items unit_price/total_price using canonical backend computation.
CREATE OR REPLACE FUNCTION public.trg_order_items_recalc_unit_prices()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store_id uuid;
  v_unit numeric;
BEGIN
  SELECT o.store_id INTO v_store_id
  FROM public.orders o
  WHERE o.id = NEW.order_id
  LIMIT 1;

  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'Pedido inválido';
  END IF;

  v_unit := public.compute_order_item_unit_price(
    v_store_id,
    NEW.product_id,
    NEW.size_name,
    COALESCE(NEW.selections, '[]'::jsonb),
    COALESCE(NEW.extras, '[]'::jsonb)
  );

  NEW.unit_price := v_unit;
  NEW.total_price := ROUND(COALESCE(NEW.quantity, 1) * v_unit, 2);

  RETURN NEW;
END;
$$;

-- Trigger: after inserting/updating items, recompute orders subtotal/total using order_items + existing delivery/discount fields.
CREATE OR REPLACE FUNCTION public.trg_orders_recalc_totals_from_items()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
  v_subtotal numeric := 0;
  v_delivery numeric := 0;
  v_discount numeric := 0;
  v_total numeric;
BEGIN
  v_order_id := COALESCE(NEW.order_id, OLD.order_id);

  SELECT
    COALESCE(SUM(oi.total_price), 0),
    COALESCE(o.delivery_fee, 0),
    COALESCE(o.discount_amount, 0)
  INTO v_subtotal, v_delivery, v_discount
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE oi.order_id = v_order_id
  GROUP BY o.id, o.delivery_fee, o.discount_amount;

  v_total := ROUND(GREATEST(0, v_subtotal + v_delivery - v_discount), 2);

  UPDATE public.orders
  SET subtotal = ROUND(v_subtotal, 2),
      total = v_total,
      updated_at = now()
  WHERE id = v_order_id;

  RETURN NULL;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_order_items_recalc_unit_prices'
  ) THEN
    CREATE TRIGGER trg_order_items_recalc_unit_prices
    BEFORE INSERT OR UPDATE OF product_id, size_name, selections, extras, quantity
    ON public.order_items
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_order_items_recalc_unit_prices();
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_orders_recalc_totals_from_items'
  ) THEN
    CREATE TRIGGER trg_orders_recalc_totals_from_items
    AFTER INSERT OR UPDATE OR DELETE
    ON public.order_items
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_orders_recalc_totals_from_items();
  END IF;
END;
$$;

