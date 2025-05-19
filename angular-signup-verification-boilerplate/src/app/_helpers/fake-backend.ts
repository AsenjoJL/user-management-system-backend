import { Injectable } from '@angular/core';
import { HttpRequest, HttpResponse, HttpHandler, HttpEvent, HttpInterceptor, HTTP_INTERCEPTORS, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { delay, materialize, dematerialize, mergeMap } from 'rxjs/operators';

import { AlertService } from '@app/_services';
import { Role } from '@app/_models';

// array in local storage for accounts
const accountsKey = 'angular-10-signup-verification-boilerplate-accounts';

// Get accounts from local storage
let accounts = JSON.parse(localStorage.getItem(accountsKey)) || [];

// Make sure all accounts have the required fields
accounts = accounts.map(account => {
    // Default to active if not specified
    if (account.isActive === undefined) {
        account.isActive = true;
    }
    
    // Ensure admin accounts are always active
    if (account.role === Role.Admin) {
        account.isActive = true;
    }
    
    // Ensure refreshTokens array exists
    if (!account.refreshTokens) {
        account.refreshTokens = [];
    }
    
    return account;
});

// Save the updated accounts back to localStorage
localStorage.setItem(accountsKey, JSON.stringify(accounts));

@Injectable()
export class FakeBackendInterceptor implements HttpInterceptor {
    constructor(private alertService: AlertService) {
        // Make sure our accounts and users are synchronized on startup
        this.ensureDefaultAdminAccount();
        this.syncUsersWithAccounts();
        console.log('FakeBackendInterceptor initialized with users:', this.users);
    }

    private users = [
        { id: 1, email: 'admin@example.com', password: 'admin', role: Role.Admin, employeeId: 1 },
        { id: 2, email: 'user@example.com', password: 'user', role: Role.User, employeeId: 2 }
    ];

    private employees = [
        { id: 1, employeeId: 'EMP001', userId: 1, position: 'Developer', departmentId: 1, hireDate: '2025-01-01', status: 'Active' },
        { id: 2, employeeId: 'EMP002', userId: 2, position: 'Designer', departmentId: 2, hireDate: '2025-02-01', status: 'Active' }
    ];

    private departments = [
        { id: 1, name: 'Engineering', description: 'Software development team', employeeCount: 1 },
        { id: 2, name: 'Marketing', description: 'Marketing team', employeeCount: 1 }
    ];

    private workflows = [
        { id: 1, employeeId: 1, type: 'Onboarding', details: { task: 'Setup workstation' }, status: 'Pending' }
    ];

    private requests = [
        { id: 1, employeeId: 2, type: 'Equipment', requestItems: [{ name: 'Laptop', quantity: 1 }], status: 'Pending' }
    ];

    // Make sure we have a default admin account in localStorage
    private ensureDefaultAdminAccount() {
        try {
            console.log('Ensuring default admin account exists...');
            
            const storedAccounts = JSON.parse(localStorage.getItem(accountsKey)) || [];
            const adminAccount = storedAccounts.find(a => a.role === Role.Admin);
            
            if (!adminAccount) {
                console.log('No admin account found in localStorage, creating one...');
                const newAdminAccount = {
                    id: 1,
                    title: 'Mr',
                    firstName: 'Admin',
                    lastName: 'User',
                    email: 'admin@example.com',
                    password: 'admin',
                    role: Role.Admin,
                    isVerified: true,
                    isActive: true,
                    dateCreated: new Date().toISOString(),
                    refreshTokens: []
                };
                
                storedAccounts.push(newAdminAccount);
                localStorage.setItem(accountsKey, JSON.stringify(storedAccounts));
                console.log('Created admin account:', newAdminAccount);
                
                // Update our global accounts variable
                accounts = JSON.parse(localStorage.getItem(accountsKey)) || [];
            }
        } catch (error) {
            console.error('Error ensuring default admin account:', error);
        }
    }

    // Helper method to synchronize localStorage accounts with hardcoded users array
    private syncUsersWithAccounts() {
        try {
            console.log('Synchronizing localStorage accounts with users array...');
            
            // Get accounts from localStorage
            const storedAccounts = JSON.parse(localStorage.getItem(accountsKey)) || [];
            console.log('Stored accounts:', storedAccounts.map(a => ({ id: a.id, email: a.email, role: a.role })));
            
            // First, make sure our hardcoded users match what's in the accounts
            storedAccounts.forEach(account => {
                let matchingUser = this.users.find(u => u.email === account.email);
                
                if (matchingUser) {
                    // Update the hardcoded user to match the account (especially the role)
                    console.log(`Syncing user ${matchingUser.email} with role ${account.role}`);
                    matchingUser.role = account.role;
                    matchingUser.id = account.id; // Ensure IDs match
                } else {
                    // Create a new user if it doesn't exist in the hardcoded users
                    console.log(`User not found for account ${account.email}, creating...`);
                    this.users.push({
                        id: account.id,
                        email: account.email,
                        password: account.password || 'password',
                        role: account.role,
                        employeeId: account.id
                    });
                }
            });
            
            // Now, make sure all hardcoded users exist in accounts
            this.users.forEach(user => {
                const matchingAccount = storedAccounts.find(a => a.email === user.email);
                
                if (!matchingAccount) {
                    // Create an account for this hardcoded user
                    console.log(`Account not found for user ${user.email}, creating...`);
                    const newAccount = {
                        id: user.id,
                        title: 'Mr',
                        firstName: user.email.split('@')[0],
                        lastName: 'User',
                        email: user.email,
                        password: user.password,
                        role: user.role,
                        isVerified: true,
                        isActive: true,
                        dateCreated: new Date().toISOString(),
                        refreshTokens: []
                    };
                    
                    storedAccounts.push(newAccount);
                }
            });
            
            // Save any changes back to localStorage
            localStorage.setItem(accountsKey, JSON.stringify(storedAccounts));
            
            // Update the global accounts variable
            accounts = JSON.parse(localStorage.getItem(accountsKey)) || [];
            
            console.log('Synchronization complete:');
            console.log('- Updated users:', this.users);
            console.log('- Updated accounts:', accounts.map(a => ({ id: a.id, email: a.email, role: a.role })));
        } catch (error) {
            console.error('Error synchronizing users with accounts:', error);
        }
    }

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        const { url, method, headers, body } = request;
        const alertService = this.alertService;
        // Store a reference to 'this' to access class properties inside closures
        const self = this;

        return handleRoute();

        function handleRoute() {
            // Handle authentication and account-related routes
            switch (true) {
                case url.endsWith('/accounts/authenticate') && method === 'POST':
                    return authenticate();
                case url.endsWith('/accounts/refresh-token') && method === 'POST':
                    return refreshToken();
                case url.endsWith('/accounts/revoke-token') && method === 'POST':
                    return revokeToken();
                case url.endsWith('/accounts/register') && method === 'POST':
                    return register();
                case url.endsWith('/accounts/verify-email') && method === 'POST':
                    return verifyEmail();
                case url.endsWith('/accounts/forgot-password') && method === 'POST':
                    return forgotPassword();
                case url.endsWith('/accounts/validate-reset-token') && method === 'POST':
                    return validateResetToken();
                case url.endsWith('/accounts/reset-password') && method === 'POST':
                    return resetPassword();
                case url.endsWith('/accounts') && method === 'GET':
                    return getAccounts();
                case url.match(/\/accounts\/\d+$/) && method === 'GET':
                    return getAccountById();
                case url.endsWith('/accounts') && method === 'POST':
                    return createAccount();
                case url.match(/\/accounts\/\d+$/) && method === 'PUT':
                    return updateAccount();
                case url.match(/\/accounts\/\d+$/) && method === 'DELETE':
                    return deleteAccount();
                case url.match(/\/accounts\/\d+\/status$/) && method === 'PUT':
                    return updateAccountStatus();
                // HR System routes    
                case url.endsWith('/employees') && method === 'GET':
                    return getEmployees();
                case url.endsWith('/employees') && method === 'POST':
                    return createEmployee();
                case url.match(/\/employees\/\d+$/) && method === 'GET':
                    return getEmployeeById();
                case url.match(/\/employees\/\d+$/) && method === 'PUT':
                    return updateEmployee();
                case url.match(/\/employees\/\d+$/) && method === 'DELETE':
                    return deleteEmployee();
                case url.match(/\/employees\/\d+\/transfer$/) && method === 'POST':
                    return transferEmployee();
                case url.endsWith('/departments') && method === 'GET':
                    return getDepartments();
                case url.endsWith('/departments') && method === 'POST':
                    return createDepartment();
                case url.match(/\/departments\/\d+$/) && method === 'PUT':
                    return updateDepartment();
                case url.match(/\/departments\/\d+$/) && method === 'DELETE':
                    return deleteDepartment();
                case url.match(/\/workflows\/employee\/\d+$/) && method === 'GET':
                    return getEmployeeWorkflows();
                case url.endsWith('/workflows') && method === 'POST':
                    return createWorkflow();
                case url.endsWith('/requests') && method === 'GET':
                    return getRequests();
                case url.endsWith('/requests') && method === 'POST':
                    return createRequest();
                case url.match(/\/requests\/\d+$/) && method === 'PUT':
                    return updateRequest();
                case url.match(/\/requests\/\d+$/) && method === 'DELETE':
                    return deleteRequest();
                default:
                    // pass through any requests not handled above
                    return next.handle(request);
            }
        }

        // HR System route functions
        function getEmployees() {
            return authorize(null, () => {
                // Additional logging to debug authorization issues
                console.log('Fake backend: Authorized user accessing employees data');
                return ok(self.employees);
            });
        }
        
        function createEmployee() {
            return authorize(Role.Admin, () => {
                const employee = { id: self.employees.length + 1, ...body };
                
                // Make sure the employee has a userId (account) and departmentId
                if (!employee.userId) {
                    console.warn('Employee created without userId! Setting to default value');
                    employee.userId = 1; // Default to admin
                }
                
                if (!employee.departmentId) {
                    console.warn('Employee created without departmentId! Setting to default value');
                    employee.departmentId = 1; // Default to first department
                }
                
                console.log('Creating employee:', employee);
                self.employees.push(employee);
                
                // Automatically create an onboarding workflow for the new employee
                const onboardingWorkflow = {
                    id: self.workflows.length + 1,
                    employeeId: employee.id,
                    type: 'Onboarding',
                    details: { task: 'Complete HR Forms (Step 1)' },
                    status: 'Pending',
                    createdDate: new Date().toISOString(),
                    updatedDate: new Date().toISOString()
                };
                self.workflows.push(onboardingWorkflow);
                
                console.log(`Created onboarding workflow for new employee:`, onboardingWorkflow);
                
                return ok(employee);
            });
        }
        
        function getEmployeeById() {
            return authorize(null, () => {
                const id = parseInt(url.split('/').pop()!);
                const employee = self.employees.find(e => e.id === id);
                return employee ? ok(employee) : error('Employee not found');
            });
        }
        
        function updateEmployee() {
            return authorize(Role.Admin, () => {
                const id = parseInt(url.split('/').pop()!);
                const employeeIndex = self.employees.findIndex(e => e.id === id);
                if (employeeIndex === -1) return error('Employee not found');
                self.employees[employeeIndex] = { id, ...body };
                return ok(self.employees[employeeIndex]);
            });
        }
        
        function deleteEmployee() {
            return authorize(Role.Admin, () => {
                const id = parseInt(url.split('/').pop()!);
                self.employees = self.employees.filter(e => e.id !== id);
                return ok({ message: 'Employee deleted' });
            });
        }
        
        function transferEmployee() {
            return authorize(Role.Admin, () => {
                const id = parseInt(url.split('/')[2]);
                const employee = self.employees.find(e => e.id === id);
                if (!employee) return error('Employee not found');
                employee.departmentId = body.departmentId;
                self.workflows.push({ 
                    id: self.workflows.length + 1, 
                    employeeId: id, 
                    type: 'Transfer', 
                    details: body, 
                    status: 'Pending' 
                });
                return ok({ message: 'Employee transferred' });
            });
        }
        
        function getDepartments() {
            return authorize(null, () => ok(self.departments));
        }
        
        function createDepartment() {
            console.log('=======================================================');
            console.log('CREATE DEPARTMENT DEBUG - START');
            console.log('=======================================================');
            console.log('Create department called with body:', body);
            
            logAuthStatus('POST /departments');
            
            // Log the token parsing details
            const authHeader = headers.get('Authorization');
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.substring(7);
                console.log('Token being used for department creation:', token.substring(0, 20) + '...');
                
                try {
                    if (token.startsWith('fake-jwt-token.')) {
                        const payload = token.split('.')[1];
                        const decodedPayload = JSON.parse(atob(payload));
                        console.log('Decoded token payload:', decodedPayload);
                        
                        // Check token expiration
                        const tokenExpires = new Date(decodedPayload.exp * 1000);
                        const now = new Date();
                        console.log('Token expires at:', tokenExpires.toISOString());
                        console.log('Current time:', now.toISOString());
                        console.log('Token expired:', tokenExpires < now);
                        
                        // Log account information
                        const account = accounts.find(x => x.id === decodedPayload.id);
                        if (account) {
                            console.log('Account found from token:', {
                                id: account.id,
                                email: account.email,
                                role: account.role,
                                isActive: account.isActive
                            });
                            
                            // Find matching user in self.users array
                            console.log('Available users:', self.users);
                            const user = self.users.find(u => u.email === account.email);
                            if (user) {
                                console.log('User found from account:', user);
                                console.log('User has Admin role:', user.role === Role.Admin);
                            } else {
                                console.log('⚠️ ERROR: No matching user found in users array for account email:', account.email);
                                console.log('This may be why authorization is failing!');
                                
                                // Fix: Add the user on-the-fly if missing
                                self.users.push({
                                    id: account.id,
                                    email: account.email,
                                    password: 'password', // Default password
                                    role: account.role,
                                    employeeId: account.id
                                });
                                console.log('🔧 Created missing user for account:', account.email);
                            }
                        } else {
                            console.log('⚠️ ERROR: No account found for token ID:', decodedPayload.id);
                            console.log('Available accounts:', accounts.map(a => ({id: a.id, email: a.email, role: a.role})));
                        }
                    } else {
                        console.log('⚠️ ERROR: Token does not start with "fake-jwt-token."');
                    }
                } catch (e) {
                    console.error('⚠️ ERROR: Error processing token:', e);
                }
            } else {
                console.log('⚠️ ERROR: Invalid Authorization header format');
            }
            
            console.log('Trying to authorize with Admin role...');
            return authorize(Role.Admin, () => {
                console.log('✅ Authorization successful! Creating department...');
                const department = { id: self.departments.length + 1, ...body, employeeCount: 0 };
                self.departments.push(department);
                console.log('Department created successfully:', department);
                console.log('=======================================================');
                console.log('CREATE DEPARTMENT DEBUG - END');
                console.log('=======================================================');
                return ok(department);
            });
        }
        
        function updateDepartment() {
            return authorize(Role.Admin, () => {
                const id = parseInt(url.split('/').pop()!);
                const deptIndex = self.departments.findIndex(d => d.id === id);
                if (deptIndex === -1) return error('Department not found');
                self.departments[deptIndex] = { 
                    id, 
                    ...body, 
                    employeeCount: self.departments[deptIndex].employeeCount 
                };
                return ok(self.departments[deptIndex]);
            });
        }
        
        function deleteDepartment() {
            return authorize(Role.Admin, () => {
                const id = parseInt(url.split('/').pop()!);
                self.departments = self.departments.filter(d => d.id !== id);
                return ok({ message: 'Department deleted' });
            });
        }
        
        function getEmployeeWorkflows() {
            return authorize(null, () => {
                const employeeId = parseInt(url.split('/').pop()!);
                console.log(`Fake backend: Getting workflows for employee ID ${employeeId}`);
                
                let workflows = self.workflows.filter(w => w.employeeId === employeeId);
                
                // Enhance workflows with additional properties
                workflows = workflows.map(workflow => ({
                    ...workflow,
                    createdDate: new Date().toISOString(),
                    updatedDate: new Date().toISOString(),
                    type: workflow.type || 'Unknown',
                    status: workflow.status || 'Pending'
                }));
                
                console.log(`Fake backend: Found ${workflows.length} workflows:`, workflows);
                return ok(workflows);
            });
        }
        
        function createWorkflow() {
            return authorize(Role.Admin, () => {
                const workflow = { id: self.workflows.length + 1, ...body };
                self.workflows.push(workflow);
                return ok(workflow);
            });
        }
        
        function getRequests() {
            // Allow both admin and regular users to see requests
            return authorize(null, () => {
                const user = getUser();
                
                // If admin, return all requests
                if (user.role === Role.Admin) {
                    return ok(self.requests);
                }
                
                // If regular user, return only their requests
                const userRequests = self.requests.filter(r => r.employeeId === user.employeeId);
                console.log(`Filtered requests for user ${user.email}:`, userRequests);
                return ok(userRequests);
            });
        }
        
        function createRequest() {
            return authorize(null, () => {
                const user = getUser();
                
                // Get the actual employee record for this user
                let employeeId = user.employeeId;
                
                // If no employee record exists for this user, create one
                if (!self.employees.find(e => e.id === employeeId)) {
                    const newEmployee = {
                        id: self.employees.length + 1,
                        employeeId: `EMP${(self.employees.length + 1).toString().padStart(3, '0')}`,
                        userId: user.id,
                        position: 'Staff',
                        departmentId: 1,
                        hireDate: new Date().toISOString().split('T')[0],
                        status: 'Active'
                    };
                    
                    self.employees.push(newEmployee);
                    employeeId = newEmployee.id;
                    
                    console.log(`Created new employee record for user ${user.email}:`, newEmployee);
                }
                
                const request = { 
                    id: self.requests.length + 1, 
                    employeeId: employeeId, // Use the actual employee ID
                    status: body.status || 'Pending',
                    createdDate: new Date().toISOString(),
                    ...body 
                };
                
                // Ensure requestItems is an array
                if (!request.requestItems) {
                    request.requestItems = [];
                }
                
                console.log('Request created:', request);
                console.log('Employee ID used:', employeeId);
                console.log('Available employees:', self.employees);
                console.log('Available users:', self.users);
                console.log('Available accounts:', accounts);
                
                self.requests.push(request);
                return ok(request);
            });
        }
        
        function updateRequest() {
            return authorize(Role.Admin, () => {
                const id = parseInt(url.split('/').pop()!);
                const reqIndex = self.requests.findIndex(r => r.id === id);
                if (reqIndex === -1) return error('Request not found');
                self.requests[reqIndex] = { id, ...body };
                return ok(self.requests[reqIndex]);
            });
        }
        
        function deleteRequest() {
            return authorize(Role.Admin, () => {
                const id = parseInt(url.split('/').pop()!);
                self.requests = self.requests.filter(r => r.id !== id);
                return ok({ message: 'Request deleted' });
            });
        }

        // Account route functions
        function authenticate() {
            const { email, password } = body;
            
            console.log(`Authentication attempt for email: ${email}`);
            
            // First, find the account by email and password
            const account = accounts.find(x => x.email === email && x.password === password);
            
            // Check if account exists and is verified
            if (!account || !account.isVerified) {
                console.log(`Authentication failed: Account not found or not verified for email: ${email}`);
                return error('Email or password is incorrect');
            }
            
            // Check if the account is active for non-admin users
            if (account.role !== Role.Admin && account.isActive === false) {
                console.log(`Authentication failed: Account is deactivated for email: ${email}`);
                return error('Your account has been deactivated. Please contact an administrator.');
            }
            
            // Authentication successful - proceed with token generation
            console.log(`Authentication successful for: ${email}, role: ${account.role}`);
            account.refreshTokens = account.refreshTokens || [];
            account.refreshTokens.push(generateRefreshToken());
            localStorage.setItem(accountsKey, JSON.stringify(accounts));
            
            const token = generateJwtToken(account);
            console.log(`Generated token for ${email}: ${token}`);
            
            // After successful authentication, make sure users are in sync
            self.syncUsersWithAccounts();
            
            return ok({
                ...basicDetails(account),
                jwtToken: token
            });
        }

        function refreshToken() {
            const refreshToken = getRefreshToken();

            if (!refreshToken) return unauthorized();

            const account = accounts.find(x => x.refreshTokens.includes(refreshToken));

            if (!account) return unauthorized();

            // replace old refresh token with a new one and save
            account.refreshTokens = account.refreshTokens.filter(x => x !== refreshToken);
            account.refreshTokens.push(generateRefreshToken());
            localStorage.setItem(accountsKey, JSON.stringify(accounts));

            return ok({
                ...basicDetails(account),
                jwtToken: generateJwtToken(account)
            });
        }

        function revokeToken() {
            if (!isAuthenticated()) return unauthorized();

            const refreshToken = getRefreshToken();
            const account = accounts.find(x => x.refreshTokens.includes(refreshToken));

            // revoke token and save
            account.refreshTokens = account.refreshTokens.filter(x => x !== refreshToken);
            localStorage.setItem(accountsKey, JSON.stringify(accounts));

            return ok();
        }

        function register() {
            const account = body;

            if (accounts.find(x => x.email === account.email)) {
                // display email already registered "email" in alert
                setTimeout(() => {
                    alertService.info(`
                    <h4>Email Already Registered</h4>
                    <p>Your email <strong>${account.email}</strong> is already registered.</p>
                    <p>If you don't know your password please visit the <a href="${location.origin}/account/forgot-password">forgot password</a> page.</p>
                    <div><strong>Note:</strong> The fake backend displayed this "email" so you can test without an api. A real backend would send a real email.</div>
                    `, { autoClose: false });
                }, 1000);

                // always return ok() response to prevent email enumeration
                return ok();
            }

            // assign account id and a few other properties then save
            account.id = newAccountId();
            if (account.id === 1) {
                // first registered account is an admin
                account.role = Role.Admin;
            } else {
                account.role = Role.User;
            }
            account.dateCreated = new Date().toISOString();
            account.verificationToken = new Date().getTime().toString();
            account.isVerified = false;
            account.isActive = true;
            account.refreshTokens = [];
            delete account.confirmPassword;
            accounts.push(account);
            localStorage.setItem(accountsKey, JSON.stringify(accounts));

            // Update our users array to stay in sync
            self.syncUsersWithAccounts();

            // display verification email in alert
            setTimeout(() => {
                const verifyUrl = `${location.origin}/account/verify-email?token=${account.verificationToken}`;
                alertService.info(`
                <h4>Verification Email</h4>
                <p>Thanks for registering!</p>
                <p>Please click the below link to verify your email address:</p>
                <p><a href="${verifyUrl}">${verifyUrl}</a></p>
                <div><strong>Note:</strong> The fake backend displayed this "email" so you can test without an api. A real backend would send a real email.</div>
                `, { autoClose: false });
            }, 1000);

            return ok();
        }

        function verifyEmail() {
            const { token } = body;
            const account = accounts.find(x => !!x.verificationToken && x.verificationToken === token);

            if (!account) return error('Verification failed');

            // set is verified flag to true if token is valid
            account.isVerified = true;
            localStorage.setItem(accountsKey, JSON.stringify(accounts));

            return ok();
        }

        function forgotPassword() {
            const { email } = body;
            const account = accounts.find(x => x.email === email);

            // always return ok() response to prevent email enumeration
            if (!account) return ok();

            // create reset token that expires after 24 hours
            account.resetToken = new Date().getTime().toString();
            account.resetTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
            localStorage.setItem(accountsKey, JSON.stringify(accounts));

            // display password reset email in alert
            setTimeout(() => {
                const resetUrl = `${location.origin}/account/reset-password?token=${account.resetToken}`;
                alertService.info(`
                <h4>Reset Password Email</h4>
                <p>Please click the below link to reset your password, the link will be valid for 1 day:</p>
                <p><a href="${resetUrl}">${resetUrl}</a></p>
                <div><strong>Note:</strong> The fake backend displayed this "email" so you can test without an api. A real backend would send a real email.</div>
                `, { autoClose: false });
            }, 1000);

            return ok();
        }

        function validateResetToken() {
            const { token } = body;
            const account = accounts.find(x => x.resetToken && x.resetToken === token && new Date() < new Date(x.resetTokenExpires));

            if (!account) return error('Invalid token');

            return ok();
        }

        function resetPassword() {
            const { token, password } = body;
            const account = accounts.find(x =>
                !!x.resetToken && x.resetToken === token &&
                new Date() < new Date(x.resetTokenExpires)
            );

            if (!account) return error('Invalid token');
              // update password and remove reset token
            account.password = password;
            account.isVerified = true;
            delete account.resetToken;
            delete account.resetTokenExpires;
            localStorage.setItem(accountsKey, JSON.stringify(accounts));
            
            return ok();
        }

        function getAccounts() {
            if (!isAuthenticated()) return unauthorized();
            return ok(accounts.map(x => basicDetails(x)));
        }

        function getAccountById() {
            if (!isAuthenticated()) return unauthorized();

            let account = accounts.find(x => x.id === idFromUrl());

            // user accounts can get own profile and admin accounts can get all profiles
            if (account.id !== currentAccount().id && !isAuthorized(Role.Admin)) {
                return unauthorized();
            }

            return ok(basicDetails(account));
        }

        function createAccount() {
            if (!isAuthorized(Role.Admin)) return unauthorized();

            if (body.isActive === undefined) {
                body.isActive = true;
            }
            if (body.role === Role.Admin) {
                body.isActive = true;
            }
            
            const account = body;
            if (accounts.find(x => x.email === account.email)) {
                return error(`Email ${account.email} is already registered`);
            }

            // assign account id and a few other properties then save
            account.id = newAccountId();
            account.dateCreated = new Date().toISOString();
            account.isVerified = true;
            account.refreshTokens = [];
            delete account.confirmPassword;
            accounts.push(account);
            localStorage.setItem(accountsKey, JSON.stringify(accounts));

            // Update our users array to stay in sync
            self.syncUsersWithAccounts();

            return ok();
        }

        function updateAccount() {
            if (!isAuthenticated()) return unauthorized();

            let params = body;
            let account = accounts.find(x => x.id === idFromUrl());            // user accounts can update own profile and admin accounts can update all profiles
            if (account.id !== currentAccount().id && !isAuthorized(Role.Admin)) {
                return unauthorized();
            }

            // only update password if included
            if (!params.password) {
                delete params.password;
            }

            // don't save confirm password
            delete params.confirmPassword;

            // update and save account
            Object.assign(account, params);
            localStorage.setItem(accountsKey, JSON.stringify(accounts));

            // Update our users array to stay in sync
            self.syncUsersWithAccounts();

            return ok(basicDetails(account));
        }

        function deleteAccount() {
            if (!isAuthenticated()) return unauthorized();

            let account = accounts.find(x => x.id === idFromUrl());

            // user accounts can delete own account and admin accounts can delete any account
            if (account.id !== currentAccount().id && !isAuthorized(Role.Admin)) {
                return unauthorized();
            }

            // delete account then save
            accounts = accounts.filter(x => x.id !== idFromUrl());
            localStorage.setItem(accountsKey, JSON.stringify(accounts));

            // Update our users array to stay in sync
            self.syncUsersWithAccounts();

            return ok();
        }

        function updateAccountStatus() {
            if (!isAuthenticated() || !isAuthorized(Role.Admin)) {
                return unauthorized();
            }
            
            // Extract the account ID from the URL (e.g., /accounts/123/status)
            const urlParts = url.split('/');
            const id = parseInt(urlParts[urlParts.length - 2]);
            
            // Find the account by ID
            const account = accounts.find(x => x.id === id);
            
            // Check if account exists
            if (!account) {
                return notFound();
            }
            
            // Don't allow changing status of admin accounts
            if (account.role === Role.Admin) {
                return error('Cannot change status of admin accounts');
            }
            
            // Update the account status
            account.isActive = !!body.isActive;
            
            // Save the updated accounts to localStorage
            localStorage.setItem(accountsKey, JSON.stringify(accounts));
            
            // Update our users array to stay in sync
            self.syncUsersWithAccounts();
            
            // Return the updated account details
            return ok({
                ...basicDetails(account)
            });
        }

        // helper functions

        function ok(body?) {
            return of(new HttpResponse({ status: 200, body }))
                .pipe(delay(500));
        }

        function error(message) {
            return throwError({ error: { message } })
                .pipe(materialize(), delay(500), dematerialize());
        }

        function unauthorized() {
            return throwError({ status: 401, error: { message: 'Unauthorized' } })
                .pipe(materialize(), delay(500), dematerialize());
        }

        function notFound() {
            return throwError({ status: 404, error: { message: 'Not Found' } })
                .pipe(materialize(), delay(500), dematerialize());
        }

        function authorize(requiredRole, callback) {
            console.log(`FAKE BACKEND - Authorize function called with requiredRole: ${requiredRole || 'none'}`);
            console.log(`FAKE BACKEND - Current URL: ${url}, Method: ${method}`);
            
            const user = getUser();
            console.log(`FAKE BACKEND - User from getUser():`, user);
            
            if (!user) {
                console.error('FAKE BACKEND - Authorization failed: No user found from token');
                return unauthorized();
            }
            
            if (requiredRole && user.role !== requiredRole) {
                console.error(`FAKE BACKEND - Authorization failed: User role ${user.role} does not match required role ${requiredRole}`);
                return error('Forbidden');
            }
            
            console.log(`FAKE BACKEND - User authorized: ${user.email}, role: ${user.role}`);
            return callback();
        }

        function getUser() {
            const authHeader = headers.get('Authorization');
            console.log('FAKE BACKEND - Auth header:', authHeader ? `${authHeader.substring(0, 15)}...` : 'none');
            
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                console.log('FAKE BACKEND - Missing or invalid Authorization header');
                return null;
            }
            
            // Extract the token
            const token = authHeader.substring(7);
            console.log('FAKE BACKEND - Token:', token.substring(0, 15) + '...');
            
            try {
                // First, check for our specific fake-jwt-token format
                if (token.startsWith('fake-jwt-token.')) {
                    try {
                        // This matches our generateJwtToken function format
                        const payload = token.split('.')[1];
                        const decodedPayload = JSON.parse(atob(payload));
                        console.log('FAKE BACKEND - Decoded payload:', decodedPayload);
                        
                        // Verify token hasn't expired
                        const tokenExpired = Date.now() > (decodedPayload.exp * 1000);
                        console.log('FAKE BACKEND - Token expired:', tokenExpired);
                        if (tokenExpired) {
                            console.log('Token expired');
                            return null;
                        }
                        
                        // Get account from token
                        console.log('FAKE BACKEND - Looking for account with ID:', decodedPayload.id);
                        console.log('FAKE BACKEND - Available accounts:', accounts.map(a => ({id: a.id, email: a.email, role: a.role})));
                        const account = accounts.find(x => x.id === decodedPayload.id);
                        
                        if (account) {
                            console.log('FAKE BACKEND - Found account:', { id: account.id, email: account.email, role: account.role });
                            // Find and return matching user
                            console.log('FAKE BACKEND - Available users:', self.users);
                            const user = self.users.find(u => u.email === account.email);
                            
                            if (user) {
                                console.log(`FAKE BACKEND - Found user by token: ${user.email}, role: ${user.role}`);
                                return user;
                            } else {
                                console.log(`FAKE BACKEND - No matching user found for account email: ${account.email}`);
                                
                                // Create a user on-the-fly
                                const newUser = {
                                    id: account.id,
                                    email: account.email,
                                    password: account.password || 'password',
                                    role: account.role,
                                    employeeId: account.id
                                };
                                self.users.push(newUser);
                                console.log(`FAKE BACKEND - Created missing user: ${newUser.email}, role: ${newUser.role}`);
                                return newUser;
                            }
                        } else {
                            console.log(`FAKE BACKEND - No account found for ID: ${decodedPayload.id}`);
                        }
                    } catch (e) {
                        console.error('FAKE BACKEND - Error decoding JWT payload:', e);
                    }
                } else {
                    console.log('FAKE BACKEND - Not a fake-jwt-token format');
                }
                
                // Fallback: For any token that looks like JWT but doesn't match our format
                if (token && token.split('.').length === 3) {
                    console.log('FAKE BACKEND - Using fallback authentication for non-standard JWT');
                    const adminUser = self.users.find(u => u.role === Role.Admin);
                    console.log('FAKE BACKEND - Fallback user:', adminUser || self.users[0]);
                    return adminUser || self.users[0];
                }
            } catch (error) {
                console.error('FAKE BACKEND - Error processing token:', error);
            }
            
            console.log('FAKE BACKEND - No user found from token');
            return null;
        }

        function basicDetails(account) {
            const { id, title, firstName, lastName, email, role, dateCreated, isVerified, isActive } = account;
            return { id, title, firstName, lastName, email, role, dateCreated, isVerified, isActive };
        }

        function isAuthenticated() {
            return !!currentAccount();
        }

        function isAuthorized(role) {
            const account = currentAccount();
            if (!account) return false;
            return account.role === role;
        }

        function idFromUrl() {
            const urlParts = url.split('/');
            return parseInt(urlParts[urlParts.length - 1]);
        }

        function newAccountId() {
            return accounts.length ? Math.max(...accounts.map(x => x.id)) + 1 : 1;
        }

        function currentAccount() {
            const authHeader = headers.get('Authorization');
            if (!authHeader || !authHeader.startsWith('Bearer fake-jwt-token')) return;

            try {
                const jwtToken = JSON.parse(atob(authHeader.split('.')[1]));
                const tokenExpired = Date.now() > (jwtToken.exp * 1000);
                if (tokenExpired) {
                    console.log('Token expired');
                    return;
                }

                const account = accounts.find(x => x.id === jwtToken.id);
                return account;
            } catch (error) {
                console.error('Error parsing JWT token:', error);
                return;
            }
        }

        function generateJwtToken(account) {
            const tokenPayload = {
                exp: Math.round(new Date(Date.now() + 15 * 60 * 1000).getTime() / 1000),
                id: account.id
            };
            return `fake-jwt-token.${btoa(JSON.stringify(tokenPayload))}`;
        }

        function generateRefreshToken() {
            const token = new Date().getTime().toString();
            const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
            document.cookie = `fakeRefreshToken=${token}; expires=${expires}; path=/`;
            return token;
        }
        
        // Diagnostic helper function to check user and role
        function logAuthStatus(endpoint) {
            console.log(`\n==========================================`);
            console.log(`AUTH STATUS CHECK for endpoint: ${endpoint}`);
            console.log(`------------------------------------------`);
            const authHeader = headers.get('Authorization');
            console.log(`Authorization header present: ${!!authHeader}`);
            
            if (authHeader) {
                console.log(`Header starts with Bearer: ${authHeader.startsWith('Bearer ')}`);
                const token = authHeader.substring(7);
                console.log(`Token preview: ${token.substring(0, 15)}...`);
                
                try {
                    const parts = token.split('.');
                    if (parts.length === 3) {
                        const decoded = JSON.parse(atob(parts[1]));
                        console.log(`Token payload:`, decoded);
                        console.log(`Token expiration: ${new Date(decoded.exp * 1000).toISOString()}`);
                        console.log(`Token expired: ${new Date(decoded.exp * 1000) < new Date()}`);
                        
                        const account = accounts.find(x => x.id === decoded.id);
                        console.log(`Account found: ${!!account}`);
                        if (account) {
                            console.log(`Account details: ID=${account.id}, Email=${account.email}, Role=${account.role}`);
                            console.log(`Is Admin: ${account.role === Role.Admin}`);
                        }
                    }
                } catch (e) {
                    console.log(`Error decoding token: ${e.message}`);
                }
            }
            console.log(`==========================================\n`);
        }

        function getRefreshToken() {
            return (document.cookie.split(';').find(x => x.includes('fakeRefreshToken')) || '=').split('=')[1];
        }
    }
}

export const fakeBackendProvider = {
    provide: HTTP_INTERCEPTORS,
    useClass: FakeBackendInterceptor,
    multi: true
};
