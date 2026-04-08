const API_URL = 'http://localhost:5000/api';
let reminders = [];
let currentFilter = 'all';
let notificationCheckInterval = null;

//  ИНИЦИАЛИЗАЦИЯ 

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Главная страница загружена', window.location.port);
    
    // Устанавливаем сегодняшнюю дату
    const today = getTodayString();
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
    
    // Регистрируем Service Worker
    await registerServiceWorker();
    
    // Запрашиваем разрешение на уведомления
    await requestNotificationPermission();
    
    // Загружаем напоминания
    await loadReminders();
    
    // Настраиваем обработчики
    setupEventListeners();
    
    // Запускаем проверку уведомлений
    startNotificationChecker();
    
    // Выводим диагностику
    setTimeout(() => {
        debugNotifications();
    }, 2000);
});

// SERVICE WORKER 

async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        console.warn('Service Worker не поддерживается');
        return null;
    }
    
    try {
        // Путь к sw.js относительно корня сайта
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('✅ Service Worker зарегистрирован:', registration);
        
        // Проверяем статус
        if (registration.active) {
            console.log('SW активен');
        } else if (registration.waiting) {
            console.log('SW ожидает');
        } else if (registration.installing) {
            console.log('SW устанавливается');
        }
        
        return registration;
    } catch (error) {
        console.error('❌ Ошибка регистрации Service Worker:', error);
        return null;
    }
}

// УВЕДОМЛЕНИЯ 

async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.log('Браузер не поддерживает уведомления');
        showToast('Ошибка', 'Ваш браузер не поддерживает уведомления', 'error');
        return false;
    }
    
    const currentPermission = Notification.permission;
    console.log('Текущий статус уведомлений:', currentPermission);
    
    if (currentPermission === 'granted') {
        console.log('Уведомления уже разрешены');
        showToast('Успех', 'Уведомления включены', 'success');
        return true;
    }
    
    if (currentPermission === 'denied') {
        console.log('Уведомления запрещены пользователем');
        showToast('Внимание', 'Разрешите уведомления в настройках браузера', 'warning');
        return false;
    }
    
    // Запрашиваем разрешение
    try {
        const permission = await Notification.requestPermission();
        console.log('Результат запроса разрешения:', permission);
        
        if (permission === 'granted') {
            showToast('Успех', 'Уведомления включены', 'success');
            return true;
        } else {
            showToast('Внимание', 'Уведомления не разрешены', 'warning');
            return false;
        }
    } catch (error) {
        console.error('Ошибка запроса разрешения:', error);
        return false;
    }
}

// Запуск проверки напоминаний
function startNotificationChecker() {
    if (notificationCheckInterval) {
        clearInterval(notificationCheckInterval);
    }
    
    // Проверяем каждую минуту
    notificationCheckInterval = setInterval(() => {
        checkUpcomingReminders();
    }, 60000);
    
    // Первая проверка через 5 секунд
    setTimeout(() => {
        checkUpcomingReminders();
    }, 5000);
    
    console.log('✅ Проверка уведомлений запущена (каждые 60 сек)');
}

// Проверка ближайших напоминаний
async function checkUpcomingReminders() {
    const now = new Date();
    console.log(`🔍 Проверка напоминаний: ${now.toLocaleTimeString()}`);
    
    try {
        const response = await fetch(`${API_URL}/reminders`);
        if (!response.ok) throw new Error('Ошибка загрузки');
        
        const allReminders = await response.json();
        const currentDate = getTodayString();
        
        // Получаем текущее время в минутах
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        
        // Фильтруем сегодняшние напоминания
        const todayReminders = allReminders.filter(r => r.date === currentDate && !r.is_completed);
        
        if (todayReminders.length > 0) {
            console.log(`Сегодняшних напоминаний: ${todayReminders.length}`);
        }
        
        for (const reminder of todayReminders) {
            const [hours, minutes] = reminder.time.split(':');
            const reminderMinutes = parseInt(hours) * 60 + parseInt(minutes);
            const diff = reminderMinutes - currentMinutes;
            
            console.log(`  - ${reminder.time} | ${reminder.title} | diff: ${diff} мин`);
            
            // Если время совпало (плюс-минус 1 минута)
            if (diff <= 1 && diff >= -1) {
                const notificationKey = `notified_${reminder.id}_${currentDate}`;
                if (!localStorage.getItem(notificationKey)) {
                    console.log(`🔔 ОТПРАВКА УВЕДОМЛЕНИЯ: ${reminder.title}`);
                    showUrgentNotification(reminder);
                    localStorage.setItem(notificationKey, 'sent');
                    
                    setTimeout(() => {
                        localStorage.removeItem(notificationKey);
                    }, 3600000);
                }
            }
            // Если через 5 минут или меньше
            else if (diff > 0 && diff <= 5) {
                const notificationKey = `reminder_soon_${reminder.id}_${currentDate}`;
                if (!localStorage.getItem(notificationKey)) {
                    console.log(`⏰ СКОРО НАПОМИНАНИЕ: ${reminder.title} через ${diff} мин`);
                    showSoonNotification(reminder, diff);
                    localStorage.setItem(notificationKey, 'sent');
                    
                    setTimeout(() => {
                        localStorage.removeItem(notificationKey);
                    }, 600000);
                }
            }
        }
    } catch (error) {
        console.error('Ошибка проверки напоминаний:', error);
    }
}

// Срочное уведомление
function showUrgentNotification(reminder) {
    console.log('Показываем срочное уведомление:', reminder.title);
    
    // Браузерное уведомление
    if (Notification.permission === 'granted') {
        const notification = new Notification('⏰ СРОЧНОЕ НАПОМИНАНИЕ!', {
            body: `${reminder.title}\n${reminder.description || ''}\nПрямо сейчас!`,
            icon: '/favicon.ico',
            requireInteraction: true,
            vibrate: [300, 100, 300, 100, 300]
        });
        
        notification.onclick = () => {
            window.focus();
            notification.close();
        };
    }
    
    // Звук
    playNotificationSound('urgent');
    
    // Визуальное уведомление
    showToast('⏰ СРОЧНО!', `${reminder.title} - прямо сейчас!`, 'error');
}

// Предупреждение
function showSoonNotification(reminder, minutesLeft) {
    const minutesText = minutesLeft === 1 ? 'через 1 минуту' : `через ${minutesLeft} минут`;
    
    console.log('Показываем предупреждение:', reminder.title, minutesText);
    
    if (Notification.permission === 'granted') {
        const notification = new Notification('🔔 Скоро напоминание!', {
            body: `${reminder.title}\n${minutesText}`,
            icon: '/favicon.ico',
            vibrate: [200, 100, 200]
        });
        
        notification.onclick = () => {
            window.focus();
            notification.close();
        };
    }
    
    playNotificationSound('normal');
    showToast('🔔 Напоминание', `${reminder.title} ${minutesText}`, 'warning');
}

// Звук уведомления
function playNotificationSound(type = 'normal') {
    try {
        const audio = new Audio();
        if (type === 'urgent') {
            // Используем Web Audio API для простого звука
            const context = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            
            oscillator.connect(gain);
            gain.connect(context.destination);
            
            oscillator.frequency.value = 880;
            gain.gain.value = 0.3;
            
            oscillator.start();
            gain.gain.exponentialRampToValueAtTime(0.00001, context.currentTime + 1);
        }
    } catch (error) {
        console.log('Звук не воспроизведен:', error);
    }
}

// ЗАГРУЗКА НАПОМИНАНИЙ 

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
    const today = getTodayString();
    const todayCount = reminders.filter(r => r.date === today).length;
    
    const totalElem = document.getElementById('sidebar-total');
    const todayElem = document.getElementById('sidebar-today');
    
    if (totalElem) totalElem.textContent = reminders.length;
    if (todayElem) todayElem.textContent = todayCount;
}

function filterReminders() {
    let filtered = [...reminders];
    const today = getTodayString();
    
    switch (currentFilter) {
        case 'today':
            filtered = filtered.filter(r => r.date === today);
            break;
        case 'week':
            const weekLater = new Date();
            weekLater.setDate(weekLater.getDate() + 7);
            const weekLaterStr = formatDateToString(weekLater);
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
    
    remindersList.sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`);
        const dateB = new Date(`${b.date}T${b.time}`);
        return dateA - dateB;
    });
    
    container.innerHTML = remindersList.map(reminder => {
        const isToday = reminder.date === getTodayString();
        
        return `
            <div class="reminder-card ${reminder.priority}" data-id="${reminder.id}">
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
                    <button class="btn-complete" onclick="completeReminder(${reminder.id})" title="Выполнено">
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

// СОЗДАНИЕ НАПОМИНАНИЯ 

async function handleCreateReminder(e) {
    e.preventDefault();
    
    const currentDate = getTodayString();
    const selectedDate = document.getElementById('date').value;
    
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
        showToast('Ошибка', 'Введите заголовок', 'error');
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
            
            document.getElementById('reminderForm').reset();
            document.getElementById('date').value = currentDate;
            
            const nextHour = new Date();
            nextHour.setHours(nextHour.getHours() + 1);
            nextHour.setMinutes(0);
            document.getElementById('time').value = nextHour.toTimeString().substring(0, 5);
            
            await loadReminders();
        } else {
            throw new Error('Ошибка создания');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showToast('Ошибка', 'Не удалось создать напоминание', 'error');
    }
}

// УПРАВЛЕНИЕ 

window.completeReminder = async function(id) {
    if (!confirm('Отметить как выполненное?')) return;
    
    try {
        await fetch(`${API_URL}/reminders/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_completed: true })
        });
        showToast('Выполнено', 'Напоминание отмечено', 'success');
        await loadReminders();
    } catch (error) {
        console.error('Ошибка:', error);
    }
};

window.deleteReminder = async function(id) {
    if (!confirm('Удалить напоминание?')) return;
    
    try {
        await fetch(`${API_URL}/reminders/${id}`, { method: 'DELETE' });
        showToast('Удалено', 'Напоминание удалено', 'success');
        await loadReminders();
    } catch (error) {
        console.error('Ошибка:', error);
    }
};

// НАСТРОЙКА ОБРАБОТЧИКОВ 

function setupEventListeners() {
    const form = document.getElementById('reminderForm');
    if (form) {
        form.addEventListener('submit', handleCreateReminder);
    }
    
    const notifBtn = document.getElementById('enableNotificationsBtn');
    if (notifBtn) {
        notifBtn.addEventListener('click', requestNotificationPermission);
    }
    
    const closeToast = document.querySelector('.toast-close');
    if (closeToast) {
        closeToast.addEventListener('click', () => {
            document.getElementById('notificationToast').classList.add('hidden');
        });
    }
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.dataset.filter;
            filterReminders();
        });
    });
}

// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ 

function getTodayString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDateToString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const today = getTodayString();
    
    if (dateString === today) return 'Сегодня';
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (dateString === formatDateToString(tomorrow)) return 'Завтра';
    
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

function getPriorityText(priority) {
    const priorities = {
        high: '🔴 Высокий',
        medium: '🟡 Средний',
        low: '🟢 Низкий'
    };
    return priorities[priority] || priority;
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
        
        toast.style.borderLeftColor = 
            type === 'error' ? '#e74c3c' : 
            type === 'warning' ? '#f39c12' : 
            type === 'success' ? '#2ecc71' : '#6a5acd';
        
        toast.classList.remove('hidden');
        
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 4000);
    }
}

// ДИАГНОСТИКА 

async function debugNotifications() {
    console.log('=== ДИАГНОСТИКА УВЕДОМЛЕНИЙ ===');
    console.log('1. Notification API:', 'Notification' in window);
    console.log('2. Service Worker:', 'serviceWorker' in navigator);
    console.log('3. Статус разрешения:', Notification.permission);
    
    const registration = await navigator.serviceWorker.getRegistration();
    console.log('4. Service Worker:', registration ? '✅ Зарегистрирован' : '❌ Не зарегистрирован');
    
    if (registration) {
        console.log('   - Активен:', !!registration.active);
    }
    
    const response = await fetch(`${API_URL}/reminders`);
    const reminders = await response.json();
    const today = getTodayString();
    const todayReminders = reminders.filter(r => r.date === today);
    
    console.log(`5. Сегодняшних напоминаний: ${todayReminders.length}`);
    todayReminders.forEach(r => {
        console.log(`   - ${r.time} | ${r.title}`);
    });
    
    console.log('=== ДИАГНОСТИКА ЗАВЕРШЕНА ===');
}

window.debugNotifications = debugNotifications;