class CalendarManager {
    constructor() {
        this.currentDate = new Date();
        this.selectedDate = new Date();
        this.reminders = [];
        
        this.init();
    }
    
    init() {
        this.renderCalendar();
        this.setupEventListeners();
        this.loadReminders();
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
            calendarDays.appendChild(this.createDayElement(date, true));
        }
        
        // Добавляем дни текущего месяца
        const today = new Date();
        for (let i = 1; i <= totalDays; i++) {
            const date = new Date(year, month, i);
            const isToday = date.toDateString() === today.toDateString();
            const isSelected = date.toDateString() === this.selectedDate.toDateString();
            
            calendarDays.appendChild(this.createDayElement(date, false, isToday, isSelected));
        }
        
        // Добавляем дни следующего месяца
        const totalCells = 42; // 6 недель * 7 дней
        const remainingCells = totalCells - (firstDayIndex - 1 + totalDays);
        
        for (let i = 1; i <= remainingCells; i++) {
            const date = new Date(year, month + 1, i);
            calendarDays.appendChild(this.createDayElement(date, true));
        }
        
        // Обновляем список напоминаний для выбранной даты
        this.updateDayReminders();
    }
    
    createDayElement(date, isOtherMonth, isToday = false, isSelected = false) {
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
        if (dayReminders.length > 0) {
            const countBadge = document.createElement('div');
            countBadge.className = 'day-reminders-count';
            countBadge.textContent = dayReminders.length;
            dayElement.appendChild(countBadge);
            
            // Добавляем до 3 напоминаний для предпросмотра
            dayReminders.slice(0, 3).forEach(reminder => {
                const badge = document.createElement('div');
                badge.className = `reminder-badge ${reminder.priority}`;
                badge.textContent = reminder.title.substring(0, 20);
                dayElement.appendChild(badge);
            });
        }
        
        // Обработчик клика
        dayElement.addEventListener('click', () => {
            this.selectDate(date);
        });
        
        return dayElement;
    }
    
    selectDate(date) {
        this.selectedDate = date;
        this.renderCalendar();
        
        // Обновляем заголовок
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('selected-date').textContent = 
            date.toLocaleDateString('ru-RU', options);
    }
    
    getRemindersForDate(date) {
        const dateStr = date.toISOString().split('T')[0];
        return this.reminders.filter(r => r.date === dateStr);
    }
    
    updateDayReminders() {
        const container = document.getElementById('day-reminders-list');
        const reminders = this.getRemindersForDate(this.selectedDate);
        
        if (reminders.length === 0) {
            container.innerHTML = '<div class="no-reminders">Нет напоминаний на этот день</div>';
            return;
        }
        
        // Сортировка по времени
        reminders.sort((a, b) => a.time.localeCompare(b.time));
        
        container.innerHTML = reminders.map(reminder => `
            <div class="day-reminder-item ${reminder.priority}">
                <div class="day-reminder-time">${reminder.time}</div>
                <div class="day-reminder-content">
                    <strong>${reminder.title}</strong>
                    ${reminder.description ? `<p>${reminder.description}</p>` : ''}
                </div>
                <div class="reminder-actions">
                    <button class="btn-complete" title="Выполнить">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn-edit" title="Редактировать">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </div>
        `).join('');
        
        // Добавляем обработчики для кнопок
        container.querySelectorAll('.btn-complete').forEach((btn, index) => {
            btn.addEventListener('click', () => this.completeReminder(reminders[index].id));
        });
    }
    
    async loadReminders() {
        try {
            const response = await fetch(`${API_URL}/api/reminders`);
            this.reminders = await response.json();
            this.renderCalendar();
        } catch (error) {
            console.error('Ошибка загрузки напоминаний:', error);
        }
    }
    
    async completeReminder(id) {
        try {
            await fetch(`${API_URL}/api/reminders/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_completed: true })
            });
            
            this.loadReminders();
        } catch (error) {
            console.error('Ошибка:', error);
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
        
        // Переключение вида календаря
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                // Здесь можно добавить логику смены вида
            });
        });
    }
}

// Инициализация календаря при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.calendar = new CalendarManager();
});