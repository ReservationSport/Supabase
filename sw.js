self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('push', function(event) {
    if (!event.data) return;

    let data = {};
    try {
        data = event.data.json();
    } catch (e) {
        data = { title: 'Neue Nachricht', body: event.data.text() };
    }

    if (data.badge !== undefined && 'setAppBadge' in navigator) {
        try {
            navigator.setAppBadge(data.badge);
        } catch (e) {}
    }

    const roomId = data.room_id || data.roomId || (data.record ? data.record.room_id : null);
    const notificationTitle = data.title || data.titel || '💬 Neue Nachricht';
    const notificationBody = data.body || data.inhalt || data.message || 'Du hast eine neue Nachricht erhalten.';
    
    const options = {
        body: notificationBody,
        icon: data.icon || '/icon-192.png',
        badge: data.badgeIcon || '/favicon.png',
        vibrate: [100, 50, 100],
        tag: roomId ? `chat-msg-${roomId}` : 'chat-msg-general',
        renotify: true,
        data: {
            room_id: roomId 
        }
    };

    event.waitUntil(
        self.registration.showNotification(notificationTitle, options)
    );
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();

    const notificationData = event.notification.data || {};
    const roomId = notificationData.room_id;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            for (let i = 0; i < clientList.length; i++) {
                let client = clientList[i];
                if (client.url.startsWith(self.location.origin) && 'focus' in client) {
                    return client.focus().then(() => {
                        if ('postMessage' in client) {
                            client.postMessage({ type: 'OPEN_CHAT', room_id: roomId });
                        }
                    });
                }
            }

            // WICHTIG: Statt Hash-URL öffnen wir einfach die saubere Basis-URL.
            // Die ID übergeben wir stattdessen an die Clients, oder das Frontend fängt es ab.
            if (clients.openWindow) {
                return clients.openWindow('/').then(windowClient => {
                    if (windowClient && roomId) {
                        // Wir senden die Raum-ID direkt als Nachricht an das neue Fenster
                        windowClient.postMessage({ type: 'OPEN_CHAT', room_id: roomId });
                    }
                });
            }
        }).catch(err => {
            console.error("❌ Fehler im notificationclick:", err);
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});
