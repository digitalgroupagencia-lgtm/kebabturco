-- =====================================================================
-- Correr no SQL Editor do KEBAB TURCO (projeto oficial Lovable).
-- Repõe o banner promocional no topo do menu do cliente.
-- =====================================================================

-- 1) Ver estado actual (opcional — lê o resultado antes de continuar)
SELECT
  (SELECT banner_enabled FROM public.operations_settings
   WHERE store_id = '22222222-2222-2222-2222-222222222222') AS banner_ligado,
  (SELECT COUNT(*) FROM public.promo_banners
   WHERE store_id = '22222222-2222-2222-2222-222222222222' AND is_active = true) AS banners_activos;

-- 2) Ligar o banner nas definições do restaurante
UPDATE public.operations_settings
SET banner_enabled = true,
    banner_interval_ms = COALESCE(banner_interval_ms, 5000),
    updated_at = now()
WHERE store_id = '22222222-2222-2222-2222-222222222222';

-- Se não existir linha de definições, criar com banner ligado
INSERT INTO public.operations_settings (store_id, banner_enabled, banner_interval_ms)
SELECT '22222222-2222-2222-2222-222222222222', true, 5000
WHERE NOT EXISTS (
  SELECT 1 FROM public.operations_settings
  WHERE store_id = '22222222-2222-2222-2222-222222222222'
);

-- 3) Se os banners foram apagados, voltar a pôr os 2 originais (foto + vídeo)
DO $$
DECLARE
  v_store uuid := '22222222-2222-2222-2222-222222222222';
  v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.promo_banners
  WHERE store_id = v_store AND is_active = true;

  IF v_count = 0 THEN
    DELETE FROM public.promo_banners WHERE store_id = v_store;

    INSERT INTO public.promo_banners (
      store_id, image_url, video_url, media_type, link_url,
      video_autoplay, video_muted, is_active, sort_order
    ) VALUES
    (
      v_store,
      'https://kvpssbhclafoymhecmuk.supabase.co/storage/v1/object/public/branding/22222222-2222-2222-2222-222222222222/banner-1780593724142.png',
      NULL, 'image', NULL, true, true, true, 0
    ),
    (
      v_store,
      NULL,
      'https://kvpssbhclafoymhecmuk.supabase.co/storage/v1/object/public/branding/22222222-2222-2222-2222-222222222222/banner-video-1780598919898.mov',
      'video', NULL, true, true, true, 1
    );
  ELSE
    UPDATE public.promo_banners
    SET is_active = true, updated_at = now()
    WHERE store_id = v_store;
  END IF;
END $$;

-- 4) Confirmar
SELECT
  banner_enabled AS banner_ligado,
  banner_interval_ms AS intervalo_ms
FROM public.operations_settings
WHERE store_id = '22222222-2222-2222-2222-222222222222';

SELECT media_type, is_active, sort_order,
       left(COALESCE(image_url, video_url), 70) AS media
FROM public.promo_banners
WHERE store_id = '22222222-2222-2222-2222-222222222222'
ORDER BY sort_order;
