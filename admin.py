from flask import Blueprint, render_template, redirect, url_for, flash, request, session, make_response, jsonify
from datetime import datetime
from werkzeug.security import check_password_hash, generate_password_hash
import psycopg2
import os
import random
import string
from functools import wraps

admin_bp = Blueprint('admin', __name__)
def get_conn():
    url = os.getenv('DATABASE_URL')
    return psycopg2.connect(url)

def nocache(view):
    @wraps(view)
    def no_cache(*args, **kwargs):
        response = make_response(view(*args, **kwargs))
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '-1'
        return response
    return no_cache

@admin_bp.route('/admin_studentAcc')
@nocache
def admin_studentAcc():
    if 'admin_logged_in' not in session:
        return redirect(url_for('index'))
    admin_name = session.get('admin_first_name', '')
    role = session.get('admin_role', '')
    return render_template('admin_studentAcc.html', admin_name=admin_name, role=role)

@admin_bp.route('/admin_pesoAcc')
@nocache
def admin_pesoAcc():
    if 'admin_logged_in' not in session:
        return redirect(url_for('index'))
    admin_name = session.get('admin_first_name', '')
    role = session.get('admin_role', '')
    return render_template('admin_pesoAcc.html', admin_name=admin_name, role=role)

@admin_bp.route('/admin_adminAcc')
@nocache
def admin_adminAcc():
    if 'admin_logged_in' not in session:
        return redirect(url_for('index'))
    admin_name = session.get('admin_first_name', '')
    role = session.get('admin_role', '')
    return render_template('admin_adminAcc.html', admin_name=admin_name, role=role)

@admin_bp.route('/retrieve_peso_accounts', methods=['POST'])
def retrieve_peso_accounts():
    conn = get_conn()
    try:
        data = request.get_json() or {}
        status_filter = data.get('status', 'all')
        search_query = data.get('search', '').strip().lower()

        query = """
            SELECT peso_id, last_name, first_name, birth_date, sex, role, username, password, email, mobile_no, is_active
            FROM peso_login
        """
        params = []
        where_clauses = []

        if status_filter == 'active':
            where_clauses.append("is_active = TRUE")
        elif status_filter == 'inactive':
            where_clauses.append("is_active = FALSE OR is_active IS NULL")

        if search_query:
            where_clauses.append("(LOWER(last_name) LIKE %s OR LOWER(first_name) LIKE %s)")
            params.extend([f"%{search_query}%", f"%{search_query}%"])

        if where_clauses:
            query += " WHERE " + " AND ".join(where_clauses)
        query += " ORDER BY peso_id ASC"

        with conn.cursor() as cur:
            cur.execute(query, params)
            rows = cur.fetchall()
            data = [
                {
                    "peso_id": row[0],
                    "last_name": row[1],
                    "first_name": row[2],
                    "birth_date": row[3].strftime('%Y-%m-%d') if row[3] else '',
                    "sex": row[4],
                    "role": row[5],
                    "username": row[6],
                    "password": row[7],
                    "email": row[8],
                    "mobile_no": row[9],
                    "is_active": row[10]
                }
                for row in rows
            ]
        return jsonify(data)
    finally:
        conn.close()

@admin_bp.route('/toggle_peso_active/<int:peso_id>', methods=['POST'])
def toggle_peso_active(peso_id):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT is_active FROM peso_login WHERE peso_id = %s", (peso_id,))
            is_active = cur.fetchone()[0]
            new_status = not is_active
            cur.execute("UPDATE peso_login SET is_active = %s WHERE peso_id = %s", (new_status, peso_id))
            conn.commit()
        flash(f"Account {'activated' if new_status else 'deactivated'}.", "success" if new_status else "danger")
        return jsonify({'success': True})
    except Exception as e:
        conn.rollback()
        flash('Failed to update status: ' + str(e), 'danger')
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        conn.close()

@admin_bp.route('/peso_account_summary', methods=['GET'])
def peso_account_summary():
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM peso_login")
            total = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM peso_login WHERE is_active = TRUE")
            active = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM peso_login WHERE is_active = FALSE OR is_active IS NULL")
            inactive = cur.fetchone()[0]
        return jsonify({
            "total": total,
            "active": active,
            "inactive": inactive
        })
    finally:
        conn.close()
    
@admin_bp.route('/admin_account_summary', methods=['GET'])
def admin_account_summary():
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM admin_login")
            total = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM admin_login WHERE is_active = TRUE")
            active = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM admin_login WHERE is_active = FALSE OR is_active IS NULL")
            inactive = cur.fetchone()[0]
        return jsonify({
            "total": total,
            "active": active,
            "inactive": inactive
        })
    finally:
        conn.close()

@admin_bp.route('/retrieve_student_accounts', methods=['POST'])
def retrieve_student_accounts():
    conn = get_conn()
    try:
        data = request.get_json() or {}
        status_filter = data.get('status', 'all')
        search_query = data.get('search', '').strip().lower()

        query = """
            SELECT student_id, last_name, first_name, birth_date, sex, student_category, username, password, email, mobile_no, is_active
            FROM student_login
        """
        params = []
        where_clauses = []

        if status_filter == 'active':
            where_clauses.append("is_active = TRUE")
        elif status_filter == 'inactive':
            where_clauses.append("is_active = FALSE OR is_active IS NULL")

        if search_query:
            where_clauses.append("(LOWER(last_name) LIKE %s OR LOWER(first_name) LIKE %s OR CAST(student_id AS TEXT) LIKE %s)")
            params.extend([f"%{search_query}%", f"%{search_query}%", f"%{search_query}%"])

        if where_clauses:
            query += " WHERE " + " AND ".join(where_clauses)
        query += " ORDER BY student_id ASC"

        with conn.cursor() as cur:
            cur.execute(query, params)
            rows = cur.fetchall()
            data = [
                {
                    "student_id": row[0],
                    "last_name": row[1],
                    "first_name": row[2],
                    "birth_date": row[3].strftime('%Y-%m-%d') if row[3] else '',
                    "sex": row[4],
                    "student_category": row[5],
                    "username": row[6],
                    "password": row[7],
                    "email": row[8],
                    "mobile_no": row[9],
                    "is_active": row[10]
                }
                for row in rows
            ]
        return jsonify(data)
    finally:
        conn.close()

@admin_bp.route('/toggle_student_active/<int:student_id>', methods=['POST'])
def toggle_student_active(student_id):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT is_active FROM student_login WHERE student_id = %s", (student_id,))
            is_active = cur.fetchone()[0]
            new_status = not is_active
            cur.execute("UPDATE student_login SET is_active = %s WHERE student_id = %s", (new_status, student_id))
            conn.commit()
        flash(f"Student account {'activated' if new_status else 'deactivated'}.", "success" if new_status else "danger")
        return jsonify({'success': True})
    except Exception as e:
        conn.rollback()
        flash('Failed to update status: ' + str(e), 'danger')
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:    
        conn.close()

@admin_bp.route('/student_account_summary', methods=['GET'])
def student_account_summary():
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM student_login")
            total = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM student_login WHERE is_active = TRUE")
            active = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM student_login WHERE is_active = FALSE OR is_active IS NULL")
            inactive = cur.fetchone()[0]
        return jsonify({
            "total": total,
            "active": active,
            "inactive": inactive
        })
    finally:
        conn.close()
    
@admin_bp.route('/admin_pesoAcc', methods=['GET', 'POST'])
def create_peso():
    conn = get_conn()
    try:
        if request.method == 'POST':
            last_name = request.form['last_name']
            first_name = request.form['first_name']
            birth_date_str = request.form['birth_date']
            sex = request.form['sex']
            role = request.form['role']
            email = request.form['email']
            username = request.form['username']
            password = request.form['password']
            mobile_no = request.form['mobile_no']

            # Convert birth_date to date object
            birth_date_str = request.form['birth_date']
            if not birth_date_str:
                flash('Birth date is required.', 'danger')
                return redirect(url_for('admin.create_peso'))
            try:
                birth_date = datetime.strptime(birth_date_str, '%Y-%m-%d').date()
            except Exception:
                flash('Invalid birth date format. Please use YYYY-MM-DD.', 'danger')
                print('birth_date_str:', birth_date_str)
                return redirect(url_for('admin.create_peso'))

            hashed_password = generate_password_hash(password)
            cur = conn.cursor()
            try:
                # cur.execute("SELECT COUNT(*) FROM public.peso_login WHERE username = %s", (username,))
                # user_exists = cur.fetchone()[0] > 0

                # if user_exists:
                #     flash('Username already exists. Please choose a different username.', 'danger')
                #     return redirect(url_for('admin.create_peso'))

                if not password:
                    password = '00000'

                cur.execute("""
                    INSERT INTO peso_login (last_name, first_name, birth_date, sex, role, username, password, email, mobile_no)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (last_name, first_name, birth_date, sex, role, username, hashed_password, email, mobile_no))
                conn.commit()
                flash('Peso account created successfully.', 'success')
            except Exception as e:
                conn.rollback()
                flash('Error creating account: ' + str(e), 'danger')
            finally:
                cur.close()
            return redirect(url_for('admin.create_peso'))

        cur = conn.cursor()
        cur.execute("SELECT peso_id, username, password, is_active FROM public.peso_login")
        pesos = cur.fetchall()
        cur.close()

        return render_template('admin_pesoAcc.html', pesos=pesos)
    finally:
        conn.close()

@admin_bp.route('/update_peso', methods=['POST'])
def update_peso():
    conn = get_conn()
    try:
        if 'admin_logged_in' not in session:
            return redirect(url_for('login.login_admin'))
        peso_id = request.form['peso_id']
        last_name = request.form['last_name']
        first_name = request.form['first_name']
        birth_date = request.form['birth_date']
        sex = request.form['sex']
        role = request.form['role']
        email = request.form['email']
        mobile_no = request.form['mobile_no']
        password = request.form['password']

        cur = conn.cursor()
        if password:
            hashed_password = generate_password_hash(password)
            cur.execute("""
                UPDATE peso_login
                SET last_name=%s, first_name=%s, birth_date=%s, sex=%s, role=%s, email=%s, mobile_no=%s, password=%s
                WHERE peso_id=%s
            """, (last_name, first_name, birth_date, sex, role, email, mobile_no, hashed_password, peso_id))
        else:
            cur.execute("""
                UPDATE peso_login
                SET last_name=%s, first_name=%s, birth_date=%s, sex=%s, role=%s, email=%s, mobile_no=%s
                WHERE peso_id=%s
            """, (last_name, first_name, birth_date, sex, role, email, mobile_no, peso_id))
        conn.commit()
        cur.close()
        flash('Peso account updated successfully.', 'success')
        return redirect(url_for('admin.admin_pesoAcc'))
    finally:
        conn.close()

@admin_bp.route('/post_announcement', methods=['POST'])
def post_announcement():
    conn = get_conn()
    try:
        if 'admin_logged_in' not in session:
            return redirect(url_for('login.login_admin'))

        general_announcement = request.form.get('general_announcement')
        student_announcement = request.form.get('student_announcement')

        try:
            with conn.cursor() as cur:
                # Ensure row exists
                cur.execute("SELECT 1 FROM announcements WHERE announcement_id = 1")
                if not cur.fetchone():
                    cur.execute("""
                        INSERT INTO announcements (announcement_id, general_announcements, student_announcement, peso_announcement)
                        VALUES (1, '', '', '')
                    """)
                updated = False
                if general_announcement is not None:
                    cur.execute("""
                        UPDATE announcements
                        SET general_announcements = %s
                        WHERE announcement_id = 1
                    """, (general_announcement.strip(),))
                    flash('General announcement updated successfully!', 'success')
                    updated = True
                if student_announcement is not None:
                    cur.execute("""
                        UPDATE announcements
                        SET student_announcement = %s
                        WHERE announcement_id = 1
                    """, (student_announcement.strip(),))
                    flash('Student announcement updated successfully!', 'success')
                    updated = True
                if updated:
                    conn.commit()
                else:
                    flash('No announcement provided.', 'warning')
        except Exception as e:
            conn.rollback()
            flash('Failed to update announcement: ' + str(e), 'danger')

        return redirect(url_for('login.login_admin'))
    finally:
        conn.close()

@admin_bp.route('/get_registration_restrictions')
def get_registration_restrictions():
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT senior_high_enabled, applying_iskolar_enabled, iskolar_enabled FROM registration_restrictions WHERE restriction_id = 1")
            row = cur.fetchone()
            if not row:
                cur.execute("INSERT INTO registration_restrictions (restriction_id) VALUES (1) ON CONFLICT (restriction_id) DO NOTHING")
                conn.commit()
                row = (True, True, True)
            return jsonify({
                "senior_high_enabled": row[0],
                "applying_iskolar_enabled": row[1],
                "iskolar_enabled": row[2]
            })
    finally:
        conn.close()

@admin_bp.route('/toggle_registration_restrictions', methods=['POST'])
def toggle_registration_restrictions():
    conn = get_conn()
    try:
        data = request.get_json()
        field = data.get('field')
        if field not in ['senior_high_enabled', 'applying_iskolar_enabled', 'iskolar_enabled']:
            return jsonify({'error': 'Invalid field'}), 400
        with conn.cursor() as cur:
            cur.execute(f"SELECT {field} FROM registration_restrictions WHERE restriction_id = 1")
            current = cur.fetchone()
            if current is None:
                cur.execute("INSERT INTO registration_restrictions (restriction_id) VALUES (1) ON CONFLICT (restriction_id) DO NOTHING")
                conn.commit()
                current = (True,)
            new_value = not current[0]
            cur.execute(f"UPDATE registration_restrictions SET {field} = %s WHERE restriction_id = 1", (new_value,))
            conn.commit()
            cur.execute("SELECT senior_high_enabled, applying_iskolar_enabled, iskolar_enabled FROM registration_restrictions WHERE restriction_id = 1")
            row = cur.fetchone()
            return jsonify({
                "senior_high_enabled": row[0],
                "applying_iskolar_enabled": row[1],
                "iskolar_enabled": row[2]
            })
    finally:
        conn.close()

@admin_bp.route('/get_registration_status')
def get_registration_status():
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT register_enabled FROM registration_restrictions WHERE restriction_id = 1")
            row = cur.fetchone()
            if not row:
                cur.execute("INSERT INTO registration_restrictions (restriction_id) VALUES (1) ON CONFLICT (restriction_id) DO NOTHING")
                conn.commit()
                row = (True,)
            return jsonify({"register_enabled": row[0]})
    finally:
        conn.close()

@admin_bp.route('/toggle_register_enabled', methods=['POST'])
def toggle_register_enabled():
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT register_enabled FROM registration_restrictions WHERE restriction_id = 1")
            row = cur.fetchone()
            if not row:
                cur.execute("INSERT INTO registration_restrictions (restriction_id) VALUES (1) ON CONFLICT (restriction_id) DO NOTHING")
                conn.commit()
                row = (True,)
            new_value = not row[0]
            cur.execute("UPDATE registration_restrictions SET register_enabled = %s WHERE restriction_id = 1", (new_value,))
            conn.commit()
            return jsonify({"register_enabled": new_value})
    finally:
        conn.close()    
    

@admin_bp.route('/admin_dtr_cutoff', methods=['POST'])
def admin_dtr_cutoff():
    conn = get_conn()
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        category = data.get('category', '')
        if category not in ['college', 'senior_high']:
            return jsonify({'success': False, 'error': 'Please select a category.'})

        with conn.cursor() as cur:
            cur.execute("SELECT password FROM admin_login WHERE username=%s", (username,))
            row = cur.fetchone()
            if not row or not check_password_hash(row[0], password):
                return jsonify({'success': False, 'error': 'Invalid admin credentials.'})

            # Build category filter
            if category == 'senior_high':
                category_filter = "AND sa.student_category = 'SENIOR HIGH SCHOOL'"
            else:  # college
                category_filter = "AND sa.student_category <> 'SENIOR HIGH SCHOOL'"

            cur.execute(f"""
                SELECT sa.student_id
                FROM student_application sa
                WHERE sa.student_id NOT IN (SELECT dtr_record_id FROM student_dtr_records)
                AND sa.is_approved = TRUE
                {category_filter}
            """)
            student_ids = [r[0] for r in cur.fetchall()]
            import json
            for student_id in student_ids:
                cur.execute("""
                    SELECT date, time_in_am, time_out_am, time_in_pm, time_out_pm, dtr_time_evaluation_am, dtr_time_evaluation_pm, daily_total
                    FROM student_dtr WHERE student_id=%s ORDER BY date ASC
                """, (student_id,))
                dtr_rows = cur.fetchall()
                if not dtr_rows:
                    continue
                total_hours = sum(float(r[7]) for r in dtr_rows if r[7] and str(r[7]).replace('.', '', 1).isdigit())
                if total_hours <= 0:
                    continue
                starting_date = dtr_rows[0][0] if dtr_rows else None
                end_date = dtr_rows[-1][0] if dtr_rows else None
                cur.execute("""
                    SELECT student_id, last_name, first_name, middle_name, suffix, email, student_category, mobile_no, birth_date
                    FROM student_application WHERE student_id=%s
                """, (student_id,))
                student = cur.fetchone()
                if not student:
                    continue
                cur.execute("""
                    INSERT INTO student_dtr_records (
                        dtr_record_id, last_name, first_name, middle_name, suffix, email, student_category, mobile_no, birth_date,
                        total_worked_hours, starting_date, end_date, dtr_details
                    ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    ON CONFLICT (dtr_record_id) DO NOTHING
                """, (
                    student[0], student[1], student[2], student[3], student[4], student[5], student[6], student[7], student[8],
                    str(total_hours),
                    starting_date, end_date,
                    json.dumps([
                        [
                            r[0].strftime('%Y-%m-%d') if r[0] else '',
                            r[1].strftime('%H:%M:%S') if r[1] else '',
                            r[2].strftime('%H:%M:%S') if r[2] else '',
                            r[3].strftime('%H:%M:%S') if r[3] else '',
                            r[4].strftime('%H:%M:%S') if r[4] else '',
                            r[5] or '', r[6] or '', r[7] or ''
                        ] for r in dtr_rows
                    ])
                ))
            conn.commit()
        flash('DTR cut-off complete. Selected students have been moved to records.', 'success')
        return jsonify({'success': True})
    finally:
        conn.close()

@admin_bp.route('/retrieve_admin_accounts', methods=['POST'])
def retrieve_admin_accounts():
    conn = get_conn()
    try:
        data = request.get_json() or {}
        status_filter = data.get('status', 'all')
        search_query = data.get('search', '').strip().lower()

        query = """
            SELECT admin_id, last_name, first_name, birth_date, sex, role, username, password, email, mobile_no, is_active
            FROM admin_login
        """
        params = []
        where_clauses = []

        if status_filter == 'active':
            where_clauses.append("is_active = TRUE")
        elif status_filter == 'inactive':
            where_clauses.append("is_active = FALSE OR is_active IS NULL")

        if search_query:
            where_clauses.append("(LOWER(last_name) LIKE %s OR LOWER(first_name) LIKE %s OR LOWER(username) LIKE %s)")
            params.extend([f"%{search_query}%", f"%{search_query}%", f"%{search_query}%"])

        if where_clauses:
            query += " WHERE " + " AND ".join(where_clauses)
        query += " ORDER BY admin_id ASC"

        with conn.cursor() as cur:
            cur.execute(query, params)
            rows = cur.fetchall()
            data = [
                {
                    "admin_id": row[0],
                    "last_name": row[1],
                    "first_name": row[2],
                    "birth_date": row[3].strftime('%Y-%m-%d') if row[3] else '',
                    "sex": row[4],
                    "role": row[5],
                    "username": row[6],
                    "password": row[7],
                    "email": row[8],
                    "mobile_no": row[9],
                    "is_active": row[10]
                }
                for row in rows
            ]
        return jsonify(data)
    finally:
        conn.close()

@admin_bp.route('/toggle_admin_active/<int:admin_id>', methods=['POST'])
def toggle_admin_active(admin_id):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT is_active FROM admin_login WHERE admin_id = %s", (admin_id,))
            is_active = cur.fetchone()[0]
            new_status = not is_active
            cur.execute("UPDATE admin_login SET is_active = %s WHERE admin_id = %s", (new_status, admin_id))
            conn.commit()
        flash(f"Admin account {'activated' if new_status else 'deactivated'}.", "success" if new_status else "danger")
        return jsonify({'success': True})
    except Exception as e:
        conn.rollback()
        flash('Failed to update status: ' + str(e), 'danger')
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:    
        conn.close()

@admin_bp.route('/admin_adminAcc', methods=['GET', 'POST'])
def create_admin():
    conn = get_conn()
    try:
        if request.method == 'POST':
            last_name = request.form['last_name']
            first_name = request.form['first_name']
            birth_date_str = request.form['birth_date']
            sex = request.form['sex']
            role = request.form['role']
            email = request.form['email']
            username = request.form['admin_username']
            password = request.form['admin_password']
            mobile_no = request.form['mobile_no']

            if not birth_date_str:
                flash('Birth date is required.', 'danger')
                return redirect(url_for('admin.create_admin'))
            try:
                birth_date = datetime.strptime(birth_date_str, '%Y-%m-%d').date()
            except Exception:
                flash('Invalid birth date format. Please use YYYY-MM-DD.', 'danger')
                return redirect(url_for('admin.create_admin'))

            hashed_password = generate_password_hash(password)
            cur = conn.cursor()
            try:
                # cur.execute("SELECT COUNT(*) FROM public.admin_login WHERE username = %s", (username,))
                # user_exists = cur.fetchone()[0] > 0

                # if user_exists:
                #     flash('Username already exists. Please choose a different username.', 'danger')
                #     return redirect(url_for('admin.create_admin'))

                if not password:
                    password = '00000'

                cur.execute("""
                    INSERT INTO admin_login (last_name, first_name, birth_date, sex, role, username, password, email, mobile_no)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (last_name, first_name, birth_date, sex, role, username, hashed_password, email, mobile_no))
                conn.commit()
                flash('Admin account created successfully.', 'success')
            except Exception as e:
                conn.rollback()
                flash('Error creating account: ' + str(e), 'danger')
            finally:
                cur.close()
            return redirect(url_for('admin.create_admin'))

        cur = conn.cursor()
        cur.execute("SELECT admin_id, username, password, is_active FROM public.admin_login")
        admins = cur.fetchall()
        cur.close()

        return render_template('admin_adminAcc.html', admins=admins)
    finally:
        conn.close()

@admin_bp.route('/update_admin', methods=['POST'])
def update_admin():
    conn = get_conn()
    try:
        if 'admin_logged_in' not in session:
            return redirect(url_for('login.login_admin'))
        admin_id = request.form['admin_id']
        last_name = request.form['last_name']
        first_name = request.form['first_name']
        birth_date = request.form['birth_date']
        sex = request.form['sex']
        role = request.form['role']
        email = request.form['email']
        mobile_no = request.form['mobile_no']
        password = request.form['password']

        cur = conn.cursor()
        if password:
            hashed_password = generate_password_hash(password)
            cur.execute("""
                UPDATE admin_login
                SET last_name=%s, first_name=%s, birth_date=%s, sex=%s, role=%s, email=%s, mobile_no=%s, password=%s
                WHERE admin_id=%s
            """, (last_name, first_name, birth_date, sex, role, email, mobile_no, hashed_password, admin_id))
        else:
            cur.execute("""
                UPDATE admin_login
                SET last_name=%s, first_name=%s, birth_date=%s, sex=%s, role=%s, email=%s, mobile_no=%s
                WHERE admin_id=%s
            """, (last_name, first_name, birth_date, sex, role, email, mobile_no, admin_id))
        conn.commit()
        cur.close()
        flash('Admin account updated successfully.', 'success')
        return redirect(url_for('admin.admin_adminAcc'))
    finally:
        conn.close()

@admin_bp.route('/check_peso_username', methods=['POST'])
def check_peso_username():
    conn = get_conn()
    try:
        username = request.json.get('username')
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM public.peso_login WHERE username = %s", (username,))
            exists = cur.fetchone()[0] > 0
        return jsonify({'exists': exists})
    finally:
        conn.close()

@admin_bp.route('/check_admin_username', methods=['POST'])
def check_admin_username():
    conn = get_conn()
    try:
        username = request.json.get('username')
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM public.admin_login WHERE username = %s", (username,))
            exists = cur.fetchone()[0] > 0
        return jsonify({'exists': exists})
    finally:
        conn.close()

@admin_bp.route('/peso_action_logs_summary_admin', methods=['GET'])
def peso_action_logs_summary_admin():
    conn = get_conn()
    try:
        student_id = request.args.get('student_id', '').strip()
        action = request.args.get('action', '').strip().lower()
        performed_by = request.args.get('performed_by', '').strip().lower()

        query = """
            SELECT student_id, action, performed_by, performed_at
            FROM peso_action_logs
        """
        filters = []
        params = []

        if student_id:
            filters.append("CAST(student_id AS TEXT) LIKE %s")
            params.append(f"%{student_id}%")
        if action:
            filters.append("LOWER(action) LIKE %s")
            params.append(f"%{action}%")
        if performed_by:
            filters.append("LOWER(performed_by) LIKE %s")
            params.append(f"%{performed_by}%")

        if filters:
            query += " WHERE " + " AND ".join(filters)
        query += " ORDER BY performed_at DESC"

        with conn.cursor() as cur:
            cur.execute(query, params)
            logs = [
                {
                    "student_id": row[0],
                    "action": row[1],
                    "username": row[2],
                    "performed_at": row[3].strftime('%Y-%m-%d %H:%M')
                }
                for row in cur.fetchall()
            ]
        return jsonify({"logs": logs})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()
    
@admin_bp.route('/upload_ar_template', methods=['POST'])
def upload_ar_template():
    conn = get_conn()
    try:
        if 'admin_logged_in' not in session:
            return redirect(url_for('login.login_admin'))
        file = request.files.get('ar_template')
        if not file or not file.filename.endswith('.docx'):
            flash('Please upload a DOCX file.', 'danger')
            return redirect(url_for('login.login_admin'))
        file_bytes = file.read()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE announcements
                    SET ar_template = %s
                    WHERE announcement_id = 1
                """, (file_bytes,))
                conn.commit()
            flash('Accomplishment Report Template uploaded successfully!', 'success')
        except Exception as e:
            conn.rollback()
            flash('Failed to upload template: ' + str(e), 'danger')
        return redirect(url_for('login.login_admin'))
    finally:
        conn.close()

@admin_bp.route('/admin_authenticate', methods=['POST'])
def admin_authenticate():
    conn = get_conn()
    try:
        if 'admin_logged_in' not in session or 'admin_username' not in session:
            return jsonify({'success': False, 'error': 'Not authenticated.'})
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        # Only allow the currently logged-in admin
        if username != session['admin_username']:
            return jsonify({'success': False, 'error': 'You can only authenticate as the currently logged-in admin.'})
        with conn.cursor() as cur:
            cur.execute("SELECT password FROM admin_login WHERE username=%s AND is_active=TRUE", (username,))
            row = cur.fetchone()
            if row and check_password_hash(row[0], password):
                return jsonify({'success': True})
            else:
                return jsonify({'success': False, 'error': 'Invalid admin credentials.'})
    finally:
        conn.close()

@admin_bp.route('/update_student_password', methods=['POST'])
def update_student_password():
    conn = get_conn()
    try:
        data = request.get_json()
        student_id = data.get('student_id')
        new_password = data.get('new_password')
        if not new_password or len(new_password) < 5:
            return jsonify({'success': False, 'error': 'Password must be at least 5 characters.'})
        hashed_password = generate_password_hash(new_password)
        try:
            with conn.cursor() as cur:
                cur.execute("UPDATE student_login SET password=%s WHERE student_id=%s", (hashed_password, student_id))
                conn.commit()
            return jsonify({'success': True})
        except Exception as e:
            conn.rollback()
            return jsonify({'success': False, 'error': str(e)})
    finally:
        conn.close()