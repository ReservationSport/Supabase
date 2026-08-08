// sw.js
self.addEventListener('push', function(event) {
    if (!event.data) return;

    const data = event.data.json(); // Daten von deinem Server
    
    // Badge-Logik: Falls der Server einen Badge-Count mitschickt
    if (data.badge !== undefined && 'setAppBadge' in navigator) {
        navigator.setAppBadge(data.badge);
    }

    // Benachrichtigung anzeigen (optional, falls der Nutzer es sehen soll)
    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: '/icon.png' 
        })
    );
});
