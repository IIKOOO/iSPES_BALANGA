from flask import Flask, render_template, session
from flask_session import Session
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, template_folder='templates', static_folder='static')
app.config.from_object('config.Config')
app.secret_key = os.getenv('SECRET_KEY')

app.config['SESSION_TYPE'] = 'filesystem'
Session(app)

url = os.getenv('DATABASE_URL')
conn = psycopg2.connect(url)

from login import login_bp
from admin import admin_bp
from register import register_bp
from peso import peso_bp
from student import student_bp
from qr_scanner import qr_bp
app.register_blueprint(login_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(register_bp)
app.register_blueprint(peso_bp)
app.register_blueprint(student_bp)
app.register_blueprint(qr_bp)

@app.route('/')
def index():
    url = os.getenv('DATABASE_URL')
    conn = psycopg2.connect(url)
    general_announcement = ""
    with conn.cursor() as cur:
        cur.execute("SELECT general_announcements FROM announcements WHERE announcement_id = 1")
        row = cur.fetchone()
        if row and row[0]:
            general_announcement = row[0]
    return render_template('index.html', general_announcement=general_announcement)

@app.route('/register')
def register():
    return render_template('register.html')

@app.route('/test_flash')
def test_flash():
    from flask import flash, redirect, url_for
    flash('Registation succesful.', 'success')
    return redirect(url_for('index'))

# if __name__ == '__main__':
#     app.run(host='0.0.0.0', port=5000, debug=True)
