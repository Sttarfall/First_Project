from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os

# Создаем приложение
app = Flask(__name__, static_folder=None)  # Убираем static_folder
CORS(app)

# Конфигурация
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///reminders.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Модель данных
class Reminder(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    date = db.Column(db.String(10), nullable=False)
    time = db.Column(db.String(5), nullable=False)
    priority = db.Column(db.String(20), default='medium')
    is_completed = db.Column(db.Boolean, default=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'date': self.date,
            'time': self.time,
            'priority': self.priority,
            'is_completed': self.is_completed
        }

# Создаем таблицы
with app.app_context():
    db.create_all()

# ============ СТАТИЧЕСКИЕ ФАЙЛЫ ============
# Указываем правильную папку для frontend
FRONTEND_FOLDER = os.path.join(os.path.dirname(__file__), '..', 'frontend')

@app.route('/')
def index():
    return send_from_directory(FRONTEND_FOLDER, 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    """Обслуживание всех статических файлов"""
    return send_from_directory(FRONTEND_FOLDER, filename)

# ============ API МАРШРУТЫ ============

# Получить все напоминания
@app.route('/api/reminders', methods=['GET'])
def get_reminders():
    reminders = Reminder.query.filter_by(is_completed=False).order_by(
        Reminder.date, Reminder.time
    ).all()
    return jsonify([r.to_dict() for r in reminders])

# Создать напоминание
@app.route('/api/reminders', methods=['POST'])
def create_reminder():
    data = request.json
    reminder = Reminder(
        title=data['title'],
        description=data.get('description', ''),
        date=data['date'],
        time=data['time'],
        priority=data.get('priority', 'medium')
    )
    db.session.add(reminder)
    db.session.commit()
    return jsonify(reminder.to_dict()), 201

# Обновить напоминание
@app.route('/api/reminders/<int:id>', methods=['PUT'])
def update_reminder(id):
    reminder = Reminder.query.get_or_404(id)
    data = request.json
    if 'title' in data:
        reminder.title = data['title']
    if 'description' in data:
        reminder.description = data['description']
    if 'date' in data:
        reminder.date = data['date']
    if 'time' in data:
        reminder.time = data['time']
    if 'priority' in data:
        reminder.priority = data['priority']
    if 'is_completed' in data:
        reminder.is_completed = data['is_completed']
    db.session.commit()
    return jsonify(reminder.to_dict())

# Удалить напоминание
@app.route('/api/reminders/<int:id>', methods=['DELETE'])
def delete_reminder(id):
    reminder = Reminder.query.get_or_404(id)
    db.session.delete(reminder)
    db.session.commit()
    return jsonify({'message': 'deleted'})

# Напоминания на сегодня
@app.route('/api/reminders/today', methods=['GET'])
def today_reminders():
    today = datetime.now().strftime('%Y-%m-%d')
    reminders = Reminder.query.filter_by(date=today, is_completed=False).all()
    return jsonify([r.to_dict() for r in reminders])

# Простая статистика
@app.route('/api/stats', methods=['GET'])
def simple_stats():
    total = Reminder.query.count()
    completed = Reminder.query.filter_by(is_completed=True).count()
    today = datetime.now().strftime('%Y-%m-%d')
    today_count = Reminder.query.filter_by(date=today).count()
    return jsonify({
        'total_reminders': total,
        'today_reminders': today_count,
        'completed_reminders': completed
    })

# Детальная статистика
@app.route('/api/stats/detailed', methods=['GET'])
def detailed_stats():
    """Детальная статистика для графиков"""
    try:
        all_reminders = Reminder.query.all()
        
        total = len(all_reminders)
        completed = len([r for r in all_reminders if r.is_completed])
        
        high = len([r for r in all_reminders if r.priority == 'high'])
        medium = len([r for r in all_reminders if r.priority == 'medium'])
        low = len([r for r in all_reminders if r.priority == 'low'])
        
        days_ru = {
            0: 'Понедельник', 1: 'Вторник', 2: 'Среда',
            3: 'Четверг', 4: 'Пятница', 5: 'Суббота', 6: 'Воскресенье'
        }
        
        day_stats = {
            'Понедельник': 0, 'Вторник': 0, 'Среда': 0,
            'Четверг': 0, 'Пятница': 0, 'Суббота': 0, 'Воскресенье': 0
        }
        
        for reminder in all_reminders:
            if reminder.date:
                try:
                    date_obj = datetime.strptime(reminder.date, '%Y-%m-%d')
                    weekday = date_obj.weekday()
                    day_name = days_ru[weekday]
                    day_stats[day_name] += 1
                except:
                    pass
        
        completion_rate = (completed / total * 100) if total > 0 else 0
        
        return jsonify({
            'total': total,
            'completed': completed,
            'completion_rate': round(completion_rate, 1),
            'priority_stats': {'high': high, 'medium': medium, 'low': low},
            'day_stats': day_stats
        })
        
    except Exception as e:
        print(f"Ошибка: {e}")
        return jsonify({'error': str(e)}), 500

# Проверка здоровья
@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'message': 'Сервер работает'})

# ============ ЗАПУСК ============
if __name__ == '__main__':
    print("=" * 60)
    print("✅ Тихий Напоминатель - Сервер запущен")
    print("=" * 60)
    print(f"📍 http://localhost:5000")
    print(f"📁 Папка с фронтендом: {FRONTEND_FOLDER}")
    print()
    print("📋 Доступные страницы:")
    print("   http://localhost:5000/           - Главная")
    print("   http://localhost:5000/stats.html - Статистика")
    print("   http://localhost:5000/calendar.html - Календарь")
    print("   http://localhost:5000/settings.html - Настройки")
    print()
    print("📋 API эндпоинты:")
    print("   GET  /api/reminders")
    print("   POST /api/reminders")
    print("   GET  /api/reminders/today")
    print("   GET  /api/reminders/range")
    print("   GET  /api/stats")
    print("   GET  /api/stats/detailed")
    print("   GET  /api/health")
    print("=" * 60)
    
    app.run(debug=True, port=5000)