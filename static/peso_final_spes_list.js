function fetchAndDisplayFinalList() {
    const selectedCategory = document.getElementById('category_filter').value;
    const searchQuery = document.getElementById('search_input').value;
    const sortOption = document.getElementById('sort_option').value;

    // Use the unified endpoint and status for final list
    fetch('/retrieve_applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            status: 'final', // Only show applications with is_approved = true
            student_category: selectedCategory,
            search_query: searchQuery,
            sort_option: sortOption
        })
    })
    .then(response => response.json())
    .then(data => {
        const tableBody = document.querySelector('.table tbody');
        tableBody.innerHTML = '';
        if (data.error) {
            alert(data.error);
        } else {
            data.forEach(row => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${row.student_id}</td>
                    <td>${row.last_name}</td>
                    <td>${row.first_name}</td>
                    <td>${row.middle_name}</td>
                    <td>${row.category}</td>
                    <td>${row.email}</td>
                    <td>${row.time_stamp}</td>
                    <td>
                        <button class="btn btn-primary btn-sm view-data-btn" data-id="${row.student_id}" data-bs-toggle="modal" data-bs-target="#viewDataModal">View Data</button>
                    </td>
                `;
                tableBody.appendChild(tr);
            });
        }
    })
    .catch(error => console.error('Error:', error));
}

document.addEventListener('DOMContentLoaded', fetchAndDisplayFinalList);

document.getElementById('category_filter').addEventListener('change', fetchAndDisplayFinalList);
document.getElementById('sort_option').addEventListener('change', fetchAndDisplayFinalList);
document.getElementById('search_input').addEventListener('input', fetchAndDisplayFinalList);

function renderRow(label, value) {
    if (value === undefined || value === null || value === '') return '';
    return `
        <div class="row mb-3">
            <div class="col-md-4"><strong>${label}:</strong></div>
            <div class="col-md-8">${value}</div>
        </div>
    `;
}

let currentStudentId = null;
document.addEventListener('click', function (e) {
    if (e.target && e.target.classList.contains('view-data-btn')) {
        const studentId = e.target.getAttribute('data-id');
        currentStudentId = studentId;

        // Fetch both DTR and details at the same time
        Promise.all([
            fetch(`/get_student_dtr/${studentId}`).then(res => res.json()),
            fetch(`/get_student_details/${studentId}`).then(res => res.json())
        ]).then(([dtrData, data]) => {
            // Progress bar HTML
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
                            <button class="btn btn-sm view-image-btn" data-dtr-id="${row.dtr_id}" style="background-color: #20c997;">View Image</button>
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
            dtrHtml += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
            let html = `
                    <div class="card mb-4" style="background-color: #003366;">
                        <div class="card-header text-white">
                            <h5 class="mb-0 fw-bold">Personal Information</h5>
                        </div>
                        <div class="card-body bg-light">
                            <div class="row mb-3">
                                <div class="col-md-4"><strong>ID:</strong></div>
                                <div class="col-md-8">${data.student_id}</div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-4"><strong>Timestamp:</strong></div>
                                <div class="col-md-8">${data.time_stamp}</div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-4"><strong>Category:</strong></div>
                                <div class="col-md-8">${data.student_category}</div>
                            </div>
                            ${renderRow('Iskolar Type', data.iskolar_type)}
                            <div class="row mb-3">
                                <div class="col-md-4"><strong>Full Name:</strong></div>
                                <div class="col-md-8">${data.first_name} ${data.middle_name} ${data.last_name} ${data.suffix}</div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-4"><strong>Email:</strong></div>
                                <div class="col-md-8">${data.email}</div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-4"><strong>Mobile No:</strong></div>
                                <div class="col-md-8">${data.mobile_no}</div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-4"><strong>Birth Date:</strong></div>
                                <div class="col-md-8">${formatBirthDate(data.birth_date)}</div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-4"><strong>Birth Place:</strong></div>
                                <div class="col-md-8">${data.birth_place}</div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-4"><strong>Status of Student:</strong></div>
                                <div class="col-md-8">${data.status_of_student}</div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-4"><strong>Citizenship:</strong></div>
                                <div class="col-md-8">${data.citizenship}</div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-4"><strong>Sex:</strong></div>
                                <div class="col-md-8">${data.sex}</div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-4"><strong>Civil Status:</strong></div>
                                <div class="col-md-8">${data.civil_status}</div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-4"><strong>Social Media:</strong></div>
                                <div class="col-md-8">${data.socmed}</div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-4"><strong>Disabilities:</strong></div>
                                <div class="col-md-8">${data.disabilities}</div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-4"><strong>Belong in group:</strong></div>
                                <div class="col-md-8">${data.belongs_in_group}</div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-4"><strong>Barangay:</strong></div>
                                <div class="col-md-8">${data.barangay}</div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-4"><strong>Street Address:</strong></div>
                                <div class="col-md-8">${data.street_add}</div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-4"><strong>SPES Participation Count:</strong></div>
                                <div class="col-md-8">${data.participation_count}</div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-4"><strong>Name of Beneficiary:</strong></div>
                                <div class="col-md-8">${data.name_of_beneficiary}</div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-4"><strong>Relationship to Beneficiary:</strong></div>
                                <div class="col-md-8">${data.relationship_to_beneficiary}</div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-4"><strong>Status of Parents:</strong></div>
                                <div class="col-md-8">${data.parents_status}</div>
                            </div>
                        </div>
                    </div>
                    <div class="card mb-4 shadow">
                        <div class="card-header text-white" style="background-color: #003366;">
                            <h5 class="mb-0 fw-bold">Guardian and Parents Information</h5>
                        </div>
                        <div class="card-body bg-light">
                            <div class="row mb-3">
                                <div class="col-md-4"><strong>Living With:</strong></div>
                                <div class="col-md-8">${data.living_with}</div>
                            </div>
                            ${renderRow('Guardian Full Name', data.guardian_full_name)}
                            ${renderRow('Guardian Contact No', data.guardian_contact_no)}
                            ${renderRow('Guardian Birth Date', formatBirthDate(data.guardian_birth_date))}
                            ${renderRow('Guardian Occupation', data.guardian_occupation)}
                            ${renderRow('Relationship with Guardian', data.relationship_with_guardian)}
                            ${renderRow('Guardian TIN No', data.guardian_tin_no)}
                            ${renderRow('Father Full Name', data.father_full_name)}
                            ${renderRow('Father Contact No', data.father_contact_no)}
                            ${renderRow('Father Birth Date', formatBirthDate(data.father_birth_date))}
                            ${renderRow('Father Occupation', data.father_occupation)}
                            ${renderRow('Father TIN No', data.father_tin_no)}
                            <div class="row mb-3">
                                <div class="col-md-4"><strong>Mother Full Name:</strong></div>
                                <div class="col-md-8">${data.mother_full_name}</div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-4"><strong>Mother Contact No:</strong></div>
                                <div class="col-md-8">${data.mother_contact_no}</div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-4"><strong>Mother Birth Date:</strong></div>
                                <div class="col-md-8">${formatBirthDate(data.mother_birth_date)}</div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-4"><strong>Mother Occupation:</strong></div>
                                <div class="col-md-8">${data.mother_occupation}</div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-4"><strong>Mother TIN No:</strong></div>
                                <div class="col-md-8">${data.mother_tin_no}</div>
                            </div>
                        </div>    
                    </div>
                    <div class="card mb-4 shadow">
                        <div class="card-header text-white" style="background-color: #003366;">
                            <h5 class="mb-0 fw-bold">Education Informations</h5>
                        </div>
                        <div class="card-body bg-light">
                            <div class="row mb-3">
                                <div class="col-md-4"><strong>School Name:</strong></div>
                                <div class="col-md-8">${data.school_name}</div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-4"><strong>Educational Attainment:</strong></div>
                                <div class="col-md-8">${data.educational_attainment}</div>
                            </div>
                            ${renderRow('Senior High Strand', data.senior_high_strand)}
                            ${renderRow('College Course', data.college_course)}
                            <div class="row mb-3">
                                <div class="col-md-4"><strong>Attendance Date:</strong></div>
                                <div class="col-md-8">${data.attendance_date}</div>
                            </div>
                        </div>
                    </div>`;
            let requirementsHtml = `
            <div class="card mb-4 shadow">
                <div class="card-header text-white" style="background-color: #003366;">
                    <h5 class="mb-0 fw-bold">Requirements</h5>
                </div>
                <div class="card-body bg-light">
                    <div id="requirementsCarousel" class="carousel slide" data-bs-ride="carousel">
                        <div class="carousel-inner">
            `;

            const req = data.requirements;
            const reqFiles = [
                { label: "Birth Certificate", key: "birth_certificate" },
                { label: "Parents Valid ID", key: "parents_valid_id" },
                { label: "CTC ROG", key: "ctc_rog" },
                { label: "Parents ITR", key: "parents_itr" },
                { label: "Passport Picture", key: "passport_pic" },
                { label: "Additional Files", key: "additional_files" }
            ];
            const extIcon = ext => {
                if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext)) return '<i class="bi bi-image" style="font-size:2rem"></i>';
                if (ext === 'pdf') return '<i class="bi bi-file-earmark-pdf" style="font-size:2rem;color:#d32f2f"></i>';
                return '<i class="bi bi-file-earmark" style="font-size:2rem"></i>';
            };

            let first = true;
            reqFiles.forEach(f => {
                if (req && req[f.key]) {
                    let ext = 'pdf';
                    if (f.key === 'passport_pic') ext = 'jpg';
                    let fileUrl = `/get_requirement_file/student_application/${data.student_id}/${f.key}`;
                    requirementsHtml += `
                        <div class="carousel-item${first ? ' active' : ''}">
                            <div class="d-flex flex-column align-items-center justify-content-center" style="min-height:400px;">
                                <div class="mb-2">${extIcon(ext)}</div>
                                <h6 class="card-title text-center mb-3">${f.label}</h6>
                                ${
                                    ext === 'pdf'
                                    ? `<iframe src="${fileUrl}" width="70%" height="700px" class="rounded border"></iframe>`
                                    : `<img src="${fileUrl}" alt="${f.label}" class="img-fluid rounded border mb-2" style="max-height:300px;object-fit:contain;">`
                                }
                                ${
                                    f.key === 'passport_pic'
                                    ? `<a href="${fileUrl}" download class="btn btn-outline-primary btn-sm mt-2 w-100">
                                        <i class="bi bi-download"></i> Download
                                    </a>`
                                    : ''
                                }
                            </div>
                        </div>
                    `;
                    first = false;
                }
            });

            requirementsHtml += `
                        </div>
                        <button class="carousel-control-prev" type="button" data-bs-target="#requirementsCarousel" data-bs-slide="prev">
                            <span class="carousel-control-prev-icon"></span>
                            <span class="visually-hidden">Previous</span>
                        </button>
                        <button class="carousel-control-next" type="button" data-bs-target="#requirementsCarousel" data-bs-slide="next">
                            <span class="carousel-control-next-icon"></span>
                            <span class="visually-hidden">Next</span>
                        </button>
                    </div>
                    <div class="mb-3 mt-4">
                        <label for="pesoComment" class="form-label fw-bold">PESO Comment to Student</label>
                        <textarea class="form-control" id="pesoComment" rows="3" readonly>${data.requirements.peso_comment || ''}</textarea>
                    </div>
                </div>
            </div>
            `;
            const modalContent = document.getElementById('modalContent');
            modalContent.innerHTML = dtrHtml + html + requirementsHtml;

            // Update progress bar after rendering
            let totalWorkedHours = 0;
            if (dtrData.length > 0) {
                dtrData.forEach(row => {
                    let hours = parseFloat(row.daily_total) || 0;
                    totalWorkedHours += hours;
                });
            } else {
                // If no DTR rows, use the total_worked_hours from the parent record
                // You need to pass this value from the parent row (e.g., when opening the modal)
                totalWorkedHours = parseFloat(row.total_worked_hours) || 0;
            }
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
        }).catch(error => console.error('Error:', error));
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
                            <button class="btn btn-sm view-image-btn bg-warning" data-dtr-id="${row.dtr_id}" style="background-color: #20c997;">View Image</button>
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

            // Replace only the DTR card in the modal
            const dtrCard = document.querySelector('#modalContent .card.mb-4.shadow.border');
            if (dtrCard) {
                dtrCard.outerHTML = dtrHtml;
            }
        });
}

function fetchFinalSummary() {
    fetch('/final_spes_list_summary')
        .then(res => res.json())
        .then(data => {
            document.getElementById('totalFinal').textContent = data.total_final;
        });
}

function fetchFinalSummaryWorking() {
    fetch('/final_spes_list_summary_working')
        .then(res => res.json())
        .then(data => {
            document.getElementById('totalFinalWorking').textContent = data.total_final_working;
        });
}

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

document.getElementById('downloadFinalSpesListCsvBtn').addEventListener('click', function() {
    window.location.href = '/download_final_spes_list_csv';
});

document.getElementById('downloadFinalSpesListXlsxBtn').addEventListener('click', function() {
    new bootstrap.Modal(document.getElementById('downloadFinalSpesListXlsxModal')).show();
});

// Enable confirm button only if an option is selected
document.querySelectorAll('input[name="spesDownloadCategory"]').forEach(el => {
    el.addEventListener('change', function() {
        document.getElementById('confirmDownloadFinalSpesListXlsxBtn').disabled = false;
    });
});

// Handle download on confirm
document.getElementById('confirmDownloadFinalSpesListXlsxBtn').addEventListener('click', function() {
    const selected = document.querySelector('input[name="spesDownloadCategory"]:checked');
    if (!selected) return;
    let url = '/download_final_spes_list_xlsx?category=' + selected.value;
    window.location.href = url;
    bootstrap.Modal.getInstance(document.getElementById('downloadFinalSpesListXlsxModal')).hide();
});

document.getElementById('downloadGSISXlsxBtn').addEventListener('click', function() {
    // You can reuse the same modal as Final SPES List, just change the confirm handler
    new bootstrap.Modal(document.getElementById('downloadFinalSpesListXlsxModal')).show();

    // Change confirm button handler for GSIS
    const confirmBtn = document.getElementById('confirmDownloadFinalSpesListXlsxBtn');
    // Remove previous click handlers
    const newBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);

    newBtn.addEventListener('click', function() {
        const selected = document.querySelector('input[name="spesDownloadCategory"]:checked');
        if (!selected) return;
        let url = '/download_gsis_report_xlsx?category=' + selected.value;
        window.location.href = url;
        bootstrap.Modal.getInstance(document.getElementById('downloadFinalSpesListXlsxModal')).hide();
    });
});

document.addEventListener('DOMContentLoaded', fetchFinalSummary(), fetchFinalSummaryWorking(), fetchActionLogs());

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
            refreshDtrModalTable(currentStudentId);
        } else {
            alert('Failed to update DTR.');
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

document.getElementById('moveFinalSpesListToArchiveBtn').addEventListener('click', function() {
    new bootstrap.Modal(document.getElementById('moveFinalArchiveModal')).show();
});

function showFinalActionToast(message, isSuccess) {
    const toastEl = document.getElementById('finalActionToast');
    const toastBody = document.getElementById('finalActionToastBody');
    toastBody.textContent = message;
    toastEl.classList.remove('text-bg-success', 'text-bg-danger', 'show');
    toastEl.classList.add(isSuccess ? 'text-bg-success' : 'text-bg-danger');
    const bsToast = new bootstrap.Toast(toastEl, { delay: 4000 });
    bsToast.show();
}

document.getElementById('confirmMoveFinalArchiveBtn').addEventListener('click', function() {
    fetch('/move_final_spes_list_to_archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showFinalActionToast(`Successfully moved ${data.archived_count} students to archive.`, true);
            setTimeout(() => location.reload(), 4000); // Wait 4 seconds before reload
        } else {
            showFinalActionToast('Error: ' + data.error, false);
        }
        bootstrap.Modal.getInstance(document.getElementById('moveFinalArchiveModal')).hide();
    });
});

function formatBirthDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date)) return dateStr;
    const options = { month: 'long', day: '2-digit', year: 'numeric' };
    // e.g. "October 01, 2002"
    return date.toLocaleDateString('en-US', options);
}