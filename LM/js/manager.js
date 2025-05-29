// Manager-specific functions
function loadApprovals() {
    const auth = window.firebaseShared.getAuth();
    const database = window.firebaseShared.getDatabase();
    const user = auth.currentUser;
    if (!user) return;
    
    const html = `
        <div class="row">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-header">
                        <h4>Pending Approvals</h4>
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
                                        <th>Reason</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="approvalsTable">
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
    `;
    
    document.getElementById('dashboardContent').innerHTML = html;
    
    // Load pending approvals
    database.ref('leave_requests')
        .orderByChild('status')
        .equalTo('pending')
        .once('value')
        .then(async snapshot => {
            const tableBody = document.getElementById('approvalsTable');
            tableBody.innerHTML = '';
            
            if (!snapshot.exists()) {
                tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No pending approvals</td></tr>';
                return;
            }
            
            const requests = [];
            snapshot.forEach(request => {
                requests.push({ key: request.key, ...request.val() });
            });
            
            // Load user data for each request
            for (const request of requests) {
                const userSnapshot = await database.ref('users/' + request.userId).once('value');
                const userData = userSnapshot.val();
                if (!userData) continue;
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${userData.name}</td>
                    <td>${request.leaveTypeName || 'Unknown'}</td>
                    <td>${formatDate(request.startDate)}</td>
                    <td>${formatDate(request.endDate)}</td>
                    <td>${calculateDays(request.startDate, request.endDate)}</td>
                    <td>${request.reason}</td>
                    <td>
                        <button class="btn btn-sm btn-success approve-btn" data-id="${request.key}">Approve</button>
                        <button class="btn btn-sm btn-danger reject-btn" data-id="${request.key}">Reject</button>
                    </td>
                `;
                tableBody.appendChild(row);
            }
            
            // Add event listeners to buttons
            document.querySelectorAll('.approve-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const requestId = this.getAttribute('data-id');
                    updateLeaveRequestStatus(requestId, 'approved');
                });
            });
            
            document.querySelectorAll('.reject-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const requestId = this.getAttribute('data-id');
                    updateLeaveRequestStatus(requestId, 'rejected');
                });
            });
        });
}

function loadTeamLeave() {
    const auth = window.firebaseShared.getAuth();
    const database = window.firebaseShared.getDatabase();
    const user = auth.currentUser;
    if (!user) return;
    
    const html = `
        <div class="row">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-header">
                        <h4>Team Leave Overview</h4>
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
                                <tbody id="teamLeaveTable">
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
    
    // Load team leave data
    loadTeamLeaveData().then(teamData => {
        const tableBody = document.getElementById('teamLeaveTable');
        tableBody.innerHTML = ''; // Clear existing content
        
        if (teamData.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No leave data found</td></tr>';
            return;
        }
        
        // Remove duplicates based on a unique combination of properties
        const uniqueData = teamData.filter((item, index, self) =>
            index === self.findIndex((t) => (
                t.employeeName === item.employeeName &&
                t.startDate === item.startDate &&
                t.endDate === item.endDate &&
                t.status === item.status
            ))
        );
        
        uniqueData.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.employeeName}</td>
                <td>${item.leaveTypeName || 'Unknown'}</td>
                <td>${formatDate(item.startDate)}</td>
                <td>${formatDate(item.endDate)}</td>
                <td>${calculateDays(item.startDate, item.endDate)}</td>
                <td><span class="badge ${getStatusClass(item.status)}">${item.status}</span></td>
            `;
            tableBody.appendChild(row);
        });
    });
}

function loadTeamLeaveData() {
    const auth = window.firebaseShared.getAuth();
    const database = window.firebaseShared.getDatabase();
    const user = auth.currentUser;
    if (!user) return Promise.resolve([]);
    
    return database.ref('leave_requests').once('value').then(async snapshot => {
        const teamData = [];
        const processedRequests = new Set(); // Track processed requests
        
        if (!snapshot.exists()) {
            return teamData;
        }
        
        const requests = [];
        snapshot.forEach(request => {
            requests.push({ key: request.key, ...request.val() });
        });
        
        // Load user data for each request
        for (const request of requests) {
            // Skip if we've already processed this request
            if (processedRequests.has(request.key)) continue;
            processedRequests.add(request.key);
            
            const userSnapshot = await database.ref('users/' + request.userId).once('value');
            const userData = userSnapshot.val();
            if (!userData) continue;
            
            teamData.push({
                employeeName: userData.name,
                leaveTypeName: request.leaveTypeName,
                startDate: request.startDate,
                endDate: request.endDate,
                days: calculateDays(request.startDate, request.endDate),
                status: request.status
            });
        }
        
        return teamData;
    });
}

function updateLeaveRequestStatus(requestId, status) {
    const auth = window.firebaseShared.getAuth();
    const database = window.firebaseShared.getDatabase();
    const user = auth.currentUser;
    if (!user) return;
    
    database.ref('leave_requests/' + requestId).update({
        status: status,
        updatedAt: firebase.database.ServerValue.TIMESTAMP,
        updatedBy: user.uid
    }).then(() => {
        alert(`Leave request ${status} successfully`);
        loadApprovals();
    }).catch(error => {
        console.error('Error updating leave request:', error);
        alert('Error updating leave request: ' + error.message);
    });
}

function calculateDays(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

function getStatusClass(status) {
    switch(status) {
        case 'approved': return 'bg-success';
        case 'rejected': return 'bg-danger';
        case 'pending': return 'bg-warning';
        case 'cancelled': return 'bg-secondary';
        default: return 'bg-secondary';
    }
}

// Helper function to get color based on status
function getStatusColor(status) {
    switch(status.toLowerCase()) {
        case 'approved': return '#28a745';  // green
        case 'pending': return '#ffc107';   // yellow
        case 'rejected': return '#dc3545';  // red
        case 'cancelled': return '#6c757d'; // grey
        default: return '#6c757d';
    }
}