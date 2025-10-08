document.addEventListener('DOMContentLoaded', function() {
    var logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            var logoutModal = new bootstrap.Modal(document.getElementById('logoutModal'));
            logoutModal.show();
        });
    }
});

document.addEventListener('DOMContentLoaded', function() {
    fetch('/get_dtr')
    .then(res => res.json())
    .then(data => {
        const tbody = document.querySelector('table tbody');
        tbody.innerHTML = '';
        let totalWorkedHours = 0;
        data.forEach(row => {
            let hours = parseFloat(row.daily_total) || 0;
            totalWorkedHours += hours;
            tbody.innerHTML += `
            <tr>
                <td style="white-space:normal;word-break:break-word;max-width:350px;font-size:.8em;background:#f8f9fa;">
                    ${row.scanner_location || '-'}
                </td>
                <td>${new Date(row.date).toLocaleDateString('en-US', {weekday:'short'})}</td>
                <td>${row.date}</td>
                <td>${row.time_in_am || '-'}</td>
                <td>${row.time_out_am || '-'}</td>
                <td>${row.time_in_pm || '-'}</td>
                <td>${row.time_out_pm || '-'}</td>
                <td>${row.evaluation_am || '-'}</td>
                <td>${row.evaluation_pm || '-'}</td>
                <td>${row.daily_total ? row.daily_total + ' hours' : '-'}</td>
            </tr>`;
        });
    });
});

// ...existing code...
document.addEventListener('DOMContentLoaded', function() {
    fetch('/check_in_dtr_records')
    .then(res => res.json())
    .then(data => {
        if (data.in_records) {
            // Hide resign button if student exists in DTR records
            const resignBtnSection = document.getElementById('resignBtnSection');
            if (resignBtnSection) {
                resignBtnSection.style.display = 'none';
            }
            // ...existing code...
            fetch('/get_student_dtr_record_status')
            .then(res => res.json())
            .then(status => {
                if (status.on_hold) {
                    document.getElementById('accomplishment-upload-section').style.display = 'block';
                    document.getElementById('requestedDocs-upload-section').style.display = 'block';
                } else {
                    document.getElementById('accomplishment-upload-section').style.display = 'block';
                    document.getElementById('requestedDocs-upload-section').style.display = 'none';
                }
            });
        } else {
            document.getElementById('accomplishment-upload-section').style.display = 'none';
            document.getElementById('requestedDocs-upload-section').style.display = 'none';
        }
    });
});
// ...existing code...

document.addEventListener('DOMContentLoaded', function() {
    const progressBar = document.getElementById('dtrProgressBar');
    const progressText = document.getElementById('dtrProgressText');
    if (progressBar && progressText) {
        fetch('/get_dtr')
        .then(res => res.json())
        .then(data => {
            let totalWorkedHours = 0;
            data.forEach(row => {
                let hours = parseFloat(row.daily_total) || 0;
                totalWorkedHours += hours;
            });
            const maxHours = 160;
            const percent = Math.min((totalWorkedHours / maxHours) * 100, 100);
            progressBar.style.width = percent + '%';
            progressBar.setAttribute('aria-valuenow', totalWorkedHours);
            progressBar.textContent = `${Math.round(percent)}% Complete`;
            progressText.textContent = `${totalWorkedHours} hours completed, ${Math.max(0, maxHours - totalWorkedHours)} hours remaining`;
        });
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const resignBtn = document.getElementById('resignBtn');
    const confirmResignBtn = document.getElementById('confirmResignBtn');
    const resignPassword = document.getElementById('resignPassword');
    const resignPasswordError = document.getElementById('resignPasswordError');

    if (resignBtn) {
        resignBtn.addEventListener('click', function() {
            // Reset modal state
            confirmResignBtn.disabled = true;
            resignPassword.value = '';
            resignPasswordError.style.display = 'none';
            const modal = new bootstrap.Modal(document.getElementById('resignConfirmModal'));
            modal.show();
        });
    }

    if (resignPassword) {
        resignPassword.addEventListener('input', function() {
            const password = resignPassword.value;
            if (password.length < 6) {
                confirmResignBtn.disabled = true;
                resignPasswordError.style.display = 'none';
                return;
            }
            fetch('/student_auth_password', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({current_password: password})
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    confirmResignBtn.disabled = false;
                    resignPasswordError.style.display = 'none';
                } else {
                    confirmResignBtn.disabled = true;
                    resignPasswordError.innerText = data.error || 'Incorrect password.';
                    resignPasswordError.style.display = 'block';
                }
            });
        });
    }

    if (confirmResignBtn) {
        confirmResignBtn.addEventListener('click', function() {
            fetch('/student_resign', { method: 'POST' })
            .then(res => res.json())
            .then(data => {
                bootstrap.Modal.getInstance(document.getElementById('resignConfirmModal')).hide();
                if (data.success) {
                    document.getElementById('accomplishment-upload-section').style.display = 'block';
                    location.reload();
                } else {
                    alert(data.error || 'Resignation failed.');
                }
            });
            bootstrap.Modal.getInstance(document.getElementById('resignConfirmModal')).hide();
        });
    }
});

document.addEventListener('DOMContentLoaded', function() {
    fetch('/get_requirements_status')
    .then(res => res.json())
    .then(status => {
        // Track if all required docs are good
        let allRequiredGood = true;

        if (status.passport_pic) {
            const input = document.getElementById('passportPhoto');
            input.required = false;
            input.disabled = true;
            input.parentElement.insertAdjacentHTML('beforeend', '<span class="text-success ms-2">✔ Already Approved</span>');
        } else {
            allRequiredGood = false;
        }
        if (status.birth_certificate) {
            const input = document.getElementById('birthCertificate');
            input.required = false;
            input.disabled = true;
            input.parentElement.insertAdjacentHTML('beforeend', '<span class="text-success ms-2">✔ Already Approved</span>');
        } else {
            allRequiredGood = false;
        }
        if (status.parents_valid_id) {
            const input = document.getElementById('parentsID');
            input.required = false;
            input.disabled = true;
            input.parentElement.insertAdjacentHTML('beforeend', '<span class="text-success ms-2">✔ Already Approved</span>');
        } else {
            allRequiredGood = false;
        }
        if (status.ctc_rog) {
            const input = document.getElementById('reportCard');
            input.required = false;
            input.disabled = true;
            input.parentElement.insertAdjacentHTML('beforeend', '<span class="text-success ms-2">✔ Already Approved</span>');
        } else {
            allRequiredGood = false;
        }
        if (status.parents_itr) {
            const input = document.getElementById('itr');
            input.required = false;
            input.disabled = true;
            input.parentElement.insertAdjacentHTML('beforeend', '<span class="text-success ms-2">✔ Already Approved</span>');
        } else {
            allRequiredGood = false;
        }

        // Hide submit button if all required docs are good
        if (allRequiredGood) {
            const btn = document.querySelector('#requiredDocsForm button[type="submit"]');
            if (btn) btn.style.display = 'none';
        }

        // Additional files
        if (status.additional_files) {
            const input = document.getElementById('additionalFiles');
            input.required = false;
            input.disabled = true;
            input.parentElement.insertAdjacentHTML('beforeend', '<span class="text-success ms-2">✔ Already Approved</span>');
            // Hide submit button for additional files
            const btn = document.querySelector('#additionalDocsForm button[type="submit"]');
            if (btn) btn.style.display = 'none';
        }
    });
});

document.addEventListener('DOMContentLoaded', function() {
    fetch('/get_dtr_upload_status')
    .then(res => res.json())
    .then(status => {
        // Accomplishment Report
        if (status.ar_isgood) {
            const input = document.getElementById('accomplishment_report');
            const btn = document.querySelector('#accomplishmentForm button[type="submit"]');
            if (input) {
                input.required = false;
                input.disabled = true;
                input.parentElement.insertAdjacentHTML('beforeend', '<span class="text-success ms-2">✔ Already Approved</span>');
            }
            if (btn) btn.style.display = 'none'; // Hide instead of disable
        }
        // Requested Docs
        if (status.requested_docs_isgood) {
            const input = document.getElementById('requested_docs');
            const btn = document.querySelector('#requestedDocsForm button[type="submit"]');
            if (input) {
                input.required = false;
                input.disabled = true;
                input.parentElement.insertAdjacentHTML('beforeend', '<span class="text-success ms-2">✔ Already Approved</span>');
            }
            if (btn) btn.style.display = 'none'; // Hide instead of disable
        }
    });
});

document.addEventListener('DOMContentLoaded', function() {
    const updatePasswordBtn = document.getElementById('updatePasswordBtn');
    const authPasswordModal = new bootstrap.Modal(document.getElementById('authPasswordModal'));
    const updatePasswordModal = new bootstrap.Modal(document.getElementById('updatePasswordModal'));
    const authPasswordForm = document.getElementById('authPasswordForm');
    const updatePasswordForm = document.getElementById('updatePasswordForm');
    const authPasswordError = document.getElementById('authPasswordError');
    const updatePasswordError = document.getElementById('updatePasswordError');

    if (updatePasswordBtn) {
        updatePasswordBtn.addEventListener('click', function() {
            authPasswordError.style.display = 'none';
            document.getElementById('currentPassword').value = '';
            authPasswordModal.show();
        });
    }

    if (authPasswordForm) {
        authPasswordForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const currentPassword = document.getElementById('currentPassword').value;
            fetch('/student_auth_password', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({current_password: currentPassword})
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    authPasswordModal.hide();
                    updatePasswordError.style.display = 'none';
                    document.getElementById('newPassword').value = '';
                    document.getElementById('confirmNewPassword').value = '';
                    updatePasswordModal.show();
                } else {
                    authPasswordError.innerText = data.error || 'Authentication failed.';
                    authPasswordError.style.display = 'block';
                }
            });
        });
    }

    if (updatePasswordForm) {
        updatePasswordForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const newPassword = document.getElementById('newPassword').value;
            const confirmNewPassword = document.getElementById('confirmNewPassword').value;
            if (newPassword !== confirmNewPassword) {
                updatePasswordError.innerText = "Passwords do not match.";
                updatePasswordError.style.display = 'block';
                return;
            }
            fetch('/student_update_password', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({new_password: newPassword})
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    updatePasswordModal.hide();
                    showActionToast('Password updated successfully!', true);
                } else {
                    updatePasswordError.innerText = data.error || 'Update failed.';
                    updatePasswordError.style.display = 'block';
                }
            });
        });
    }
});

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


function showActionToast(message, isSuccess) {
    const toastEl = document.getElementById('actionToast');
    const toastBody = document.getElementById('actionToastBody');
    toastBody.textContent = message;
    toastEl.classList.remove('text-bg-success', 'text-bg-danger');
    toastEl.classList.add(isSuccess ? 'text-bg-success' : 'text-bg-danger');
    new bootstrap.Toast(toastEl).show();
}