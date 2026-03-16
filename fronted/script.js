// Базовый URL для API
const API_URL = 'http://localhost:5000/api';

// Запрос нразрешения на уведомления 
document.getElementById('enable-notifications').addEventListener('click', () => {
    if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
            if (permission == 'granted') {
                showNotification('Уведомления включены!', 'Вы будете пролучать напоминания вовремя.');
            }
        });
    }
});

// Обработка формы 
document.getElementById('reminder-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const reminder = {
        title: document.getElementById('title').value,
        date: document.getElementById('date').value,
        time: document.getElementById('time').value,
        description: document.getElementById('description').value,
        priority: document.getElementById('priority').value,
    };

    try {
        // Здесь будет отправка на сервер
        console.log('Создание напоминания:', reminder);

        //Временное сохранение в localStorage
        saveToLocalStorage(reminder);

        showNotification('Напоминание создано!', `"${reminder.title}" на ${reminder.date}`);

        //Очистка формы 
        e.target.reset();

        //Обновление списка 
        loadReminders();
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка при создании напоминания');
    }
});

//Сохранение в localStorage 
function saveToLocalStorage(reminder) {
    const reminders = JSON.parse(localStorage.getItem('reminders') || '[]');
    reminder.id = Date.now();
    reminders.push(reminder);
    localStorage.setItem('reminders', JSON.stringify(reminders));
}

//Загрузка напоминаний 
function loadReminders() {
    const reminders = JSON.parse(localStorage.getItem('reminders') || '[]');
    const container = document.getElementById('reminders-container');

    //Обновление статистики 
    document.getElementById('total-reminders').textContent = reminders.length;

    const today = new Date().toISOString().split('T')[0];
    const todayCount = reminders.filter(r => r.date === today).length;
    document.getElementById('today-reminders').textContent = todayCount;

    if (reminders.length === 0) {
        container.innerHTML = '<div class="loading">Нет напоминаний</div>';
        return;
    }

    container.innerHTML = '';

    //Сортировка по дате
    reminders.sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time));

    reminders.forEach(reminder => {
        const reminderElement = createReminderElement(reminder);
        container.appendChild(reminderElement);
    });

    //Проверка напоминаний на сегодня 
    checkTodayReminders(reminders);
}

//Создание элемента напоминания
function createReminderElement(reminder) {
    const div = document.createElement('div');
    div.className = `reminder-item ${reminder.priority}`;

    const date = new Date(reminder.date + 'T' + reminder.time);
    const formattedDate = date.toLocaleDateString('ru-Ru', {
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
            <button class="btn-edit" title="Редактировать"><i class="fas fa-edit"></i></button>
            <button class="btn-delete" title="Удалить"><i class="fas fa-trash"></i></button>
        </div>
    `;

    //Обработчики длЯ кнопок 
    div.querySelector('.btn-delete').addEventListener('click', () => deleteReminder(reminder.id));

    return div;
}

//Удаление напоминания 
function deleteReminder(id) {
    const reminders = JSON.parse(localStorage.getItem('reminders') || '[]');
    const filtered = reminders.filter(r => r.id !== id);
    localStorage.setItem('reminders', JSON.stringify(filtered));
    loadReminders();
}

//Проверка напоминаний на сегодня
function checkTodayReminders(reminders) {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();

    reminders.forEach(reminder => {
        if (reminder.date == today) {
            const reminderTime = new Date(today + 'T' + reminder.time);
            const timeDiff = reminderTime - now;

            //Если напоминание в течение часа 
            if (timeDiff > 0 && timeDiff < 3600000) {
                const minutes = Math.floor(timeDiff / 60000);
                showNotification(
                    'Скоро напоминание!',
                    `"${reminder.title}" через ${minutes} минут`
                );
            }
        }
    });
}

//Показать уведомление 
function showNotification(title, message) {
    const notification = document.getElementById('notification');
    const text = document.getElementById('notification-text');

    text.textContent = `${title}: ${message}`;
    notification.classList.remove('hidden');

    //Показать браузерное уведомление
    if (Notification.permission === 'granted') {
        new Notification(title, {
            body: message,
            icon: '/favicon.ico'
        });
    }
}

//Закрыть уведомление 
document.getElementById('close-notification').addEventListener('click', () => {
    document.getElementById('notification').classList.add('hidden');
});

//Фильтры
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
    });
});

//Установить минимальную дату как сегодня 
document.getElementById('date').min = new Date().toISOString().split('T')[0];

document.addEventListener('DOMContentLoaded', () => {
    loadReminders();

    setInterval(() => {
        const reminders = JSON.parse(localStorage.getItem('reminders') || '[]');
        checkTodayReminders(reminders);
    }, 300000);
});