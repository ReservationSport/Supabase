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
    
    const targetUrl = roomId ? `/?room_id=${roomId}` : (data.url || '/');

    const options = {
        body: notificationBody,
        icon: data.icon || '/icon-192.png',
        badge: data.badgeIcon || '/favicon.png',
        vibrate: [100, 50, 100],
        tag: roomId ? `chat-msg-${roomId}` : 'chat-msg-general',
        renotify: true,
        data: {
            url: targetUrl,
            roomId: roomId
        }
    };

    event.waitUntil(
        self.registration.showNotification(notificationTitle, options)
    );
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();

    const notificationData = event.notification.data || {};
    const roomId = notificationData.roomId;
    
    const targetUrl = roomId ? `/?room_id=${roomId}` : (notificationData.url || '/');
    const urlToOpen = new URL(targetUrl, self.location.origin).href;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            // 1. Versuche, ein bereits geöffnetes Fenster zu finden
            for (let i = 0; i < clientList.length; i++) {
                let client = clientList[i];
                
                // Prüfen, ob das Tab zur gleichen Origin (Domain) gehört
                if (client.url.startsWith(self.location.origin) && 'focus' in client) {
                    return client.focus().then(() => {
                        // WICHTIG: Nachricht ans Frontend erst senden, wenn der Fokus erfolgreich war
                        if ('postMessage' in client) {
                            client.postMessage({ type: 'OPEN_CHAT', room_id: roomId });
                        }
                    });
                }
            }

            // 2. Wenn keine App-Instanz offen war -> App frisch aufwecken
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        }).catch(err => {
            console.error("❌ Fehler im notificationclick:", err);
        })
    );
});
