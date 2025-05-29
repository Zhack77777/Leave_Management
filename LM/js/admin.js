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
                        <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#addUserModal">
                            Add New User
                        </button>
                    </div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-striped">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Joined</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="usersTable">
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
        
        <!-- Add User Modal -->
        <div class="modal fade" id="addUserModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Add New User</h5>
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
                                    <option value="employee">Employee</option>
                                    <option value="manager">Manager</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div class="d-grid gap-2">
                                <button type="submit" class="btn btn-primary">Create User</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('dashboardContent').innerHTML = html;
    
    // Load users
    database.ref('users').once('value').then(snapshot => {
        const tableBody = document.getElementById('usersTable');
        tableBody.innerHTML = '';
        
        if (!snapshot.exists()) {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No users found</td></tr>';
            return;
        }
        
        snapshot.forEach(user => {
            const userData = user.val();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${userData.name}</td>
                <td>${userData.email}</td>
                <td>${userData.role}</td>
                <td>${formatDate(userData.createdAt)}</td>
                <td>
                    <button class="btn btn-sm btn-warning edit-btn" data-id="${user.key}">Edit</button>
                    <button class="btn btn-sm btn-danger delete-btn" data-id="${user.key}">Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
        
        // Add event listeners to buttons
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const userId = this.getAttribute('data-id');
                editUser(userId);
            });
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const userId = this.getAttribute('data-id');
                deleteUser(userId);
            });
        });
    });
    
    // Add user form submission
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
                $('#addUserModal').modal('hide');
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