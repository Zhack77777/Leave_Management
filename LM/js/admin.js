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

// Helper function for notifications
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

// Validate user data against Firebase rules
function validateUserData(data) {
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    const validRoles = ['employee', 'manager', 'admin'];
    const validEmploymentTypes = ['Full-time', 'Part-time', 'Contractor', null];
    const validLocations = ['Office', 'Remote', 'Hybrid', null];
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    // Required fields
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
        return 'Name is required and must be a non-empty string';
    }
    if (!data.email || !emailRegex.test(data.email)) {
        return 'Valid email is required';
    }
    if (!data.role || !validRoles.includes(data.role)) {
        return 'Role must be employee, manager, or admin';
    }

    // Optional fields
    if (data.department && typeof data.department !== 'string') {
        return 'Department must be a string';
    }
    if (data.employeeId && typeof data.employeeId !== 'string') {
        return 'Employee ID must be a string';
    }
    if (data.phone && typeof data.phone !== 'string') {
        return 'Phone must be a string';
    }
    if (data.jobTitle && typeof data.jobTitle !== 'string') {
        return 'Job title must be a string';
    }
    if (data.manager && typeof data.manager !== 'string') {
        return 'Manager must be a string';
    }
    if (data.startDate && !dateRegex.test(data.startDate)) {
        return 'Start date must be in YYYY-MM-DD format';
    }
    if (data.employmentType && !validEmploymentTypes.includes(data.employmentType)) {
        return 'Employment type must be Full-time, Part-time, or Contractor';
    }
    if (data.location && !validLocations.includes(data.location)) {
        return 'Location must be Office, Remote, or Hybrid';
    }
    if (data.username && typeof data.username !== 'string') {
        return 'Username must be a string';
    }
    if (data.createdAt && typeof data.createdAt !== 'number') {
        return 'Created timestamp must be a number';
    }

    return null; // Data is valid
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

        <!-- Edit User Modal -->
        <div class="modal fade" id="editUserModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Edit User</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form id="editUserForm">
                            <input type="hidden" id="editUserId">
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label for="editUserName" class="form-label">Full Name</label>
                                    <input type="text" class="form-control" id="editUserName" required>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label for="editUserEmail" class="form-label">Email Address</label>
                                    <input type="email" class="form-control" id="editUserEmail" required>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label for="editUserRole" class="form-label">Role</label>
                                    <select class="form-select" id="editUserRole" required>
                                        <option value="employee">Employee</option>
                                        <option value="manager">Manager</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label for="editUserDepartment" class="form-label">Department</label>
                                    <select class="form-select" id="editUserDepartment">
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
                                    <label for="editUserPhone" class="form-label">Phone Number</label>
                                    <input type="tel" class="form-control" id="editUserPhone">
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label for="editUserLocation" class="form-label">Location</label>
                                    <select class="form-select" id="editUserLocation">
                                        <option value="">Select location</option>
                                        <option value="Office">Office</option>
                                        <option value="Remote">Remote</option>
                                        <option value="Hybrid">Hybrid</option>
                                    </select>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label for="editUserJobTitle" class="form-label">Job Title</label>
                                    <input type="text" class="form-control" id="editUserJobTitle">
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label for="editUserEmployeeId" class="form-label">Employee ID</label>
                                    <input type="text" class="form-control" id="editUserEmployeeId">
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label for="editUserStartDate" class="form-label">Start Date</label>
                                    <input type="date" class="form-control" id="editUserStartDate">
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label for="editUserEmploymentType" class="form-label">Employment Type</label>
                                    <select class="form-select" id="editUserEmploymentType">
                                        <option value="">Select type</option>
                                        <option value="Full-time">Full-time</option>
                                        <option value="Part-time">Part-time</option>
                                        <option value="Contractor">Contractor</option>
                                    </select>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label for="editUserManager" class="form-label">Manager</label>
                                    <input type="text" class="form-control" id="editUserManager">
                                </div>
                            </div>
                            <div class="d-grid gap-2">
                                <button type="submit" class="btn btn-primary">Save Changes</button>
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

        snapshot.forEach(user => {
            const userData = user.val();
            userData.id = user.key;
            allUsers.push(userData);
        });

        renderFilteredUsers(allUsers);

        document.getElementById('departmentFilter').addEventListener('change', (e) => {
            const selectedDepartment = e.target.value;
            const filteredUsers = selectedDepartment === 'all'
                ? allUsers
                : allUsers.filter(user => user.department === selectedDepartment);
            renderFilteredUsers(filteredUsers);
        });
    }).catch(error => {
        console.error('Error loading users:', error);
        showNotification({
            title: 'Error',
            text: 'Error loading users: ' + error.message,
            icon: 'error'
        });
    });

    // Add employee form submission
    document.getElementById('addEmployeeForm')?.addEventListener('submit', async (e) => {
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

        const validationError = validateUserData(employeeData);
        if (validationError) {
            showNotification({
                title: 'Error',
                text: validationError,
                icon: 'error'
            });
            return;
        }

        try {
            const userCredential = await auth.createUserWithEmailAndPassword(employeeData.email, password);
            await database.ref('users/' + userCredential.user.uid).set(employeeData);
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
        } catch (error) {
            console.error('Error creating employee:', error);
            showNotification({
                title: 'Error',
                text: 'Error creating employee: ' + error.message,
                icon: 'error'
            });
        }
    });

    // Add admin/manager form submission
    document.getElementById('addUserForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const userData = {
            name: document.getElementById('newUserName').value,
            email: document.getElementById('newUserEmail').value,
            role: document.getElementById('newUserRole').value,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        };

        const password = document.getElementById('newUserPassword').value;

        const validationError = validateUserData(userData);
        if (validationError) {
            showNotification({
                title: 'Error',
                text: validationError,
                icon: 'error'
            });
            return;
        }

        try {
            const userCredential = await auth.createUserWithEmailAndPassword(userData.email, password);
            await database.ref('users/' + userCredential.user.uid).set(userData);
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
        } catch (error) {
            console.error('Error creating user:', error);
            showNotification({
                title: 'Error',
                text: 'Error creating user: ' + error.message,
                icon: 'error'
            });
        }
    });

    // Add event listener for edit user form
    document.getElementById('editUserForm')?.addEventListener('submit', saveUserChanges);
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
        row.innerHTML = renderUserRow(userData, userData.id);
        tableBody.appendChild(row);
    });
}

function renderUserRow(user, key) {
    return `
        <tr>
            <td>${user.name}</td>
            <td>${user.employeeId || 'N/A'}</td>
            <td>${user.email}</td>
            <td>${user.department || 'Not assigned'}</td>
            <td>${user.role}</td>
            <td>${user.manager || 'Not assigned'}</td>
            <td>
                <button class="btn btn-sm btn-primary me-2" onclick="editUser('${key}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteUser('${key}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        </tr>
    `;
}

async function editUser(userId) {
    try {
        const database = window.firebaseShared.getDatabase();
        const userSnapshot = await database.ref(`users/${userId}`).once('value');
        const userData = userSnapshot.val();

        if (!userData) {
            showNotification({
                title: 'Error',
                text: 'User not found',
                icon: 'error'
            });
            return;
        }

        // Populate the edit modal with user data
        document.getElementById('editUserId').value = userId;
        document.getElementById('editUserName').value = userData.name || '';
        document.getElementById('editUserEmail').value = userData.email || '';
        document.getElementById('editUserRole').value = userData.role || '';
        document.getElementById('editUserDepartment').value = userData.department || '';
        document.getElementById('editUserPhone').value = userData.phone || '';
        document.getElementById('editUserLocation').value = userData.location || '';
        document.getElementById('editUserJobTitle').value = userData.jobTitle || '';
        document.getElementById('editUserEmployeeId').value = userData.employeeId || '';
        document.getElementById('editUserStartDate').value = userData.startDate || '';
        document.getElementById('editUserEmploymentType').value = userData.employmentType || '';
        document.getElementById('editUserManager').value = userData.manager || '';

        const editUserModal = new bootstrap.Modal(document.getElementById('editUserModal'));
        editUserModal.show();
    } catch (error) {
        console.error('Error loading user data:', error);
        showNotification({
            title: 'Error',
            text: 'Error loading user data: ' + error.message,
            icon: 'error'
        });
    }
}

async function saveUserChanges(event) {
    event.preventDefault();

    const userId = document.getElementById('editUserId').value;
    const database = window.firebaseShared.getDatabase();

    // Check authentication
    const user = auth.currentUser;
    if (!user) {
        showNotification({
            title: 'Error',
            text: 'No authenticated user found',
            icon: 'error'
        });
        return;
    }

    // Verify admin role
    const userSnapshot = await database.ref(`users/${user.uid}/role`).once('value');
    if (userSnapshot.val() !== 'admin') {
        showNotification({
            title: 'Error',
            text: 'Only admins can update user information',
            icon: 'error'
        });
        return;
    }

    const updatedUserData = {
        name: document.getElementById('editUserName').value || null,
        email: document.getElementById('editUserEmail').value || null,
        role: document.getElementById('editUserRole').value || null,
        department: document.getElementById('editUserDepartment').value || null,
        phone: document.getElementById('editUserPhone').value || null,
        location: document.getElementById('editUserLocation').value || null,
        jobTitle: document.getElementById('editUserJobTitle').value || null,
        employeeId: document.getElementById('editUserEmployeeId').value || null,
        startDate: document.getElementById('editUserStartDate').value || null,
        employmentType: document.getElementById('editUserEmploymentType').value || null,
        manager: document.getElementById('editUserManager').value || null
    };

    // Remove null or empty optional fields to avoid validation issues
    Object.keys(updatedUserData).forEach(key => {
        if (updatedUserData[key] === null || updatedUserData[key] === '') {
            delete updatedUserData[key];
        }
    });

    const validationError = validateUserData(updatedUserData);
    if (validationError) {
        showNotification({
            title: 'Error',
            text: validationError,
            icon: 'error'
        });
        return;
    }

    try {
        console.log('Updating user with data:', updatedUserData); // Debug log
        await database.ref(`users/${userId}`).update(updatedUserData);
        const editUserModal = bootstrap.Modal.getInstance(document.getElementById('editUserModal'));
        editUserModal.hide();
        loadUserManagement();
        showNotification({
            title: 'Success',
            text: 'User information updated successfully',
            icon: 'success',
            toast: true
        });
    } catch (error) {
        console.error('Error updating user:', error);
        showNotification({
            title: 'Error',
            text: `Error updating user: ${error.message}`,
            icon: 'error'
        });
    }
}

async function deleteUser(userId) {
    showNotification({
        title: 'Are you sure?',
        text: 'This action cannot be undone!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, delete it!',
        cancelButtonText: 'No, cancel',
        showConfirmButton: true
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                await database.ref('users/' + userId).remove();
                showNotification({
                    title: 'Deleted!',
                    text: 'User has been deleted successfully',
                    icon: 'success',
                    toast: true
                });
                loadUserManagement();
            } catch (error) {
                console.error('Error deleting user:', error);
                showNotification({
                    title: 'Error',
                    text: 'Error deleting user: ' + error.message,
                    icon: 'error'
                });
            }
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

    const addLeaveTypeModal = document.getElementById('addLeaveTypeModal');
    const modalInstance = new bootstrap.Modal(addLeaveTypeModal);

    let previousActiveElement;

    addLeaveTypeModal.addEventListener('show.bs.modal', function () {
        previousActiveElement = document.activeElement;
    });

    addLeaveTypeModal.addEventListener('shown.bs.modal', function () {
        document.getElementById('leaveTypeName').focus();
    });

    addLeaveTypeModal.addEventListener('hidden.bs.modal', function () {
        if (previousActiveElement) {
            previousActiveElement.focus();
        }
    });

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
    }).catch(error => {
        console.error('Error loading leave types:', error);
        showNotification({
            title: 'Error',
            text: 'Error loading leave types: ' + error.message,
            icon: 'error'
        });
    });

    document.getElementById('addLeaveTypeForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('leaveTypeName').value;
        const description = document.getElementById('leaveTypeDesc').value;

        try {
            await database.ref('leave_types').push().set({
                name: name,
                description: description
            });
            showNotification({
                title: 'Success',
                text: 'Leave type added successfully',
                icon: 'success',
                toast: true
            });
            document.getElementById('addLeaveTypeForm').reset();
            modalInstance.hide();
            loadLeaveTypes();
        } catch (error) {
            console.error('Error adding leave type:', error);
            showNotification({
                title: 'Error',
                text: 'Error adding leave type: ' + error.message,
                icon: 'error'
            });
        }
    });
}

function editLeaveType(typeId) {
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
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                await database.ref('leave_types/' + typeId).remove();
                showNotification({
                    title: 'Deleted!',
                    text: 'Leave type has been deleted successfully',
                    icon: 'success',
                    toast: true
                });
                loadLeaveTypes();
            } catch (error) {
                console.error('Error deleting leave type:', error);
                showNotification({
                    title: 'Error',
                    text: 'Error deleting leave type: ' + error.message,
                    icon: 'error'
                });
            }
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
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="leaveBalancesTable">
                                    <tr>
                                        <td colspan="5" class="text-center">Loading...</td>
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

    // Load users
    database.ref('users').once('value').then(snapshot => {
        const userSelect = document.getElementById('assignUser');
        snapshot.forEach(user => {
            const userData = user.val();
            const option = document.createElement('option');
            option.value = user.key;
            option.textContent = userData.name;
            userSelect.appendChild(option);
        });
    }).catch(error => {
        console.error('Error loading users:', error);
        showNotification({
            title: 'Error',
            text: 'Error loading users: ' + error.message,
            icon: 'error'
        });
    });

    // Load leave types
    database.ref('leave_types').once('value').then(snapshot => {
        const leaveTypeSelect = document.getElementById('assignLeaveType');
        snapshot.forEach(type => {
            const typeData = type.val();
            const option = document.createElement('option');
            option.value = type.key;
            option.textContent = typeData.name;
            leaveTypeSelect.appendChild(option);
        });
    }).catch(error => {
        console.error('Error loading leave types:', error);
        showNotification({
            title: 'Error',
            text: 'Error loading leave types: ' + error.message,
            icon: 'error'
        });
    });

    // Load leave balances
    database.ref('leave_balances').once('value').then(snapshot => {
        const tableBody = document.getElementById('leaveBalancesTable');
        tableBody.innerHTML = '';

        if (!snapshot.exists()) {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No leave balances found</td></tr>';
            return;
        }

        const promises = [];
        snapshot.forEach(balance => {
            const balanceData = balance.val();
            const userPromise = database.ref(`users/${balanceData.userId}`).once('value');
            const typePromise = database.ref(`leave_types/${balanceData.leaveTypeId}`).once('value');
            promises.push(Promise.all([userPromise, typePromise]).then(([userSnapshot, typeSnapshot]) => {
                const userData = userSnapshot.val();
                const typeData = typeSnapshot.val();
                return {
                    key: balance.key,
                    userName: userData ? userData.name : 'Unknown',
                    leaveTypeName: typeData ? typeData.name : 'Unknown',
                    year: balanceData.year,
                    totalDays: balanceData.totalDays
                };
            }));
        });

        Promise.all(promises).then(balances => {
            balances.forEach(balance => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${balance.userName}</td>
                    <td>${balance.leaveTypeName}</td>
                    <td>${balance.year}</td>
                    <td>${balance.totalDays}</td>
                    <td>
                        <button class="btn btn-sm btn-danger" onclick="deleteLeaveBalance('${balance.key}')">Delete</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        });
    }).catch(error => {
        console.error('Error loading leave balances:', error);
        showNotification({
            title: 'Error',
            text: 'Error loading leave balances: ' + error.message,
            icon: 'error'
        });
    });

    // Assign leave form submission
    document.getElementById('assignLeaveForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const userId = document.getElementById('assignUser').value;
        const leaveTypeId = document.getElementById('assignLeaveType').value;
        const days = parseInt(document.getElementById('assignDays').value);
        const year = parseInt(document.getElementById('assignYear').value);

        try {
            await database.ref('leave_balances').push().set({
                userId: userId,
                leaveTypeId: leaveTypeId,
                year: year,
                totalDays: days
            });
            showNotification({
                title: 'Success',
                text: 'Leave assigned successfully',
                icon: 'success',
                toast: true
            });
            document.getElementById('assignLeaveForm').reset();
            document.getElementById('assignYear').value = new Date().getFullYear();
            loadAssignLeave();
        } catch (error) {
            console.error('Error assigning leave:', error);
            showNotification({
                title: 'Error',
                text: 'Error assigning leave: ' + error.message,
                icon: 'error'
            });
        }
    });
}

async function deleteLeaveBalance(balanceId) {
    showNotification({
        title: 'Are you sure?',
        text: 'This action cannot be undone!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, delete it!',
        cancelButtonText: 'No, cancel',
        showConfirmButton: true
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                await database.ref('leave_balances/' + balanceId).remove();
                showNotification({
                    title: 'Deleted!',
                    text: 'Leave balance has been deleted successfully',
                    icon: 'success',
                    toast: true
                });
                loadAssignLeave();
            } catch (error) {
                console.error('Error deleting leave balance:', error);
                showNotification({
                    title: 'Error',
                    text: 'Error deleting leave balance: ' + error.message,
                    icon: 'error'
                });
            }
        }
    });
}

function loadCompanyHolidays() {
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
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="holidaysTable">
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

        <div class="modal fade" id="addHolidayModal" tabindex="-1" role="dialog" aria-labelledby="addHolidayModalLabel">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="addHolidayModalLabel">Add Holiday</h5>
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

    database.ref('holidays').once('value').then(snapshot => {
        const tableBody = document.getElementById('holidaysTable');
        tableBody.innerHTML = '';

        if (!snapshot.exists()) {
            tableBody.innerHTML = '<tr><td colspan="3" class="text-center">No holidays defined</td></tr>';
            return;
        }

        snapshot.forEach(holiday => {
            const holidayData = holiday.val();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${holidayData.name}</td>
                <td>${holidayData.date}</td>
                <td>
                    <button class="btn btn-sm btn-warning edit-holiday-btn" data-id="${holiday.key}">Edit</button>
                    <button class="btn btn-sm btn-danger delete-holiday-btn" data-id="${holiday.key}">Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
        });

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
    }).catch(error => {
        console.error('Error loading holidays:', error);
        showNotification({
            title: 'Error',
            text: 'Error loading holidays: ' + error.message,
            icon: 'error'
        });
    });

    document.getElementById('addHolidayForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('holidayName').value;
        const date = document.getElementById('holidayDate').value;

        try {
            await database.ref('holidays').push().set({
                name: name,
                date: date
            });
            showNotification({
                title: 'Success',
                text: 'Holiday added successfully',
                icon: 'success',
                toast: true
            });
            document.getElementById('addHolidayForm').reset();
            const modal = bootstrap.Modal.getInstance(document.getElementById('addHolidayModal'));
            modal.hide();
            loadCompanyHolidays();
        } catch (error) {
            console.error('Error adding holiday:', error);
            showNotification({
                title: 'Error',
                text: 'Error adding holiday: ' + error.message,
                icon: 'error'
            });
        }
    });
}

function editHoliday(holidayId) {
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
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                await database.ref('holidays/' + holidayId).remove();
                showNotification({
                    title: 'Deleted!',
                    text: 'Holiday has been deleted successfully',
                    icon: 'success',
                    toast: true
                });
                loadCompanyHolidays();
            } catch (error) {
                console.error('Error deleting holiday:', error);
                showNotification({
                    title: 'Error',
                    text: 'Error deleting holiday: ' + error.message,
                    icon: 'error'
                });
            }
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
                        <div class="row mb-3">
                            <div class="col-md-4">
                                <label for="reportType" class="form-label">Report Type</label>
                                <select class="form-select" id="reportType">
                                    <option value="leaveBalances">Leave Balances</option>
                                    <option value="leaveRequests">Leave Requests</option>
                                    <option value="employeeDetails">Employee Details</option>
                                </select>
                            </div>
                            <div class="col-md-4">
                                <label for="reportYear" class="form-label">Year</label>
                                <input type="number" class="form-control" id="reportYear" value="${new Date().getFullYear()}">
                            </div>
                            <div class="col-md-4 d-flex align-items-end">
                                <button class="btn btn-primary" onclick="generateReport()">Generate Report</button>
                            </div>
                        </div>
                        <div id="reportOutput">
                            <p>Select a report type and year, then click Generate Report.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('dashboardContent').innerHTML = html;
}

async function generateReport() {
    const reportType = document.getElementById('reportType').value;
    const year = parseInt(document.getElementById('reportYear').value);
    const reportOutput = document.getElementById('reportOutput');

    try {
        let data = [];
        let headers = [];

        if (reportType === 'leaveBalances') {
            const snapshot = await database.ref('leave_balances').once('value');
            headers = ['User', 'Leave Type', 'Year', 'Total Days'];
            snapshot.forEach(balance => {
                const balanceData = balance.val();
                if (balanceData.year === year) {
                    data.push([
                        balanceData.userId, // Need to fetch user name
                        balanceData.leaveTypeId, // Need to fetch leave type name
                        balanceData.year,
                        balanceData.totalDays
                    ]);
                }
            });

            // Fetch user and leave type names
            const promises = data.map(async row => {
                const userSnapshot = await database.ref(`users/${row[0]}`).once('value');
                const typeSnapshot = await database.ref(`leave_types/${row[1]}`).once('value');
                return [
                    userSnapshot.val()?.name || 'Unknown',
                    typeSnapshot.val()?.name || 'Unknown',
                    row[2],
                    row[3]
                ];
            });
            data = await Promise.all(promises);
        } else if (reportType === 'leaveRequests') {
            const snapshot = await database.ref('leave_requests').once('value');
            headers = ['User', 'Leave Type', 'Start Date', 'End Date', 'Status'];
            snapshot.forEach(request => {
                const requestData = request.val();
                const startYear = new Date(requestData.startDate).getFullYear();
                if (startYear === year) {
                    data.push([
                        requestData.userId,
                        requestData.leaveTypeId,
                        requestData.startDate,
                        requestData.endDate,
                        requestData.status
                    ]);
                }
            });

            const promises = data.map(async row => {
                const userSnapshot = await database.ref(`users/${row[0]}`).once('value');
                const typeSnapshot = await database.ref(`leave_types/${row[1]}`).once('value');
                return [
                    userSnapshot.val()?.name || 'Unknown',
                    typeSnapshot.val()?.name || 'Unknown',
                    row[2],
                    row[3],
                    row[4]
                ];
            });
            data = await Promise.all(promises);
        } else if (reportType === 'employeeDetails') {
            const snapshot = await database.ref('users').once('value');
            headers = ['Name', 'Email', 'Role', 'Department', 'Employee ID'];
            snapshot.forEach(user => {
                const userData = user.val();
                data.push([
                    userData.name,
                    userData.email,
                    userData.role,
                    userData.department || 'N/A',
                    userData.employeeId || 'N/A'
                ]);
            });
        }

        if (data.length === 0) {
            reportOutput.innerHTML = '<p>No data found for the selected report type and year.</p>';
            return;
        }

        // Generate table
        let tableHtml = `
            <div class="table-responsive">
                <table class="table table-striped">
                    <thead>
                        <tr>
                            ${headers.map(header => `<th>${header}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(row => `
                            <tr>
                                ${row.map(cell => `<td>${cell}</td>`).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <button class="btn btn-success mt-3" onclick="exportToCSV('${reportType}', ${year})">Export to CSV</button>
        `;

        reportOutput.innerHTML = tableHtml;
    } catch (error) {
        console.error('Error generating report:', error);
        showNotification({
            title: 'Error',
            text: 'Error generating report: ' + error.message,
            icon: 'error'
        });
    }
}

function exportToCSV(reportType, year) {
    const reportOutput = document.getElementById('reportOutput');
    const table = reportOutput.querySelector('table');
    if (!table) return;

    let csv = [];
    const rows = table.querySelectorAll('tr');

    rows.forEach(row => {
        const cols = row.querySelectorAll('th, td');
        const rowData = Array.from(cols).map(col => `"${col.textContent.replace(/"/g, '""')}"`);
        csv.push(rowData.join(','));
    });

    const csvContent = csv.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${reportType}_${year}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function initializeModal(modalId, inputId) {
    const modal = document.getElementById(modalId);
    const modalInstance = new bootstrap.Modal(modal);
    let previousActiveElement;

    modal.addEventListener('show.bs.modal', function () {
        previousActiveElement = document.activeElement;
    });

    modal.addEventListener('shown.bs.modal', function () {
        document.getElementById(inputId).focus();
    });

    modal.addEventListener('hidden.bs.modal', function () {
        if (previousActiveElement) {
            previousActiveElement.focus();
        }
    });

    return modalInstance;
}

function loadEmployeeDirectory() {
    const html = `
        <div class="row">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-header">
                        <h4>Employee Directory</h4>
                    </div>
                    <div class="card-body">
                        <div class="row mb-3">
                            <div class="col-md-4">
                                <input type="text" class="form-control" id="searchEmployee" placeholder="Search by name...">
                            </div>
                            <div class="col-md-4">
                                <select class="form-select" id="departmentFilterDirectory">
                                    <option value="all">All Departments</option>
                                    <option value="Department A">Department A</option>
                                    <option value="Department B">Department B</option>
                                    <option value="Department C">Department C</option>
                                    <option value="Department D">Department D</option>
                                    <option value="Department E">Department E</option>
                                </select>
                            </div>
                        </div>
                        <div class="row" id="employeeCards">
                            <div class="col-12 text-center">Loading...</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="modal fade" id="employeeDetailsModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Employee Details</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body" id="employeeDetailsContent">
                        <p>Loading...</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('dashboardContent').innerHTML = html;

    const modalInstance = initializeModal('employeeDetailsModal', null);

    let allEmployees = [];

    database.ref('users').once('value').then(snapshot => {
        const employeeCards = document.getElementById('employeeCards');
        employeeCards.innerHTML = '';

        if (!snapshot.exists()) {
            employeeCards.innerHTML = '<div class="col-12 text-center">No employees found</div>';
            return;
        }

        snapshot.forEach(user => {
            const userData = user.val();
            userData.id = user.key;
            allEmployees.push(userData);
        });

        renderEmployeeCards(allEmployees);

        document.getElementById('searchEmployee').addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filteredEmployees = allEmployees.filter(employee =>
                employee.name.toLowerCase().includes(searchTerm)
            );
            renderEmployeeCards(filteredEmployees);
        });

        document.getElementById('departmentFilterDirectory').addEventListener('change', (e) => {
            const selectedDepartment = e.target.value;
            const filteredEmployees = selectedDepartment === 'all'
                ? allEmployees
                : allEmployees.filter(employee => employee.department === selectedDepartment);
            renderEmployeeCards(filteredEmployees);
        });
    }).catch(error => {
        console.error('Error loading employees:', error);
        showNotification({
            title: 'Error',
            text: 'Error loading employees: ' + error.message,
            icon: 'error'
        });
    });
}

function renderEmployeeCards(employees) {
    const employeeCards = document.getElementById('employeeCards');
    employeeCards.innerHTML = '';

    if (employees.length === 0) {
        employeeCards.innerHTML = '<div class="col-12 text-center">No employees found</div>';
        return;
    }

    employees.forEach(employee => {
        const card = document.createElement('div');
        card.className = 'col-md-4 mb-3';
        card.innerHTML = `
            <div class="card h-100">
                <div class="card-body text-center">
                    <div class="avatar avatar-lg bg-primary text-white rounded-circle mb-3">
                        ${getInitials(employee.name)}
                    </div>
                    <h5 class="card-title">${employee.name}</h5>
                    <p class="card-text">${employee.jobTitle || 'N/A'}</p>
                    <p class="card-text">${employee.department || 'Not assigned'}</p>
                    <button class="btn btn-primary" onclick="showEmployeeDetails('${employee.id}')">View Details</button>
                </div>
            </div>
        `;
        employeeCards.appendChild(card);
    });
}

function getInitials(name) {
    return name.split(' ').map(word => word.charAt(0)).join('').toUpperCase();
}

async function showEmployeeDetails(userId) {
    try {
        const userSnapshot = await database.ref(`users/${userId}`).once('value');
        const userData = userSnapshot.val();

        if (!userData) {
            showNotification({
                title: 'Error',
                text: 'Employee not found',
                icon: 'error'
            });
            return;
        }

        const detailsHtml = `
            <div class="text-center mb-3">
                <div class="avatar avatar-lg bg-primary text-white rounded-circle">
                    ${getInitials(userData.name)}
                </div>
                <h4 class="mt-2">${userData.name}</h4>
            </div>
            <p><strong>Email:</strong> ${userData.email}</p>
            <p><strong>Role:</strong> ${userData.role}</p>
            <p><strong>Department:</strong> ${userData.department || 'Not assigned'}</p>
            <p><strong>Job Title:</strong> ${userData.jobTitle || 'N/A'}</p>
            <p><strong>Employee ID:</strong> ${userData.employeeId || 'N/A'}</p>
            <p><strong>Phone:</strong> ${userData.phone || 'N/A'}</p>
            <p><strong>Location:</strong> ${userData.location || 'N/A'}</p>
            <p><strong>Start Date:</strong> ${userData.startDate || 'N/A'}</p>
            <p><strong>Employment Type:</strong> ${userData.employmentType || 'N/A'}</p>
            <p><strong>Manager:</strong> ${userData.manager || 'Not assigned'}</p>
        `;

        document.getElementById('employeeDetailsContent').innerHTML = detailsHtml;
        const modal = bootstrap.Modal.getInstance(document.getElementById('employeeDetailsModal'));
        modal.show();
    } catch (error) {
        console.error('Error loading employee details:', error);
        showNotification({
            title: 'Error',
            text: 'Error loading employee details: ' + error.message,
            icon: 'error'
        });
    }
}