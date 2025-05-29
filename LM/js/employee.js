// Employee-specific functions
function loadApplyLeave() {
    const auth = window.firebaseShared.getAuth();
    const database = window.firebaseShared.getDatabase();
    
    const html = `
        <div class="row">
            <div class="col-md-8 mx-auto">
                <div class="card">
                    <div class="card-header">
                        <h4>Apply for Leave</h4>
                    </div>
                    <div class="card-body">
                        <form id="leaveApplicationForm">
                            <div class="mb-3">
                                <label for="leaveType" class="form-label">Leave Type</label>
                                <select class="form-select" id="leaveType" required>
                                    <option value="">Select leave type</option>
                                </select>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label for="startDate" class="form-label">Start Date</label>
                                    <input type="date" class="form-control" id="startDate" required>
                                </div>
                                <div class="col-md-6">
                                    <label for="endDate" class="form-label">End Date</label>
                                    <input type="date" class="form-control" id="endDate" required>
                                </div>
                            </div>
                            <div class="mb-3">
                                <label for="reason" class="form-label">Reason</label>
                                <textarea class="form-control" id="reason" rows="3" required></textarea>
                            </div>
                            <div class="d-grid gap-2">
                                <button type="submit" class="btn btn-primary">Submit Request</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('dashboardContent').innerHTML = html;
    
    // Load leave types
    const leaveTypeSelect = document.getElementById('leaveType');
    const loadedTypes = new Set(); // Keep track of loaded types to prevent duplicates
    
    database.ref('leave_types').once('value').then(snapshot => {
        if (snapshot.exists()) {
            // Clear any existing options except the default one
            while (leaveTypeSelect.options.length > 1) {
                leaveTypeSelect.remove(1);
            }
            
            snapshot.forEach(type => {
                const typeData = type.val();
                const typeId = type.key;
                
                // Check if this type has already been added
                if (!loadedTypes.has(typeId)) {
                    const option = document.createElement('option');
                    option.value = typeId;
                    option.textContent = typeData.name;
                    leaveTypeSelect.appendChild(option);
                    loadedTypes.add(typeId);
                }
            });
        }
    });
    
    // Handle form submission
    document.getElementById('leaveApplicationForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const leaveTypeId = document.getElementById('leaveType').value;
        const reason = document.getElementById('reason').value;
        
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');
            
            // Get the leave type name
            const leaveTypeSnapshot = await database.ref('leave_types/' + leaveTypeId).once('value');
            const leaveTypeName = leaveTypeSnapshot.val()?.name || 'Unknown';
            
            const leaveRequest = {
                userId: user.uid,
                startDate: startDate,
                endDate: endDate,
                leaveTypeId: leaveTypeId,
                leaveTypeName: leaveTypeName, // Store both ID and name
                reason: reason,
                status: 'pending',
                createdAt: firebase.database.ServerValue.TIMESTAMP
            };
            
            await database.ref('leave_requests').push(leaveRequest);
            alert('Leave request submitted successfully');
            document.getElementById('leaveApplicationForm').reset();
        } catch (error) {
            console.error('Error submitting leave request:', error);
            alert('Error submitting leave request: ' + error.message);
        }
    });
}

function loadLeaveStatus() {
    const auth = window.firebaseShared.getAuth();
    const database = window.firebaseShared.getDatabase();
    const user = auth.currentUser;
    if (!user) return;
    
    const html = `
        <div class="row">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-header">
                        <h4>My Leave Requests</h4>
                    </div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-striped">
                                <thead>
                                    <tr>
                                        <th>Leave Type</th>
                                        <th>Start Date</th>
                                        <th>End Date</th>
                                        <th>Days</th>
                                        <th>Reason</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="leaveRequestsTable">
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
    
    // Load leave requests
    database.ref('leave_requests')
        .orderByChild('userId')
        .equalTo(user.uid)
        .once('value')
        .then(snapshot => {
            const tableBody = document.getElementById('leaveRequestsTable');
            tableBody.innerHTML = '';
            
            if (!snapshot.exists()) {
                tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No leave requests found</td></tr>';
                return;
            }
            
            snapshot.forEach(request => {
                const reqData = request.val();
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${reqData.leaveTypeName || 'Unknown'}</td>
                    <td>${formatDate(reqData.startDate)}</td>
                    <td>${formatDate(reqData.endDate)}</td>
                    <td>${calculateDays(reqData.startDate, reqData.endDate)}</td>
                    <td>${reqData.reason}</td>
                    <td><span class="badge ${getStatusClass(reqData.status)}">${reqData.status}</span></td>
                    <td>
                        ${reqData.status === 'pending' ? 
                            `<button class="btn btn-sm btn-danger cancel-btn" data-id="${request.key}">Cancel</button>` : 
                            ''}
                    </td>
                `;
                tableBody.appendChild(row);
            });
            
            // Add event listeners to cancel buttons
            document.querySelectorAll('.cancel-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const requestId = this.getAttribute('data-id');
                    cancelLeaveRequest(requestId);
                });
            });
        });
}

function cancelLeaveRequest(requestId) {
    const auth = window.firebaseShared.getAuth();
    const database = window.firebaseShared.getDatabase();
    const user = auth.currentUser;
    if (!user) return;
    
    if (confirm('Are you sure you want to cancel this leave request?')) {
        database.ref('leave_requests/' + requestId).update({
            status: 'cancelled',
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        }).then(() => {
            alert('Leave request cancelled successfully');
            loadLeaveStatus();
        }).catch(error => {
            console.error('Error cancelling leave request:', error);
            alert('Error cancelling leave request: ' + error.message);
        });
    }
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