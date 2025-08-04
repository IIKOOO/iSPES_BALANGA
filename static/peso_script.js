document.addEventListener('DOMContentLoaded', function() {
    var logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            var logoutModal = new bootstrap.Modal(document.getElementById('logoutModal'));
            logoutModal.show();
        });
    }
});

let updateFormData = null;

document.addEventListener('DOMContentLoaded', function() {
    const confirmBtn = document.getElementById('confirmProfilePasswordBtn');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', function() {
            const password = document.getElementById('profilePassword').value;
            fetch('/verify_peso_password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    document.getElementById('edit_last_name').value = data.peso.last_name;
                    document.getElementById('edit_first_name').value = data.peso.first_name;
                    document.getElementById('edit_birth_date').value = data.peso.birth_date;
                    document.getElementById('edit_sex').value = data.peso.sex;
                    document.getElementById('edit_role').value = data.peso.role;
                    document.getElementById('edit_username').value = data.peso.username;
                    document.getElementById('edit_email').value = data.peso.email;
                    document.getElementById('edit_mobile_no').value = data.peso.mobile_no || '';
                    document.getElementById('edit_password').value = '';
                    document.getElementById('edit_confirm_password').value = '';
                    bootstrap.Modal.getInstance(document.getElementById('confirmPasswordModal')).hide();
                    new bootstrap.Modal(document.getElementById('updateProfileModal')).show();
                } else {
                    document.getElementById('profilePasswordError').textContent = 'Incorrect password.';
                    document.getElementById('profilePasswordError').style.display = 'block';
                }
            });
        });
    }
    const updateForm = document.getElementById('updateProfileForm');
    if (updateForm) {
        updateForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const password = document.getElementById('edit_password').value;
            const confirmPassword = document.getElementById('edit_confirm_password').value;
            if (password && password !== confirmPassword) {
                showToast('Passwords do not match!', 'danger');
                return;
            }
            updateFormData = {
                last_name: document.getElementById('edit_last_name').value,
                first_name: document.getElementById('edit_first_name').value,
                birth_date: document.getElementById('edit_birth_date').value,
                sex: document.getElementById('edit_sex').value,
                role: document.getElementById('edit_role').value,
                email: document.getElementById('edit_email').value,
                mobile_no: document.getElementById('edit_mobile_no').value,
                password: password
            };
            new bootstrap.Modal(document.getElementById('confirmUpdateModal')).show();
        });
    }
    const confirmUpdateBtn = document.getElementById('confirmUpdateBtn');
    if (confirmUpdateBtn) {
        confirmUpdateBtn.addEventListener('click', function() {
            if (!updateFormData) return;
            fetch('/update_peso_profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateFormData)
            })
            .then(res => res.json())
            .then(resp => {
                if (resp.success) {
                    bootstrap.Modal.getInstance(document.getElementById('updateProfileModal')).hide();
                    bootstrap.Modal.getInstance(document.getElementById('confirmUpdateModal')).hide();
                    const logoutUrl = document.getElementById('logoutUrl').getAttribute('data-url');
                    window.location.href = logoutUrl;
                } else {
                    showToast('Failed to update profile: ' + (resp.error || 'Unknown error'), 'danger');
                }
            });
        });
    }
    setBirthdayConstraints();
});

document.getElementById('updateProfileModal')?.addEventListener('shown.bs.modal', setBirthdayConstraints);

function setBirthdayConstraints() {
    const today = new Date();
    const minAdultYear = today.getFullYear() - 100;
    const maxAdultYear = today.getFullYear() - 15;
    ['edit_birth_date'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.min = `${minAdultYear}-01-01`;
            input.max = `${maxAdultYear}-${String(today.getMonth()+1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        }
    });
}