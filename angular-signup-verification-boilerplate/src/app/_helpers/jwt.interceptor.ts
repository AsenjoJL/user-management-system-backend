import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '@environments/environment';
import { AccountService } from '@app/_services';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
    constructor(private accountService: AccountService) {}    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        // add authorization header with jwt token if account is logged in and request is to api url
        const account = this.accountService.accountValue;
        const isLoggedIn = account && account.jwtToken;
        const isApiUrl = request.url.startsWith(environment.apiUrl);
        
        console.log('JWT Interceptor - Request URL:', request.url);
        console.log('JWT Interceptor - Is API URL:', isApiUrl);
        console.log('JWT Interceptor - Is Logged In:', isLoggedIn);
        
        if (isLoggedIn && isApiUrl) {
            // Clone the request with the token in the Authorization header
            request = request.clone({
                setHeaders: { 
                    Authorization: `Bearer ${account.jwtToken}`
                }
            });
            
            // Enhanced logging
            console.log('Sending authenticated request to:', request.url);
            console.log('User role:', account.role);
            
            // Don't log the actual token in production
            const tokenPreview = account.jwtToken.substring(0, 15) + '...';
            console.log('Token preview:', tokenPreview);
            
            try {
                // Check if token is parseable (for debugging)
                const tokenParts = account.jwtToken.split('.');
                if (tokenParts.length === 3) {
                    const payload = JSON.parse(atob(tokenParts[1]));
                    console.log('Token payload:', payload);
                    
                    // Check token expiration
                    if (payload.exp) {
                        const expiryDate = new Date(payload.exp * 1000);
                        const now = new Date();
                        console.log('Token expires:', expiryDate);
                        console.log('Token expired:', expiryDate < now);
                    }
                }
            } catch (e) {
                console.error('Error parsing token:', e);
            }
        } else if (!isLoggedIn && isApiUrl) {
            console.warn('Making unauthenticated request to API URL:', request.url);
        }

        return next.handle(request);
    }
}