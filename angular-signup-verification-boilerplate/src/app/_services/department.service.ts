import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';

import { environment } from '@environments/environment';
import { Department } from '@app/_models';

const baseUrl = `${environment.apiUrl}/departments`;

@Injectable({ providedIn: 'root' })
export class DepartmentService {
    // Local cache of departments to speed up loading
    private departmentsCache: Department[] = [];
    
    constructor(private http: HttpClient) { }

    getAll(options?: { fastReturn?: boolean }) {
        // Fast return option will immediately return cached data
        if (options?.fastReturn && this.departmentsCache.length > 0) {
            console.log("Using cached departments data");
            return of(this.departmentsCache);
        }
        
        // If we have cached departments, return them immediately
        if (this.departmentsCache.length > 0) {
            // Return cache immediately but still refresh in background
            const cached = of(this.departmentsCache);
            
            // Refresh cache in background
            this.refreshDepartmentsCache();
            
            return cached;
        }
        
        // Cache is empty, do a full fetch
        return this.http.get<Department[]>(baseUrl).pipe(
            tap(departments => console.log('Fetched departments:', departments)),
            map(departments => {
                this.departmentsCache = departments; // Cache the results
                return departments;
            }),
            catchError(this.handleError)
        );
    }

    // Background refresh function 
    private refreshDepartmentsCache() {
        this.http.get<Department[]>(baseUrl).pipe(
            map(departments => {
                this.departmentsCache = departments;
                console.log('Departments cache refreshed in background');
            }),
            catchError(error => {
                console.error('Background refresh failed:', error);
                return of(null);
            })
        ).subscribe();
    }

    getById(id: string) {
        // If we have the department in cache, return it immediately
        const cachedDept = this.departmentsCache.find(d => d.id === parseInt(id));
        if (cachedDept) {
            return of(cachedDept);
        }
        
        // Not in cache, fetch from API
        return this.http.get<Department>(`${baseUrl}/${id}`).pipe(
            tap(department => console.log('Fetched department by ID:', department)),
            catchError(this.handleError)
        );
    }

    create(department: Department) {
        // Clear the cache on create to force a refresh
        this.departmentsCache = [];
        
        console.log('Department service creating department:', department);
        
        // Add headers to ensure proper content type
        const httpOptions = {
            headers: new HttpHeaders({
                'Content-Type': 'application/json'
            })
        };
        
        // Ensure we only send data the API expects
        const departmentData = {
            name: department.name,
            description: department.description
        };
        
        // Log the exact request data being sent
        console.log('Sending department creation request with data:', JSON.stringify(departmentData));
        
        return this.http.post<Department>(baseUrl, departmentData, httpOptions).pipe(
            tap(newDepartment => console.log('Created department:', newDepartment)),
            catchError(error => {
                console.error('Department creation error:', error);
                // Inspect the error in detail
                if (error instanceof HttpErrorResponse) {
                    console.error('Status:', error.status);
                    console.error('Status text:', error.statusText);
                    console.error('URL:', error.url);
                    console.error('Error body:', error.error);
                    console.error('Error type:', error.name);
                }
                return this.handleError(error);
            })
        );
    }

    update(id: string, department: Department) {
        // Clear the cache on update to force a refresh
        this.departmentsCache = [];
        
        // Make sure we send exactly what the API expects
        const departmentData = {
            name: department.name,
            description: department.description
        };
        
        return this.http.put<Department>(`${baseUrl}/${id}`, departmentData).pipe(
            tap(updatedDepartment => console.log('Updated department:', updatedDepartment)),
            catchError(this.handleError)
        );
    }

    delete(id: string) {
        // Clear the cache on delete to force a refresh
        this.departmentsCache = [];
        
        return this.http.delete(`${baseUrl}/${id}`).pipe(
            tap(() => console.log('Deleted department ID:', id)),
            catchError(this.handleError)
        );
    }
    
    // Improved error handler
    private handleError(error: HttpErrorResponse) {
        console.error('API Error:', error);
        
        if (error.error instanceof ErrorEvent) {
            // Client-side error
            console.error('Client error:', error.error.message);
            return throwError(() => ({ message: `Client error: ${error.error.message}` }));
        } else {
            // Server-side error
            console.error(`Server error: ${error.status} ${error.statusText}`);
            console.error('Error body:', error.error);
            
            let errorMessage: string;
            
            if (error.error?.message) {
                errorMessage = error.error.message;
            } else if (error.status === 0) {
                errorMessage = 'Cannot connect to server. Please check your internet connection or try again later.';
            } else {
                errorMessage = `Server error: ${error.status} ${error.statusText || 'Unknown error'}`;
            }
            
            return throwError(() => ({ message: errorMessage }));
        }
    }
}
