from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
import os
from dotenv import load_dotenv

#Загрузка переменных окружения 
load_dotenv()

app = Flask(__name__)
CORS(app)

#Конфигурация база данных
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///reminders.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS']= False
app.config['SECRET_KEY']= os.getenv('SECRET_KEY', 'my_secret_code')

db = SQLAlchemy(app)

class Reminder(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    date = db.Column(db.Date, nullable=False)
    time = db.Column(db.Time, nullable=False)
    priority = db.Column(db.String(20), default='medium')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_completed = db.Column(db.Boolean, default=False)

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'date': self.date.isoformat() if self.date else None,
            'time': self.time.strftime('%H:%M') if self.time else None,
            'priority': self.priority,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'is_completed': self.is_completed
        }
    
with app.app_context():
    db.create_all()

@app.route('/api/reminders', methods=['GET'])
def get_reminders():
    """Получить все напоминания"""
    reminders = Reminder.query.order_by(Reminder.date, Reminder.time).all()
    return jsonify([reminder.to_dict() for reminder in reminders])

@app.route('/api/reminders', methods=['POST'])
def create_reminder():
    """Создать новое напоминание"""
    try: 
        data = request.json

        reminder_date = datetime.strptime(data['date'], '%Y-%m-%d').date()
        reminder_time = datetime.strftime(data['time'], '%H:%M').time()

        reminder = Reminder(
            title=data['title'],
            description=data.get('description', ''),
            date=reminder_date,
            time=reminder_time,
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
    
@app.route('/api/reminders/<int:id>', methods=['PUT'])
def update_reminder(id):
    """Обновить напоминание"""
    try:
        reminder = Reminder.query.det_or_404(id)
        data = request.json
        
        if 'title' in data:
            reminder.title = data['title']
        if 'description' in data:
            reminder.description = data['description']
        if 'date' in data:
            reminder.date = datetime.strptime(data['date'], '%Y-%m-%d').date()
        if 'time' in data:
            reminder.time = datetime.strptime(data['time'], '%H:%M').time()
        if 'priority' in data:
            reminder.priority = data['priority']
        if 'is_completed' in data:
            reminder.is_completed = data['is_completed']
            
        db.session.commit()

        return jsonify({
            'message': 'Наопминание обновлено',
            'reminder': reminder.to_dict()
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 400
    
@app.route('/api/reminders/<init:id>', methods=['DELETE'])
def delete_reminder(id):
    """Удалить напоминание"""
    try: 
        reminder = Reminder.query.get_or_404(id)
        db.session.delete(reminder)
        db.session.commit()

        return jsonify({'message': 'Напоминание удалено'})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 400
    
@app.route('/api/reminders/today', methods=['GET'])
def get_today_reminders():
    """Получить напоминания на сегодня"""
    today = datetime.now().date()
    reminders = Reminder.query.filter_by(date=today).order_by(Reminder.time).all()

    return jsonify([reminder.to_dict() for reminder in reminders])

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Получить статистику"""
    total = Reminder.query.count()
    today = Reminder.query.filter_by(date=datetime.now().date()).count()

    return jsonify({
        'total_reminders': total,
        'total_reminders': today
    })

def check_reminders():
    """Проверка и отправка уведомлений"""
    with app.app_context():
        now = datetime.now()
        next_hour = now + timedelta(hours=1)

        reminders = Reminder.query.filter(
            Reminder.date == now.date(),
            Reminder.time >= now.time(),
            Reminder.time <= next_hour.time(),
            Reminder.is_completed == False
        ).all()

        for reminder in reminders:
            print(f'Напоминание: {reminder.title} в {reminder.time}')

scheduler = BackgroundScheduler()
scheduler.add_job(func=check_reminders, trigger='interval', minutes=5)
scheduler.start()

@app.route('/')
def index():
    return jsonify({
        'message': 'Calm Reminder API',
        'version': '1.0.0',
        'endpoints': {
            'GET /api/reminders': 'Получить все напоминания',
            'POST /api/reminders': 'Создать напоминание',
            'GET /api/reminders/today': 'Напоминания на сегодня',
            'GET /api/stats': 'Статистика'
        }
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)