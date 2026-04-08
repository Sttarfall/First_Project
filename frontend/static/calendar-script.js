const API_URL = 'http://localhost:5000/api';

// ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ: объект Date → строка ГГГГ-ММ-ДД (без сдвига по часовому поясу)
function formatLocalDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

class CalendarApp {
    constructor() {
        this.currentDate = new Date();
        this.selectedDate = new Date();
        this.reminders = [];
        this.init();
    }

    async init() {
        await this.loadReminders();
        this.renderCalendar();
        this.setupEventListeners();
        this.updateSelectedDate();
    }

    async loadReminders() {
        try {
            const response = await fetch(`${API_URL}/reminders`);
            if (response.ok) {
                this.reminders = await response.json();
                this.updateStats();
                this.renderCalendar();
            } else {
                throw new Error('Ошибка загрузки');
            }
        } catch (error) {
            console.error('Ошибка загрузки напоминаний:', error);
            this.reminders = JSON.parse(localStorage.getItem('reminders') || '[]');
            this.renderCalendar();
        }
    }

    updateStats() {
        const today = formatLocalDate(new Date());
        const todayCount = this.reminders.filter(r => r.date === today).length;
        
        const totalElem = document.getElementById('total-reminders');
        const todayElem = document.getElementById('today-reminders');
        
        if (totalElem) totalElem.textContent = this.reminders.length;
        if (todayElem) todayElem.textContent = todayCount;
    }

    renderCalendar() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        // Обновляем заголовок
        const monthNames = [
            'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
            'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
        ];
        
        const monthHeader = document.getElementById('current-month');
        if (monthHeader) {
            monthHeader.textContent = `${monthNames[month]} ${year}`;
        }
        
        // Получаем первый день месяца
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        // Определяем день недели первого дня
        let firstDayIndex = firstDay.getDay();
        if (firstDayIndex === 0) firstDayIndex = 7; // Воскресенье -> 7
        
        // Получаем общее количество дней
        const totalDays = lastDay.getDate();
        
        // Получаем последние дни предыдущего месяца
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        
        const calendarDays = document.getElementById('calendar-days');
        if (!calendarDays) return;
        calendarDays.innerHTML = '';
        
        // Добавляем дни предыдущего месяца
        for (let i = firstDayIndex - 1; i > 0; i--) {
            const day = prevMonthLastDay - i + 1;
            const date = new Date(year, month - 1, day);
            this.createDayElement(date, calendarDays, true);
        }
        
        // Добавляем дни текущего месяца
        const today = new Date();
        for (let i = 1; i <= totalDays; i++) {
            const date = new Date(year, month, i);
            const isToday = formatLocalDate(date) === formatLocalDate(today);
            const isSelected = formatLocalDate(date) === formatLocalDate(this.selectedDate);
            
            this.createDayElement(date, calendarDays, false, isToday, isSelected);
        }
        
        // Добавляем дни следующего месяца
        const totalCells = 42; // 6 недель * 7 дней
        const remainingCells = totalCells - (firstDayIndex - 1 + totalDays);
        
        for (let i = 1; i <= remainingCells; i++) {
            const date = new Date(year, month + 1, i);
            this.createDayElement(date, calendarDays, true);
        }
    }

    createDayElement(date, container, isOtherMonth = false, isToday = false, isSelected = false) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        
        if (isOtherMonth) dayElement.classList.add('other-month');
        if (isToday) dayElement.classList.add('today');
        if (isSelected) dayElement.classList.add('selected');
        
        // Сохраняем дату в локальном формате (без сдвига)
        dayElement.dataset.date = formatLocalDate(date);
        
        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = date.getDate();
        dayElement.appendChild(dayNumber);
        
        // Добавляем напоминания для этого дня
        const dayReminders = this.getRemindersForDate(date);
        const dayEvents = document.createElement('div');
        dayEvents.className = 'day-events';
        
        if (dayReminders.length > 0) {
            dayReminders.slice(0, 3).forEach(reminder => {
                const eventDiv = document.createElement('div');
                eventDiv.style.display = 'flex';
                eventDiv.style.alignItems = 'center';
                eventDiv.style.marginBottom = '2px';
                
                const eventDot = document.createElement('span');
                eventDot.className = `event-dot ${reminder.priority}`;
                
                const eventText = document.createElement('span');
                eventText.style.fontSize = '0.7rem';
                eventText.style.marginLeft = '4px';
                eventText.textContent = `${reminder.time} ${reminder.title.substring(0, 12)}`;
                
                eventDiv.appendChild(eventDot);
                eventDiv.appendChild(eventText);
                dayEvents.appendChild(eventDiv);
            });
            
            if (dayReminders.length > 3) {
                const moreText = document.createElement('div');
                moreText.style.fontSize = '0.65rem';
                moreText.style.opacity = '0.7';
                moreText.style.marginTop = '2px';
                moreText.textContent = `+${dayReminders.length - 3} еще...`;
                dayEvents.appendChild(moreText);
            }
        }
        
        dayElement.appendChild(dayEvents);
        
        // Обработчик клика
        dayElement.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectDate(date);
        });
        
        container.appendChild(dayElement);
    }

    // ИСПРАВЛЕННАЯ ФУНКЦИЯ - теперь правильно получает напоминания для даты
    getRemindersForDate(date) {
        // Преобразуем объект Date в строку локального формата
        const dateStr = formatLocalDate(date);
        // Фильтруем напоминания
        return this.reminders.filter(r => r.date === dateStr && !r.is_completed);
    }

    selectDate(date) {
        this.selectedDate = date;
        this.renderCalendar();
        this.updateSelectedDate();
        this.showDayEvents();
    }

    updateSelectedDate() {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const dateStr = this.selectedDate.toLocaleDateString('ru-RU', options);
        const selectedDateElem = document.getElementById('selected-date');
        if (selectedDateElem) {
            selectedDateElem.textContent = dateStr;
        }
    }

    showDayEvents() {
        const container = document.getElementById('day-events');
        if (!container) return;
        
        const reminders = this.getRemindersForDate(this.selectedDate);
        
        if (reminders.length === 0) {
            container.innerHTML = '<div class="no-events">📭 Нет напоминаний на этот день</div>';
            return;
        }
        
        // Сортировка по времени
        reminders.sort((a, b) => a.time.localeCompare(b.time));
        
        container.innerHTML = reminders.map(reminder => `
            <div class="event-card ${reminder.priority}">
                <div class="event-time">⏰ ${reminder.time}</div>
                <div class="event-info">
                    <div class="event-title">📌 ${this.escapeHtml(reminder.title)}</div>
                    ${reminder.description ? `<div class="event-description">📝 ${this.escapeHtml(reminder.description)}</div>` : ''}
                </div>
                <div class="reminder-actions">
                    <button class="btn-complete" data-id="${reminder.id}" title="Выполнить">
                        ✅
                    </button>
                    <button class="btn-delete" data-id="${reminder.id}" title="Удалить">
                        🗑️
                    </button>
                </div>
            </div>
        `).join('');
        
        // Добавляем обработчики событий
        container.querySelectorAll('.btn-complete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(btn.dataset.id);
                this.completeReminder(id);
            });
        });
        
        container.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(btn.dataset.id);
                this.deleteReminder(id);
            });
        });
    }

    async completeReminder(id) {
        if (confirm('✅ Отметить напоминание как выполненное?')) {
            try {
                const response = await fetch(`${API_URL}/reminders/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ is_completed: true })
                });
                
                if (response.ok) {
                    await this.loadReminders();
                    this.showDayEvents();
                }
            } catch (error) {
                console.error('Ошибка:', error);
                alert('Ошибка при обновлении');
            }
        }
    }

    async deleteReminder(id) {
        if (confirm('🗑️ Удалить это напоминание?')) {
            try {
                const response = await fetch(`${API_URL}/reminders/${id}`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    await this.loadReminders();
                    this.showDayEvents();
                }
            } catch (error) {
                console.error('Ошибка удаления:', error);
                alert('Ошибка при удалении');
            }
        }
    }

    setupEventListeners() {
        // Навигация по месяцам
        const prevBtn = document.getElementById('prev-month');
        const nextBtn = document.getElementById('next-month');
        const todayBtn = document.getElementById('today-btn');
        const createEventBtn = document.getElementById('create-event');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.currentDate.setMonth(this.currentDate.getMonth() - 1);
                this.renderCalendar();
            });
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.currentDate.setMonth(this.currentDate.getMonth() + 1);
                this.renderCalendar();
            });
        }
        
        if (todayBtn) {
            todayBtn.addEventListener('click', () => {
                this.currentDate = new Date();
                this.selectDate(new Date());
                this.renderCalendar();
            });
        }
        
        // Переключение видов (месяц/неделя/день)
        const viewBtns = document.querySelectorAll('.view-btn');
        viewBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                
                // Обновляем активные кнопки
                viewBtns.forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                
                // Скрываем все виды
                const monthView = document.getElementById('month-view');
                const weekView = document.getElementById('week-view');
                const dayView = document.getElementById('day-view');
                
                if (monthView) monthView.classList.remove('active');
                if (weekView) weekView.classList.remove('active');
                if (dayView) dayView.classList.remove('active');
                
                // Показываем выбранный вид
                if (view === 'month' && monthView) monthView.classList.add('active');
                if (view === 'week' && weekView) weekView.classList.add('active');
                if (view === 'day' && dayView) dayView.classList.add('active');
                
                // Если выбран вид "День", показываем детали выбранного дня
                if (view === 'day') {
                    this.showDayView();
                }
            });
        });
        
        // Кнопка создания события
        if (createEventBtn) {
            createEventBtn.addEventListener('click', () => {
                const dateStr = formatLocalDate(this.selectedDate);
                window.location.href = `index.html?date=${dateStr}`;
            });
        }
    }

    showDayView() {
        const container = document.getElementById('day-calendar');
        if (!container) return;
        
        const reminders = this.getRemindersForDate(this.selectedDate);
        
        let html = `<h3>📅 Расписание на ${this.selectedDate.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>`;
        html += '<div class="day-schedule">';
        
        // Создаем расписание по часам
        for (let hour = 0; hour < 24; hour++) {
            const hourReminders = reminders.filter(r => {
                const reminderHour = parseInt(r.time.split(':')[0]);
                return reminderHour === hour;
            });
            
            const hourFormatted = hour.toString().padStart(2, '0');
            
            html += `
                <div class="hour-slot">
                    <div class="hour-label">🕐 ${hourFormatted}:00</div>
                    <div class="hour-content">
                        ${hourReminders.length > 0 ? 
                            hourReminders.map(r => `
                                <div class="event-card ${r.priority}" style="margin: 5px 0; padding: 8px;">
                                    <strong>${r.time}</strong> - ${this.escapeHtml(r.title)}
                                </div>
                            `).join('') : 
                            '<div class="no-events" style="color: #999; padding: 5px;">— Нет дел —</div>'
                        }
                    </div>
                </div>
            `;
        }
        
        html += '</div>';
        container.innerHTML = html;
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Инициализация календаря при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.calendarApp = new CalendarApp();
});