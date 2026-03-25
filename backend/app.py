from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
import os
import json

# Создаем Flask приложение
app = Flask(__name__, static_folder='../frontend')
CORS(app)

# Простая конфигурация
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///reminders.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'dev-secret-key'

db = SQLAlchemy(app)

# Модель напоминания
class Reminder(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    date = db.Column(db.String(10), nullable=False)  # YYYY-MM-DD
    time = db.Column(db.String(5), nullable=False)   # HH:MM
    priority = db.Column(db.String(20), default='medium')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_completed = db.Column(db.Boolean, default=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'date': self.date,
            'time': self.time,
            'priority': self.priority,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'is_completed': self.is_completed
        }

# Создаем таблицы при первом запуске
with app.app_context():
    db.create_all()

# Статический файл для фронтенда
@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path)

# API маршруты
@app.route('/api/reminders', methods=['GET'])
def get_reminders():
    """Получить все напоминания"""
    try:
        reminders = Reminder.query.filter_by(is_completed=False).order_by(
            Reminder.date, Reminder.time
        ).all()
        return jsonify([reminder.to_dict() for reminder in reminders])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/reminders', methods=['POST'])
def create_reminder():
    """Создать новое напоминание"""
    try:
        data = request.json
        
        # Валидация данных
        if not data.get('title') or not data.get('date') or not data.get('time'):
            return jsonify({'error': 'Не все обязательные поля заполнены'}), 400
        
        # Проверка формата даты
        try:
            datetime.strptime(data['date'], '%Y-%m-%d')
            datetime.strptime(data['time'], '%H:%M')
        except ValueError:
            return jsonify({'error': 'Неверный формат даты или времени'}), 400
        
        reminder = Reminder(
            title=data['title'],
            description=data.get('description', ''),
            date=data['date'],
            time=data['time'],
            priority=data.get('priority', 'medium')
        )
        
        db.session.add(reminder)
        db.session.commit()
        
        return jsonify({
            'message': 'Напоминание создано',
            'reminder': reminder.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/reminders/<int:id>', methods=['PUT'])
def update_reminder(id):
    """Обновить напоминание"""
    try:
        reminder = Reminder.query.get(id)
        if not reminder:
            return jsonify({'error': 'Напоминание не найдено'}), 404
        
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
        
        return jsonify({
            'message': 'Напоминание обновлено',
            'reminder': reminder.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/reminders/<int:id>', methods=['DELETE'])
def delete_reminder(id):
    """Удалить напоминание"""
    try:
        reminder = Reminder.query.get(id)
        if not reminder:
            return jsonify({'error': 'Напоминание не найдено'}), 404
        
        db.session.delete(reminder)
        db.session.commit()
        
        return jsonify({'message': 'Напоминание удалено'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/reminders/today', methods=['GET'])
def get_today_reminders():
    """Получить напоминания на сегодня"""
    try:
        today = datetime.now().strftime('%Y-%m-%d')
        reminders = Reminder.query.filter_by(
            date=today, 
            is_completed=False
        ).order_by(Reminder.time).all()
        
        return jsonify([reminder.to_dict() for reminder in reminders])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/reminders/range', methods=['GET'])
def get_reminders_by_range():
    """Получить напоминания за период"""
    try:
        start_date = request.args.get('start')
        end_date = request.args.get('end')
        
        if not start_date or not end_date:
            return jsonify({'error': 'Не указаны даты периода'}), 400
        
        reminders = Reminder.query.filter(
            Reminder.date >= start_date,
            Reminder.date <= end_date,
            Reminder.is_completed == False
        ).order_by(Reminder.date, Reminder.time).all()
        
        return jsonify([reminder.to_dict() for reminder in reminders])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Получить статистику"""
    try:
        total = Reminder.query.count()
        today = datetime.now().strftime('%Y-%m-%d')
        today_count = Reminder.query.filter_by(date=today).count()
        completed = Reminder.query.filter_by(is_completed=True).count()
        
        return jsonify({
            'total_reminders': total,
            'today_reminders': today_count,
            'completed_reminders': completed
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Простой эндпоинт для проверки здоровья
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'message': 'Сервер работает'})

# Обработчик ошибок
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Ресурс не найден'}), 404

@app.errorhandler(500)
def server_error(error):
    return jsonify({'error': 'Внутренняя ошибка сервера'}), 500

@app.route('/api/stats/detailed', methods=['GET'])
def get_detailed_stats():
    """Получить детальную статистику"""
    try:
        # Общая статистика
        total = Reminder.query.count()
        completed = Reminder.query.filter_by(is_completed=True).count()
        pending = total - completed
        
        # Статистика по приоритетам
        high_priority = Reminder.query.filter_by(priority='high').count()
        medium_priority = Reminder.query.filter_by(priority='medium').count()
        low_priority = Reminder.query.filter_by(priority='low').count()
        
        # Напоминания по дням недели
        day_stats = {}
        reminders = Reminder.query.all()
        
        # Дни недели на русском
        days_ru = {
            0: 'Понедельник',
            1: 'Вторник', 
            2: 'Среда',
            3: 'Четверг',
            4: 'Пятница',
            5: 'Суббота',
            6: 'Воскресенье'
        }
        
        for reminder in reminders:
            if reminder.date:
                # Преобразуем строку даты в объект datetime
                from datetime import datetime
                date_obj = datetime.strptime(reminder.date, '%Y-%m-%d')
                # Получаем день недели (0 = понедельник в Python)
                weekday = date_obj.weekday()
                day_name = days_ru[weekday]
                day_stats[day_name] = day_stats.get(day_name, 0) + 1
        
        # Процент выполнения
        completion_rate = (completed / total * 100) if total > 0 else 0
        
        return jsonify({
            'total': total,
            'completed': completed,
            'pending': pending,
            'completion_rate': completion_rate,
            'priority_stats': {
                'high': high_priority,
                'medium': medium_priority,
                'low': low_priority
            },
            'day_stats': day_stats
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/reminders/range', methods=['GET'])
def get_reminders_by_range():
    """Получить напоминания за период"""
    try:
        start_date = request.args.get('start')
        end_date = request.args.get('end')
        
        if not start_date or not end_date:
            return jsonify({'error': 'Не указаны даты периода'}), 400
        
        reminders = Reminder.query.filter(
            Reminder.date >= start_date,
            Reminder.date <= end_date,
            Reminder.is_completed == False
        ).order_by(Reminder.date, Reminder.time).all()
        
        return jsonify([reminder.to_dict() for reminder in reminders])
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/reminders/today', methods=['GET'])
def get_today_reminders():
    """Получить напоминания на сегодня"""
    try:
        today = datetime.now().strftime('%Y-%m-%d')
        reminders = Reminder.query.filter_by(
            date=today, 
            is_completed=False
        ).order_by(Reminder.time).all()
        
        return jsonify([reminder.to_dict() for reminder in reminders])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("=" * 50)
    print("Запуск сервера 'Тихий Напоминатель'")
    print("=" * 50)
    print(f"Frontend доступен по адресу: http://localhost:5000")
    print(f"API доступен по адресу: http://localhost:5000/api/reminders")
    print(f"База данных: reminders.db")
    print("=" * 50)
    
    app.run(debug=True, port=5000)