// sw.js

self.addEventListener('push', function(event) {
    if (!event.data) return;

    const data = event.data.json(); 
    
    // 1. Badge aktualisieren
    // Hinweis: setAppBadge funktioniert meist nur im Haupt-Thread (window), 
    // nicht direkt im Service Worker. Wenn es dort nicht klappt, 
    // musst du das Badge über eine Nachricht an die Haupt-App setzen.
    if (data.badge !== undefined && 'setAppBadge' in navigator) {
        navigator.setAppBadge(data.badge);
    }

    // 2. Benachrichtigung anzeigen
    const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/favicon.png', // Alternativ diese Zeile einfach löschen
    data: {
        url: data.url || '/'
    }
};

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// NEU: Der Click-Handler für die Benachrichtigung
self.addEventListener('notificationclick', function(event) {
    // Schließt die Benachrichtigung
    event.notification.close();

    // Wir definieren die URL aus den Daten der Notification (oder Fallback auf '/')
    const urlToOpen = event.notification.data.url || '/';

    event.waitUntil(
        // Wir suchen alle geöffneten Fenster deiner App
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            // Prüfen, ob die App bereits in einem Tab geöffnet ist
            for (let i = 0; i < clientList.length; i++) {
                let client = clientList[i];
                // Wenn wir eine Übereinstimmung finden, bringen wir diesen Tab in den Fokus
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            // Falls die App noch nicht geöffnet ist, öffnen wir sie neu
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
