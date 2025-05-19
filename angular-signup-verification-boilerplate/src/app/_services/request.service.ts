import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs'; // Make sure 'of' is imported here
import { tap, catchError } from 'rxjs/operators';

import { environment } from '@environments/environment';
import { Request } from '@app/_models';

const baseUrl = `${environment.apiUrl}/requests`;

@Injectable({ providedIn: 'root' })
export class RequestService {
    // Add cache for requests to improve loading speed
    private requestsCache: Request[] = [];
    private requestByIdCache: Map<string, Request> = new Map();

    constructor(private http: HttpClient) { }

    getAll(): Observable<Request[]> {
        // Return cached data if available
        if (this.requestsCache.length > 0) {
            console.log('Using cached requests data');
            
            // Return cache but refresh in background for next time
            this.refreshCache();
            
            return of(this.requestsCache);
        }

        return this.http.get<Request[]>(baseUrl).pipe(
            tap(requests => {
                console.log('Fetched requests data:', requests);
                
                // Normalize request data structure
                const processedRequests = requests.map(request => {
                    const normalizedRequest = { ...request };
                    
                    // Handle API inconsistency - it might return requestItems or RequestItems 
                    if (normalizedRequest['RequestItems'] && !normalizedRequest.requestItems) {
                        normalizedRequest.requestItems = normalizedRequest['RequestItems'];
                    } else if (!normalizedRequest.requestItems) {
                        normalizedRequest.requestItems = [];
                    }
                    
                    return normalizedRequest;
                });
                
                this.requestsCache = processedRequests;
                
                // Cache individual requests by ID
                processedRequests.forEach(request => {
                    if (request.id) {
                        this.requestByIdCache.set(request.id.toString(), request);
                    }
                });
            }),
            catchError(error => {
                console.error('Error getting all requests:', error);
                return throwError(() => this.extractErrorMessage(error));
            })
        );
    }

    // Add a method to refresh the cache in the background
    private refreshCache(): void {
        this.http.get<Request[]>(baseUrl).pipe(
            tap(requests => {
                console.log('Background refreshed requests data');
                
                // Process requests as before
                const processedRequests = requests.map(request => {
                    const normalizedRequest = { ...request };
                    
                    if (normalizedRequest['RequestItems'] && !normalizedRequest.requestItems) {
                        normalizedRequest.requestItems = normalizedRequest['RequestItems'];
                    } else if (!normalizedRequest.requestItems) {
                        normalizedRequest.requestItems = [];
                    }
                    
                    return normalizedRequest;
                });
                
                this.requestsCache = processedRequests;
                
                // Update cache
                processedRequests.forEach(request => {
                    if (request.id) {
                        this.requestByIdCache.set(request.id.toString(), request);
                    }
                });
            }),
            catchError(error => {
                console.error('Error refreshing requests cache:', error);
                return of(null);
            })
        ).subscribe();
    }

    getById(id: string): Observable<Request> {
        const idStr = id.toString();
        console.log(`Getting request with ID: ${idStr}`);
        
        // Check if we have this request in our by-ID cache
        const cachedRequest = this.requestByIdCache.get(idStr);
        if (cachedRequest) {
            console.log(`Using cached request for ID ${idStr}`, cachedRequest);
            return of(cachedRequest);
        }
        
        // Not in cache, fetch from API
        return this.http.get<Request>(`${baseUrl}/${id}`).pipe(
            tap(request => {
                console.log('Retrieved request data from API:', request);
                
                // Better request item handling
                if (request) {
                    // Ensure requestItems is properly set
                    if (request['RequestItems'] && !request.requestItems) {
                        request.requestItems = request['RequestItems'];
                        console.log('Normalized RequestItems to requestItems:', request.requestItems);
                    } else if (!request.requestItems) {
                        request.requestItems = [];
                        console.log('Initialized empty requestItems array');
                    }
                }
                
                this.requestByIdCache.set(idStr, request);
            }),
            catchError(error => {
                console.error(`Error retrieving request with ID ${id}:`, error);
                return throwError(() => this.extractErrorMessage(error));
            })
        );
    }

    // Retry getting a request by ID if it fails
    getByIdWithRetry(id: string, maxRetries = 2): Observable<Request> {
        return this.getById(id).pipe(
            catchError(error => {
                // If we have this request in our cache, use that
                const cachedRequest = this.requestByIdCache.get(id);
                if (cachedRequest) {
                    console.log(`Using cached request for ID ${id} after API error`);
                    return of(cachedRequest);
                }
                
                if (maxRetries > 0) {
                    console.log(`Retrying getById for request ${id}, ${maxRetries} retries left`);
                    return this.getByIdWithRetry(id, maxRetries - 1);
                }
                
                return throwError(() => error);
            })
        );
    }

    create(request: Request): Observable<Request> {
        console.log('Creating new request:', request);
        
        return this.http.post<Request>(baseUrl, request).pipe(
            tap(createdRequest => {
                console.log('Successfully created request:', createdRequest);
                
                // Update cache with the server response
                if (createdRequest && createdRequest.id) {
                    this.requestByIdCache.set(createdRequest.id.toString(), createdRequest);
                    // Clear the full requests cache to force a refresh
                    this.requestsCache = [];
                }
            }),
            catchError(error => {
                console.error('Error creating request:', error);
                return throwError(() => this.extractErrorMessage(error));
            })
        );
    }

    update(id: string, params: any): Observable<Request> {
        console.log(`Updating request ${id} with:`, params);
        
        // Ensure employeeId is a number
        if (params.employeeId) {
            params.employeeId = Number(params.employeeId);
        }
        
        // Ensure quantities are numbers
        if (params.requestItems) {
            params.requestItems = params.requestItems.map(item => ({
                ...item,
                quantity: Number(item.quantity)
            }));
        }
        
        return this.http.put<Request>(`${baseUrl}/${id}`, params).pipe(
            tap(updatedRequest => {
                console.log('Raw response from server:', updatedRequest);
                
                // Normalize the response data
                if (updatedRequest) {
                    // Handle both RequestItems and requestItems
                    if (updatedRequest['RequestItems'] && !updatedRequest.requestItems) {
                        updatedRequest.requestItems = updatedRequest['RequestItems'];
                    } else if (!updatedRequest.requestItems) {
                        updatedRequest.requestItems = [];
                    }
                    
                    // Update cache
                    this.requestByIdCache.set(id, updatedRequest);
                    // Clear the full requests cache to force a refresh
                    this.requestsCache = [];
                    
                    console.log('Normalized and cached updated request:', updatedRequest);
                }
            }),
            catchError(error => {
                console.error(`Error updating request ${id}:`, error);
                const errorMessage = this.extractErrorMessage(error);
                console.error('Extracted error message:', errorMessage);
                return throwError(() => errorMessage);
            })
        );
    }

    delete(id: string): Observable<any> {
        console.log(`Deleting request ${id}`);
        
        // Remove from caches
        this.requestByIdCache.delete(id);
        // Clear the full requests cache to force a refresh
        this.requestsCache = [];
        
        return this.http.delete<any>(`${baseUrl}/${id}`).pipe(
            tap(() => console.log(`Successfully deleted request ${id}`)),
            catchError(error => {
                console.error(`Error deleting request ${id}:`, error);
                return throwError(() => this.extractErrorMessage(error));
            })
        );
    }

    getByEmployee(employeeId: number): Observable<Request[]> {
        console.log(`Getting requests for employee ${employeeId}`);
        
        return this.http.get<Request[]>(`${baseUrl}/employee/${employeeId}`).pipe(
            tap(requests => console.log(`Found ${requests.length} requests for employee ${employeeId}`)),
            catchError(error => {
                console.error(`Error getting requests for employee ${employeeId}:`, error);
                return throwError(() => this.extractErrorMessage(error));
            })
        );
    }

    private extractErrorMessage(error: any): string {
        if (error instanceof HttpErrorResponse) {
            if (error.error?.message) {
                return error.error.message;
            } else if (error.status === 0) {
                return 'Unable to connect to server. Please try again later.';
            } else {
                return `Error ${error.status}: ${error.statusText || 'Unknown error'}`;
            }
        }
        return error?.message || 'An unknown error occurred';
    }
}
