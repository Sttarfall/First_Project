const API_URL = 'http://localhost:5000/api';
let charts = {};

document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    document.getElementById('refreshBtn').addEventListener('click', loadStats);
});

async function loadStats() {
    try {
        const response = await fetch(`${API_URL}/stats/detailed`);
        const data = await response.json();
        
        document.getElementById('totalCount').textContent = data.total || 0;
        document.getElementById('completedCount').textContent = data.completed || 0;
        document.getElementById('completionRate').textContent = (data.completion_rate || 0) + '%';
        document.getElementById('highCount').textContent = data.priority_stats?.high || 0;
        
        createPriorityChart(data.priority_stats);
        createWeekdayChart(data.day_stats);
    } catch (error) {
        console.error('Ошибка:', error);
    }
}

function createPriorityChart(stats) {
    const ctx = document.getElementById('priorityChart').getContext('2d');
    if (charts.priority) charts.priority.destroy();
    
    charts.priority = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Высокий', 'Средний', 'Низкий'],
            datasets: [{
                data: [stats?.high || 0, stats?.medium || 0, stats?.low || 0],
                backgroundColor: ['rgba(231,76,60,0.8)', 'rgba(46,139,87,0.8)', 'rgba(52,152,219,0.8)']
            }]
        }
    });
}

function createWeekdayChart(dayStats) {
    const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
    const data = days.map(day => dayStats?.[day] || 0);
    const ctx = document.getElementById('weekdayChart').getContext('2d');
    
    if (charts.weekday) charts.weekday.destroy();
    
    charts.weekday = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: days.map(d => d.substring(0, 3)),
            datasets: [{
                label: 'Количество',
                data: data,
                backgroundColor: 'rgba(46,139,87,0.7)'
            }]
        },
        options: { scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    });
}