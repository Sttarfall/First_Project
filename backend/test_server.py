from flask import Flask

app = Flask(__name__)

@app.route('/')
def hello():
    return "Hello! Server is working!"

@app.route('/api/test')
def test():
    return {"status": "ok", "message": "API работает"}

if __name__ == '__main__':
    print("Сервер запущен на http://localhost:5000")
    app.run(debug=True, port=5000)