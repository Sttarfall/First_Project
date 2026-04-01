from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os

# Создаем Flask приложение
app = Flask(__name__, static_folder='../frontend', static_url_path='')
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
    reminders = Reminder.query.filter_by(is_completed=False).order_by(
        Reminder.date, Reminder.time
    ).all()
    return jsonify([reminder.to_dict() for reminder in reminders])

@app.route('/api/reminders', methods=['POST'])
def create_reminder():
    """Создать новое напоминание"""
    try:
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
        
        return jsonify({
            'message': 'Напоминание создано',
            'reminder': reminder.to_dict()
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/reminders/<int:id>', methods=['DELETE'])
def delete_reminder(id):
    """Удалить напоминание"""
    reminder = Reminder.query.get(id)
    if not reminder:
        return jsonify({'error': 'Напоминание не найдено'}), 404
    
    db.session.delete(reminder)
    db.session.commit()
    
    return jsonify({'message': 'Напоминание удалено'})

@app.route('/api/reminders/<int:id>', methods=['PUT'])
def update_reminder(id):
    """Обновить напоминание"""
    reminder = Reminder.query.get(id)
    if not reminder:
        return jsonify({'error': 'Напоминание не найдено'}), 404
    
    data = request.json
    if 'is_completed' in data:
        reminder.is_completed = data['is_completed']
    
    db.session.commit()
    
    return jsonify({
        'message': 'Напоминание обновлено',
        'reminder': reminder.to_dict()
    })

@app.route('/api/reminders/today', methods=['GET'])
def get_today_reminders():
    """Получить напоминания на сегодня"""
    today = datetime.now().strftime('%Y-%m-%d')
    reminders = Reminder.query.filter_by(
        date=today, 
        is_completed=False
    ).order_by(Reminder.time).all()
    
    return jsonify([reminder.to_dict() for reminder in reminders])

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Получить статистику"""
    total = Reminder.query.count()
    today = datetime.now().strftime('%Y-%m-%d')
    today_count = Reminder.query.filter_by(date=today).count()
    
    return jsonify({
        'total_reminders': total,
        'today_reminders': today_count
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'message': 'Сервер работает'})

if __name__ == '__main__':
    print("=" * 50)
    print("Запуск сервера 'Тихий Напоминатель'")
    print("Frontend: http://localhost:5000")
    print("API: http://localhost:5000/api/reminders")
    print("=" * 50)
    
    app.run(debug=True, port=5000, use_reloader=False)

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
