// Wait for Firebase and shared module to be ready
//auth.js
function waitForFirebase() {
    return new Promise((resolve, reject) => {
        const checkFirebase = () => {
            if (typeof firebase !== 'undefined' && window.firebaseShared && window.firebaseShared.isInitialized) {
                console.log('Firebase and shared module are ready');
                resolve();
            } else {
                console.log('Waiting for Firebase initialization...');
                setTimeout(checkFirebase, 100);
            }
        };
        checkFirebase();
    });
}

// Initialize auth functionality
async function initializeAuth() {
    try {
        // Wait for Firebase to be ready
        await waitForFirebase();
        
        // Get Firebase instances from shared module
        const auth = window.firebaseShared.getAuth();
        const database = window.firebaseShared.getDatabase();

        // Test account credentials
        const testAccounts = {
            admin: { email: 'admin@test.com', password: 'password123' },
            manager: { email: 'manager@test.com', password: 'password123' },
            employee: { email: 'employee@test.com', password: 'password123' }
        };

        // Function to create test user data
        async function createTestUserData(uid, role) {
            console.log(`Creating test user data for ${role}...`);
            const userData = {
                name: role.charAt(0).toUpperCase() + role.slice(1), // e.g., "Admin"
                role: role.toLowerCase(), // Use lowercase: "admin"
                email: testAccounts[role].email,
                department: role === 'admin' ? 'Administration' : 'Not Assigned',
                employeeId: `TST${Date.now()}`, // Unique ID for test accounts
                jobTitle: role === 'admin' ? 'System Administrator' : `${role.charAt(0).toUpperCase() + role.slice(1)}`,
                phone: '+1234567890', // Default phone
                location: 'Main Office',
                startDate: new Date().toISOString().split('T')[0], // Current date
                employmentType: 'full-time',
                manager: 'N/A',
                profilePicture: null, // Optional: Add a default URL if needed
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                isTestAccount: true
            };

            try {
                await database.ref('users/' + uid).set(userData);
                console.log(`Test ${role} data created successfully:`, userData);
                return true;
            } catch (error) {
                console.error(`Error creating test ${role} data:`, error);
                return false;
            }
        }

        // Function to ensure test account exists
        async function ensureTestAccount(role) {
            console.log(`Ensuring test account exists for ${role}...`);
            const { email, password } = testAccounts[role];

            try {
                // Try to sign in first
                try {
                    const userCredential = await auth.signInWithEmailAndPassword(email, password);
                    console.log(`Existing ${role} account found`);
                    
                    // Verify user data exists and is correct
                    const snapshot = await database.ref('users/' + userCredential.user.uid).once('value');
                    if (!snapshot.exists() || snapshot.val().role !== role.toLowerCase()) {
                        console.log(`Updating ${role} account data...`);
                        await createTestUserData(userCredential.user.uid, role);
                    }
                    
                    return userCredential;
                } catch (signInError) {
                    // If user doesn't exist, create it
                    if (signInError.code === 'auth/user-not-found') {
                        console.log(`Creating new ${role} account...`);
                        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                        await createTestUserData(userCredential.user.uid, role);
                        return userCredential;
                    }
                    throw signInError;
                }
            } catch (error) {
                console.error(`Error ensuring test account for ${role}:`, error);
                throw error;
            }
        }

        // Handle login form submission
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const username = document.getElementById('username').value.toLowerCase();
                const password = document.getElementById('password').value;
                const errorDiv = document.getElementById('loginError');
                
                // Clear previous errors
                if (errorDiv) {
                    errorDiv.classList.add('d-none');
                    errorDiv.textContent = '';
                }

                try {
                    let userCredential;
                    let isTestAccount = false;
                    let role = '';
                    
                    // Check if this is a test account by email
                    for (const [testRole, account] of Object.entries(testAccounts)) {
                        if (username === testRole || username === account.email) {
                            isTestAccount = true;
                            role = testRole;
                            break;
                        }
                    }
                    
                    // Handle test accounts
                    if (isTestAccount) {
                        console.log(`Attempting test account login for ${role}...`);
                        userCredential = await ensureTestAccount(role);
                    } else {
                        // Regular login
                        console.log('Attempting regular login...');
                        userCredential = await auth.signInWithEmailAndPassword(username, password);
                    }

                    console.log('Login successful');
                    
                    // Verify user data exists
                    const snapshot = await database.ref('users/' + userCredential.user.uid).once('value');
                    if (!snapshot.exists()) {
                        if (isTestAccount) {
                            await createTestUserData(userCredential.user.uid, role);
                        } else {
                            throw new Error('User data not found. Please contact an administrator.');
                        }
                    }

                    await handleSuccessfulLogin();
                } catch (error) {
                    console.error('Login error:', error);
                    const errorMessage = error.message || 'An error occurred during login';
                    if (errorDiv) {
                        errorDiv.textContent = errorMessage;
                        errorDiv.classList.remove('d-none');
                    }
                }
            });
        }

        let authInitialized = false;

        // Auth state change handler
        auth.onAuthStateChanged(async (user) => {
            console.log("Auth state changed:", user ? user.uid : 'No user');
            
            if (!authInitialized) {
                authInitialized = true;
                
                const currentPath = window.location.pathname;
                // Normalize the path to handle both root and specific paths
                const normalizedPath = currentPath.endsWith('/') ? currentPath + 'index.html' : currentPath;
                const isLoginPage = normalizedPath.endsWith('index.html') || normalizedPath === '/';
                const isDashboardPage = normalizedPath.endsWith('dashboard.html');

                console.log('Current path:', normalizedPath, 'isLoginPage:', isLoginPage, 'isDashboardPage:', isDashboardPage);

                if (user) {
                    // Check if user data exists
                    try {
                        const snapshot = await database.ref('users/' + user.uid).once('value');
                        const userData = snapshot.val();
                        
                        if (userData) {
                            console.log("User data verified:", userData);
                            if (isLoginPage) {
                                // Only redirect from login page
                                window.location.href = 'dashboard.html';
                            } else if (isDashboardPage) {
                                await setupDashboard(user);
                            }
                        } else {
                            console.error("No user data found");
                            await auth.signOut();
                            sessionStorage.clear();
                            window.location.href = 'index.html';
                        }
                    } catch (error) {
                        console.error("Error checking user data:", error);
                        await auth.signOut();
                        sessionStorage.clear();
                        window.location.href = 'index.html';
                    }
                } else {
                    if (!isLoginPage) {
                        // Store the current URL before redirecting
                        const fullUrl = window.location.href;
                        console.log('Storing redirect URL:', fullUrl);
                        sessionStorage.setItem('redirectUrl', fullUrl);
                        window.location.href = 'index.html';
                    }
                }
            }
        });

        // After successful login, check for redirect URL
        async function handleSuccessfulLogin() {
            console.log('Login successful, redirecting...');
            const redirectUrl = sessionStorage.getItem('redirectUrl');
            if (redirectUrl && redirectUrl.includes('dashboard.html')) {
                sessionStorage.removeItem('redirectUrl');
                window.location.href = redirectUrl;
            } else {
                window.location.href = 'dashboard.html';
            }
        }

        // Setup dashboard
        async function setupDashboard(user) {
            try {
                console.log('Setting up dashboard for user:', user.uid);
                const snapshot = await database.ref('users/' + user.uid).once('value');
                const userData = snapshot.val();
                
                if (userData) {
                    console.log('User data fetched:', userData);
                    
                    // Store user role in session storage for persistence
                    sessionStorage.setItem('userRole', userData.role.toLowerCase());
                    
                    // Call updateSidebarProfile to update sidebar UI
                    if (typeof updateSidebarProfile === 'function') {
                        updateSidebarProfile(userData);
                    } else {
                        console.warn('updateSidebarProfile function not found');
                        // Fallback: Update UI directly
                        const userNameElement = document.getElementById('currentUserName');
                        const userRoleElement = document.getElementById('currentUserRole');
                        const sidebarUserName = document.getElementById('sidebarUserName');
                        const sidebarUserRole = document.getElementById('sidebarUserRole');
                        const sidebarUserDepartment = document.getElementById('sidebarUserDepartment');

                        if (userNameElement) userNameElement.textContent = userData.name || 'Unknown';
                        if (userRoleElement) userRoleElement.textContent = userData.role || 'No Role';
                        if (sidebarUserName) sidebarUserName.textContent = userData.name || 'Unknown';
                        if (sidebarUserRole) sidebarUserRole.textContent = userData.role || 'No Role';
                        if (sidebarUserDepartment) sidebarUserDepartment.textContent = userData.department || 'No Department';
                    }
                    
                    // Show/hide sections based on role
                    const role = userData.role.toLowerCase();
                    
                    // First hide all sections
                    document.querySelectorAll('.employee-section, .manager-section, .admin-section').forEach(el => {
                        el.classList.add('d-none');
                    });
                    
                    // Then show appropriate sections based on role
                    if (role === 'employee' || role === 'user') {
                        document.querySelectorAll('.employee-section').forEach(el => {
                            el.classList.remove('d-none');
                        });
                    } else if (role === 'manager') {
                        document.querySelectorAll('.employee-section, .manager-section').forEach(el => {
                            el.classList.remove('d-none');
                        });
                    } else if (role === 'admin') {
                        document.querySelectorAll('.employee-section, .manager-section, .admin-section').forEach(el => {
                            el.classList.remove('d-none');
                        });
                    }
                    
                    // Initialize the dashboard with the correct role
                    if (typeof initDashboard === 'function') {
                        window.userRole = role; // Make role globally available
                        initDashboard();
                    }
                } else {
                    console.error('No user data found for UID:', user.uid);
                    await auth.signOut();
                    sessionStorage.clear();
                    window.location.href = 'index.html';
                }
            } catch (error) {
                console.error('Error setting up dashboard:', error);
                await auth.signOut();
                sessionStorage.clear();
                window.location.href = 'index.html';
            }
        }

        // Logout button handler
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                try {
                    await auth.signOut();
                    sessionStorage.clear();
                    window.location.href = 'index.html';
                } catch (error) {
                    console.error('Error signing out:', error);
                }
            });
        }
    } catch (error) {
        console.error('Error initializing auth:', error);
    }
}

// Start initialization when the document is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAuth);
} else {
    initializeAuth();
}