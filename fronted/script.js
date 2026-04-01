// Конфигурация
const API_URL = 'http://localhost:5000/api';

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Приложение загружено');
    
    // Установка даты по умолчанию
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
    document.getElementById('date').min = today;
    
    // Установка времени по умолчанию (следующий час)
    const nextHour = new Date();
    nextHour.setHours(nextHour.getHours() + 1);
    const timeString = nextHour.toTimeString().substring(0, 5);
    document.getElementById('time').value = timeString;
    
    // Загрузка напоминаний
    await loadReminders();
});

// Обработка формы
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
            showNotification('Успех!', `Напоминание "${reminder.title}" создано`);
            e.target.reset();
            
            // Сброс к значениям по умолчанию
            document.getElementById('date').value = new Date().toISOString().split('T')[0];
            const nextHour = new Date();
            nextHour.setHours(nextHour.getHours() + 1);
            document.getElementById('time').value = nextHour.toTimeString().substring(0, 5);
            
            await loadReminders();
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Ошибка сервера');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('Ошибка', error.message || 'Не удалось создать напоминание');
        
        // Временное сохранение в localStorage
        saveToLocalStorage(reminder);
        displayLocalReminders();
    }
});

// Загрузка напоминаний
async function loadReminders() {
    try {
        const response = await fetch(`${API_URL}/reminders`);
        if (response.ok) {
            const reminders = await response.json();
            displayReminders(reminders);
            updateStats(reminders);
        } else {
            throw new Error('Ошибка загрузки');
        }
    } catch (error) {
        console.error('Ошибка загрузки с сервера:', error);
        displayLocalReminders();
    }
}

// Отображение напоминаний
function displayReminders(reminders) {
    const container = document.getElementById('reminders-container');
    
    if (!reminders || reminders.length === 0) {
        container.innerHTML = '<div class="loading">Нет напоминаний. Создайте первое!</div>';
        return;
    }
    
    container.innerHTML = '';
    
    reminders.forEach(reminder => {
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
        
        div.querySelector('.btn-delete').addEventListener('click', () => deleteReminder(reminder.id));
        div.querySelector('.btn-complete').addEventListener('click', () => completeReminder(reminder.id));
        
        container.appendChild(div);
    });
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
                await loadReminders();
            }
        } catch (error) {
            console.error('Ошибка удаления:', error);
            deleteFromLocalStorage(id);
            displayLocalReminders();
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
            await loadReminders();
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
}

// Функции для работы с localStorage (резервные)
function saveToLocalStorage(reminder) {
    const reminders = JSON.parse(localStorage.getItem('reminders') || '[]');
    reminder.id = Date.now();
    reminders.push(reminder);
    localStorage.setItem('reminders', JSON.stringify(reminders));
}

function deleteFromLocalStorage(id) {
    const reminders = JSON.parse(localStorage.getItem('reminders') || '[]');
    const filtered = reminders.filter(r => r.id !== id);
    localStorage.setItem('reminders', JSON.stringify(filtered));
}

function displayLocalReminders() {
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
    
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 5000);
    
    // Браузерные уведомления
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
            body: message
        });
    }
}

// Запрос разрешения на уведомления
document.getElementById('enable-notifications').addEventListener('click', async () => {
    if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
            showNotification('Уведомления включены', 'Вы будете получать уведомления о напоминаниях');
        } else if (permission === 'denied') {
            alert('Уведомления заблокированы. Разрешите их в настройках браузера.');
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
        
        const filter = this.textContent;
        if (filter === 'Все') {
            loadReminders();
        } else if (filter === 'Сегодня') {
            filterReminders('today');
        } else if (filter === 'Неделя') {
            filterReminders('week');
        }
    });
});

async function filterReminders(type) {
    try {
        let url = `${API_URL}/reminders`;
        
        if (type === 'today') {
            url = `${API_URL}/reminders/today`;
        } else if (type === 'week') {
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