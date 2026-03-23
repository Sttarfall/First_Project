class PushNotificationManager {
    constructor() {
        this.publicVapidKey = 'BMZmAZDtin2qBMhnAL0ywmr0NxIR_rP1Uiw83GCbfJDe1wYbUBDetDIuEdkUOkVLm5zobH7bQPNBKBGh4Pt8NnI'; 
        this.subscription = null;
        this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
    }

    // Инициализация Service Worker
    async init() {
        if (!this.isSupported) {
            console.log('Push уведомления не поддерживаются');
            return false;
        }

        try {
            // Регистрация Service Worker
            const registration = await navigator.serviceWorker.register('/service-worker.js', {
                scope: '/'
            });

            // Проверка существующей подписки
            this.subscription = await registration.pushManager.getSubscription();

            if (!this.subscription) {
                // Запрос разрешения и создание подписки
                await this.requestPermission();
                this.subscription = await this.subscribe(registration);
                
                // Отправка подписки на сервер
                await this.sendSubscriptionToServer(this.subscription);
            }

            return true;
        } catch (error) {
            console.error('Ошибка инициализации уведомлений:', error);
            return false;
        }
    }

    // Запрос разрешения
    async requestPermission() {
        const result = await Notification.requestPermission();
        if (result !== 'granted') {
            throw new Error('Разрешение на уведомления не получено');
        }
        return result;
    }

    // Подписка на push-уведомления
    async subscribe(registration) {
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: this.urlBase64ToUint8Array(this.publicVapidKey)
        });
        return subscription;
    }

    // Отправка подписки на сервер
    async sendSubscriptionToServer(subscription) {
        const response = await fetch(`${API_URL}/subscribe`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ subscription })
        });
        return response.json();
    }

    // Вспомогательная функция для конвертации ключа
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    // Отправка тестового уведомления
    async sendTestNotification() {
        await fetch(`${API_URL}/send-notification`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: 'Тестовое уведомление',
                body: 'Привет! Это тестовое уведомление',
                icon: '/icon.png'
            })
        });
    }
}

// Экспорт менеджера
window.PushNotificationManager = PushNotificationManager;