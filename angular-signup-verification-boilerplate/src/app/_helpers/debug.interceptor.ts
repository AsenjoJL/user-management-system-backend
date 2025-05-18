import { Injectable } from '@angular/core';
import { HttpRequest, HttpResponse, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class DebugInterceptor implements HttpInterceptor {
    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        // Log detailed request information
        console.log('-------------------------');
        console.log('DEBUG REQUEST:');
        console.log(`URL: ${request.url}`);
        console.log(`Method: ${request.method}`);
        
        if (request.headers.has('Authorization')) {
            const authHeader = request.headers.get('Authorization');
            console.log(`Auth Header: ${authHeader.substring(0, 15)}...`);
            
            // Decode JWT token if present
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.substring(7);
                try {
                    const parts = token.split('.');
                    if (parts.length === 3) {
                        const decoded = JSON.parse(atob(parts[1]));
                        console.log('Token payload:', decoded);
                        console.log('Token expiration:', new Date(decoded.exp * 1000).toISOString());
                        console.log('Current time:', new Date().toISOString());
                        console.log('Token expired:', new Date(decoded.exp * 1000) < new Date());
                    }
                } catch (e) {
                    console.log('Could not decode token', e);
                }
            }
        } else {
            console.log('No Authorization header present');
        }
        
        console.log(`Body:`, request.body);
        console.log('-------------------------');
        
        return next.handle(request).pipe(
            tap({
                next: (event) => {
                    if (event instanceof HttpResponse) {
                        console.log('-------------------------');
                        console.log('DEBUG RESPONSE:');
                        console.log(`URL: ${request.url}`);
                        console.log(`Status: ${event.status}`);
                        console.log(`Body:`, event.body);
                        console.log('-------------------------');
                    }
                },
                error: (error) => {
                    if (error instanceof HttpErrorResponse) {
                        console.log('-------------------------');
                        console.log('DEBUG ERROR RESPONSE:');
                        console.log(`URL: ${request.url}`);
                        console.log(`Status: ${error.status}`);
                        console.log(`Error message: ${error.message}`);
                        console.log(`Error details:`, error.error);
                        console.log('-------------------------');
                    }
                }
            })
        );
    }
}
