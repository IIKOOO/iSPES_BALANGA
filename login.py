from flask import Blueprint, render_template, request, redirect, url_for, flash, session, make_response
import psycopg2
import os
from functools import wraps
from werkzeug.security import check_password_hash

login_bp = Blueprint('login', __name__)
url = os.getenv('DATABASE_URL')
conn = psycopg2.connect(url)

def nocache(view):
    @wraps(view)
    def no_cache(*args, **kwargs):
        response = make_response(view(*args, **kwargs))
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '-1'
        return response
    return no_cache

def is_scanner_locked():
    with conn.cursor() as cur:
        cur.execute("SELECT scanner_islocked FROM registration_restrictions WHERE restriction_id=1")
        row = cur.fetchone()
        return bool(row[0])

def require_scanner_unlocked(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        # Don't redirect if already on the QR scanner page
        if request.endpoint != 'peso.dtr_qr_scanner' and is_scanner_locked():
            return redirect(url_for('peso.dtr_qr_scanner'))
        return view(*args, **kwargs)
    return wrapped

@login_bp.route('/admin')
@nocache
def admin_dashboard():
    if 'admin_logged_in' not in session:
        return redirect(url_for('index'))
    with conn.cursor() as cur:
        cur.execute("SELECT general_announcements, student_announcement FROM announcements WHERE announcement_id = 1")
        announcement = cur.fetchone()
    general_announcement = announcement[0] if announcement else ''
    student_announcement = announcement[1] if announcement else ''
    return render_template('admin.html',
        general_announcement=general_announcement,
        student_announcement=student_announcement
    )

@login_bp.route('/peso')
@nocache
@require_scanner_unlocked
def peso_dashboard():
    if 'peso_logged_in' not in session:
        return redirect(url_for('index'))
    
    return render_template('peso.html', peso_id=session.get('peso_id'), peso_username=session.get('peso_username'), peso_email=session.get('peso_email'), peso_last_name=session.get('peso_last_name'), peso_first_name=session.get('peso_first_name'), peso_birth_date=session.get('peso_birth_date'), peso_sex=session.get('peso_sex'), peso_role=session.get('peso_role'), peso_mobile_no=session.get('peso_mobile_no'))

@login_bp.route('/login', methods=['GET', 'POST'])
def admin_login():
    return render_template('admin/login.html')

@login_bp.route('/student_main')
@nocache
def student_main():
    if 'student_logged_in' not in session:
        return redirect(url_for('index'))

    student_id = session.get('student_id')
    announcements = []

    with conn.cursor() as cur:
        cur.execute("SELECT general_announcements, student_announcement FROM announcements WHERE announcement_id = 1")
        row = cur.fetchone()
        if row and row[0]:
            announcements.append({
                "title": "General Announcement",
                "content": row[0],
                "date_posted": ""
            })
        if row and row[1]:
            announcements.append({
                "title": "Student Announcement",
                "content": row[1],
                "date_posted": ""
            })

    peso_comment = None
    with conn.cursor() as cur:
        cur.execute("""
            SELECT peso_comment FROM student_application_requirements
            WHERE student_application_id = %s AND peso_comment IS NOT NULL AND peso_comment <> ''
            ORDER BY student_application_id DESC LIMIT 1
        """, (student_id,))
        result = cur.fetchone()
        if result and result[0]:
            peso_comment = result[0]

    if peso_comment:
        announcements.append({
            "title": "PESO Comment",
            "content": peso_comment,
            "date_posted": ""
        })
        
    # comment_for_dtr = None
    # with conn.cursor() as cur:
    #     cur.execute("""
    #         SELECT comment_for_dtr FROM student_dtr_records
    #         WHERE student_dtr_records = %s AND comment_for_dtr IS NOT NULL AND comment_for_dtr <> ''
    #         ORDER BY student_application_id DESC LIMIT 1
    #     """, (student_id,))
    #     result = cur.fetchone()
    #     if result and result[0]:
    #         comment_for_dtr = result[0]

    # if comment_for_dtr:
    #     peso_comment.append({
    #         "title": "Comment for DTR",
    #         "content": comment_for_dtr,
    #         "date_posted": ""
    #     })

    return render_template(
        'student_main.html',
        announcements=announcements,
        student_id=student_id,
        first_name=session.get('first_name'),
        last_name=session.get('last_name'),
        email=session.get('email'),
        birth_date=session.get('birth_date'),
        sex=session.get('sex'),
        username=session.get('username'),
        mobile_no=session.get('mobile_no')
    )

@login_bp.route('/admin/login', methods=['GET', 'POST'])
def login_admin():
    if 'admin_logged_in' in session:
        return redirect(url_for('login.admin_dashboard'))

    error_message = None

    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        try:
            cur = conn.cursor()
            cur.execute("SELECT * FROM admin_login WHERE username = %s", (username,))
            admin = cur.fetchone()
            cur.close()

            if admin and check_password_hash(admin[7], password):  # admin[7] is password column
                session['admin_logged_in'] = True
                session['admin_id'] = admin[0] 
                session['admin_last_name'] = admin[1]
                session['admin_first_name'] = admin[2]
                session['admin_birth_date'] = admin[3]
                session['admin_sex'] = admin[4]
                session['admin_role'] = admin[5]
                session['admin_username'] = admin[6]
                session['admin_email'] = admin[8]
                session['admin_mobile_no'] = admin[9]
                return redirect(url_for('login.admin_dashboard'))
            else:
                error_message = "The username or password you entered is incorrect. Please check and try again."
        except Exception as e:
            conn.rollback()
            error_message = "A database error occurred. Please try again."

    return render_template('admin_login.html', acc_error=error_message, open_modal='admin_login')


@login_bp.route('/peso', methods=['GET', 'POST'])
def login_peso():
    if 'peso_logged_in' in session:
        return redirect(url_for('login.peso_dashboard'))

    error_message = None

    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        try:
            cur = conn.cursor()
            cur.execute("SELECT * FROM peso_login WHERE username = %s", (username,))
            peso = cur.fetchone()
            cur.close()

            if peso and check_password_hash(peso[7], password):  # peso[7] is password column
                if peso[10]:
                    session['peso_logged_in'] = True
                    session['peso_id'] = peso[0]
                    session['peso_last_name'] = peso[1]
                    session['peso_first_name'] = peso[2]
                    session['peso_birth_date'] = peso[3]
                    session['peso_sex'] = peso[4]
                    session['peso_role'] = peso[5]
                    session['peso_username'] = peso[6]
                    session['peso_email'] = peso[8]
                    session['peso_mobile_no'] = peso[9]
                    return redirect(url_for('login.peso_dashboard'))
                else:
                    error_message = "Your account is disabled temporarily."
                    return render_template('index.html', disabled=error_message, open_modal='peso_login')
            else:
                error_message = "The username or password you entered is incorrect. Please check and try again."
        except Exception as e:
            conn.rollback()
            error_message = "A database error occurred. Please try again."

    return render_template('index.html', acc_error=error_message, open_modal='peso_login')


@login_bp.route('/student_main', methods=['GET', 'POST'])
def login_student():
    if 'student_logged_in' in session:
        return redirect(url_for('login.student_main'))

    error_message = None

    if request.method == 'POST':
        user_input = request.form['username']
        password = request.form['password']
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT student_id, last_name, first_name, birth_date, sex, student_category, username, email, is_active, mobile_no, password
                FROM student_login
                WHERE (username = %s OR email = %s)
            """, (user_input, user_input))
            student = cur.fetchone()
            cur.close()

            if student and check_password_hash(student[10], password):
                if student[8]:  # is_active
                    session['student_logged_in'] = True
                    session['student_id'] = student[0]
                    session['last_name'] = student[1]
                    session['first_name'] = student[2]
                    session['birth_date'] = student[3]
                    session['sex'] = student[4]
                    session['student_category'] = student[5]
                    session['username'] = student[6]
                    session['email'] = student[7]
                    session['mobile_no'] = student[9]
                    return redirect(url_for('login.student_main'))
                else:
                    error_message = "Your account is disabled temporarily."
                    return render_template('index.html', disabled=error_message, open_modal='student_login')
            else:
                error_message = "The username/email or password you entered is incorrect. Please check and try again."
        except Exception as e:
            conn.rollback()
            error_message = "A database error occurred. Please try again."

    return render_template('index.html', acc_error=error_message, open_modal='student_login')

@login_bp.route('/admin_logout')
def logout_admin():
    session.pop('admin_logged_in', None)
    return redirect(url_for('index'))

@login_bp.route('/peso_logout')
def logout_peso():
    session.pop('peso_logged_in', None)
    session.pop('peso_id', None)
    session.pop('peso_username', None)
    session.pop('peso_email', None)
    session.pop('peso_last_name', None)
    session.pop('peso_first_name', None)
    session.pop('peso_birth_date', None)
    session.pop('peso_sex', None)
    session.pop('peso_role', None)
    session.pop('peso_mobile_no', None)
    return redirect(url_for('index'))

@login_bp.route('/student_logout')
def logout_student():
    session.pop('student_logged_in', None)
    session.pop('student_id', None)
    session.pop('last_name', None)
    session.pop('first_name', None)
    session.pop('birth_date', None)
    session.pop('sex', None)
    session.pop('student_category', None)
    session.pop('username', None)
    session.pop('email', None)
    session.pop('mobile_no', None)
    return redirect(url_for('index'))