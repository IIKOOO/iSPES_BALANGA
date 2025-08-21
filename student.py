from flask import Flask, Blueprint, render_template, request, redirect, url_for, session, make_response, jsonify, flash, send_file
from functools import wraps
from werkzeug.security import check_password_hash, generate_password_hash
import psycopg2
import os
import qrcode
import io
from datetime import datetime
import pytz

student_bp = Blueprint('student', __name__)

now = datetime.now()
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

@student_bp.route('/student_requirements')
@nocache
def student_registrations():
    if 'student_logged_in' not in session:
        return redirect(url_for('index'))
    return render_template('student_requirements.html')

@student_bp.route('/upload_required_docs', methods=['POST'])
@nocache
def upload_required_docs():
    conn = get_conn()
    try:
        if 'student_logged_in' not in session:
            return redirect(url_for('index'))
        student_application_id = session.get('student_id')

        files = request.files
        birth_certificate = files.get('birthCertificate')
        report_card = files.get('reportCard')
        passport_photo = files.get('passportPhoto')
        parents_id = files.get('parentsID')
        itr = files.get('itr')
        manila_tz = pytz.timezone('Asia/Manila')
        now = datetime.now(manila_tz).replace(tzinfo=None)

        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT requirements_id FROM student_application_requirements WHERE student_application_id = %s
            """, (student_application_id,))
            existing = cur.fetchone()

            if existing:
                cur.execute("""
                    UPDATE student_application_requirements
                    SET birth_certificate = %s,
                        parents_valid_id = %s,
                        ctc_rog = %s,
                        parents_itr = %s,
                        passport_pic = %s,
                        last_upload_timestamp = %s
                    WHERE student_application_id = %s
                """, (
                    birth_certificate.read() if birth_certificate else None,
                    parents_id.read() if parents_id else None,
                    report_card.read() if report_card else None,
                    itr.read() if itr else None,
                    passport_photo.read() if passport_photo else None,
                    now, student_application_id
                ))
            else:
                cur.execute("""
                    INSERT INTO student_application_requirements (
                        birth_certificate, parents_valid_id, ctc_rog, parents_itr, passport_pic, student_application_id, first_upload_timestamp, last_upload_timestamp
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    birth_certificate.read() if birth_certificate else None,
                    parents_id.read() if parents_id else None,
                    report_card.read() if report_card else None,
                    itr.read() if itr else None,
                    passport_photo.read() if passport_photo else None,
                    student_application_id,
                    now,
                    now
                ))
            conn.commit()
            cur.close()
            flash('Required documents uploaded successfully!', 'success')
        except Exception as e:
            conn.rollback()
            flash(f'Error uploading required documents: {e}', 'danger')
        return redirect(url_for('student.student_registrations'))
    finally:
        conn.close()

@student_bp.route('/upload_additional_docs', methods=['POST'])
@nocache
def upload_additional_docs():
    conn = get_conn()
    try:
        if 'student_logged_in' not in session:
            return redirect(url_for('index'))
        student_application_id = session.get('student_id')

        file = request.files.get('additionalFiles')
        if not file or not file.filename:
            flash('No additional file selected.', 'danger')
            return redirect(url_for('student.student_registrations'))

        file_bytes = file.read()
        manila_tz = pytz.timezone('Asia/Manila')
        now = datetime.now(manila_tz).replace(tzinfo=None)
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT requirements_id FROM student_application_requirements WHERE student_application_id = %s
            """, (student_application_id,))
            existing = cur.fetchone()

            if existing:
                cur.execute("""
                    UPDATE student_application_requirements
                    SET additional_files = %s,
                        additional_first_upload_timestamp = COALESCE(additional_first_upload_timestamp, %s),
                        additional_last_upload_timestamp = %s
                    WHERE student_application_id = %s
                """, (
                    file_bytes,
                    now,
                    now,
                    student_application_id
                ))
            else:
                flash('No existing record found for additional files.', 'danger')
                cur.close()
                return redirect(url_for('student.student_registrations'))

            conn.commit()
            cur.close()
            flash('Additional document uploaded successfully!', 'success')
        except Exception as e:
            conn.rollback()
            flash(f'Error uploading additional document: {e}', 'danger')
        return redirect(url_for('student.student_registrations'))
    finally:
        conn.close()

@student_bp.route('/student_dtr')
@nocache
def student_dtr():
    if 'student_logged_in' not in session:
        return redirect(url_for('index'))
    return render_template('student_dtr.html')

@student_bp.route('/student_qr')
def student_qr():
    student_id = session.get('student_id')
    if not student_id:
        return "Not logged in", 401
    img = qrcode.make(str(student_id))
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    return send_file(buf, mimetype='image/png')

@student_bp.route('/get_dtr')
def get_dtr():
    conn = get_conn()
    try:
        student_id = session.get('student_id')
        if not student_id:
            return jsonify([])
        with conn.cursor() as cur:
            cur.execute("""
                SELECT date, time_in_am, time_out_am, time_in_pm, time_out_pm, dtr_time_evaluation_am, dtr_time_evaluation_pm, daily_total, scanner_location
                FROM student_dtr WHERE student_id=%s ORDER BY date ASC
            """, (student_id,))
            rows = cur.fetchall()
        data = []
        for row in rows:
            data.append({
                'date': row[0].strftime('%Y-%m-%d'),
                'time_in_am': row[1].strftime('%H:%M:%S') if row[1] else '',
                'time_out_am': row[2].strftime('%H:%M:%S') if row[2] else '',
                'time_in_pm': row[3].strftime('%H:%M:%S') if row[3] else '',
                'time_out_pm': row[4].strftime('%H:%M:%S') if row[4] else '',
                'evaluation_am': row[5] or '',
                'evaluation_pm': row[6] or '',
                'daily_total': row[7] or '',
                'scanner_location': row[8] or '',
            })
        return jsonify(data)
    finally:
        conn.close()

@student_bp.route('/upload_accomplishment_report', methods=['POST'])
def upload_accomplishment_report():
    conn = get_conn()
    try:
        if 'student_logged_in' not in session:
            flash('You must be logged in to upload.', 'danger')
            return redirect(url_for('student.student_dtr'))

        student_id = session.get('student_id')
        file = request.files.get('accomplishment_report')
        file_bytes = file.read()

        try:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE student_dtr_records
                    SET accomplishment_report = %s
                    WHERE dtr_record_id = %s
                """, (file_bytes, student_id))
                conn.commit()
            flash('Accomplishment report uploaded successfully!', 'success')
        except Exception as e:
            flash('Failed to upload accomplishment report.', 'danger')

        return redirect(url_for('student.student_dtr'))
    finally:
        conn.close()

@student_bp.route('/student_resign', methods=['POST'])
def student_resign():
    conn = get_conn()
    try:
        if 'student_logged_in' not in session:
            return jsonify({'success': False, 'error': 'Not logged in'}), 401
        student_id = session.get('student_id')
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT date, time_in_am, time_out_am, time_in_pm, time_out_pm, dtr_time_evaluation_am, dtr_time_evaluation_pm, daily_total
                    FROM student_dtr WHERE student_id=%s ORDER BY date ASC
                """, (student_id,))
                dtr_rows = cur.fetchall()
                if not dtr_rows:
                    return jsonify({'success': False, 'error': 'No DTR records found.'})

                import json
                total_hours = sum(float(r[7]) for r in dtr_rows if r[7] and str(r[7]).replace('.', '', 1).isdigit())
                total_late = sum(
                    1 for r in dtr_rows
                    if (str(r[5]).strip().lower() == 'late' or str(r[6]).strip().lower() == 'late')
                )
                total_ontime = sum(
                    1 for r in dtr_rows
                    if (str(r[5]).strip().lower() == 'on-time' or str(r[6]).strip().lower() == 'on-time')
                )
                starting_date = dtr_rows[0][0] if dtr_rows else None
                end_date = dtr_rows[-1][0] if dtr_rows else None
                cur.execute("""
                    SELECT student_id, last_name, first_name, middle_name, suffix, email, student_category, mobile_no, birth_date
                    FROM student_application WHERE student_id=%s
                """, (student_id,))
                student = cur.fetchone()
                if not student:
                    return jsonify({'success': False, 'error': 'Student not found.'})
                cur.execute("""
                    INSERT INTO student_dtr_records (
                        dtr_record_id, last_name, first_name, middle_name, suffix, email, student_category, mobile_no, birth_date, total_worked_hours, starting_date, end_date, dtr_details
                    ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    ON CONFLICT (dtr_record_id) DO UPDATE SET
                        last_name=EXCLUDED.last_name,
                        first_name=EXCLUDED.first_name,
                        middle_name=EXCLUDED.middle_name,
                        suffix=EXCLUDED.suffix,
                        email=EXCLUDED.email,
                        student_category=EXCLUDED.student_category,
                        mobile_no=EXCLUDED.mobile_no,
                        birth_date=EXCLUDED.birth_date,
                        total_worked_hours=EXCLUDED.total_worked_hours,
                        starting_date=EXCLUDED.starting_date,
                        end_date=EXCLUDED.end_date,
                        dtr_details=EXCLUDED.dtr_details
                """, (
                    student[0], student[1], student[2], student[3], student[4], student[5], student[6], student[7], student[8], str(total_hours),
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
            flash('You have successfully resigned. Please upload your accomplishment report.', 'success')
            return jsonify({'success': True})
        except Exception as e:
            conn.rollback()
            return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        conn.close()
    
@student_bp.route('/check_in_dtr_records')
def check_in_dtr_records():
    conn = get_conn()
    try:
        if 'student_logged_in' not in session:
            return jsonify({'in_records': False})
        student_id = session.get('student_id')
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM student_dtr_records WHERE dtr_record_id=%s", (student_id,))
            exists = cur.fetchone() is not None
        return jsonify({'in_records': exists})
    finally:
        conn.close()

@student_bp.route('/get_requirements_status')
def get_requirements_status():
    conn = get_conn()
    try:
        if 'student_logged_in' not in session:
            return jsonify({})
        student_application_id = session.get('student_id')
        with conn.cursor() as cur:
            cur.execute("""
                SELECT birth_certificate_isgood, parents_valid_id_isgood, ctc_rog_isgood, parents_itr_isgood, passport_pic_isgood, additional_files_isgood
                FROM student_application_requirements WHERE student_application_id = %s
            """, (student_application_id,))
            status = cur.fetchone()
        if status:
            return jsonify({
                "birth_certificate": status[0],
                "parents_valid_id": status[1],
                "ctc_rog": status[2],
                "parents_itr": status[3],
                "passport_pic": status[4],
                "additional_files": status[5]
            })
        else:
            return jsonify({})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()
    
@student_bp.route('/upload_requested_docs', methods=['POST'])
def upload_requested_docs():
    conn = get_conn()
    try:
        if 'student_logged_in' not in session:
            flash('You must be logged in to upload.', 'danger')
            return redirect(url_for('student.student_dtr'))

        student_id = session.get('student_id')
        file = request.files.get('requested_docs')
        file_bytes = file.read() if file else None

        try:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE student_dtr_records
                    SET requested_docs = %s, requested_docs_isgood = TRUE
                    WHERE dtr_record_id = %s
                """, (file_bytes, student_id))
                conn.commit()
            flash('Requested document uploaded successfully!', 'success')
        except Exception as e:
            conn.rollback()
            flash('Failed to upload requested document.', 'danger')

        return redirect(url_for('student.student_dtr'))
    finally:
        conn.close()

@student_bp.route('/get_student_dtr_record_status')
def get_student_dtr_record_status():
    conn = get_conn()
    try:
        if 'student_logged_in' not in session:
            return jsonify({'on_hold': False})
        student_id = session.get('student_id')
        with conn.cursor() as cur:
            cur.execute("SELECT on_hold FROM student_dtr_records WHERE dtr_record_id=%s", (student_id,))
            row = cur.fetchone()
        return jsonify({'on_hold': row[0] if row else False})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@student_bp.route('/get_dtr_upload_status')
def get_dtr_upload_status():
    conn = get_conn()
    try:
        if 'student_logged_in' not in session:
            return jsonify({})
        student_id = session.get('student_id')
        with conn.cursor() as cur:
            cur.execute("""
                SELECT ar_isgood, requested_docs_isgood
                FROM student_dtr_records
                WHERE dtr_record_id = %s
            """, (student_id,))
            row = cur.fetchone()
        return jsonify({
            "ar_isgood": bool(row[0]) if row else False,
            "requested_docs_isgood": bool(row[1]) if row else False
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()
    
@student_bp.route('/download_ar_template')
def download_ar_template():
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT ar_template FROM announcements WHERE announcement_id = 1")
            row = cur.fetchone()
            if not row or not row[0]:
                flash('No template available.', 'danger')
                return redirect(url_for('student.student_dtr'))
            file_bytes = row[0]
        return send_file(
            io.BytesIO(file_bytes),
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            as_attachment=True,
            download_name='Accomplishment_Report_Template.docx'
        )
    except Exception as e:
        return str(e), 500
    finally:
        conn.close()

@student_bp.route('/student_auth_password', methods=['POST'])
def student_auth_password():
    conn = get_conn()
    try:
        if 'student_logged_in' not in session:
            return jsonify({'success': False, 'error': 'Not logged in'}), 401
        data = request.get_json()
        current_password = data.get('current_password')
        student_id = session.get('student_id')
        with conn.cursor() as cur:
            cur.execute("SELECT password FROM student_login WHERE student_id=%s AND is_active=TRUE", (student_id,))
            row = cur.fetchone()
            if not row or not check_password_hash(row[0], current_password):
                return jsonify({'success': False, 'error': 'Incorrect password.'})
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        conn.close()

@student_bp.route('/student_update_password', methods=['POST'])
def student_update_password():
    conn = get_conn()
    try:
        if 'student_logged_in' not in session:
            return jsonify({'success': False, 'error': 'Not logged in'}), 401
        data = request.get_json()
        new_password = data.get('new_password')
        if not new_password or len(new_password) < 6:
            return jsonify({'success': False, 'error': 'Password must be at least 6 characters.'})
        student_id = session.get('student_id')
        hashed = generate_password_hash(new_password)
        try:
            with conn.cursor() as cur:
                cur.execute("UPDATE student_login SET password=%s WHERE student_id=%s", (hashed, student_id))
                conn.commit()
            return jsonify({'success': True})
        except Exception as e:
            conn.rollback()
            return jsonify({'success': False, 'error': str(e)})
    finally:
        conn.close()    
