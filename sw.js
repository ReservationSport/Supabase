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

    // App Badge setzen (falls vom Gerät unterstützt)
    if (data.badge !== undefined && 'setAppBadge' in navigator) {
        try {
            navigator.setAppBadge(data.badge);
        } catch (e) {
            // Ignorieren, falls vom Browser nicht unterstützt
        }
    }

    // Flexibles Auslesen von Chat-ID und Texten (Hybrid-Payload Abfangung)
    const chatId = data.chatId || data.chat_id || (data.record ? data.record.chatId : null);
    const notificationTitle = data.title || data.titel || '💬 Neue Nachricht';
    const notificationBody = data.body || data.inhalt || data.message || 'Du hast eine neue Nachricht erhalten.';
    
    // Ziel-URL generieren
    const targetUrl = data.url || (chatId ? `/?chatId=${chatId}` : '/');

    const options = {
        body: notificationBody,
        icon: data.icon || '/icon-192.png',
        badge: data.badgeIcon || '/favicon.png',
        vibrate: [100, 50, 100], // Typisches Vibrationsmuster
        tag: chatId ? `chat-msg-${chatId}` : 'chat-msg-general', // Gruppierung pro Chat
        renotify: true, // Erneute Vibration/Ton bei Folgebannern
        data: {
            url: targetUrl,
            chatId: chatId
        }
    };

    event.waitUntil(
        self.registration.showNotification(notificationTitle, options)
    );
});

// 3. Click-Handler für die Benachrichtigung
self.addEventListener('notificationclick', function(event) {
    event.notification.close(); // Banner schließen

    const notificationData = event.notification.data || {};
    const chatId = notificationData.chatId;
    const targetUrl = notificationData.url || '/';
    const urlToOpen = new URL(targetUrl, self.location.origin).href;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            // A) Falls bereits ein Tab deiner App geöffnet ist (Hintergrund oder Vordergrund)
            for (let i = 0; i < clientList.length; i++) {
                let client = clientList[i];
                const clientUrl = new URL(client.url, self.location.origin);

                if (clientUrl.origin === self.location.origin && 'focus' in client) {
                    // 1. Tab in den Vordergrund holen
                    client.focus();

                    // 2. Event per postMessage direkt ins JS der App senden (öffnet den Chat ohne Reload)
                    client.postMessage({
                        action: 'openChat',
                        chatId: chatId,
                        url: urlToOpen
                    });
                    return;
                }
            }

            // B) Falls die App komplett geschlossen war (Kaltstart): Öffne neuen Tab inkl. ?chatId=
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
