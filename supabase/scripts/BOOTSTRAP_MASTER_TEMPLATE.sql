-- =====================================================================
-- BOOTSTRAP MASTER TEMPLATE — White Label Restaurant
-- =====================================================================
-- Idempotente. Pode ser rodado várias vezes sem duplicar dados.
-- Cria 1 tenant + 1 loja + catálogo robusto (categorias, produtos,
-- extras, tamanhos), banners, splash, horários, totem, plans e features.
--
-- COMO USAR (em projeto novo após Remix do Master):
--   1. Ativar Lovable Cloud no novo projeto
--   2. Aguardar as migrations rodarem (cria todas as tabelas)
--   3. Abrir SQL Editor e colar este arquivo inteiro
--   4. Executar
--   5. Trocar nome/logo/cores no Admin → Configurações
--
-- NÃO cria: usuários reais, pedidos, clientes, secrets, tokens, financeiro.
-- =====================================================================

DO $bootstrap$
DECLARE
  v_tenant_id uuid := '11111111-1111-1111-1111-111111111111';
  v_store_id  uuid := '22222222-2222-2222-2222-222222222222';
  v_cat_kebabs uuid;
  v_cat_burgers uuid;
  v_cat_pizzas uuid;
  v_cat_salads uuid;
  v_cat_sides uuid;
  v_cat_drinks uuid;
  v_cat_desserts uuid;
  v_cat_combos uuid;
  v_prod_id uuid;
  v_placeholder text := '/product-placeholder.svg';
BEGIN
  -- ===========================================================
  -- 1) TENANT + STORE
  -- ===========================================================
  INSERT INTO public.tenants (id, name, slug, is_active, plan, is_template)
  VALUES (v_tenant_id, 'Template Restaurant', 'template-restaurant', true, 'premium', true)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.stores (id, tenant_id, name, address, phone, is_active, sort_order, short_description)
  VALUES (v_store_id, v_tenant_id, 'Loja Principal', 'Endereço a configurar', '+00 000 000 000', true, 0,
          'Loja template — substitua nome, logo e cores no Admin')
  ON CONFLICT (id) DO NOTHING;

  -- ===========================================================
  -- 2) COMPANY SETTINGS (branding inicial neutro)
  -- ===========================================================
  INSERT INTO public.company_settings (
    store_id, company_name, short_name,
    primary_color, secondary_color, accent_color, cta_color, header_color,
    background_color, text_color, font_family, button_style, is_active,
    meta_description
  ) VALUES (
    v_store_id, 'Template Restaurant', 'Template',
    '#D62300', '#FFC72C', '#FFC72C', '#28A745', '#D62300',
    '#FFFFFF', '#1A1A1A', 'Nunito', 'rounded', true,
    'Peça online — entrega rápida e fácil.'
  ) ON CONFLICT DO NOTHING;

  -- ===========================================================
  -- 3) OPERATIONS SETTINGS (horários, pagamentos)
  -- ===========================================================
  INSERT INTO public.operations_settings (
    store_id, banner_enabled, banner_interval_ms,
    payment_mode, pay_card_enabled, pay_cash_enabled,
    pay_apple_enabled, pay_google_enabled, pay_counter_enabled, pay_link_enabled,
    avg_prep_minutes, require_phone_takeaway,
    pay_cash_dine_in, pay_cash_takeaway, pay_cash_delivery,
    require_prepayment_takeaway, require_prepayment_delivery,
    print_pending_dine_in, apply_schedule_enabled, schedule_timezone,
    weekly_schedule, delivery_schedule,
    msg_paid, msg_counter
  ) VALUES (
    v_store_id, true, 5000,
    'both', true, true,
    true, true, true, true,
    20, true,
    true, true, true,
    false, true,
    true, true, 'Europe/Madrid',
    jsonb_build_object(
      'mon', jsonb_build_object('open','10:00','close','23:00','closed',false),
      'tue', jsonb_build_object('open','10:00','close','23:00','closed',false),
      'wed', jsonb_build_object('open','10:00','close','23:00','closed',false),
      'thu', jsonb_build_object('open','10:00','close','23:00','closed',false),
      'fri', jsonb_build_object('open','10:00','close','00:00','closed',false),
      'sat', jsonb_build_object('open','11:00','close','00:00','closed',false),
      'sun', jsonb_build_object('open','11:00','close','23:00','closed',false)
    ),
    jsonb_build_object(
      'mon', jsonb_build_object('open','11:00','close','22:30','closed',false),
      'tue', jsonb_build_object('open','11:00','close','22:30','closed',false),
      'wed', jsonb_build_object('open','11:00','close','22:30','closed',false),
      'thu', jsonb_build_object('open','11:00','close','22:30','closed',false),
      'fri', jsonb_build_object('open','11:00','close','23:30','closed',false),
      'sat', jsonb_build_object('open','11:30','close','23:30','closed',false),
      'sun', jsonb_build_object('open','11:30','close','22:30','closed',false)
    ),
    'Pagamento confirmado! Estamos a preparar.',
    'Pague no balcão ao retirar.'
  ) ON CONFLICT DO NOTHING;

  -- ===========================================================
  -- 4) TOTEM CONFIG
  -- ===========================================================
  INSERT INTO public.totem_config (
    store_id, primary_color, secondary_color, accent_color, cta_color,
    welcome_message, active_languages, primary_language,
    enable_dine_in, enable_takeaway, enable_delivery,
    splash_title, splash_subtitle, splash_image_duration_ms, splash_show_text,
    splash_logo_size
  ) VALUES (
    v_store_id, '#D62300', '#FFC72C', '#FFC72C', '#28A745',
    jsonb_build_object('pt','Bem-vindo','en','Welcome','es','Bienvenido','fr','Bienvenue'),
    ARRAY['pt','en','es']::text[], 'es',
    true, true, true,
    jsonb_build_object('pt','Template Restaurant','en','Template Restaurant','es','Template Restaurant','fr','Template Restaurant'),
    jsonb_build_object('pt','Sabor a cada pedido','en','Flavor in every bite','es','Sabor en cada pedido','fr','Saveur à chaque commande'),
    4000, true, 160
  ) ON CONFLICT DO NOTHING;

  -- ===========================================================
  -- 5) DELIVERY ZONES (1 zona padrão vazia, admin configura)
  -- ===========================================================
  INSERT INTO public.delivery_zones (
    store_id, name, min_order, delivery_fee, postal_codes, is_default, is_active, sort_order
  ) VALUES (
    v_store_id, 'Zona Local', 10.00, 2.50, ARRAY[]::text[], true, true, 0
  ) ON CONFLICT DO NOTHING;

  -- ===========================================================
  -- 6) CATEGORIAS (8 categorias completas)
  -- ===========================================================
  INSERT INTO public.categories (store_id, name, sort_order, is_active)
  VALUES (v_store_id, jsonb_build_object('pt','Kebabs','en','Kebabs','es','Kebabs','fr','Kebabs'), 1, true)
  RETURNING id INTO v_cat_kebabs;

  INSERT INTO public.categories (store_id, name, sort_order, is_active)
  VALUES (v_store_id, jsonb_build_object('pt','Hambúrgueres','en','Burgers','es','Hamburguesas','fr','Burgers'), 2, true)
  RETURNING id INTO v_cat_burgers;

  INSERT INTO public.categories (store_id, name, sort_order, is_active)
  VALUES (v_store_id, jsonb_build_object('pt','Pizzas','en','Pizzas','es','Pizzas','fr','Pizzas'), 3, true)
  RETURNING id INTO v_cat_pizzas;

  INSERT INTO public.categories (store_id, name, sort_order, is_active)
  VALUES (v_store_id, jsonb_build_object('pt','Saladas','en','Salads','es','Ensaladas','fr','Salades'), 4, true)
  RETURNING id INTO v_cat_salads;

  INSERT INTO public.categories (store_id, name, sort_order, is_active)
  VALUES (v_store_id, jsonb_build_object('pt','Acompanhamentos','en','Sides','es','Acompañamientos','fr','Accompagnements'), 5, true)
  RETURNING id INTO v_cat_sides;

  INSERT INTO public.categories (store_id, name, sort_order, is_active)
  VALUES (v_store_id, jsonb_build_object('pt','Bebidas','en','Drinks','es','Bebidas','fr','Boissons'), 6, true)
  RETURNING id INTO v_cat_drinks;

  INSERT INTO public.categories (store_id, name, sort_order, is_active)
  VALUES (v_store_id, jsonb_build_object('pt','Sobremesas','en','Desserts','es','Postres','fr','Desserts'), 7, true)
  RETURNING id INTO v_cat_desserts;

  INSERT INTO public.categories (store_id, name, sort_order, is_active)
  VALUES (v_store_id, jsonb_build_object('pt','Combos','en','Combos','es','Combos','fr','Menus'), 8, true)
  RETURNING id INTO v_cat_combos;

  -- ===========================================================
  -- 7) PRODUTOS (24 exemplos — 3 por categoria)
  -- ===========================================================

  -- KEBABS
  INSERT INTO public.products (store_id, category_id, name, description, price, image_url, is_bestseller, product_type, sort_order)
  VALUES (v_store_id, v_cat_kebabs,
    jsonb_build_object('pt','Kebab Frango','en','Chicken Kebab','es','Kebab Pollo','fr','Kebab Poulet'),
    jsonb_build_object('pt','Frango grelhado, pão, salada','en','Grilled chicken, bread, salad','es','Pollo a la parrilla, pan, ensalada','fr','Poulet grillé, pain, salade'),
    7.50, v_placeholder, true, 'simple', 1)
  RETURNING id INTO v_prod_id;
  INSERT INTO public.product_sizes (product_id, name, price_add, sort_order) VALUES
    (v_prod_id, jsonb_build_object('pt','Médio','en','Medium','es','Mediano','fr','Moyen'), 0, 1),
    (v_prod_id, jsonb_build_object('pt','Grande','en','Large','es','Grande','fr','Grand'), 2.00, 2);
  INSERT INTO public.product_extras (product_id, name, price, max_qty, sort_order) VALUES
    (v_prod_id, jsonb_build_object('pt','Queijo extra','en','Extra cheese','es','Queso extra','fr','Fromage extra'), 1.00, 3, 1),
    (v_prod_id, jsonb_build_object('pt','Bacon','en','Bacon','es','Bacon','fr','Bacon'), 1.50, 3, 2),
    (v_prod_id, jsonb_build_object('pt','Molho picante','en','Hot sauce','es','Salsa picante','fr','Sauce piquante'), 0.50, 5, 3);

  INSERT INTO public.products (store_id, category_id, name, description, price, image_url, product_type, sort_order)
  VALUES (v_store_id, v_cat_kebabs,
    jsonb_build_object('pt','Kebab Vitela','en','Veal Kebab','es','Kebab Ternera','fr','Kebab Veau'),
    jsonb_build_object('pt','Vitela tenra, pão fresco','en','Tender veal, fresh bread','es','Ternera tierna, pan fresco','fr','Veau tendre, pain frais'),
    8.50, v_placeholder, 'simple', 2);

  INSERT INTO public.products (store_id, category_id, name, description, price, image_url, product_type, sort_order)
  VALUES (v_store_id, v_cat_kebabs,
    jsonb_build_object('pt','Kebab Misto','en','Mixed Kebab','es','Kebab Mixto','fr','Kebab Mixte'),
    jsonb_build_object('pt','Frango e vitela','en','Chicken and veal','es','Pollo y ternera','fr','Poulet et veau'),
    9.00, v_placeholder, 'simple', 3);

  -- HAMBÚRGUERES
  INSERT INTO public.products (store_id, category_id, name, description, price, image_url, is_bestseller, product_type, sort_order)
  VALUES (v_store_id, v_cat_burgers,
    jsonb_build_object('pt','Hambúrguer Clássico','en','Classic Burger','es','Hamburguesa Clásica','fr','Burger Classique'),
    jsonb_build_object('pt','Carne, queijo, alface, tomate','en','Beef, cheese, lettuce, tomato','es','Carne, queso, lechuga, tomate','fr','Bœuf, fromage, salade, tomate'),
    6.50, v_placeholder, true, 'simple', 1)
  RETURNING id INTO v_prod_id;
  INSERT INTO public.product_extras (product_id, name, price, max_qty, sort_order) VALUES
    (v_prod_id, jsonb_build_object('pt','Bacon','en','Bacon','es','Bacon','fr','Bacon'), 1.00, 2, 1),
    (v_prod_id, jsonb_build_object('pt','Ovo','en','Egg','es','Huevo','fr','Œuf'), 0.80, 2, 2);

  INSERT INTO public.products (store_id, category_id, name, description, price, image_url, product_type, sort_order)
  VALUES (v_store_id, v_cat_burgers,
    jsonb_build_object('pt','Cheeseburger Duplo','en','Double Cheeseburger','es','Cheeseburger Doble','fr','Double Cheeseburger'),
    jsonb_build_object('pt','Dupla carne e queijo derretido','en','Double beef and melted cheese','es','Doble carne y queso fundido','fr','Double bœuf et fromage fondu'),
    8.90, v_placeholder, 'simple', 2);

  INSERT INTO public.products (store_id, category_id, name, description, price, image_url, product_type, sort_order)
  VALUES (v_store_id, v_cat_burgers,
    jsonb_build_object('pt','Veggie Burger','en','Veggie Burger','es','Burger Veggie','fr','Veggie Burger'),
    jsonb_build_object('pt','Hambúrguer vegetariano','en','Vegetarian burger','es','Hamburguesa vegetariana','fr','Burger végétarien'),
    7.00, v_placeholder, 'simple', 3);

  -- PIZZAS
  INSERT INTO public.products (store_id, category_id, name, description, price, image_url, product_type, sort_order)
  VALUES (v_store_id, v_cat_pizzas,
    jsonb_build_object('pt','Margherita','en','Margherita','es','Margarita','fr','Margherita'),
    jsonb_build_object('pt','Tomate, mussarela, manjericão','en','Tomato, mozzarella, basil','es','Tomate, mozzarella, albahaca','fr','Tomate, mozzarella, basilic'),
    9.50, v_placeholder, 'simple', 1)
  RETURNING id INTO v_prod_id;
  INSERT INTO public.product_sizes (product_id, name, price_add, sort_order) VALUES
    (v_prod_id, jsonb_build_object('pt','Pequena','en','Small','es','Pequeña','fr','Petite'), 0, 1),
    (v_prod_id, jsonb_build_object('pt','Média','en','Medium','es','Mediana','fr','Moyenne'), 2.50, 2),
    (v_prod_id, jsonb_build_object('pt','Grande','en','Large','es','Grande','fr','Grande'), 5.00, 3);

  INSERT INTO public.products (store_id, category_id, name, description, price, image_url, product_type, sort_order)
  VALUES (v_store_id, v_cat_pizzas,
    jsonb_build_object('pt','Pepperoni','en','Pepperoni','es','Pepperoni','fr','Pepperoni'),
    jsonb_build_object('pt','Pepperoni e mussarela','en','Pepperoni and mozzarella','es','Pepperoni y mozzarella','fr','Pepperoni et mozzarella'),
    11.00, v_placeholder, 'simple', 2);

  INSERT INTO public.products (store_id, category_id, name, description, price, image_url, product_type, sort_order)
  VALUES (v_store_id, v_cat_pizzas,
    jsonb_build_object('pt','Quatro Queijos','en','Four Cheese','es','Cuatro Quesos','fr','Quatre Fromages'),
    jsonb_build_object('pt','Mussarela, gorgonzola, parmesão, provolone','en','Mozzarella, gorgonzola, parmesan, provolone','es','Mozzarella, gorgonzola, parmesano, provolone','fr','Mozzarella, gorgonzola, parmesan, provolone'),
    12.50, v_placeholder, 'simple', 3);

  -- SALADAS
  INSERT INTO public.products (store_id, category_id, name, description, price, image_url, product_type, sort_order)
  VALUES (v_store_id, v_cat_salads,
    jsonb_build_object('pt','Salada César','en','Caesar Salad','es','Ensalada César','fr','Salade César'),
    jsonb_build_object('pt','Alface, frango, parmesão','en','Lettuce, chicken, parmesan','es','Lechuga, pollo, parmesano','fr','Salade, poulet, parmesan'),
    7.50, v_placeholder, 'simple', 1);

  INSERT INTO public.products (store_id, category_id, name, description, price, image_url, product_type, sort_order)
  VALUES (v_store_id, v_cat_salads,
    jsonb_build_object('pt','Salada Mediterrânea','en','Mediterranean Salad','es','Ensalada Mediterránea','fr','Salade Méditerranéenne'),
    jsonb_build_object('pt','Tomate, pepino, feta, azeitonas','en','Tomato, cucumber, feta, olives','es','Tomate, pepino, feta, aceitunas','fr','Tomate, concombre, feta, olives'),
    7.90, v_placeholder, 'simple', 2);

  INSERT INTO public.products (store_id, category_id, name, description, price, image_url, product_type, sort_order)
  VALUES (v_store_id, v_cat_salads,
    jsonb_build_object('pt','Salada Mista','en','Mixed Salad','es','Ensalada Mixta','fr','Salade Mixte'),
    jsonb_build_object('pt','Folhas verdes, tomate, cenoura','en','Greens, tomato, carrot','es','Hojas verdes, tomate, zanahoria','fr','Verdure, tomate, carotte'),
    5.50, v_placeholder, 'simple', 3);

  -- ACOMPANHAMENTOS
  INSERT INTO public.products (store_id, category_id, name, description, price, image_url, is_bestseller, product_type, sort_order)
  VALUES (v_store_id, v_cat_sides,
    jsonb_build_object('pt','Batata Frita','en','French Fries','es','Patatas Fritas','fr','Frites'),
    jsonb_build_object('pt','Batatas crocantes','en','Crispy fries','es','Patatas crujientes','fr','Frites croustillantes'),
    3.50, v_placeholder, true, 'simple', 1)
  RETURNING id INTO v_prod_id;
  INSERT INTO public.product_sizes (product_id, name, price_add, sort_order) VALUES
    (v_prod_id, jsonb_build_object('pt','Pequena','en','Small','es','Pequeña','fr','Petite'), 0, 1),
    (v_prod_id, jsonb_build_object('pt','Grande','en','Large','es','Grande','fr','Grande'), 1.50, 2);

  INSERT INTO public.products (store_id, category_id, name, description, price, image_url, product_type, sort_order)
  VALUES (v_store_id, v_cat_sides,
    jsonb_build_object('pt','Anéis de Cebola','en','Onion Rings','es','Aros de Cebolla','fr','Rondelles d''Oignon'),
    jsonb_build_object('pt','Anéis crocantes','en','Crispy rings','es','Aros crujientes','fr','Rondelles croustillantes'),
    4.00, v_placeholder, 'simple', 2);

  INSERT INTO public.products (store_id, category_id, name, description, price, image_url, product_type, sort_order)
  VALUES (v_store_id, v_cat_sides,
    jsonb_build_object('pt','Nuggets de Frango','en','Chicken Nuggets','es','Nuggets de Pollo','fr','Nuggets de Poulet'),
    jsonb_build_object('pt','6 unidades','en','6 pieces','es','6 unidades','fr','6 pièces'),
    4.50, v_placeholder, 'simple', 3);

  -- BEBIDAS
  INSERT INTO public.products (store_id, category_id, name, description, price, image_url, product_type, sort_order)
  VALUES (v_store_id, v_cat_drinks,
    jsonb_build_object('pt','Coca-Cola','en','Coca-Cola','es','Coca-Cola','fr','Coca-Cola'),
    jsonb_build_object('pt','Lata 330ml','en','330ml can','es','Lata 330ml','fr','Canette 330ml'),
    2.00, v_placeholder, 'simple', 1);

  INSERT INTO public.products (store_id, category_id, name, description, price, image_url, product_type, sort_order)
  VALUES (v_store_id, v_cat_drinks,
    jsonb_build_object('pt','Água','en','Water','es','Agua','fr','Eau'),
    jsonb_build_object('pt','500ml','en','500ml','es','500ml','fr','500ml'),
    1.20, v_placeholder, 'simple', 2);

  INSERT INTO public.products (store_id, category_id, name, description, price, image_url, product_type, sort_order)
  VALUES (v_store_id, v_cat_drinks,
    jsonb_build_object('pt','Sumo Natural','en','Fresh Juice','es','Zumo Natural','fr','Jus Frais'),
    jsonb_build_object('pt','Laranja espremida','en','Squeezed orange','es','Naranja exprimida','fr','Orange pressée'),
    3.00, v_placeholder, 'simple', 3);

  -- SOBREMESAS
  INSERT INTO public.products (store_id, category_id, name, description, price, image_url, product_type, sort_order)
  VALUES (v_store_id, v_cat_desserts,
    jsonb_build_object('pt','Brownie','en','Brownie','es','Brownie','fr','Brownie'),
    jsonb_build_object('pt','Chocolate quente','en','Warm chocolate','es','Chocolate caliente','fr','Chocolat chaud'),
    3.50, v_placeholder, 'simple', 1);

  INSERT INTO public.products (store_id, category_id, name, description, price, image_url, product_type, sort_order)
  VALUES (v_store_id, v_cat_desserts,
    jsonb_build_object('pt','Tarte de Maçã','en','Apple Pie','es','Tarta de Manzana','fr','Tarte aux Pommes'),
    jsonb_build_object('pt','Fatia individual','en','Single slice','es','Porción individual','fr','Part individuelle'),
    3.00, v_placeholder, 'simple', 2);

  INSERT INTO public.products (store_id, category_id, name, description, price, image_url, product_type, sort_order)
  VALUES (v_store_id, v_cat_desserts,
    jsonb_build_object('pt','Gelado','en','Ice Cream','es','Helado','fr','Glace'),
    jsonb_build_object('pt','3 sabores à escolha','en','3 flavors of choice','es','3 sabores a elegir','fr','3 parfums au choix'),
    3.80, v_placeholder, 'simple', 3);

  -- COMBOS
  INSERT INTO public.products (store_id, category_id, name, description, price, image_url, is_bestseller, product_type, combo_unit_count, sort_order)
  VALUES (v_store_id, v_cat_combos,
    jsonb_build_object('pt','Menu Kebab','en','Kebab Menu','es','Menú Kebab','fr','Menu Kebab'),
    jsonb_build_object('pt','Kebab + batata + bebida','en','Kebab + fries + drink','es','Kebab + patatas + bebida','fr','Kebab + frites + boisson'),
    11.50, v_placeholder, true, 'combo', 3, 1);

  INSERT INTO public.products (store_id, category_id, name, description, price, image_url, product_type, combo_unit_count, sort_order)
  VALUES (v_store_id, v_cat_combos,
    jsonb_build_object('pt','Menu Burger','en','Burger Menu','es','Menú Burger','fr','Menu Burger'),
    jsonb_build_object('pt','Burger + batata + bebida','en','Burger + fries + drink','es','Burger + patatas + bebida','fr','Burger + frites + boisson'),
    10.50, v_placeholder, 'combo', 3, 2);

  INSERT INTO public.products (store_id, category_id, name, description, price, image_url, product_type, combo_unit_count, sort_order)
  VALUES (v_store_id, v_cat_combos,
    jsonb_build_object('pt','Menu Família','en','Family Menu','es','Menú Familia','fr','Menu Famille'),
    jsonb_build_object('pt','4 pratos + 4 bebidas','en','4 mains + 4 drinks','es','4 platos + 4 bebidas','fr','4 plats + 4 boissons'),
    34.90, v_placeholder, 'combo', 8, 3);

  -- ===========================================================
  -- 8) PROMO BANNERS (3 banners exemplo)
  -- ===========================================================
  INSERT INTO public.promo_banners (store_id, image_url, sort_order, is_active, media_type)
  VALUES
    (v_store_id, v_placeholder, 1, true, 'image'),
    (v_store_id, v_placeholder, 2, true, 'image'),
    (v_store_id, v_placeholder, 3, true, 'image');

  -- ===========================================================
  -- 9) SPLASH MEDIA (1 splash padrão)
  -- ===========================================================
  INSERT INTO public.splash_media (store_id, media_type, url, duration_ms, sort_order, is_active)
  VALUES (v_store_id, 'image', v_placeholder, 4000, 1, true);

  -- ===========================================================
  -- 10) PRINTER SETTINGS
  -- ===========================================================
  INSERT INTO public.printer_settings (
    store_id, enabled, printer_name, ip_address, port,
    printer_copies, print_mode
  ) VALUES (
    v_store_id, false, 'Cozinha', '192.168.1.100', 9100, 1, 'bridge'
  ) ON CONFLICT DO NOTHING;

  -- ===========================================================
  -- 11) LOYALTY (programa carimbos padrão, inativo)
  -- ===========================================================
  INSERT INTO public.tenant_loyalty_programs (tenant_id, model_type, is_active, config)
  VALUES (v_tenant_id, 'stamps', false,
          jsonb_build_object('stamps_needed', 10, 'reward', 'Próximo pedido grátis'))
  ON CONFLICT DO NOTHING;

  -- ===========================================================
  -- 12) PLAN ASSIGNMENT (premium por padrão)
  -- ===========================================================
  INSERT INTO public.tenant_plan_assignments (tenant_id, plan_id, is_beta)
  SELECT v_tenant_id, id, false FROM public.platform_plans WHERE plan_key = 'premium' LIMIT 1
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Bootstrap concluído. Tenant=% Store=%', v_tenant_id, v_store_id;
END
$bootstrap$;

-- Verificação final
SELECT
  (SELECT COUNT(*) FROM public.tenants WHERE id='11111111-1111-1111-1111-111111111111') AS tenants,
  (SELECT COUNT(*) FROM public.stores WHERE id='22222222-2222-2222-2222-222222222222') AS stores,
  (SELECT COUNT(*) FROM public.categories WHERE store_id='22222222-2222-2222-2222-222222222222') AS categorias,
  (SELECT COUNT(*) FROM public.products WHERE store_id='22222222-2222-2222-2222-222222222222') AS produtos,
  (SELECT COUNT(*) FROM public.promo_banners WHERE store_id='22222222-2222-2222-2222-222222222222') AS banners;
