function fetchAndDisplayDtrRecords() {
    const selectedCategory = document.getElementById('category_filter').value;
    const searchQuery = document.getElementById('search_input').value;
    const sortOption = document.getElementById('sort_option').value;
    const holdStatus = document.getElementById('hold_status') ? document.getElementById('hold_status').value : 'All';
    let onHoldFilter = null;
    if (holdStatus === 'active') onHoldFilter = false;
    else if (holdStatus === 'on_hold') onHoldFilter = true;

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
                        <div class="card mb-4 shadow">
                            <div class="card-header text-white" style="background-color: #003366;">
                                <h5 class="mb-0 fw-bold">${studentName} DTR (ID: ${studentId})</h5>
                            </div>
                            <div class="card-body bg-light">
                                <!-- Progress Bar goes here -->
                                <div class="container mb-3">
                                    <h6 class="text-center">Progress Tracker</h6>
                                    <div class="progress">
                                        <div id="modalDtrProgressBar" class="progress-bar bg-success text-dark fw-bold ps-3 pe-3" role="progressbar" style="width: 0%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="160">0% Complete</div>
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
                                    <button class="btn btn-sm btn-info view-image-btn" data-dtr-id="${row.dtr_id}" style="background-color: #20c997;">View Image</button>
                                </td>
                                <td>${row.daily_total + ' hours' || '-'}</td>
                                <td>
                                    <button class="btn btn-warning btn-sm edit-dtr-btn"
                                        data-dtr-id="${row.dtr_id}"
                                        data-dtr='${JSON.stringify(row)}'>Rectify DTR
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
                                    <a class="btn btn-primary ms-2" href="/download_csc_dtr_xlsx/${studentId}" target="_blank">
                                    Download DTR
                                </a>
                                </div>
                            </div>
                        </div>
                    `;

                    // 2. Accomplishment Report Card
                    let reportHtml = '';
                    if (accompData.has_report) {
                        let fileUrl = `/download_accomplishment_report/${studentId}`;
                        reportHtml = `
                            <div class="card mt-4 accomplishment-report-card shadow">
                                <div class="card-header text-white d-flex justify-content-between align-items-center" style="background-color: #003366;">
                                    <h5 class="mb-0 fw-bold">Accomplishment Report</h5>
                                    <div class="form-check form-switch ms-auto">
                                        <input class="form-check-input ar-isgood-radio" type="checkbox"
                                            id="isgood_ar" data-id="${studentId}" ${accompData.ar_isgood ? 'checked' : ''}>
                                        <label class="form-check-label" for="isgood_ar">${accompData.ar_isgood ? 'Good' : 'Needs Reupload'}</label>
                                    </div>
                                </div>
                                <div class="card-body text-center">
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
                            <div class="card mt-4 requested-docs-card shadow">
                                <div class="card-header text-white d-flex justify-content-between align-items-center" style="background-color: #003366;">
                                    <h5 class="mb-0 fw-bold">Requested Document</h5>
                                    <div class="form-check form-switch ms-auto">
                                        <input class="form-check-input requested-docs-isgood-radio" type="checkbox"
                                            id="isgood_requested_docs" data-id="${studentId}" ${reqData.requested_docs_isgood ? 'checked' : ''}>
                                        <label class="form-check-label" for="isgood_requested_docs">${reqData.requested_docs_isgood ? 'Good' : 'Needs Reupload'}</label>
                                    </div>
                                </div>
                                <div class="card-body text-center">
                                    <iframe src="${reqFileUrl}" width="70%" height="800px" class="rounded border"></iframe>
                                </div>
                            </div>
                        `;
                    }

                    // 4. Comment Card
                    let commentCard = `
                        <div class="card mt-4 peso-comment-card shadow">
                            <div class="card-header text-white" style="background-color: #003366;">
                                <h5 class="mb-0 fw-bold">PESO Comment to DTR</h5>
                            </div>
                            <div class="card-body">
                                <div id="dtrCommentsList" class="mb-2" style="max-height:220px; overflow:auto;"></div>
                                <textarea class="form-control mb-2" id="dtrPesoComment" rows="1" placeholder="Write a comment..."></textarea>
                                <button id="saveDtrPesoCommentBtn" type="button" class="btn btn-success">Send Comment</button>
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

                    // after inserting modalContent, fetch and render DTR comment history
                    fetch(`/get_dtr_comments/${studentId}`)
                        .then(r => r.json())
                        .then(js => {
                            if (js && js.comments) renderDtrComments(js.comments);
                        })
                        .catch(() => {
                            const list = document.getElementById('dtrCommentsList');
                            if (list) list.innerHTML = '<div class="small text-muted">Failed to load comments.</div>';
                        });
                });
            });
        });
    });
}
document.addEventListener('DOMContentLoaded', fetchAndDisplayDtrRecords);
document.getElementById('category_filter').addEventListener('change', fetchAndDisplayDtrRecords);
document.getElementById('sort_option').addEventListener('change', fetchAndDisplayDtrRecords);
document.getElementById('search_input').addEventListener('input', fetchAndDisplayDtrRecords);
document.getElementById('hold_status').addEventListener('change', fetchAndDisplayDtrRecords);

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
    if (e.target && e.target.classList.contains('view-image-btn')) {
        const dtrId = e.target.getAttribute('data-dtr-id');
        // get current student id from modal footer button (set when opening viewDtrModal)
        const moveBtn = document.getElementById('moveToPayrollBtn');
        const studentId = (moveBtn && moveBtn.getAttribute('data-student-id')) || e.target.getAttribute('data-student-id');

        Promise.all([
            fetch(`/get_dtr_images/${dtrId}`).then(r => r.json()),
            studentId ? fetch(`/get_student_details/${studentId}`).then(r => r.json()) : Promise.resolve(null)
        ]).then(([images, student]) => {
            // Left panel: passport and small profile
            const passportUrl = student ? `/get_requirement_file/student_application/${student.student_id}/passport_pic` : '';
            const fullName = student ? `${student.last_name || ''}, ${student.first_name || ''} ${student.middle_name || ''} ${student.suffix || ''}`.replace(/\s+/g,' ').trim() : '';
            const profileDetails = [];
            if (student) {
                if (student.student_category) profileDetails.push(`<strong>Category:</strong> ${student.student_category}`);
                if (student.mobile_no) profileDetails.push(`<strong>Mobile:</strong> ${student.mobile_no}`);
                if (student.email) profileDetails.push(`<strong>Email:</strong> ${student.email}`);
                if (student.birth_date) profileDetails.push(`<strong>Birth:</strong> ${new Date(student.birth_date).toLocaleDateString('en-US')}`);
            }

            // Populate left
            const passportImgEl = document.getElementById('dtr-passport-img');
            const fullnameEl = document.getElementById('dtr-fullname');
            const detailsEl = document.getElementById('dtr-profile-details');

            if (passportImgEl && passportUrl) {
                passportImgEl.src = passportUrl;
                passportImgEl.onerror = () => { passportImgEl.src = ''; passportImgEl.alt = 'No passport image'; }
            } else if (passportImgEl) {
                passportImgEl.src = '';
                passportImgEl.alt = 'No passport image';
            }
            fullnameEl.textContent = fullName || `ID: ${studentId || '-'}`;

            // Show basic profile first, add placeholder for DTR details
            detailsEl.innerHTML = profileDetails.length ? profileDetails.map(s => `<div class="mb-1">${s}</div>`).join('') : '<div class="text-muted">No additional details</div>';
            const singleDtrContainerId = 'dtr-single-details';
            const prev = document.getElementById(singleDtrContainerId);
            if (prev) prev.remove();
            const placeholder = document.createElement('div');
            placeholder.id = singleDtrContainerId;
            placeholder.className = 'mt-3';
            placeholder.innerHTML = `<div class="text-muted small">Loading DTR details...</div>`;
            detailsEl.appendChild(placeholder);

            // Fetch student's DTR rows to render the specific clicked DTR under the profile
            if (studentId) {
                fetch(`/get_student_dtr/${studentId}`).then(r => r.json()).then(dtrRows => {
                    const clicked = dtrRows.find(d => String(d.dtr_id) === String(dtrId));
                    const container = document.getElementById(singleDtrContainerId);
                    if (!container) return;
                    if (!clicked) {
                        container.innerHTML = `<div class="text-muted small">DTR details not found.</div>`;
                        return;
                    }
                    const dtrDetailHtml = `
                        <div class="card shadow-sm">
                            <div class="card-body p-2">
                                <h6 class="mb-2 fw-bold text-center">This DTR</h6>
                                <div class="row mb-1">
                                    <div class="col-5"><strong>Location:</strong></div>
                                    <div class="col-7">${clicked.scanner_location || '-'}</div>
                                </div>
                                <div class="row mb-1">
                                    <div class="col-5"><strong>Day:</strong></div>
                                    <div class="col-7">${new Date(clicked.date).toLocaleDateString('en-US', {weekday:'short'})}</div>
                                </div>
                                <div class="row mb-1">
                                    <div class="col-5"><strong>Date:</strong></div>
                                    <div class="col-7">${clicked.date || '-'}</div>
                                </div>
                                <div class="row mb-1">
                                    <div class="col-5"><strong>Morning In:</strong></div>
                                    <div class="col-7">${formatTime(clicked.time_in_am)}</div>
                                </div>
                                <div class="row mb-1">
                                    <div class="col-5"><strong>Morning Out:</strong></div>
                                    <div class="col-7">${formatTime(clicked.time_out_am)}</div>
                                </div>
                                <div class="row mb-1">
                                    <div class="col-5"><strong>Afternoon In:</strong></div>
                                    <div class="col-7">${formatTime(clicked.time_in_pm)}</div>
                                </div>
                                <div class="row mb-1">
                                    <div class="col-5"><strong>Afternoon Out:</strong></div>
                                    <div class="col-7">${formatTime(clicked.time_out_pm)}</div>
                                </div>
                                <div class="row mb-1">
                                    <div class="col-5"><strong>Eval AM:</strong></div>
                                    <div class="col-7">${clicked.evaluation_am || '-'}</div>
                                </div>
                                <div class="row mb-1">
                                    <div class="col-5"><strong>Eval PM:</strong></div>
                                    <div class="col-7">${clicked.evaluation_pm || '-'}</div>
                                </div>
                                <div class="row mb-1">
                                    <div class="col-5"><strong>Daily Total:</strong></div>
                                    <div class="col-7">${clicked.daily_total ? clicked.daily_total + ' hours' : '-'}</div>
                                </div>
                            </div>
                        </div>
                    `;
                    container.innerHTML = dtrDetailHtml;

                    const rectifyWrapper = document.createElement('div');
                    rectifyWrapper.className = 'mt-2';
                    const rectifyBtn = document.createElement('button');
                    rectifyBtn.type = 'button';
                    rectifyBtn.className = 'btn btn-warning btn-sm w-100 edit-dtr-btn';
                    rectifyBtn.textContent = 'Rectify DTR';
                    // attach needed data attributes used by existing edit handler
                    rectifyBtn.setAttribute('data-dtr-id', clicked.dtr_id);
                    // store the row object as JSON so existing handler can parse it
                    rectifyBtn.setAttribute('data-dtr', JSON.stringify(clicked));
                    rectifyWrapper.appendChild(rectifyBtn);
                    container.appendChild(rectifyWrapper);
                }).catch(() => {
                    const container = document.getElementById(singleDtrContainerId);
                    if (container) container.innerHTML = `<div class="text-muted small">Failed to load DTR details.</div>`;
                });
            } else {
                const container = document.getElementById(singleDtrContainerId);
                if (container) container.innerHTML = `<div class="text-muted small">Student ID missing; cannot load DTR details.</div>`;
            }

            // Right panel: images list
            const listEl = document.getElementById('dtr-image-list');
            listEl.innerHTML = '';
            if (!images || images.length === 0) {
                listEl.innerHTML = `<div class="text-center text-muted">No image captured for this DTR entry.</div>`;
            } else {
                images.forEach(img => {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'd-flex flex-column align-items-center';
                    wrapper.innerHTML = `
                        <img src="data:image/png;base64,${img.image_data}" class="img-fluid rounded border" style="max-width:100%; max-height:520px; object-fit:contain;" alt="DTR Image">
                        <small class="text-muted mt-2">Captured at: ${img.captured_at}</small>
                        <hr style="width:100%; margin-top:.75rem; margin-bottom:.75rem;">
                    `;
                    listEl.appendChild(wrapper);
                });
            }

            // Show modal
            bootstrap.Modal.getOrCreateInstance(document.getElementById('dtrImageModal')).show();
        }).catch(err => {
            console.error('Error fetching images or student details:', err);
            // fallback: show images only
            fetch(`/get_dtr_images/${dtrId}`).then(r => r.json()).then(images => {
                const listEl = document.getElementById('dtr-image-list');
                listEl.innerHTML = '';
                if (!images || images.length === 0) {
                    listEl.innerHTML = `<div class="text-center text-muted">No image captured for this DTR entry.</div>`;
                } else {
                    images.forEach(img => {
                        const wrapper = document.createElement('div');
                        wrapper.className = 'd-flex flex-column align-items-center';
                        wrapper.innerHTML = `
                            <img src="data:image/png;base64,${img.image_data}" class="img-fluid rounded border" style="max-width:100%; max-height:520px; object-fit:contain;" alt="DTR Image">
                            <small class="text-muted mt-2">Captured at: ${img.captured_at}</small>
                            <hr style="width:100%; margin-top:.75rem; margin-bottom:.75rem;">
                        `;
                        listEl.appendChild(wrapper);
                    });
                }
                bootstrap.Modal.getOrCreateInstance(document.getElementById('dtrImageModal')).show();
            });
        });
    }
});

document.getElementById('dtrImageModal')?.addEventListener('show.bs.modal', function () {
    // hide any open popovers immediately and prevent new ones while modal is open
    hideAllPopovers();
    isDtrImageModalOpen = true;

    // count existing backdrops to compute stacking offset
    const existingBackdrops = document.querySelectorAll('.modal-backdrop').length;
    const stackOffset = existingBackdrops * 10;

    // modal should be above existing modals
    const modalZ = 1050 + stackOffset + 10;     // e.g. 1060 if one modal already open
    const backdropZ = modalZ - 1;               // backdrop sits just under the modal

    // apply z-index to modal
    this.style.zIndex = modalZ;

    // the new backdrop is appended after this event, so adjust it on next tick
    setTimeout(() => {
        const backdrops = document.querySelectorAll('.modal-backdrop');
        const newBackdrop = backdrops[backdrops.length - 1];
        if (newBackdrop) {
            newBackdrop.style.zIndex = backdropZ;
            // mark it so we can clean up later if needed
            newBackdrop.setAttribute('data-stacked', 'true');
        }
    }, 0);
});

// ensure flag is cleared when modal hides
document.getElementById('dtrImageModal')?.addEventListener('hidden.bs.modal', function () {
    isDtrImageModalOpen = false;
    // also clean up any leftover popovers just in case
    hideAllPopovers();
});

let activePopovers = [];
let isDtrImageModalOpen = false;

function hideAllPopovers() {
    activePopovers.forEach(pop => {
        if (pop && pop._popoverInstance) {
            pop._popoverInstance.hide();
            pop._popoverInstance.dispose();
            pop._popoverInstance = null;
        }
    });
    activePopovers = [];
}

document.addEventListener('mouseover', function(e) {
    // do not show hover popovers while the image modal is open
    if (isDtrImageModalOpen) return;

    if (e.target.classList.contains('view-image-btn')) {
        hideAllPopovers(); // Always hide all before showing new

        const btn = e.target;
        const dtrId = btn.getAttribute('data-dtr-id');
        fetch(`/get_dtr_images/${dtrId}`)
            .then(res => res.json())
            .then(images => {
                let html = '';
                if (images.length === 0) {
                    html = '<p class="m-2">No image captured for this DTR entry.</p>';
                } else {
                    images.forEach(img => {
                        html += `<img src="data:image/png;base64,${img.image_data}" class="img-fluid mb-2" style="max-width:250px;max-height:200px;" alt="DTR Image"><br>`;
                        html += `<small class="text-muted">Captured at: ${img.captured_at}</small><hr>`;
                    });
                }
                if (btn._popoverInstance) {
                    btn._popoverInstance.dispose();
                }
                btn.setAttribute('data-bs-content', `<div class="custom-popover">${html}</div>`);
                btn.setAttribute('data-bs-html', 'true');
                btn.setAttribute('data-bs-placement', 'left');
                btn.setAttribute('data-bs-trigger', 'manual');
                btn._popoverInstance = new bootstrap.Popover(btn);
                btn._popoverInstance.show();
                activePopovers.push(btn);
            });
    }
});

document.addEventListener('mouseout', function(e) {
    if (e.target.classList.contains('view-image-btn')) {
        const btn = e.target;
        if (btn._popoverInstance) {
            btn._popoverInstance.hide();
            btn._popoverInstance.dispose();
            btn._popoverInstance = null;
        }
        // Remove from activePopovers
        activePopovers = activePopovers.filter(pop => pop !== btn);
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
                <div class="card mb-4 shadow">
                    <div class="card-header text-white" style="background-color: #003366;">
                        <h5 class="mb-0 fw-bold">DTR Records</h5>
                    </div>
                    <div class="card-body bg-light">
                        <!-- Progress Bar -->
                        <div class="container mb-3">
                            <h6 class="text-center">Progress Tracker</h6>
                            <div class="progress">
                                <div id="modalDtrProgressBar" class="progress-bar bg-success text-dark fw-bold ps-3 pe-3" role="progressbar" style="width: ${percent}%;" aria-valuenow="${totalWorkedHours}" aria-valuemin="0" aria-valuemax="160">${Math.round(percent)}% Complete</div>
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
                            <button class="btn btn-sm btn-info view-image-btn" data-dtr-id="${row.dtr_id}" style="background-color: #20c997;">View Image</button>
                        </td>
                        <td>${row.daily_total + ' hours' || '-'}</td>
                        <td>
                            <button class="btn btn-warning btn-sm edit-dtr-btn"
                                data-dtr-id="${row.dtr_id}"
                                data-dtr='${JSON.stringify(row)}'>Rectify DTR</button>
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

document.getElementById('editDtrModal')?.addEventListener('show.bs.modal', function () {
    const existingBackdrops = document.querySelectorAll('.modal-backdrop').length;
    const stackOffset = existingBackdrops * 10;
    const modalZ = 1050 + stackOffset + 10;
    const backdropZ = modalZ - 1;
    this.style.zIndex = modalZ;
    setTimeout(() => {
        const backdrops = document.querySelectorAll('.modal-backdrop');
        const newBackdrop = backdrops[backdrops.length - 1];
        if (newBackdrop) {
            newBackdrop.style.zIndex = backdropZ;
            newBackdrop.setAttribute('data-stacked', 'true');
        }
    }, 0);
});

document.getElementById('editDtrModal')?.addEventListener('hidden.bs.modal', function () {
    this.style.zIndex = '';
    document.querySelectorAll('.modal-backdrop[data-stacked="true"]').forEach(bd => {
        bd.removeAttribute('data-stacked');
        bd.style.zIndex = '';
    });
});

function formatTime(datetimeStr) {
    if (!datetimeStr) return '-';
    // Handles formats like "2025-07-20T08:00" or "2025-07-20T08:00:00"
    let timePart = '';
    if (datetimeStr.includes('T')) {
        timePart = datetimeStr.split('T')[1].substring(0,5);
    } else if (datetimeStr.includes(' ')) {
        timePart = datetimeStr.split(' ')[1].substring(0,5);
    } else {
        timePart = datetimeStr.substring(0,5);
    }
    // Convert to 12-hour format
    const [hourStr, minuteStr] = timePart.split(':');
    let hour = parseInt(hourStr, 10);
    const minute = minuteStr;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return `${hour}:${minute} ${ampm}`;
}

document.addEventListener('click', function(e) {
    if (e.target && e.target.classList.contains('toggle-onhold-btn')) {
        const studentId = e.target.getAttribute('data-id');
        fetch(`/toggle_payroll_on_hold/${studentId}`, { method: 'POST' })
            .then(res => res.json())
            .then(resp => {
                if (resp.success) {
                    location.reload();
                    // alert('On hold status updated successfully!');
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

// Save DTR comment — append to history and auto-scroll bottom
document.addEventListener('click', function(e) {
    if (e.target && e.target.id === 'saveDtrPesoCommentBtn') {
        const studentId = document.getElementById('moveToPayrollBtn').getAttribute('data-student-id');
        const commentEl = document.getElementById('dtrPesoComment');
        if (!studentId || !commentEl) return;
        const comment = commentEl.value.trim();
        if (!comment) {
            alert('Comment cannot be empty.');
            return;
        }
        fetch(`/update_dtr_comment/${studentId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ comment })
        })
        .then(res => res.json())
        .then(resp => {
            if (resp.success) {
                alert('Comment saved!');
                if (resp.comment) {
                    const list = document.getElementById('dtrCommentsList');
                    const itemHtml = `
                        <div class="card mb-2">
                            <div class="card-body p-2">
                                <div class="small text-secondary">${resp.comment.author || 'PESO'}</div>
                                <div class="small text-muted">${formatTimestamp(resp.comment.created_at || '')}</div>
                                <div class="mt-1">${(resp.comment.comment || '').replace(/\n/g,'<br>')}</div>
                            </div>
                        </div>
                    `;
                    if (list) {
                        list.insertAdjacentHTML('beforeend', itemHtml);
                        requestAnimationFrame(() => { list.scrollTop = list.scrollHeight; });
                    }
                } else {
                    // fallback: refresh history
                    fetch(`/get_dtr_comments/${studentId}`)
                        .then(r => r.json())
                        .then(d => { if (d.comments) renderDtrComments(d.comments); });
                }
                commentEl.value = '';
            } else {
                showDtrActionToast(resp.error || 'Failed to save comment.', false);
            }
        })
        .catch(() => showDtrActionToast('Error saving comment.', false));
    }
});

// Helpers: timestamp formatting and render
function formatTimestamp(isoOrSqlString) {
    if (!isoOrSqlString) return '';
    const s = isoOrSqlString.includes('T') ? isoOrSqlString : isoOrSqlString.replace(' ', 'T');
    const d = new Date(s);
    if (isNaN(d)) return isoOrSqlString;
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    const hh = String(hours).padStart(2, '0');
    return `${mm}-${dd}-${yyyy}, ${hh}:${minutes} ${ampm}`;
}

function renderDtrComments(comments = []) {
    const list = document.getElementById('dtrCommentsList');
    if (!list) return;
    if (!comments || comments.length === 0) {
        list.innerHTML = '<div class="small text-muted">No previous comments.</div>';
        return;
    }
    // ensure oldest-first so newest is at bottom
    const ordered = comments.slice().reverse();
    list.innerHTML = ordered.map(c => `
        <div class="card mb-2">
            <div class="card-body p-2">
                <div class="small text-secondary">${c.author || 'PESO'}</div>
                <div class="small text-muted">${formatTimestamp(c.created_at)}</div>
                <div class="mt-1">${(c.comment || '').replace(/\n/g, '<br>')}</div>
            </div>
        </div>
    `).join('');
    requestAnimationFrame(() => { list.scrollTop = list.scrollHeight; });
}
