const API_URL = 'http://localhost:5000/api';
        let charts = {};

        async function loadStats() {
            try {
                console.log('Загрузка статистики...');
                const response = await fetch(`${API_URL}/stats/detailed`);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const stats = await response.json();
                console.log('Данные получены:', stats);
                
                // Обновляем карточки
                document.getElementById('total-count').textContent = stats.total || 0;
                document.getElementById('completed-count').textContent = stats.completed || 0;
                document.getElementById('completion-rate').textContent = Math.round(stats.completion_rate || 0) + '%';
                document.getElementById('high-priority-count').textContent = stats.priority_stats?.high || 0;
                
                // Создаем графики
                createPriorityChart(stats.priority_stats);
                createWeekdayChart(stats.day_stats);
                
            } catch (error) {
                console.error('Ошибка загрузки статистики:', error);
                alert('Не удалось загрузить статистику. Убедитесь, что сервер запущен на http://localhost:5000');
            }
        }
        
        function createPriorityChart(priorityStats) {
            const ctx = document.getElementById('priorityChart').getContext('2d');
            
            if (charts.priority) {
                charts.priority.destroy();
            }
            
            const data = [
                priorityStats?.high || 0,
                priorityStats?.medium || 0,
                priorityStats?.low || 0
            ];
            
            if (data.every(v => v === 0)) {
                data[0] = 1;
            }
            
            charts.priority = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Высокий', 'Средний', 'Низкий'],
                    datasets: [{
                        data: data,
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
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            position: 'bottom',
                        }
                    }
                }
            });
        }
        
        function createWeekdayChart(dayStats) {
            const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
            const data = days.map(day => dayStats?.[day] || 0);
            
            const ctx = document.getElementById('weekdayChart').getContext('2d');
            
            if (charts.weekday) {
                charts.weekday.destroy();
            }
            
            charts.weekday = new Chart(ctx, {
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
                    maintainAspectRatio: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1,
                                precision: 0
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'top',
                        }
                    }
                }
            });
        }
        
        // Загрузка при открытии страницы
        document.addEventListener('DOMContentLoaded', loadStats);
        
        // Кнопка обновления
        document.getElementById('refresh-stats').addEventListener('click', loadStats);