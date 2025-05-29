// Wait for Firebase and shared module to be ready
function waitForFirebase() {
    return new Promise((resolve, reject) => {
        const checkFirebase = () => {
            if (typeof firebase !== 'undefined' && window.firebaseShared && window.firebaseShared.isInitialized) {
                console.log('Firebase and shared module are ready in admin.js');
                resolve({
                    auth: window.firebaseShared.getAuth(),
                    database: window.firebaseShared.getDatabase()
                });
            } else {
                console.log('Waiting for Firebase initialization in admin.js...');
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
    console.log('Firebase instances initialized in admin.js');
}).catch(error => {
    console.error('Error initializing Firebase in admin.js:', error);
});

// Add this helper function at the top of the file
function showNotification(options) {
    return Swal.fire({
        title: options.title,
        text: options.text,
        icon: options.icon || 'success',
        toast: options.toast || false,
        position: options.position || 'top-end',
        showConfirmButton: options.showConfirmButton !== undefined ? options.showConfirmButton : false,
        timer: options.timer || 3000,
        timerProgressBar: true,
        showCancelButton: options.showCancelButton || false,
        confirmButtonText: options.confirmButtonText || 'OK',
        cancelButtonText: options.cancelButtonText || 'Cancel',
        customClass: {
            popup: 'animated fadeInDown'
        }
    });
}

// Admin-specific functions
function loadUserManagement() {
    const html = `
        <div class="row">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h4>User Management</h4>
                        <div>
                            <button class="btn btn-success me-2" data-bs-toggle="modal" data-bs-target="#addEmployeeModal">
                                <i class="fas fa-user-plus"></i> Add Employee
                            </button>
                            <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#addUserModal">
                                <i class="fas fa-user-cog"></i> Add Admin/Manager
                            </button>
                        </div>
                    </div>
                    <div class="card-body">
                        <!-- Add Filter Section -->
                        <div class="row mb-4">
                            <div class="col-md-4">
                                <div class="d-flex align-items-center">
                                    <label class="me-2 text-nowrap">Filter by Department:</label>
                                    <select class="form-select" id="departmentFilter">
                                        <option value="all">All Departments</option>
                                        <option value="Department A">Department A</option>
                                        <option value="Department B">Department B</option>
                                        <option value="Department C">Department C</option>
                                        <option value="Department D">Department D</option>
                                        <option value="Department E">Department E</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div class="table-responsive">
                            <table class="table table-striped">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Employee ID</th>
                                        <th>Email</th>
                                        <th>Department</th>
                                        <th>Role</th>
                                        <th>Manager</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="usersTable">
                                    <tr>
                                        <td colspan="7" class="text-center">Loading...</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Add Employee Modal -->
        <div class="modal fade" id="addEmployeeModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Add New Employee</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form id="addEmployeeForm">
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label for="employeeFullName" class="form-label">Full Name</label>
                                    <input type="text" class="form-control" id="employeeFullName" required>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label for="employeeId" class="form-label">Employee ID</label>
                                    <input type="text" class="form-control" id="employeeId" required>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label for="employeeEmail" class="form-label">Email Address</label>
                                    <input type="email" class="form-control" id="employeeEmail" required>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label for="employeePhone" class="form-label">Phone Number</label>
                                    <input type="tel" class="form-control" id="employeePhone" required>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label for="employeeJobTitle" class="form-label">Job Title / Position</label>
                                    <input type="text" class="form-control" id="employeeJobTitle" required>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label for="employeeDepartment" class="form-label">Department / Team</label>
                                    <select class="form-select" id="employeeDepartment" required>
                                        <option value="">Select department</option>
                                        <option value="Department A">Department A</option>
                                        <option value="Department B">Department B</option>
                                        <option value="Department C">Department C</option>
                                        <option value="Department D">Department D</option>
                                        <option value="Department E">Department E</option>
                                    </select>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label for="employeeManager" class="form-label">Manager / Supervisor Name</label>
                                    <input type="text" class="form-control" id="employeeManager" required>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label for="employeeStartDate" class="form-label">Date of Hire</label>
                                    <input type="date" class="form-control" id="employeeStartDate" required>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label for="employeeType" class="form-label">Employment Type</label>
                                    <select class="form-select" id="employeeType" required>
                                        <option value="">Select type</option>
                                        <option value="Full-time">Full-time</option>
                                        <option value="Part-time">Part-time</option>
                                        <option value="Contractor">Contractor</option>
                                    </select>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label for="employeeLocation" class="form-label">Location</label>
                                    <select class="form-select" id="employeeLocation" required>
                                        <option value="">Select location</option>
                                        <option value="Office">Office</option>
                                        <option value="Remote">Remote</option>
                                        <option value="Hybrid">Hybrid</option>
                                    </select>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label for="employeeUsername" class="form-label">Username/Login ID</label>
                                    <input type="text" class="form-control" id="employeeUsername" required>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label for="employeePassword" class="form-label">Password</label>
                                    <input type="password" class="form-control" id="employeePassword" required>
                                </div>
                            </div>
                            <div class="d-grid gap-2">
                                <button type="submit" class="btn btn-success">Create Employee</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Add Admin/Manager Modal -->
        <div class="modal fade" id="addUserModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Add Admin/Manager</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form id="addUserForm">
                            <div class="mb-3">
                                <label for="newUserName" class="form-label">Name</label>
                                <input type="text" class="form-control" id="newUserName" required>
                            </div>
                            <div class="mb-3">
                                <label for="newUserEmail" class="form-label">Email</label>
                                <input type="email" class="form-control" id="newUserEmail" required>
                            </div>
                            <div class="mb-3">
                                <label for="newUserPassword" class="form-label">Password</label>
                                <input type="password" class="form-control" id="newUserPassword" required>
                            </div>
                            <div class="mb-3">
                                <label for="newUserRole" class="form-label">Role</label>
                                <select class="form-select" id="newUserRole" required>
                                    <option value="">Select role</option>
                                    <option value="manager">Manager</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div class="d-grid gap-2">
                                <button type="submit" class="btn btn-primary">Create Admin/Manager</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('dashboardContent').innerHTML = html;
    
    // Load users and set up filter functionality
    let allUsers = [];
    
    database.ref('users').once('value').then(snapshot => {
        const tableBody = document.getElementById('usersTable');
        
        if (!snapshot.exists()) {
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No users found</td></tr>';
            return;
        }
        
        // Store all users in the array
        snapshot.forEach(user => {
            const userData = user.val();
            userData.id = user.key;
            allUsers.push(userData);
        });
        
        // Initial render of all users
        renderFilteredUsers(allUsers);
        
        // Set up department filter event listener
        document.getElementById('departmentFilter').addEventListener('change', (e) => {
            const selectedDepartment = e.target.value;
            const filteredUsers = selectedDepartment === 'all' 
                ? allUsers 
                : allUsers.filter(user => user.department === selectedDepartment);
            renderFilteredUsers(filteredUsers);
        });
    });
    
    // Add employee form submission
    document.getElementById('addEmployeeForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const employeeData = {
            name: document.getElementById('employeeFullName').value,
            employeeId: document.getElementById('employeeId').value,
            email: document.getElementById('employeeEmail').value,
            phone: document.getElementById('employeePhone').value,
            jobTitle: document.getElementById('employeeJobTitle').value,
            department: document.getElementById('employeeDepartment').value,
            manager: document.getElementById('employeeManager').value,
            startDate: document.getElementById('employeeStartDate').value,
            employmentType: document.getElementById('employeeType').value,
            location: document.getElementById('employeeLocation').value,
            username: document.getElementById('employeeUsername').value,
            role: 'employee',
            createdAt: firebase.database.ServerValue.TIMESTAMP
        };
        
        const password = document.getElementById('employeePassword').value;
        
        // Create user in Firebase Auth
        auth.createUserWithEmailAndPassword(employeeData.email, password)
            .then((userCredential) => {
                // Create user in database
                return database.ref('users/' + userCredential.user.uid).set(employeeData);
            })
            .then(() => {
                showNotification({
                    title: 'Success',
                    text: 'Employee created successfully',
                    icon: 'success',
                    toast: true
                });
                document.getElementById('addEmployeeForm').reset();
                const modal = bootstrap.Modal.getInstance(document.getElementById('addEmployeeModal'));
                modal.hide();
                loadUserManagement();
            })
            .catch(error => {
                showNotification({
                    title: 'Error',
                    text: 'Error creating employee: ' + error.message,
                    icon: 'error'
                });
            });
    });
    
    // Add admin/manager form submission
    document.getElementById('addUserForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const name = document.getElementById('newUserName').value;
        const email = document.getElementById('newUserEmail').value;
        const password = document.getElementById('newUserPassword').value;
        const role = document.getElementById('newUserRole').value;
        
        // Create user in Firebase Auth
        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Create user in database
                return database.ref('users/' + userCredential.user.uid).set({
                    name: name,
                    email: email,
                    role: role,
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                });
            })
            .then(() => {
                showNotification({
                    title: 'Success',
                    text: 'User created successfully',
                    icon: 'success',
                    toast: true
                });
                document.getElementById('addUserForm').reset();
                const modal = bootstrap.Modal.getInstance(document.getElementById('addUserModal'));
                modal.hide();
                loadUserManagement();
            })
            .catch(error => {
                showNotification({
                    title: 'Error',
                    text: 'Error creating user: ' + error.message,
                    icon: 'error'
                });
            });
    });
}

// Helper function to render filtered users
function renderFilteredUsers(users) {
    const tableBody = document.getElementById('usersTable');
    tableBody.innerHTML = '';
    
    if (users.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No users found</td></tr>';
        return;
    }
    
    users.forEach(userData => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${userData.name || '-'}</td>
            <td>${userData.employeeId || '-'}</td>
            <td>${userData.email || '-'}</td>
            <td>${userData.department || '-'}</td>
            <td>${userData.role || '-'}</td>
            <td>${userData.manager || '-'}</td>
            <td>
                <button class="btn btn-sm btn-primary me-1" onclick="editUser('${userData.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteUser('${userData.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function editUser(userId) {
    // Implementation for editing user
    alert('Edit user with ID: ' + userId);
}

function deleteUser(userId) {
    showNotification({
        title: 'Are you sure?',
        text: 'This action cannot be undone!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, delete it!',
        cancelButtonText: 'No, cancel',
        showConfirmButton: true
    }).then((result) => {
        if (result.isConfirmed) {
            database.ref('users/' + userId).remove()
                .then(() => {
                    showNotification({
                        title: 'Deleted!',
                        text: 'User has been deleted successfully',
                        icon: 'success',
                        toast: true
                    });
                    loadUserManagement();
                })
                .catch(error => {
                    showNotification({
                        title: 'Error',
                        text: 'Error deleting user: ' + error.message,
                        icon: 'error'
                    });
                });
        }
    });
}

function loadLeaveTypes() {
    const html = `
        <div class="row">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h4>Leave Types</h4>
                        <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#addLeaveTypeModal">
                            Add Leave Type
                        </button>
                    </div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-striped">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Description</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="leaveTypesTable">
                                    <tr>
                                        <td colspan="3" class="text-center">Loading...</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Add Leave Type Modal -->
        <div class="modal fade" id="addLeaveTypeModal" tabindex="-1" role="dialog" aria-labelledby="addLeaveTypeModalLabel">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="addLeaveTypeModalLabel">Add Leave Type</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form id="addLeaveTypeForm">
                            <div class="mb-3">
                                <label for="leaveTypeName" class="form-label">Name</label>
                                <input type="text" class="form-control" id="leaveTypeName" required>
                            </div>
                            <div class="mb-3">
                                <label for="leaveTypeDesc" class="form-label">Description</label>
                                <textarea class="form-control" id="leaveTypeDesc" rows="3"></textarea>
                            </div>
                            <div class="d-grid gap-2">
                                <button type="submit" class="btn btn-primary">Add Leave Type</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('dashboardContent').innerHTML = html;
    
    // Initialize modal with proper focus management
    const addLeaveTypeModal = document.getElementById('addLeaveTypeModal');
    const modalInstance = new bootstrap.Modal(addLeaveTypeModal);
    
    // Store the element that had focus before opening modal
    let previousActiveElement;
    
    addLeaveTypeModal.addEventListener('show.bs.modal', function () {
        previousActiveElement = document.activeElement;
    });
    
    addLeaveTypeModal.addEventListener('shown.bs.modal', function () {
        // Set focus to first focusable element
        document.getElementById('leaveTypeName').focus();
    });
    
    addLeaveTypeModal.addEventListener('hidden.bs.modal', function () {
        // Return focus to the element that opened the modal
        if (previousActiveElement) {
            previousActiveElement.focus();
        }
    });
    
    // Load leave types
    database.ref('leave_types').once('value').then(snapshot => {
        const tableBody = document.getElementById('leaveTypesTable');
        tableBody.innerHTML = '';
        
        if (!snapshot.exists()) {
            tableBody.innerHTML = '<tr><td colspan="3" class="text-center">No leave types defined</td></tr>';
            return;
        }
        
        snapshot.forEach(type => {
            const typeData = type.val();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${typeData.name}</td>
                <td>${typeData.description || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-warning edit-type-btn" data-id="${type.key}">Edit</button>
                    <button class="btn btn-sm btn-danger delete-type-btn" data-id="${type.key}">Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
        
        // Add event listeners to buttons
        document.querySelectorAll('.edit-type-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const typeId = this.getAttribute('data-id');
                editLeaveType(typeId);
            });
        });
        
        document.querySelectorAll('.delete-type-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const typeId = this.getAttribute('data-id');
                deleteLeaveType(typeId);
            });
        });
    });
    
    // Add leave type form submission
    document.getElementById('addLeaveTypeForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const name = document.getElementById('leaveTypeName').value;
        const description = document.getElementById('leaveTypeDesc').value;
        
        database.ref('leave_types').push().set({
            name: name,
            description: description
        }).then(() => {
            showNotification({
                title: 'Success',
                text: 'Leave type added successfully',
                icon: 'success',
                toast: true
            });
            document.getElementById('addLeaveTypeForm').reset();
            modalInstance.hide(); // Use the modal instance to hide
            loadLeaveTypes();
        }).catch(error => {
            showNotification({
                title: 'Error',
                text: 'Error adding leave type: ' + error.message,
                icon: 'error'
            });
        });
    });
}

function editLeaveType(typeId) {
    // Implementation for editing leave type
    alert('Edit leave type with ID: ' + typeId);
}

function deleteLeaveType(typeId) {
    showNotification({
        title: 'Are you sure?',
        text: 'This action cannot be undone!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, delete it!',
        cancelButtonText: 'No, cancel',
        showConfirmButton: true
    }).then((result) => {
        if (result.isConfirmed) {
            database.ref('leave_types/' + typeId).remove()
                .then(() => {
                    showNotification({
                        title: 'Deleted!',
                        text: 'Leave type has been deleted successfully',
                        icon: 'success',
                        toast: true
                    });
                    loadLeaveTypes();
                })
                .catch(error => {
                    showNotification({
                        title: 'Error',
                        text: 'Error deleting leave type: ' + error.message,
                        icon: 'error'
                    });
                });
        }
    });
}

function loadAssignLeave() {
    const html = `
        <div class="row">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-header">
                        <h4>Assign Leave Days</h4>
                    </div>
                    <div class="card-body">
                        <form id="assignLeaveForm">
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label for="assignUser" class="form-label">User</label>
                                    <select class="form-select" id="assignUser" required>
                                        <option value="">Select user</option>
                                    </select>
                                </div>
                                <div class="col-md-6">
                                    <label for="assignLeaveType" class="form-label">Leave Type</label>
                                    <select class="form-select" id="assignLeaveType" required>
                                        <option value="">Select leave type</option>
                                    </select>
                                </div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label for="assignDays" class="form-label">Days</label>
                                    <input type="number" class="form-control" id="assignDays" min="1" required>
                                </div>
                                <div class="col-md-6">
                                    <label for="assignYear" class="form-label">Year</label>
                                    <input type="number" class="form-control" id="assignYear" min="2000" max="2100" value="${new Date().getFullYear()}" required>
                                </div>
                            </div>
                            <div class="d-grid gap-2">
                                <button type="submit" class="btn btn-primary">Assign Leave</button>
                            </div>
                        </form>
                        
                        <hr>
                        
                        <h5>Current Leave Balances</h5>
                        <div class="table-responsive">
                            <table class="table table-striped">
                                <thead>
                                    <tr>
                                        <th>User</th>
                                        <th>Leave Type</th>
                                        <th>Year</th>
                                        <th>Total Days</th>
                                        <th>Used Days</th>
                                        <th>Remaining</th>
                                    </tr>
                                </thead>
                                <tbody id="leaveBalancesTable">
                                    <tr>
                                        <td colspan="6" class="text-center">Loading...</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('dashboardContent').innerHTML = html;
    
    // Load users and leave types
    Promise.all([
        database.ref('users').once('value'),
        database.ref('leave_types').once('value')
    ]).then(([usersSnap, typesSnap]) => {
        const userSelect = document.getElementById('assignUser');
        const typeSelect = document.getElementById('assignLeaveType');
        
        // Clear existing options except the default one
        while (userSelect.options.length > 1) {
            userSelect.remove(1);
        }
        while (typeSelect.options.length > 1) {
            typeSelect.remove(1);
        }
        
        // Populate users
        const addedUsers = new Set(); // Track added users
        usersSnap.forEach(user => {
            const userData = user.val();
            if (!addedUsers.has(user.key)) {
                const option = document.createElement('option');
                option.value = user.key;
                option.textContent = userData.name + ' (' + userData.role + ')';
                userSelect.appendChild(option);
                addedUsers.add(user.key);
            }
        });
        
        // Populate leave types
        const addedTypes = new Set(); // Track added types
        if (typesSnap.exists()) {
            typesSnap.forEach(type => {
                const typeData = type.val();
                if (!addedTypes.has(type.key)) {
                    const option = document.createElement('option');
                    option.value = type.key;
                    option.textContent = typeData.name;
                    typeSelect.appendChild(option);
                    addedTypes.add(type.key);
                }
            });
        }
    });
    
    // Load leave balances with a different approach
    database.ref('leave_balances').once('value').then(async snapshot => {
        const tableBody = document.getElementById('leaveBalancesTable');
        // Clear the table body first
        tableBody.innerHTML = '';
        
        if (!snapshot.exists()) {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No leave balances found</td></tr>';
            return;
        }

        // Get all users and leave types first to reduce database calls
        const [usersSnapshot, leaveTypesSnapshot] = await Promise.all([
            database.ref('users').once('value'),
            database.ref('leave_types').once('value')
        ]);

        const users = {};
        const leaveTypes = {};
        
        usersSnapshot.forEach(user => {
            users[user.key] = user.val();
        });
        
        leaveTypesSnapshot.forEach(type => {
            leaveTypes[type.key] = type.val();
        });

        // Store all balances in an array first
        const balances = [];
        snapshot.forEach(balance => {
            const data = balance.val();
            balances.push({
                key: balance.key,
                ...data,
                userName: users[data.userId]?.name || 'Unknown',
                leaveTypeName: leaveTypes[data.leaveTypeId]?.name || 'Unknown'
            });
        });

        // Sort balances by user name, leave type, and year
        balances.sort((a, b) => {
            if (a.userName !== b.userName) return a.userName.localeCompare(b.userName);
            if (a.leaveTypeName !== b.leaveTypeName) return a.leaveTypeName.localeCompare(b.leaveTypeName);
            return a.year - b.year;
        });

        // Use a Set to track unique combinations
        const seen = new Set();
        const uniqueBalances = balances.filter(balance => {
            const key = `${balance.userId}_${balance.leaveTypeId}_${balance.year}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        // Clear the table again before adding rows
        tableBody.innerHTML = '';

        // Display unique balances
        uniqueBalances.forEach(balance => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${balance.userName}</td>
                <td>${balance.leaveTypeName}</td>
                <td>${balance.year}</td>
                <td>${balance.totalDays}</td>
                <td>${balance.usedDays || 0}</td>
                <td>${balance.remainingDays}</td>
            `;
            tableBody.appendChild(row);
        });

        // If no balances after filtering
        if (uniqueBalances.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No leave balances found</td></tr>';
        }
    }).catch(error => {
        console.error('Error loading leave balances:', error);
        const tableBody = document.getElementById('leaveBalancesTable');
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error loading leave balances</td></tr>';
    });
    
    // Assign leave form submission
    document.getElementById('assignLeaveForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitButton = e.target.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        
        try {
            const userId = document.getElementById('assignUser').value;
            const leaveTypeId = document.getElementById('assignLeaveType').value;
            const days = parseInt(document.getElementById('assignDays').value);
            const year = parseInt(document.getElementById('assignYear').value);
            
            if (!userId || !leaveTypeId || isNaN(days) || isNaN(year)) {
                await showNotification({
                    title: 'Error',
                    text: 'Please fill all fields correctly',
                    icon: 'error'
                });
                submitButton.disabled = false;
                return;
            }

            // Get a reference to the leave_balances node filtered by userId and year
            const balancesRef = database.ref('leave_balances');
            const query = balancesRef
                .orderByChild('userId')
                .equalTo(userId);
            
            const snapshot = await query.once('value');
            let existingBalance = null;

            // Check for existing balance
            snapshot.forEach(child => {
                const balance = child.val();
                if (balance.leaveTypeId === leaveTypeId && balance.year === year) {
                    existingBalance = {
                        key: child.key,
                        ...balance
                    };
                    return true; // Break the forEach loop
                }
            });

            if (existingBalance) {
                await balancesRef.child(existingBalance.key).update({
                    totalDays: days,
                    remainingDays: days,
                    updatedAt: firebase.database.ServerValue.TIMESTAMP
                });
            } else {
                const newBalance = {
                    userId: userId,
                    leaveTypeId: leaveTypeId,
                    year: year,
                    totalDays: days,
                    remainingDays: days,
                    usedDays: 0,
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                };
                await balancesRef.push().set(newBalance);
            }

            await showNotification({
                title: 'Success',
                text: 'Leave balance assigned successfully',
                icon: 'success',
                toast: true
            });

            document.getElementById('assignLeaveForm').reset();
            setTimeout(() => {
                loadAssignLeave();
            }, 100);

        } catch (error) {
            console.error('Error assigning leave:', error);
            await showNotification({
                title: 'Error',
                text: 'Error assigning leave: ' + error.message,
                icon: 'error'
            });
        } finally {
            submitButton.disabled = false;
        }
    });
}

function loadCompanyHolidays() {
    // First ensure Firebase is initialized
    if (!auth || !database) {
        console.log('Waiting for Firebase initialization before loading company holidays...');
        waitForFirebase().then(() => {
            loadCompanyHolidays();
        }).catch(error => {
            console.error('Error loading company holidays:', error);
        });
        return;
    }

    const html = `
        <div class="row">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h4>Company Holidays</h4>
                        <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#addHolidayModal">
                            Add Holiday
                        </button>
                    </div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-striped">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Date</th>
                                        <th>Description</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="holidaysTable">
                                    <tr>
                                        <td colspan="4" class="text-center">Loading...</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Add Holiday Modal -->
        <div class="modal fade" id="addHolidayModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Add Company Holiday</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form id="addHolidayForm">
                            <div class="mb-3">
                                <label for="holidayName" class="form-label">Name</label>
                                <input type="text" class="form-control" id="holidayName" required>
                            </div>
                            <div class="mb-3">
                                <label for="holidayDate" class="form-label">Date</label>
                                <input type="date" class="form-control" id="holidayDate" required>
                            </div>
                            <div class="mb-3">
                                <label for="holidayDesc" class="form-label">Description</label>
                                <textarea class="form-control" id="holidayDesc" rows="3"></textarea>
                            </div>
                            <div class="d-grid gap-2">
                                <button type="submit" class="btn btn-primary">Add Holiday</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('dashboardContent').innerHTML = html;
    
    // Load holidays
    database.ref('holidays').once('value').then(snapshot => {
        const tableBody = document.getElementById('holidaysTable');
        tableBody.innerHTML = '';
        
        if (!snapshot.exists()) {
            tableBody.innerHTML = '<tr><td colspan="4" class="text-center">No holidays defined</td></tr>';
            return;
        }
        
        snapshot.forEach(holiday => {
            const holidayData = holiday.val();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${holidayData.name}</td>
                <td>${formatDate(holidayData.date)}</td>
                <td>${holidayData.description || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-warning edit-holiday-btn" data-id="${holiday.key}">Edit</button>
                    <button class="btn btn-sm btn-danger delete-holiday-btn" data-id="${holiday.key}">Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
        
        // Add event listeners to buttons
        document.querySelectorAll('.edit-holiday-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const holidayId = this.getAttribute('data-id');
                editHoliday(holidayId);
            });
        });
        
        document.querySelectorAll('.delete-holiday-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const holidayId = this.getAttribute('data-id');
                deleteHoliday(holidayId);
            });
        });
    });
    
    // Add holiday form submission
    document.getElementById('addHolidayForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const name = document.getElementById('holidayName').value;
        const date = document.getElementById('holidayDate').value;
        const description = document.getElementById('holidayDesc').value;
        
        database.ref('holidays').push().set({
            name: name,
            date: date,
            description: description
        }).then(() => {
            showNotification({
                title: 'Success',
                text: 'Holiday added successfully',
                icon: 'success',
                toast: true
            });
            document.getElementById('addHolidayForm').reset();
            $('#addHolidayModal').modal('hide');
            loadCompanyHolidays();
        }).catch(error => {
            showNotification({
                title: 'Error',
                text: 'Error adding holiday: ' + error.message,
                icon: 'error'
            });
        });
    });
}

function editHoliday(holidayId) {
    // Implementation for editing holiday
    alert('Edit holiday with ID: ' + holidayId);
}

function deleteHoliday(holidayId) {
    showNotification({
        title: 'Are you sure?',
        text: 'This action cannot be undone!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, delete it!',
        cancelButtonText: 'No, cancel',
        showConfirmButton: true
    }).then((result) => {
        if (result.isConfirmed) {
            database.ref('holidays/' + holidayId).remove()
                .then(() => {
                    showNotification({
                        title: 'Deleted!',
                        text: 'Holiday has been deleted successfully',
                        icon: 'success',
                        toast: true
                    });
                    loadCompanyHolidays();
                })
                .catch(error => {
                    showNotification({
                        title: 'Error',
                        text: 'Error deleting holiday: ' + error.message,
                        icon: 'error'
                    });
                });
        }
    });
}

function loadReports() {
    const html = `
        <div class="row">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-header">
                        <h4>Reports</h4>
                    </div>
                    <div class="card-body">
                        <div class="row mb-4">
                            <div class="col-md-6">
                                <div class="card">
                                    <div class="card-header">
                                        <h5>Leave Summary</h5>
                                    </div>
                                    <div class="card-body">
                                        <canvas id="leaveSummaryChart" height="200"></canvas>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="card">
                                    <div class="card-header">
                                        <h5>Leave by Department</h5>
                                    </div>
                                    <div class="card-body">
                                        <canvas id="departmentLeaveChart" height="200"></canvas>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="row">
                            <div class="col-md-12">
                                <div class="card">
                                    <div class="card-header d-flex justify-content-between align-items-center">
                                        <h5>Detailed Leave Report</h5>
                                        <button class="btn btn-primary" id="exportReportBtn">
                                            <i class="fas fa-download me-2"></i>Export to CSV
                                        </button>
                                    </div>
                                    <div class="card-body">
                                        <div class="table-responsive">
                                            <table class="table table-striped">
                                                <thead>
                                                    <tr>
                                                        <th>Employee</th>
                                                        <th>Leave Type</th>
                                                        <th>Start Date</th>
                                                        <th>End Date</th>
                                                        <th>Days</th>
                                                        <th>Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody id="detailedReportTable">
                                                    <tr>
                                                        <td colspan="6" class="text-center">Loading...</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('dashboardContent').innerHTML = html;
    
    // Load report data
    loadTeamLeaveData().then(teamData => {
        const tableBody = document.getElementById('detailedReportTable');
        tableBody.innerHTML = '';
        
        if (teamData.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No leave data found</td></tr>';
            return;
        }
        
        teamData.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.employeeName}</td>
                <td>${item.leaveTypeName || 'Unknown'}</td>
                <td>${formatDate(item.startDate)}</td>
                <td>${formatDate(item.endDate)}</td>
                <td>${item.days}</td>
                <td><span class="badge ${getStatusClass(item.status)}">${item.status}</span></td>
            `;
            tableBody.appendChild(row);
        });
        
        // In a real app, you would generate charts here using Chart.js
        // This is just a placeholder
        console.log('Charts would be generated here with the data');
        
        // Export to CSV
        document.getElementById('exportReportBtn')?.addEventListener('click', () => {
            exportToCSV(teamData);
        });
    });
}

function exportToCSV(data) {
    // Convert data to CSV
    let csv = 'Employee,Leave Type,Start Date,End Date,Days,Status\n';
    
    data.forEach(item => {
        csv += `"${item.employeeName}","${item.leaveTypeName || 'Unknown'}","${formatDate(item.startDate)}","${formatDate(item.endDate)}",${item.days},${item.status}\n`;
    });
    
    // Create download link
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'leave_report.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function initializeModal(modalId, formId, firstInputId) {
    const modal = document.getElementById(modalId);
    const form = document.getElementById(formId);
    let previousActiveElement = null;

    if (modal) {
        modal.addEventListener('show.bs.modal', function () {
            previousActiveElement = document.activeElement;
        });

        modal.addEventListener('shown.bs.modal', function () {
            // Set focus to first input
            const firstInput = document.getElementById(firstInputId);
            if (firstInput) {
                firstInput.focus();
            }
        });

        modal.addEventListener('hidden.bs.modal', function () {
            // Return focus to the element that opened the modal
            if (previousActiveElement) {
                previousActiveElement.focus();
            }
            // Reset form if it exists
            if (form) {
                form.reset();
            }
        });

        // Trap focus within modal
        modal.addEventListener('keydown', function (e) {
            if (e.key === 'Tab') {
                const focusableElements = modal.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                const firstFocusable = focusableElements[0];
                const lastFocusable = focusableElements[focusableElements.length - 1];

                if (e.shiftKey) {
                    if (document.activeElement === firstFocusable) {
                        lastFocusable.focus();
                        e.preventDefault();
                    }
                } else {
                    if (document.activeElement === lastFocusable) {
                        firstFocusable.focus();
                        e.preventDefault();
                    }
                }
            }
        });
    }
}

// Initialize modals with proper focus management
document.addEventListener('DOMContentLoaded', function() {
    initializeModal('addUserModal', 'addUserForm', 'newUserName');
    initializeModal('addLeaveTypeModal', 'addLeaveTypeForm', 'leaveTypeName');
    initializeModal('addHolidayModal', 'addHolidayForm', 'holidayName');
});

// Add this new function for employee management
function loadEmployeeDirectory() {
    const html = `
        <div class="row">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h4>Employee Directory</h4>
                        <div class="d-flex gap-2 align-items-center">
                            <div class="d-flex align-items-center">
                                <label class="me-2 text-nowrap">Department:</label>
                                <select class="form-select form-select-sm" id="employeeDeptFilter" style="width: 200px;">
                                    <option value="all">All Departments</option>
                                    <option value="Department A">Department A</option>
                                    <option value="Department B">Department B</option>
                                    <option value="Department C">Department C</option>
                                    <option value="Department D">Department D</option>
                                    <option value="Department E">Department E</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="row" id="employeeGrid">
                            <!-- Employee cards will be dynamically added here -->
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
        <div class="modal fade" id="employeeDetailsModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header border-0 pb-0">
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="text-center mb-4">
                            <div class="avatar-circle mb-3">
                                <span class="avatar-initials" id="employeeInitials"></span>
                            </div>
                            <h4 class="mb-1" id="employeeFullName"></h4>
                            <p class="text-muted" id="employeeJobTitle"></p>
                        </div>
                        <div class="row g-4">
                            <div class="col-md-6">
                                <div class="info-card">
                                    <h5 class="info-card-title">Contact Information</h5>
                                    <ul class="list-unstyled">
                                        <li class="mb-2">
                                            <i class="fas fa-envelope text-primary me-2"></i>
                                            <span id="employeeEmail"></span>
                                        </li>
                                        <li class="mb-2">
                                            <i class="fas fa-phone text-primary me-2"></i>
                                            <span id="employeePhone"></span>
                                        </li>
                                        <li>
                                            <i class="fas fa-map-marker-alt text-primary me-2"></i>
                                            <span id="employeeLocation"></span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="info-card">
                                    <h5 class="info-card-title">Employment Details</h5>
                                    <ul class="list-unstyled">
                                        <li class="mb-2">
                                            <i class="fas fa-id-badge text-primary me-2"></i>
                                            Employee ID: <span id="employeeIdDisplay"></span>
                                        </li>
                                        <li class="mb-2">
                                            <i class="fas fa-users text-primary me-2"></i>
                                            Department: <span id="employeeDepartment"></span>
                                        </li>
                                        <li class="mb-2">
                                            <i class="fas fa-user-tie text-primary me-2"></i>
                                            Manager: <span id="employeeManager"></span>
                                        </li>
                                        <li class="mb-2">
                                            <i class="fas fa-calendar-alt text-primary me-2"></i>
                                            Start Date: <span id="employeeStartDate"></span>
                                        </li>
                                        <li>
                                            <i class="fas fa-briefcase text-primary me-2"></i>
                                            Employment Type: <span id="employeeType"></span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                            <div class="col-12">
                                <div class="info-card">
                                    <h5 class="info-card-title">Leave Balance</h5>
                                    <div class="table-responsive">
                                        <table class="table table-sm">
                                            <thead>
                                                <tr>
                                                    <th>Leave Type</th>
                                                    <th>Total Days</th>
                                                    <th>Used</th>
                                                    <th>Remaining</th>
                                                </tr>
                                            </thead>
                                            <tbody id="employeeLeaveBalance">
                                                <!-- Leave balance will be dynamically added here -->
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <style>
            .employee-card {
                transition: transform 0.2s, box-shadow 0.2s;
                cursor: pointer;
            }
            .employee-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            }
            .avatar-circle {
                width: 100px;
                height: 100px;
                background-color: #4f46e5;
                border-radius: 50%;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto;
            }
            .avatar-initials {
                color: white;
                font-size: 2.5rem;
                font-weight: bold;
            }
            .info-card {
                background-color: #f8fafc;
                border-radius: 10px;
                padding: 1.5rem;
                height: 100%;
            }
            .info-card-title {
                color: #4f46e5;
                font-size: 1.1rem;
                margin-bottom: 1rem;
                font-weight: 600;
            }
            .employee-mini-avatar {
                width: 48px;
                height: 48px;
                background-color: #4f46e5;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: 1.2rem;
                margin-right: 1rem;
            }
        </style>
    `;

    document.getElementById('dashboardContent').innerHTML = html;

    // Load employees
    let allEmployees = [];
    
    database.ref('users').once('value').then(async snapshot => {
        const employeeGrid = document.getElementById('employeeGrid');
        employeeGrid.innerHTML = ''; // Clear loading spinner
        
        if (!snapshot.exists()) {
            employeeGrid.innerHTML = '<div class="col-12 text-center">No employees found</div>';
            return;
        }

        // Store all employees and sort by name
        snapshot.forEach(user => {
            const userData = user.val();
            if (userData.role === 'employee') {
                userData.id = user.key;
                allEmployees.push(userData);
            }
        });

        allEmployees.sort((a, b) => a.name.localeCompare(b.name));
        
        // Initial render of all employees
        renderEmployeeCards(allEmployees);

        // Set up department filter event listener
        document.getElementById('employeeDeptFilter').addEventListener('change', (e) => {
            const selectedDepartment = e.target.value;
            const filteredEmployees = selectedDepartment === 'all' 
                ? allEmployees 
                : allEmployees.filter(emp => emp.department === selectedDepartment);
            renderEmployeeCards(filteredEmployees);
        });
    });
}

// Helper function to render employee cards
function renderEmployeeCards(employees) {
    const employeeGrid = document.getElementById('employeeGrid');
    employeeGrid.innerHTML = '';

    if (employees.length === 0) {
        employeeGrid.innerHTML = '<div class="col-12 text-center">No employees found</div>';
        return;
    }

    employees.forEach(employee => {
        const initials = getInitials(employee.name);
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4 mb-4';
        col.innerHTML = `
            <div class="card employee-card h-100" onclick="showEmployeeDetails('${employee.id}')">
                <div class="card-body">
                    <div class="d-flex align-items-center mb-3">
                        <div class="employee-mini-avatar">
                            ${initials}
                        </div>
                        <div>
                            <h5 class="card-title mb-0">${employee.name}</h5>
                            <small class="text-muted">${employee.jobTitle || 'No title specified'}</small>
                        </div>
                    </div>
                    <div class="card-text">
                        <p class="mb-1">
                            <i class="fas fa-users text-primary me-2"></i>
                            ${employee.department || 'No department'}
                        </p>
                        <p class="mb-1">
                            <i class="fas fa-envelope text-primary me-2"></i>
                            ${employee.email}
                        </p>
                        <p class="mb-0">
                            <i class="fas fa-phone text-primary me-2"></i>
                            ${employee.phone || 'No phone number'}
                        </p>
                    </div>
                </div>
            </div>
        `;
        employeeGrid.appendChild(col);
    });
}

// Helper function to get initials from name
function getInitials(name) {
    return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
}

// Function to show employee details
async function showEmployeeDetails(employeeId) {
    try {
        // Fetch employee data
        const employeeSnapshot = await database.ref(`users/${employeeId}`).once('value');
        const employee = employeeSnapshot.val();

        if (!employee) {
            showNotification({
                title: 'Error',
                text: 'Employee not found',
                icon: 'error'
            });
            return;
        }

        // Update modal with employee details
        document.getElementById('employeeInitials').textContent = getInitials(employee.name);
        document.getElementById('employeeFullName').textContent = employee.name;
        document.getElementById('employeeJobTitle').textContent = employee.jobTitle || 'No title specified';
        document.getElementById('employeeEmail').textContent = employee.email;
        document.getElementById('employeePhone').textContent = employee.phone || 'No phone number';
        document.getElementById('employeeLocation').textContent = employee.location || 'Not specified';
        document.getElementById('employeeIdDisplay').textContent = employee.employeeId || 'Not assigned';
        document.getElementById('employeeDepartment').textContent = employee.department || 'Not assigned';
        document.getElementById('employeeManager').textContent = employee.manager || 'Not assigned';
        document.getElementById('employeeStartDate').textContent = employee.startDate || 'Not specified';
        document.getElementById('employeeType').textContent = employee.employmentType || 'Not specified';

        // Fetch and display leave balance
        const leaveBalanceSnapshot = await database.ref('leave_balances')
            .orderByChild('userId')
            .equalTo(employeeId)
            .once('value');
        
        const leaveBalanceTable = document.getElementById('employeeLeaveBalance');
        leaveBalanceTable.innerHTML = '';

        if (leaveBalanceSnapshot.exists()) {
            const leaveTypes = {};
            const currentYear = new Date().getFullYear();

            // First, get all leave types
            const leaveTypesSnapshot = await database.ref('leave_types').once('value');
            leaveTypesSnapshot.forEach(type => {
                leaveTypes[type.key] = type.val().name;
            });

            leaveBalanceSnapshot.forEach(balance => {
                const balanceData = balance.val();
                if (balanceData.year === currentYear) {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${leaveTypes[balanceData.leaveTypeId] || 'Unknown'}</td>
                        <td>${balanceData.totalDays}</td>
                        <td>${balanceData.usedDays || 0}</td>
                        <td>${balanceData.remainingDays}</td>
                    `;
                    leaveBalanceTable.appendChild(row);
                }
            });
        } else {
            leaveBalanceTable.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center">No leave balance found</td>
                </tr>
            `;
        }

        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('employeeDetailsModal'));
        modal.show();

    } catch (error) {
        console.error('Error showing employee details:', error);
        showNotification({
            title: 'Error',
            text: 'Error loading employee details',
            icon: 'error'
        });
    }
}