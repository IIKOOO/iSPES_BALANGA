from flask import Blueprint, request, render_template, redirect, url_for, session, flash
from datetime import datetime
import psycopg2
from werkzeug.security import generate_password_hash
from flask import jsonify
import requests
import pytz
import os
from dotenv import load_dotenv

load_dotenv()
API_TOKEN = os.getenv('API_TOKEN')

register_bp = Blueprint('register', __name__)
def get_conn():
    url = os.getenv('DATABASE_URL')
    return psycopg2.connect(url)

def send_sms(phone_number, message):
    load_dotenv()
    url = "https://sms.iprogtech.com/api/v1/sms_messages"
    payload = {
        "api_token": API_TOKEN,
        "phone_number": phone_number,
        "message": message,
        "sms_provider": 2  # <-- Add this line
    }
    headers = {"Content-Type": "application/json"}
    response = requests.post(url, json=payload, headers=headers)
    return response.json()

@register_bp.route('/register', methods=['GET', 'POST'])
def register():
    conn = get_conn()
    try:
        if request.method == 'POST':
            try:
                # Personal Information
                student_category = request.form.get('student_category')
                iskolar_type = request.form.get('iskolar_type')
                status_of_student = request.form.get('status_of_student')
                last_name = request.form.get('last_name')
                first_name = request.form.get('first_name')
                middle_name = request.form.get('middle_name')
                suffix = request.form.get('suffix')
                birth_date = request.form.get('date_of_birth') or None  # Should be YYYY-MM-DD
                birth_place = request.form.get('place_of_birth')
                citizenship = request.form.get('citizenship')
                mobile_no = request.form.get('mobile_number')
                email = request.form.get('email_address')
                civil_status = request.form.get('civil_status_of_spes_applicant')
                sex = request.form.get('sex')
                disabilities = request.form.get('with_disabilities')
                socmed = request.form.get('social_media_account')
                participation_count = request.form.get('spes_avail')
                belongs_in_group = request.form.get('belongs_in_groups')
                barangay = request.form.get('barangay')
                street_add = request.form.get('street')
                name_of_beneficiary = request.form.get('name_of_beneficiary')
                relationship_to_beneficiary = request.form.get('relationship_to_beneficiary')
                parents_status = request.form.get('current_status_of_parents')

                # Educational Information
                school = request.form.get('school')
                educational_attainment = request.form.get('educational_attainment')
                senior_high_strand = request.form.get('strand')
                college_course = request.form.get('course')
                attendance_date = request.form.get('school_year')

                # Parents/Guardians Information
                living_with = request.form.get('living_with')
                guardian_full_name = request.form.get('guardian_full_name')
                guardian_contact_no = request.form.get('guardian_contact_number')
                guardian_birth_date = request.form.get('guardian_birthday') or None  # Should be YYYY-MM-DD
                guardian_occupation = request.form.get('guardian_occupation')
                relationship_with_guardian = request.form.get('relationship_to_guardian')
                guardian_tin_no = request.form.get('tin_no_of_guardian')
                father_full_name = request.form.get('father_full_name')
                father_contact_no = request.form.get('father_contact_number')
                father_birth_date = request.form.get('father_birthday') or None  # Should be YYYY-MM-DD
                father_occupation = request.form.get('father_occupation')
                father_tin_no = request.form.get('father_tin_no')
                mother_full_name = request.form.get('mother_full_name')
                mother_contact_no = request.form.get('mother_contact_number')
                mother_birth_date = request.form.get('mother_birthday') or None  # Should be YYYY-MM-DD
                mother_occupation = request.form.get('mother_occupation')
                mother_tin_no = request.form.get('mother_tin_no')
                
                username = request.form.get('username')
                password = request.form.get('password')
                hashed_password = generate_password_hash(password)


                with conn.cursor() as cur:
                    
                    # Check for duplicate username
                    # cur.execute("""
                    #     SELECT COUNT(*) FROM public.student_login WHERE username = %s
                    # """, (username,))
                    # username_exists = cur.fetchone()[0] > 0

                    # # Check for duplicate email
                    # cur.execute("""
                    #     SELECT COUNT(*) FROM public.student_application WHERE email = %s
                    # """, (email,))
                    # email_exists = cur.fetchone()[0] > 0

                    # Check for duplicate full name
                    cur.execute("""
                        SELECT COUNT(*) FROM public.student_application
                        WHERE first_name = %s AND last_name = %s AND middle_name = %s AND suffix = %s AND birth_date = %s
                    """, (first_name, last_name, middle_name, suffix, birth_date))
                    person_exists = cur.fetchone()[0] > 0
                    
                    # Check if registration is open for the selected category
                    cur.execute("SELECT senior_high_enabled, applying_iskolar_enabled, iskolar_enabled FROM registration_restrictions")
                    restriction = cur.fetchone()
                    category_map = {
                        "Senior High School": restriction[0],
                        "Applying for Iskolar ng Bataan": restriction[1],
                        "Iskolar ng Bataan": restriction[2]
                    }
                    
                    cur.execute("SELECT register_enabled FROM registration_restrictions")
                    row = cur.fetchone()

                    # if username_exists:
                    #     flash('Your username is already taken.', 'danger')
                    #     return redirect(url_for('index'))

                    # if email_exists:
                    #     flash('You already have an account. Please log in instead.', 'danger')
                    #     return redirect(url_for('index'))

                    if person_exists:
                        flash('You already have an account. Please log in instead.', 'danger')
                        return redirect(url_for('index'))
                    
                    if student_category in category_map and not category_map[student_category]:
                        flash("The student category you selected is currently close. Please! just wait for it to be open..", "danger")
                        return redirect(url_for('index'))
                    
                    if not row or not row[0]:
                        flash("Registration is closed.", "danger")
                        return redirect(url_for('index'))
                    
                    # Insert into student_application
                    manila_tz = pytz.timezone('Asia/Manila')
                    manila_now = datetime.now(manila_tz).replace(tzinfo=None)
                    cur.execute("""
                        INSERT INTO student_application (
                            student_category, iskolar_type, status_of_student, last_name, first_name, middle_name, suffix,
                            birth_date, birth_place, citizenship, mobile_no, email, civil_status, sex, disabilities, socmed,
                            participation_count, belongs_in_group, barangay, street_add, name_of_beneficiary,
                            relationship_to_beneficiary, parents_status, time_stamp, is_pending, is_approved
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s, %s,
                            %s, %s, %s, %s, %s, %s, %s, %s, %s,
                            %s, %s, %s, %s, %s,
                            %s, %s, %s, FALSE, FALSE
                        ) RETURNING student_id
                    """, (
                        student_category, iskolar_type, status_of_student, last_name, first_name, middle_name, suffix,
                        birth_date, birth_place, citizenship, mobile_no, email, civil_status, sex, disabilities, socmed,
                        int(participation_count) if participation_count else None, belongs_in_group, barangay, street_add,
                        name_of_beneficiary, relationship_to_beneficiary, parents_status, manila_now
                    ))
                    student_application_id = cur.fetchone()[0]

                    # Insert into student_application_parents_guardians
                    cur.execute("""
                        INSERT INTO student_application_parents_guardians ( 
                            living_with, guardian_full_name, guardian_contact_no, guardian_birth_date, guardian_occupation,
                            relationship_with_guardian, guardian_tin_no, father_full_name, father_contact_no, father_birth_date,
                            father_occupation, father_tin_no, mother_full_name, mother_contact_no, mother_birth_date,
                            mother_occupation, mother_tin_no, student_application_id
                        ) VALUES (
                            %s, %s, %s, %s, %s,
                            %s, %s, %s, %s, %s,
                            %s, %s, %s, %s, %s,
                            %s, %s, %s
                        )
                    """, (
                        living_with, guardian_full_name, guardian_contact_no, guardian_birth_date, guardian_occupation,
                        relationship_with_guardian, guardian_tin_no, father_full_name, father_contact_no, father_birth_date,
                        father_occupation, father_tin_no, mother_full_name, mother_contact_no, mother_birth_date,
                        mother_occupation, mother_tin_no, student_application_id
                    ))

                    # Insert into student_application_education
                    cur.execute("""
                        INSERT INTO public.student_application_education (
                            school_name, educational_attainment, senior_high_strand, college_course, attendance_date, student_application_id
                        ) VALUES (%s, %s, %s, %s, %s, %s)
                    """, (
                        school, educational_attainment, senior_high_strand, college_course, attendance_date, student_application_id
                    ))

                    cur.execute("""
                        INSERT INTO public.student_login (
                            student_id, username, password, email, last_name, first_name, birth_date, sex, student_category, mobile_no
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        student_application_id, username, hashed_password, email, last_name, first_name, birth_date, sex, student_category, mobile_no
                    ))

                    conn.commit()
                    sms_message = (
                        f"Good day, {first_name}! Your SPES Balanga registration is successful. Please log in and upload your documents. Wait for further updates. Thank you."
                    )
                    send_sms(mobile_no, sms_message)
                    flash('Registration successful!', 'success')
                    return redirect(url_for('index'))

            except Exception as e:
                conn.rollback()
                flash(f'Registration failed: {e}', 'danger')

        return render_template('index.html')
    finally:
        conn.close()

@register_bp.route('/check_username', methods=['POST'])
def check_username():
    conn = get_conn()
    try:
        username = request.json.get('username')
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM public.student_login WHERE username = %s", (username,))
            exists = cur.fetchone()[0] > 0
        return jsonify({'exists': exists})
    finally:
        conn.close()

@register_bp.route('/check_email', methods=['POST'])
def check_email():
    conn = get_conn()
    try:
        email = request.json.get('email')
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM public.student_application WHERE email = %s", (email,))
            exists = cur.fetchone()[0] > 0
        return jsonify({'exists': exists})
    finally:
        conn.close()
