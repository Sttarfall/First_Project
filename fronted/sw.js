const CACHE_NAME = 'calm-reminder-v1';

console.log('Service Worker загружен!');

self.addEventListener('install', event => {
    console.log('SW: Установлен');
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    console.log('SW: Активирован');
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', event => {
    // Логируем запросы для отладки
    console.log('SW: Запрос к', event.request.url);
});

self.addEventListener('push', event => {
    console.log('SW: Получено push-уведомление');
    
    let data = {
        title: 'Тихий Напоминатель',
        body: 'У вас новое напоминание!'
    };
    
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data.body = event.data.text();
        }
    }
    
    const options = {
        body: data.body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        vibrate: [200, 100, 200],
        data: { url: '/' }
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', event => {
    console.log('SW: Клик по уведомлению');
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/')
    );
});