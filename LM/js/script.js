// script.js

// Wait for Firebase and shared module to be ready
function waitForFirebase() {
    return new Promise((resolve, reject) => {
        const checkFirebase = () => {
            if (typeof firebase !== 'undefined' && window.firebaseShared && window.firebaseShared.isInitialized) {
                console.log('Firebase and shared module are ready in script.js');
                resolve(window.firebaseShared.getDatabase());
            } else {
                console.log('Waiting for Firebase initialization in script.js...');
                setTimeout(checkFirebase, 100);
            }
        };
        checkFirebase();
    });
}

// Initialize when DOM is ready
async function initialize() {
    try {
        // Wait for Firebase to be ready and get database instance
        await waitForFirebase();
        console.log('Database initialized in script.js');
    } catch (error) {
        console.error("Error initializing Firebase in script.js:", error);
    }
}

// Start initialization when the document is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}

// Add this after initialize function
function initializeProfile() {
    const profileBtn = document.getElementById('profileBtn');
    const profilePictureInput = document.getElementById('profilePictureInput');
    
    if (profileBtn) {
        profileBtn.addEventListener('click', showProfile);
    }
    
    if (profilePictureInput) {
        profilePictureInput.addEventListener('change', handleProfilePictureUpload);
    }
}

// Add this function to handle profile picture upload
async function handleProfilePictureUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
        showNotification({
            title: 'Error',
            text: 'Please select an image file',
            icon: 'error'
        });
        return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showNotification({
            title: 'Error',
            text: 'Image size should be less than 5MB',
            icon: 'error'
        });
        return;
    }

    try {
        const auth = window.firebaseShared.getAuth();
        const database = window.firebaseShared.getDatabase();
        const user = auth.currentUser;
        
        if (!user) return;

        // Convert image to base64
        const reader = new FileReader();
        reader.onload = async function(e) {
            const base64Image = e.target.result;
            
            // Update profile picture in database
            await database.ref(`users/${user.uid}/profilePicture`).set(base64Image);
            
            // Update UI in profile modal
            document.getElementById('profilePicture').src = base64Image;
            document.getElementById('profileInitials').style.display = 'none';

            // Update sidebar profile
            const sidebarAvatar = document.createElement('img');
            sidebarAvatar.src = base64Image;
            sidebarAvatar.className = 'w-100 h-100 rounded-circle';
            
            const sidebarInitials = document.getElementById('sidebarInitials');
            const sidebarAvatarContainer = sidebarInitials.parentElement;
            
            // Replace initials with image in sidebar
            sidebarInitials.style.display = 'none';
            if (!sidebarAvatarContainer.querySelector('img')) {
                sidebarAvatarContainer.insertBefore(sidebarAvatar, sidebarInitials);
            } else {
                sidebarAvatarContainer.querySelector('img').src = base64Image;
            }
            
            showNotification({
                title: 'Success',
                text: 'Profile picture updated successfully',
                icon: 'success'
            });
        };
        reader.readAsDataURL(file);

    } catch (error) {
        console.error('Error uploading profile picture:', error);
        showNotification({
            title: 'Error',
            text: 'Error uploading profile picture',
            icon: 'error'
        });
    }
}

// Update showProfile function to handle profile picture
async function showProfile() {
    const auth = window.firebaseShared.getAuth();
    const database = window.firebaseShared.getDatabase();
    const user = auth.currentUser;
    
    if (!user) return;

    try {
        // Fetch user data
        const userSnapshot = await database.ref(`users/${user.uid}`).once('value');
        const userData = userSnapshot.val();

        if (!userData) {
            console.error('No user data found');
            return;
        }

        // Set profile picture or initials
        const profilePicture = document.getElementById('profilePicture');
        const profileInitials = document.getElementById('profileInitials');
        
        if (userData.profilePicture) {
            profilePicture.src = userData.profilePicture;
            profileInitials.style.display = 'none';
        } else {
            profilePicture.src = 'images/default-avatar.png';
            // Set user initials
            const initials = userData.name
                .split(' ')
                .map(word => word[0])
                .join('')
                .toUpperCase()
                .substring(0, 2);
            profileInitials.textContent = initials;
            profileInitials.style.display = 'flex';
        }

        // Set personal information
        document.getElementById('profileFullName').textContent = userData.name || 'Not specified';
        document.getElementById('profileEmail').textContent = userData.email || 'Not specified';
        document.getElementById('profilePhone').textContent = userData.phone || 'Not specified';
        document.getElementById('profileLocation').textContent = userData.location || 'Not specified';

        // Set employment details
        document.getElementById('profileEmployeeId').textContent = userData.employeeId || 'Not specified';
        document.getElementById('profileJobTitle').textContent = userData.jobTitle || 'Not specified';
        document.getElementById('profileDepartment').textContent = userData.department || 'Not specified';
        document.getElementById('profileManager').textContent = userData.manager || 'Not specified';
        document.getElementById('profileStartDate').textContent = userData.startDate || 'Not specified';
        document.getElementById('profileEmploymentType').textContent = userData.employmentType || 'Not specified';

        // Fetch and display leave balance
        const currentYear = new Date().getFullYear();
        const leaveBalanceSnapshot = await database.ref('leave_balances')
            .orderByChild('userId')
            .equalTo(user.uid)
            .once('value');
        
        const leaveBalanceTable = document.getElementById('profileLeaveBalance');
        leaveBalanceTable.innerHTML = '';

        if (leaveBalanceSnapshot.exists()) {
            const leaveTypes = {};
            
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
        const profileModal = new bootstrap.Modal(document.getElementById('profileModal'));
        profileModal.show();

    } catch (error) {
        console.error('Error loading profile:', error);
        showNotification({
            title: 'Error',
            text: 'Error loading profile information',
            icon: 'error'
        });
    }
}

// Update the updateSidebarProfile function
function updateSidebarProfile(userData) {
    if (!userData) return;

    // Set initials
    const initials = userData.name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
    
    const sidebarInitials = document.getElementById('sidebarInitials');
    const sidebarUserName = document.getElementById('sidebarUserName');
    const sidebarUserRole = document.getElementById('sidebarUserRole');
    const sidebarUserDepartment = document.getElementById('sidebarUserDepartment');

    // Handle profile picture in sidebar
    if (userData.profilePicture) {
        const sidebarAvatar = document.createElement('img');
        sidebarAvatar.src = userData.profilePicture;
        sidebarAvatar.className = 'w-100 h-100 rounded-circle';
        
        const sidebarAvatarContainer = sidebarInitials.parentElement;
        sidebarInitials.style.display = 'none';
        
        if (!sidebarAvatarContainer.querySelector('img')) {
            sidebarAvatarContainer.insertBefore(sidebarAvatar, sidebarInitials);
        } else {
            sidebarAvatarContainer.querySelector('img').src = userData.profilePicture;
        }
    } else {
        if (sidebarInitials) {
            sidebarInitials.textContent = initials;
            sidebarInitials.style.display = 'flex';
            const existingImg = sidebarInitials.parentElement.querySelector('img');
            if (existingImg) {
                existingImg.remove();
            }
        }
    }

    if (sidebarUserName) sidebarUserName.textContent = userData.name;
    if (sidebarUserRole) sidebarUserRole.textContent = userData.role;
    if (sidebarUserDepartment) sidebarUserDepartment.textContent = userData.department || 'No Department';
}

// Dashboard initialization - will be called by auth.js after successful login and user data load
function initDashboard() {
    console.log("Initializing dashboard...");
    
    const database = window.firebaseShared.getDatabase();
    if (!database) {
        console.error("Database not initialized");
        return;
    }
    
    // Initialize profile functionality
    initializeProfile();
    
    // Sidebar toggle - using vanilla JS instead of jQuery
    const sidebarCollapse = document.getElementById('sidebarCollapse');
    if (sidebarCollapse) {
        sidebarCollapse.addEventListener('click', function() {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                sidebar.classList.toggle('active');
            }
        });
    }
    
    // Initial load
    loadSection();
    
    // Set up hash change listener
    window.addEventListener('hashchange', loadSection);
    
    // Navigation click handlers
    document.querySelectorAll('.list-unstyled li a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            window.location.hash = section;
            loadSection();
        });
    });
}

// Section loading
function loadSection() {
    const section = window.location.hash.substring(1) || 'dashboard';
    console.log("Loading section:", section);
    
    // Update active nav item
    document.querySelectorAll('.list-unstyled li').forEach(item => {
        item.classList.remove('active');
    });
    
    const activeLink = document.querySelector(`.list-unstyled li a[data-section="${section}"]`);
    if (activeLink) {
        activeLink.parentElement.classList.add('active');
    }
    
    // Update section title
    const sectionTitle = document.getElementById('sectionTitle');
    if (sectionTitle) {
        sectionTitle.textContent = section.replace('-', ' ');
    }
    
    // Clear previous content
    const dashboardContent = document.getElementById('dashboardContent');
    if (dashboardContent) {
        dashboardContent.innerHTML = '';
        
        // Load appropriate content
        switch(section) {
            case 'dashboard':
                loadDashboard();
                break;
            case 'time-clock':
                loadTimeClock();
                break;
            case 'apply-leave':
                loadApplyLeave();
                break;
            case 'leave-status':
                loadLeaveStatus();
                break;
            case 'team-calendar':
                loadTeamCalendar();
                break;
            case 'approvals':
                loadApprovals();
                break;
            case 'team-leave':
                loadTeamLeave();
                break;
            case 'user-management':
                loadUserManagement();
                break;
            case 'employee-directory':
                loadEmployeeDirectory();
                break;
            case 'leave-types':
                loadLeaveTypes();
                break;
            case 'assign-leave':
                loadAssignLeave();
                break;
            case 'company-holidays':
                loadCompanyHolidays();
                break;
            case 'reports':
                loadReports();
                break;
            case 'attendance':
                loadAttendanceSection();
                break;
            default:
                loadDashboard();
        }
    } else {
        console.error('Dashboard content element not found');
    }
}

// Dashboard HTML generators
function employeeDashboardHTML() {
    return `
        <div class="row">
            <div class="col-md-4">
                <div class="card text-white bg-primary mb-3">
                    <div class="card-header">Available Leave</div>
                    <div class="card-body">
                        <h5 class="card-title" id="availableLeave">Loading...</h5>
                        <p class="card-text">Days remaining</p>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card text-white bg-success mb-3">
                    <div class="card-header">Upcoming Leaves</div>
                    <div class="card-body">
                        <h5 class="card-title" id="upcomingLeaves">0</h5>
                        <p class="card-text">Approved leaves</p>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card text-white bg-info mb-3">
                    <div class="card-header">Pending Requests</div>
                    <div class="card-body">
                        <h5 class="card-title" id="pendingRequests">0</h5>
                        <p class="card-text">Waiting for approval</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function managerDashboardHTML() {
    return `
        <div class="row">
            <div class="col-md-4">
                <div class="card text-white bg-warning mb-3">
                    <div class="card-header">Pending Approvals</div>
                    <div class="card-body">
                        <h5 class="card-title" id="pendingApprovals">0</h5>
                        <p class="card-text">Requests to review</p>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card text-white bg-secondary mb-3">
                    <div class="card-header">Team Members</div>
                    <div class="card-body">
                        <h5 class="card-title" id="teamMembers">0</h5>
                        <p class="card-text">In your team</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function adminDashboardHTML() {
    return `
        <div class="row">
            <div class="col-md-4">
                <div class="card text-white bg-danger mb-3">
                    <div class="card-header">Total Users</div>
                    <div class="card-body">
                        <h5 class="card-title" id="totalUsers">0</h5>
                        <p class="card-text">In the system</p>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card text-white bg-dark mb-3">
                    <div class="card-header">Active Leave Requests</div>
                    <div class="card-body">
                        <h5 class="card-title" id="activeRequests">0</h5>
                        <p class="card-text">Across organization</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Dashboard loading functions
function loadDashboard() {
    console.log('loadDashboard called');
    const user = firebase.auth().currentUser;
    if (!user) return;
    
    const database = window.firebaseShared.getDatabase();
    if (!database) return;
    
    database.ref('users/' + user.uid).once('value')
        .then(snapshot => {
            const userData = snapshot.val();
            if (!userData) return;
            
            // Use role from userData if available, otherwise fallback
            const role = (userData.role || window.userRole || sessionStorage.getItem('userRole') || 'employee').toString().trim().toLowerCase();
            console.log('UserData.role:', userData.role, '| Normalized role:', role, '| typeof:', typeof role);
            
            // Update sidebar profile
            updateSidebarProfile(userData);
            
            const dashboardContent = document.getElementById('dashboardContent');
            if (!dashboardContent) return;
            
            let html = `
                <div class="row">
                    <div class="col-md-12">
                        <div class="card">
                            <div class="card-header">
                                <h4>Welcome, ${userData.name}</h4>
                            </div>
                            <div class="card-body">
                                <p>You are logged in as <strong>${userData.role}</strong>.</p>
                `;
            
            // Use the role to determine which dashboard to show
            if (role === 'admin') {
                console.log('Rendering admin dashboard');
                html += adminDashboardHTML();
                dashboardContent.innerHTML = html;
                loadAdminDashboardData();
            } else if (role === 'manager') {
                console.log('Rendering manager dashboard');
                html += managerDashboardHTML();
                dashboardContent.innerHTML = html;
                loadManagerDashboardData(user.uid);
            } else if (role === 'employee' || role === 'user') {
                console.log('Rendering employee dashboard');
                html += employeeDashboardHTML();
                dashboardContent.innerHTML = html;
                loadEmployeeDashboardData(user.uid);
            } else {
                console.log('Rendering access denied branch');
                console.trace();
                dashboardContent.innerHTML = '<div class="alert alert-danger">Access denied. Admins only.</div>';
            }
        })
        .catch(error => {
            console.error("Error loading user data:", error);
        });
}

// Data loading functions
function loadEmployeeDashboardData(userId) {
    // Get leave balance
    const database = window.firebaseShared.getDatabase();
    if (!database) return;
    
    // Get current year
    const currentYear = new Date().getFullYear();
    
    // Get all leave balances for the user
    database.ref('leave_balances').orderByChild('userId').equalTo(userId).once('value').then(snapshot => {
        let totalRemaining = 0;
        
        if (snapshot.exists()) {
            snapshot.forEach(balance => {
                const balanceData = balance.val();
                // Only count balances for current year
                if (balanceData.year === currentYear) {
                    totalRemaining += balanceData.remainingDays || 0;
                }
            });
        }
        const availableLeaveElem = document.getElementById('availableLeave');
        if (availableLeaveElem) availableLeaveElem.textContent = totalRemaining;
    });
    
    // Get upcoming leaves
    database.ref('leave_requests').orderByChild('userId').equalTo(userId)
        .once('value').then(snapshot => {
            let upcoming = 0;
            let pending = 0;
            const today = new Date().toISOString().split('T')[0];
            
            snapshot.forEach(request => {
                const reqData = request.val();
                if (reqData.status === 'approved' && reqData.startDate >= today) {
                    upcoming++;
                } else if (reqData.status === 'pending') {
                    pending++;
                }
            });
            const upcomingLeavesElem = document.getElementById('upcomingLeaves');
            if (upcomingLeavesElem) upcomingLeavesElem.textContent = upcoming;
            const pendingRequestsElem = document.getElementById('pendingRequests');
            if (pendingRequestsElem) pendingRequestsElem.textContent = pending;
        });
}

function loadManagerDashboardData(userId) {
    // Get pending approvals
    const database = window.firebaseShared.getDatabase();
    if (!database) return;
    
    database.ref('leave_requests').orderByChild('status').equalTo('pending')
        .once('value').then(snapshot => {
            const pendingApprovalsElem = document.getElementById('pendingApprovals');
            if (pendingApprovalsElem) pendingApprovalsElem.textContent = snapshot.numChildren();
        });
    
    // Get team members count
    database.ref('users').orderByChild('managerId').equalTo(userId)
        .once('value').then(snapshot => {
            const teamMembersElem = document.getElementById('teamMembers');
            if (teamMembersElem) teamMembersElem.textContent = snapshot.numChildren();
        });
}

function loadAdminDashboardData() {
    // Get total users
    const database = window.firebaseShared.getDatabase();
    if (!database) return;
    
    database.ref('users').once('value').then(snapshot => {
        const totalUsersElem = document.getElementById('totalUsers');
        if (totalUsersElem) totalUsersElem.textContent = snapshot.numChildren();
    });
    
    // Get active requests
    database.ref('leave_requests').once('value').then(snapshot => {
        const activeRequestsElem = document.getElementById('activeRequests');
        if (activeRequestsElem) activeRequestsElem.textContent = snapshot.numChildren();
    });
}

// Placeholder functions for other sections
function loadApplyLeave() {
    // Implementation in employee.js
}

function loadLeaveStatus() {
    // Implementation in employee.js
}

function loadTeamCalendar() {
    const auth = window.firebaseShared.getAuth();
    const database = window.firebaseShared.getDatabase();
    const user = auth.currentUser;
    if (!user) return;

    const html = `
        <div class="row">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-header">
                        <h4>Team Calendar</h4>
                    </div>
                    <div class="card-body">
                        <div id="teamCalendar"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('dashboardContent').innerHTML = html;
    
    // Load team leave data and holidays
    Promise.all([
        database.ref('leave_requests').once('value'),
        database.ref('holidays').once('value'),
        database.ref('users').once('value')
    ]).then(([leaveSnapshot, holidaysSnapshot, usersSnapshot]) => {
        const calendarEl = document.getElementById('teamCalendar');
        const events = [];
        const users = {};
        
        // Create users lookup object
        usersSnapshot.forEach(user => {
            users[user.key] = user.val();
        });
        
        // Add leave requests to events
        if (leaveSnapshot.exists()) {
            leaveSnapshot.forEach(request => {
                const leaveData = request.val();
                const userData = users[leaveData.userId];
                
                if (userData && leaveData.status === 'approved') {
                    events.push({
                        title: `${userData.name} - ${leaveData.leaveTypeName || 'Leave'}`,
                        start: leaveData.startDate,
                        end: leaveData.endDate,
                        backgroundColor: '#28a745',
                        borderColor: '#28a745',
                        extendedProps: {
                            status: leaveData.status,
                            employeeName: userData.name,
                            leaveType: leaveData.leaveTypeName
                        }
                    });
                }
            });
        }

        // Add company holidays to events
        if (holidaysSnapshot.exists()) {
            holidaysSnapshot.forEach(holiday => {
                const holidayData = holiday.val();
                events.push({
                    title: `🏢 ${holidayData.name}`,
                    start: holidayData.date,
                    end: holidayData.date,
                    allDay: true,
                    backgroundColor: '#FF9800',
                    borderColor: '#F57C00',
                    classNames: ['company-holiday'],
                    extendedProps: {
                        type: 'holiday',
                        description: holidayData.description
                    }
                });
            });
        }

        // Initialize FullCalendar
        const calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,listWeek'
            },
            events: events,
            eventDidMount: function(info) {
                // Add tooltips to events
                const tooltip = info.event.extendedProps.type === 'holiday' 
                    ? `${info.event.title}\n${info.event.extendedProps.description || ''}`
                    : `${info.event.extendedProps.employeeName}\n${info.event.extendedProps.leaveType}\nStatus: ${info.event.extendedProps.status}`;
                
                $(info.el).tooltip({
                    title: tooltip,
                    placement: 'top',
                    trigger: 'hover',
                    container: 'body'
                });
            }
        });

        calendar.render();
    }).catch(error => {
        console.error('Error loading calendar data:', error);
        document.getElementById('teamCalendar').innerHTML = 
            '<div class="alert alert-danger">Error loading calendar data. Please try again later.</div>';
    });
}

function loadApprovals() {
    // Implementation in manager.js
}

function loadTeamLeave() {
    // Implementation in manager.js or admin.js
}

function loadUserManagement() {
    // Implementation in admin.js
}

function loadEmployeeDirectory() {
    // Implementation in admin.js
}

function loadLeaveTypes() {
    // Implementation in admin.js
}

function loadAssignLeave() {
    // Implementation in admin.js
}

function loadCompanyHolidays() {
    // Implementation in admin.js
}

function loadReports() {
    // Implementation in admin.js
}

// Add this at the end of your main script.js or after Firebase is initialized
waitForFirebase().then(() => {
    const auth = window.firebaseShared.getAuth();
    auth.onAuthStateChanged(function(user) {
        if (user) {
            loadSection();
        } else {
            Swal.fire({
                title: 'Error',
                text: 'User not authenticated',
                icon: 'error'
            });
            window.location.href = 'index.html';
        }
    });
});

// Add the loadAttendanceSection function
function loadAttendanceSection() {
    const dashboardContent = document.getElementById('dashboardContent');
    if (!dashboardContent) return;
    dashboardContent.innerHTML = `
        <div class="row mb-3">
            <div class="col-md-4">
                <label for="attendanceDepartment" class="form-label">Filter by Department</label>
                <select id="attendanceDepartment" class="form-select">
                    <option value="">All Departments</option>
                </select>
            </div>
        </div>
        <div class="row">
            <div class="col-12">
                <div class="card">
                    <div class="card-header">
                        <h4>Attendance Calendar</h4>
                    </div>
                    <div class="card-body">
                        <div id="attendanceCalendar"></div>
                        <div id="attendanceRecords" class="mt-4"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
    // Call the admin.js logic to load the calendar and records
    if (typeof window.loadAdminAttendance === 'function') {
        window.loadAdminAttendance();
    }
}