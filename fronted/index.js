// index.js - Логика главной страницы

const API_URL = 'http://localhost:5000/api';
let reminders = [];
let currentFilter = 'all';

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Главная страница загружена');
    
    // Устанавливаем дату по умолчанию
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('date');
    if (dateInput) {
        dateInput.min = today;
        dateInput.value = today;
    }
    
    // Устанавливаем время по умолчанию
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
    // Форма создания
    const form = document.getElementById('reminderForm');
    if (form) {
        form.addEventListener('submit', handleCreateReminder);
    }
    
    // Кнопка уведомлений
    const notifBtn = document.getElementById('enableNotificationsBtn');
    if (notifBtn) {
        notifBtn.addEventListener('click', enableNotifications);
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

// Загрузка напоминаний
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

// Обновление статистики в боковой панели
function updateSidebarStats() {
    const today = new Date().toISOString().split('T')[0];
    const todayCount = reminders.filter(r => r.date === today).length;
    
    const totalElem = document.getElementById('sidebar-total');
    const todayElem = document.getElementById('sidebar-today');
    
    if (totalElem) totalElem.textContent = reminders.length;
    if (todayElem) todayElem.textContent = todayCount;
}

// Фильтрация напоминаний
function filterReminders() {
    let filtered = [...reminders];
    const today = new Date().toISOString().split('T')[0];
    
    switch (currentFilter) {
        case 'today':
            filtered = filtered.filter(r => r.date === today);
            break;
        case 'week':
            const weekLater = new Date();
            weekLater.setDate(weekLater.getDate() + 7);
            filtered = filtered.filter(r => {
                const rDate = new Date(r.date);
                return rDate >= new Date(today) && rDate <= weekLater;
            });
            break;
    }
    
    displayReminders(filtered);
}

// Отображение напоминаний
function displayReminders(remindersList) {
    const container = document.getElementById('remindersContainer');
    
    if (!container) return;
    
    if (remindersList.length === 0) {
        container.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-calendar-check"></i>
                <p>Нет напоминаний</p>
            </div>
        `;
        return;
    }
    
    remindersList.sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`);
        const dateB = new Date(`${b.date}T${b.time}`);
        return dateA - dateB;
    });
    
    container.innerHTML = remindersList.map(reminder => `
        <div class="reminder-card ${reminder.priority}" data-id="${reminder.id}">
            <div class="reminder-content">
                <div class="reminder-title">
                    ${escapeHtml(reminder.title)}
                    <span style="font-size: 0.7rem; margin-left: 8px;">
                        ${getPriorityIcon(reminder.priority)}
                    </span>
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
    `).join('');
}

// Создание напоминания
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
            document.getElementById('date').value = new Date().toISOString().split('T')[0];
            await loadReminders();
        } else {
            throw new Error('Ошибка создания');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showToast('Ошибка', 'Не удалось создать напоминание', 'error');
    }
}

// Отметить как выполненное
window.completeReminder = async function(id) {
    if (!confirm('Отметить как выполненное?')) return;
    
    try {
        await fetch(`${API_URL}/reminders/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_completed: true })
        });
        showToast('Выполнено', 'Напоминание отмечено как выполненное', 'success');
        await loadReminders();
    } catch (error) {
        console.error('Ошибка:', error);
        showToast('Ошибка', 'Не удалось обновить', 'error');
    }
};

// Удалить напоминание
window.deleteReminder = async function(id) {
    if (!confirm('Удалить напоминание?')) return;
    
    try {
        await fetch(`${API_URL}/reminders/${id}`, { method: 'DELETE' });
        showToast('Удалено', 'Напоминание удалено', 'success');
        await loadReminders();
    } catch (error) {
        console.error('Ошибка:', error);
        showToast('Ошибка', 'Не удалось удалить', 'error');
    }
};

// Включение уведомлений
async function enableNotifications() {
    if (!('Notification' in window)) {
        alert('Ваш браузер не поддерживает уведомления');
        return;
    }
    
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
        showToast('Уведомления включены', 'Вы будете получать напоминания', 'success');
    } else {
        alert('Уведомления не разрешены');
    }
}

// Показать уведомление
function showToast(title, message, type = 'info') {
    const toast = document.getElementById('notificationToast');
    const msgElem = document.getElementById('toastMessage');
    
    if (toast && msgElem) {
        msgElem.textContent = `${title}: ${message}`;
        toast.classList.remove('hidden');
        
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }
    
    if (Notification.permission === 'granted') {
        new Notification(title, { body: message });
    }
}

// Вспомогательные функции
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short'
    });
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