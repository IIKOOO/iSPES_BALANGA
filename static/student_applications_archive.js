function fetchAndDisplayArchive() {
    const selectedCategory = document.getElementById('category_filter').value;
    const searchQuery = document.getElementById('search_input').value;
    const sortOption = document.getElementById('sort_option').value;

    fetch('/retrieve_archived_applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
            document.getElementById('totalRegistrations').textContent = data.length;
        }
    })
    .catch(error => console.error('Error:', error));
}

document.addEventListener('DOMContentLoaded', fetchAndDisplayArchive);

document.getElementById('category_filter').addEventListener('change', fetchAndDisplayArchive);
document.getElementById('sort_option').addEventListener('change', fetchAndDisplayArchive);
document.getElementById('search_input').addEventListener('input', fetchAndDisplayArchive);

function renderRow(label, value) {
    if (value === undefined || value === null || value === '') return '';
    return `
        <div class="row mb-3">
            <div class="col-md-4"><strong>${label}:</strong></div>
            <div class="col-md-8">${value}</div>
        </div>  
    `;
}

document.addEventListener('click', function (e) {
    if (e.target && e.target.classList.contains('view-data-btn')) {
        const studentId = e.target.getAttribute('data-id');
        fetch(`/get_archived_student_details/${studentId}`)
            .then(res => res.json())
            .then(data => {
                console.log(data);
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
                            ${renderRow('Guardian Birth Date', formatBirthDate(data.guardian_birth_date))}
                            ${renderRow('Guardian Occupation', data.guardian_occupation)}
                            ${renderRow('Relationship with Guardian', data.relationship_with_guardian)}
                            ${renderRow('Guardian TIN No', data.guardian_tin_no)}
                            <div class="row mb-3">
                                <div class="col-md-4"><strong>Father Full Name:</strong></div>
                                <div class="col-md-8">${data.father_full_name}</div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-4"><strong>Father Contact No:</strong></div>
                                <div class="col-md-8">${data.father_contact_no}</div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-4"><strong>Father Birth Date:</strong></div>
                                <div class="col-md-8">${formatBirthDate(data.father_birth_date)}</div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-4"><strong>Father Occupation:</strong></div>
                                <div class="col-md-8">${data.father_occupation}</div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-4"><strong>Father TIN No:</strong></div>
                                <div class="col-md-8">${data.father_tin_no}</div>
                            </div>
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
                            let fileUrl = `/get_archived_requirement_file/${data.student_id}/${f.key}`;
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
                modalContent.innerHTML = html + requirementsHtml;
            });
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