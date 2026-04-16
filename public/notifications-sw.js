self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = payload.title || "Nouvelle notification";
  const options = {
    body: payload.body || "Une mise a jour est disponible.",
    icon: "/default-logo.svg",
    badge: "/default-logo.svg",
    data: payload.url || "/notifications",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data || "/notifications";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ("focus" in client && client.url.includes(url)) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
