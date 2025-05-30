// Wait for Firebase and shared module to be ready
function waitForFirebase() {
    return new Promise((resolve, reject) => {
        const checkFirebase = () => {
            if (typeof firebase !== 'undefined' && window.firebaseShared && window.firebaseShared.isInitialized) {
                console.log('Firebase and shared module are ready in employee-directory.js');
                resolve({
                    auth: window.firebaseShared.getAuth(),
                    database: window.firebaseShared.getDatabase()
                });
            } else {
                console.log('Waiting for Firebase initialization in employee-directory.js...');
                setTimeout(checkFirebase, 100);
            }
        };
        checkFirebase();
    });
}

// Initialize Firebase instances
let auth;
let database;

waitForFirebase().then(instances => {
    auth = instances.auth;
    database = instances.database;
    console.log('Firebase instances initialized in employee-directory.js');
}).catch(error => {
    console.error('Error initializing Firebase in employee-directory.js:', error);
});

// Make loadEmployeeDirectory function globally available
window.loadEmployeeDirectory = function loadEmployeeDirectory() {
    console.log('Loading employee directory...');
    const html = `
        <div class="row">
            <div class="col-md-12 mb-4">
                <div class="card">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h4 class="mb-0">Employee Directory</h4>
                        <div class="d-flex gap-2">
                            <input type="text" class="form-control" id="employeeSearch" placeholder="Search employees...">
                            <select class="form-select" id="departmentFilter">
                                <option value="">All Departments</option>
                            </select>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="row" id="employeeGrid">
                            <!-- Employee cards will be loaded here -->
                            <div class="col-12 text-center">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Loading...</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Employee Details Modal -->
        <div class="modal fade" id="employeeDetailsModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Employee Details</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body" id="employeeDetailsContent">
                        <!-- Employee details will be loaded here -->
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('dashboardContent').innerHTML = html;

    // Initialize search and filter functionality
    document.getElementById('employeeSearch').addEventListener('input', filterEmployees);
    document.getElementById('departmentFilter').addEventListener('change', filterEmployees);

    // Load employees
    loadEmployees();
    loadDepartments();
};

async function loadEmployees() {
    try {
        const user = auth.currentUser;
        if (!user) return;

        const usersRef = database.ref('users');
        const snapshot = await usersRef.once('value');
        const employees = [];

        snapshot.forEach(childSnapshot => {
            const employee = childSnapshot.val();
            employee.id = childSnapshot.key;
            employees.push(employee);
        });

        displayEmployees(employees);
    } catch (error) {
        console.error('Error loading employees:', error);
        showNotification({
            title: 'Error',
            text: 'Error loading employee directory',
            icon: 'error'
        });
    }
}

async function loadDepartments() {
    try {
        const departmentsRef = database.ref('departments');
        const snapshot = await departmentsRef.once('value');
        const departments = snapshot.val() || {};

        const departmentFilter = document.getElementById('departmentFilter');
        Object.keys(departments).forEach(deptId => {
            const option = document.createElement('option');
            option.value = deptId;
            option.textContent = departments[deptId].name;
            departmentFilter.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading departments:', error);
    }
}

function displayEmployees(employees) {
    const grid = document.getElementById('employeeGrid');
    grid.innerHTML = '';

    if (employees.length === 0) {
        grid.innerHTML = '<div class="col-12 text-center">No employees found</div>';
        return;
    }

    employees.forEach(employee => {
        const card = document.createElement('div');
        card.className = 'col-md-4 col-lg-3 mb-4';
        card.innerHTML = `
            <div class="card h-100">
                <div class="card-body text-center">
                    <div class="mb-3">
                        <div class="rounded-circle bg-primary text-white d-inline-flex align-items-center justify-content-center" 
                             style="width: 80px; height: 80px; font-size: 2rem;">
                            ${getInitials(employee.name)}
                        </div>
                    </div>
                    <h5 class="card-title mb-1">${employee.name}</h5>
                    <p class="text-muted small mb-2">${employee.position || 'Position not set'}</p>
                    <p class="text-muted small mb-3">${employee.department || 'Department not set'}</p>
                    <button class="btn btn-sm btn-primary view-employee" data-employee-id="${employee.id}">
                        View Details
                    </button>
                </div>
            </div>
        `;

        // Add click event for view details button
        const viewButton = card.querySelector('.view-employee');
        viewButton.addEventListener('click', () => viewEmployeeDetails(employee));

        grid.appendChild(card);
    });
}

function filterEmployees() {
    const searchTerm = document.getElementById('employeeSearch').value.toLowerCase();
    const departmentFilter = document.getElementById('departmentFilter').value;
    const employeeCards = document.querySelectorAll('#employeeGrid .col-md-4');

    employeeCards.forEach(card => {
        const name = card.querySelector('.card-title').textContent.toLowerCase();
        const department = card.querySelector('.text-muted').textContent.toLowerCase();
        const matchesSearch = name.includes(searchTerm);
        const matchesDepartment = !departmentFilter || department.includes(departmentFilter.toLowerCase());

        card.style.display = matchesSearch && matchesDepartment ? '' : 'none';
    });
}

function getInitials(name) {
    return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

async function viewEmployeeDetails(employee) {
    try {
        // Get additional employee details if needed
        const leaveBalanceRef = database.ref(`leave_balances/${employee.id}`);
        const leaveBalanceSnapshot = await leaveBalanceRef.once('value');
        const leaveBalance = leaveBalanceSnapshot.val() || {};

        const content = document.getElementById('employeeDetailsContent');
        content.innerHTML = `
            <div class="row">
                <div class="col-md-4 text-center mb-4">
                    <div class="rounded-circle bg-primary text-white d-inline-flex align-items-center justify-content-center mb-3" 
                         style="width: 120px; height: 120px; font-size: 3rem;">
                        ${getInitials(employee.name)}
                    </div>
                    <h4>${employee.name}</h4>
                    <p class="text-muted">${employee.position || 'Position not set'}</p>
                </div>
                <div class="col-md-8">
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <h6 class="text-muted">Department</h6>
                            <p>${employee.department || 'Not set'}</p>
                        </div>
                        <div class="col-md-6 mb-3">
                            <h6 class="text-muted">Email</h6>
                            <p>${employee.email || 'Not set'}</p>
                        </div>
                        <div class="col-md-6 mb-3">
                            <h6 class="text-muted">Phone</h6>
                            <p>${employee.phone || 'Not set'}</p>
                        </div>
                        <div class="col-md-6 mb-3">
                            <h6 class="text-muted">Join Date</h6>
                            <p>${employee.joinDate ? new Date(employee.joinDate).toLocaleDateString() : 'Not set'}</p>
                        </div>
                    </div>

                    <div class="mt-4">
                        <h5 class="mb-3">Leave Balance</h5>
                        <div class="row">
                            ${Object.entries(leaveBalance).map(([type, balance]) => `
                                <div class="col-md-4 mb-3">
                                    <div class="card">
                                        <div class="card-body text-center">
                                            <h6 class="text-muted">${type}</h6>
                                            <h4>${balance} days</h4>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('employeeDetailsModal'));
        modal.show();
    } catch (error) {
        console.error('Error loading employee details:', error);
        showNotification({
            title: 'Error',
            text: 'Error loading employee details',
            icon: 'error'
        });
    }
} 