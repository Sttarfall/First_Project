// Service Worker для уведомлений
const CACHE_NAME = 'calm-reminder-v1';

self.addEventListener('install', event => {
    console.log('Service Worker установлен');
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    console.log('Service Worker активирован');
    event.waitUntil(clients.claim());
});

self.addEventListener('push', event => {
    const data = event.data ? event.data.json() : {};
    const options = {
        body: data.body || 'У вас новое напоминание!',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        vibrate: [200, 100, 200],
        data: {
            url: data.url || '/'
        },
        actions: [
            {
                action: 'open',
                title: 'Открыть'
            },
            {
                action: 'close',
                title: 'Закрыть'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title || 'Тихий Напоминатель', options)
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    if (event.action === 'open') {
        event.waitUntil(
            clients.openWindow(event.notification.data.url || '/')
        );
    }
});