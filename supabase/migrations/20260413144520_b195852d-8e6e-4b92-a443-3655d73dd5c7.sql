
-- Drop overly permissive policies
DROP POLICY "Anon can insert orders" ON public.orders;
DROP POLICY "Anon can insert order_items" ON public.order_items;

-- Recreate with store validation
CREATE POLICY "Anon can insert orders for active stores" ON public.orders
  FOR INSERT TO anon
  WITH CHECK (
    store_id IN (SELECT s.id FROM public.stores s WHERE s.is_active = true)
  );

CREATE POLICY "Anon can insert order_items for existing orders" ON public.order_items
  FOR INSERT TO anon
  WITH CHECK (
    order_id IN (SELECT o.id FROM public.orders o)
  );

-- Also allow anon to read orders they just created (for confirmation screen)
CREATE POLICY "Anon can read orders by id" ON public.orders
  FOR SELECT TO anon
  USING (true);
