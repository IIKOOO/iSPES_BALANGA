function fetchAndDisplayPayrollArchive() {
    const selectedCategory = document.getElementById('category_filter').value;
    const searchQuery = document.getElementById('search_input').value;
    const sortOption = document.getElementById('sort_option').value;
    let isPaidFilter = null;
    if (sortOption === 'paid') isPaidFilter = true;
    if (sortOption === 'unpaid') isPaidFilter = false;

    fetch('/get_student_payroll_archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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

        // Update summary count
        document.getElementById('totalRegistrations').textContent = data.length;

        document.querySelectorAll('.toggle-paid-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const recordId = this.getAttribute('data-id');
                fetch(`/toggle_payroll_paid_archive/${recordId}`, { method: 'POST' })
                    .then(res => res.json())
                    .then(resp => {
                        if (resp.success) {
                            fetchAndDisplayPayrollArchive();
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
                            <div class="card mb-4 shadow border">
                                <div class="card-header text-white" style="background-color: #003366;">
                                    <h5 class="mb-0 fw-bold">DTR Records</h5>
                                </div>
                                <div class="card-body bg-light">
                                    <div class="container mb-3">
                                        <h6 class="text-center">Progress Tracker</h6>
                                        <div class="progress">
                                            <div id="modalDtrProgressBar" class="progress-bar bg-success" role="progressbar" style="width: 0%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="160">0% Complete</div>
                                        </div>
                                        <div class="text-center mt-2">
                                            <span id="modalDtrProgressText">0 hours completed, 160 hours remaining</span>
                                        </div>
                                    </div>
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
                                        <button class="btn btn-sm btn-info view-image-btn" style="background-color: #20c997;" data-dtr-id="${row.dtr_id}">View Image</button>
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
                                            <button class="btn btn-success" onclick="window.print()">Print DTR</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                        document.getElementById('dtr-details-content').innerHTML = html;

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

                        // Fetch archive accomplishment report, requested docs, and comment
                        Promise.all([
                            fetch(`/get_accomplishment_report_archive/${studentId}`).then(res => res.json()),
                            fetch(`/get_requested_docs_archive/${studentId}`).then(res => res.json()),
                            fetch('/get_student_payroll_archive', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({})
                            }).then(res => res.json())
                        ]).then(([accompData, reqData, allRecords]) => {
                            // 1. Accomplishment Report
                            if (accompData.has_report) {
                                let fileUrl = `/download_accomplishment_report_archive/${studentId}`;
                                let reportHtml = `
                                    <div class="card mt-4 accomplishment-report-card shadow">
                                        <div class="card-header text-white" style="background-color: #003366;">
                                            <h5 class="mb-0 fw-bold">Accomplishment Report</h5>
                                        </div>
                                        <div class="card-body text-center bg-light">
                                            <iframe src="${fileUrl}" width="70%" height="800px" class="rounded border"></iframe>
                                        </div>
                                    </div>
                                `;
                                document.getElementById('dtr-details-content').innerHTML += reportHtml;
                            }
                            // 2. Requested Docs
                            if (reqData.has_requested_docs) {
                                let reqFileUrl = `/download_requested_docs_archive/${studentId}`;
                                let requestedDocsHtml = `
                                    <div class="card mt-4 requested-docs-card shadow">
                                        <div class="card-header text-white" style="background-color: #003366;">
                                            <h5 class="mb-0 fw-bold">Requested Document</h5>
                                        </div>
                                        <div class="card-body text-center bg-light">
                                            <iframe src="${reqFileUrl}" width="70%" height="800px" class="rounded border"></iframe>
                                        </div>
                                    </div>
                                `;
                                document.getElementById('dtr-details-content').innerHTML += requestedDocsHtml;
                            }
                            // 3. Comment (read-only)
                            const student = allRecords.find(r => r.dtr_record_id == studentId);
                            let comment = student && student.comment_for_dtr ? student.comment_for_dtr : '';
                            let commentCard = `
                                <div class="card mt-4 shadow">
                                    <div class="card-header text-white" style="background-color: #003366;">
                                        <h5 class="mb-0 fw-bold">PESO Comment to Student</h5>
                                    </div>
                                    <div class="card-body bg-light">
                                        <textarea class="form-control mb-2" id="dtrPesoComment" rows="3" placeholder="No comment yet..." readonly>${comment || ''}</textarea>
                                    </div>
                                </div>
                            `;
                            document.getElementById('dtr-details-content').innerHTML += commentCard;
                        });

                        // View image handler
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
                    });
            });
        });
    });
}

document.addEventListener('mouseover', function(e) {
    if (e.target.classList.contains('view-image-btn')) {
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
                // Destroy previous popover if any
                if (btn._popoverInstance) {
                    btn._popoverInstance.dispose();
                }
                btn.setAttribute('data-bs-content', html);
                btn.setAttribute('data-bs-html', 'true');
                btn.setAttribute('data-bs-placement', 'left');
                btn.setAttribute('data-bs-trigger', 'manual');
                btn._popoverInstance = new bootstrap.Popover(btn);
                btn._popoverInstance.show();
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
    }
});
function formatTime(datetimeStr) {
    if (!datetimeStr) return '-';
    const tIndex = datetimeStr.indexOf('T');
    if (tIndex !== -1) {
        return datetimeStr.substring(tIndex + 1, tIndex + 6).replace(':', ' : ');
    }
    const spaceIndex = datetimeStr.indexOf(' ');
    if (spaceIndex !== -1) {
        return datetimeStr.substring(spaceIndex + 1, spaceIndex + 6).replace(':', ' : ');
    }
    return datetimeStr;
}

document.addEventListener('DOMContentLoaded', fetchAndDisplayPayrollArchive);
document.getElementById('category_filter').addEventListener('change', fetchAndDisplayPayrollArchive);
document.getElementById('sort_option').addEventListener('change', fetchAndDisplayPayrollArchive);
document.getElementById('search_input').addEventListener('input', fetchAndDisplayPayrollArchive);