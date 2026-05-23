self.addEventListener("push", (event) => {
  let data = { title: "Kebab Turco", body: "Actualización de tu pedido" };
  try {
    if (event.data) data = event.data.json();
  } catch (_) {
    data.body = event.data?.text() || data.body;
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Kebab Turco", {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.tag || "order-update",
      data: data.url ? { url: data.url } : {},
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(clients.openWindow(url));
});
