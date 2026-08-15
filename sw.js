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
    
    // Wir leiten starr auf die Hauptseite um, ohne fehleranfällige URL-Parameter
    const targetUrl = '/';

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

    const absoluteUrl = new URL('/', self.location.origin).href;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            // 1. Prüfen, ob bereits ein Fenster offen ist -> Fokussieren und Signal zum Öffnen des Chats senden (nur an EINEN Client!)
            for (let i = 0; i < clientList.length; i++) {
                let client = clientList[i];
                if (client.url.startsWith(self.location.origin) && 'focus' in client) {
                    return client.focus().then(() => {
                        if ('postMessage' in client) {
                            client.postMessage({ type: 'OPEN_MAIN_CHAT' });
                        }
                    });
                }
            }

            // 2. Kaltstart: App öffnen und wiederholt per postMessage anpingen, bis die App bereit ist
            if (clients.openWindow) {
                return clients.openWindow(absoluteUrl).then(windowClient => {
                    if (windowClient) {
                        let attempts = 0;
                        const interval = setInterval(() => {
                            attempts++;
                            windowClient.postMessage({ type: 'OPEN_MAIN_CHAT' });
                            if (attempts >= 15) {
                                clearInterval(interval);
                            }
                        }, 400);
                    }
                });
            }
        }).catch(err => {
            console.error("❌ Fehler im notificationclick:", err);
            if (clients.openWindow) {
                return clients.openWindow(absoluteUrl);
            }
        })
    );
});
