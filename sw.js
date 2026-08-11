// sw.js

// 1. Zwingt den Service Worker, sich sofort zu aktualisieren
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

// 2. Push-Benachrichtigung empfangen und anzeigen
self.addEventListener('push', function(event) {
    if (!event.data) return;

    const data = event.data.json();  

    // Falls dein Browser setAppBadge im Service Worker direkt unterstützt, wird es mitgenommen
    if (data.badge !== undefined && 'setAppBadge' in navigator) {
        try {
            navigator.setAppBadge(data.badge);
        } catch (e) {
            // Falls nicht unterstützt, wird es einfach übersprungen
        }
    }

    const options = {
        body: data.body,
        icon: '/icon-192.png',
        badge: '/favicon.png',
        data: {
            url: data.url || '/'
        }
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// 3. Click-Handler für die Benachrichtigung
self.addEventListener('notificationclick', function(event) {
    event.notification.close();

    const urlToOpen = event.notification.data.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            for (let i = 0; i < clientList.length; i++) {
                let client = clientList[i];
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

