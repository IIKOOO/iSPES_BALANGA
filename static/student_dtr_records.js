function fetchAndDisplayDtrRecords() {
    const selectedCategory = document.getElementById('category_filter').value;
    const searchQuery = document.getElementById('search_input').value;
    const sortOption = document.getElementById('sort_option').value;
    let onHoldFilter = null;
    if (sortOption === 'active') onHoldFilter = false;
    if (sortOption === 'on_hold') onHoldFilter = true;

    
    fetch('/get_student_dtr_records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            status: "dtr",
            student_category: selectedCategory,
            search_query: searchQuery,
            sort_option: sortOption,
            on_hold: onHoldFilter
        })
    })
    .then(res => res.json())
    .then(data => {
        const tbody = document.getElementById('dtr-records-table');
        tbody.innerHTML = '';
        data.forEach(row => {
            const warningClass = row.has_accomplishment_report ? '' : 'table-warning';
                tbody.innerHTML += `
                <tr class="${warningClass}">
                    <td>${row.dtr_record_id}</td>
                    <td>${row.last_name}, ${row.first_name} ${row.middle_name || ''} ${row.suffix || ''}</td>
                    <td>${row.email}</td>
                    <td>${row.student_category}</td>
                    <td>${row.mobile_no}</td>
                    <td>${row.birth_date}</td>
                    <td>${row.total_worked_hours}</td>
                    <td>${row.starting_date}</td>
                    <td>${row.end_date}</td>
                    <td>
                        <button class="btn btn-primary btn-sm view-dtr-btn"
                            data-id="${row.dtr_record_id}"
                            data-name="${row.last_name}, ${row.first_name}"
                            data-total-hours="${row.total_worked_hours}"
                            data-bs-toggle="modal"
                            data-bs-target="#viewDtrModal">View DTR
                        </button>
                        <button class="btn ${row.on_hold ? 'btn-danger' : 'btn-primary '} btn-sm toggle-onhold-btn" data-id="${row.dtr_record_id}">
                            ${row.on_hold ? 'On Hold' : 'Active'}
                        </button>
                    </td>
                </tr>
            `;
        });
        document.querySelectorAll('.view-dtr-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const studentId = this.getAttribute('data-id');
                const studentName = this.getAttribute('data-name');
                document.getElementById('moveToPayrollBtn').setAttribute('data-student-id', studentId);

                // Fetch all needed data in parallel
                Promise.all([
                    fetch(`/get_student_dtr/${studentId}`).then(res => res.json()),
                    fetch(`/get_accomplishment_report/${studentId}`).then(res => res.json()),
                    fetch(`/get_requested_docs/${studentId}`).then(res => res.json()),
                    fetch(`/get_student_dtr_records`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: "dtr" })
                    }).then(res => res.json())
                ]).then(([dtrData, accompData, reqData, allRecords]) => {
                    // 1. Progress bar and DTR table
                    let dtrTableHtml = `
                        <div class="card mb-4 shadow border">
                            <div class="card-header bg-info text-dark">
                                <h5 class="mb-0 fw-bold">${studentName} DTR (ID: ${studentId})</h5>
                            </div>
                            <div class="card-body bg-light">
                                <!-- Progress Bar goes here -->
                                <div class="container mb-3">
                                    <h6 class="text-center">Progress Tracker</h6>
                                    <div class="progress">
                                        <div id="modalDtrProgressBar" class="progress-bar bg-success" role="progressbar" style="width: 0%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="160">0% Complete</div>
                                    </div>
                                    <div class="text-center mt-2">
                                        <span id="modalDtrProgressText">0 hours completed, 160 hours remaining</span>
                                    </div>
                                </div>
                                <!-- DTR Table -->
                                <div class="table-responsive">
                                    <table class="table table-bordered text-center bg-light">
                                        <thead class="table-dark">
                                            <tr>
                                                <th>Location</th>
                                                <th>Day</th>
                                                <th>Date</th>
                                                <th class="text-bg-warning">Morning-In</th>
                                                <th class="text-bg-warning">Morning-Out</th>
                                                <th class="text-bg-success">Afternoon-In</th>
                                                <th class="text-bg-success">Afternoon-Out</th>
                                                <th class="text-bg-danger">Evaluation-Morning</th>
                                                <th class="text-bg-danger">Evaluation-Afternoon</th>
                                                <th class="text-bg-primary">View Image</th>
                                                <th class="text-bg-primary">Daily total</th>
                                                <th class="text-bg-primary">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                    `;
                    dtrData.forEach(row => {
                        const day = new Date(row.date).toLocaleDateString('en-US', {weekday:'short'});
                        dtrTableHtml += `
                            <tr>
                                <td style="white-space:normal;word-break:break-word;max-width:350px;font-size:.9em;background:#f8f9fa;">
                                    ${row.scanner_location || '-'}
                                </td>
                                <td>${day}</td>
                                <td>${row.date}</td>
                                <td>${formatTime(row.time_in_am)}</td>
                                <td>${formatTime(row.time_out_am)}</td>
                                <td>${formatTime(row.time_in_pm)}</td>
                                <td>${formatTime(row.time_out_pm)}</td>
                                <td>${row.evaluation_am || '-'}</td>
                                <td>${row.evaluation_pm || '-'}</td>
                                <td>
                                    <button class="btn btn-sm btn-info view-image-btn" data-dtr-id="${row.dtr_id}">View Image</button>
                                </td>
                                <td>${row.daily_total + ' hours' || '-'}</td>
                                <td>
                                    <button class="btn btn-warning btn-sm edit-dtr-btn"
                                        data-dtr-id="${row.dtr_id}"
                                        data-dtr='${JSON.stringify(row)}'>Edit DTR
                                    </button>
                                </td>
                            </tr>
                        `;
                    });
                    dtrTableHtml += `
                                        </tbody>
                                    </table>
                                </div>
                                <div class="text-center">
                                    <button class="btn btn-success" onclick="window.print()">Print DTR</button>
                                </div>
                            </div>
                        </div>
                    `;

                    // 2. Accomplishment Report Card
                    let reportHtml = '';
                    if (accompData.has_report) {
                        let fileUrl = `/download_accomplishment_report/${studentId}`;
                        reportHtml = `
                            <div class="card mt-4 accomplishment-report-card">
                                <div class="card-header bg-info text-dark d-flex justify-content-between align-items-center">
                                    <h5 class="mb-0 fw-bold">Accomplishment Report</h5>
                                    <div class="form-check form-switch ms-auto">
                                        <input class="form-check-input ar-isgood-radio" type="checkbox"
                                            id="isgood_ar" data-id="${studentId}" ${accompData.ar_isgood ? 'checked' : ''}>
                                        <label class="form-check-label" for="isgood_ar">${accompData.ar_isgood ? 'Good' : 'Needs Reupload'}</label>
                                    </div>
                                </div>
                                <div class="card-body text-center" style="background-color:beige;">
                                    <iframe src="${fileUrl}" width="70%" height="800px" class="rounded border"></iframe>
                                </div>
                            </div>
                        `;
                    }

                    // 3. Requested Docs Card
                    let requestedDocsHtml = '';
                    if (reqData.has_requested_docs) {
                        let reqFileUrl = `/download_requested_docs/${studentId}`;
                        requestedDocsHtml = `
                            <div class="card mt-4 requested-docs-card">
                                <div class="card-header bg-info text-dark d-flex justify-content-between align-items-center">
                                    <h5 class="mb-0 fw-bold">Requested Document</h5>
                                    <div class="form-check form-switch ms-auto">
                                        <input class="form-check-input requested-docs-isgood-radio" type="checkbox"
                                            id="isgood_requested_docs" data-id="${studentId}" ${reqData.requested_docs_isgood ? 'checked' : ''}>
                                        <label class="form-check-label" for="isgood_requested_docs">${reqData.requested_docs_isgood ? 'Good' : 'Needs Reupload'}</label>
                                    </div>
                                </div>
                                <div class="card-body text-center" style="background-color:beige;">
                                    <iframe src="${reqFileUrl}" width="70%" height="800px" class="rounded border"></iframe>
                                </div>
                            </div>
                        `;
                    }

                    // 4. Comment Card
                    const student = allRecords.find(r => r.dtr_record_id == studentId);
                    let comment = student && student.comment_for_dtr ? student.comment_for_dtr : '';
                    let commentCard = `
                        <div class="card mt-4">
                            <div class="card-header bg-info text-dark">
                                <h5 class="mb-0 fw-bold">PESO Comment to DTR</h5>
                            </div>
                            <div class="card-body" style="background-color:beige;">
                                <textarea class="form-control mb-2" id="dtrPesoComment" rows="3" placeholder="Enter comment...">${comment || ''}</textarea>
                                <button id="saveDtrPesoCommentBtn" type="button" class="btn btn-success">Save Comment</button>
                            </div>
                        </div>
                    `;

                    // Set all content in fixed order
                    document.getElementById('dtr-details-content').innerHTML =
                        dtrTableHtml + reportHtml + requestedDocsHtml + commentCard;

                    // Progress bar update
                    let totalWorkedHours = 0;
                    dtrData.forEach(row => {
                        let hours = parseFloat(row.daily_total) || 0;
                        totalWorkedHours += hours;
                    });
                    const maxHours = 160;
                    const percent = Math.min((totalWorkedHours / maxHours) * 100, 100);

                    setTimeout(() => {
                        const progressBar = document.getElementById('modalDtrProgressBar');
                        const progressText = document.getElementById('modalDtrProgressText');
                        if (progressBar && progressText) {
                            progressBar.style.width = percent + '%';
                            progressBar.setAttribute('aria-valuenow', totalWorkedHours);
                            progressBar.textContent = `${Math.round(percent)}% Complete`;
                            progressText.textContent = `${totalWorkedHours} hours completed, ${Math.max(0, maxHours - totalWorkedHours)} hours remaining`;
                        }
                    }, 100);
                });
            });
        });
    });
}
document.addEventListener('DOMContentLoaded', fetchAndDisplayDtrRecords);
document.getElementById('category_filter').addEventListener('change', fetchAndDisplayDtrRecords);
document.getElementById('sort_option').addEventListener('change', fetchAndDisplayDtrRecords);
document.getElementById('search_input').addEventListener('input', fetchAndDisplayDtrRecords);

// Toast function for payroll actions
function showDtrActionToast(message, isSuccess) {
    const toastEl = document.getElementById('dtrActionToast');
    const toastBody = document.getElementById('dtrActionToastBody');
    toastBody.textContent = message;
    toastEl.classList.remove('text-bg-success', 'text-bg-danger');
    toastEl.classList.add(isSuccess ? 'text-bg-success' : 'text-bg-danger');
    const toast = bootstrap.Toast.getOrCreateInstance(toastEl);
    toast.show();
}

let payrollStudentId = null;
document.getElementById('moveToPayrollBtn').addEventListener('click', function() {
    payrollStudentId = this.getAttribute('data-student-id');
    if (!payrollStudentId) return;
    new bootstrap.Modal(document.getElementById('payrollConfirmModal')).show();
});

document.getElementById('confirmPayrollBtn').addEventListener('click', function() {
    if (!payrollStudentId) return;
    fetch(`/move_to_payroll/${payrollStudentId}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'}
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert('Student successfully moved to Payroll!');
            setTimeout(() => location.reload(), 1200);
        } else {
            showDtrActionToast('Failed to move to Payroll: ' + (data.error || 'Unknown error'), false);
        }
        bootstrap.Modal.getInstance(document.getElementById('payrollConfirmModal')).hide();
    })
    .catch(err => {
        showDtrActionToast('Error: ' + err, false);
        bootstrap.Modal.getInstance(document.getElementById('payrollConfirmModal')).hide();
    });
});

function fetchDtrSummary() {
    fetch('/dtr_summary')
        .then(res => res.json())
        .then(data => {
            document.getElementById('dtrTotal').textContent = data.total;
            document.getElementById('dtrAbove160').textContent = data.above_160;
            document.getElementById('dtrBelow160').textContent = data.below_160;
            // Add these lines:
            document.getElementById('dtrOnHold').textContent = data.on_hold;
            document.getElementById('dtrActive').textContent = data.active;
        });
}

function fetchActionLogs() {
    fetch('/peso_action_logs_summary')
        .then(res => res.json())
        .then(data => {
            const logsList = document.getElementById('actionLogsList');
            logsList.innerHTML = '';
            if (data.logs && data.logs.length > 0) {
                data.logs.forEach(log => {
                    const li = document.createElement('li');
                    li.className = 'list-group-item px-2 py-2';
                    li.innerHTML = `
                        <div class="d-flex flex-column">
                            <div>
                                <span class="badge bg-secondary ">#${log.student_id}</span>
                                <span class="fw-bold text-primary">-- ${log.username}</span>
                                <span class="text-dark">performed</span>
                                <span class="fw-semibold text-danger">${log.action}</span>
                            </div>
                            <div class="text-muted small ms-1">
                                <i class="bi bi-clock"></i> ${log.performed_at}
                            </div>
                        </div>
                    `;
                    logsList.appendChild(li);
                });
            } else {
                logsList.innerHTML = '<li class="list-group-item">No recent actions.</li>';
            }
        });
}

document.getElementById('downloadFinishDtrCsvBtn').addEventListener('click', function() {
    window.location.href = '/download_student_dtr_records_csv';
});

document.addEventListener('DOMContentLoaded', fetchDtrSummary,fetchActionLogs());

document.addEventListener('click', function(e) {
    if (e.target.classList.contains('view-image-btn')) {
        const dtrId = e.target.getAttribute('data-dtr-id');
        fetch(`/get_dtr_images/${dtrId}`)
            .then(res => res.json())
            .then(images => {
                let html = '';
                if (images.length === 0) {
                    html = '<p>No image captured for this DTR entry.</p>';
                } else {
                    images.forEach(img => {
                        html += `<img src="data:image/png;base64,${img.image_data}" class="img-fluid mb-2" style="max-width:100%;max-height:400px;" alt="DTR Image"><br>`;
                        html += `<small class="text-muted">Captured at: ${img.captured_at}</small><hr>`;
                    });
                }
                document.getElementById('dtr-image-modal-body').innerHTML = html;
                new bootstrap.Modal(document.getElementById('dtrImageModal')).show();
            });
    }
});


function refreshDtrModalTable(studentId) {
    fetch(`/get_student_dtr/${studentId}`)
        .then(res => res.json())
        .then(dtrData => {
            // Calculate total worked hours and percent
            let totalWorkedHours = 0;
            dtrData.forEach(row => {
                let hours = parseFloat(row.daily_total) || 0;
                totalWorkedHours += hours;
            });
            const maxHours = 160;
            const percent = Math.min((totalWorkedHours / maxHours) * 100, 100);

            // Build the DTR card with progress bar inside
            let dtrHtml = `
                <div class="card mb-4 shadow border">
                    <div class="card-header bg-info text-dark">
                        <h5 class="mb-0 fw-bold">DTR Records</h5>
                    </div>
                    <div class="card-body bg-light">
                        <!-- Progress Bar -->
                        <div class="container mb-3">
                            <h6 class="text-center">Progress Tracker</h6>
                            <div class="progress">
                                <div id="modalDtrProgressBar" class="progress-bar bg-success" role="progressbar" style="width: ${percent}%;" aria-valuenow="${totalWorkedHours}" aria-valuemin="0" aria-valuemax="160">${Math.round(percent)}% Complete</div>
                            </div>
                            <div class="text-center mt-2">
                                <span id="modalDtrProgressText">${totalWorkedHours} hours completed, ${Math.max(0, maxHours - totalWorkedHours)} hours remaining</span>
                            </div>
                        </div>
                        <!-- DTR Table -->
                        <div class="table-responsive">
                            <table class="table table-bordered text-center bg-light">
                                <thead class="table-dark">
                                    <tr>
                                        <th>Location</th>
                                        <th>Day</th>
                                        <th>Date</th>
                                        <th class="text-bg-warning">Morning-In</th>
                                        <th class="text-bg-warning">Morning-Out</th>
                                        <th class="text-bg-success">Afternoon-In</th>
                                        <th class="text-bg-success">Afternoon-Out</th>
                                        <th class="text-bg-danger">Evaluation-Morning</th>
                                        <th class="text-bg-danger">Evaluation-Afternoon</th>
                                        <th class="text-bg-primary">View Image</th>
                                        <th class="text-bg-primary">Daily total</th>
                                        <th class="text-bg-primary">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
            `;
            dtrData.forEach(row => {
                const day = new Date(row.date).toLocaleDateString('en-US', {weekday:'short'});
                dtrHtml += `
                    <tr>
                        <td style="white-space:normal;word-break:break-word;max-width:350px;font-size:.9em;background:#f8f9fa;">
                            ${row.scanner_location || '-'}
                        </td>
                        <td>${day}</td>
                        <td>${row.date}</td>
                        <td>${formatTime(row.time_in_am)}</td>
                        <td>${formatTime(row.time_out_am)}</td>
                        <td>${formatTime(row.time_in_pm)}</td>
                        <td>${formatTime(row.time_out_pm)}</td>
                        <td>${row.evaluation_am || '-'}</td>
                        <td>${row.evaluation_pm || '-'}</td>
                        <td>
                            <button class="btn btn-sm btn-info view-image-btn" data-dtr-id="${row.dtr_id}">View Image</button>
                        </td>
                        <td>${row.daily_total + ' hours' || '-'}</td>
                        <td>
                            <button class="btn btn-warning btn-sm edit-dtr-btn"
                                data-dtr-id="${row.dtr_id}"
                                data-dtr='${JSON.stringify(row)}'>Edit DTR</button>
                        </td>
                    </tr>
                `;
            });
            dtrHtml += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;

            // Only replace the DTR table section in the modal
            const modalContent = document.getElementById('dtr-details-content');
            if (modalContent) {
                // Find the first .card.mb-4.shadow.border (the DTR table card)
                const dtrCard = modalContent.querySelector('.card.mb-4.shadow.border');
                if (dtrCard) {
                    dtrCard.outerHTML = dtrHtml;
                }
            }
        });
}

// Show Edit Hours Modal
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('edit-hours-btn')) {
        const dtrId = e.target.getAttribute('data-dtr-id');
        const currentHours = e.target.getAttribute('data-current-hours');
        document.getElementById('editHoursDtrId').value = dtrId;
        document.getElementById('newHoursInput').value = currentHours;
        new bootstrap.Modal(document.getElementById('editHoursModal')).show();
    }
});

document.addEventListener('click', function (e) {
    if (e.target && e.target.classList.contains('edit-dtr-btn')) {
        const dtr = JSON.parse(e.target.getAttribute('data-dtr'));
        document.getElementById('editDtrId').value = dtr.dtr_id;
        document.getElementById('editTimeInAm').value = dtr.time_in_am || '';
        document.getElementById('editTimeOutAm').value = dtr.time_out_am || '';
        document.getElementById('editTimeInPm').value = dtr.time_in_pm || '';
        document.getElementById('editTimeOutPm').value = dtr.time_out_pm || '';
        document.getElementById('editEvalAm').value = dtr.evaluation_am || '';
        document.getElementById('editEvalPm').value = dtr.evaluation_pm || '';
        document.getElementById('editScannerLocation').value = dtr.scanner_location || '';
        new bootstrap.Modal(document.getElementById('editDtrModal')).show();
    }
});

document.getElementById('editDtrForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const dtrId = document.getElementById('editDtrId').value;
    const time_in_am = document.getElementById('editTimeInAm').value || null;
    const time_out_am = document.getElementById('editTimeOutAm').value || null;
    const time_in_pm = document.getElementById('editTimeInPm').value || null;
    const time_out_pm = document.getElementById('editTimeOutPm').value || null;
    const dtr_time_evaluation_am = document.getElementById('editEvalAm').value;
    const dtr_time_evaluation_pm = document.getElementById('editEvalPm').value;
    const scanner_location = document.getElementById('editScannerLocation').value;

    fetch('/edit_dtr', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            dtr_id: dtrId,
            time_in_am,
            time_out_am,
            time_in_pm,
            time_out_pm,
            dtr_time_evaluation_am,
            dtr_time_evaluation_pm,
            scanner_location
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            const studentId = document.getElementById('moveToPayrollBtn').getAttribute('data-student-id');
            refreshDtrModalTable(studentId);
            alert('DTR updated successfully!');
        } else {
            showDtrActionToast('Failed to update DTR.', false);
        }
        bootstrap.Modal.getInstance(document.getElementById('editDtrModal')).hide();
    });
});

function formatTime(datetimeStr) {
    if (!datetimeStr) return '-';
    // Handles formats like "2025-07-20T08:00" or "2025-07-20T08:00:00"
    const tIndex = datetimeStr.indexOf('T');
    if (tIndex !== -1) {
        return datetimeStr.substring(tIndex + 1, tIndex + 6).replace(':', ' : ');
    }
    // Handles formats like "2025-07-20 08:00:00"
    const spaceIndex = datetimeStr.indexOf(' ');
    if (spaceIndex !== -1) {
        return datetimeStr.substring(spaceIndex + 1, spaceIndex + 6).replace(':', ' : ');
    }
    return datetimeStr; // fallback
}

document.addEventListener('click', function(e) {
    if (e.target && e.target.classList.contains('toggle-onhold-btn')) {
        const studentId = e.target.getAttribute('data-id');
        fetch(`/toggle_payroll_on_hold/${studentId}`, { method: 'POST' })
            .then(res => res.json())
            .then(resp => {
                if (resp.success) {
                    location.reload();
                    alert('On hold status updated successfully!');
                } else {
                    showDtrActionToast('Failed to update on hold status.', false);
                }
            });
    }
});

document.addEventListener('change', function(e) {
    // Requested Docs isgood
    if (e.target && e.target.classList.contains('requested-docs-isgood-radio')) {
        const studentId = e.target.getAttribute('data-id');
        const isGood = e.target.checked;
        fetch(`/update_requested_docs_isgood/${studentId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isgood: isGood })
        })
        .then(res => res.json())
        .then(resp => {
            if (resp.success) {
                e.target.nextElementSibling.textContent = isGood ? 'Good' : 'Needs Reupload';
            } else {
                showDtrActionToast('Failed to update requested docs status.', false);
            }
        });
    }
    // AR isgood
    if (e.target && e.target.classList.contains('ar-isgood-radio')) {
        const studentId = e.target.getAttribute('data-id');
        const isGood = e.target.checked;
        fetch(`/update_ar_isgood/${studentId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isgood: isGood })
        })
        .then(res => res.json())
        .then(resp => {
            if (resp.success) {
                e.target.nextElementSibling.textContent = isGood ? 'Good' : 'Needs Reupload';
            } else {
                showDtrActionToast('Failed to update AR status.', false);
            }
        });
    }
});

document.addEventListener('click', function(e) {
    if (e.target && e.target.id === 'saveDtrPesoCommentBtn') {
        const studentId = document.getElementById('moveToPayrollBtn').getAttribute('data-student-id');
        const comment = document.getElementById('dtrPesoComment').value;
        fetch(`/update_dtr_comment/${studentId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ comment })
        })
        .then(res => res.json())
        .then(resp => {
            if (resp.success) {
                alert('Comment saved and SMS sent!');
            } else {
                showDtrActionToast('Failed to save comment.', false);
            }
        })
        .catch(() => showDtrActionToast('Error saving comment.', false));
    }
});
