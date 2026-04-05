// index.js - Полная логика главной страницы

const API_URL = 'http://localhost:5000/api';
let reminders = [];
let currentFilter = 'all';
let notificationCheckInterval = null;

// ============ ИНИЦИАЛИЗАЦИЯ ============

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Главная страница загружена');
    
    // Устанавливаем сегодняшнюю дату в правильном формате
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;
    
    const dateInput = document.getElementById('date');
    if (dateInput) {
        dateInput.min = today;
        dateInput.value = today;
    }
    
    // Устанавливаем время по умолчанию (следующий час)
    const nextHour = new Date();
    nextHour.setHours(nextHour.getHours() + 1);
    nextHour.setMinutes(0);
    const timeInput = document.getElementById('time');
    if (timeInput) {
        timeInput.value = nextHour.toTimeString().substring(0, 5);
    }
    
    // Регистрируем Service Worker для уведомлений
    await registerServiceWorker();
    
    // Запрашиваем разрешение на уведомления
    await requestNotificationPermission();
    
    // Загружаем напоминания
    await loadReminders();
    
    // Настраиваем обработчики событий
    setupEventListeners();
    
    // Запускаем проверку уведомлений
    startNotificationChecker();
});

// ============ SERVICE WORKER ============

async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker зарегистрирован:', registration);
            return registration;
        } catch (error) {
            console.error('Ошибка регистрации Service Worker:', error);
        }
    }
    return null;
}

// ============ УВЕДОМЛЕНИЯ ============

async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.log('Браузер не поддерживает уведомления');
        return false;
    }
    
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
        console.log('Уведомления разрешены');
        showToast('Успех', 'Уведомления включены', 'success');
        return true;
    } else if (permission === 'denied') {
        console.log('Уведомления запрещены');
        showToast('Внимание', 'Разрешите уведомления в настройках браузера', 'warning');
        return false;
    }
    return false;
}

// Запуск проверки напоминаний
function startNotificationChecker() {
    // Проверяем каждую минуту
    if (notificationCheckInterval) {
        clearInterval(notificationCheckInterval);
    }
    
    notificationCheckInterval = setInterval(() => {
        checkUpcomingReminders();
    }, 60000); // 60 секунд
    
    // Первая проверка через 5 секунд
    setTimeout(() => {
        checkUpcomingReminders();
    }, 5000);
}

// Проверка ближайших напоминаний
async function checkUpcomingReminders() {
    try {
        const response = await fetch(`${API_URL}/reminders`);
        if (!response.ok) throw new Error('Ошибка загрузки');
        
        const reminders = await response.json();
        const now = new Date();
        
        // Получаем текущую дату в правильном формате
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const currentDate = `${year}-${month}-${day}`;
        
        // Получаем текущее время в минутах
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        
        for (const reminder of reminders) {
            // Проверяем только сегодняшние и невыполненные
            if (reminder.date === currentDate && !reminder.is_completed) {
                const [hours, minutes] = reminder.time.split(':');
                const reminderMinutes = parseInt(hours) * 60 + parseInt(minutes);
                const diff = reminderMinutes - currentMinutes;
                
                // Если время совпадает или прошло не более 1 минуты
                if (diff <= 1 && diff >= -1) {
                    const notificationKey = `notified_${reminder.id}_${currentDate}`;
                    if (!localStorage.getItem(notificationKey)) {
                        showUrgentNotification(reminder);
                        localStorage.setItem(notificationKey, 'sent');
                        
                        // Очищаем отметку через час
                        setTimeout(() => {
                            localStorage.removeItem(notificationKey);
                        }, 3600000);
                    }
                }
                // Если напоминание через 5 минут или меньше
                else if (diff > 0 && diff <= 5) {
                    const notificationKey = `reminder_soon_${reminder.id}_${currentDate}`;
                    if (!localStorage.getItem(notificationKey)) {
                        showSoonNotification(reminder, diff);
                        localStorage.setItem(notificationKey, 'sent');
                        
                        // Очищаем через 10 минут
                        setTimeout(() => {
                            localStorage.removeItem(notificationKey);
                        }, 600000);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Ошибка проверки напоминаний:', error);
    }
}

// Срочное уведомление (прямо сейчас)
function showUrgentNotification(reminder) {
    // Браузерное уведомление
    if (Notification.permission === 'granted') {
        new Notification('⏰ СРОЧНОЕ НАПОМИНАНИЕ!', {
            body: `${reminder.title}\n${reminder.description || ''}\nПрямо сейчас!`,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            requireInteraction: true,
            vibrate: [300, 100, 300, 100, 300],
            silent: false
        });
    }
    
    // Звуковой сигнал
    playNotificationSound('urgent');
    
    // Визуальное уведомление
    showToast('⏰ СРОЧНО!', `${reminder.title} - прямо сейчас!`, 'error');
}

// Предупреждение о скором напоминании
function showSoonNotification(reminder, minutesLeft) {
    let minutesText = '';
    if (minutesLeft === 1) minutesText = 'через 1 минуту';
    else if (minutesLeft <= 5) minutesText = `через ${minutesLeft} минут`;
    
    // Браузерное уведомление
    if (Notification.permission === 'granted') {
        new Notification('🔔 Скоро напоминание!', {
            body: `${reminder.title}\n${reminder.description || ''}\n${minutesText}`,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            vibrate: [200, 100, 200],
            silent: false
        });
    }
    
    // Визуальное уведомление
    showToast('🔔 Напоминание', `${reminder.title} ${minutesText}`, 'warning');
}

// Воспроизведение звука уведомления
function playNotificationSound(type = 'normal') {
    try {
        let soundUrl = '';
        if (type === 'urgent') {
            soundUrl = 'https://www.soundjay.com/misc/sounds/alarm-clock-01.mp3';
        } else {
            soundUrl = 'https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3';
        }
        
        const audio = new Audio(soundUrl);
        audio.volume = 0.3;
        audio.play().catch(e => console.log('Звук не воспроизведен:', e));
    } catch (error) {
        console.log('Ошибка воспроизведения звука:', error);
    }
}

// ============ ЗАГРУЗКА И ОТОБРАЖЕНИЕ ============

async function loadReminders() {
    try {
        const response = await fetch(`${API_URL}/reminders`);
        if (!response.ok) throw new Error('Ошибка загрузки');
        
        reminders = await response.json();
        console.log(`Загружено ${reminders.length} напоминаний`);
        
        updateSidebarStats();
        filterReminders();
        
    } catch (error) {
        console.error('Ошибка:', error);
        showToast('Ошибка', 'Не удалось загрузить напоминания', 'error');
    }
}

function updateSidebarStats() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;
    
    const todayCount = reminders.filter(r => r.date === today).length;
    
    const totalElem = document.getElementById('sidebar-total');
    const todayElem = document.getElementById('sidebar-today');
    
    if (totalElem) totalElem.textContent = reminders.length;
    if (todayElem) todayElem.textContent = todayCount;
}

function filterReminders() {
    let filtered = [...reminders];
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;
    
    switch (currentFilter) {
        case 'today':
            filtered = filtered.filter(r => r.date === today);
            break;
        case 'week':
            const weekLater = new Date();
            weekLater.setDate(weekLater.getDate() + 7);
            const weekLaterStr = `${weekLater.getFullYear()}-${String(weekLater.getMonth() + 1).padStart(2, '0')}-${String(weekLater.getDate()).padStart(2, '0')}`;
            filtered = filtered.filter(r => r.date >= today && r.date <= weekLaterStr);
            break;
        default:
            break;
    }
    
    displayReminders(filtered);
}

function displayReminders(remindersList) {
    const container = document.getElementById('remindersContainer');
    
    if (!container) return;
    
    if (remindersList.length === 0) {
        container.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-calendar-check"></i>
                <p>Нет напоминаний</p>
                <small>Создайте новое напоминание выше</small>
            </div>
        `;
        return;
    }
    
    // Сортировка по дате и времени
    remindersList.sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`);
        const dateB = new Date(`${b.date}T${b.time}`);
        return dateA - dateB;
    });
    
    container.innerHTML = remindersList.map(reminder => {
        const isToday = reminder.date === getTodayString();
        const isPast = reminder.date < getTodayString();
        
        return `
            <div class="reminder-card ${reminder.priority} ${isPast ? 'past' : ''}" data-id="${reminder.id}">
                <div class="reminder-content">
                    <div class="reminder-title">
                        ${escapeHtml(reminder.title)}
                        <span class="priority-badge ${reminder.priority}">
                            ${getPriorityText(reminder.priority)}
                        </span>
                        ${isToday ? '<span class="today-badge">Сегодня</span>' : ''}
                    </div>
                    ${reminder.description ? `<div class="reminder-description">${escapeHtml(reminder.description)}</div>` : ''}
                    <div class="reminder-meta">
                        <span><i class="fas fa-calendar"></i> ${formatDate(reminder.date)}</span>
                        <span><i class="fas fa-clock"></i> ${reminder.time}</span>
                    </div>
                </div>
                <div class="reminder-actions">
                    <button class="btn-complete" onclick="completeReminder(${reminder.id})" title="Отметить как выполненное">
                        <i class="fas fa-check-circle"></i>
                    </button>
                    <button class="btn-delete" onclick="deleteReminder(${reminder.id})" title="Удалить">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// ============ СОЗДАНИЕ НАПОМИНАНИЯ ============

async function handleCreateReminder(e) {
    e.preventDefault();
    
    // Получаем текущую дату
    const currentDate = getTodayString();
    const selectedDate = document.getElementById('date').value;
    
    // Проверка, что дата не в прошлом
    if (selectedDate < currentDate) {
        showToast('Ошибка', 'Нельзя создать напоминание в прошлом', 'error');
        return;
    }
    
    const reminder = {
        title: document.getElementById('title').value.trim(),
        date: selectedDate,
        time: document.getElementById('time').value,
        description: document.getElementById('description').value.trim(),
        priority: document.getElementById('priority').value
    };
    
    if (!reminder.title) {
        showToast('Ошибка', 'Введите заголовок напоминания', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/reminders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reminder)
        });
        
        if (response.ok) {
            showToast('Успех', `Напоминание "${reminder.title}" создано`, 'success');
            
            // Очищаем форму
            document.getElementById('reminderForm').reset();
            document.getElementById('date').value = currentDate;
            
            // Устанавливаем следующий час
            const nextHour = new Date();
            nextHour.setHours(nextHour.getHours() + 1);
            nextHour.setMinutes(0);
            document.getElementById('time').value = nextHour.toTimeString().substring(0, 5);
            document.getElementById('priority').value = 'medium';
            
            await loadReminders();
        } else {
            throw new Error('Ошибка создания');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showToast('Ошибка', 'Не удалось создать напоминание', 'error');
    }
}

// ============ УПРАВЛЕНИЕ НАПОМИНАНИЯМИ ============

window.completeReminder = async function(id) {
    if (!confirm('Отметить это напоминание как выполненное?')) return;
    
    try {
        const response = await fetch(`${API_URL}/reminders/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_completed: true })
        });
        
        if (response.ok) {
            showToast('Выполнено', 'Напоминание отмечено как выполненное', 'success');
            await loadReminders();
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showToast('Ошибка', 'Не удалось обновить напоминание', 'error');
    }
};

window.deleteReminder = async function(id) {
    if (!confirm('Удалить это напоминание?')) return;
    
    try {
        const response = await fetch(`${API_URL}/reminders/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showToast('Удалено', 'Напоминание удалено', 'success');
            await loadReminders();
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showToast('Ошибка', 'Не удалось удалить напоминание', 'error');
    }
};

// ============ НАСТРОЙКА ОБРАБОТЧИКОВ ============

function setupEventListeners() {
    // Форма создания
    const form = document.getElementById('reminderForm');
    if (form) {
        form.addEventListener('submit', handleCreateReminder);
    }
    
    // Кнопка уведомлений
    const notifBtn = document.getElementById('enableNotificationsBtn');
    if (notifBtn) {
        notifBtn.addEventListener('click', requestNotificationPermission);
    }
    
    // Закрытие уведомления
    const closeToast = document.querySelector('.toast-close');
    if (closeToast) {
        closeToast.addEventListener('click', () => {
            document.getElementById('notificationToast').classList.add('hidden');
        });
    }
    
    // Фильтры
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => 
                b.classList.remove('active')
            );
            e.target.classList.add('active');
            currentFilter = e.target.dataset.filter;
            filterReminders();
        });
    });
}

// ============ ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ============

function getTodayString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const today = getTodayString();
    
    if (dateString === today) {
        return 'Сегодня';
    }
    
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    
    if (dateString === tomorrowStr) {
        return 'Завтра';
    }
    
    return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long'
    });
}

function getPriorityText(priority) {
    const priorities = {
        high: '🔴 Высокий',
        medium: '🟡 Средний',
        low: '🟢 Низкий'
    };
    return priorities[priority] || priority;
}

function getPriorityIcon(priority) {
    const icons = {
        high: '🔴',
        medium: '🟡',
        low: '🟢'
    };
    return icons[priority] || '⚪';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(title, message, type = 'info') {
    const toast = document.getElementById('notificationToast');
    const msgElem = document.getElementById('toastMessage');
    const titleElem = toast?.querySelector('strong');
    
    if (toast && msgElem) {
        if (titleElem) titleElem.textContent = title;
        msgElem.textContent = message;
        
        // Меняем цвет в зависимости от типа
        toast.style.borderLeftColor = 
            type === 'error' ? '#e74c3c' : 
            type === 'warning' ? '#f39c12' : 
            type === 'success' ? '#2ecc71' : '#6a5acd';
        
        toast.classList.remove('hidden');
        
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 4000);
    }
    
    // Также показываем браузерное уведомление для важных сообщений
    if (type === 'error' || type === 'warning') {
        if (Notification.permission === 'granted') {
            new Notification(title, { body: message });
        }
    }
}