// Конфигурация
const API_URL = 'http://localhost:5000/api';

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Приложение загружено');
    
    // Проверка поддержки Service Worker
    if ('serviceWorker' in navigator) {
        try {
            await navigator.serviceWorker.register('/service-worker.js');
            console.log('Service Worker зарегистрирован');
        } catch (error) {
            console.error('Ошибка регистрации Service Worker:', error);
        }
    }
    
    // Загрузка напоминаний
    await loadRemindersFromServer();
    
    // Установка минимальной даты
    document.getElementById('date').min = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = new Date().toISOString().split('T')[0];
    
    // Установка текущего времени (округление до ближайших 15 минут)
    const now = new Date();
    const minutes = Math.ceil(now.getMinutes() / 15) * 15;
    now.setMinutes(minutes);
    const timeString = now.toTimeString().substring(0, 5);
    document.getElementById('time').value = timeString;
});

// Обработка формы создания напоминания
document.getElementById('reminder-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const reminder = {
        title: document.getElementById('title').value,
        date: document.getElementById('date').value,
        time: document.getElementById('time').value,
        description: document.getElementById('description').value,
        priority: document.getElementById('priority').value
    };
    
    try {
        const response = await fetch(`${API_URL}/reminders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(reminder)
        });
        
        if (response.ok) {
            const result = await response.json();
            showNotification('Успех!', `Напоминание "${reminder.title}" создано`);
            document.getElementById('reminder-form').reset();
            
            // Сброс значений к текущим
            document.getElementById('date').value = new Date().toISOString().split('T')[0];
            document.getElementById('time').value = new Date().toTimeString().substring(0, 5);
            
            await loadRemindersFromServer();
        } else {
            throw new Error('Ошибка сервера');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('Ошибка', 'Не удалось создать напоминание');
        
        // Временное сохранение в localStorage
        saveToLocalStorage(reminder);
        loadReminders();
    }
});

// Загрузка напоминаний с сервера
async function loadRemindersFromServer() {
    try {
        const response = await fetch(`${API_URL}/reminders`);
        if (response.ok) {
            const reminders = await response.json();
            displayReminders(reminders);
            updateStats(reminders);
        } else {
            throw new Error('Ошибка загрузки с сервера');
        }
    } catch (error) {
        console.error('Ошибка загрузки с сервера:', error);
        // Если сервер не доступен, загружаем из localStorage
        loadReminders();
    }
}

// Отображение напоминаний
function displayReminders(reminders) {
    const container = document.getElementById('reminders-container');
    
    if (!reminders || reminders.length === 0) {
        container.innerHTML = '<div class="loading">Нет напоминаний</div>';
        return;
    }
    
    // Сортировка по дате и времени
    reminders.sort((a, b) => {
        const dateA = new Date(a.date + 'T' + a.time);
        const dateB = new Date(b.date + 'T' + b.time);
        return dateA - dateB;
    });
    
    container.innerHTML = '';
    
    reminders.forEach(reminder => {
        const reminderElement = createReminderElement(reminder);
        container.appendChild(reminderElement);
    });
}

// Создание элемента напоминания
function createReminderElement(reminder) {
    const div = document.createElement('div');
    div.className = `reminder-item ${reminder.priority}`;
    div.dataset.id = reminder.id;
    
    const date = new Date(reminder.date + 'T' + reminder.time);
    const formattedDate = date.toLocaleDateString('ru-RU', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    div.innerHTML = `
        <div class="reminder-content">
            <h4>${reminder.title}</h4>
            <p>${reminder.description || ''}</p>
            <div class="reminder-date">
                <i class="fas fa-calendar"></i>
                <span>${formattedDate}</span>
                <i class="fas fa-clock"></i>
                <span>${reminder.time}</span>
            </div>
        </div>
        <div class="reminder-actions">
            <button class="btn-complete" title="Выполнить">
                <i class="fas fa-check"></i>
            </button>
            <button class="btn-delete" title="Удалить">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    
    // Обработчики для кнопок
    div.querySelector('.btn-delete').addEventListener('click', () => deleteReminder(reminder.id));
    div.querySelector('.btn-complete').addEventListener('click', () => completeReminder(reminder.id));
    
    return div;
}

// Удаление напоминания
async function deleteReminder(id) {
    if (confirm('Удалить это напоминание?')) {
        try {
            const response = await fetch(`${API_URL}/reminders/${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                showNotification('Удалено', 'Напоминание удалено');
                await loadRemindersFromServer();
            }
        } catch (error) {
            console.error('Ошибка удаления:', error);
            // Если сервер не доступен, удаляем из localStorage
            const reminders = JSON.parse(localStorage.getItem('reminders') || '[]');
            const filtered = reminders.filter(r => r.id !== id);
            localStorage.setItem('reminders', JSON.stringify(filtered));
            loadReminders();
        }
    }
}

// Отметить как выполненное
async function completeReminder(id) {
    try {
        const response = await fetch(`${API_URL}/reminders/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ is_completed: true })
        });
        
        if (response.ok) {
            showNotification('Выполнено!', 'Напоминание отмечено как выполненное');
            await loadRemindersFromServer();
        }
    } catch (error) {
        console.error('Ошибка:', error);
    }
}

// Обновление статистики
function updateStats(reminders) {
    if (!reminders) return;
    
    const today = new Date().toISOString().split('T')[0];
    const todayCount = reminders.filter(r => r.date === today).length;
    
    document.getElementById('total-reminders').textContent = reminders.length;
    document.getElementById('today-reminders').textContent = todayCount;
    
    // Проверка на сегодняшние напоминания
    checkTodayReminders(reminders);
}

// Проверка сегодняшних напоминаний
function checkTodayReminders(reminders) {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    
    reminders.forEach(reminder => {
        if (reminder.date === today && !reminder.is_completed) {
            const reminderTime = new Date(today + 'T' + reminder.time);
            const timeDiff = reminderTime - now;
            
            // Если напоминание в течение 30 минут
            if (timeDiff > 0 && timeDiff < 30 * 60 * 1000) {
                const minutes = Math.floor(timeDiff / (60 * 1000));
                showNotification(
                    'Скоро напоминание!',
                    `"${reminder.title}" через ${minutes} минут`
                );
            }
        }
    });
}

// Функции для работы с localStorage (резервные)
function saveToLocalStorage(reminder) {
    const reminders = JSON.parse(localStorage.getItem('reminders') || '[]');
    reminder.id = Date.now();
    reminders.push(reminder);
    localStorage.setItem('reminders', JSON.stringify(reminders));
}

function loadReminders() {
    const reminders = JSON.parse(localStorage.getItem('reminders') || '[]');
    displayReminders(reminders);
    updateStats(reminders);
}

// Функция показа уведомлений
function showNotification(title, message) {
    const notification = document.getElementById('notification');
    const text = document.getElementById('notification-text');
    
    text.textContent = `${title}: ${message}`;
    notification.classList.remove('hidden');
    
    // Автоматическое скрытие через 5 секунд
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 5000);
    
    // Браузерные уведомления
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
            body: message,
            icon: '/icons/icon-192.png'
        });
    }
}

// Запрос разрешения на уведомления
document.getElementById('enable-notifications').addEventListener('click', async () => {
    if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
            showNotification('Уведомления включены', 'Вы будете получать уведомления о напоминаниях');
            
            // Регистрация Service Worker для Push уведомлений
            if ('serviceWorker' in navigator) {
                try {
                    const registration = await navigator.serviceWorker.ready;
                    // Здесь можно добавить подписку на Push уведомления
                    console.log('Готов к Push уведомлениям');
                } catch (error) {
                    console.error('Ошибка Service Worker:', error);
                }
            }
        }
    } else {
        alert('Ваш браузер не поддерживает уведомления');
    }
});

// Закрыть уведомление
document.getElementById('close-notification').addEventListener('click', () => {
    document.getElementById('notification').classList.add('hidden');
});

// Фильтры
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        filterReminders(this.textContent);
    });
});

async function filterReminders(filter) {
    try {
        let url = `${API_URL}/reminders`;
        
        if (filter === 'Сегодня') {
            url = `${API_URL}/reminders/today`;
        } else if (filter === 'Неделя') {
            const today = new Date();
            const weekLater = new Date(today);
            weekLater.setDate(today.getDate() + 7);
            
            const start = today.toISOString().split('T')[0];
            const end = weekLater.toISOString().split('T')[0];
            
            url = `${API_URL}/reminders/range?start=${start}&end=${end}`;
        }
        
        const response = await fetch(url);
        if (response.ok) {
            const reminders = await response.json();
            displayReminders(reminders);
        }
    } catch (error) {
        console.error('Ошибка фильтрации:', error);
    }
}

// Периодическая проверка напоминаний
setInterval(async () => {
    await loadRemindersFromServer();
}, 300000); // Каждые 5 минут