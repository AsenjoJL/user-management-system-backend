import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, finalize } from 'rxjs/operators';

import { environment } from '@environments/environment';
import { Account } from '@app/_models';

const baseUrl = `${environment.apiUrl}/accounts`;
@Injectable({ providedIn: 'root' })
export class AccountService {
    [x: string]: any;
    private accountSubject: BehaviorSubject<Account>;
    public account: Observable<Account>;

    constructor(
        private router: Router,
        private http: HttpClient
    ) {
        this.accountSubject = new BehaviorSubject<Account>(null);
        this.account = this.accountSubject.asObservable();
    }

    public get accountValue(): Account {
        return this.accountSubject.value;
    }

    login(email: string, password: string) {
        return this.http.post<any>(`${environment.apiUrl}/accounts/authenticate`, { email, password })
            .pipe(map(response => {
                // Check if non-admin account is active before allowing login
                if (response.role !== 'Admin' && !response.isActive) {
                    throw new Error('Your account has been deactivated. Please contact an administrator.');
                }
                
                // Authentication successful
                this.accountSubject.next(response);
                this.startRefreshTokenTimer();
                return response;
            }));
    }

    logout() {
        this.http.post<any>(`${baseUrl}/revoke-token`, {}, { withCredentials: true }).subscribe();
        this.stopRefreshTokenTimer();
        this.accountSubject.next(null);
        this.router.navigate(['/account/login']);
    }

    refreshToken() {
        return this.http.post<any>(`${baseUrl}/refresh-token`, {}, { withCredentials: true })
            .pipe(map(account => {
                this.accountSubject.next(account);
                this.startRefreshTokenTimer();
                return account;
            }));
    }

    register(account: Account) {
        return this.http.post(`${baseUrl}/register`, account);
    }

    verifyEmail(token: string) {
        return this.http.post(`${baseUrl}/verify-email`, { token });
    }

    forgotPassword(email: string) {
        return this.http.post(`${baseUrl}/forgot-password`, { email});
    }

    validateResetToken(token: string) {
        return this.http.post(`${baseUrl}/validate-reset-token`, { token });
    }

    resetPassword(token: string, password: string, confirmPassword: string) {
        return this.http.post(`${baseUrl}/reset-password`, { token, password, confirmPassword });
    }

    getAll() {
        return this.http.get<Account[]>(baseUrl);
    }

    getById(id: string) {
        return this.http.get<Account>(`${baseUrl}/${id}`);
    }

    create(params) {
        return this.http.post(baseUrl, params);
    }

    update(id, params) {
        return this.http.put(`${baseUrl}/${id}`, params)
            .pipe(map((account: any) => {
                // update the current account if it was updated
                if (account.id === this.accountValue.id) {
                    // publish updated account to subscribers
                    account = { ...this.accountValue, ...account };
                    this.accountSubject.next(account);
                }
                return account;
            }));
    }

    delete(id: string) {
        return this.http.delete(`${baseUrl}/${id}`)
            .pipe(finalize(() => {
                // auto logout if the logged in account deleted their own record
                if (id === this.accountValue.id)
                    this.logout();
            }));
    }

    updateStatus(id: string, isActive: boolean) {
        return this.http.put<any>(`${baseUrl}/${id}/status`, { isActive })
            .pipe(map(account => {
                // If we're updating the current user, update the subject
                if (account.id === this.accountValue.id) {
                    // publish updated account to subscribers
                    account = { ...this.accountValue, ...account };
                    this.accountSubject.next(account);
                }
                return account;
            }));
    }

    // helper methods

    private refreshTokenTimeout;    private startRefreshTokenTimer() {
        try {
            // parse json object from base64 encoded jwt token
            const jwtToken = JSON.parse(atob(this.accountValue.jwtToken.split('.')[1]));

            // set a timeout to refresh the token a minute before it expires
            const expires = new Date(jwtToken.exp * 1000);
            const timeout = expires.getTime() - Date.now() - (60 * 1000);
            
            // Make sure we don't set a negative timeout
            if (timeout > 0) {
                console.log(`Token refresh scheduled in ${Math.round(timeout/1000)} seconds`);
                this.refreshTokenTimeout = setTimeout(() => {
                    console.log('Refreshing token...');
                    this.refreshToken().subscribe({
                        next: () => console.log('Token refreshed successfully'),
                        error: error => console.error('Token refresh failed:', error)
                    });
                }, timeout);
            } else {
                // Token already expired, try to refresh immediately
                console.log('Token already expired, refreshing immediately');
                this.refreshToken().subscribe();
            }
        } catch (error) {
            console.error('Error starting token refresh timer:', error);
        }
    }

    private stopRefreshTokenTimer() {
        if (this.refreshTokenTimeout) {
            clearTimeout(this.refreshTokenTimeout);
            this.refreshTokenTimeout = null;
        }
    }
}