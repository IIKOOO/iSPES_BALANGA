function fetchAndDisplayPayroll() {
    const selectedCategory = document.getElementById('category_filter').value;
    const searchQuery = document.getElementById('search_input').value;
    const sortOption = document.getElementById('sort_option').value;
    let isPaidFilter = null;
    if (sortOption === 'paid') isPaidFilter = true;
    if (sortOption === 'unpaid') isPaidFilter = false;

    fetch('/get_student_dtr_records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            status: "payroll",
            student_category: selectedCategory,
            search_query: searchQuery,
            sort_option: sortOption,
            is_paid: isPaidFilter
        })
    })
    .then(res => res.json())
    .then(data => {
        const tbody = document.getElementById('dtr-records-table');
        tbody.innerHTML = '';
        data.forEach(row => {
            tbody.innerHTML += `
                <tr>
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
                        <button class="btn btn-primary btn-sm view-dtr-btn" data-id="${row.dtr_record_id}" data-name="${row.last_name}, ${row.first_name}" data-bs-toggle="modal" data-bs-target="#viewDtrModal">View DTR</button>
                        <button class="btn ${row.is_paid ? 'btn-success' : 'btn-danger'} btn-sm toggle-paid-btn" data-id="${row.dtr_record_id}">
                            ${row.is_paid ? 'Paid' : 'Unpaid'}
                        </button>
                    </td>
                </tr>
            `;
        });
        document.querySelectorAll('.toggle-paid-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const studentId = this.getAttribute('data-id');
                fetch(`/toggle_payroll_paid/${studentId}`, { method: 'POST' })
                    .then(res => res.json())
                    .then(resp => {
                        if (resp.success) {
                            location.reload();
                        } else {
                            alert('Failed to update payroll status.');
                        }
                    });
            });
        });

        document.querySelectorAll('.view-dtr-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const studentId = this.getAttribute('data-id');
                const studentName = this.getAttribute('data-name');
                fetch(`/get_student_dtr/${studentId}`)
                    .then(res => res.json())
                    .then(dtrData => {
                        let html = `
                            <div class="card mb-4 shadow">
                                <div class="card-header text-white" style="background-color: #003366;">
                                    <h5 class="mb-0 fw-bold">${studentName} DTR (ID: ${studentId})</h5>
                                </div>
                                <div class="card-body bg-light">
                                    <!-- Progress Bar -->
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
                                            </thead>
                                            <tbody>
                        `;
                        dtrData.forEach(row => {
                            const day = new Date(row.date).toLocaleDateString('en-US', {weekday:'short'});
                            html += `
                                <tr>
                                    <td style="white-space:normal;word-break:break-word;max-width:350px;font-size:1.1em;background:#f8f9fa;">
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
                                </tr>
                            `;
                        });
                        html += `
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
                        document.getElementById('dtr-details-content').innerHTML = html;

                        // Update progress bar
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

                        Promise.all([
                            fetch(`/get_accomplishment_report/${studentId}`).then(res => res.json()),
                            fetch(`/get_requested_docs/${studentId}`).then(res => res.json()),
                            fetch(`/get_student_dtr_records`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: "payroll" })
                            }).then(res => res.json())
                        ]).then(([accompData, reqData, allRecords]) => {
                            // 1. Accomplishment Report
                            if (accompData.has_report) {
                                let fileUrl = `/download_accomplishment_report/${studentId}`;
                                let reportHtml = `
                                    <div class="card mt-4 accomplishment-report-card shadow">
                                        <div class="card-header text-white" style="background-color: #003366;">
                                            <h5 class="mb-0 fw-bold">Accomplishment Report</h5>
                                        </div>
                                        <div class="card-body text-center">
                                            <iframe src="${fileUrl}" width="70%" height="800px" class="rounded border"></iframe>
                                        </div>
                                    </div>
                                `;
                                document.getElementById('dtr-details-content').innerHTML += reportHtml;
                            }
                            // 2. Requested Docs
                            if (reqData.has_requested_docs) {
                                let reqFileUrl = `/download_requested_docs/${studentId}`;
                                let requestedDocsHtml = `
                                    <div class="card mt-4 requested-docs-card shadow">
                                        <div class="card-header text-white" style="background-color: #003366;">
                                            <h5 class="mb-0 fw-bold">Requested Document</h5>
                                        </div>
                                        <div class="card-body text-center">
                                            <iframe src="${reqFileUrl}" width="70%" height="800px" class="rounded border"></iframe>
                                        </div>
                                    </div>
                                `;
                                document.getElementById('dtr-details-content').innerHTML += requestedDocsHtml;
                            }
                            // 3. Comment (read-only)
                            const student = allRecords.find(r => r.dtr_record_id == studentId);
                            // let comment = student && student.comment_for_dtr ? student.comment_for_dtr : '';
                            // let commentCard = `
                            //     <div class="card mt-4 peso-comment-card shadow">
                            //         <div class="card-header text-white" style="background-color: #003366;">
                            //             <h5 class="mb-0 fw-bold">PESO Comment to Student</h5>
                            //         </div>
                            //         <div class="card-body">
                            //             <textarea class="form-control mb-2" id="dtrPesoComment" rows="3" placeholder="No comment yet..." readonly>${comment || ''}</textarea>
                            //         </div>
                            //     </div>
                            // `;
                            document.getElementById('dtr-details-content').innerHTML;
                        });

                        document.querySelectorAll('.toggle-onhold-btn').forEach(btn => {
                            btn.addEventListener('click', function() {
                                const studentId = this.getAttribute('data-id');
                                fetch(`/toggle_payroll_on_hold/${studentId}`, { method: 'POST' })
                                    .then(res => res.json())
                                    .then(resp => {
                                        if (resp.success) {
                                            location.reload();
                                        } else {
                                            alert('Failed to update on hold status.');
                                        }
                                    });
                            });
                        });

                        document.addEventListener('click', function imageModalHandler(e) {
                            if (e.target.classList && e.target.classList.contains('view-image-btn')) {
                                const dtrId = e.target.getAttribute('data-dtr-id');
                                // studentId is defined in the outer scope (from view-dtr-btn handler)
                                // fall back to data attribute on button if not available
                                const sid = typeof studentId !== 'undefined' ? studentId : e.target.getAttribute('data-student-id');

                                Promise.all([
                                    fetch(`/get_dtr_images/${dtrId}`).then(r => r.json()),
                                    sid ? fetch(`/get_student_details/${sid}`).then(r => r.json()) : Promise.resolve(null)
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
                                    fullnameEl.textContent = fullName || `ID: ${sid || '-'}`;

                                    // show basic profile first, then fetch specific dtr and append its details
                                    detailsEl.innerHTML = profileDetails.length ? profileDetails.map(s => `<div class="mb-1">${s}</div>`).join('') : '<div class="text-muted">No additional details</div>';

                                    // placeholder for single-dtr details
                                    const singleDtrContainerId = 'dtr-single-details';
                                    const prev = document.getElementById(singleDtrContainerId);
                                    if (prev) prev.remove();
                                    const placeholder = document.createElement('div');
                                    placeholder.id = singleDtrContainerId;
                                    placeholder.className = 'mt-3';
                                    placeholder.innerHTML = `<div class="text-muted small">Loading DTR details...</div>`;
                                    detailsEl.appendChild(placeholder);

                                    // fetch student's DTR rows and extract the clicked row
                                    if (sid) {
                                        fetch(`/get_student_dtr/${sid}`).then(r => r.json()).then(dtrRows => {
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
                    });
            });
        });

        document.querySelectorAll('.toggle-onhold-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const studentId = this.getAttribute('data-id');
                fetch(`/toggle_payroll_on_hold/${studentId}`, { method: 'POST' })
                    .then(res => res.json())
                    .then(resp => {
                        if (resp.success) {
                            location.reload();
                        } else {
                            alert('Failed to update on hold status.');
                        }
                    });
            });
        });
    });
}

document.getElementById('dtrImageModal')?.addEventListener('show.bs.modal', function () {
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

// cleanup styles after modal hidden
document.getElementById('dtrImageModal')?.addEventListener('hidden.bs.modal', function () {
    // reset modal inline style
    this.style.zIndex = '';

    // remove stacked flag / inline z-index from backdrops that we created
    document.querySelectorAll('.modal-backdrop[data-stacked="true"]').forEach(bd => {
        bd.removeAttribute('data-stacked');
        bd.style.zIndex = '';
    });
});

document.addEventListener('DOMContentLoaded', fetchAndDisplayPayroll);
document.getElementById('category_filter').addEventListener('change', fetchAndDisplayPayroll);
document.getElementById('sort_option').addEventListener('change', fetchAndDisplayPayroll);
document.getElementById('search_input').addEventListener('input', fetchAndDisplayPayroll);


function fetchPayrollSummary() {
    fetch('/payroll_summary')
        .then(res => res.json())
        .then (data => {
            document.getElementById('payrollTotal').textContent = data.total;
            document.getElementById('payrollPaid').textContent = data.paid;
            document.getElementById('payrollUnpaid').textContent = data.unpaid;
        });
}

let activePopovers = [];

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

document.getElementById('downloadStudentPayrollCsvBtn').addEventListener('click', function() {
    window.location.href = '/download_student_payroll_csv';
});

document.getElementById('downloadStudentPayrollXlsxBtn').addEventListener('click', function() {
    new bootstrap.Modal(document.getElementById('downloadStudentPayrollXlsxModal')).show();
});

// Enable confirm button only if an option is selected
document.querySelectorAll('input[name="payrollDownloadCategory"]').forEach(el => {
    el.addEventListener('change', function() {
        document.getElementById('confirmDownloadStudentPayrollXlsxBtn').disabled = false;
    });
});

document.getElementById('downloadAllDtrBtn').addEventListener('click', function() {
    window.location.href = '/download_all_csc_dtr_zip';
});

// Handle download on confirm
document.getElementById('confirmDownloadStudentPayrollXlsxBtn').addEventListener('click', function() {
    const selected = document.querySelector('input[name="payrollDownloadCategory"]:checked');
    const paidStatus = document.getElementById('payrollDownloadPaidStatus').value;
    if (!selected) return;
    let url = '/download_student_payroll_xlsx?category=' + selected.value + '&is_paid=' + paidStatus;
    window.location.href = url;
    bootstrap.Modal.getInstance(document.getElementById('downloadStudentPayrollXlsxModal')).hide();
});

document.addEventListener('DOMContentLoaded', fetchPayrollSummary, fetchActionLogs());


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

document.getElementById('moveStudentPayrollToArchiveBtn').addEventListener('click', function() {
    new bootstrap.Modal(document.getElementById('movePayrollArchiveModal')).show();
});

document.getElementById('confirmMovePayrollArchiveBtn').addEventListener('click', function() {
    fetch('/move_student_payroll_to_archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(res => res.json())
    .then(data => {
        // Hide modal
        bootstrap.Modal.getInstance(document.getElementById('movePayrollArchiveModal')).hide();

        // Show toast with returned message
        showMsgToast(data.message, data.category);

        // Optionally reload after a delay
        setTimeout(() => location.reload(), 2000);
    });
});

function showPayrollActionToast(message, isSuccess) {
    const toastEl = document.getElementById('payrollActionToast');
    const toastBody = document.getElementById('payrollActionToastBody');
    toastBody.textContent = message;
    toastEl.classList.remove('text-bg-success', 'text-bg-danger', 'show');
    toastEl.classList.add(isSuccess ? 'text-bg-success' : 'text-bg-danger');
    const bsToast = new bootstrap.Toast(toastEl, { delay: 4000 });
    bsToast.show();
}

document.getElementById('confirmMovePayrollArchiveBtn').addEventListener('click', function() {
    fetch('/move_student_payroll_to_archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(res => res.json())
    .then(data => {
        // Hide modal
        bootstrap.Modal.getInstance(document.getElementById('movePayrollArchiveModal')).hide();

        // Show toast with returned message
        showPayrollActionToast(data.message, data.success);

        // Optionally reload after a delay
        setTimeout(() => location.reload(), 4000);
    });
});

// ...existing code...
document.addEventListener('DOMContentLoaded', function() {
    const sendBtn = document.getElementById('sendScheduleSmsBtn');
    const modal = new bootstrap.Modal(document.getElementById('scheduleSmsModal'));
    const dateInput = document.getElementById('scheduleDate');
    const confirmBtn = document.getElementById('sendScheduleSmsConfirmBtn');
    const smsPreview = document.getElementById('smsPreview');

    // helper to read selected category radio
    function getSelectedSmsCategory() {
        const sel = document.querySelector('input[name="payrollSmsCategory"]:checked');
        return sel ? sel.value : 'all';
    }

    // Set min date to tomorrow
    if (dateInput) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const yyyy = tomorrow.getFullYear();
        const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
        const dd = String(tomorrow.getDate()).padStart(2, '0');
        dateInput.min = `${yyyy}-${mm}-${dd}`;
    }

    if (sendBtn) {
        sendBtn.addEventListener('click', () => {
            dateInput.value = '';
            smsPreview.classList.add('d-none');
            confirmBtn.disabled = true;
            modal.show();
        });
    }

    if (dateInput) {
        dateInput.addEventListener('input', () => {
            if (dateInput.value) {
                const d = new Date(dateInput.value);
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                const yyyy = d.getFullYear();
                const formatted = `${mm}/${dd}/${yyyy}`;
                const category = getSelectedSmsCategory();
                const targetText = category === 'all' ? 'all unpaid students' : (category === 'senior_high' ? 'Senior High unpaid students' : 'College unpaid students');
                smsPreview.textContent = `SMS will be sent to ${targetText}: "Your payroll schedule is on ${formatted} 9:00am-5:00pm. Please be present."`;
                smsPreview.classList.remove('d-none');
                confirmBtn.disabled = false;
            } else {
                smsPreview.classList.add('d-none');
                confirmBtn.disabled = true;
            }
        });
    }

    // update preview when category changes
    document.querySelectorAll('input[name="payrollSmsCategory"]').forEach(el => {
        el.addEventListener('change', () => {
            if (dateInput && dateInput.value) {
                // re-trigger to update preview text
                const ev = new Event('input');
                dateInput.dispatchEvent(ev);
            }
        });
    });

    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            confirmBtn.disabled = true;
            const category = getSelectedSmsCategory();
            fetch('/send_payroll_schedule_sms', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({schedule_date: dateInput.value, category: category})
            })
            .then(res => res.json())
            .then(data => {
                modal.hide();
                showToast(data.message || 'SMS sent!', data.category || 'success');
            })
            .catch(() => {
                showToast('Failed to send SMS.', 'danger');
            })
            .finally(() => {
                confirmBtn.disabled = false;
            });
        });
    }

    function showToast(msg, category) {
        const toastBody = document.getElementById('payrollActionToastBody');
        const toast = document.getElementById('payrollActionToast');
        toastBody.textContent = msg;
        toast.classList.remove('text-bg-success', 'text-bg-danger');
        toast.classList.add('text-bg-' + (category === 'danger' ? 'danger' : 'success'));
        new bootstrap.Toast(toast).show();
    }
});