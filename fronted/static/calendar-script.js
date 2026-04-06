const API_URL = 'http://localhost:5000/api';

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
            }
        } catch (error) {
            console.error('Ошибка загрузки напоминаний:', error);
            this.reminders = JSON.parse(localStorage.getItem('reminders') || '[]');
        }
    }

    updateStats() {
        const today = new Date().toISOString().split('T')[0];
        const todayCount = this.reminders.filter(r => r.date === today).length;
        
        document.getElementById('total-reminders').textContent = this.reminders.length;
        document.getElementById('today-reminders').textContent = todayCount;
    }

    renderCalendar() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        // Обновляем заголовок
        const monthNames = [
            'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
            'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
        ];
        
        document.getElementById('current-month').textContent = 
            `${monthNames[month]} ${year}`;
        
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
            const isToday = date.toDateString() === today.toDateString();
            const isSelected = date.toDateString() === this.selectedDate.toDateString();
            
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
        
        dayElement.dataset.date = date.toISOString().split('T')[0];
        
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
                const eventDot = document.createElement('span');
                eventDot.className = `event-dot ${reminder.priority}`;
                
                const eventText = document.createElement('div');
                eventText.className = 'event-item';
                eventText.textContent = `${reminder.time} ${reminder.title.substring(0, 15)}...`;
                
                const eventDiv = document.createElement('div');
                eventDiv.style.display = 'flex';
                eventDiv.style.alignItems = 'center';
                eventDiv.style.marginBottom = '2px';
                eventDiv.appendChild(eventDot);
                eventDiv.appendChild(eventText);
                
                dayEvents.appendChild(eventDiv);
            });
            
            if (dayReminders.length > 3) {
                const moreText = document.createElement('div');
                moreText.className = 'event-item';
                moreText.textContent = `+${dayReminders.length - 3} еще...`;
                moreText.style.fontSize = '0.65rem';
                moreText.style.opacity = '0.7';
                dayEvents.appendChild(moreText);
            }
        }
        
        dayElement.appendChild(dayEvents);
        
        // Обработчик клика
        dayElement.addEventListener('click', () => {
            this.selectDate(date);
        });
        
        container.appendChild(dayElement);
    }

    getRemindersForDate(date) {
        const dateStr = date.toISOString().split('T')[0];
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
        document.getElementById('selected-date').textContent = dateStr;
    }

    showDayEvents() {
        const container = document.getElementById('day-events');
        const reminders = this.getRemindersForDate(this.selectedDate);
        
        if (reminders.length === 0) {
            container.innerHTML = '<div class="no-events">Нет напоминаний на этот день</div>';
            return;
        }
        
        // Сортировка по времени
        reminders.sort((a, b) => a.time.localeCompare(b.time));
        
        container.innerHTML = reminders.map(reminder => `
            <div class="event-card ${reminder.priority}">
                <div class="event-time">${reminder.time}</div>
                <div class="event-info">
                    <div class="event-title">${reminder.title}</div>
                    ${reminder.description ? `<div class="event-description">${reminder.description}</div>` : ''}
                </div>
                <div class="reminder-actions">
                    <button class="btn-complete" data-id="${reminder.id}" title="Выполнить">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn-delete" data-id="${reminder.id}" title="Удалить">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
        
        // Добавляем обработчики событий
        container.querySelectorAll('.btn-complete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.closest('button').dataset.id);
                this.completeReminder(id);
            });
        });
        
        container.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.closest('button').dataset.id);
                this.deleteReminder(id);
            });
        });
    }

    async completeReminder(id) {
        if (confirm('Отметить напоминание как выполненное?')) {
            try {
                const response = await fetch(`${API_URL}/reminders/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ is_completed: true })
                });
                
                if (response.ok) {
                    this.loadReminders();
                    this.showDayEvents();
                }
            } catch (error) {
                console.error('Ошибка:', error);
            }
        }
    }

    async deleteReminder(id) {
        if (confirm('Удалить это напоминание?')) {
            try {
                const response = await fetch(`${API_URL}/reminders/${id}`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    this.loadReminders();
                    this.showDayEvents();
                }
            } catch (error) {
                console.error('Ошибка удаления:', error);
            }
        }
    }

    setupEventListeners() {
        // Навигация по месяцам
        document.getElementById('prev-month').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.renderCalendar();
        });
        
        document.getElementById('next-month').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.renderCalendar();
        });
        
        // Кнопка "Сегодня"
        document.getElementById('today-btn').addEventListener('click', () => {
            this.currentDate = new Date();
            this.selectDate(new Date());
            this.renderCalendar();
        });
        
        // Переключение видов
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                
                // Обновляем активные кнопки
                document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                // Скрываем все виды
                document.querySelectorAll('.month-view, .week-view, .day-view')
                    .forEach(v => v.classList.remove('active'));
                
                // Показываем выбранный вид
                document.getElementById(`${view}-view`).classList.add('active');
                
                // Если выбран вид "День", показываем детали выбранного дня
                if (view === 'day') {
                    this.showDayView();
                }
            });
        });
        
        // Кнопка создания события
        document.getElementById('create-event').addEventListener('click', () => {
            const dateStr = this.selectedDate.toISOString().split('T')[0];
            window.location.href = `index.html?date=${dateStr}`;
        });
    }

    showDayView() {
        const container = document.getElementById('day-calendar');
        const dateStr = this.selectedDate.toISOString().split('T')[0];
        const reminders = this.getRemindersForDate(this.selectedDate);
        
        let html = `<h3>Расписание на ${this.selectedDate.toLocaleDateString('ru-RU')}</h3>`;
        
        // Создаем расписание по часам
        for (let hour = 0; hour < 24; hour++) {
            const hourReminders = reminders.filter(r => {
                const reminderHour = parseInt(r.time.split(':')[0]);
                return reminderHour === hour;
            });
            
            html += `
                <div class="hour-slot">
                    <div class="hour-label">${hour.toString().padStart(2, '0')}:00</div>
                    <div class="hour-content">
                        ${hourReminders.length > 0 ? 
                            hourReminders.map(r => `
                                <div class="event-card ${r.priority}">
                                    <div class="event-time">${r.time}</div>
                                    <div class="event-info">
                                        <div class="event-title">${r.title}</div>
                                    </div>
                                </div>
                            `).join('') : 
                            '<div class="no-events">Нет напоминаний</div>'
                        }
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = html;
    }
}

// Инициализация календаря при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.calendarApp = new CalendarApp();
});