/* eslint-disable */
// Service Worker dedicado a push notifications (web push VAPID).
// Notificações de staff (tag começa com "staff-") ficam visíveis até toque.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = { title: "Kebab Turco", body: "Actualización de tu pedido" };
  try {
    if (event.data) data = event.data.json();
  } catch (_) {
    data.body = (event.data && event.data.text && event.data.text()) || data.body;
  }

  const tag = data.tag || "order-update";
  const isStaff = typeof tag === "string" && tag.indexOf("staff-") === 0;
  const requireInteraction = Boolean(data.requireInteraction) || isStaff;

  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag,
    renotify: isStaff,
    requireInteraction,
    // Vibração intensa em pedidos novos para o operador notar mesmo sem som
    vibrate: isStaff ? [400, 150, 400, 150, 600] : [200, 100, 200],
    data: data.url ? { url: data.url, tag } : { tag },
    // Som padrão do sistema; FCM nativo usa canal próprio
    silent: false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "Kebab Turco", options),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";
  const isExternal = /^(whatsapp:|tel:|mailto:|sms:)/i.test(targetUrl) ||
    (/^https?:\/\//i.test(targetUrl) && (() => {
      try { return new URL(targetUrl).origin !== self.location.origin; } catch (_) { return false; }
    })());
  const isInternalNonCustomer = /^\/(panel|admin|kds|seller|delivery|kitchen)(\/|$|\?)/.test(targetUrl);

  event.waitUntil(
    (async () => {
      if (isExternal) {
        await self.clients.openWindow(targetUrl);
        return;
      }
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of all) {
        try {
          if ("focus" in client) {
            await client.focus();
            if ("navigate" in client) {
              // Para rotas fora do fluxo cliente forçamos sempre a navegação
              await client.navigate(targetUrl).catch(() => null);
            }
            return;
          }
        } catch (_) {}
      }
      await self.clients.openWindow(targetUrl);
    })(),
  );
});
