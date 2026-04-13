
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin_master', 'restaurant_admin', 'operator', 'kitchen');
CREATE TYPE public.order_status AS ENUM ('pending', 'preparing', 'ready', 'delivered', 'cancelled');
CREATE TYPE public.order_source AS ENUM ('totem', 'ifood', 'counter', 'delivery');
CREATE TYPE public.payment_method AS ENUM ('card', 'cash', 'apple_pay', 'google_pay', 'pix');

-- UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- TENANTS
CREATE TABLE public.tenants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  plan TEXT DEFAULT 'free',
  max_orders_month INTEGER DEFAULT 500,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- STORES
CREATE TABLE public.stores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON public.stores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, tenant_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER FUNCTIONS
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT tenant_id FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name) VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- CATEGORIES
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name JSONB NOT NULL DEFAULT '{}',
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PRODUCTS
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name JSONB NOT NULL DEFAULT '{}',
  description JSONB DEFAULT '{}',
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_bestseller BOOLEAN DEFAULT false,
  is_promo BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PRODUCT SIZES
CREATE TABLE public.product_sizes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name JSONB NOT NULL DEFAULT '{}',
  price_add DECIMAL(10,2) NOT NULL DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);
ALTER TABLE public.product_sizes ENABLE ROW LEVEL SECURITY;

-- PRODUCT EXTRAS
CREATE TABLE public.product_extras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name JSONB NOT NULL DEFAULT '{}',
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  max_qty INTEGER DEFAULT 5,
  sort_order INTEGER DEFAULT 0
);
ALTER TABLE public.product_extras ENABLE ROW LEVEL SECURITY;

-- ORDERS
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  status order_status NOT NULL DEFAULT 'pending',
  source order_source NOT NULL DEFAULT 'totem',
  payment_method payment_method,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  customer_name TEXT,
  order_type TEXT DEFAULT 'dine_in',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ORDER ITEMS
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  size_name TEXT,
  extras JSONB DEFAULT '[]',
  notes TEXT
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- PRINTERS
CREATE TABLE public.printers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'network',
  ip_address TEXT,
  port INTEGER DEFAULT 9100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.printers ENABLE ROW LEVEL SECURITY;

-- PRINTER CATEGORY MAP
CREATE TABLE public.printer_category_map (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  printer_id UUID NOT NULL REFERENCES public.printers(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  UNIQUE(printer_id, category_id)
);
ALTER TABLE public.printer_category_map ENABLE ROW LEVEL SECURITY;

-- CASH REGISTERS
CREATE TABLE public.cash_registers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  opened_by UUID NOT NULL REFERENCES auth.users(id),
  closed_by UUID REFERENCES auth.users(id),
  opening_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
  closing_balance DECIMAL(10,2),
  total_sales DECIMAL(10,2) DEFAULT 0,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);
ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;

-- STOCK ITEMS
CREATE TABLE public.stock_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'un',
  current_qty DECIMAL(10,2) NOT NULL DEFAULT 0,
  min_qty DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_stock_items_updated_at BEFORE UPDATE ON public.stock_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PRODUCT STOCK
CREATE TABLE public.product_stock (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  stock_item_id UUID NOT NULL REFERENCES public.stock_items(id) ON DELETE CASCADE,
  qty_per_unit DECIMAL(10,2) NOT NULL DEFAULT 1,
  UNIQUE(product_id, stock_item_id)
);
ALTER TABLE public.product_stock ENABLE ROW LEVEL SECURITY;

-- TOTEM CONFIG
CREATE TABLE public.totem_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL UNIQUE REFERENCES public.stores(id) ON DELETE CASCADE,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#D62300',
  secondary_color TEXT DEFAULT '#F5F5F5',
  accent_color TEXT DEFAULT '#FFC72C',
  cta_color TEXT DEFAULT '#28A745',
  bg_image_url TEXT,
  welcome_message JSONB DEFAULT '{}',
  active_languages TEXT[] DEFAULT ARRAY['pt', 'en'],
  enable_dine_in BOOLEAN DEFAULT true,
  enable_takeaway BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.totem_config ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_totem_config_updated_at BEFORE UPDATE ON public.totem_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS POLICIES
CREATE POLICY "Admin master can do everything on tenants" ON public.tenants FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin_master'));
CREATE POLICY "Restaurant admin can view own tenant" ON public.tenants FOR SELECT TO authenticated USING (id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Admin master full access stores" ON public.stores FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin_master'));
CREATE POLICY "Tenant members can access own stores" ON public.stores FOR ALL TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Admin master full access user_roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin_master'));
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Tenant members manage categories" ON public.categories FOR ALL TO authenticated USING (store_id IN (SELECT s.id FROM public.stores s WHERE s.tenant_id = public.get_user_tenant_id(auth.uid())));
CREATE POLICY "Public can read active categories" ON public.categories FOR SELECT TO anon USING (is_active = true);

CREATE POLICY "Tenant members manage products" ON public.products FOR ALL TO authenticated USING (store_id IN (SELECT s.id FROM public.stores s WHERE s.tenant_id = public.get_user_tenant_id(auth.uid())));
CREATE POLICY "Public can read active products" ON public.products FOR SELECT TO anon USING (is_active = true);

CREATE POLICY "Tenant members manage product_sizes" ON public.product_sizes FOR ALL TO authenticated USING (product_id IN (SELECT p.id FROM public.products p JOIN public.stores s ON s.id = p.store_id WHERE s.tenant_id = public.get_user_tenant_id(auth.uid())));
CREATE POLICY "Public can read product_sizes" ON public.product_sizes FOR SELECT TO anon USING (true);

CREATE POLICY "Tenant members manage product_extras" ON public.product_extras FOR ALL TO authenticated USING (product_id IN (SELECT p.id FROM public.products p JOIN public.stores s ON s.id = p.store_id WHERE s.tenant_id = public.get_user_tenant_id(auth.uid())));
CREATE POLICY "Public can read product_extras" ON public.product_extras FOR SELECT TO anon USING (true);

CREATE POLICY "Tenant members manage orders" ON public.orders FOR ALL TO authenticated USING (store_id IN (SELECT s.id FROM public.stores s WHERE s.tenant_id = public.get_user_tenant_id(auth.uid())));
CREATE POLICY "Anon can insert orders" ON public.orders FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Tenant members manage order_items" ON public.order_items FOR ALL TO authenticated USING (order_id IN (SELECT o.id FROM public.orders o JOIN public.stores s ON s.id = o.store_id WHERE s.tenant_id = public.get_user_tenant_id(auth.uid())));
CREATE POLICY "Anon can insert order_items" ON public.order_items FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Tenant members manage printers" ON public.printers FOR ALL TO authenticated USING (store_id IN (SELECT s.id FROM public.stores s WHERE s.tenant_id = public.get_user_tenant_id(auth.uid())));

CREATE POLICY "Tenant members manage printer_category_map" ON public.printer_category_map FOR ALL TO authenticated USING (printer_id IN (SELECT pr.id FROM public.printers pr JOIN public.stores s ON s.id = pr.store_id WHERE s.tenant_id = public.get_user_tenant_id(auth.uid())));

CREATE POLICY "Tenant members manage cash_registers" ON public.cash_registers FOR ALL TO authenticated USING (store_id IN (SELECT s.id FROM public.stores s WHERE s.tenant_id = public.get_user_tenant_id(auth.uid())));

CREATE POLICY "Tenant members manage stock_items" ON public.stock_items FOR ALL TO authenticated USING (store_id IN (SELECT s.id FROM public.stores s WHERE s.tenant_id = public.get_user_tenant_id(auth.uid())));

CREATE POLICY "Tenant members manage product_stock" ON public.product_stock FOR ALL TO authenticated USING (product_id IN (SELECT p.id FROM public.products p JOIN public.stores s ON s.id = p.store_id WHERE s.tenant_id = public.get_user_tenant_id(auth.uid())));

CREATE POLICY "Tenant members manage totem_config" ON public.totem_config FOR ALL TO authenticated USING (store_id IN (SELECT s.id FROM public.stores s WHERE s.tenant_id = public.get_user_tenant_id(auth.uid())));
CREATE POLICY "Public can read totem_config" ON public.totem_config FOR SELECT TO anon USING (true);

-- INDEXES
CREATE INDEX idx_stores_tenant ON public.stores(tenant_id);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_tenant ON public.user_roles(tenant_id);
CREATE INDEX idx_categories_store ON public.categories(store_id);
CREATE INDEX idx_products_store ON public.products(store_id);
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_orders_store ON public.orders(store_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_order_items_order ON public.order_items(order_id);
CREATE INDEX idx_stock_items_store ON public.stock_items(store_id);
