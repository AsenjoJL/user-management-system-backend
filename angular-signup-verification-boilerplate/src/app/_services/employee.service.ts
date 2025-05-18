import { Injectable, Injector } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap, first } from 'rxjs/operators';
import { environment } from '@environments/environment';
import { Employee } from '@app/_models';
import { WorkflowService } from '@app/_services/workflow.service';

const baseUrl = `${environment.apiUrl}/employees`;

@Injectable({ providedIn: 'root' })
export class EmployeeService {
    constructor(private http: HttpClient, private injector: Injector) { }

    getAll(): Observable<Employee[]> {
        return this.http.get<Employee[]>(baseUrl)
            .pipe(
                tap(employees => console.log('Fetched employees:', employees)),
                catchError(this.handleError)
            );
    }
    
    getById(id: string): Observable<Employee> {
        return this.http.get<Employee>(`${baseUrl}/${id}`)
            .pipe(
                tap(employee => console.log('Fetched employee:', employee)),
                catchError(this.handleError)
            );
    }

    create(params: Employee): Observable<Employee> {
        console.log('Creating employee:', params);
        return this.http.post<Employee>(baseUrl, params)
            .pipe(
                tap(employee => {
                    console.log('Created employee:', employee);
                    
                    // Automatically create an onboarding workflow for the new employee
                    if (employee && employee.id) {
                        this.createOnboardingWorkflow(employee.id);
                    }
                }),
                catchError(this.handleError)
            );
    }

    update(id: string, params: Employee): Observable<Employee> {
        console.log('Updating employee:', params);
        return this.http.put<Employee>(`${baseUrl}/${id}`, params)
            .pipe(
                tap(employee => console.log('Updated employee:', employee)),
                catchError(this.handleError)
            );
    }

    delete(id: string): Observable<any> {
        return this.http.delete(`${baseUrl}/${id}`)
            .pipe(
                tap(() => console.log('Deleted employee ID:', id)),
                catchError(this.handleError)
            );
    }
    
    transfer(id: string, params: { departmentId: number }): Observable<any> {
        console.log('Transferring employee:', id, params);
        return this.http.post(`${baseUrl}/${id}/transfer`, params)
            .pipe(
                tap(response => console.log('Transferred employee:', response)),
                catchError(this.handleError)
            );
    }

    getEmployeeWorkflows(id: string): Observable<any[]> {
        return this.http.get<any[]>(`${environment.apiUrl}/workflows/employee/${id}`)
            .pipe(
                catchError(this.handleError)
            );
    }
    
    // Error handling
    private handleError(error: HttpErrorResponse) {
        console.error('API Error:', error);
        
        let errorMessage = '';
        if (error.error instanceof ErrorEvent) {
            // Client-side error
            errorMessage = `Error: ${error.error.message}`;
        } else {
            // Server-side error
            if (error.error?.message) {
                errorMessage = error.error.message;
            } else if (error.status === 0) {
                errorMessage = 'Cannot connect to server. Please check your internet connection.';
            } else {
                errorMessage = `Error Code: ${error.status}, Message: ${error.message}`;
            }
        }
        
        return throwError(() => errorMessage);
    }

    // Add this helper method to create an onboarding workflow
    private createOnboardingWorkflow(employeeId: number): void {
        const workflowService = this.injector.get(WorkflowService);
        workflowService.createOnboarding({ employeeId })
            .pipe(first())
            .subscribe({
                next: workflow => console.log('Created onboarding workflow:', workflow),
                error: error => console.error('Error creating onboarding workflow:', error)
            });
    }
}
