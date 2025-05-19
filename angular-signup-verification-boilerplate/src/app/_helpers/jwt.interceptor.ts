import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { environment } from '@environments/environment';
import { AccountService } from '@app/_services';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
    constructor(private accountService: AccountService) {}

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        // Skip if it's a refresh token request to avoid infinite loops
        if (request.url.includes('/refresh-token')) {
            return next.handle(request);
        }

        const account = this.accountService.accountValue;
        const isLoggedIn = account?.jwtToken;
        const isApiUrl = request.url.startsWith(environment.apiUrl);

        if (isLoggedIn && isApiUrl) {
            request = request.clone({
                setHeaders: {
                    Authorization: `Bearer ${account.jwtToken}`
                }
            });
        }

        return next.handle(request).pipe(
            catchError(error => {
                // Handle 401 unauthorized errors
                if (error.status === 401 && isLoggedIn && isApiUrl) {
                    return this.accountService.refreshToken().pipe(
                        catchError(refreshError => {
                            this.accountService.logout();
                            return throwError(refreshError);
                        })
                    );
                }
                return throwError(error);
            })
        );
    }
}