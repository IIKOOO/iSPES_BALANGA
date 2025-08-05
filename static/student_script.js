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

document.addEventListener('DOMContentLoaded', function() {
    fetch('/check_in_dtr_records')
    .then(res => res.json())
    .then(data => {
        if (data.in_records) {
            // Now check on_hold status
            fetch('/get_student_dtr_record_status')
            .then(res => res.json())
            .then(status => {
                if (status.on_hold) {
                    document.getElementById('accomplishment-upload-section').style.display = 'block';
                    document.getElementById('requestedDocs-upload-section').style.display = 'block';
                    document.getElementById('resignBtn').style.display = 'none';
                } else {
                    document.getElementById('accomplishment-upload-section').style.display = 'block';
                    document.getElementById('requestedDocs-upload-section').style.display = 'none';
                    document.getElementById('resignBtn').style.display = 'none';
                }
            });
        } else {
            document.getElementById('accomplishment-upload-section').style.display = 'none';
            document.getElementById('requestedDocs-upload-section').style.display = 'none';
            document.getElementById('resignBtn').style.display = 'block';
        }
    });
});

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
    if (resignBtn) {
        resignBtn.addEventListener('click', function() {
            const modal = new bootstrap.Modal(document.getElementById('resignConfirmModal'));
            modal.show();
        });
    }
    const confirmResignBtn = document.getElementById('confirmResignBtn');
    if (confirmResignBtn) {
        confirmResignBtn.addEventListener('click', function() {
            fetch('/student_resign', { method: 'POST' })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    document.getElementById('resignBtnSection').style.display = 'none';
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