// employee.js

// Helper function for notifications (to match admin.js style)
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
    const loadedTypes = new Set();
    
    database.ref('leave_types').once('value').then(snapshot => {
        if (snapshot.exists()) {
            while (leaveTypeSelect.options.length > 1) {
                leaveTypeSelect.remove(1);
            }
            
            snapshot.forEach(type => {
                const typeData = type.val();
                const typeId = type.key;
                
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
            if (!leaveTypeSnapshot.exists()) throw new Error('Invalid leave type');
            const leaveTypeName = leaveTypeSnapshot.val().name;
            
            // Get the user's name
            const userSnapshot = await database.ref('users/' + user.uid).once('value');
            if (!userSnapshot.exists()) throw new Error('User data not found');
            const employeeName = userSnapshot.val().name;
            
            // Calculate days
            const days = calculateDays(startDate, endDate);
            if (days <= 0) throw new Error('End date must be on or after start date');
            
            const leaveRequest = {
                userId: user.uid,
                startDate: startDate,
                endDate: endDate,
                leaveTypeId: leaveTypeId,
                leaveTypeName: leaveTypeName,
                employeeName: employeeName,
                days: days,
                reason: reason,
                status: 'pending',
                createdAt: firebase.database.ServerValue.TIMESTAMP
            };
            
            await database.ref('leave_requests').push(leaveRequest);
            showNotification({
                title: 'Success',
                text: 'Leave request submitted successfully',
                icon: 'success',
                toast: true
            });
            document.getElementById('leaveApplicationForm').reset();
        } catch (error) {
            console.error('Error submitting leave request:', error);
            showNotification({
                title: 'Error',
                text: 'Error submitting leave request: ' + error.message,
                icon: 'error'
            });
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
    
    showNotification({
        title: 'Are you sure?',
        text: 'Do you want to cancel this leave request?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, cancel it!',
        cancelButtonText: 'No, keep it'
    }).then((result) => {
        if (result.isConfirmed) {
            database.ref('leave_requests/' + requestId).update({
                status: 'cancelled',
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            }).then(() => {
                showNotification({
                    title: 'Success',
                    text: 'Leave request cancelled successfully',
                    icon: 'success',
                    toast: true
                });
                loadLeaveStatus();
            }).catch(error => {
                console.error('Error cancelling leave request:', error);
                showNotification({
                    title: 'Error',
                    text: 'Error cancelling leave request: ' + error.message,
                    icon: 'error'
                });
            });
        }
    });
}

function loadTimeClock() {
    const auth = window.firebaseShared.getAuth();
    const database = window.firebaseShared.getDatabase();
    const user = auth.currentUser;
    if (!user) {
        showNotification({
            title: 'Error',
            text: 'User not authenticated',
            icon: 'error'
        });
        return;
    }

    // Debug: log the user role from the database
    database.ref('users/' + user.uid).once('value').then(snapshot => {
        const userData = snapshot.val();
        if (userData && userData.role) {
            console.log('Employee userData.role:', userData.role);
        } else {
            console.log('Employee userData.role: not found or undefined', userData);
        }
    });

    const html = `
        <div class="row">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h4>Time Clock</h4>
                        <button id="clockButton" class="btn btn-primary" disabled>Loading...</button>
                    </div>
                    <div class="card-body">
                        <div class="alert alert-info" id="locationStatus">
                            Detecting your location...
                        </div>
                        <div class="table-responsive">
                            <table class="table table-striped">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Time</th>
                                        <th>Type</th>
                                        <th>Location</th>
                                    </tr>
                                </thead>
                                <tbody id="timeClockTable">
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
    `;

    document.getElementById('dashboardContent').innerHTML = html;

    // Function to get geolocation
    const getLocation = () => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported by your browser'));
            }
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    });
                },
                (error) => {
                    reject(error);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        });
    };

    // Function to reverse geocode coordinates (using OpenStreetMap Nominatim)
    const reverseGeocode = async (latitude, longitude) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
            );
            const data = await response.json();
            return data.display_name || `${latitude}, ${longitude}`;
        } catch (error) {
            console.error('Error reverse geocoding:', error);
            return `${latitude}, ${longitude}`;
        }
    };

    // Check last clock event to determine button state
    const updateClockButton = async () => {
        try {
            const snapshot = await database
                .ref('time_clock')
                .orderByChild('userId')
                .equalTo(user.uid)
                .limitToLast(1)
                .once('value');

            const clockButton = document.getElementById('clockButton');
            if (!clockButton) return;
            let isClockedIn = false;

            if (snapshot.exists()) {
                snapshot.forEach((child) => {
                    const event = child.val();
                    isClockedIn = event.type === 'in';
                });
            }

            clockButton.textContent = isClockedIn ? 'Clock Out' : 'Clock In';
            clockButton.className = isClockedIn ? 'btn btn-danger' : 'btn btn-success';
            clockButton.disabled = false;
        } catch (error) {
            console.error('Error checking clock status:', error);
            showNotification({
                title: 'Error',
                text: 'Error checking clock status',
                icon: 'error'
            });
            const clockButton = document.getElementById('clockButton');
            if (clockButton) clockButton.disabled = true;
        }
    };

    // Load clock history
    const loadClockHistory = async () => {
        try {
            const snapshot = await database
                .ref('time_clock')
                .orderByChild('userId')
                .equalTo(user.uid)
                .limitToLast(50) // Limit to last 50 entries
                .once('value');

            const tableBody = document.getElementById('timeClockTable');
            if (!tableBody) return;
            tableBody.innerHTML = '';

            if (!snapshot.exists()) {
                tableBody.innerHTML = '<tr><td colspan="4" class="text-center">No clock records found</td></tr>';
                return;
            }

            const entries = [];
            snapshot.forEach((child) => {
                entries.push({ key: child.key, ...child.val() });
            });

            // Sort by timestamp descending
            entries.sort((a, b) => b.timestamp - a.timestamp);

            entries.forEach((entry) => {
                const date = new Date(entry.timestamp);
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                    <td>${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>${entry.type === 'in' ? 'Clock In' : 'Clock Out'}</td>
                    <td>${entry.address || `${entry.latitude}, ${entry.longitude}`}</td>
                `;
                tableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Error loading clock history:', error);
            const tableBody = document.getElementById('timeClockTable');
            if (tableBody) tableBody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Error loading clock records</td></tr>';
        }
    };

    // Initialize location and UI
    getLocation()
        .then(async (coords) => {
            const address = await reverseGeocode(coords.latitude, coords.longitude);
            const locationStatusElem = document.getElementById('locationStatus');
            if (locationStatusElem) {
                locationStatusElem.innerHTML = `Location: ${address}`;
                locationStatusElem.className = 'alert alert-success';
            }
            await updateClockButton();
            await loadClockHistory();
        })
        .catch((error) => {
            console.error('Geolocation error:', error);
            const locationStatusElem = document.getElementById('locationStatus');
            if (locationStatusElem) {
                locationStatusElem.innerHTML = 'Unable to detect location. Please enable location services.';
                locationStatusElem.className = 'alert alert-warning';
            }
            const clockButton = document.getElementById('clockButton');
            if (clockButton) clockButton.disabled = true;
        });

    // Handle clock in/out
    document.getElementById('clockButton')?.addEventListener('click', async () => {
        const clockButton = document.getElementById('clockButton');
        clockButton.disabled = true;

        try {
            const coords = await getLocation();
            const address = await reverseGeocode(coords.latitude, coords.longitude);

            // Determine if clocking in or out
            const lastEventSnapshot = await database
                .ref('time_clock')
                .orderByChild('userId')
                .equalTo(user.uid)
                .limitToLast(1)
                .once('value');

            let isClockedIn = false;
            if (lastEventSnapshot.exists()) {
                lastEventSnapshot.forEach((child) => {
                    isClockedIn = child.val().type === 'in';
                });
            }

            const clockType = isClockedIn ? 'out' : 'in';

            // Save clock event
            await database.ref('time_clock').push({
                userId: user.uid,
                type: clockType,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                latitude: coords.latitude,
                longitude: coords.longitude,
                address: address
            });

            showNotification({
                title: 'Success',
                text: `Successfully clocked ${clockType}`,
                icon: 'success',
                toast: true
            });

            // Update UI
            document.getElementById('locationStatus').innerHTML = `Location: ${address}`;
            await updateClockButton();
            await loadClockHistory();
        } catch (error) {
            console.error('Error clocking:', error);
            showNotification({
                title: 'Error',
                text: 'Error processing clock event: ' + error.message,
                icon: 'error'
            });
        } finally {
            clockButton.disabled = false;
        }
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