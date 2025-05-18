import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { retry, catchError } from 'rxjs/operators';

@Injectable()
export class RetryInterceptor implements HttpInterceptor {
    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        // Skip retry for authentication-related endpoints
        const skipRetry = 
            request.url.includes('/authenticate') || 
            request.url.includes('/refresh-token') || 
            request.url.includes('/revoke-token');
        
        if (skipRetry) {
            return next.handle(request);
        }
        
        // Apply retry mechanism (3 attempts) to all other API calls
        return next.handle(request).pipe(
            retry(2),
            catchError((error) => {
                console.log(`API call error after retries:`, error.status);
                return throwError(error);
            })
        );
    }
}
