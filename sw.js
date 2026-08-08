// sw.js
self.addEventListener('push', function(event) {
    if (!event.data) return;

    const data = event.data.json(); // Hier kommen die Daten vom Server an
    
    // 1. Badge aktualisieren (wenn das Gerät es unterstützt)
    if (data.badge !== undefined && 'setAppBadge' in navigator) {
        navigator.setAppBadge(data.badge);
    }

    // 2. Benachrichtigung anzeigen (die System-Notification)
    const options = {
        body: data.body,
        icon: '/icon.png', // Stelle sicher, dass du ein Icon im Hauptverzeichnis hast
        badge: '/icon.png'
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});
