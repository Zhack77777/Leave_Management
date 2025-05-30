// Add SweetAlert2 CDN
const sweetAlertScript = document.createElement('script');
sweetAlertScript.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
document.head.appendChild(sweetAlertScript);

// Wait for Firebase and shared module to be ready
function waitForFirebase() {
    return new Promise((resolve, reject) => {
        const checkFirebase = () => {
            if (typeof firebase !== 'undefined' && window.firebaseShared && window.firebaseShared.isInitialized) {
                console.log('Firebase and shared module are ready in attendance.js');
                resolve({
                    auth: window.firebaseShared.getAuth(),
                    database: window.firebaseShared.getDatabase()
                });
            } else {
                console.log('Waiting for Firebase initialization in attendance.js...');
                setTimeout(checkFirebase, 100);
            }
        };
        checkFirebase();
    });
}

// Initialize Firebase instances
let auth;
let database;

// Make loadAttendance function globally available
window.loadAttendance = loadAttendance;

waitForFirebase().then(instances => {
    auth = instances.auth;
    database = instances.database;
    console.log('Firebase instances initialized in attendance.js');
}).catch(error => {
    console.error('Error initializing Firebase in attendance.js:', error);
});

// Add this at the top of the file, after the Firebase initialization
function showNotification({ title, text, icon }) {
    Swal.fire({
        title: title,
        text: text,
        icon: icon,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
    });
}

// Add these constants at the top of the file after the Firebase initialization
const WORK_CONFIG = {
    STANDARD_HOURS: 8,
    OVERTIME_RATE: 1.25, // 1.25x regular pay for overtime
    BREAK_DEDUCTION: true, // whether breaks should be deducted from overtime
    ROUND_TO: 2, // decimal places for hour calculations
    LATE_THRESHOLD: 15, // minutes considered late
    UNDERTIME_THRESHOLD: 7.5, // hours below which is considered significant undertime
};

// Add utility functions
function roundToDecimal(number, decimals) {
    return Number(Math.round(number + 'e' + decimals) + 'e-' + decimals);
}

function formatDuration(durationInMs) {
    const hours = Math.floor(durationInMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationInMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
}

function loadAttendance() {
    const html = `
        <div class="row">
            <div class="col-md-12 mb-4">
                <div class="card">
                    <div class="card-body">
                        <div class="row align-items-center">
                            <div class="col-md-4">
                                <h4 class="mb-0" id="currentTime">00:00:00</h4>
                                <p class="text-muted mb-0" id="currentDate"></p>
                            </div>
                            <div class="col-md-4 text-center">
                                <div id="workTimer" class="mb-2 d-none">
                                    <h5 class="mb-1">Work Duration</h5>
                                    <div class="h4" id="workDuration">00:00:00</div>
                                </div>
                                <div id="breakTimer" class="mb-2 d-none">
                                    <h5 class="mb-1">Break Duration</h5>
                                    <div class="h4" id="breakDuration">00:00:00</div>
                                </div>
                            </div>
                            <div class="col-md-4 text-end">
                                <div class="status-message mb-2" id="statusMessage"></div>
                                <div class="btn-group mb-2">
                                    <button id="clockInBtn" class="btn btn-success" data-bs-toggle="modal" data-bs-target="#clockInModal">
                                        <i class="fas fa-sign-in-alt"></i> Clock In
                                    </button>
                                    <button id="clockOutBtn" class="btn btn-danger" data-bs-toggle="modal" data-bs-target="#clockOutModal" disabled>
                                        <i class="fas fa-sign-out-alt"></i> Clock Out
                                    </button>
                                </div>
                                <div class="btn-group">
                                    <button id="startBreakBtn" class="btn btn-warning" data-bs-toggle="modal" data-bs-target="#startBreakModal" disabled>
                                        <i class="fas fa-coffee"></i> Start Break
                                    </button>
                                    <button id="endBreakBtn" class="btn btn-info" data-bs-toggle="modal" data-bs-target="#endBreakModal" disabled>
                                        <i class="fas fa-check"></i> End Break
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="row mt-3">
                            <div class="col-md-12">
                                <div id="locationInfo" class="alert alert-info d-none">
                                    <i class="fas fa-map-marker-alt"></i> 
                                    <span id="locationText">Detecting location...</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Clock In Modal -->
            <div class="modal fade" id="clockInModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Clock In</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="clockInForm">
                                <div class="mb-3">
                                    <label class="form-label">Current Time</label>
                                    <input type="text" class="form-control" id="clockInTime" readonly>
                                </div>
                                <div class="mb-3" id="lateReasonContainer">
                                    <label class="form-label">Reason for Late Clock In</label>
                                    <textarea class="form-control" id="lateReason" rows="3" placeholder="Please provide a reason if clocking in late"></textarea>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Work Type</label>
                                    <select class="form-select" id="workType" required>
                                        <option value="office">Office</option>
                                        <option value="remote">Remote</option>
                                        <option value="hybrid">Hybrid</option>
                                        <option value="field">Field Work</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Notes (Optional)</label>
                                    <textarea class="form-control" id="clockInNotes" rows="2" placeholder="Any additional notes"></textarea>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-success" onclick="submitClockIn()">Clock In</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Clock Out Modal -->
            <div class="modal fade" id="clockOutModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Clock Out</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="clockOutForm">
                                <div class="mb-3">
                                    <label class="form-label">Current Time</label>
                                    <input type="text" class="form-control" id="clockOutTime" readonly>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Work Summary</label>
                                    <textarea class="form-control" id="workSummary" rows="3" placeholder="Brief summary of work done today"></textarea>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Notes (Optional)</label>
                                    <textarea class="form-control" id="clockOutNotes" rows="2" placeholder="Any additional notes"></textarea>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-danger" onclick="submitClockOut()">Clock Out</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Break Modals -->
            <div class="modal fade" id="startBreakModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Start Break</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="startBreakForm">
                                <div class="mb-3">
                                    <label class="form-label">Break Type</label>
                                    <select class="form-select" id="breakType" required>
                                        <option value="lunch">Lunch Break</option>
                                        <option value="coffee">Coffee Break</option>
                                        <option value="personal">Personal Break</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Expected Duration</label>
                                    <select class="form-select" id="breakDurationExpected">
                                        <option value="15">15 minutes</option>
                                        <option value="30">30 minutes</option>
                                        <option value="45">45 minutes</option>
                                        <option value="60">1 hour</option>
                                    </select>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-warning" onclick="submitStartBreak()">Start Break</button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="modal fade" id="endBreakModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">End Break</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <label class="form-label">Break Duration</label>
                                <div id="actualBreakDuration" class="form-control-plaintext"></div>
                            </div>
                            <div class="mb-3" id="extendedBreakReasonContainer">
                                <label class="form-label">Reason for Extended Break</label>
                                <textarea class="form-control" id="extendedBreakReason" rows="3" placeholder="Please provide a reason if break was longer than expected"></textarea>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-info" onclick="submitEndBreak()">End Break</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Attendance History Table -->
            <div class="col-md-12">
                <div class="card">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h4>Attendance History</h4>
                        <div class="d-flex gap-2">
                            <input type="month" class="form-control" id="attendanceMonth">
                            <button class="btn btn-primary" id="exportAttendanceBtn">
                                <i class="fas fa-download"></i> Export
                            </button>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-striped">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Clock In</th>
                                        <th>Clock Out</th>
                                        <th>Break Time</th>
                                        <th>Work Hours</th>
                                        <th>Overtime</th>
                                        <th>Location</th>
                                        <th>Work Type</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="attendanceTable">
                                    <tr>
                                        <td colspan="10" class="text-center">Loading...</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Delete Confirmation Modal -->
            <div class="modal fade" id="deleteAttendanceModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Delete Attendance Record</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <p>Are you sure you want to delete this attendance record? This action cannot be undone.</p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-danger" id="confirmDeleteBtn">Delete</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('dashboardContent').innerHTML = html;

    // Initialize current time display
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);

    // Set default month filter to current month
    const currentMonth = new Date().toISOString().slice(0, 7);
    document.getElementById('attendanceMonth').value = currentMonth;

    // Initialize modals
    const clockInModal = new bootstrap.Modal(document.getElementById('clockInModal'));
    const clockOutModal = new bootstrap.Modal(document.getElementById('clockOutModal'));
    const startBreakModal = new bootstrap.Modal(document.getElementById('startBreakModal'));
    const endBreakModal = new bootstrap.Modal(document.getElementById('endBreakModal'));

    // Add event listeners
    document.getElementById('clockInBtn').addEventListener('click', () => {
        document.getElementById('clockInTime').value = new Date().toLocaleTimeString();
        checkLateClockIn();
    });

    document.getElementById('clockOutBtn').addEventListener('click', () => {
        document.getElementById('clockOutTime').value = new Date().toLocaleTimeString();
    });

    document.getElementById('attendanceMonth').addEventListener('change', loadAttendanceHistory);
    document.getElementById('exportAttendanceBtn').addEventListener('click', exportAttendance);

    // Check if already clocked in today
    checkTodayAttendance();
    
    // Load attendance history
    loadAttendanceHistory();

    // Start location tracking
    initializeLocationTracking();

    // Initialize delete confirmation modal
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteAttendanceModal'));
    let recordToDelete = null;

    // Add event delegation for delete buttons
    document.addEventListener('click', function(e) {
        if (e.target && e.target.classList.contains('delete-attendance-btn')) {
            e.preventDefault();
            recordToDelete = e.target.getAttribute('data-record-key');
            deleteModal.show();
        }
    });

    // Add confirm delete handler
    document.getElementById('confirmDeleteBtn').addEventListener('click', async function() {
        if (recordToDelete) {
            await deleteAttendanceRecord(recordToDelete);
            deleteModal.hide();
        }
    });
}

function updateCurrentTime() {
    const currentTimeElement = document.getElementById('currentTime');
    const currentDateElement = document.getElementById('currentDate');
    
    if (currentTimeElement && currentDateElement) {
        const now = new Date();
        currentTimeElement.textContent = now.toLocaleTimeString();
        currentDateElement.textContent = now.toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}

async function checkTodayAttendance() {
    try {
        const user = auth.currentUser;
        if (!user) return;

        const today = new Date().toISOString().split('T')[0];
        const attendanceRef = database.ref(`attendance/${user.uid}/${today}`);
        const snapshot = await attendanceRef.once('value');
        const attendance = snapshot.val();

        if (attendance) {
            document.getElementById('clockInBtn').disabled = true;
            
            if (!attendance.clockOut) {
                document.getElementById('clockOutBtn').disabled = false;
                
                // If there's an ongoing break
                const breaks = attendance.breaks || [];
                const currentBreak = breaks[breaks.length - 1];
                if (currentBreak && !currentBreak.end) {
                    document.getElementById('startBreakBtn').disabled = true;
                    document.getElementById('endBreakBtn').disabled = false;
                } else {
                    document.getElementById('startBreakBtn').disabled = false;
                    document.getElementById('endBreakBtn').disabled = true;
                }

                // Start the work timer
                workStartTime = new Date(attendance.clockIn);
                totalBreakTime = attendance.totalBreakTime || 0;
                startWorkTimer();

                // If there's an ongoing break, start the break timer
                if (currentBreak && !currentBreak.end) {
                    breakStartTime = new Date(currentBreak.start);
                    startBreakTimer();
                }
            } else {
                // If already clocked out, disable all buttons
                document.getElementById('clockOutBtn').disabled = true;
                document.getElementById('startBreakBtn').disabled = true;
                document.getElementById('endBreakBtn').disabled = true;
            }
        }
    } catch (error) {
        console.error('Error checking today attendance:', error);
        showNotification({
            title: 'Error',
            text: 'Error checking attendance status',
            icon: 'error'
        });
    }
}

// Work duration timer
let workDurationInterval;
let breakDurationInterval;
let workStartTime;
let breakStartTime;
let totalBreakTime = 0;

function startWorkTimer() {
    workStartTime = new Date();
    document.getElementById('workTimer').classList.remove('d-none');
    workDurationInterval = setInterval(updateWorkDuration, 1000);
}

function stopWorkTimer() {
    clearInterval(workDurationInterval);
}

function updateWorkDuration() {
    if (!workStartTime) return;
    
    const now = new Date();
    const duration = now - workStartTime - totalBreakTime;
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((duration % (1000 * 60)) / 1000);
    
    document.getElementById('workDuration').textContent = 
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function startBreakTimer() {
    breakStartTime = new Date();
    document.getElementById('breakTimer').classList.remove('d-none');
    breakDurationInterval = setInterval(updateBreakDuration, 1000);
}

function stopBreakTimer() {
    if (breakStartTime) {
        totalBreakTime += new Date() - breakStartTime;
    }
    clearInterval(breakDurationInterval);
    document.getElementById('breakTimer').classList.add('d-none');
    breakStartTime = null;
}

function updateBreakDuration() {
    if (!breakStartTime) return;
    
    const now = new Date();
    const duration = now - breakStartTime;
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((duration % (1000 * 60)) / 1000);
    
    document.getElementById('breakDuration').textContent = 
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Location tracking
function initializeLocationTracking() {
    const locationInfo = document.getElementById('locationInfo');
    const locationText = document.getElementById('locationText');
    
    locationInfo.classList.remove('d-none');

    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            async position => {
                const { latitude, longitude } = position.coords;
                const location = await getLocationName(latitude, longitude);
                locationText.textContent = `Working from: ${location}`;
                locationInfo.classList.remove('alert-warning');
                locationInfo.classList.add('alert-success');
            },
            error => {
                console.error('Error getting location:', error);
                locationText.textContent = 'Unable to detect location';
                locationInfo.classList.remove('alert-info');
                locationInfo.classList.add('alert-warning');
            }
        );
    } else {
        locationText.textContent = 'Location tracking not supported';
        locationInfo.classList.remove('alert-info');
        locationInfo.classList.add('alert-warning');
    }
}

async function getLocationName(latitude, longitude) {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
        );
        const data = await response.json();
        return data.display_name.split(',').slice(0, 3).join(',');
    } catch (error) {
        console.error('Error getting location name:', error);
        return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }
}

// Enhanced clock in/out functions
async function submitClockIn() {
    try {
        const user = auth.currentUser;
        if (!user) return;

        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const clockInTime = now.toISOString();

        let location = 'Unknown';
        if ("geolocation" in navigator) {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject);
            });
            location = await getLocationName(position.coords.latitude, position.coords.longitude);
        }

        const workType = document.getElementById('workType').value;
        const lateReason = document.getElementById('lateReason').value;
        const notes = document.getElementById('clockInNotes').value;

        await database.ref(`attendance/${user.uid}/${today}`).set({
            clockIn: clockInTime,
            date: today,
            location: location,
            workType: workType,
            lateReason: lateReason || null,
            clockInNotes: notes || null,
            breaks: [],
            totalBreakTime: 0
        });

        // Close modal
        bootstrap.Modal.getInstance(document.getElementById('clockInModal')).hide();

        // Update UI
        document.getElementById('clockInBtn').disabled = true;
        document.getElementById('clockOutBtn').disabled = false;
        document.getElementById('startBreakBtn').disabled = false;

        startWorkTimer();

        showNotification({
            title: 'Success',
            text: 'Clocked in successfully',
            icon: 'success'
        });

        loadAttendanceHistory();
    } catch (error) {
        console.error('Error clocking in:', error);
        showNotification({
            title: 'Error',
            text: 'Error clocking in: ' + error.message,
            icon: 'error'
        });
    }
}

async function submitClockOut() {
    try {
        const user = auth.currentUser;
        if (!user) return;

        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const clockOutTime = now.toISOString();

        const workSummary = document.getElementById('workSummary').value;
        const notes = document.getElementById('clockOutNotes').value;

        // Calculate work duration and overtime
        const attendanceRef = database.ref(`attendance/${user.uid}/${today}`);
        const snapshot = await attendanceRef.once('value');
        const attendance = snapshot.val();

        // Calculate total work duration excluding breaks
        const totalDurationMs = now - new Date(attendance.clockIn);
        const breakTimeMs = attendance.totalBreakTime || 0;
        const actualWorkDurationMs = totalDurationMs - (WORK_CONFIG.BREAK_DEDUCTION ? breakTimeMs : 0);
        
        // Convert to hours and round to configured decimal places
        const actualWorkHours = roundToDecimal(actualWorkDurationMs / (1000 * 60 * 60), WORK_CONFIG.ROUND_TO);
        
        // Calculate standard hours and overtime
        const standardHours = Math.min(WORK_CONFIG.STANDARD_HOURS, actualWorkHours);
        const overtimeHours = Math.max(0, actualWorkHours - WORK_CONFIG.STANDARD_HOURS);
        const overtimePay = overtimeHours * WORK_CONFIG.OVERTIME_RATE;

        // Calculate late minutes if any
        const clockInTime = new Date(attendance.clockIn);
        const expectedStartTime = new Date(clockInTime);
        expectedStartTime.setHours(9, 0, 0, 0); // 9 AM start time
        const lateMinutes = clockInTime > expectedStartTime ? 
            Math.floor((clockInTime - expectedStartTime) / (1000 * 60)) : 0;

        // Determine work status
        const workStatus = getWorkStatus(actualWorkHours, lateMinutes);

        const updateData = {
            clockOut: clockOutTime,
            totalWorkDuration: actualWorkDurationMs,
            standardHours: roundToDecimal(standardHours, WORK_CONFIG.ROUND_TO),
            overtime: roundToDecimal(overtimeHours, WORK_CONFIG.ROUND_TO),
            overtimePay: roundToDecimal(overtimePay, WORK_CONFIG.ROUND_TO),
            workSummary: workSummary || null,
            clockOutNotes: notes || null,
            totalBreakTime: breakTimeMs,
            lateMinutes: lateMinutes,
            status: workStatus,
            needsApproval: overtimeHours > 0 // Overtime needs approval
        };

        await attendanceRef.update(updateData);

        // Close modal
        bootstrap.Modal.getInstance(document.getElementById('clockOutModal')).hide();

        // Update UI
        document.getElementById('clockOutBtn').disabled = true;
        document.getElementById('startBreakBtn').disabled = true;
        document.getElementById('endBreakBtn').disabled = true;

        stopWorkTimer();
        stopBreakTimer();

        // Show detailed notification
        showDetailedClockOutNotification({
            actualWorkHours,
            overtimeHours,
            breakTimeMs,
            lateMinutes,
            workStatus
        });

        loadAttendanceHistory();
        updateOvertimeSummary(user.uid); // Update overtime summary
    } catch (error) {
        console.error('Error clocking out:', error);
        showNotification({
            title: 'Error',
            text: 'Error clocking out: ' + error.message,
            icon: 'error'
        });
    }
}

function getWorkStatus(actualWorkHours, lateMinutes) {
    if (actualWorkHours < WORK_CONFIG.UNDERTIME_THRESHOLD) return 'Significant Undertime';
    if (actualWorkHours < WORK_CONFIG.STANDARD_HOURS) return 'Undertime';
    if (actualWorkHours === WORK_CONFIG.STANDARD_HOURS) return 'Complete';
    if (actualWorkHours > WORK_CONFIG.STANDARD_HOURS) return 'Overtime';
    if (lateMinutes > WORK_CONFIG.LATE_THRESHOLD) return 'Late';
    return 'In Progress';
}

function showDetailedClockOutNotification({ actualWorkHours, overtimeHours, breakTimeMs, lateMinutes, workStatus }) {
    const breakHours = breakTimeMs / (1000 * 60 * 60);
    
    let message = `Work Hours: ${actualWorkHours.toFixed(2)} hours\n`;
    if (overtimeHours > 0) {
        message += `Overtime: ${overtimeHours.toFixed(2)} hours (${(overtimeHours * WORK_CONFIG.OVERTIME_RATE).toFixed(2)}x pay)\n`;
    }
    if (breakHours > 0) {
        message += `Break Time: ${breakHours.toFixed(2)} hours\n`;
    }
    if (lateMinutes > 0) {
        message += `Late Arrival: ${lateMinutes} minutes\n`;
    }
    message += `Status: ${workStatus}`;

    Swal.fire({
        title: 'Clock Out Summary',
        html: message.replace(/\n/g, '<br>'),
        icon: workStatus === 'Complete' ? 'success' : 
              workStatus.includes('Undertime') ? 'warning' : 
              workStatus === 'Overtime' ? 'info' : 'warning',
        toast: true,
        position: 'top-end',
        showConfirmButton: true,
        timer: 5000,
        timerProgressBar: true
    });
}

async function updateOvertimeSummary(userId) {
    try {
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Start from Sunday
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        const attendanceRef = database.ref(`attendance/${userId}`)
            .orderByChild('date')
            .startAt(startOfWeek.toISOString().split('T')[0])
            .endAt(endOfWeek.toISOString().split('T')[0]);

        const snapshot = await attendanceRef.once('value');
        
        let weeklyOvertime = 0;
        let weeklyOvertimePay = 0;

        snapshot.forEach(child => {
            const record = child.val();
            if (record.overtime) {
                weeklyOvertime += record.overtime;
                weeklyOvertimePay += record.overtimePay || 0;
            }
        });

        // Update weekly summary in the database
        await database.ref(`overtime_summary/${userId}/weekly`).set({
            startDate: startOfWeek.toISOString().split('T')[0],
            endDate: endOfWeek.toISOString().split('T')[0],
            totalOvertime: roundToDecimal(weeklyOvertime, WORK_CONFIG.ROUND_TO),
            totalOvertimePay: roundToDecimal(weeklyOvertimePay, WORK_CONFIG.ROUND_TO),
            lastUpdated: now.toISOString()
        });

    } catch (error) {
        console.error('Error updating overtime summary:', error);
    }
}

function checkLateClockIn() {
    const now = new Date();
    const workStartHour = 9; // 9 AM
    
    if (now.getHours() >= workStartHour && now.getMinutes() > 0) {
        document.getElementById('lateReasonContainer').style.display = 'block';
        document.getElementById('lateReason').required = true;
    } else {
        document.getElementById('lateReasonContainer').style.display = 'none';
        document.getElementById('lateReason').required = false;
    }
}

async function loadAttendanceHistory() {
    try {
        const user = auth.currentUser;
        if (!user) return;

        const selectedMonth = document.getElementById('attendanceMonth').value;
        const [year, month] = selectedMonth.split('-');
        
        const startDate = `${year}-${month}-01`;
        const endDate = `${year}-${month}-31`;

        // Load both attendance and overtime summary
        const [attendanceSnapshot, overtimeSummarySnapshot] = await Promise.all([
            database.ref(`attendance/${user.uid}`)
                .orderByChild('date')
                .startAt(startDate)
                .endAt(endDate)
                .once('value'),
            database.ref(`overtime_summary/${user.uid}/weekly`).once('value')
        ]);

        // Display overtime summary if available
        const overtimeSummary = overtimeSummarySnapshot.val();
        if (overtimeSummary) {
            const summaryHtml = `
                <div class="alert alert-info mb-3">
                    <h5 class="mb-2">Weekly Overtime Summary (${overtimeSummary.startDate} to ${overtimeSummary.endDate})</h5>
                    <p class="mb-1">Total Overtime: ${overtimeSummary.totalOvertime} hours</p>
                    <p class="mb-0">Estimated Overtime Pay: ${overtimeSummary.totalOvertimePay}x regular rate</p>
                </div>
            `;
            document.getElementById('attendanceTable').insertAdjacentHTML('beforebegin', summaryHtml);
        }

        const tableBody = document.getElementById('attendanceTable');
        tableBody.innerHTML = '';

        if (!attendanceSnapshot.exists()) {
            tableBody.innerHTML = '<tr><td colspan="10" class="text-center">No attendance records found</td></tr>';
            return;
        }

        const records = [];
        attendanceSnapshot.forEach(child => {
            records.push({
                ...child.val(),
                key: child.key
            });
        });

        // Sort records by date in descending order
        records.sort((a, b) => new Date(b.date) - new Date(a.date));

        records.forEach(record => {
            const row = document.createElement('tr');
            const clockIn = new Date(record.clockIn);
            const clockOut = record.clockOut ? new Date(record.clockOut) : null;
            
            const status = record.status || 'In Progress';
            const statusClass = getStatusBadgeClass(status);
            
            // Add visual indicator for records needing approval
            const needsApproval = record.needsApproval ? 
                '<span class="badge bg-warning ms-2">Needs Approval</span>' : '';

            row.innerHTML = `
                <td>${formatDate(record.date)}</td>
                <td>
                    ${clockIn.toLocaleTimeString()}
                    ${record.lateMinutes > 0 ? 
                        `<span class="badge bg-danger ms-2">Late ${record.lateMinutes}m</span>` : 
                        ''}
                </td>
                <td>${clockOut ? clockOut.toLocaleTimeString() : '-'}</td>
                <td>${record.totalBreakTime ? formatDuration(record.totalBreakTime) : '-'}</td>
                <td>${record.standardHours ? record.standardHours.toFixed(2) + ' hrs' : '-'}</td>
                <td class="${record.overtime > 0 ? 'text-warning fw-bold' : ''}">
                    ${record.overtime ? 
                        `${record.overtime.toFixed(2)} hrs (${record.overtimePay.toFixed(2)}x)` : 
                        '-'}
                </td>
                <td>${record.location || 'Not recorded'}</td>
                <td>${record.workType || 'Not recorded'}</td>
                <td>
                    <span class="badge ${statusClass}">
                        ${status}
                    </span>
                    ${needsApproval}
                </td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-info view-details-btn" data-record-key="${record.key}">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-danger delete-attendance-btn" data-record-key="${record.key}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // Add event listener for view details button
        document.querySelectorAll('.view-details-btn').forEach(button => {
            button.addEventListener('click', () => viewAttendanceDetails(button.dataset.recordKey));
        });

    } catch (error) {
        console.error('Error loading attendance history:', error);
        const tableBody = document.getElementById('attendanceTable');
        tableBody.innerHTML = '<tr><td colspan="10" class="text-center text-danger">Error loading attendance records</td></tr>';
    }
}

function getStatusBadgeClass(status) {
    switch (status) {
        case 'Overtime': return 'bg-warning text-dark';
        case 'Complete': return 'bg-success';
        case 'Undertime': return 'bg-danger';
        case 'Significant Undertime': return 'bg-danger';
        case 'Late': return 'bg-warning text-dark';
        case 'In Progress': return 'bg-info';
        default: return 'bg-secondary';
    }
}

async function viewAttendanceDetails(recordKey) {
    try {
        const user = auth.currentUser;
        if (!user) return;

        const record = (await database.ref(`attendance/${user.uid}/${recordKey}`).once('value')).val();
        
        if (!record) {
            showNotification({
                title: 'Error',
                text: 'Record not found',
                icon: 'error'
            });
            return;
        }

        const clockIn = new Date(record.clockIn);
        const clockOut = record.clockOut ? new Date(record.clockOut) : null;
        
        let detailsHtml = `
            <div class="text-left">
                <p><strong>Date:</strong> ${formatDate(record.date)}</p>
                <p><strong>Clock In:</strong> ${clockIn.toLocaleTimeString()}</p>
                <p><strong>Clock Out:</strong> ${clockOut ? clockOut.toLocaleTimeString() : 'Not clocked out'}</p>
                <p><strong>Work Type:</strong> ${record.workType}</p>
                <p><strong>Location:</strong> ${record.location}</p>
                <p><strong>Standard Hours:</strong> ${record.standardHours ? record.standardHours.toFixed(2) : '-'}</p>
                <p><strong>Overtime Hours:</strong> ${record.overtime ? record.overtime.toFixed(2) : '-'}</p>
                <p><strong>Overtime Pay Rate:</strong> ${record.overtimePay ? record.overtimePay.toFixed(2) + 'x' : '-'}</p>
                <p><strong>Total Break Time:</strong> ${record.totalBreakTime ? formatDuration(record.totalBreakTime) : '-'}</p>
                ${record.lateMinutes ? `<p><strong>Late Minutes:</strong> ${record.lateMinutes}</p>` : ''}
                ${record.lateReason ? `<p><strong>Late Reason:</strong> ${record.lateReason}</p>` : ''}
                ${record.workSummary ? `<p><strong>Work Summary:</strong> ${record.workSummary}</p>` : ''}
                ${record.clockInNotes ? `<p><strong>Clock In Notes:</strong> ${record.clockInNotes}</p>` : ''}
                ${record.clockOutNotes ? `<p><strong>Clock Out Notes:</strong> ${record.clockOutNotes}</p>` : ''}
            </div>
        `;

        Swal.fire({
            title: 'Attendance Details',
            html: detailsHtml,
            icon: 'info',
            width: '600px',
            showCloseButton: true,
            showConfirmButton: false
        });

    } catch (error) {
        console.error('Error viewing attendance details:', error);
        showNotification({
            title: 'Error',
            text: 'Error loading attendance details',
            icon: 'error'
        });
    }
}

function formatDate(dateString) {
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

async function exportAttendance() {
    try {
        const user = auth.currentUser;
        if (!user) return;

        const selectedMonth = document.getElementById('attendanceMonth').value;
        const [year, month] = selectedMonth.split('-');
        
        const startDate = `${year}-${month}-01`;
        const endDate = `${year}-${month}-31`;

        const attendanceRef = database.ref(`attendance/${user.uid}`)
            .orderByChild('date')
            .startAt(startDate)
            .endAt(endDate);

        const snapshot = await attendanceRef.once('value');
        
        if (!snapshot.exists()) {
            showNotification({
                title: 'Error',
                text: 'No attendance records to export',
                icon: 'warning'
            });
            return;
        }

        const records = [];
        snapshot.forEach(child => {
            const data = child.val();
            records.push({
                date: data.date,
                clockIn: new Date(data.clockIn).toLocaleTimeString(),
                clockOut: data.clockOut ? new Date(data.clockOut).toLocaleTimeString() : '-',
                totalHours: data.clockOut ? 
                    ((new Date(data.clockOut) - new Date(data.clockIn)) / (1000 * 60 * 60)).toFixed(2) : 
                    '-'
            });
        });

        // Create CSV content
        let csv = 'Date,Clock In,Clock Out,Total Hours\n';
        records.forEach(record => {
            csv += `${record.date},${record.clockIn},${record.clockOut},${record.totalHours}\n`;
        });

        // Create and trigger download
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `attendance_${selectedMonth}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        showNotification({
            title: 'Success',
            text: 'Attendance records exported successfully',
            icon: 'success'
        });
    } catch (error) {
        console.error('Error exporting attendance:', error);
        showNotification({
            title: 'Error',
            text: 'Error exporting attendance records',
            icon: 'error'
        });
    }
}

// Add the delete function
async function deleteAttendanceRecord(recordKey) {
    try {
        const user = auth.currentUser;
        if (!user) return;

        await database.ref(`attendance/${user.uid}/${recordKey}`).remove();

        showNotification({
            title: 'Success',
            text: 'Attendance record deleted successfully',
            icon: 'success'
        });

        loadAttendanceHistory();
    } catch (error) {
        console.error('Error deleting attendance record:', error);
        showNotification({
            title: 'Error',
            text: 'Error deleting attendance record: ' + error.message,
            icon: 'error'
        });
    }
}

// Re-add the break functions that were accidentally removed
async function submitStartBreak() {
    try {
        const user = auth.currentUser;
        if (!user) return;

        const now = new Date();
        const today = now.toISOString().split('T')[0];
        
        const breakStart = now.toISOString();
        const breakType = document.getElementById('breakType').value;
        const expectedDuration = document.getElementById('breakDurationExpected').value;
        
        const attendanceRef = database.ref(`attendance/${user.uid}/${today}`);
        const snapshot = await attendanceRef.once('value');
        const attendance = snapshot.val();
        
        const breaks = attendance.breaks || [];
        breaks.push({
            start: breakStart,
            type: breakType,
            expectedDuration: parseInt(expectedDuration),
            end: null
        });

        await attendanceRef.update({ breaks });

        // Close modal
        bootstrap.Modal.getInstance(document.getElementById('startBreakModal')).hide();

        // Update UI
        document.getElementById('startBreakBtn').disabled = true;
        document.getElementById('endBreakBtn').disabled = false;

        startBreakTimer();

        showNotification({
            title: 'Break Started',
            text: 'Your break has been started',
            icon: 'success'
        });
    } catch (error) {
        console.error('Error starting break:', error);
        showNotification({
            title: 'Error',
            text: 'Error starting break: ' + error.message,
            icon: 'error'
        });
    }
}

async function submitEndBreak() {
    try {
        const user = auth.currentUser;
        if (!user) return;

        const now = new Date();
        const today = now.toISOString().split('T')[0];
        
        const breakEnd = now.toISOString();
        const extendedReason = document.getElementById('extendedBreakReason').value;
        
        const attendanceRef = database.ref(`attendance/${user.uid}/${today}`);
        const snapshot = await attendanceRef.once('value');
        const attendance = snapshot.val();
        
        const breaks = attendance.breaks || [];
        const currentBreak = breaks[breaks.length - 1];
        currentBreak.end = breakEnd;
        currentBreak.extendedReason = extendedReason || null;
        
        // Calculate total break time
        const breakTime = new Date(breakEnd) - new Date(currentBreak.start);
        const totalBreakTime = (attendance.totalBreakTime || 0) + breakTime;

        await attendanceRef.update({
            breaks,
            totalBreakTime
        });

        // Close modal
        bootstrap.Modal.getInstance(document.getElementById('endBreakModal')).hide();

        // Update UI
        document.getElementById('startBreakBtn').disabled = false;
        document.getElementById('endBreakBtn').disabled = true;

        stopBreakTimer();

        showNotification({
            title: 'Break Ended',
            text: 'Your break has been ended',
            icon: 'success'
        });
    } catch (error) {
        console.error('Error ending break:', error);
        showNotification({
            title: 'Error',
            text: 'Error ending break: ' + error.message,
            icon: 'error'
        });
    }
} 