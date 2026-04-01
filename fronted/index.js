// index.js - Логика главной страницы

// Конфигурация
const API_URL = 'http://localhost:5000/api';

// Состояние приложения
let reminders = [];
let currentFilter = 'all';

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Главная страница загружена');
    
    // Устанавливаем минимальную дату
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('date');
    if (dateInput) {
        dateInput.min = today;
        dateInput.value = today;
    }
    
    // Устанавливаем время по умолчанию (следующий час)
    const nextHour = new Date();
    nextHour.setHours(nextHour.getHours() + 1);
    const timeInput = document.getElementById('time');
    if (timeInput) {
        timeInput.value = nextHour.toTimeString().substring(0, 5);
    }
    
    // Загружаем напоминания
    await loadReminders();
    
    // Настраиваем обработчики
    setupEventListeners();
});

// Настройка обработчиков событий
function setupEventListeners() {
    // Форма создания напоминания
    const form = document.getElementById('reminder-form');
    if (form) {
        form.addEventListener('submit', handleCreateReminder);
    }
    
    // Кнопка включения уведомлений
    const notifBtn = document.getElementById('enable-notifications');
    if (notifBtn) {
        notifBtn.addEventListener('click', enableNotifications);
    }
    
    // Кнопка закрытия уведомления
    const closeBtn = document.getElementById('close-notification');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            document.getElementById('notification').classList.add('hidden');
        });
    }
    
    // Фильтры
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Обновляем активную кнопку
            document.querySelectorAll('.filter-btn').forEach(b => 
                b.classList.remove('active')
            );
            e.target.classList.add('active');
            
            // Применяем фильтр
            currentFilter = e.target.dataset.filter;
            filterReminders();
        });
    });
    
    // Автоматическое обновление каждые 5 минут
    setInterval(loadReminders, 300000);
}

// Загрузка напоминаний с сервера
async function loadReminders() {
    try {
        const response = await fetch(`${API_URL}/reminders`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        reminders = await response.json();
        console.log(`Загружено ${reminders.length} напоминаний`);
        
        updateStats();
        filterReminders();
        
        // Проверяем сегодняшние напоминания
        checkTodayReminders();
        
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        showNotification('Ошибка', 'Не удалось загрузить напоминания', 'error');
    }
}

// Обновление статистики
function updateStats() {
    const today = new Date().toISOString().split('T')[0];
    const todayCount = reminders.filter(r => r.date === today).length;
    
    const totalCountElem = document.getElementById('total-reminders');
    const todayCountElem = document.getElementById('today-reminders');
    
    if (totalCountElem) totalCountElem.textContent = reminders.length;
    if (todayCountElem) todayCountElem.textContent = todayCount;
}

// Фильтрация напоминаний
function filterReminders() {
    let filtered = [...reminders];
    
    switch (currentFilter) {
        case 'today':
            const today = new Date().toISOString().split('T')[0];
            filtered = filtered.filter(r => r.date === today);
            break;
        case 'week':
            const todayDate = new Date();
            const weekLater = new Date(todayDate);
            weekLater.setDate(todayDate.getDate() + 7);
            filtered = filtered.filter(r => {
                const reminderDate = new Date(r.date);
                return reminderDate >= todayDate && reminderDate <= weekLater;
            });
            break;
        default:
            // 'all' - без фильтрации
            break;
    }
    
    displayReminders(filtered);
}

// Отображение напоминаний
function displayReminders(remindersToShow) {
    const container = document.getElementById('reminders-container');
    
    if (!container) return;
    
    if (remindersToShow.length === 0) {
        container.innerHTML = `
            <div class="loading">
                <i class="fas fa-calendar-check"></i> 
                Нет напоминаний
            </div>
        `;
        return;
    }
    
    // Сортировка по дате и времени
    remindersToShow.sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`);
        const dateB = new Date(`${b.date}T${b.time}`);
        return dateA - dateB;
    });
    
    container.innerHTML = remindersToShow.map(reminder => `
        <div class="reminder-item ${reminder.priority}" data-id="${reminder.id}">
            <div class="reminder-content">
                <h4>${escapeHtml(reminder.title)}</h4>
                ${reminder.description ? `<p>${escapeHtml(reminder.description)}</p>` : ''}
                <div class="reminder-date">
                    <i class="fas fa-calendar-alt"></i>
                    <span>${formatDate(reminder.date)}</span>
                    <i class="fas fa-clock"></i>
                    <span>${reminder.time}</span>
                    <i class="fas fa-flag"></i>
                    <span>${getPriorityText(reminder.priority)}</span>
                </div>
            </div>
            <div class="reminder-actions">
                <button class="btn-complete" onclick="completeReminder(${reminder.id})" 
                        title="Отметить как выполненное">
                    <i class="fas fa-check-circle"></i>
                </button>
                <button class="btn-delete" onclick="deleteReminder(${reminder.id})" 
                        title="Удалить">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Создание нового напоминания
async function handleCreateReminder(e) {
    e.preventDefault();
    
    const reminder = {
        title: document.getElementById('title').value.trim(),
        date: document.getElementById('date').value,
        time: document.getElementById('time').value,
        description: document.getElementById('description').value.trim(),
        priority: document.getElementById('priority').value
    };
    
    if (!reminder.title) {
        showNotification('Ошибка', 'Введите заголовок напоминания', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/reminders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(reminder)
        });
        
        if (response.ok) {
            showNotification('Успех', `Напоминание "${reminder.title}" создано`, 'success');
            
            // Очищаем форму
            document.getElementById('reminder-form').reset();
            document.getElementById('date').value = new Date().toISOString().split('T')[0];
            
            // Перезагружаем список
            await loadReminders();
        } else {
            throw new Error('Ошибка создания');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('Ошибка', 'Не удалось создать напоминание', 'error');
    }
}

// Отметить напоминание как выполненное
window.completeReminder = async function(id) {
    if (confirm('Отметить это напоминание как выполненное?')) {
        try {
            const response = await fetch(`${API_URL}/reminders/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ is_completed: true })
            });
            
            if (response.ok) {
                showNotification('Выполнено', 'Напоминание отмечено как выполненное', 'success');
                await loadReminders();
            }
        } catch (error) {
            console.error('Ошибка:', error);
            showNotification('Ошибка', 'Не удалось обновить напоминание', 'error');
        }
    }
};

// Удалить напоминание
window.deleteReminder = async function(id) {
    if (confirm('Удалить это напоминание?')) {
        try {
            const response = await fetch(`${API_URL}/reminders/${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                showNotification('Удалено', 'Напоминание удалено', 'success');
                await loadReminders();
            }
        } catch (error) {
            console.error('Ошибка:', error);
            showNotification('Ошибка', 'Не удалось удалить напоминание', 'error');
        }
    }
};

// Проверка сегодняшних напоминаний
function checkTodayReminders() {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    
    reminders.forEach(reminder => {
        if (reminder.date === today && !reminder.is_completed) {
            const reminderTime = new Date(`${today}T${reminder.time}`);
            const timeDiff = reminderTime - now;
            
            // Если напоминание в течение 30 минут
            if (timeDiff > 0 && timeDiff < 30 * 60 * 1000) {
                const minutes = Math.floor(timeDiff / (60 * 1000));
                showNotification(
                    'Скоро напоминание!',
                    `"${reminder.title}" через ${minutes} минут`,
                    'info'
                );
            }
        }
    });
}

// Включение уведомлений
async function enableNotifications() {
    if (!('Notification' in window)) {
        alert('Ваш браузер не поддерживает уведомления');
        return;
    }
    
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
        showNotification('Уведомления включены', 'Вы будете получать уведомления о напоминаниях', 'success');
    } else if (permission === 'denied') {
        alert('Уведомления заблокированы. Разрешите их в настройках браузера.');
    }
}

// Показать уведомление
function showNotification(title, message, type = 'info') {
    // Показываем в интерфейсе
    const notification = document.getElementById('notification');
    const text = document.getElementById('notification-text');
    
    if (notification && text) {
        text.textContent = `${title}: ${message}`;
        notification.classList.remove('hidden');
        
        // Автоматическое скрытие через 5 секунд
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 5000);
    }
    
    // Браузерное уведомление
    if (Notification.permission === 'granted') {
        new Notification(title, {
            body: message,
            icon: '/favicon.ico'
        });
    }
}

// Вспомогательные функции
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
    });
}

function getPriorityText(priority) {
    const priorities = {
        high: 'Высокий 🔴',
        medium: 'Средний 🟡',
        low: 'Низкий 🟢'
    };
    return priorities[priority] || priority;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}