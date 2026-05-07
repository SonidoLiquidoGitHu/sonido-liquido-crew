// ===========================================
// SERVICE WORKER - PUSH NOTIFICATIONS
// ===========================================

const CACHE_NAME = "sonido-liquido-v1";

// Install event
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker...");
  self.skipWaiting();
});

// Activate event
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker...");
  event.waitUntil(self.clients.claim());
});

// Push notification received
self.addEventListener("push", (event) => {
  console.log("[SW] Push notification received");

  let data = {
    title: "Sonido Líquido Crew",
    body: "Tienes una nueva notificación",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/badge-72x72.png",
    url: "/",
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || "/icons/icon-192x192.png",
    badge: data.badge || "/icons/badge-72x72.png",
    image: data.image,
    vibrate: [100, 50, 100],
    tag: data.tag || "default",
    renotify: true,
    requireInteraction: false,
    actions: [
      {
        action: "open",
        title: "Ver",
        icon: "/icons/open.png",
      },
      {
        action: "close",
        title: "Cerrar",
        icon: "/icons/close.png",
      },
    ],
    data: {
      url: data.url || "/",
      timestamp: Date.now(),
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handler
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked:", event.action);

  event.notification.close();

  if (event.action === "close") {
    return;
  }

  const urlToOpen = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window/tab open with this URL
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && "focus" in client) {
          return client.focus();
        }
      }

      // Open new window/tab
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Background sync (for offline support)
self.addEventListener("sync", (event) => {
  console.log("[SW] Background sync:", event.tag);

  if (event.tag === "sync-presave") {
    event.waitUntil(syncPresaveData());
  }
});

// Sync presave data when back online
async function syncPresaveData() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const pendingRequests = await cache.match("/pending-presaves");

    if (pendingRequests) {
      const data = await pendingRequests.json();

      for (const request of data) {
        await fetch(request.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request.body),
        });
      }

      await cache.delete("/pending-presaves");
    }
  } catch (error) {
    console.error("[SW] Sync failed:", error);
  }
}

// Periodic background sync (for checking scheduled releases)
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "check-releases") {
    event.waitUntil(checkForNewReleases());
  }
});

async function checkForNewReleases() {
  try {
    const response = await fetch("/api/releases/upcoming?notify=true");
    const data = await response.json();

    if (data.success && data.releases?.length > 0) {
      for (const release of data.releases) {
        await self.registration.showNotification(`🎵 ${release.title}`, {
          body: `${release.artistName} acaba de lanzar nueva música!`,
          icon: release.coverImageUrl || "/icons/icon-192x192.png",
          tag: `release-${release.id}`,
          data: { url: `/lanzamientos/${release.slug}` },
        });
      }
    }
  } catch (error) {
    console.error("[SW] Check releases failed:", error);
  }
}

console.log("[SW] Service worker loaded");
