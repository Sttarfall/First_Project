// stats.js - Логика страницы статистики

// Конфигурация
const API_URL = 'http://localhost:5000/api';

// Хранилище графиков
const charts = {
    priority: null,
    weekday: null
};

// Состояние загрузки
let isLoading = false;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('Страница статистики загружена');
    loadStats();
    setupEventListeners();
});

// Настройка обработчиков событий
function setupEventListeners() {
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadStats();
        });
    }
}

// Загрузка статистики с сервера
async function loadStats() {
    if (isLoading) return;
    
    isLoading = true;
    showLoading(true);
    
    try {
        console.log('Загрузка статистики...');
        const response = await fetch(`${API_URL}/stats/detailed`);
        
        if (!response.ok) {
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Данные получены:', data);
        
        // Обновляем карточки
        updateCards(data);
        
        // Обновляем графики
        updateCharts(data);
        
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
        showError('Не удалось загрузить статистику. Проверьте подключение к серверу.');
    } finally {
        isLoading = false;
        showLoading(false);
    }
}

// Обновление карточек с цифрами
function updateCards(data) {
    // Всего напоминаний
    const totalCount = document.getElementById('totalCount');
    if (totalCount) totalCount.textContent = data.total || 0;
    
    // Выполнено
    const completedCount = document.getElementById('completedCount');
    if (completedCount) completedCount.textContent = data.completed || 0;
    
    // Процент выполнения
    const completionRate = document.getElementById('completionRate');
    if (completionRate) completionRate.textContent = (data.completion_rate || 0) + '%';
    
    // Высокий приоритет
    const highPriorityCount = document.getElementById('highPriorityCount');
    if (highPriorityCount) highPriorityCount.textContent = data.priority_stats?.high || 0;
}

// Обновление графиков
function updateCharts(data) {
    createPriorityChart(data.priority_stats);
    createWeekdayChart(data.day_stats);
}

// Создание круговой диаграммы приоритетов
function createPriorityChart(stats) {
    const canvas = document.getElementById('priorityChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Удаляем старый график, если существует
    if (charts.priority) {
        charts.priority.destroy();
    }
    
    const data = [
        stats?.high || 0,
        stats?.medium || 0,
        stats?.low || 0
    ];
    
    // Если все значения 0, показываем заглушку
    const isEmpty = data.every(v => v === 0);
    
    charts.priority = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Высокий', 'Средний', 'Низкий'],
            datasets: [{
                data: isEmpty ? [1] : data,
                backgroundColor: isEmpty ? ['rgba(200, 200, 200, 0.8)'] : [
                    'rgba(231, 76, 60, 0.8)',
                    'rgba(46, 139, 87, 0.8)',
                    'rgba(52, 152, 219, 0.8)'
                ],
                borderColor: isEmpty ? ['rgb(150, 150, 150)'] : [
                    'rgb(231, 76, 60)',
                    'rgb(46, 139, 87)',
                    'rgb(52, 152, 219)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Создание столбчатой диаграммы по дням недели
function createWeekdayChart(dayStats) {
    const canvas = document.getElementById('weekdayChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Удаляем старый график, если существует
    if (charts.weekday) {
        charts.weekday.destroy();
    }
    
    const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
    const data = days.map(day => dayStats?.[day] || 0);
    const maxValue = Math.max(...data, 1);
    
    charts.weekday = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: days.map(d => d.substring(0, 3)),
            datasets: [{
                label: 'Количество напоминаний',
                data: data,
                backgroundColor: 'rgba(46, 139, 87, 0.7)',
                borderColor: 'rgb(46, 139, 87)',
                borderWidth: 1,
                borderRadius: 8,
                barPercentage: 0.7,
                categoryPercentage: 0.8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: maxValue,
                    ticks: {
                        stepSize: Math.ceil(maxValue / 5),
                        precision: 0,
                        callback: function(value) {
                            return Math.floor(value);
                        }
                    },
                    title: {
                        display: true,
                        text: 'Количество',
                        font: {
                            size: 12
                        }
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'День недели',
                        font: {
                            size: 12
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.raw}`;
                        }
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            }
        }
    });
}

// Показ состояния загрузки
function showLoading(show) {
    if (show) {
        // Можно добавить анимацию загрузки
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Загрузка...';
        }
    } else {
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Обновить';
        }
    }
}

// Показ ошибки
function showError(message) {
    // Создаем уведомление об ошибке
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #e74c3c;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease;
        cursor: pointer;
    `;
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-circle"></i> 
        ${message}
    `;
    
    document.body.appendChild(errorDiv);
    
    // Автоматическое исчезновение через 5 секунд
    setTimeout(() => {
        errorDiv.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 300);
    }, 5000);
    
    // Закрытие по клику
    errorDiv.addEventListener('click', () => {
        errorDiv.remove();
    });
}

// Добавляем стили для анимации
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Экспорт функций для отладки (опционально)
if (typeof window !== 'undefined') {
    window.statsManager = {
        loadStats,
        updateCharts,
        charts
    };
}