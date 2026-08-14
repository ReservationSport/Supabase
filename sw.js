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

    let data = {};
    try {
        data = event.data.json();
    } catch (e) {
        data = { title: 'Neue Nachricht', body: event.data.text() };
    }

    // App Badge setzen (falls unterstützt)
    if (data.badge !== undefined && 'setAppBadge' in navigator) {
        try {
            navigator.setAppBadge(data.badge);
        } catch (e) {
            // Falls nicht unterstützt, ignorieren
        }
    }

    const chatId = data.chatId || data.chat_id || null;
    const targetUrl = data.url || (chatId ? `/?chatId=${chatId}` : '/');

    const options = {
        body: data.body || 'Du hast eine neue Nachricht erhalten.',
        icon: data.icon || '/icon-192.png',
        badge: data.badgeIcon || '/favicon.png',
        vibrate: [100, 50, 100], // Typisches Vibrationsmuster für Nachrichten
        // Gruppiert Nachrichten pro Chat (wie bei WhatsApp)
        tag: chatId ? `chat-msg-${chatId}` : 'chat-msg-general',
        renotify: true, // Vibration/Ton auch bei Folge-Nachrichten im selben Chat auslösen
        data: {
            url: targetUrl,
            chatId: chatId
        }
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'Neue Nachricht', options)
    );
});

// 3. Click-Handler für die Benachrichtigung
self.addEventListener('notificationclick', function(event) {
    event.notification.close();

    const notificationData = event.notification.data || {};
    const chatId = notificationData.chatId;
    const targetUrl = notificationData.url || '/';
    const urlToOpen = new URL(targetUrl, self.location.origin).href;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            // 1. Prüfen, ob bereits ein Fenster/Tab deiner App geöffnet ist
            for (let i = 0; i < clientList.length; i++) {
                let client = clientList[i];
                const clientUrl = new URL(client.url, self.location.origin);

                // Wenn ein Tab auf der gleichen Domain/App offen ist
                if (clientUrl.origin === self.location.origin && 'focus' in client) {
                    // Tab fokussieren
                    client.focus();

                    // Nachricht direkt an das Frontend senden (Chat ohne Reload öffnen)
                    client.postMessage({
                        action: 'openChat',
                        chatId: chatId,
                        url: urlToOpen
                    });
                    return;
                }
            }

            // 2. Falls die App komplett geschlossen war: Neuer Tab mit der Ziel-URL
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
