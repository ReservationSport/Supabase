// sw.js

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

    const chatId = data.chatId || data.chat_id || (data.record ? data.record.chatId : null);
    const notificationTitle = data.title || data.titel || '💬 Neue Nachricht';
    const notificationBody = data.body || data.inhalt || data.message || 'Du hast eine neue Nachricht erhalten.';
    
    const targetUrl = data.url || (chatId ? `/?chatId=${chatId}` : '/');

    const options = {
        body: notificationBody,
        icon: data.icon || '/icon-192.png',
        badge: data.badgeIcon || '/favicon.png',
        vibrate: [100, 50, 100],
        tag: chatId ? `chat-msg-${chatId}` : 'chat-msg-general',
        renotify: true,
        data: {
            url: targetUrl,
            chatId: chatId
        }
    };

    event.waitUntil(
        self.registration.showNotification(notificationTitle, options)
    );
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();

    const notificationData = event.notification.data || {};
    const chatId = notificationData.chatId;
    const targetUrl = notificationData.url || '/';
    const urlToOpen = new URL(targetUrl, self.location.origin).href;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            for (let i = 0; i < clientList.length; i++) {
                let client = clientList[i];
                const clientUrl = new URL(client.url, self.location.origin);

                if (clientUrl.origin === self.location.origin && 'focus' in client) {
                    client.focus();
                    client.postMessage({
                        action: 'openChat',
                        chatId: chatId,
                        url: urlToOpen
                    });
                    return;
                }
            }

            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
