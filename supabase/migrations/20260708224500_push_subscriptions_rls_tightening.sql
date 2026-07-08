-- Restringe leitura de push_subscriptions:
-- antes estava USING (true), permitindo leitura ampla.

DROP POLICY IF EXISTS "Read own push subs" ON public.push_subscriptions;

CREATE POLICY "Read own push subs"
  ON public.push_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND (
      EXISTS (
        SELECT 1
        FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.store_id = push_subscriptions.store_id
      )
      OR public.has_role(auth.uid(), 'admin_master'::public.app_role)
    )
  );

