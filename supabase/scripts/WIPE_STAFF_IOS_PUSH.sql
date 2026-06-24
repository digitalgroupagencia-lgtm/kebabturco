-- Limpar tokens iPhone da equipa antes de voltar a registar.
-- App Store: APNS_USE_SANDBOX=false na Lovable + Publish, depois instalar da loja, abrir app, Registar push.
-- Development (.ipa): APNS_USE_SANDBOX=true.

DELETE FROM public.push_subscriptions
WHERE platform = 'ios'
  AND customer_phone = '__staff__';
