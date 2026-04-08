from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask import render_template
from datetime import datetime, timezone, timedelta
import os

app = Flask(__name__, 
            static_folder='../frontend/static',    
            template_folder='../frontend/templates') 
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///reminders.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, 'frontend', 'templates', 'static')

print("=" * 60)
print(f"Базовая директория: {BASE_DIR}")
print(f"Папка frontend: {FRONTEND_DIR}")
print(f"Существует: {os.path.exists(FRONTEND_DIR)}")
if os.path.exists(FRONTEND_DIR):
    print(f"Файлы: {os.listdir(FRONTEND_DIR)}")
print("=" * 60)

class Reminder(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    date = db.Column(db.String(10), nullable=False)
    time = db.Column(db.String(5), nullable=False)
    priority = db.Column(db.String(20), default='medium')
    is_completed = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'date': self.date,
            'time': self.time,
            'priority': self.priority,
            'is_completed': self.is_completed,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

with app.app_context():
    db.create_all()
    print("✅ База данных создана")

# МАРШРУТЫ ДЛЯ СТРАНИЦ 

@app.route('/')
def index():
    """Главная страница"""
    return render_template('index.html')

@app.route('/index.html')
def index_page():
    """Главная страница"""
    return render_template('index.html')

@app.route('/stats.html')
def stats_page():
    """Страница статистики"""
    return render_template('stats.html')

@app.route('/calendar.html')
def calendar_page():
    """Страница календаря"""
    return render_template('calendar.html')

@app.route('/settings.html')
def settings_page():
    """Страница настроек"""
    return render_template('settings.html')


@app.route('/style.css')
def serve_css():
    """Общие стили"""
    return send_from_directory(FRONTEND_DIR, 'style.css')

@app.route('/index.js')
def serve_index_js():
    """JavaScript для главной страницы"""
    return send_from_directory(FRONTEND_DIR, 'index.js')

@app.route('/stats.js')
def serve_stats_js():
    """JavaScript для статистики"""
    return send_from_directory(FRONTEND_DIR, 'stats.js')

@app.route('/calendar.js')
def serve_calendar_js():
    """JavaScript для календаря"""
    return send_from_directory(FRONTEND_DIR, 'calendar.js')

@app.route('/settings.js')
def serve_settings_js():
    """JavaScript для настроек"""
    return send_from_directory(FRONTEND_DIR, 'settings.js')

@app.route('/<path:filename>')
def serve_static(filename):
    """Обслуживание статических файлов"""
    file_path = os.path.join(FRONTEND_DIR, filename)
    if os.path.exists(file_path):
        return send_from_directory(FRONTEND_DIR, filename)
    else:
        return jsonify({'error': f'File {filename} not found'}), 404

# API МАРШРУТЫ 

@app.route('/api/reminders', methods=['GET'])
def get_reminders():
    """Получить все активные напоминания"""
    try:
        reminders = Reminder.query.filter_by(is_completed=False).order_by(
            Reminder.date, Reminder.time
        ).all()
        return jsonify([r.to_dict() for r in reminders])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Создать напоминание
@app.route('/api/reminders', methods=['POST'])
def create_reminder():
    try:
        data = request.json

        print("=" * 50)
        print(f"📥 ПОЛУЧЕНО ОТ ФРОНТЕНДА:")
        print(f"   Заголовок: {data['title']}")
        print(f"   Дата: {data['date']}")      # ← что приходит?
        print(f"   Время: {data['time']}")     # ← что приходит?
        print("=" * 50)
        
        local_tz = timezone(timedelta(hours=3))  # Для Москвы (+3)
        current_date = datetime.now(local_tz).strftime('%Y-%m-%d')
        
        if data['date'] < current_date:
            return jsonify({'error': 'Нельзя создать напоминание в прошлом'}), 400
        
        reminder = Reminder(
            title=data['title'],
            description=data.get('description', ''),
            date=data['date'],
            time=data['time'],
            priority=data.get('priority', 'medium')
        )
        db.session.add(reminder)
        db.session.commit()

        print(f"💾 СОХРАНЕНО В БД:")
        print(f"   Дата: {reminder.date}")
        print(f"   Время: {reminder.time}")
        print("=" * 50)
        
        return jsonify(reminder.to_dict()), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# Обновить напоминание
@app.route('/api/reminders/<int:id>', methods=['PUT'])
def update_reminder(id):
    """Обновить напоминание"""
    try:
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
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# Удалить напоминание
@app.route('/api/reminders/<int:id>', methods=['DELETE'])
def delete_reminder(id):
    """Удалить напоминание"""
    try:
        reminder = Reminder.query.get_or_404(id)
        db.session.delete(reminder)
        db.session.commit()
        return jsonify({'message': 'deleted'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400
    
@app.route('/sw.js')
def serve_sw():
    """Service Worker"""
    return send_from_directory(FRONTEND_DIR, 'sw.js')

# Напоминания на сегодня
@app.route('/api/reminders/today', methods=['GET'])
def get_today_reminders():
    """Получить напоминания на сегодня"""
    try:
        today = datetime.now().strftime('%Y-%m-%d')
        reminders = Reminder.query.filter_by(
            date=today, 
            is_completed=False
        ).order_by(Reminder.time).all()
        return jsonify([r.to_dict() for r in reminders])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Напоминания за период
@app.route('/api/reminders/range', methods=['GET'])
def get_reminders_range():
    """Получить напоминания за период"""
    try:
        start = request.args.get('start')
        end = request.args.get('end')
        
        if not start or not end:
            return jsonify({'error': 'Missing dates'}), 400
        
        reminders = Reminder.query.filter(
            Reminder.date >= start,
            Reminder.date <= end
        ).all()
        return jsonify([r.to_dict() for r in reminders])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Простая статистика
@app.route('/api/stats', methods=['GET'])
def simple_stats():
    """Простая статистика"""
    try:
        total = Reminder.query.count()
        completed = Reminder.query.filter_by(is_completed=True).count()
        today = datetime.now().strftime('%Y-%m-%d')
        today_count = Reminder.query.filter_by(date=today).count()
        
        return jsonify({
            'total_reminders': total,
            'today_reminders': today_count,
            'completed_reminders': completed
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

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
        return jsonify({'error': str(e)}), 500

# Проверка здоровья
@app.route('/api/health', methods=['GET'])
def health():
    """Проверка работоспособности"""
    return jsonify({
        'status': 'ok', 
        'message': 'Сервер работает',
        'frontend_path': FRONTEND_DIR
    })

# ЗАПУСК 
if __name__ == '__main__':
    print("=" * 60)
    print("✅ Тихий Напоминатель - Сервер запущен")
    print("=" * 60)
    print(f"📍 http://localhost:5000")
    print()
    print("📋 Страницы:")
    print(f"   ✅ http://localhost:5000/           - Главная")
    print(f"   ✅ http://localhost:5000/stats.html - Статистика")
    print(f"   ✅ http://localhost:5000/calendar.html - Календарь")
    print(f"   ✅ http://localhost:5000/settings.html - Настройки")
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