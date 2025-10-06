function fetchAndDisplayRegistrations() {
    const selectedCategory = document.getElementById('category_filter').value;
    const searchQuery = document.getElementById('search_input').value;
    const sortOption = document.getElementById('sort_option').value;

    // Use the new endpoint and status for pending
    fetch('/retrieve_applications', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            status: 'pending', // Only show applications with is_pending = true AND is_approved = false
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
                if (row.has_sibling) tr.classList.add('table-warning');
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

document.getElementById('category_filter').addEventListener('change', fetchAndDisplayRegistrations);
document.getElementById('sort_option').addEventListener('change', fetchAndDisplayRegistrations);
document.getElementById('search_input').addEventListener('input', fetchAndDisplayRegistrations);

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

        document.getElementById('rejectStudent-fromPending').setAttribute('data-id', studentId);
        document.getElementById('moveToFinalList-fromPending').setAttribute('data-id', studentId);

        // Use new endpoint, no table param needed
        fetch(`/get_student_details/${studentId}`)
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    alert(data.error);
                } else {
                    const modalContent = document.getElementById('modalContent');
                    let html = `
                    <div class="card mb-4 shadow">
                        <div class="card-header text-white" style="background-color: #003366;">
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
                    const req = data.requirements;
                    const reqFiles = [
                        { label: "Birth Certificate", key: "birth_certificate" },
                        { label: "Parents Valid ID", key: "parents_valid_id" },
                        { label: "CTC ROG", key: "ctc_rog" },
                        { label: "Parents ITR", key: "parents_itr" },
                        { label: "Passport Picture", key: "passport_pic" },
                        { label: "Additional Files", key: "additional_files" }
                    ];
                    let summaryHtml = `
                        <div class="mb-2">
                            <div class="d-flex flex-wrap gap-2 justify-content-center">
                                ${reqFiles.map(f => {
                                    let isGoodKey = f.key + '_isgood';
                                    let isGood = req && req[isGoodKey] === true;
                                    return `
                                        <span id="summary_badge_${f.key}" class="badge rounded-pill px-2 py-1 ${isGood ? 'bg-success' : 'bg-danger'}" style="font-size:0.85rem;min-width:120px;">
                                            ${f.label}: <span class="fw-bold">${isGood ? 'Good' : 'Needs Reupload'}</span>
                                        </span>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    `;
                    let requirementsHtml = `
                    <div class="card mb-4">
                        <div class="card-header text-white" style="background-color: #003366;">
                            <h5 class="mb-0 fw-bold">Requirements</h5>
                        </div>
                        <div class="card-body">
                            ${summaryHtml}
                            <div id="requirementsCarousel" class="carousel slide" data-bs-ride="carousel">
                                <div class="carousel-inner">
                    `;
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
                            let fileUrl = `/get_requirement_file/student_application/${studentId}/${f.key}`;
                            let isGoodKey = f.key + '_isgood';
                            let isGood = data.requirements[isGoodKey] === true;
                            requirementsHtml += `
                                <div class="carousel-item${first ? ' active' : ''}">
                                    <div class="d-flex flex-column align-items-center justify-content-center position-relative" style="min-height:400px;">
                                        <div class="position-absolute top-0 end-0 m-3" style="z-index: 20;">
                                            <div class="form-check form-switch">
                                                <input class="form-check-input requirement-isgood-radio" type="checkbox"
                                                    id="isgood_${f.key}" data-key="${f.key}" ${isGood ? 'checked' : ''}>
                                                <label class="form-check-label" for="isgood_${f.key}">${isGood ? 'Good' : 'Needs Reupload'}</label>
                                            </div>
                                        </div>
                                        <div class="mb-2">${extIcon(ext)}</div>
                                        <h6 class="card-title text-center mb-3">${f.label}</h6>
                                        ${
                                            ext === 'pdf'
                                            ? `<iframe src="${fileUrl}" width="70%" height="700px" class="rounded border"></iframe>`
                                            : `<img src="${fileUrl}" alt="${f.label}" class="img-fluid rounded border mb-2" style="max-height:300px;object-fit:contain;">`
                                        }
                                        ${
                                            f.key === 'passport_pic'
                                            ? `<a href="${fileUrl}" download class="btn btn-outline-primary btn-sm mt-2 w-25">
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
                                <textarea class="form-control" id="pesoComment" rows="3">${data.requirements.peso_comment || ''}</textarea>
                                <button id="savePesoCommentBtn" type="button" class="btn btn-success mt-2">Send Comment</button>
                            </div>
                        </div>
                    </div>
                    `;
                    modalContent.innerHTML = html + requirementsHtml;
                }
            })
            
            .catch(error => console.error('Error:', error));
    }

    if (e.target && e.target.id === 'savePesoCommentBtn') {
        const comment = document.getElementById('pesoComment').value;
        fetch(`/update_peso_comment/${currentStudentId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ comment })
        })
        .then(res => res.json())
        .then(resp => {
            if (resp.success) {
                showPendingActionToast('Comment saved!', true);
            } else {
                showPendingActionToast('Failed to save comment.', false);
            }
        })
        .catch(() => showPendingActionToast('Error saving comment.', false));
    }
});

let pendingActionType = null;
let pendingTargetStudentId = null;

document.addEventListener('click', function (e) {
    // Reject from Pending
    if (e.target && e.target.id === 'rejectStudent-fromPending') {
        pendingActionType = 'reject';
        pendingTargetStudentId = e.target.getAttribute('data-id');
        document.getElementById('pendingConfirmModalLabel').textContent = 'Confirm Rejection';
        document.getElementById('pendingConfirmModalBody').textContent = 'Are you sure you want to reject (delete) this student?';
        setPendingConfirmBtn('btn-danger');
        new bootstrap.Modal(document.getElementById('pendingConfirmModal')).show();
    }
    // Move to Final List from Pending
    if (e.target && e.target.id === 'moveToFinalList-fromPending') {
        pendingActionType = 'final';
        pendingTargetStudentId = e.target.getAttribute('data-id');
        document.getElementById('pendingConfirmModalLabel').textContent = 'Confirm Approval';
        document.getElementById('pendingConfirmModalBody').textContent = 'Approve and move this student to Final SPES List?';
        setPendingConfirmBtn('btn-success');
        new bootstrap.Modal(document.getElementById('pendingConfirmModal')).show();
    }
    // Delete All Pending
    if (e.target && e.target.id === 'deleteAllPendingBtn') {
        pendingActionType = 'delete_all_pending';
        pendingTargetStudentId = null;
        document.getElementById('pendingConfirmModalLabel').textContent = 'Confirm Deletion';
        document.getElementById('pendingConfirmModalBody').textContent = 'Are you sure you want to delete ALL pending registrations? This action cannot be undone.';
        setPendingConfirmBtn('btn-danger');
        new bootstrap.Modal(document.getElementById('pendingConfirmModal')).show();
    }
});

function setPendingConfirmBtn(btnClass) {
    const btn = document.getElementById('confirmPendingBtn');
    btn.textContent = 'Yes';
    btn.className = 'btn ' + btnClass;
}

document.getElementById('confirmPendingBtn').addEventListener('click', function() {
    let url = '';
    let successMsg = '';
    if (pendingActionType === 'reject') {
        url = `/reject_student/${pendingTargetStudentId}`;
        successMsg = 'Student rejected and deleted from pending.';
    } else if (pendingActionType === 'final') {
        url = `/move_to_final_list_from_pending/${pendingTargetStudentId}`;
        successMsg = 'Student moved to Final SPES List successfully!';
    } else if (pendingActionType === 'delete_all_pending') {
        url = `/delete_all_pending`;
        successMsg = 'All pending registrations deleted.';
    }
    fetch(url, { method: 'POST' })
        .then(res => res.json())
        .then(resp => {
            if (resp.success) {
                showPendingActionToast(successMsg, true);
                fetchAndDisplayRegistrations();
                fetchPendingSummary();
                fetchActionLogs();
                const viewDataModal = document.getElementById('viewDataModal');
                if (viewDataModal) {
                    const modalInstance = bootstrap.Modal.getInstance(viewDataModal);
                    if (modalInstance) modalInstance.hide();
                }
            } else {
                showPendingActionToast('Failed to process action.', false);
            }
            const pendingConfirmModal = document.getElementById('pendingConfirmModal');
            if (pendingConfirmModal) {
                const modalInstance = bootstrap.Modal.getInstance(pendingConfirmModal);
                if (modalInstance) modalInstance.hide();
            }
        });
});

// Toast function for pending actions
function showPendingActionToast(message, isSuccess) {
    const toastEl = document.getElementById('pendingActionToast');
    const toastBody = document.getElementById('pendingActionToastBody');
    toastBody.textContent = message;
    toastEl.classList.remove('text-bg-success', 'text-bg-danger');
    toastEl.classList.add(isSuccess ? 'text-bg-success' : 'text-bg-danger');
    new bootstrap.Toast(toastEl).show();
}

function fetchPendingSummary() {
    fetch('/pending_summary')
        .then(res => res.json())
        .then(data => {
            document.getElementById('totalPending').textContent = data.total_pending;
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

document.getElementById('downloadPedningCsvBtn').addEventListener('click', function() {
    window.location.href = '/download_pending_student_registration_csv';
});

// document.getElementById('downloadPedningXlsxBtn').addEventListener('click', function() {
//     window.location.href = '/download_pending_student_registration_xlsx';
// });

document.addEventListener('DOMContentLoaded', () => {
    fetchAndDisplayRegistrations();
    fetchPendingSummary();
    fetchActionLogs();
});

document.addEventListener('change', function(e) {
    if (e.target && e.target.classList.contains('requirement-isgood-radio')) {
        const key = e.target.getAttribute('data-key');
        const isGood = e.target.checked;
        fetch(`/update_requirement_isgood/student_application/${currentStudentId}/${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isgood: isGood })
        })
        .then(res => res.json())
        .then(resp => {
            if (resp.success) {
                showPendingActionToast('Requirement status updated!', true);
                e.target.nextElementSibling.textContent = isGood ? 'Good' : 'Needs Reupload';
                // Update summary badge in real time
                const badge = document.getElementById(`summary_badge_${key}`);
                if (badge) {
                    badge.classList.remove('bg-success', 'bg-danger');
                    badge.classList.add(isGood ? 'bg-success' : 'bg-danger');
                    badge.querySelector('.fw-bold').textContent = isGood ? 'Good' : 'Needs Reupload';
                }
            } else {
                showPendingActionToast('Failed to update status.', false);
            }
        })
        .catch(() => showPendingActionToast('Error updating status.', false));
    }
});

function formatBirthDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date)) return dateStr;
    const options = { month: 'long', day: '2-digit', year: 'numeric' };
    // e.g. "October 01, 2002"
    return date.toLocaleDateString('en-US', options);
}