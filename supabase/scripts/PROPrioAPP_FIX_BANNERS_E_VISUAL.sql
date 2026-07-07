-- Correr no SQL Editor do projeto PROPrioAPP (Lovable Cloud).
-- Corrige banner do topo, imagens de identidade e ícones de tipo de pedido.
-- Não mexe no projeto Kebab Turco oficial.

DO $$
DECLARE
  v_store_id uuid := '22222222-2222-2222-2222-222222222222';
  v_logo_main text := '/__l5e/assets-v1/10b1bdeb-3cf6-4d7f-afda-915c70ecf38b/white-label-logo_main.png';
  v_logo_language text := '/__l5e/assets-v1/833719f0-07b7-460a-a78b-b19ef7e7aae9/white-label-logo_language.png';
  v_banner_home text := '/__l5e/assets-v1/ae7c7737-28bb-41cd-8abb-05fcf6c85b1f/white-label-banner_home.png';
  v_icon_dine_in text := '/__l5e/assets-v1/f4156c88-f205-4149-970d-b8278cf4539e/white-label-icon_dine_in.png';
  v_icon_takeaway text := '/__l5e/assets-v1/aaaae7ff-394a-461e-9146-0cd1e98f4ef1/white-label-icon_takeaway.png';
  v_icon_delivery text := '/__l5e/assets-v1/79cf0a13-c837-4e45-835f-507d09a2f708/white-label-icon_delivery.png';
BEGIN
  UPDATE public.company_settings
  SET
    logo_main_url = v_logo_main,
    logo_language_url = v_logo_language,
    logo_order_type_url = v_logo_language,
    banner_home_url = v_banner_home,
    icon_dine_in_url = v_icon_dine_in,
    icon_takeaway_url = v_icon_takeaway,
    icon_delivery_url = v_icon_delivery,
    updated_at = now()
  WHERE store_id = v_store_id;

  UPDATE public.totem_config
  SET
    logo_url = v_logo_main,
    splash_logo_url = v_logo_language,
    splash_logo_dark_url = v_logo_language,
    updated_at = now()
  WHERE store_id = v_store_id;

  UPDATE public.stores
  SET image_url = v_logo_main, updated_at = now()
  WHERE id = v_store_id;

  DELETE FROM public.promo_banners WHERE store_id = v_store_id;
  INSERT INTO public.promo_banners (store_id, image_url, sort_order, is_active, media_type)
  VALUES
    (v_store_id, v_banner_home, 1, true, 'image'),
    (v_store_id, v_banner_home, 2, true, 'image'),
    (v_store_id, v_banner_home, 3, true, 'image');

  DELETE FROM public.splash_media WHERE store_id = v_store_id;
  INSERT INTO public.splash_media (store_id, media_type, url, duration_ms, sort_order, is_active)
  VALUES (v_store_id, 'image', v_banner_home, 4000, 1, true);
END $$;

SELECT 'banners' AS item, COUNT(*) AS total
FROM public.promo_banners
WHERE store_id = '22222222-2222-2222-2222-222222222222';
