class StatsManager {
    constructor() {
        this.charts = {};
        this.init();
    }
    
    async init() {
        await this.loadStats();
        this.setupEventListeners();
    }
    
    async loadStats() {
        try {
            // Загрузка общей статистики
            const statsResponse = await fetch(`${API_URL}/api/stats/detailed`);
            const stats = await statsResponse.json();
            
            // Обновление карточек
            document.getElementById('total-count').textContent = stats.total || 0;
            document.getElementById('completed-count').textContent = stats.completed || 0;
            document.getElementById('completion-rate').textContent = 
                Math.round(stats.completion_rate || 0) + '%';
            document.getElementById('high-priority-count').textContent = 
                stats.priority_stats?.high || 0;
            
            // Создание графиков
            this.createPriorityChart(stats.priority_stats);
            this.createWeekdayChart(stats.day_stats);
            
            // Загрузка дополнительных данных для временной шкалы
            await this.loadTimelineData();
            
        } catch (error) {
            console.error('Ошибка загрузки статистики:', error);
        }
    }
    
    createPriorityChart(priorityStats) {
        const ctx = document.getElementById('priorityChart').getContext('2d');
        
        if (this.charts.priority) {
            this.charts.priority.destroy();
        }
        
        this.charts.priority = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Высокий', 'Средний', 'Низкий'],
                datasets: [{
                    data: [
                        priorityStats?.high || 0,
                        priorityStats?.medium || 0,
                        priorityStats?.low || 0
                    ],
                    backgroundColor: [
                        'rgba(231, 76, 60, 0.8)',
                        'rgba(46, 139, 87, 0.8)',
                        'rgba(52, 152, 219, 0.8)'
                    ],
                    borderColor: [
                        'rgb(231, 76, 60)',
                        'rgb(46, 139, 87)',
                        'rgb(52, 152, 219)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                    }
                }
            }
        });
    }
    
    createWeekdayChart(dayStats) {
        const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
        const data = days.map(day => dayStats[day] || 0);
        
        const ctx = document.getElementById('weekdayChart').getContext('2d');
        
        if (this.charts.weekday) {
            this.charts.weekday.destroy();
        }
        
        this.charts.weekday = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: days.map(d => d.substring(0, 3)),
                datasets: [{
                    label: 'Количество напоминаний',
                    data: data,
                    backgroundColor: 'rgba(46, 139, 87, 0.7)',
                    borderColor: 'rgb(46, 139, 87)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }
    
    async loadTimelineData() {
        try {
            const response = await fetch(`${API_URL}/api/reminders`);
            const reminders = await response.json();
            
            // Группировка по датам
            const timelineData = {};
            reminders.forEach(reminder => {
                if (!timelineData[reminder.date]) {
                    timelineData[reminder.date] = {
                        total: 0,
                        completed: 0
                    };
                }
                timelineData[reminder.date].total++;
                if (reminder.is_completed) {
                    timelineData[reminder.date].completed++;
                }
            });
            
            this.createTimelineChart(timelineData);
            
        } catch (error) {
            console.error('Ошибка загрузки данных временной шкалы:', error);
        }
    }
    
    createTimelineChart(timelineData) {
        const dates = Object.keys(timelineData).sort();
        const totalData = dates.map(date => timelineData[date].total);
        const completedData = dates.map(date => timelineData[date].completed);
        
        const ctx = document.getElementById('timelineChart').getContext('2d');
        
        if (this.charts.timeline) {
            this.charts.timeline.destroy();
        }
        
        this.charts.timeline = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates.map(d => d.substring(5)), // Убираем год для краткости
                datasets: [
                    {
                        label: 'Всего напоминаний',
                        data: totalData,
                        borderColor: 'rgb(46, 139, 87)',
                        backgroundColor: 'rgba(46, 139, 87, 0.1)',
                        tension: 0.3,
                        fill: true
                    },
                    {
                        label: 'Выполнено',
                        data: completedData,
                        borderColor: 'rgb(106, 90, 205)',
                        backgroundColor: 'rgba(106, 90, 205, 0.1)',
                        tension: 0.3,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    }
    
    setupEventListeners() {
        // Фильтр по времени
        document.getElementById('time-period').addEventListener('change', (e) => {
            this.loadStatsWithPeriod(e.target.value);
        });
    }
    
    async loadStatsWithPeriod(period) {
        // Здесь можно добавить фильтрацию данных по периоду
        console.log('Загрузка статистики за период:', period);
        await this.loadStats();
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.statsManager = new StatsManager();
});