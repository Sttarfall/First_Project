import sqlite3
from datetime import datetime
from contextlib import contextmanager

DATABASE = 'reminders.db'

@contextmanager
def get_db():
    """Контекстный менеджер для работы с БД"""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def init_db():
    """Инициализация базы данных"""
    with get_db() as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS reminders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                date DATE NOT NULL,
                time TIME NOT NULL,
                priority TEXT DEFAULT 'medium',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_completed BOOLEAN DEFAULT 0
            )
        ''')
        conn.commit()

def create_reminder(title, description, date, time, priority='medium'):
    """Создать новое напоминание"""
    with get_db() as conn:
        cursor = conn.execute('''
            INSERT INTO reminders (title, description, date, time, priority)
            VALUES (?, ?, ?, ?, ?)
        ''', (title, description, date, time, priority))
        conn.commit()
        return cursor.lastrowid

def get_all_reminders():
    """Получить все напоминания"""
    with get_db() as conn:
        cursor = conn.execute('''
            SELECT * FROM reminders 
            WHERE is_completed = 0
            ORDER BY date, time
        ''')
        return [dict(row) for row in cursor.fetchall()]

def get_today_reminders():
    """Получить напоминания на сегодня"""
    today = datetime.now().strftime('%Y-%m-%d')
    with get_db() as conn:
        cursor = conn.execute('''
            SELECT * FROM reminders 
            WHERE date = ? AND is_completed = 0
            ORDER BY time
        ''', (today,))
        return [dict(row) for row in cursor.fetchall()]

if __name__ == '__main__':
    init_db()
    print("База данных инициализирована")