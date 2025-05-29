//script.js

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

// Dashboard initialization - will be called by auth.js after successful login and user data load
function initDashboard() {
    console.log("Initializing dashboard...");
    
    const database = window.firebaseShared.getDatabase();
    if (!database) {
        console.error("Database not initialized");
        return;
    }
    
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
    const user = firebase.auth().currentUser;
    if (!user) return;
    
    const database = window.firebaseShared.getDatabase();
    if (!database) return;
    
    // Get role from session storage or window object
    const role = window.userRole || sessionStorage.getItem('userRole') || 'employee';
    console.log('Loading dashboard for role:', role);
    
    database.ref('users/' + user.uid).once('value')
        .then(snapshot => {
            const userData = snapshot.val();
            if (!userData) return;
            
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
                html += adminDashboardHTML();
                dashboardContent.innerHTML = html;
                loadAdminDashboardData();
            } else if (role === 'manager') {
                html += managerDashboardHTML();
                dashboardContent.innerHTML = html;
                loadManagerDashboardData(user.uid);
            } else {
                html += employeeDashboardHTML();
                dashboardContent.innerHTML = html;
                loadEmployeeDashboardData(user.uid);
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
        
        document.getElementById('availableLeave').textContent = totalRemaining;
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
            
            document.getElementById('upcomingLeaves').textContent = upcoming;
            document.getElementById('pendingRequests').textContent = pending;
        });
}

function loadManagerDashboardData(userId) {
    // Get pending approvals
    const database = window.firebaseShared.getDatabase();
    if (!database) return;
    
    database.ref('leave_requests').orderByChild('status').equalTo('pending')
        .once('value').then(snapshot => {
            document.getElementById('pendingApprovals').textContent = snapshot.numChildren();
        });
    
    // Get team members count
    database.ref('users').orderByChild('managerId').equalTo(userId)
        .once('value').then(snapshot => {
            document.getElementById('teamMembers').textContent = snapshot.numChildren();
        });
}

function loadAdminDashboardData() {
    // Get total users
    const database = window.firebaseShared.getDatabase();
    if (!database) return;
    
    database.ref('users').once('value').then(snapshot => {
        document.getElementById('totalUsers').textContent = snapshot.numChildren();
    });
    
    // Get active requests
    database.ref('leave_requests').once('value').then(snapshot => {
        document.getElementById('activeRequests').textContent = snapshot.numChildren();
    });
}

// Placeholder functions for other sections
function loadApplyLeave() {
    // Implementation for apply leave form
}

function loadLeaveStatus() {
    // Implementation for leave status
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
    // Implementation for approvals
}

function loadTeamLeave() {
    // Implementation for team leave
}

function loadUserManagement() {
    // Implementation for user management
}

function loadLeaveTypes() {
    // Implementation for leave types
}

function loadAssignLeave() {
    // Implementation for assign leave
}

function loadCompanyHolidays() {
    // Implementation for company holidays
}

function loadReports() {
    // Implementation for reports
}