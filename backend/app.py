from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os

app = Flask(__name__, static_folder='../frontend', static_url_path='')
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

# Статические файлы
@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path)

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

# ДЕТАЛЬНАЯ СТАТИСТИКА (ИСПРАВЛЕННАЯ)
@app.route('/api/stats/detailed', methods=['GET'])
def detailed_stats():
    """Детальная статистика для графиков"""
    try:
        # Получаем все напоминания
        all_reminders = Reminder.query.all()
        
        # Общая статистика
        total = len(all_reminders)
        completed = len([r for r in all_reminders if r.is_completed])
        
        # Статистика по приоритетам
        high = len([r for r in all_reminders if r.priority == 'high'])
        medium = len([r for r in all_reminders if r.priority == 'medium'])
        low = len([r for r in all_reminders if r.priority == 'low'])
        
        # Статистика по дням недели
        days_ru = {
            0: 'Понедельник', 1: 'Вторник', 2: 'Среда',
            3: 'Четверг', 4: 'Пятница', 5: 'Суббота', 6: 'Воскресенье'
        }
        
        day_stats = {}
        for day in days_ru.values():
            day_stats[day] = 0
        
        for reminder in all_reminders:
            if reminder.date:
                try:
                    date_obj = datetime.strptime(reminder.date, '%Y-%m-%d')
                    weekday = date_obj.weekday()
                    day_name = days_ru[weekday]
                    day_stats[day_name] += 1
                except:
                    pass
        
        # Процент выполнения
        if total > 0:
            completion_rate = (completed / total) * 100
        else:
            completion_rate = 0
        
        # Формируем ответ
        result = {
            'total': total,
            'completed': completed,
            'completion_rate': round(completion_rate, 1),
            'priority_stats': {
                'high': high,
                'medium': medium,
                'low': low
            },
            'day_stats': day_stats
        }
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Ошибка в detailed_stats: {e}")
        return jsonify({'error': str(e)}), 500

# Проверка здоровья
@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'message': 'Server running'})

# ДЕТАЛЬНАЯ СТАТИСТИКА (ДОБАВЬТЕ ЭТОТ КОД)
@app.route('/api/stats/detailed', methods=['GET'])
def detailed_stats():
    """Детальная статистика для графиков"""
    try:
        from datetime import datetime
        
        # Получаем все напоминания из базы данных
        all_reminders = Reminder.query.all()
        
        # Общая статистика
        total = len(all_reminders)
        completed = len([r for r in all_reminders if r.is_completed])
        
        # Статистика по приоритетам
        high = len([r for r in all_reminders if r.priority == 'high'])
        medium = len([r for r in all_reminders if r.priority == 'medium'])
        low = len([r for r in all_reminders if r.priority == 'low'])
        
        # Статистика по дням недели
        days_ru = {
            0: 'Понедельник', 1: 'Вторник', 2: 'Среда',
            3: 'Четверг', 4: 'Пятница', 5: 'Суббота', 6: 'Воскресенье'
        }
        
        # Инициализируем счетчики
        day_stats = {
            'Понедельник': 0, 'Вторник': 0, 'Среда': 0,
            'Четверг': 0, 'Пятница': 0, 'Суббота': 0, 'Воскресенье': 0
        }
        
        # Считаем напоминания по дням
        for reminder in all_reminders:
            if reminder.date:
                try:
                    date_obj = datetime.strptime(reminder.date, '%Y-%m-%d')
                    weekday = date_obj.weekday()
                    day_name = days_ru[weekday]
                    day_stats[day_name] += 1
                except:
                    pass
        
        # Процент выполнения
        if total > 0:
            completion_rate = (completed / total) * 100
        else:
            completion_rate = 0
        
        # Формируем ответ
        result = {
            'total': total,
            'completed': completed,
            'completion_rate': round(completion_rate, 1),
            'priority_stats': {
                'high': high,
                'medium': medium,
                'low': low
            },
            'day_stats': day_stats
        }
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Ошибка в detailed_stats: {e}")
        return jsonify({'error': str(e)}), 500

# ============ ЗАПУСК ============
if __name__ == '__main__':
    print("=" * 60)
    print("✅ Тихий Напоминатель - Сервер запущен")
    print("=" * 60)
    print("📍 http://localhost:5000")
    print()
    print("📋 Проверьте эти адреса:")
    print("   http://localhost:5000/api/health")
    print("   http://localhost:5000/api/reminders")
    print("   http://localhost:5000/api/stats")
    print("   http://localhost:5000/api/stats/detailed")
    print("=" * 60)
    
    app.run(debug=True, port=5000)