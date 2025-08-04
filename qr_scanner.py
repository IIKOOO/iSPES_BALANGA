from flask import request, jsonify, Blueprint, session
from datetime import datetime, time
from werkzeug.security import check_password_hash
import psycopg2
import os
import pytz


qr_bp = Blueprint('qr', __name__) 
url = os.getenv('DATABASE_URL')
conn = psycopg2.connect(url)

@qr_bp.route('/dtr_scan', methods=['POST'])
def dtr_scan():
    data = request.get_json()
    student_id = data.get('student_id')
    captured_image = data.get('captured_image')
    scanner_location = data.get('scanner_location')  # <-- NEW
    print("Captured image received:", bool(captured_image))
    if not student_id:
        return jsonify({'success': False, 'error': 'No student_id'}), 400
    
    with conn.cursor() as cur:
        cur.execute("SELECT 1 FROM student_application WHERE student_id=%s AND is_approved=TRUE", (student_id,))
        approved = cur.fetchone()
        if not approved:
            return jsonify({'success': False, 'error': 'Student is not approved or not yet approved for SPES.'}), 403

    now = datetime.now(pytz.timezone('Asia/Manila'))
    today = now.date()
    current_time = now.time()
    try:
        with conn.cursor() as cur:
            # DTR insert/update logic
            cur.execute("SELECT dtr_id, time_in_am, time_out_am, time_in_pm, time_out_pm FROM student_dtr WHERE student_id=%s AND date=%s", (student_id, today))
            row = cur.fetchone()
            if not row:
                if current_time < time(12,0):
                    dtr_time_evaluation_am = "On-time" if current_time <= time(8,0) else "Late"
                    location_str = f"{scanner_location} - am"
                    cur.execute("""
                        INSERT INTO student_dtr (student_id, date, time_in_am, dtr_time_evaluation_am, scanner_location)
                        VALUES (%s, %s, %s, %s, %s)
                        RETURNING dtr_id
                    """, (student_id, today, now, dtr_time_evaluation_am, location_str))
                    dtr_id = cur.fetchone()[0]
                else:
                    dtr_time_evaluation_pm = "On-time" if current_time <= time(13,0) else "Late"
                    location_str = f"{scanner_location} - pm"
                    cur.execute("""
                        INSERT INTO student_dtr (student_id, date, time_in_pm, dtr_time_evaluation_pm, scanner_location)
                        VALUES (%s, %s, %s, %s, %s)
                        RETURNING dtr_id
                    """, (student_id, today, now, dtr_time_evaluation_pm, location_str))
                    dtr_id = cur.fetchone()[0]
            else:
                dtr_id, in_am, out_am, in_pm, out_pm = row
                cur.execute("SELECT scanner_location FROM student_dtr WHERE dtr_id=%s", (dtr_id,))
                prev_location = cur.fetchone()[0] or ""
                if current_time < time(12,0):
                    if not in_am:
                        dtr_time_evaluation_am = "On-time" if current_time <= time(8,0) else "Late"
                        location_str = f"{scanner_location} - am"
                        cur.execute("UPDATE student_dtr SET time_in_am=%s, dtr_time_evaluation_am=%s, scanner_location=%s WHERE dtr_id=%s", (now, dtr_time_evaluation_am, location_str, dtr_id))
                    elif not out_am:
                        location_str = prev_location if prev_location else f"{scanner_location} - am"
                        cur.execute("UPDATE student_dtr SET time_out_am=%s, scanner_location=%s WHERE dtr_id=%s", (now, location_str, dtr_id))
                else:
                    # --- AFTER 12:00 PM ---
                    # Special handling for scan at or after 17:00 (5:00 PM)
                    if current_time >= time(17,0):
                        # If only time_in_am exists, fill time_out_am (12:00), time_in_pm (13:00), and time_out_pm (now), mark as skipped
                        if in_am and not out_am and not in_pm and not out_pm:
                            am_out = datetime.combine(today, time(12,0))
                            pm_in = datetime.combine(today, time(13,0))
                            dtr_time_evaluation_pm = "Skipped AM out/PM in scan"
                            location_str = prev_location if prev_location else f"{scanner_location} - am, {scanner_location} - pm"
                            cur.execute("""
                                UPDATE student_dtr
                                SET time_out_am=%s, time_in_pm=%s, time_out_pm=%s, dtr_time_evaluation_pm=%s, scanner_location=%s
                                WHERE dtr_id=%s
                            """, (am_out, pm_in, now, dtr_time_evaluation_pm, location_str, dtr_id))
                        # If only time_in_am and time_out_am exist, do not insert anything (require PM in scan)
                        elif in_am and out_am and not in_pm:
                            pass  # Do nothing, require PM in scan
                        # If all three exist, proceed as usual (time_out_pm)
                        elif in_am and out_am and in_pm and not out_pm:
                            if prev_location:
                                if "pm" not in prev_location:
                                    location_str = f"{prev_location}, {scanner_location} - pm"
                                else:
                                    location_str = prev_location
                            else:
                                location_str = f"{scanner_location} - pm"
                            cur.execute(
                                "UPDATE student_dtr SET time_out_pm=%s, scanner_location=%s WHERE dtr_id=%s",
                                (now, location_str, dtr_id)
                            )
                        # If only PM IN exists, allow PM OUT
                        elif not in_am and in_pm and not out_pm:
                            if prev_location:
                                if "pm" not in prev_location:
                                    location_str = f"{prev_location}, {scanner_location} - pm"
                                else:
                                    location_str = prev_location
                            else:
                                location_str = f"{scanner_location} - pm"
                            cur.execute(
                                "UPDATE student_dtr SET time_out_pm=%s, scanner_location=%s WHERE dtr_id=%s",
                                (now, location_str, dtr_id)
                            )
                        # If none of the above, fallback to your original logic
                        else:
                            pass
                    else:
                        # --- Normal after-12:00 logic (unchanged) ---
                        # 1. If time_out_am is not set but time_in_am exists, set time_out_am
                        if in_am and not out_am:
                            location_str = prev_location if prev_location else f"{scanner_location} - am"
                            cur.execute(
                                "UPDATE student_dtr SET time_out_am=%s, scanner_location=%s WHERE dtr_id=%s",
                                (now, location_str, dtr_id)
                            )
                                                # 2. If time_in_am does not exist, handle PM logic (student only attends PM)
                        elif not in_am:
                            if not in_pm:
                                dtr_time_evaluation_pm = "On-time" if current_time <= time(13,0) else "Late"
                                if prev_location:
                                    if "pm" not in prev_location:
                                        location_str = f"{prev_location}, {scanner_location} - pm"
                                    else:
                                        location_str = prev_location
                                else:
                                    location_str = f"{scanner_location} - pm"
                                cur.execute(
                                    "UPDATE student_dtr SET time_in_pm=%s, dtr_time_evaluation_pm=%s, scanner_location=%s WHERE dtr_id=%s",
                                    (now, dtr_time_evaluation_pm, location_str, dtr_id)
                                )
                            if in_pm and not out_pm:  # <-- changed from 'elif' to 'if'
                                if prev_location:
                                    if "pm" not in prev_location:
                                        location_str = f"{prev_location}, {scanner_location} - pm"
                                    else:
                                        location_str = prev_location
                                else:
                                    location_str = f"{scanner_location} - pm"
                                cur.execute(
                                    "UPDATE student_dtr SET time_out_pm=%s, scanner_location=%s WHERE dtr_id=%s",
                                    (now, location_str, dtr_id)
                                )
                        # 3. If time_in_am exists and time_out_am is set, proceed to PM logic as usual
                        else:
                            if not in_pm:
                                dtr_time_evaluation_pm = "On-time" if current_time <= time(13,0) else "Late"
                                if prev_location:
                                    if "pm" not in prev_location:
                                        location_str = f"{prev_location}, {scanner_location} - pm"
                                    else:
                                        location_str = prev_location
                                else:
                                    location_str = f"{scanner_location} - pm"
                                cur.execute(
                                    "UPDATE student_dtr SET time_in_pm=%s, dtr_time_evaluation_pm=%s, scanner_location=%s WHERE dtr_id=%s",
                                    (now, dtr_time_evaluation_pm, location_str, dtr_id)
                                )
                            elif not out_pm:
                                if prev_location:
                                    if "pm" not in prev_location:
                                        location_str = f"{prev_location}, {scanner_location} - pm"
                                    else:
                                        location_str = prev_location
                                else:
                                    location_str = f"{scanner_location} - pm"
                                cur.execute(
                                    "UPDATE student_dtr SET time_out_pm=%s, scanner_location=%s WHERE dtr_id=%s",
                                    (now, location_str, dtr_id)
                                )

            # --- Always save the image after DTR insert/update ---
            if captured_image and dtr_id:
                import base64
                image_data = base64.b64decode(captured_image.split(',')[1])
                cur.execute(
                    "INSERT INTO student_dtr_images (dtr_id, student_id, image_data, captured_at) VALUES (%s, %s, %s, %s)",
                    (dtr_id, student_id, psycopg2.Binary(image_data), now)
                )

            # Check if already in records
            cur.execute("SELECT 1 FROM student_dtr_records WHERE dtr_record_id = %s", (student_id,))
            if cur.fetchone():
                conn.commit()
                return jsonify({'success': False, 'error': 'You have completed your work. DTR logging is closed.'})
            
            # --- Calculate and update daily total hours ---
            # After updating time_out_am or time_out_pm
            cur.execute("""
            SELECT time_in_am, time_out_am, time_in_pm, time_out_pm, date
                FROM student_dtr WHERE dtr_id=%s
            """, (dtr_id,))
            times = cur.fetchone()
            if times:
                total_hours = 0
                dtr_date = times[4]
                # Calculate AM hours (clip to 8:00-12:00)
                if times[0] and times[1]:
                    am_in = max(times[0].replace(tzinfo=None), datetime.combine(dtr_date, time(8,0)))
                    am_out = min(times[1].replace(tzinfo=None), datetime.combine(dtr_date, time(12,0)))
                    if am_in < am_out:
                        total_hours += (am_out - am_in).total_seconds() / 3600
                # Calculate PM hours (clip to 13:00-17:00)
                if times[2] and times[3]:
                    pm_in = max(times[2].replace(tzinfo=None), datetime.combine(dtr_date, time(13,0)))
                    pm_out = min(times[3].replace(tzinfo=None), datetime.combine(dtr_date, time(17,0)))
                    if pm_in < pm_out:
                        total_hours += (pm_out - pm_in).total_seconds() / 3600
                # Cap daily total at 8 hours
                total_hours = min(total_hours, 8)
                cur.execute("UPDATE student_dtr SET daily_total=%s WHERE dtr_id=%s", (round(total_hours, 2), dtr_id))

            # Calculate total worked hours so far
            cur.execute("SELECT SUM(CASE WHEN daily_total ~ '^[0-9.]+$' THEN daily_total::numeric ELSE 0 END) FROM student_dtr WHERE student_id=%s", (student_id,))
            total_hours = cur.fetchone()[0] or 0

            # If about to reach or exceed 160, finalize and insert to records
            if total_hours >= 160:
                cur.execute("""
                    SELECT date, time_in_am, time_out_am, time_in_pm, time_out_pm, dtr_time_evaluation_am, dtr_time_evaluation_pm, daily_total
                    FROM student_dtr WHERE student_id=%s ORDER BY date ASC
                """, (student_id,))
                dtr_rows = cur.fetchall()
                def serialize_field(val):
                    if isinstance(val, (datetime, )):
                        return val.strftime('%Y-%m-%d %H:%M:%S')
                    elif hasattr(val, 'isoformat'):
                        return val.isoformat()
                    return val
                dtr_rows_serialized = [
                    [serialize_field(col) for col in row]
                    for row in dtr_rows
                ]
                starting_date = dtr_rows[0][0] if dtr_rows else None
                end_date = dtr_rows[-1][0] if dtr_rows else None
                # Get student details (including id and student_category)
                cur.execute("""
                    SELECT student_id, last_name, first_name, middle_name, suffix, email, student_category, mobile_no, birth_date
                    FROM student_application
                    WHERE student_id=%s AND is_approved=TRUE
                """, (student_id,))
                student = cur.fetchone()
                import json
                if not student:
                    conn.commit()
                    return jsonify({'success': False, 'error': 'Student not found or not approved'}), 404
                cur.execute("""
                    INSERT INTO student_dtr_records (
                        dtr_record_id, last_name, first_name, middle_name, suffix, email, student_category, mobile_no, birth_date,
                        total_worked_hours, starting_date, end_date, dtr_details
                    ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                """, (
                    student[0], student[1], student[2], student[3], student[4], student[5], student[6], student[7], student[8],
                    str(total_hours),
                    starting_date.strftime('%Y-%m-%d') if starting_date else None,
                    end_date.strftime('%Y-%m-%d') if end_date else None,
                    json.dumps(dtr_rows_serialized)
                ))
                
                # # --- Archive student data ---
                # # Archive student_application
                # cur.execute("""
                #     INSERT INTO student_application_archive
                #     SELECT * FROM student_application WHERE student_id = %s
                # """, (student_id,))
                # # Archive education
                # cur.execute("""
                #     INSERT INTO student_application_archive_education
                #     SELECT * FROM student_application_education WHERE student_application_id = %s
                # """, (student_id,))
                # # Archive parents/guardians
                # cur.execute("""
                #     INSERT INTO student_application_archive_parents_guardians
                #     SELECT * FROM student_application_parents_guardians WHERE student_application_id = %s
                # """, (student_id,))
                # # Archive requirements
                # cur.execute("""
                #     INSERT INTO student_application_archive_requirements
                #     SELECT * FROM student_application_requirements WHERE student_application_id = %s
                # """, (student_id,))

                # # --- Delete from main tables ---
                # cur.execute("DELETE FROM student_application_requirements WHERE student_application_id = %s", (student_id,))
                # cur.execute("DELETE FROM student_application_education WHERE student_application_id = %s", (student_id,))
                # cur.execute("DELETE FROM student_application_parents_guardians WHERE student_application_id = %s", (student_id,))
                # cur.execute("DELETE FROM student_application WHERE student_id = %s", (student_id,))
                
                conn.commit()
                return jsonify({'success': False, 'error': 'You have reached the maximum 160 hours. DTR logging is now closed.'})

            conn.commit()
            return jsonify({'success': True})
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    
@qr_bp.route('/get_student_info/<int:student_id>')
def get_student_info(student_id):
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT student_id, last_name, first_name, middle_name, suffix, sex, email
                FROM student_application
                WHERE student_id = %s AND is_approved = TRUE
            """, (student_id,))
            row = cur.fetchone()
            if not row:
                return jsonify({'success': False, 'error': 'Student not found or not approved'}), 404
            # If you want to fetch passport_pic:
            cur.execute("""
                SELECT passport_pic FROM student_application_requirements WHERE student_application_id = %s
            """, (student_id,))
            pic_row = cur.fetchone()
            import base64
            passport_pic = base64.b64encode(pic_row[0]).decode('utf-8') if pic_row and pic_row[0] else None
            return jsonify({
                'success': True,
                'student': {
                    'student_id': row[0],
                    'last_name': row[1],
                    'first_name': row[2],
                    'middle_name': row[3],
                    'suffix': row[4],
                    'sex': row[5],
                    'email': row[6],
                    'passport_pic': passport_pic
                }
            })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    
    
@qr_bp.route('/scanner_lock', methods=['POST'])
def scanner_lock():
    try:
        with conn.cursor() as cur:
            cur.execute("UPDATE registration_restrictions SET scanner_islocked=TRUE WHERE restriction_id=1")
            conn.commit()
        return jsonify({'success': True})
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@qr_bp.route('/scanner_unlock', methods=['POST'])
def scanner_unlock():
    if 'peso_logged_in' not in session or 'peso_id' not in session:
        return jsonify({'success': False, 'error': 'Not logged in'}), 401

    data = request.get_json()
    password = data.get('password')
    if not password:
        return jsonify({'success': False, 'error': 'Password required'}), 400
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT password FROM peso_login WHERE peso_id=%s AND is_active=TRUE", (session['peso_id'],))
            row = cur.fetchone()
            if not row or not check_password_hash(row[0], password):
                return jsonify({'success': False, 'error': 'Invalid password'}), 403
            cur.execute("UPDATE registration_restrictions SET scanner_islocked=FALSE WHERE restriction_id=1")
            conn.commit()
        return jsonify({'success': True})
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@qr_bp.route('/scanner_lock_status')
def scanner_lock_status():
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT scanner_islocked FROM registration_restrictions WHERE restriction_id=1")
            row = cur.fetchone()
            return jsonify({'locked': bool(row[0])})
    except Exception as e:
        return jsonify({'locked': False, 'error': str(e)}), 500