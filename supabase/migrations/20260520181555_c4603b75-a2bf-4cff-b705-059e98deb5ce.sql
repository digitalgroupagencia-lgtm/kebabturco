
-- Edit mode + template
ALTER TABLE public.tenants 
  ADD COLUMN IF NOT EXISTS is_template BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS editing_locked_by UUID DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS editing_locked_at TIMESTAMPTZ DEFAULT NULL;

-- Price modifiers (regras Kebab: +0.50 sem alface, +1 carne extra, etc)
ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS price_modifiers JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Screen config (editor visual de telas)
ALTER TABLE public.totem_config 
  ADD COLUMN IF NOT EXISTS screen_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS splash_logo_size INTEGER NOT NULL DEFAULT 160;

-- Função para checar se tenant está bloqueado por outro admin
CREATE OR REPLACE FUNCTION public.acquire_tenant_edit_lock(_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_lock UUID;
  v_lock_age INTERVAL;
BEGIN
  IF NOT (has_role(auth.uid(), 'admin_master'::app_role) OR 
          (has_role(auth.uid(), 'restaurant_admin'::app_role) AND get_user_tenant_id(auth.uid()) = _tenant_id)) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT editing_locked_by, (now() - editing_locked_at) 
  INTO v_current_lock, v_lock_age
  FROM tenants WHERE id = _tenant_id;

  -- Lock expira em 30min de inatividade
  IF v_current_lock IS NOT NULL AND v_current_lock != auth.uid() AND v_lock_age < INTERVAL '30 minutes' THEN
    RETURN jsonb_build_object('success', false, 'locked_by', v_current_lock, 'message', 'Outro admin está editando este projeto');
  END IF;

  UPDATE tenants 
  SET editing_locked_by = auth.uid(), editing_locked_at = now()
  WHERE id = _tenant_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.release_tenant_edit_lock(_tenant_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE tenants 
  SET editing_locked_by = NULL, editing_locked_at = NULL
  WHERE id = _tenant_id AND editing_locked_by = auth.uid();
$$;

-- Criar tenant TEMPLATE invisível (base para novos clientes)
INSERT INTO tenants (id, name, slug, plan, is_active, is_template, use_master_domain)
VALUES ('11111111-1111-1111-1111-111111111111', '__TEMPLATE__', '__template__', 'free', false, true, false)
ON CONFLICT (id) DO UPDATE SET is_template = true, is_active = false;

INSERT INTO stores (id, tenant_id, name, address, is_active, sort_order)
VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Loja Padrão', 'Endereço', false, 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO totem_config (store_id, primary_language, active_languages, enable_dine_in, enable_takeaway, enable_delivery, splash_title, splash_subtitle)
VALUES ('22222222-2222-2222-2222-222222222222', 'pt', ARRAY['pt','en','es','fr']::text[], true, true, false, 
  '{"pt":"Bem-vindo","en":"Welcome","es":"Bienvenido","fr":"Bienvenue"}'::jsonb,
  '{"pt":"Toque para começar","en":"Tap to start","es":"Toca para empezar","fr":"Touchez pour commencer"}'::jsonb)
ON CONFLICT DO NOTHING;
