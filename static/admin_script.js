// Function to fetch and display peso accounts
function fetchAndDisplayPesoAccounts() {
    const status = document.getElementById('pesoFilterStatus').value;
    const search = document.getElementById('pesoSearchInput').value;

    fetch('/retrieve_peso_accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            status: status,
            search: search
        })
    })
    .then(res => res.json())
    .then(data => {
        const tbody = document.getElementById('pesoTableBody');
        tbody.innerHTML = '';
        data.forEach(row => {
            tbody.innerHTML += `
                <tr>
                    <td>${row.peso_id}</td>
                    <td>${row.last_name}</td>
                    <td>${row.first_name}</td>
                    <td>${row.birth_date}</td>
                    <td>${row.sex}</td>
                    <td>${row.role}</td>
                    <td>${row.username}</td>
                    <td>${row.email}</td>
                    <td>${row.mobile_no}</td>
                    <td>
                        <button class="btn btn-primary btn-update-peso" type="button"
                            style="--bs-btn-padding-y: .25rem; --bs-btn-padding-x: .5rem; --bs-btn-font-size: .75rem;"
                            data-bs-toggle="modal" data-bs-target="#updatePesoModal"
                            data-id="${row.peso_id}" data-last_name="${row.last_name}" data-first_name="${row.first_name}"
                            data-birth_date="${row.birth_date}" data-sex="${row.sex}" data-role="${row.role}"
                            data-username="${row.username}" data-email="${row.email}" data-mobile_no="${row.mobile_no}">
                            Update
                        </button>
                        <button class="btn ${row.is_active ? 'btn-success' : 'btn-danger'} btn-sm toggle-active-btn" data-id="${row.peso_id}" style="--bs-btn-padding-y: .25rem; --bs-btn-padding-x: .5rem; --bs-btn-font-size: .75rem;">
                            ${row.is_active ? 'Activated' : 'Deactivated'}
                        </button>
                    </td>
                </tr>
            `;
        });
        tbody.querySelectorAll('.btn-update-peso').forEach(function (btn) {
            btn.addEventListener('click', function () {
                document.getElementById('update_id').value = btn.getAttribute('data-id');
                document.getElementById('update_last_name').value = btn.getAttribute('data-last_name');
                document.getElementById('update_first_name').value = btn.getAttribute('data-first_name');
                document.getElementById('update_birth_date').value = btn.getAttribute('data-birth_date');
                document.getElementById('update_sex').value = btn.getAttribute('data-sex');
                document.getElementById('update_role').value = btn.getAttribute('data-role');
                document.getElementById('update_username').value = btn.getAttribute('data-username');
                document.getElementById('update_email').value = btn.getAttribute('data-email');
                document.getElementById('update_mobile_no').value = btn.getAttribute('data-mobile_no');
                document.getElementById('update_password').value = '';
            });
        });
        tbody.querySelectorAll('.toggle-active-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const pesoId = this.getAttribute('data-id');
                fetch(`/toggle_peso_active/${pesoId}`, { method: 'POST' })
                    .then(res => res.json())
                    .then(resp => {
                        if (resp.success) {
                            location.reload();
                        } else {
                            alert('Failed to update status.');
                        }
                    });
            });
        });
    });
}

function fetchPesoAccountSummary() {
    fetch('/peso_account_summary')
        .then(res => res.json())
        .then(data => {
            document.getElementById('pesoTotal').textContent = data.total;
            document.getElementById('pesoActive').textContent = data.active;
            document.getElementById('pesoInactive').textContent = data.inactive;
        });
}

document.addEventListener('DOMContentLoaded', () => {
    fetchAndDisplayPesoAccounts();
    fetchPesoAccountSummary();

    document.getElementById('pesoFilterStatus').addEventListener('change', fetchAndDisplayPesoAccounts);
    document.getElementById('pesoSearchInput').addEventListener('input', fetchAndDisplayPesoAccounts);
});

// Function to fetch and display student accounts
function fetchAndDisplayStudentAccounts() {
    const status = document.getElementById('studentFilterStatus').value;
    const search = document.getElementById('studentSearchInput').value;

    fetch('/retrieve_student_accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            status: status,
            search: search
        })
    })
    .then(res => res.json())
    .then(data => {
        const tbody = document.getElementById('studentTableBody');
        tbody.innerHTML = '';
        data.forEach(row => {
            tbody.innerHTML += `
                <tr>
                    <td>${row.student_id}</td>
                    <td>${row.last_name}</td>
                    <td>${row.first_name}</td>
                    <td>${row.birth_date}</td>
                    <td>${row.sex}</td>
                    <td>${row.student_category}</td>
                    <td>${row.username}</td>
                    <td>${row.email}</td>
                    <td>${row.mobile_no}</td>
                    <td>
                        <button class="btn btn-primary btn-sm update-student-password-btn" data-id="${row.student_id}">
                            Update
                        </button>
                        <button class="btn ${row.is_active ? 'btn-success' : 'btn-danger'} btn-sm toggle-student-active-btn" data-id="${row.student_id}" style="--bs-btn-padding-y: .25rem; --bs-btn-padding-x: .5rem; --bs-btn-font-size: .75rem;">
                            ${row.is_active ? 'Activated' : 'Deactivated'}
                        </button>
                    </td>
                </tr>
            `;
        });

        tbody.querySelectorAll('.update-student-password-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const studentId = btn.getAttribute('data-id');
                document.getElementById('updateStudentId').value = studentId;
                document.getElementById('adminAuthUsername').value = '';
                document.getElementById('adminAuthPassword').value = '';
                document.getElementById('adminAuthError').style.display = 'none';
                new bootstrap.Modal(document.getElementById('adminAuthModal')).show();
            });
        });

        tbody.querySelectorAll('.toggle-student-active-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const studentId = this.getAttribute('data-id');
                fetch(`/toggle_student_active/${studentId}`, { method: 'POST' })
                    .then(res => res.json())
                    .then(resp => {
                        if (resp.success) {
                            location.reload();
                        } else {
                            alert('Failed to update status.');
                        }
                    });
            });
        });
    });
}

function fetchStudentAccountSummary() {
    fetch('/student_account_summary')
        .then(res => res.json())
        .then(data => {
            document.getElementById('studentTotal').textContent = data.total;
            document.getElementById('studentActive').textContent = data.active;
            document.getElementById('studentInactive').textContent = data.inactive;
        });
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('studentTableBody')) {
        fetchAndDisplayStudentAccounts();
        fetchStudentAccountSummary();

        document.getElementById('studentFilterStatus').addEventListener('change', fetchAndDisplayStudentAccounts);
        document.getElementById('studentSearchInput').addEventListener('input', fetchAndDisplayStudentAccounts);
    }
});

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
    const restricted = JSON.parse(localStorage.getItem('restrictedCategories') || '[]');
    const select = document.getElementById('student_category');
    if (select && restricted.length > 0) {
        Array.from(select.options).forEach(option => {
            if (restricted.includes(option.value)) {
                option.style.display = 'none';
            } else {
                option.style.display = '';
            }
        });
    }
});

// Control Student Category Options
function updateCategoryButtons(status) {
    const btns = [
        {
            id: 'toggleSeniorHigh',
            enabled: status.senior_high_enabled,
            field: 'senior_high_enabled'
        },
        {
            id: 'toggleApplyingIskolar',
            enabled: status.applying_iskolar_enabled,
            field: 'applying_iskolar_enabled'
        },
        {
            id: 'toggleIskolar',
            enabled: status.iskolar_enabled,
            field: 'iskolar_enabled'
        }
    ];

    btns.forEach(btn => {
        const el = document.getElementById(btn.id);
        if (!el) return;
        el.textContent = btn.enabled ? 'Enabled' : 'Disabled';
        el.className = 'btn ' + (btn.enabled ? 'btn-success' : 'btn-danger');
        el.disabled = false;
        el.onclick = function() {
            el.disabled = true;
            fetch('/toggle_registration_restrictions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ field: btn.field })
            })
            .then(res => res.json())
            .then(data => {
                updateCategoryButtons(data);
            })
            .catch(() => { el.disabled = false; });
        };
    });
}

function fetchCategoryRestriction() {
    fetch('/get_registration_restrictions')
        .then(res => res.json())
        .then(data => updateCategoryButtons(data));
}

document.addEventListener('DOMContentLoaded', function() {
    fetchCategoryRestriction();
});

// Disable/Enable Registration Button
function updateRegisterButton(status) {
    const btn = document.getElementById('toggleRegistrationBtn');
    if (!btn) return;
    btn.textContent = status.register_enabled ? 'Registration Enabled' : 'Registration Disabled';
    btn.className = 'btn px-4 ' + (status.register_enabled ? 'btn-success text-dark' : 'btn-danger text-dark');
}

function fetchRegisterStatus() {
    fetch('/get_registration_status')
        .then(res => res.json())
        .then(data => updateRegisterButton(data));
}

document.addEventListener('DOMContentLoaded', function() {
    fetchRegisterStatus();
    const btn = document.getElementById('toggleRegistrationBtn');
    if (btn) {
        btn.addEventListener('click', function() {
            btn.disabled = true;
            fetch('/toggle_register_enabled', { method: 'POST' })
                .then(res => res.json())
                .then(data => {
                    updateRegisterButton(data);
                    btn.disabled = false;
                })
                .catch(() => { btn.disabled = false; });
        });
    }
});

// Fetch and display action logs
function fetchActionLogs() {
    const studentId = document.getElementById('logFilterStudentId')?.value || '';
    const action = document.getElementById('logFilterAction')?.value || '';
    const performedBy = document.getElementById('logFilterPerformedBy')?.value || '';

    const params = new URLSearchParams();
    if (studentId) params.append('student_id', studentId);
    if (action) params.append('action', action);
    if (performedBy) params.append('performed_by', performedBy);

    fetch('/peso_action_logs_summary_admin?' + params.toString())
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

// Add event listeners for filter inputs
document.addEventListener('DOMContentLoaded', function() {
    ['logFilterStudentId', 'logFilterAction', 'logFilterPerformedBy'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', fetchActionLogs);
        }
    });
    fetchActionLogs();
});

document.addEventListener('DOMContentLoaded', fetchActionLogs());

// Load summary carousel
function loadSummaryCarousel() {
    Promise.all([
        fetch('/registration_summary').then(res => res.json()),
        fetch('/pending_summary').then(res => res.json()),
        fetch('/final_spes_list_summary').then(res => res.json()),
        fetch('/dtr_summary').then(res => res.json()),
        fetch('/payroll_summary').then(res => res.json())
    ]).then(([registration, pending, finalList, dtr, payroll]) => {
        const items = [
            {
                title: "Registration Summary",
                html: `
                    <h5 class="fw-bold">Total Registrations</h5>
                    <h3 class="text-primary fw-bold mb-3">${registration.total}</h3>
                    <div class="d-flex justify-content-between">
                        <span class="fw-bold text-success">With Requirements:</span>
                        <span class="fw-bold text-success">${registration.with_requirements}</span>
                    </div>
                    <div class="d-flex justify-content-between">
                        <span class="fw-bold text-danger">Without Requirements:</span>
                        <span class="fw-bold text-danger">${registration.without_requirements}</span>
                    </div>
                `
            },
            {
                title: "Pending Registration Summary",
                html: `
                    <h5 class="fw-bold">Total Pending Registrations</h5>
                    <h3 class="text-primary fw-bold mb-3">${pending.total_pending}</h3>
                `
            },
            {
                title: "Final SPES List Summary",
                html: `
                    <h5 class="fw-bold">Total of Students Working</h5>
                    <h3 class="text-primary fw-bold mb-3">${finalList.total_final}</h3>
                `
            },
            {
                title: "DTR Summary",
                html: `
                    <h5 class="fw-bold">Total Students</h5>
                    <h3 class="text-primary fw-bold mb-3">${dtr.total}</h3>
                    <h5 class="fw-bold text-center">Hours Summary</h5>
                    <div class="d-flex justify-content-between">
                        <span class="fw-bold text-success">160 Hours & Above:</span>
                        <span class="fw-bold text-success">${dtr.above_160}</span>
                    </div>
                    <div class="d-flex justify-content-between">
                        <span class="fw-bold text-danger">Below 160 Hours:</span>
                        <span class="fw-bold text-danger">${dtr.below_160}</span>
                    </div>
                    <div class="d-flex justify-content-between">
                        <span class="fw-bold text-warning">On Hold:</span>
                        <span class="fw-bold text-warning">${dtr.on_hold}</span>
                    </div>
                    <div class="d-flex justify-content-between">
                        <span class="fw-bold text-success">Active:</span>
                        <span class="fw-bold text-success">${dtr.active}</span>
                    </div>
                `
            },
            {
                title: "Payroll Summary",
                html: `
                    <h5 class="fw-bold">Total Students</h5>
                    <h3 class="text-primary fw-bold mb-3">${payroll.total}</h3>
                    <div class="d-flex justify-content-between">
                        <span class="fw-bold text-success">Paid:</span>
                        <span class="fw-bold text-success">${payroll.paid}</span>
                    </div>
                    <div class="d-flex justify-content-between">
                        <span class="fw-bold text-danger">Unpaid:</span>
                        <span class="fw-bold text-danger">${payroll.unpaid}</span>
                    </div>
                `
            }
        ];

        const carouselInner = document.getElementById('summaryCarouselInner');
        carouselInner.innerHTML = items.map((item, idx) => `
            <div class="carousel-item${idx === 0 ? ' active' : ''}">
                <div class="card border-1 border-dark shadow-lg bg-light">
                    <div class="card-header text-dark text-center" style="background-color: #98c1d9;">
                        <h5 class="mb-0">${item.title}</h5>
                    </div>
                    <div class="card-body text-center" h-100">
                        ${item.html}
                    </div>
                </div>
            </div>
        `).join('');
    });
}

document.addEventListener('DOMContentLoaded', loadSummaryCarousel);

document.addEventListener('DOMContentLoaded', function() {
    const dtrCutoffBtn = document.getElementById('DtrCutOffBtn');
    if (dtrCutoffBtn) {
        dtrCutoffBtn.addEventListener('click', function() {
            new bootstrap.Modal(document.getElementById('dtrCutoffConfirmModal')).show();
        });
    }
    const proceedBtn = document.getElementById('proceedDtrCutoffBtn');
    if (proceedBtn) {
        proceedBtn.addEventListener('click', function() {
            bootstrap.Modal.getInstance(document.getElementById('dtrCutoffConfirmModal')).hide();
            new bootstrap.Modal(document.getElementById('dtrCutoffLoginModal')).show();
        });
    }
    const loginForm = document.getElementById('dtrCutoffLoginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const username = document.getElementById('adminUsername').value;
            const password = document.getElementById('adminPassword').value;
            fetch('/admin_dtr_cutoff', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    bootstrap.Modal.getInstance(document.getElementById('dtrCutoffLoginModal')).hide();
                    location.reload();
                } else {
                    const err = document.getElementById('dtrCutoffLoginError');
                    err.textContent = data.error || 'Authentication failed.';
                    err.style.display = 'block';
                }
            });
        });
    }
});

function fetchAndDisplayAdminAccounts() {
    const status = document.getElementById('adminFilterStatus').value;
    const search = document.getElementById('adminSearchInput').value;

    fetch('/retrieve_admin_accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            status: status,
            search: search
        })
    })
    .then(res => res.json())
    .then(data => {
        const tbody = document.getElementById('adminTableBody');
        tbody.innerHTML = '';
        data.forEach(row => {
            tbody.innerHTML += `
                <tr>
                    <td>${row.admin_id}</td>
                    <td>${row.last_name}</td>
                    <td>${row.first_name}</td>
                    <td>${row.birth_date}</td>
                    <td>${row.sex}</td>
                    <td>${row.role}</td>
                    <td>${row.username}</td>
                    <td>${row.email}</td>
                    <td>${row.mobile_no}</td>
                    <td>
                        <button class="btn btn-primary btn-update-admin" type="button"
                            style="--bs-btn-padding-y: .25rem; --bs-btn-padding-x: .5rem; --bs-btn-font-size: .75rem;"
                            data-bs-toggle="modal" data-bs-target="#updateAdminModal"
                            data-id="${row.admin_id}" data-last_name="${row.last_name}" data-first_name="${row.first_name}"
                            data-birth_date="${row.birth_date}" data-sex="${row.sex}" data-role="${row.role}"
                            data-username="${row.username}" data-email="${row.email}" data-mobile_no="${row.mobile_no}">
                            Update
                        </button>
                        <button class="btn ${row.is_active ? 'btn-success' : 'btn-danger'} btn-sm toggle-admin-active-btn" data-id="${row.admin_id}"
                            style="--bs-btn-padding-y: .25rem; --bs-btn-padding-x: .5rem; --bs-btn-font-size: .75rem;">
                            ${row.is_active ? 'Activated' : 'Deactivated'}
                        </button>
                    </td>
                </tr>
            `;
        });
        tbody.querySelectorAll('.btn-update-admin').forEach(function (btn) {
            btn.addEventListener('click', function () {
                document.getElementById('update_admin_id').value = btn.getAttribute('data-id');
                document.getElementById('update_admin_last_name').value = btn.getAttribute('data-last_name');
                document.getElementById('update_admin_first_name').value = btn.getAttribute('data-first_name');
                document.getElementById('update_admin_birth_date').value = btn.getAttribute('data-birth_date');
                document.getElementById('update_admin_sex').value = btn.getAttribute('data-sex');
                document.getElementById('update_admin_role').value = btn.getAttribute('data-role');
                document.getElementById('update_admin_username').value = btn.getAttribute('data-username');
                document.getElementById('update_admin_email').value = btn.getAttribute('data-email');
                document.getElementById('update_admin_mobile_no').value = btn.getAttribute('data-mobile_no');
                document.getElementById('update_admin_password').value = '';
            });
        });
        tbody.querySelectorAll('.toggle-admin-active-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const adminId = this.getAttribute('data-id');
                fetch(`/toggle_admin_active/${adminId}`, { method: 'POST' })
                    .then(res => res.json())
                    .then(resp => {
                        if (resp.success) {
                            location.reload();
                        } else {
                            alert('Failed to update status.');
                        }
                    });
            });
        });
    });
}

function fetchAdminAccountSummary() {
    fetch('/admin_account_summary')
        .then(res => res.json())
        .then(data => {
            document.getElementById('adminTotal').textContent = data.total;
            document.getElementById('adminActive').textContent = data.active;
            document.getElementById('adminInactive').textContent = data.inactive;
        });
}

document.addEventListener('DOMContentLoaded', () => {
    fetchAndDisplayAdminAccounts();
    fetchAdminAccountSummary();
    document.getElementById('adminFilterStatus').addEventListener('change', fetchAndDisplayAdminAccounts);
    document.getElementById('adminSearchInput').addEventListener('input', fetchAndDisplayAdminAccounts);
});

function setBirthdayConstraints() {
    const today = new Date();
    const minAdultYear = today.getFullYear() - 100;
    const maxAdultYear = today.getFullYear() - 15;
    ['birth_date', 'update_birth_date', 'update_admin_birth_date'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.min = `${minAdultYear}-01-01`;
            input.max = `${maxAdultYear}-${String(today.getMonth()+1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    setBirthdayConstraints();
    // ...other code...
});

// Also, call it when modals are shown (optional, for dynamic forms)
document.getElementById('addSvAccModal')?.addEventListener('shown.bs.modal', setBirthdayConstraints);
document.getElementById('updatePesoModal')?.addEventListener('shown.bs.modal', setBirthdayConstraints);
document.getElementById('updateAdminModal')?.addEventListener('shown.bs.modal', setBirthdayConstraints);


document.addEventListener('DOMContentLoaded', () => {
    const numberFields = [
        document.getElementById('mobile_no'),
        document.getElementById('update_admin_mobile_no'),
    ];

    numberFields.forEach(field => {
        field.addEventListener('input', () => {
            field.value = field.value.replace(/\D/g, '');

            if (field.value.length > 11) {
                field.value = field.value.slice(0, 12);
            }
        });
    });
});

document.getElementById('updatePesoModal')?.addEventListener('shown.bs.modal', function() {
    const updateMobileNo = document.getElementById('update_mobile_no');
    if (updateMobileNo) {
        updateMobileNo.addEventListener('input', function() {
            this.value = this.value.replace(/\D/g, '');
            if (this.value.length > 11) {
                this.value = this.value.slice(0, 12);
            }
        });
    }
});

document.addEventListener('DOMContentLoaded', function() {
    // Peso Add
    const pwInput = document.getElementById('password');
    const pwToggle = document.getElementById('togglePesoPassword');
    if (pwInput && pwToggle) {
        pwToggle.addEventListener('click', function() {
            pwInput.type = pwInput.type === 'password' ? 'text' : 'password';
            pwToggle.innerHTML = pwInput.type === 'password' ? '<i class="bi bi-eye"></i>' : '<i class="bi bi-eye-slash"></i>';
        });
    }
    // Admin Add
    const adminPwInput = document.getElementById('admin_password');
    const adminPwToggle = document.getElementById('toggleAdminPassword');
    if (adminPwInput && adminPwToggle) {
        adminPwToggle.addEventListener('click', function() {
            adminPwInput.type = adminPwInput.type === 'password' ? 'text' : 'password';
            adminPwToggle.innerHTML = adminPwInput.type === 'password' ? '<i class="bi bi-eye"></i>' : '<i class="bi bi-eye-slash"></i>';
        });
    }
    // Peso Update
    const updatePwInput = document.getElementById('update_password');
    const updatePwToggle = document.getElementById('toggleUpdatePesoPassword');
    if (updatePwInput && updatePwToggle) {
        updatePwToggle.addEventListener('click', function() {
            updatePwInput.type = updatePwInput.type === 'password' ? 'text' : 'password';
            updatePwToggle.innerHTML = updatePwInput.type === 'password' ? '<i class="bi bi-eye"></i>' : '<i class="bi bi-eye-slash"></i>';
        });
    }
    // Admin Update
    const updateAdminPwInput = document.getElementById('update_admin_password');
    const updateAdminPwToggle = document.getElementById('toggleUpdateAdminPassword');
    if (updateAdminPwInput && updateAdminPwToggle) {
        updateAdminPwToggle.addEventListener('click', function() {
            updateAdminPwInput.type = updateAdminPwInput.type === 'password' ? 'text' : 'password';
            updateAdminPwToggle.innerHTML = updateAdminPwInput.type === 'password' ? '<i class="bi bi-eye"></i>' : '<i class="bi bi-eye-slash"></i>';
        });
    }
});


async function checkUsernameExists(endpoint, username) {
    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username.trim() })
        });
        const data = await res.json();
        return data.exists;
    } catch (err) {
        return false;
    }
}

// Add Peso Account: Username existence check
const addPesoForm = document.getElementById('addPesoForm');
if (addPesoForm) {
    addPesoForm.addEventListener('submit', function(e) {
        e.preventDefault(); // Always block submission first!
        (async function() {
            let valid = true;

            // Username validation
            const usernameInput = document.getElementById('username');
            const usernameErrorId = 'addPesoUsernameError';
            let usernameError = document.getElementById(usernameErrorId);
            if (!usernameError) {
                usernameError = document.createElement('div');
                usernameError.id = usernameErrorId;
                usernameError.className = 'text-danger mt-1';
                usernameInput.parentNode.appendChild(usernameError);
            }
            const usernameValue = usernameInput.value.trim();
            if (usernameValue.length < 4) {
                usernameError.textContent = 'Username must be at least 4 characters long.';
                valid = false;
            } else {
                // Check existence
                const exists = await checkUsernameExists('/check_peso_username', usernameValue);
                if (exists) {
                    usernameError.textContent = 'This username is already taken.';
                    valid = false;
                } else {
                    usernameError.textContent = '';
                }
            }

            // Password validation (allow empty for auto-generation)
            const passwordInput = document.getElementById('password');
            const passwordErrorId = 'addPesoPasswordError';
            let passwordError = document.getElementById(passwordErrorId);
            if (!passwordError) {
                passwordError = document.createElement('div');
                passwordError.id = passwordErrorId;
                passwordError.className = 'text-danger mt-1';
                passwordInput.parentNode.appendChild(passwordError);
            }
            if (passwordInput.value.length > 0 && passwordInput.value.length < 5) {
                passwordError.textContent = 'Password must be at least 5 characters long.';
                valid = false;
            } else {
                passwordError.textContent = '';
            }

            // Add other validation checks here if needed

            if (valid) addPesoForm.submit(); // Only submit if all checks pass
        })();
    });

    // Clear errors on input
    document.getElementById('username')?.addEventListener('input', function() {
        const err = document.getElementById('addPesoUsernameError');
        if (err) err.textContent = '';
    });
    document.getElementById('password')?.addEventListener('input', function() {
        const err = document.getElementById('addPesoPasswordError');
        if (err) err.textContent = '';
    });
}

// --- Combined validation for Add Admin Account ---
const addAdminForm = document.getElementById('addAdminForm');
if (addAdminForm) {
    addAdminForm.addEventListener('submit', function(e) {
        e.preventDefault(); // Always block submission first!
        (async function() {
            let valid = true;

            // Username validation
            const usernameInput = document.getElementById('admin_username');
            const usernameErrorId = 'addAdminUsernameError';
            let usernameError = document.getElementById(usernameErrorId);
            if (!usernameError) {
                usernameError = document.createElement('div');
                usernameError.id = usernameErrorId;
                usernameError.className = 'text-danger mt-1';
                usernameInput.parentNode.appendChild(usernameError);
            }
            const usernameValue = usernameInput.value.trim();
            if (usernameValue.length < 4) {
                usernameError.textContent = 'Username must be at least 4 characters long.';
                valid = false;
            } else {
                // Check existence
                const exists = await checkUsernameExists('/check_admin_username', usernameValue);
                if (exists) {
                    usernameError.textContent = 'This username is already taken.';
                    valid = false;
                } else {
                    usernameError.textContent = '';
                }
            }

            // Password validation (allow empty for auto-generation)
            const passwordInput = document.getElementById('admin_password');
            const passwordErrorId = 'addAdminPasswordError';
            let passwordError = document.getElementById(passwordErrorId);
            if (!passwordError) {
                passwordError = document.createElement('div');
                passwordError.id = passwordErrorId;
                passwordError.className = 'text-danger mt-1';
                passwordInput.parentNode.appendChild(passwordError);
            }
            if (passwordInput.value.length > 0 && passwordInput.value.length < 5) {
                passwordError.textContent = 'Password must be at least 5 characters long.';
                valid = false;
            } else {
                passwordError.textContent = '';
            }

            // Add other validation checks here if needed

            if (valid) addAdminForm.submit(); // Only submit if all checks pass
        })();
    });

    // Clear errors on input
    document.getElementById('admin_username')?.addEventListener('input', function() {
        const err = document.getElementById('addAdminUsernameError');
        if (err) err.textContent = '';
    });
    document.getElementById('admin_password')?.addEventListener('input', function() {
        const err = document.getElementById('addAdminPasswordError');
        if (err) err.textContent = '';
    });
}

document.addEventListener('DOMContentLoaded', function() {
    // Handle Update Password button click
    document.querySelectorAll('.update-student-password-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const studentId = btn.getAttribute('data-id');
            document.getElementById('updateStudentId').value = studentId;
            // Show admin authentication modal
            new bootstrap.Modal(document.getElementById('adminAuthModal')).show();
        });
    });

    // Handle admin authentication
    document.getElementById('adminAuthForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('adminAuthUsername').value;
        const password = document.getElementById('adminAuthPassword').value;
        fetch('/admin_authenticate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                bootstrap.Modal.getInstance(document.getElementById('adminAuthModal')).hide();
                new bootstrap.Modal(document.getElementById('studentPasswordUpdateModal')).show();
            } else {
                const err = document.getElementById('adminAuthError');
                err.textContent = data.error || 'Authentication failed.';
                err.style.display = 'block';
            }
        });
    });

    // Handle student password update
    document.getElementById('studentPasswordUpdateForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const studentId = document.getElementById('updateStudentId').value;
        const newPassword = document.getElementById('newStudentPassword').value;
        fetch('/update_student_password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ student_id: studentId, new_password: newPassword })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                bootstrap.Modal.getInstance(document.getElementById('studentPasswordUpdateModal')).hide();
                location.reload();
            } else {
                const err = document.getElementById('studentPasswordUpdateError');
                err.textContent = data.error || 'Failed to update password.';
                err.style.display = 'block';
            }
        });
    });
});
