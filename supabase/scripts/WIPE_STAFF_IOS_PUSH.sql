-- Limpar tokens iPhone da equipa (correr no SQL Editor se a Apple recusar o token).
-- Depois: desinstalar app no iPhone, reinstalar .ipa, Registar push.

DELETE FROM public.push_subscriptions
WHERE platform = 'ios'
  AND customer_phone = '__staff__';
