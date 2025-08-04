function LivingWithChanged(radio) {
    const guardianSection = document.getElementById('div_guardian');
    const parentSection = document.getElementById('div_parents');

    if (radio.value === "Parents") {
        guardianSection.classList.add('d-none');
        parentSection.classList.remove('d-none');
    } else if (radio.value === "Guardian") {
        guardianSection.classList.remove('d-none');
        parentSection.classList.remove('d-none');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const category = document.getElementById('student_category');
    const iskolarType = document.getElementById('div_iskolar_type');
    const divCategory = document.getElementById('div_category');
    const divStatusOfStudent = document.getElementById('div_status_of_student');

    category.addEventListener('change', () => {
        const selectedValue = category.value;   

        if (selectedValue === "Iskolar ng Bataan") {
            iskolarType.classList.remove('d-none');
            iskolarType.setAttribute('required', 'required');
            divCategory.classList.remove('col-md-6');
            divCategory.classList.add('col-md-4');
            divStatusOfStudent.classList.remove('col-md-6');
            divStatusOfStudent.classList.add('col-md-4');
        }else { 
            iskolarType.classList.add('d-none');
            divCategory.classList.add('col-md-6');
            divStatusOfStudent.classList.add('col-md-6');
        }
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const schoolSelect = document.getElementById('school');
    const otherSchoolInput = document.getElementById('other_schoolDiv');

    schoolSelect.addEventListener('change', () => {
        if (schoolSelect.value === "Others") {
            otherSchoolInput.classList.remove('d-none');
        } else {
            otherSchoolInput.classList.add('d-none');
        }
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const studentCategory = document.getElementById('student_category');
    const educationalAttainment = document.getElementById('educational_attainment');
    const seniorHighSection = document.querySelector('.div-senior-high');
    const collegeSection = document.querySelector('.div-college');

    studentCategory.addEventListener('change', () => {
        const selectedCategory = studentCategory.value;

        if (selectedCategory === 'Senior High School') {
            seniorHighSection.classList.remove('d-none');
            collegeSection.classList.add('d-none');
        } else {
            seniorHighSection.classList.add('d-none');
            collegeSection.classList.remove('d-none');
        }

        Array.from(educationalAttainment.options).forEach(option => {
            option.style.display = '';

            if (selectedCategory === 'Senior High School') {
                if (!['Grade 10(Incoming Grade 11)', 'Grade 11(Incoming Grade 12)', 'Grade 12(Incoming 1st Year)'].includes(option.value)) {
                    option.style.display = 'none';
                }
            } else if (selectedCategory === 'Applying for Iskolar ng Bataan' || selectedCategory === 'Iskolar ng Bataan') {
                if (['Grade 10(Incoming Grade 11)', 'Grade 11(Incoming Grade 12)', 'Grade 12(Incoming 1st Year)'].includes(option.value)) {
                    option.style.display = 'none';
                }
            }
        });

        if (educationalAttainment.value && educationalAttainment.options[educationalAttainment.selectedIndex].style.display === 'none') {
            educationalAttainment.value = '';
        }
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const numberFields = [
        document.getElementById('mobile_number'),
        document.getElementById('guardian_contact_number'),
        document.getElementById('father_contact_number'),
        document.getElementById('mother_contact_number')
    ];

    numberFields.forEach(field => {
        field.addEventListener('input', () => {
            field.value = field.value.replace(/\D/g, '');

            if (field.value.length > 11) {
                field.value = field.value.slice(0, 11);
            }
        });
    });
});

document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.alert-danger')) {
        const modalId = document.querySelector('.alert-danger').closest('.modal').id;
        const modal = new bootstrap.Modal(document.getElementById(modalId));
        modal.show();
    }
});

function applyCategoryRestrictions() {
    fetch('/get_registration_restrictions')
        .then(res => res.json())
        .then(data => {
            const select = document.getElementById('student_category');
            if (!select) return;
            Array.from(select.options).forEach(option => option.style.display = '');

            if (!data.senior_high_enabled) {
                Array.from(select.options).forEach(option => {
                    if (option.value === 'Senior High School') option.style.display = 'none';
                });
            }
            if (!data.applying_iskolar_enabled) {
                Array.from(select.options).forEach(option => {
                    if (option.value === 'Applying for Iskolar ng Bataan') option.style.display = 'none';
                });
            }
            if (!data.iskolar_enabled) {
                Array.from(select.options).forEach(option => {
                    if (option.value === 'Iskolar ng Bataan') option.style.display = 'none';
                });
            }
        });
}

document.addEventListener('DOMContentLoaded', () => {
    applyCategoryRestrictions();

    const regModal = document.getElementById('staticBackdrop');
    if (regModal) {
        regModal.addEventListener('show.bs.modal', applyCategoryRestrictions);
    }
});

function applyRegisterButtonStatus() {
    fetch('/get_registration_status')
        .then(res => res.json())
        .then(data => {
            const regBtn = document.getElementById('registerNow');
            if (regBtn) {
                regBtn.disabled = !data.register_enabled;
                regBtn.classList.toggle('btn-secondary', !data.register_enabled);
                regBtn.classList.toggle('btn-outline-primary', data.register_enabled);
                regBtn.title = data.register_enabled ? '' : 'Registration is currently closed';
            }
        });
}

document.addEventListener('DOMContentLoaded', applyRegisterButtonStatus);

function setBirthdayConstraints() {
    const today = new Date();
    const minAdultYear = today.getFullYear() - 100;
    const maxAdultYear = today.getFullYear() - 18;
    ['guardian_birthday', 'father_birthday', 'mother_birthday'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.min = `${minAdultYear}-01-01`;
            input.max = `${maxAdultYear}-${String(today.getMonth()+1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        }
    });
}

function LivingWithChanged(radio) {
    const guardianSection = document.getElementById('div_guardian');
    const parentSection = document.getElementById('div_parents');

    if (radio.value === "Parents") {
        guardianSection.classList.add('d-none');
        parentSection.classList.remove('d-none');
    } else if (radio.value === "Guardian") {
        guardianSection.classList.remove('d-none');
        parentSection.classList.remove('d-none');
    }
    setBirthdayConstraints(); // <-- Call this every time section is shown
}

document.addEventListener('DOMContentLoaded', function() {
    // For applicant: 15-30 years old
    const dobInput = document.getElementById('date_of_birth');
    if (dobInput) {
        const today = new Date();
        const minYear = today.getFullYear() - 30;
        const maxYear = today.getFullYear() - 15;
        dobInput.min = `${minYear}-01-01`;
        dobInput.max = `${maxYear}-${String(today.getMonth()+1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    }
    setBirthdayConstraints(); // <-- Also call on page load
});

document.addEventListener('DOMContentLoaded', function() {
    // Password show/hide
    document.querySelectorAll('.toggle-password-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const targetId = btn.getAttribute('data-target');
            const input = document.getElementById(targetId);
            if (input) {
                input.type = input.type === 'password' ? 'text' : 'password';
                btn.innerHTML = input.type === 'password'
                    ? '<i class="bi bi-eye"></i>'
                    : '<i class="bi bi-eye-slash"></i>';
            }
        });
    });

    // Registration validation (async, blocks submission)
    const regForm = document.getElementById('registration_form');
    if (regForm) {
        regForm.addEventListener('submit', function(e) {
            e.preventDefault(); // Always block submission first!
    
            (async function() {
                let valid = true;
    
                // Username length
                const username = document.getElementById('registration_username'); // <-- updated id
                const usernameError = document.getElementById('usernameError');
                const usernameValue = username.value.trim(); // Always trim!
    
                if (usernameValue.length < 4) {
                    usernameError.textContent = 'Username must be at least 4 characters long.';
                    valid = false;
                } else {
                    usernameError.textContent = '';
                }
    
                // Password length
                const password = document.getElementById('registration_password');
                const passwordError = document.getElementById('passwordError');
                if (password.value.length < 5) {
                    passwordError.textContent = 'Password must be at least 5 characters long.';
                    valid = false;
                } else {
                    passwordError.textContent = '';
                }
    
                // Confirm password match
                const confirmPassword = document.getElementById('confirm_password');
                const confirmPasswordError = document.getElementById('confirmPasswordError');
                if (password.value !== confirmPassword.value) {
                    confirmPasswordError.textContent = 'Password and Confirm Password do not match.';
                    valid = false;
                } else {
                    confirmPasswordError.textContent = '';
                }
    
                // Username existence (AJAX)
                if (usernameValue.length >= 4) {
                    try {
                        const res = await fetch('/check_username', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ username: usernameValue }) // Use trimmed value!
                        });
                        const data = await res.json();
                        if (data.exists) {
                            usernameError.textContent = 'Your username is already taken.';
                            valid = false;
                        }
                    } catch (err) {}
                }
    
                // Email existence (AJAX)
                const email = document.getElementById('email_address');
                const emailError = document.getElementById('emailError');
                if (email.value) {
                    try {
                        const res = await fetch('/check_email', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: email.value })
                        });
                        const data = await res.json();
                        if (data.exists) {
                            emailError.textContent = 'You already have an account. Please log in instead.';
                            valid = false;
                        }
                    } catch (err) {}
                }
    
                if (valid) {
                    regForm.querySelectorAll('input[type="text"], input[type="email"], textarea').forEach(function(input) {
                        const excludeIds = [
                            'email_address',
                            'registration_username', // <-- updated id
                            'registration_password',
                            'confirm_password',
                            'social_media_account'
                        ];
                        if (!excludeIds.includes(input.id)) {
                            input.value = input.value.toUpperCase();
                        }
                    });
                    regForm.submit(); // Only submit if all checks pass
                }
            })();
        });
    
        // Clear errors on input
        ['registration_username', 'email_address', 'registration_password', 'confirm_password'].forEach(function(id) { // <-- updated id
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', function() {
                    const errorElem = document.getElementById(id + 'Error');
                    if (errorElem) errorElem.textContent = '';
                });
            }
        });
    }
});