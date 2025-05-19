import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { AccountService } from '@app/_services';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
    constructor(private accountService: AccountService) { }    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        return next.handle(request).pipe(catchError(err => {
            // Only log out for auth-related endpoints returning 401
            const isAuthEndpoint = request.url.includes('/authenticate') || 
                                   request.url.includes('/refresh-token');
                
            if (err.status === 401 && this.accountService.accountValue) {
                if (isAuthEndpoint || request.url.includes('/revoke-token')) {
                    // Auto logout if authentication endpoints fail with 401
                    console.log('Authentication failed, logging out');
                    this.accountService.logout();
                } else {
                    // For other API endpoints, try to refresh the token first
                    console.log('API call returned 401, attempting to refresh token');
                    this.accountService.refreshToken().subscribe({
                        error: () => {
                            // If refresh fails, then logout
                            console.log('Token refresh failed, logging out');
                            this.accountService.logout();
                        }
                    });
                }
            } else if (err.status === 403 && this.accountService.accountValue) {
                // For 403 Forbidden errors, don't log out but show access denied message
                console.log('Access forbidden to resource');
            }

            const error = (err && err.error && err.error.message) || err.statusText;
            console.error('API error:', err);
            return throwError(error);
        }));
    }
}