from flask import Blueprint, request, render_template, redirect, url_for, flash, jsonify, session, make_response, send_file
import psycopg2
from functools import wraps
from datetime import datetime
from werkzeug.security import check_password_hash, generate_password_hash
import io
import requests
import pytz
import os
from dotenv import load_dotenv

load_dotenv()
API_TOKEN = os.getenv('API_TOKEN')

peso_bp = Blueprint('peso', __name__)

def get_conn():
    url = os.getenv('DATABASE_URL')
    return psycopg2.connect(url)

def send_sms(to, message):
    url = f'https://sms.iprogtech.com/api/v1/sms_messages'
    payload = {
        "api_token": API_TOKEN,
        "phone_number": to,
        "message": message
    }
    headers = {
        "Content-Type": "application/json"
    }
    response = requests.post(url, json=payload, headers=headers)
    return response.json()

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
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT scanner_islocked FROM registration_restrictions WHERE restriction_id=1")
            row = cur.fetchone()
            return bool(row[0])
    finally:
        conn.close()    

def require_scanner_unlocked(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        # Don't redirect if already on the QR scanner page
        if request.endpoint != 'peso.dtr_qr_scanner' and is_scanner_locked():
            return redirect(url_for('peso.dtr_qr_scanner'))
        return view(*args, **kwargs)
    return wrapped

@peso_bp.route('/peso_registration')
@nocache
@require_scanner_unlocked
def peso_registration():
    if 'peso_logged_in' not in session:
        return redirect(url_for('index'))
    return render_template('peso_registration.html')

@peso_bp.route('/peso_pending_registration')
@nocache
@require_scanner_unlocked
def peso_pending_registration():
    if 'peso_logged_in' not in session:
        return redirect(url_for('index'))
    return render_template('peso_pending_registration.html')

@peso_bp.route('/peso_final_spes_list')
@nocache
@require_scanner_unlocked
def peso_final_spes_list():
    if 'peso_logged_in' not in session:
        return redirect(url_for('index'))
    return render_template('peso_final_spes_list.html')

@peso_bp.route('/student_dtr_records')
@nocache
@require_scanner_unlocked
def student_dtr_records():
    if 'peso_logged_in' not in session:
        return redirect(url_for('index'))
    return render_template('student_dtr_records.html')

@peso_bp.route('/student_payroll')
@nocache
@require_scanner_unlocked
def student_payroll():
    if 'peso_logged_in' not in session:
        return redirect(url_for('index'))
    return render_template('student_payroll.html')

@peso_bp.route('/student_applications_archive')
@nocache
@require_scanner_unlocked
def student_applications_archive():
    if 'peso_logged_in' not in session:
        return redirect(url_for('index'))
    return render_template('student_applications_archive.html')

@peso_bp.route('/student_payroll_archive')
@nocache
@require_scanner_unlocked
def student_payroll_archive():
    if 'peso_logged_in' not in session:
        return redirect(url_for('index'))
    return render_template('student_payroll_archive.html')

@peso_bp.route('/dtr_qr_scanner')
@nocache
def dtr_qr_scanner():
    if 'peso_logged_in' not in session:
        return redirect(url_for('index'))
    return render_template('qr_scanner.html')

@peso_bp.route('/retrieve_applications', methods=['POST'])
def retrieve_applications():
    conn = get_conn()
    try:
        status = request.json.get('status', 'registration')  # 'registration', 'pending', 'final'
        student_category = request.json.get('student_category', None)
        search_query = request.json.get('search_query', None)
        sort_option = request.json.get('sort_option', 'last_name_asc')

        # Determine flags based on status
        if status == 'registration':
            where_flags = "is_pending = FALSE AND is_approved = FALSE"
        elif status == 'pending':
            where_flags = "is_pending = TRUE AND is_approved = FALSE"
        elif status == 'final':
            where_flags = "is_pending = FALSE AND is_approved = TRUE"
        else:
            return jsonify({"error": "Invalid status"}), 400

        query = f"""
            SELECT s.student_id, s.last_name, s.first_name, s.middle_name, s.student_category, s.email, s.time_stamp
            FROM public.student_application s
            JOIN public.student_application_requirements r ON s.student_id = r.student_application_id
            WHERE (
                r.birth_certificate IS NOT NULL OR
                r.parents_valid_id IS NOT NULL OR
                r.ctc_rog IS NOT NULL OR
                r.parents_itr IS NOT NULL OR
                r.passport_pic IS NOT NULL OR
                r.additional_files IS NOT NULL
            )
            AND {where_flags}
        """
        params = []

        if student_category and student_category != "All":
            query += " AND s.student_category = %s"
            params.append(student_category)

        if search_query:
            query += " AND (CAST(s.student_id AS TEXT) ILIKE %s OR LOWER(s.last_name) ILIKE %s OR LOWER(s.first_name) ILIKE %s)"
            params.extend([f"%{search_query}%", f"%{search_query.lower()}%", f"%{search_query.lower()}%"])

        if sort_option == "still_working":
            query += " AND s.student_id NOT IN (SELECT dtr_record_id FROM student_dtr_records)"
            query += " ORDER BY s.last_name ASC"
        elif sort_option == "last_name_asc":
            query += " ORDER BY s.last_name ASC"
        elif sort_option == "last_name_desc":
            query += " ORDER BY s.last_name DESC"
        elif sort_option == "timestamp_asc":
            query += " ORDER BY s.time_stamp ASC"
        elif sort_option == "timestamp_desc":
            query += " ORDER BY s.time_stamp DESC"

        with conn.cursor() as cur:
            cur.execute(query, params)
            rows = cur.fetchall()

            # Sibling logic (optional, adjust as needed)
            cur.execute("""
                SELECT DISTINCT p1.student_application_id
                FROM student_application_parents_guardians p1
                JOIN student_application_parents_guardians p2
                    ON p1.student_application_id <> p2.student_application_id
                    AND (
                        (
                            -- Both father and mother present, match both
                            p1.father_full_name NOT IN ('', 'N/A', 'Unknown') AND p2.father_full_name NOT IN ('', 'N/A', 'Unknown')
                            AND p1.mother_full_name NOT IN ('', 'N/A', 'Unknown') AND p2.mother_full_name NOT IN ('', 'N/A', 'Unknown')
                            AND LOWER(TRIM(p1.father_full_name)) = LOWER(TRIM(p2.father_full_name))
                            AND LOWER(TRIM(p1.mother_full_name)) = LOWER(TRIM(p2.mother_full_name))
                        )
                        OR
                        (
                            -- Only mother present, match mother (father missing or different)
                            p1.mother_full_name NOT IN ('', 'N/A', 'Unknown') AND p2.mother_full_name NOT IN ('', 'N/A', 'Unknown')
                            AND LOWER(TRIM(p1.mother_full_name)) = LOWER(TRIM(p2.mother_full_name))
                        )
                        OR
                        (
                            -- Only father present, match father (mother missing or different)
                            p1.father_full_name NOT IN ('', 'N/A', 'Unknown') AND p2.father_full_name NOT IN ('', 'N/A', 'Unknown')
                            AND LOWER(TRIM(p1.father_full_name)) = LOWER(TRIM(p2.father_full_name))
                        )
                    )
                GROUP BY p1.student_application_id
            """)
            sibling_ids = set(row[0] for row in cur.fetchall())

            data = [
                {
                    "student_id": row[0],
                    "last_name": row[1],
                    "first_name": row[2],
                    "middle_name": row[3],
                    "category": row[4],
                    "email": row[5],
                    "time_stamp": row[6].strftime('%a, %Y-%m-%d - %H:%M:%S') if row[6] else 'N/A',
                    "has_sibling": row[0] in sibling_ids
                }
                for row in rows
            ]
            return jsonify(data)
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()
    
@peso_bp.route('/get_student_details/<int:student_id>', methods=['GET'])
def get_student_details(student_id):
    conn = get_conn()
    try:
        # Only use student_application tables
        with conn.cursor() as cur:
            # Main student info
            cur.execute("SELECT * FROM public.student_application WHERE student_id = %s", (student_id,))
            student = cur.fetchone()
            if not student:
                return jsonify({"error": "Student not found."}), 404

            # Education
            cur.execute("SELECT * FROM public.student_application_education WHERE student_application_id = %s", (student_id,))
            education = cur.fetchone()

            # Parents/Guardians
            cur.execute("SELECT * FROM public.student_application_parents_guardians WHERE student_application_id = %s", (student_id,))
            parents_guardians = cur.fetchone()

            # Requirements
            cur.execute("""
                SELECT requirements_id, birth_certificate, parents_valid_id, ctc_rog, parents_itr, passport_pic, additional_files, peso_comment,
                    first_upload_timestamp, last_upload_timestamp, additional_first_upload_timestamp, additional_last_upload_timestamp,
                    birth_certificate_isgood, parents_valid_id_isgood, ctc_rog_isgood, parents_itr_isgood, passport_pic_isgood, additional_files_isgood
                FROM public.student_application_requirements WHERE student_application_id = %s
            """, (student_id,))
            requirements = cur.fetchone()

            # Compose response
            data = {
                "student_id": student[0],
                "student_category": student[1],
                "iskolar_type": student[2],
                "status_of_student": student[3],
                "last_name": student[4],
                "first_name": student[5],
                "middle_name": student[6],
                "suffix": student[7],
                "birth_date": student[8],
                "birth_place": student[9],
                "citizenship": student[10],
                "mobile_no": student[11],
                "email": student[12],
                "civil_status": student[13],
                "sex": student[14],
                "disabilities": student[15],
                "socmed": student[16],
                "participation_count": student[17],
                "belongs_in_group": student[18],
                "barangay": student[19],
                "street_add": student[20],
                "name_of_beneficiary": student[21],
                "relationship_to_beneficiary": student[22],
                "parents_status": student[23],
                "time_stamp": student[24].strftime('%A, %Y-%m-%d - %H:%M:%S') if hasattr(student[24], 'strftime') else student[24],
                "school_name": education[1] if education else "",
                "educational_attainment": education[2] if education else "",
                "senior_high_strand": education[3] if education else "",
                "college_course": education[4] if education else "",
                "attendance_date": education[5] if education else "",
                "living_with": parents_guardians[1] if parents_guardians else "",
                "guardian_full_name": parents_guardians[2] if parents_guardians else "",
                "guardian_contact_no": parents_guardians[3] if parents_guardians else "",
                "guardian_birth_date": parents_guardians[4] if parents_guardians else "",
                "guardian_occupation": parents_guardians[5] if parents_guardians else "",
                "relationship_with_guardian": parents_guardians[6] if parents_guardians else "",
                "guardian_tin_no": parents_guardians[7] if parents_guardians else "",
                "father_full_name": parents_guardians[8] if parents_guardians else "",
                "father_contact_no": parents_guardians[9] if parents_guardians else "",
                "father_birth_date": parents_guardians[10] if parents_guardians else "",
                "father_occupation": parents_guardians[11] if parents_guardians else "",
                "father_tin_no": parents_guardians[12] if parents_guardians else "",
                "mother_full_name": parents_guardians[13] if parents_guardians else "",
                "mother_contact_no": parents_guardians[14] if parents_guardians else "",
                "mother_birth_date": parents_guardians[15] if parents_guardians else "",
                "mother_occupation": parents_guardians[16] if parents_guardians else "",
                "mother_tin_no": parents_guardians[17] if parents_guardians else "",
            }
            data["requirements"] = {
                "requirements_id": requirements[0] if requirements else None,
                "birth_certificate": bool(requirements[1]) if requirements else False,
                "parents_valid_id": bool(requirements[2]) if requirements else False,
                "ctc_rog": bool(requirements[3]) if requirements else False,
                "parents_itr": bool(requirements[4]) if requirements else False,
                "passport_pic": bool(requirements[5]) if requirements else False,
                "additional_files": bool(requirements[6]) if requirements else False,
                "peso_comment": requirements[7] if requirements else "",
                "birth_certificate_isgood": bool(requirements[12]) if requirements else False,
                "parents_valid_id_isgood": bool(requirements[13]) if requirements else False,
                "ctc_rog_isgood": bool(requirements[14]) if requirements else False,
                "parents_itr_isgood": bool(requirements[15]) if requirements else False,
                "passport_pic_isgood": bool(requirements[16]) if requirements else False,
                "additional_files_isgood": bool(requirements[17]) if requirements else False,
            }
            return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()
    
@peso_bp.route('/get_requirement_file/<string:table>/<int:student_id>/<string:file_type>', methods=['GET'])
def get_requirement_file(table, student_id, file_type):
    conn = get_conn()
    try:
        # Only use student_application_requirements and student_application_id
        table_map = {
            "student_application": ("student_application_requirements", "student_application_id"),
        }
        if table not in table_map:
            return "Invalid table", 400
        req_table, fk = table_map[table]
        with conn.cursor() as cur:
            cur.execute(f"""
                SELECT {file_type} FROM public.{req_table} WHERE {fk} = %s
            """, (student_id,))
            result = cur.fetchone()
            if not result or not result[0]:
                return "File not found", 404
            file_bytes = bytes(result[0])
            # Guess content type
            content_type = 'application/pdf'
            if file_type == 'passport_pic':
                content_type = 'image/jpeg'
            return make_response(file_bytes, 200, {
                'Content-Type': content_type,
                'Content-Disposition': f'inline; filename="{file_type}.pdf"'
            })
    except Exception as e:
        conn.rollback()
        return str(e), 500
    finally:
        conn.close()


@peso_bp.route('/update_peso_comment/<int:student_id>', methods=['POST'])
def update_peso_comment(student_id):
    conn = get_conn()
    try:
        comment = request.json.get('comment', '')
        with conn.cursor() as cur:
            # Update the comment
            cur.execute("""
                UPDATE student_application_requirements
                SET peso_comment = %s
                WHERE student_application_id = %s
            """, (comment, student_id))
            conn.commit()

            # Fetch student's mobile_no and first_name
            cur.execute("""
                SELECT mobile_no, first_name
                FROM student_application
                WHERE student_id = %s
            """, (student_id,))
            student = cur.fetchone()
            mobile_no = student[0] if student else None
            first_name = student[1] if student else "Student"

            # Send SMS if mobile_no exists
            if mobile_no:
                sms_message = (
                    f"New comment from PESO regarding the status of your registration. {comment}"
                )
                send_sms(mobile_no, sms_message)

        return jsonify({'success': True})
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        conn.close()
    
@peso_bp.route('/reject_student/<int:student_id>', methods=['POST'])
def reject_student(student_id):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM student_application WHERE student_id = %s", (student_id,))
            # Delete from student_login as well
            cur.execute("DELETE FROM student_login WHERE student_id = %s", (student_id,))
            manila_tz = pytz.timezone('Asia/Manila')
            performed_at = datetime.now(manila_tz).replace(tzinfo=None)
            cur.execute("""
                INSERT INTO peso_action_logs (student_id, action, performed_by, performed_at)
                VALUES (%s, %s, %s, %s)
            """, (student_id, 'Reject', session.get('peso_username', 'unknown'), performed_at))
            conn.commit()
        return jsonify({'success': True})
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        conn.close()

@peso_bp.route('/move_to_pending/<int:student_id>', methods=['POST'])
def move_to_pending(student_id):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            # Update is_pending to TRUE, is_approved to FALSE
            cur.execute("""
                UPDATE student_application
                SET is_pending = TRUE, is_approved = FALSE
                WHERE student_id = %s
            """, (student_id,))
            manila_tz = pytz.timezone('Asia/Manila')
            performed_at = datetime.now(manila_tz).replace(tzinfo=None)
            cur.execute("""
                INSERT INTO peso_action_logs (student_id, action, performed_by, performed_at)
                VALUES (%s, %s, %s, %s)
            """, (student_id, 'Move to Pending', session.get('peso_username', 'unknown'), performed_at))
            conn.commit()
        return jsonify({'success': True})
    except Exception as e:
        conn.rollback()
        print("Move to pending error:", e)
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        conn.close()

@peso_bp.route('/move_to_final_list/<int:student_id>', methods=['POST'])
def move_to_final_list(student_id):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            # Update is_approved to TRUE, is_pending to FALSE
            cur.execute("""
                UPDATE student_application
                SET is_approved = TRUE, is_pending = FALSE
                WHERE student_id = %s
            """, (student_id,))
            manila_tz = pytz.timezone('Asia/Manila')
            performed_at = datetime.now(manila_tz).replace(tzinfo=None)
            cur.execute("""
                INSERT INTO peso_action_logs (student_id, action, performed_by, performed_at)
                VALUES (%s, %s, %s, %s)
            """, (student_id, 'Approved', session.get('peso_username', 'unknown'), performed_at))
            # Fetch student's mobile_no and first_name
            cur.execute("""
                SELECT mobile_no, first_name
                FROM student_application
                WHERE student_id = %s
            """, (student_id,))
            student = cur.fetchone()
            mobile_no = student[0] if student else None
            first_name = student[1] if student else "Student"
            conn.commit()
        # Send SMS notification if mobile_no exists
        if mobile_no:
            sms_message = (
                f"Hello {first_name}, you are now qualified as a SPES beneficiary. Please await further instructions. - SPES Balanga"
            )
            send_sms(mobile_no, sms_message)
        return jsonify({'success': True})
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        conn.close()
    
@peso_bp.route('/move_to_final_list_from_pending/<int:student_id>', methods=['POST'])
def move_to_final_list_from_pending(student_id):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            # Update is_approved to TRUE, is_pending to FALSE
            cur.execute("""
                UPDATE student_application
                SET is_approved = TRUE, is_pending = FALSE
                WHERE student_id = %s
            """, (student_id,))
            manila_tz = pytz.timezone('Asia/Manila')
            performed_at = datetime.now(manila_tz).replace(tzinfo=None)
            cur.execute("""
                INSERT INTO peso_action_logs (student_id, action, performed_by, performed_at)
                VALUES (%s, %s, %s, %s)
            """, (student_id, 'Approved', session.get('peso_username', 'unknown'), performed_at))
            # Fetch student's mobile_no and first_name
            cur.execute("""
                SELECT mobile_no, first_name
                FROM student_application
                WHERE student_id = %s
            """, (student_id,))
            student = cur.fetchone()
            mobile_no = student[0] if student else None
            first_name = student[1] if student else "Student"
            conn.commit()
        # Send SMS notification if mobile_no exists
        if mobile_no:
            sms_message = (
                f"Hello {first_name}, you are now qualified as a SPES beneficiary. Please wait for further instructions. - SPES Balanga"
            )
            send_sms(mobile_no, sms_message)
        return jsonify({'success': True})
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        conn.close()

@peso_bp.route('/registration_summary', methods=['GET'])
def registration_summary():
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            # Only count students with is_pending = FALSE AND is_approved = FALSE
            cur.execute("""
                SELECT COUNT(*) FROM student_application
                WHERE is_pending = FALSE AND is_approved = FALSE
            """)
            total = cur.fetchone()[0]
            cur.execute("""
                SELECT COUNT(DISTINCT s.student_id)
                FROM student_application s
                JOIN student_application_requirements r ON s.student_id = r.student_application_id
                WHERE (r.birth_certificate IS NOT NULL
                    OR r.parents_valid_id IS NOT NULL
                    OR r.ctc_rog IS NOT NULL
                    OR r.parents_itr IS NOT NULL
                    OR r.passport_pic IS NOT NULL
                    OR r.additional_files IS NOT NULL)
                    AND s.is_pending = FALSE AND s.is_approved = FALSE
            """)
            with_req = cur.fetchone()[0]
            cur.execute("""
                SELECT COUNT(*)
                FROM student_application s
                LEFT JOIN student_application_requirements r ON s.student_id = r.student_application_id
                WHERE ((r.birth_certificate IS NULL
                    AND r.parents_valid_id IS NULL
                    AND r.ctc_rog IS NULL
                    AND r.parents_itr IS NULL
                    AND r.passport_pic IS NULL
                    AND r.additional_files IS NULL)
                    OR r.student_application_id IS NULL)
                    AND s.is_pending = FALSE AND s.is_approved = FALSE
            """)
            without_req = cur.fetchone()[0]

        return jsonify({
            "total": total,
            "with_requirements": with_req,
            "without_requirements": without_req
        })
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@peso_bp.route('/delete_students_without_requirements', methods=['POST'])
def delete_students_without_requirements():
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            # Delete students with is_pending = FALSE AND is_approved = FALSE and no requirements
            cur.execute("""
                DELETE FROM student_application s
                USING student_application_requirements r
                WHERE s.student_id = r.student_application_id
                  AND s.is_pending = FALSE AND s.is_approved = FALSE
                  AND r.birth_certificate IS NULL
                  AND r.parents_valid_id IS NULL
                  AND r.ctc_rog IS NULL
                  AND r.parents_itr IS NULL
                  AND r.passport_pic IS NULL
                  AND r.additional_files IS NULL
            """)
            cur.execute("""
                DELETE FROM student_application
                WHERE is_pending = FALSE AND is_approved = FALSE
                  AND student_id NOT IN (SELECT student_application_id FROM student_application_requirements)
            """)
            conn.commit()
        return jsonify({'success': True})
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        conn.close()

@peso_bp.route('/pending_summary', methods=['GET'])
def pending_summary():
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT COUNT(*) FROM student_application
                WHERE is_pending = TRUE AND is_approved = FALSE
            """)
            total_pending = cur.fetchone()[0]
        return jsonify({"total_pending": total_pending})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@peso_bp.route('/final_spes_list_summary', methods=['GET'])
def final_spes_list_summary():
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT COUNT(*) FROM student_application
                WHERE is_approved = TRUE
            """)
            total_final = cur.fetchone()[0]
        return jsonify({"total_final": total_final})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()
        
@peso_bp.route('/final_spes_list_summary_working', methods=['GET'])
def final_spes_list_summary_working():
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT COUNT(*) FROM student_application
                WHERE is_approved = TRUE
                AND student_id NOT IN (
                    SELECT dtr_record_id FROM student_dtr_records
                )
            """)
            total_final_working = cur.fetchone()[0]
        return jsonify({"total_final_working": total_final_working})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@peso_bp.route('/delete_all_pending', methods=['POST'])
def delete_all_pending():
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            # Delete all students with is_pending = TRUE
            cur.execute("""
                DELETE FROM student_application_requirements
                WHERE student_application_id IN (
                    SELECT student_id FROM student_application WHERE is_pending = TRUE
                )
            """)
            cur.execute("""
                DELETE FROM student_application_education
                WHERE student_application_id IN (
                    SELECT student_id FROM student_application WHERE is_pending = TRUE
                )
            """)
            cur.execute("""
                DELETE FROM student_application_parents_guardians
                WHERE student_application_id IN (
                    SELECT student_id FROM student_application WHERE is_pending = TRUE
                )
            """)
            cur.execute("""
                DELETE FROM student_login
                WHERE student_id IN (
                    SELECT student_id FROM student_application WHERE is_pending = TRUE
                )
            """)
            cur.execute("""
                DELETE FROM student_application
                WHERE is_pending = TRUE
            """)
            conn.commit()
        return jsonify({'success': True})
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        conn.close()
    
@peso_bp.route('/peso_action_logs_summary', methods=['GET'])
def peso_action_logs_summary():
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT student_id, action, performed_by, performed_at
                FROM peso_action_logs
                ORDER BY performed_at DESC
                LIMIT 10
            """)
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

@peso_bp.route('/get_student_dtr_records', methods=['POST'])
def get_student_dtr_records():
    conn = get_conn()
    try:
        data = request.get_json() or {}
        status = data.get('status', 'dtr')  # 'dtr' or 'payroll'
        category = data.get('student_category', None)
        search = data.get('search_query', None)
        sort = data.get('sort_option', 'last_name_asc')
        on_hold = data.get('on_hold', None)
        is_paid = data.get('is_paid', None)

        # Set flag for filtering
        if status == 'dtr':
            where_flags = "for_payroll = FALSE"
        elif status == 'payroll':
            where_flags = "for_payroll = TRUE"
        else:
            return jsonify({"error": "Invalid status"}), 400

        query = f"""
            SELECT dtr_record_id, last_name, first_name, middle_name, suffix, email, student_category, mobile_no, birth_date,
                total_worked_hours, starting_date, end_date, dtr_details, accomplishment_report, for_payroll, is_paid,
                ar_isgood, on_hold, requested_docs, requested_docs_isgood, comment_for_dtr
            FROM student_dtr_records
            WHERE {where_flags}
        """
        params = []

        if category and category != "All":
            query += " AND student_category = %s"
            params.append(category)
        if search:
            query += " AND (CAST(dtr_record_id AS TEXT) ILIKE %s OR LOWER(last_name) ILIKE %s OR LOWER(first_name) ILIKE %s)"
            params.extend([f"%{search}%", f"%{search.lower()}%", f"%{search.lower()}%"])
            
        if is_paid is not None:
            query += " AND is_paid = %s"
            params.append(is_paid)

        if on_hold is not None:
            query += " AND on_hold = %s"
            params.append(on_hold)

        if sort == "last_name_asc":
            query += " ORDER BY last_name ASC"
        elif sort == "last_name_desc":
            query += " ORDER BY last_name DESC"

        with conn.cursor() as cur:
            cur.execute(query, params)
            rows = cur.fetchall()
            data = []
            for row in rows:
                student_id = row[0]
                # You can keep or remove this next block if you want to check for accomplishment_report separately
                has_accomplishment_report = bool(row[13])
                data.append({
                    "dtr_record_id": row[0],
                    "last_name": row[1],
                    "first_name": row[2],
                    "middle_name": row[3],
                    "suffix": row[4],
                    "email": row[5],
                    "student_category": row[6],
                    "mobile_no": row[7],
                    "birth_date": row[8],
                    "total_worked_hours": row[9],
                    "starting_date": row[10].strftime('%Y-%m-%d') if row[10] else '',
                    "end_date": row[11].strftime('%Y-%m-%d') if row[11] else '',
                    "dtr_details": row[12],
                    "accomplishment_report": bool(row[13]),
                    "for_payroll": row[14],
                    "is_paid": row[15],
                    "ar_isgood": row[16],
                    "on_hold": row[17],
                    "requested_docs": bool(row[18]),
                    "requested_docs_isgood": row[19],
                    "comment_for_dtr": row[20],
                    "has_accomplishment_report": has_accomplishment_report
                })
        return jsonify(data)
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:    
        conn.close()

@peso_bp.route('/get_student_dtr/<int:student_id>')
def get_student_dtr(student_id):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT dtr_id, scanner_location, date, time_in_am, time_out_am, time_in_pm, time_out_pm, dtr_time_evaluation_am, dtr_time_evaluation_pm, daily_total
                FROM student_dtr WHERE student_id=%s ORDER BY date ASC
            """, (student_id,))
            rows = cur.fetchall()
            data = []
            for row in rows:
                data.append({
                    'dtr_id': row[0],
                    'scanner_location': row[1] or '',
                    'date': row[2].strftime('%Y-%m-%d'),
                    'time_in_am': row[3].strftime('%Y-%m-%dT%H:%M') if row[3] else '',
                    'time_out_am': row[4].strftime('%Y-%m-%dT%H:%M') if row[4] else '',
                    'time_in_pm': row[5].strftime('%Y-%m-%dT%H:%M') if row[5] else '',
                    'time_out_pm': row[6].strftime('%Y-%m-%dT%H:%M') if row[6] else '',
                    'evaluation_am': row[7] or '',
                    'evaluation_pm': row[8] or '',
                    'daily_total': row[9] or ''
                })
            return jsonify(data)
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@peso_bp.route('/get_accomplishment_report/<int:student_id>')
def get_accomplishment_report(student_id):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT accomplishment_report, ar_isgood FROM student_dtr_records WHERE dtr_record_id = %s", (student_id,))
            row = cur.fetchone()
            if not row or not row[0]:
                return jsonify({'has_report': False})
            return jsonify({
                'has_report': True,
                'filetype': 'pdf',
                'ar_isgood': bool(row[1]) if row[1] is not None else False
            })
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@peso_bp.route('/download_accomplishment_report/<int:student_id>')
def download_accomplishment_report(student_id):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT accomplishment_report FROM student_dtr_records WHERE dtr_record_id = %s", (student_id,))
            row = cur.fetchone()
            if not row or not row[0]:
                return "No report", 404
            file_bytes = bytes(row[0])
            return send_file(
                io.BytesIO(file_bytes),
                mimetype='application/pdf',
                as_attachment=False,
                download_name='accomplishment_report.pdf'
            )
    except Exception as e:
        conn.rollback()
        return str(e), 500
    finally:
        conn.close()
        
        
@peso_bp.route('/move_to_payroll/<int:student_id>', methods=['POST'])
def move_to_payroll(student_id):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE student_dtr_records
                SET for_payroll = TRUE
                WHERE dtr_record_id = %s
            """, (student_id,))
            manila_tz = pytz.timezone('Asia/Manila')
            performed_at = datetime.now(manila_tz).replace(tzinfo=None)
            cur.execute("""
                INSERT INTO peso_action_logs (student_id, action, performed_by, performed_at)
                VALUES (%s, %s, %s, %s)
            """, (student_id, 'Move to Payroll', session.get('peso_username', 'unknown'), performed_at))
            # Fetch student's mobile_no and first_name
            cur.execute("""
                SELECT mobile_no, first_name
                FROM student_application
                WHERE student_id = %s
            """, (student_id,))
            student = cur.fetchone()
            mobile_no = student[0] if student else None
            first_name = student[1] if student else "Student"
            conn.commit()
        # Send SMS notification if mobile_no exists
        if mobile_no:
            sms_message = (
                f"Hello {first_name}, you have been moved to payroll. Please check the announcement tab for updates. Thank you. - SPES Balanga"
            )
            send_sms(mobile_no, sms_message)
        flash('Student successfully moved to Payroll!', 'success')
        return jsonify({'success': True})
    except Exception as e:
        conn.rollback()
        flash('Failed to move student to Payroll: ' + str(e), 'danger')
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        conn.close()

@peso_bp.route('/toggle_payroll_paid/<int:student_id>', methods=['POST'])
def toggle_payroll_paid(student_id):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT is_paid FROM student_dtr_records WHERE dtr_record_id = %s", (student_id,))
            is_paid = cur.fetchone()[0]
            new_status = not is_paid
            cur.execute("UPDATE student_dtr_records SET is_paid = %s WHERE dtr_record_id = %s", (new_status, student_id))
            action = 'Mark as Paid' if new_status else 'Mark as Unpaid'
            manila_tz = pytz.timezone('Asia/Manila')
            performed_at = datetime.now(manila_tz).replace(tzinfo=None)
            cur.execute("""
                INSERT INTO peso_action_logs (student_id, action, performed_by, performed_at)
                VALUES (%s, %s, %s, %s)
            """, (student_id, action, session.get('peso_username', 'unknown'), performed_at))
            conn.commit()
        flash(f"Student payroll marked as {'Paid' if new_status else 'Unpaid'}.", "success")
        return jsonify({'success': True, 'is_paid': new_status})
    except Exception as e:
        conn.rollback()
        flash('Failed to update payroll status: ' + str(e), 'danger')
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        conn.close()
    
    
@peso_bp.route('/dtr_summary', methods=['GET'])
def dtr_summary():
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM student_dtr_records WHERE for_payroll = FALSE")
            total = cur.fetchone()[0]
            cur.execute(r"""
                SELECT COUNT(*) FROM student_dtr_records
                WHERE for_payroll = FALSE AND
                    CASE
                        WHEN total_worked_hours ~ '^[0-9]+(\.[0-9]+)?$'
                        THEN CAST(total_worked_hours AS FLOAT) = 160
                        ELSE FALSE
                    END
            """)
            above_160 = cur.fetchone()[0]
            cur.execute(r"""
                SELECT COUNT(*) FROM student_dtr_records
                WHERE for_payroll = FALSE AND
                    CASE
                        WHEN total_worked_hours ~ '^[0-9]+(\.[0-9]+)?$'
                        THEN CAST(total_worked_hours AS FLOAT) < 160
                        ELSE FALSE
                    END
            """)
            below_160 = cur.fetchone()[0]
            # Add On Hold and Active
            cur.execute("SELECT COUNT(*) FROM student_dtr_records WHERE for_payroll = FALSE AND on_hold = TRUE")
            on_hold = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM student_dtr_records WHERE for_payroll = FALSE AND (on_hold = FALSE OR on_hold IS NULL)")
            active = cur.fetchone()[0]

        return jsonify({
            "total": total,
            "above_160": above_160,
            "below_160": below_160,
            "on_hold": on_hold,
            "active": active
        })
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()
    
@peso_bp.route('/payroll_summary', methods=['GET'])
def payroll_summary():
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM student_dtr_records WHERE for_payroll = TRUE")
            total = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM student_dtr_records WHERE for_payroll = TRUE AND is_paid = TRUE")
            paid = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM student_dtr_records WHERE for_payroll = TRUE AND (is_paid = FALSE OR is_paid IS NULL)")
            unpaid = cur.fetchone()[0]
        return jsonify({
            "total": total,
            "paid": paid,
            "unpaid": unpaid
        })
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@peso_bp.route('/verify_peso_password', methods=['POST'])
def verify_peso_password():
    conn = get_conn()
    try:
        data = request.get_json()
        username = session.get('peso_username')
        password = data.get('password')
        with conn.cursor() as cur:
            cur.execute("SELECT last_name, first_name, birth_date, sex, role, username, email, mobile_no, password FROM peso_login WHERE username=%s", (username,))
            row = cur.fetchone()
            # Use check_password_hash to verify hashed password
            if row and check_password_hash(row[8], password):
                # Format birth_date as string if not None
                birth_date_str = row[2].strftime('%Y-%m-%d') if row[2] else ''
                return jsonify({
                    "success": True,
                    "peso": {
                        "last_name": row[0],
                        "first_name": row[1],
                        "birth_date": birth_date_str,
                        "sex": row[3],
                        "role": row[4],
                        "username": row[5],
                        "email": row[6],
                        "mobile_no": row[7] or ''
                    }
                })
            else:
                return jsonify({"success": False})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@peso_bp.route('/update_peso_profile', methods=['POST'])
def update_peso_profile():
    conn = get_conn()
    try:
        data = request.get_json()
        username = session.get('peso_username')
        with conn.cursor() as cur:
            if data.get('password'):
                # Hash the new password before updating
                hashed_password = generate_password_hash(data['password'])
                cur.execute("""
                    UPDATE peso_login SET last_name=%s, first_name=%s, birth_date=%s, sex=%s, role=%s, email=%s, mobile_no=%s, password=%s
                    WHERE username=%s
                """, (data['last_name'], data['first_name'], data['birth_date'], data['sex'], data['role'], data['email'], data['mobile_no'], hashed_password, username))
            else:
                cur.execute("""
                    UPDATE peso_login SET last_name=%s, first_name=%s, birth_date=%s, sex=%s, role=%s, email=%s, mobile_no=%s
                    WHERE username=%s
                """, (data['last_name'], data['first_name'], data['birth_date'], data['sex'], data['role'], data['email'], data['mobile_no'], username))
            conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        conn.close()
    
@peso_bp.route('/get_dtr_images/<int:dtr_id>')
def get_dtr_images(dtr_id):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT image_id, image_data, captured_at FROM student_dtr_images WHERE dtr_id=%s ORDER BY captured_at ASC", (dtr_id,))
            images = []
            for row in cur.fetchall():
                import base64
                img_b64 = base64.b64encode(row[1]).decode('utf-8')
                images.append({
                    "image_id": row[0],
                    "image_data": img_b64,
                    "captured_at": row[2].strftime('%Y-%m-%d %H:%M:%S')
                })
            return jsonify(images)
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

@peso_bp.route('/update_requirement_isgood/<string:table>/<int:student_id>/<string:file_key>', methods=['POST'])
def update_requirement_isgood(table, student_id, file_key):
    conn = get_conn()
    try:
        isgood = request.json.get('isgood', False)
        # Map table to requirements table and FK
        table_map = {
            "student_application": ("student_application_requirements", "student_application_id"),
        }
        if table not in table_map:
            return jsonify({'success': False, 'error': 'Invalid table'}), 400
        req_table, fk = table_map[table]
        isgood_col = f"{file_key}_isgood"
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE {req_table} SET {isgood_col} = %s WHERE {fk} = %s",
                (isgood, student_id)
            )
            conn.commit()
        return jsonify({'success': True})
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        conn.close()
    
@peso_bp.route('/edit_dtr', methods=['POST'])
def edit_dtr():
    conn = get_conn()
    try:
        data = request.get_json()
        dtr_id = data.get('dtr_id')
        time_in_am = data.get('time_in_am')
        time_out_am = data.get('time_out_am')
        time_in_pm = data.get('time_in_pm')
        time_out_pm = data.get('time_out_pm')
        dtr_time_evaluation_am = data.get('dtr_time_evaluation_am')
        dtr_time_evaluation_pm = data.get('dtr_time_evaluation_pm')
        scanner_location = data.get('scanner_location')

        with conn.cursor() as cur:
            cur.execute("""
                UPDATE student_dtr
                SET time_in_am = %s,
                    time_out_am = %s,
                    time_in_pm = %s,
                    time_out_pm = %s,
                    dtr_time_evaluation_am = %s,
                    dtr_time_evaluation_pm = %s,
                    scanner_location = %s
                WHERE dtr_id = %s
                RETURNING student_id
            """, (
                time_in_am, time_out_am, time_in_pm, time_out_pm,
                dtr_time_evaluation_am, dtr_time_evaluation_pm,
                scanner_location, dtr_id
            ))
            student_id = cur.fetchone()[0]

            # Fetch updated times for calculation
            cur.execute("""
                SELECT time_in_am, time_out_am, time_in_pm, time_out_pm, date
                FROM student_dtr WHERE dtr_id = %s
            """, (dtr_id,))
            times = cur.fetchone()
            total_hours = 0

            if times:
                from datetime import datetime, time as dtime

                today = times[4] if len(times) > 4 else (times[0].date() if times[0] else datetime.now().date())
                # AM: Only count between 8:00 and 12:00
                if times[0] and times[1]:
                    am_in = max(times[0].replace(tzinfo=None), datetime.combine(today, dtime(8,0)))
                    am_out = min(times[1].replace(tzinfo=None), datetime.combine(today, dtime(12,0)))
                    if am_in < am_out:
                        total_hours += (am_out - am_in).total_seconds() / 3600
                # PM: Only count between 13:00 and 17:00
                if times[2] and times[3]:
                    pm_in = max(times[2].replace(tzinfo=None), datetime.combine(today, dtime(13,0)))
                    pm_out = min(times[3].replace(tzinfo=None), datetime.combine(today, dtime(17,0)))
                    if pm_in < pm_out:
                        total_hours += (pm_out - pm_in).total_seconds() / 3600
                total_hours = min(total_hours, 8)

            cur.execute("UPDATE student_dtr SET daily_total = %s WHERE dtr_id = %s", (round(total_hours, 2), dtr_id))

            # --- Update student_dtr_records if exists ---
            cur.execute("SELECT 1 FROM student_dtr_records WHERE dtr_record_id = %s", (student_id,))
            if cur.fetchone():
                # Recalculate total_worked_hours only
                cur.execute("""
                    SELECT SUM(CASE WHEN daily_total ~ '^[0-9.]+$' THEN daily_total::numeric ELSE 0 END)
                    FROM student_dtr WHERE student_id = %s
                """, (student_id,))
                total_worked_hours = cur.fetchone()[0] or 0

                cur.execute("""
                    UPDATE student_dtr_records
                    SET total_worked_hours = %s
                    WHERE dtr_record_id = %s
                """, (str(total_worked_hours), student_id))
            manila_tz = pytz.timezone('Asia/Manila')
            performed_at = datetime.now(manila_tz).replace(tzinfo=None)    
            cur.execute("""
                INSERT INTO peso_action_logs (student_id, action, performed_by, performed_at)
                VALUES (%s, %s, %s, %s)
            """, (
                student_id,'Edit DTR', session.get('peso_username', 'unknown'),performed_at
            ))
            conn.commit()

        return jsonify({'success': True})
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        conn.close()


@peso_bp.route('/toggle_payroll_on_hold/<int:student_id>', methods=['POST'])
def toggle_payroll_on_hold(student_id):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT on_hold FROM student_dtr_records WHERE dtr_record_id = %s", (student_id,))
            current_status = cur.fetchone()
            if current_status is None:
                return jsonify({'success': False, 'error': 'Student not found'}), 404
            new_status = not current_status[0]
            cur.execute("UPDATE student_dtr_records SET on_hold = %s WHERE dtr_record_id = %s RETURNING on_hold", (new_status, student_id))
            updated = cur.fetchone()
            # Log the action
            action = 'Mark as On Hold' if new_status else 'Mark as Active'
            manila_tz = pytz.timezone('Asia/Manila')
            performed_at = datetime.now(manila_tz).replace(tzinfo=None)
            cur.execute("""
                INSERT INTO peso_action_logs (student_id, action, performed_by, performed_at)
                VALUES (%s, %s, %s, %s)
            """, (student_id, action, session.get('peso_username', 'unknown'), performed_at))
            conn.commit()
        return jsonify({'success': True, 'on_hold': updated[0]})
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        conn.close()
    
@peso_bp.route('/get_requested_docs/<int:student_id>')
def get_requested_docs(student_id):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT requested_docs, requested_docs_isgood, ar_isgood FROM student_dtr_records WHERE dtr_record_id = %s", (student_id,))
            row = cur.fetchone()
            return jsonify({
                'has_requested_docs': bool(row and row[0]),
                'requested_docs_isgood': bool(row[1]) if row else False,
                'ar_isgood': bool(row[2]) if row else False
            })
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@peso_bp.route('/download_requested_docs/<int:student_id>')
def download_requested_docs(student_id):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT requested_docs FROM student_dtr_records WHERE dtr_record_id = %s", (student_id,))
            row = cur.fetchone()
            if not row or not row[0]:
                return "No requested docs", 404
            file_bytes = bytes(row[0])
            return send_file(
                io.BytesIO(file_bytes),
                mimetype='application/pdf',
                as_attachment=False,
                download_name='requested_docs.pdf'
            )
    except Exception as e:
        conn.rollback()
        return str(e), 500
    finally:
        conn.close()

@peso_bp.route('/update_requested_docs_isgood/<int:student_id>', methods=['POST'])
def update_requested_docs_isgood(student_id):
    conn = get_conn()
    try:
        isgood = request.json.get('isgood', False)
        with conn.cursor() as cur:
            cur.execute("UPDATE student_dtr_records SET requested_docs_isgood = %s WHERE dtr_record_id = %s", (isgood, student_id))
            conn.commit()
        return jsonify({'success': True})
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        conn.close()
    
@peso_bp.route('/update_ar_isgood/<int:student_id>', methods=['POST'])
def update_ar_isgood(student_id):
    conn = get_conn()
    try:
        isgood = request.json.get('isgood', False)
        with conn.cursor() as cur:
            cur.execute("UPDATE student_dtr_records SET ar_isgood = %s WHERE dtr_record_id = %s", (isgood, student_id))
            conn.commit()
        return jsonify({'success': True})
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        conn.close()

@peso_bp.route('/update_dtr_comment/<int:student_id>', methods=['POST'])
def update_dtr_comment(student_id):
    conn = get_conn()
    try:
        comment = request.json.get('comment', '')
        with conn.cursor() as cur:
            # Update the comment
            cur.execute("""
                UPDATE student_dtr_records
                SET comment_for_dtr = %s
                WHERE dtr_record_id = %s
            """, (comment, student_id))
            # Fetch student's mobile_no and first_name
            cur.execute("""
                SELECT mobile_no, first_name
                FROM student_dtr_records
                WHERE dtr_record_id = %s
            """, (student_id,))
            student = cur.fetchone()
            mobile_no = student[0] if student else None
            first_name = student[1] if student else "Student"
            conn.commit()
        # Send SMS if mobile_no exists
        if mobile_no:
            sms_message = (
                f"New comment from PESO regarding Your DTR. {comment}"
            )
            send_sms(mobile_no, sms_message)
        return jsonify({'success': True})
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        conn.close()
    
    
@peso_bp.route('/retrieve_archived_applications', methods=['POST'])
def retrieve_archived_applications():
    conn = get_conn()
    try:
        student_category = request.json.get('student_category', None)
        search_query = request.json.get('search_query', None)
        sort_option = request.json.get('sort_option', 'last_name_asc')

        query = """
            SELECT student_id, last_name, first_name, middle_name, student_category, email, time_stamp
            FROM public.student_application_archive
            WHERE 1=1
        """
        params = []

        if student_category and student_category != "All":
            query += " AND student_category = %s"
            params.append(student_category)

        if search_query:
            query += " AND (CAST(student_id AS TEXT) ILIKE %s OR LOWER(last_name) ILIKE %s OR LOWER(first_name) ILIKE %s)"
            params.extend([f"%{search_query}%", f"%{search_query.lower()}%", f"%{search_query.lower()}%"])

        if sort_option == "last_name_asc":
            query += " ORDER BY last_name ASC"
        elif sort_option == "last_name_desc":
            query += " ORDER BY last_name DESC"
        elif sort_option == "timestamp_asc":
            query += " ORDER BY time_stamp ASC"
        elif sort_option == "timestamp_desc":
            query += " ORDER BY time_stamp DESC"

        with conn.cursor() as cur:
            cur.execute(query, params)
            rows = cur.fetchall()
            data = [
                {
                    "student_id": row[0],
                    "last_name": row[1],
                    "first_name": row[2],
                    "middle_name": row[3],
                    "category": row[4],
                    "email": row[5],
                    "time_stamp": row[6].strftime('%a, %Y-%m-%d - %H:%M:%S') if row[6] else 'N/A'
                }
                for row in rows
            ]
            return jsonify(data)
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@peso_bp.route('/get_archived_student_details/<int:student_id>', methods=['GET'])
def get_archived_student_details(student_id):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM public.student_application_archive WHERE student_id = %s", (student_id,))
            student = cur.fetchone()
            if not student:
                return jsonify({"error": "Student not found."}), 404

            cur.execute("SELECT * FROM public.student_application_archive_education WHERE student_application_id = %s", (student_id,))
            education = cur.fetchone()

            cur.execute("SELECT * FROM public.student_application_archive_parents_guardians WHERE student_application_id = %s", (student_id,))
            parents_guardians = cur.fetchone()

            cur.execute("""
                SELECT * FROM public.student_application_archive_requirements WHERE student_application_id = %s
            """, (student_id,))
            requirements = cur.fetchone()

            # Compose response (adjust indices as needed)
            data = {
                "student_id": student[0],
                "student_category": student[1],
                "iskolar_type": student[2],
                "status_of_student": student[3],
                "last_name": student[4],
                "first_name": student[5],
                "middle_name": student[6],
                "suffix": student[7],
                "birth_date": student[8],
                "birth_place": student[9],
                "citizenship": student[10],
                "mobile_no": student[11],
                "email": student[12],
                "civil_status": student[13],
                "sex": student[14],
                "disabilities": student[15],
                "socmed": student[16],
                "participation_count": student[17],
                "belongs_in_group": student[18],
                "barangay": student[19],
                "street_add": student[20],
                "name_of_beneficiary": student[21],
                "relationship_to_beneficiary": student[22],
                "parents_status": student[23],
                "time_stamp": student[24].strftime('%A, %Y-%m-%d - %H:%M:%S') if hasattr(student[24], 'strftime') else student[24],
                "school_name": education[1] if education else "",
                "educational_attainment": education[2] if education else "",
                "senior_high_strand": education[3] if education else "",
                "college_course": education[4] if education else "",
                "attendance_date": education[5] if education else "",
                "living_with": parents_guardians[1] if parents_guardians else "",
                "guardian_full_name": parents_guardians[2] if parents_guardians else "",
                "guardian_contact_no": parents_guardians[3] if parents_guardians else "",
                "guardian_birth_date": parents_guardians[4] if parents_guardians else "",
                "guardian_occupation": parents_guardians[5] if parents_guardians else "",
                "relationship_with_guardian": parents_guardians[6] if parents_guardians else "",
                "guardian_tin_no": parents_guardians[7] if parents_guardians else "",
                "father_full_name": parents_guardians[8] if parents_guardians else "",
                "father_contact_no": parents_guardians[9] if parents_guardians else "",
                "father_birth_date": parents_guardians[10] if parents_guardians else "",
                "father_occupation": parents_guardians[11] if parents_guardians else "",
                "father_tin_no": parents_guardians[12] if parents_guardians else "",
                "mother_full_name": parents_guardians[13] if parents_guardians else "",
                "mother_contact_no": parents_guardians[14] if parents_guardians else "",
                "mother_birth_date": parents_guardians[15] if parents_guardians else "",
                "mother_occupation": parents_guardians[16] if parents_guardians else "",
                "mother_tin_no": parents_guardians[17] if parents_guardians else "",
            }
            # Requirements (adjust indices as needed)
            if requirements:
                data["requirements"] = {
                    "requirements_id": requirements[0],
                    "birth_certificate": bool(requirements[1]),
                    "parents_valid_id": bool(requirements[2]),
                    "ctc_rog": bool(requirements[3]),
                    "parents_itr": bool(requirements[4]),
                    "passport_pic": bool(requirements[5]),
                    "additional_files": bool(requirements[6]),
                    "peso_comment": requirements[7],
                    "birth_certificate_isgood": bool(requirements[13]),
                    "parents_valid_id_isgood": bool(requirements[14]),
                    "ctc_rog_isgood": bool(requirements[15]),
                    "parents_itr_isgood": bool(requirements[16]),
                    "passport_pic_isgood": bool(requirements[17]),
                    "additional_files_isgood": bool(requirements[18]),
                }
            else:
                data["requirements"] = {}
            return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally :
        conn.close()
    
@peso_bp.route('/get_archived_requirement_file/<int:student_id>/<string:file_type>', methods=['GET'])
def get_archived_requirement_file(student_id, file_type):
    conn = get_conn()
    try:
        # Map file_type to column name
        valid_types = [
            "birth_certificate", "parents_valid_id", "ctc_rog", "parents_itr", "passport_pic", "additional_files"
        ]
        if file_type not in valid_types:
            return "Invalid file type", 400
        with conn.cursor() as cur:
            cur.execute(f"""
                SELECT {file_type}, {file_type}_isgood
                FROM student_application_archive_requirements
                WHERE student_application_id = %s
            """, (student_id,))
            row = cur.fetchone()
            if not row or not row[0]:
                return "File not found", 404
            file_data = row[0]
            # Guess content type
            if file_type == "passport_pic":
                mimetype = "image/jpeg"
                filename = "passport.jpg"
            elif file_type == "additional_files":
                mimetype = "application/pdf"
                filename = "additional_files.pdf"
            else:
                mimetype = "application/pdf"
                filename = f"{file_type}.pdf"
            return send_file(
                io.BytesIO(file_data),
                mimetype=mimetype,
                as_attachment=False,
                download_name=filename
            )
    finally:
        conn.close()        
        
@peso_bp.route('/move_final_spes_list_to_archive', methods=['POST'])
def move_final_spes_list_to_archive():
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            # Get all student_ids in final list (is_approved = TRUE)
            cur.execute("SELECT student_id FROM student_application WHERE is_approved = TRUE")
            student_ids = [row[0] for row in cur.fetchall()]
            for student_id in student_ids:
                # Archive student_application
                cur.execute("""
                    INSERT INTO student_application_archive
                    SELECT * FROM student_application WHERE student_id = %s
                """, (student_id,))
                # Archive education
                cur.execute("""
                    INSERT INTO student_application_archive_education
                    SELECT * FROM student_application_education WHERE student_application_id = %s
                """, (student_id,))
                # Archive parents/guardians
                cur.execute("""
                    INSERT INTO student_application_archive_parents_guardians
                    SELECT * FROM student_application_parents_guardians WHERE student_application_id = %s
                """, (student_id,))
                # Archive requirements
                cur.execute("""
                    INSERT INTO student_application_archive_requirements
                    SELECT * FROM student_application_requirements WHERE student_application_id = %s
                """, (student_id,))
                # Delete from main tables
                cur.execute("DELETE FROM student_application_requirements WHERE student_application_id = %s", (student_id,))
                cur.execute("DELETE FROM student_application_education WHERE student_application_id = %s", (student_id,))
                cur.execute("DELETE FROM student_application_parents_guardians WHERE student_application_id = %s", (student_id,))
                cur.execute("DELETE FROM student_application WHERE student_id = %s", (student_id,))
                cur.execute("DELETE FROM student_login WHERE student_id = %s", (student_id,))
            conn.commit()
        return jsonify({'success': True, 'archived_count': len(student_ids)})
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        conn.close()

@peso_bp.route('/move_student_payroll_to_archive', methods=['POST'])
def move_student_payroll_to_archive():
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT dtr_record_id FROM student_dtr_records WHERE for_payroll = TRUE")
            record_ids = [row[0] for row in cur.fetchall()]
            for record_id in record_ids:
                # Use ON CONFLICT DO NOTHING to avoid duplicate key error
                cur.execute("""
                    INSERT INTO student_dtr_records_archive
                    SELECT * FROM student_dtr_records WHERE dtr_record_id = %s
                    ON CONFLICT (dtr_record_id) DO NOTHING
                """, (record_id,))
                cur.execute("DELETE FROM student_dtr_records WHERE dtr_record_id = %s", (record_id,))
            conn.commit()
        return jsonify({'success': True, 'archived_count': len(record_ids), 'message': f"Successfully moved {len(record_ids)} payroll records to archive.", 'category': "success"})
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e), 'message': f"Error: {str(e)}", 'category': "danger"}), 500
    finally:
        conn.close()
    
@peso_bp.route('/get_student_payroll_archive', methods=['POST'])
def get_student_payroll_archive():
    conn = get_conn()
    try:
        data = request.get_json() or {}
        category = data.get('student_category', None)
        search = data.get('search_query', None)
        sort = data.get('sort_option', 'last_name_asc')
        is_paid = data.get('is_paid', None)

        query = """
            SELECT dtr_record_id, last_name, first_name, middle_name, suffix, email, student_category, mobile_no, birth_date,
                total_worked_hours, starting_date, end_date, dtr_details, accomplishment_report, for_payroll, is_paid,
                ar_isgood, on_hold, requested_docs, requested_docs_isgood, comment_for_dtr
            FROM student_dtr_records_archive
            WHERE 1=1
        """
        params = []

        if category and category != "All":
            query += " AND student_category = %s"
            params.append(category)
        if search:
            query += " AND (CAST(dtr_record_id AS TEXT) ILIKE %s OR LOWER(last_name) ILIKE %s OR LOWER(first_name) ILIKE %s)"
            params.extend([f"%{search}%", f"%{search.lower()}%", f"%{search.lower()}%"])
        if is_paid is not None:
            query += " AND is_paid = %s"
            params.append(is_paid)

        if sort == "last_name_asc":
            query += " ORDER BY last_name ASC"
        elif sort == "last_name_desc":
            query += " ORDER BY last_name DESC"
        elif sort == "timestamp_asc":
            query += " ORDER BY starting_date ASC"
        elif sort == "timestamp_desc":
            query += " ORDER BY starting_date DESC"

        with conn.cursor() as cur:
            cur.execute(query, params)
            rows = cur.fetchall()
            data = []
            for row in rows:
                data.append({
                    "dtr_record_id": row[0],
                    "last_name": row[1],
                    "first_name": row[2],
                    "middle_name": row[3],
                    "suffix": row[4],
                    "email": row[5],
                    "student_category": row[6],
                    "mobile_no": row[7],
                    "birth_date": row[8],
                    "total_worked_hours": row[9],
                    "starting_date": row[10].strftime('%Y-%m-%d') if row[10] else '',
                    "end_date": row[11].strftime('%Y-%m-%d') if row[11] else '',
                    "dtr_details": row[12],
                    "accomplishment_report": bool(row[13]),
                    "for_payroll": row[14],
                    "is_paid": row[15],
                    "ar_isgood": row[16],
                    "on_hold": row[17],
                    "requested_docs": bool(row[18]),
                    "requested_docs_isgood": row[19],
                    "comment_for_dtr": row[20],
                })
        return jsonify(data)
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@peso_bp.route('/toggle_payroll_paid_archive/<int:record_id>', methods=['POST'])
def toggle_payroll_paid_archive(record_id):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT is_paid FROM student_dtr_records_archive WHERE dtr_record_id = %s", (record_id,))
            is_paid = cur.fetchone()[0]
            new_status = not is_paid
            cur.execute("UPDATE student_dtr_records_archive SET is_paid = %s WHERE dtr_record_id = %s", (new_status, record_id))
            conn.commit()
        return jsonify({'success': True, 'is_paid': new_status})
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        conn.close()

@peso_bp.route('/get_accomplishment_report_archive/<int:student_id>')
def get_accomplishment_report_archive(student_id):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT accomplishment_report, ar_isgood FROM student_dtr_records_archive WHERE dtr_record_id = %s", (student_id,))
            row = cur.fetchone()
            if not row or not row[0]:
                return jsonify({'has_report': False})
            return jsonify({
                'has_report': True,
                'filetype': 'pdf',
                'ar_isgood': bool(row[1]) if row[1] is not None else False
            })
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@peso_bp.route('/download_accomplishment_report_archive/<int:student_id>')
def download_accomplishment_report_archive(student_id):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT accomplishment_report FROM student_dtr_records_archive WHERE dtr_record_id = %s", (student_id,))
            row = cur.fetchone()
            if not row or not row[0]:
                return
            file_bytes = bytes(row[0])
            return send_file(
                io.BytesIO(file_bytes),
                mimetype='application/pdf',
                as_attachment=False,
                download_name='accomplishment_report.pdf'
            )
    except Exception as e:
        conn.rollback()
        return str(e), 500
    finally:
        conn.close()

@peso_bp.route('/get_requested_docs_archive/<int:student_id>')
def get_requested_docs_archive(student_id):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT requested_docs, requested_docs_isgood, ar_isgood FROM student_dtr_records_archive WHERE dtr_record_id = %s", (student_id,))
            row = cur.fetchone()
            return jsonify({
                'has_requested_docs': bool(row and row[0]),
                'requested_docs_isgood': bool(row[1]) if row else False,
                'ar_isgood': bool(row[2]) if row else False
            })
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@peso_bp.route('/download_requested_docs_archive/<int:student_id>')
def download_requested_docs_archive(student_id):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT requested_docs FROM student_dtr_records_archive WHERE dtr_record_id = %s", (student_id,))
            row = cur.fetchone()
            if not row or not row[0]:
                return
            file_bytes = bytes(row[0])
            return send_file(
                io.BytesIO(file_bytes),
                mimetype='application/pdf',
                as_attachment=False,
                download_name='requested_docs.pdf'
            )
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()