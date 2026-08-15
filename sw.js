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
    
    // Hash-basierte URL nutzen, damit PWA-Kaltstarts den Parameter nicht verschlucken
    const targetUrl = roomId ? `/#room=${roomId}` : (data.url || '/');
    
    const options = {
        body: notificationBody,
        icon: data.icon || '/icon-192.png',
        badge: data.badgeIcon || '/favicon.png',
        vibrate: [100, 50, 100],
        tag: roomId ? `chat-msg-${roomId}` : 'chat-msg-general',
        renotify: true,
        data: {
            url: targetUrl,
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
    const roomId = notificationData.room_id || notificationData.roomId;
    
    const targetUrl = roomId ? `/#room=${roomId}` : (notificationData.url || '/');
    const urlToOpen = new URL(targetUrl, self.location.origin).href;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            // 1. Versuche, ein bereits geöffnetes Fenster zu finden und zu fokussieren/navigieren
            for (let i = 0; i < clientList.length; i++) {
                let client = clientList[i];
                
                if (client.url.startsWith(self.location.origin) && 'focus' in client) {
                    return client.focus().then(() => {
                        if ('navigate' in client) {
                            return client.navigate(urlToOpen);
                        } else if ('postMessage' in client) {
                            client.postMessage({ type: 'OPEN_CHAT', room_id: roomId });
                        }
                    });
                }
            }

            // 2. Wenn keine App-Instanz offen war -> App frisch aufwecken mit der Hash-URL
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        }).catch(err => {
            console.error("❌ Fehler im notificationclick:", err);
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
