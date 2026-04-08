class SettingsApp {
    constructor() {
        this.settings = this.loadSettings();
        this.init();
    }

    init() {
        this.loadStats();
        this.setupEventListeners();
        this.applySettings();
    }

    loadStats() {
        // Загружаем статистику из localStorage или API
        const reminders = JSON.parse(localStorage.getItem('reminders') || '[]');
        const today = new Date().toISOString().split('T')[0];
        const todayCount = reminders.filter(r => r.date === today).length;
        
        document.getElementById('total-reminders').textContent = reminders.length;
        document.getElementById('today-reminders').textContent = todayCount;
    }

    loadSettings() {
        const defaultSettings = {
            notifications: true,
            sound: true,
            reminderTime: 15,
            quietTimeStart: '22:00',
            quietTimeEnd: '08:00',
            theme: 'light',
            primaryColor: '2E8B57',
            fontSize: 16,
            compactMode: false,
            autosave: true,
            retentionPeriod: '30'
        };

        const saved = localStorage.getItem('appSettings');
        return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    }

    saveSettings() {
        localStorage.setItem('appSettings', JSON.stringify(this.settings));
        this.applySettings();
        this.showNotification('Настройки сохранены', 'success');
    }

    applySettings() {
        // Применяем настройки к интерфейсу
        document.getElementById('notifications-enabled').checked = this.settings.notifications;
        document.getElementById('sound-enabled').checked = this.settings.sound;
        document.getElementById('reminder-time').value = this.settings.reminderTime;
        document.getElementById('reminder-time-value').textContent = `${this.settings.reminderTime} мин`;
        document.getElementById('quiet-time-start').value = this.settings.quietTimeStart;
        document.getElementById('quiet-time-end').value = this.settings.quietTimeEnd;
        document.getElementById('font-size').value = this.settings.fontSize;
        document.getElementById('font-size-value').textContent = `${this.settings.fontSize}px`;
        document.getElementById('autosave').checked = this.settings.autosave;
        document.getElementById('compact-mode').checked = this.settings.compactMode;
        document.getElementById('retention-period').value = this.settings.retentionPeriod;

        // Применяем тему
        document.querySelectorAll('.theme-option').forEach(option => {
            option.classList.remove('selected');
            if (option.dataset.theme === this.settings.theme) {
                option.classList.add('selected');
            }
        });

        // Применяем цвет
        document.querySelectorAll('.color-option').forEach(option => {
            option.classList.remove('selected');
            if (option.dataset.color === this.settings.primaryColor) {
                option.classList.add('selected');
            }
        });

        // Применяем CSS переменные
        this.applyCssVariables();
    }

    applyCssVariables() {
        const root = document.documentElement;
        
        // Применяем основной цвет
        root.style.setProperty('--primary-green', `#${this.settings.primaryColor}`);
        
        // Генерируем оттенки на основе основного цвета
        const primaryColor = this.settings.primaryColor;
        root.style.setProperty('--light-green', this.lightenColor(primaryColor, 30));
        root.style.setProperty('--dark-green', this.darkenColor(primaryColor, 20));
        
        // Применяем размер шрифта
        root.style.setProperty('font-size', `${this.settings.fontSize}px`);
        
        // Применяем компактный режим
        if (this.settings.compactMode) {
            document.body.classList.add('compact-mode');
        } else {
            document.body.classList.remove('compact-mode');
        }
        
        // Применяем тему
        if (this.settings.theme === 'dark') {
            document.body.classList.add('dark-theme');
            document.body.classList.remove('light-theme');
        } else if (this.settings.theme === 'light') {
            document.body.classList.add('light-theme');
            document.body.classList.remove('dark-theme');
        } else {
            // Авто тема - определяем по предпочтениям системы
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.body.classList.add('dark-theme');
                document.body.classList.remove('light-theme');
            } else {
                document.body.classList.add('light-theme');
                document.body.classList.remove('dark-theme');
            }
        }
    }

    lightenColor(color, percent) {
        const num = parseInt(color, 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        
        return `#${(
            0x1000000 +
            (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
            (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
            (B < 255 ? (B < 1 ? 0 : B) : 255)
        )
            .toString(16)
            .slice(1)}`;
    }

    darkenColor(color, percent) {
        const num = parseInt(color, 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        
        return `#${(
            0x1000000 +
            (R > 0 ? (R < 255 ? R : 255) : 0) * 0x10000 +
            (G > 0 ? (G < 255 ? G : 255) : 0) * 0x100 +
            (B > 0 ? (B < 255 ? B : 255) : 0)
        )
            .toString(16)
            .slice(1)}`;
    }

    setupEventListeners() {
        // Переключатели
        document.getElementById('notifications-enabled').addEventListener('change', (e) => {
            this.settings.notifications = e.target.checked;
            this.saveSettings();
        });

        document.getElementById('sound-enabled').addEventListener('change', (e) => {
            this.settings.sound = e.target.checked;
            this.saveSettings();
        });

        document.getElementById('autosave').addEventListener('change', (e) => {
            this.settings.autosave = e.target.checked;
            this.saveSettings();
        });

        document.getElementById('compact-mode').addEventListener('change', (e) => {
            this.settings.compactMode = e.target.checked;
            this.saveSettings();
        });

        // Ползунки
        document.getElementById('reminder-time').addEventListener('input', (e) => {
            this.settings.reminderTime = parseInt(e.target.value);
            document.getElementById('reminder-time-value').textContent = `${this.settings.reminderTime} мин`;
        });

        document.getElementById('reminder-time').addEventListener('change', () => {
            this.saveSettings();
        });

        document.getElementById('font-size').addEventListener('input', (e) => {
            this.settings.fontSize = parseInt(e.target.value);
            document.getElementById('font-size-value').textContent = `${this.settings.fontSize}px`;
        });

        document.getElementById('font-size').addEventListener('change', () => {
            this.saveSettings();
        });

        // Время
        document.getElementById('quiet-time-start').addEventListener('change', (e) => {
            this.settings.quietTimeStart = e.target.value;
            this.saveSettings();
        });

        document.getElementById('quiet-time-end').addEventListener('change', (e) => {
            this.settings.quietTimeEnd = e.target.value;
            this.saveSettings();
        });

        // Выбор темы
        document.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', (e) => {
                this.settings.theme = e.currentTarget.dataset.theme;
                this.saveSettings();
            });
        });

        // Выбор цвета
        document.querySelectorAll('.color-option').forEach(option => {
            option.addEventListener('click', (e) => {
                this.settings.primaryColor = e.currentTarget.dataset.color;
                this.saveSettings();
            });
        });

        // Выпадающий список
        document.getElementById('retention-period').addEventListener('change', (e) => {
            this.settings.retentionPeriod = e.target.value;
            this.saveSettings();
        });

        // Кнопки действий
        document.getElementById('export-data').addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('import-data').addEventListener('click', () => {
            this.importData();
        });

        document.getElementById('clear-cache').addEventListener('click', () => {
            this.clearCache();
        });

        document.getElementById('reset-settings').addEventListener('click', () => {
            this.resetSettings();
        });

        // Автосохранение при потере фокуса
        document.querySelectorAll('input, select').forEach(element => {
            element.addEventListener('blur', () => {
                if (this.settings.autosave) {
                    this.saveSettings();
                }
            });
        });
    }

    exportData() {
        const data = {
            reminders: JSON.parse(localStorage.getItem('reminders') || '[]'),
            settings: this.settings,
            exportDate: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        a.href = url;
        a.download = `calm-reminder-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification('Данные экспортированы', 'success');
    }

    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    
                    if (confirm('Заменить текущие данные импортированными?')) {
                        if (data.reminders) {
                            localStorage.setItem('reminders', JSON.stringify(data.reminders));
                        }
                        
                        if (data.settings) {
                            this.settings = { ...this.settings, ...data.settings };
                            localStorage.setItem('appSettings', JSON.stringify(this.settings));
                            this.applySettings();
                        }
                        
                        this.showNotification('Данные импортированы', 'success');
                        this.loadStats();
                    }
                } catch (error) {
                    this.showNotification('Ошибка импорта: неверный формат файла', 'error');
                }
            };
            
            reader.readAsText(file);
        };
        
        input.click();
    }

    clearCache() {
        if (confirm('Очистить весь кэш приложения? Это не удалит ваши напоминания.')) {
            // Очищаем кэш Service Worker
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(registrations => {
                    registrations.forEach(registration => registration.unregister());
                });
            }
            
            // Очищаем кэш браузера
            caches.keys().then(cacheNames => {
                cacheNames.forEach(cacheName => {
                    caches.delete(cacheName);
                });
            });
            
            this.showNotification('Кэш очищен', 'success');
        }
    }

    resetSettings() {
        if (confirm('Сбросить все настройки к значениям по умолчанию?')) {
            localStorage.removeItem('appSettings');
            this.settings = this.loadSettings();
            this.applySettings();
            this.showNotification('Настройки сброшены', 'success');
        }
    }

    showNotification(message, type = 'info') {
        // Создаем временное уведомление
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            background-color: ${type === 'success' ? 'var(--primary-green)' : type === 'error' ? '#e74c3c' : '#3498db'};
            color: white;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideIn 0.3s ease;
        `;
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
        
        // Добавляем стили для анимации
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.settingsApp = new SettingsApp();
});