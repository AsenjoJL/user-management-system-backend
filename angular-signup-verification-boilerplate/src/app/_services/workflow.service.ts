import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, delay, switchMap, tap } from 'rxjs/operators';

import { environment } from '@environments/environment';
import { Workflow } from '@app/_models';

export interface RequestItem {
  id?: number;
  name: string;
  quantity: number;
  description?: string;
}

export interface Request {
  id: number;
  type: string;
  description?: string;
  status: string;
  requesterName?: string;
  requesterId?: string;
  dateSubmitted: Date;
  dateUpdated?: Date;
  approverName?: string;
  approverId?: string;
  comments?: string;
  employee?: {
    id: string;
    employeeId: string;
    firstName?: string;
    lastName?: string;
  };
  requestItems?: RequestItem[];
}

const baseUrl = `${environment.apiUrl}/workflows`;

@Injectable({ providedIn: 'root' })
export class WorkflowService {
  // Cache to persist workflow statuses between page navigations
  private workflowCache: Map<string, Workflow> = new Map();
  
  constructor(private http: HttpClient) { }

  getByEmployeeId(employeeId: number): Observable<Workflow[]> {
    console.log(`Getting workflows for employee ${employeeId}`);
    return this.http.get<Workflow[]>(`${baseUrl}/employee/${employeeId}`).pipe(
      tap(workflows => console.log(`Received ${workflows.length} workflows from API`)),
      map(workflows => {
        // Apply any cached statuses to the workflows
        return workflows.map(workflow => {
          const cachedWorkflow = this.workflowCache.get(workflow.id?.toString());
          if (cachedWorkflow) {
            return { ...workflow, status: cachedWorkflow.status };
          }
          return workflow;
        });
      }),
      catchError(error => {
        console.error(`Error getting workflows for employee ${employeeId}:`, error);
        // Return empty array on error instead of mock data
        return of([]);
      })
    );
  }

  // Helper method to format request details for workflow creation
  private formatRequestDetails(request: any) {
    // Extract and format item information
    const itemsText = request.requestItems
      ? request.requestItems.map((item: any) => {
          return `${item.name} (x${item.quantity})`;
        }).join(', ')
      : '';
      
    return {
      requestId: request.id,
      items: itemsText
    };
  }

  // Helper method to create or update a workflow for the request
  private createRequestWorkflow(request: Request): Observable<Workflow> {
    // Skip workflow creation if request is invalid
    if (!request || !request.id) {
      console.warn('Cannot create workflow for invalid request:', request);
      return of(null);
    }
    
    // Get employeeId safely - handle both string and number formats
    const employeeId = typeof request.employee?.id === 'string'
      ? parseInt(request.employee.id, 10)
      : request.employee?.id;
      
    if (!employeeId) {
      console.warn('Cannot create workflow without employeeId:', request);
      return of(null);
    }
    
    // Prepare workflow details based on request type
    const itemsText = request.requestItems
      ? request.requestItems.map(item => {
          return `${item.name} (x${item.quantity})`;
        }).join(', ')
      : '';
    
    // Create workflow object with detailed information
    const workflow = {
      employeeId: employeeId, // Now guaranteed to be a number
      type: `${request.type} Request`,
      details: {
        items: itemsText,
        requestId: request.id
      },
      status: 'Pending' as 'Pending' | 'Approved' | 'Rejected'
    };
    
    console.log('Creating workflow for request:', workflow);
    return this.create(workflow);
  }

  create(workflow: Workflow): Observable<Workflow> {
    console.log('Creating workflow:', workflow);
    
    // Format details if this is a request type workflow
    if (workflow.type && workflow.type.includes('Request') && workflow.details) {
      // Ensure the request details are properly formatted
      if (!workflow.details.items && workflow.details.requestItems) {
        workflow.details = this.formatRequestDetails(workflow.details);
      }
    }
    
    return this.http.post<Workflow>(baseUrl, workflow).pipe(
      tap(createdWorkflow => console.log('Created workflow:', createdWorkflow)),
      catchError(error => {
        console.error('Error creating workflow:', error);
        // Return a mock success response with the workflow data
        return of({ ...workflow, id: Math.floor(Math.random() * 1000) });
      })
    );
  }

  updateStatus(id: number | string, status: 'Pending' | 'Approved' | 'Rejected'): Observable<Workflow> {
    // Make sure id is always converted to string for consistency
    const idStr = id.toString();
    
    console.log(`Updating workflow ${idStr} status to ${status}`);
    
    // Update the cache immediately for optimistic UI updates
    const existingWorkflow = this.workflowCache.get(idStr);
    
    if (existingWorkflow) {
      // If the workflow already exists in cache, just update its status
      existingWorkflow.status = status;
      this.workflowCache.set(idStr, existingWorkflow);
    } else {
      // If it doesn't exist in cache, create a minimal valid Workflow object
      const minimalWorkflow: Workflow = {
        id: Number(idStr),
        employeeId: 0, // Default value
        type: 'Unknown', // Default value
        details: {}, // Default empty object
        status: status
      };
      this.workflowCache.set(idStr, minimalWorkflow);
    }
    
    // Make the actual API call
    return this.http.put<Workflow>(`${baseUrl}/${idStr}/status`, { status }).pipe(
      tap(updatedWorkflow => {
        console.log('Workflow status updated successfully:', updatedWorkflow);
        // Update cache with the response from the server
        this.workflowCache.set(idStr, updatedWorkflow);
      }),
      catchError(error => {
        console.error(`Error updating workflow ${idStr} status:`, error);
        return throwError(() => error);
      })
    );
  }

  createOnboarding(params: { employeeId: number, details?: any }): Observable<Workflow> {
    console.log('Creating onboarding workflow:', params);
    return this.http.post<Workflow>(`${baseUrl}/onboarding`, params).pipe(
      tap(workflow => console.log('Created onboarding workflow:', workflow)),
      catchError(error => {
        console.error('Error creating onboarding workflow:', error);
        return throwError(() => error);
      })
    );
  }

  // Get all requests
  getAllRequests(): Observable<Request[]> {
    return this.http.get<Request[]>(`${baseUrl}/requests`).pipe(
      catchError(() => {
        // Mock data if API fails or doesn't exist yet
        return of([
          { 
            id: 1, 
            type: 'Equipment Request', 
            status: 'Pending',
            dateSubmitted: new Date('2023-11-01'),
            employee: { id: '1', employeeId: 'EMP001', firstName: 'John', lastName: 'Doe' },
            requestItems: [
              { id: 1, name: 'Laptop', quantity: 1, description: 'MacBook Pro 16"' },
              { id: 2, name: 'Monitor', quantity: 2, description: '27" 4K Display' }
            ]
          },
          { 
            id: 2, 
            type: 'Office Supplies', 
            status: 'Approved',
            dateSubmitted: new Date('2023-10-25'),
            dateUpdated: new Date('2023-10-26'),
            employee: { id: '2', employeeId: 'EMP002', firstName: 'Jane', lastName: 'Smith' },
            requestItems: [
              { id: 3, name: 'Notebook', quantity: 5 },
              { id: 4, name: 'Pens', quantity: 20 }
            ],
            approverName: 'Admin User',
            approverId: 'admin-id'
          },
          { 
            id: 3, 
            type: 'Training Request', 
            status: 'Rejected',
            dateSubmitted: new Date('2023-10-15'),
            dateUpdated: new Date('2023-10-17'),
            employee: { id: '3', employeeId: 'EMP003', firstName: 'Mike', lastName: 'Johnson' },
            requestItems: [
              { id: 5, name: 'Angular Course', quantity: 1, description: 'Advanced Angular Training' }
            ],
            approverName: 'Admin User',
            approverId: 'admin-id',
            comments: 'Budget constraints, please resubmit next quarter'
          }
        ]).pipe(delay(1000)); // Add artificial delay to simulate network
      })
    );
  }

  // Get requests for a specific user
  getUserRequests(userId: string): Observable<Request[]> {
    return this.http.get<Request[]>(`${baseUrl}/requests/user/${userId}`).pipe(
      catchError(() => {
        // Mock filtered data
        return this.getAllRequests().pipe(
          map(requests => requests.filter(req => req.employee?.id === userId))
        );
      })
    );
  }

  // Get a specific request by ID
  getRequestById(id: number): Observable<Request> {
    return this.http.get<Request>(`${baseUrl}/requests/${id}`).pipe(
      catchError(() => {
        // Mock data for a specific request
        return this.getAllRequests().pipe(
          map(requests => requests.find(req => req.id === id))
        );
      })
    );
  }

  // Create a new request
  createRequest(request: Partial<Request>): Observable<Request> {
    return this.http.post<Request>(`${baseUrl}/requests`, request).pipe(
      catchError(() => {
        // Mock creating a request
        const newRequest: Request = {
          id: Math.floor(Math.random() * 1000) + 10,
          status: 'Pending',
          dateSubmitted: new Date(),
          ...request
        } as Request;
        return of(newRequest).pipe(delay(500));
      })
    );
  }

  // Update request status (approve/reject)
  updateRequestStatus(id: number, status: string, comments?: string): Observable<Request> {
    return this.http.put<Request>(`${baseUrl}/requests/${id}/status`, { status, comments }).pipe(
      catchError(() => {
        // Mock updating status
        return this.getRequestById(id).pipe(
          map(request => {
            return {
              ...request,
              status,
              comments,
              dateUpdated: new Date()
            };
          }),
          delay(500)
        );
      })
    );
  }

  // Delete a request
  deleteRequest(id: number): Observable<void> {
    return this.http.delete<void>(`${baseUrl}/requests/${id}`).pipe(
      catchError(() => {
        // Mock delete operation
        return of(undefined).pipe(delay(500));
      })
    );
  }

  // Update a request
  updateRequest(id: number, request: Partial<Request>): Observable<Request> {
    return this.http.put<Request>(`${baseUrl}/requests/${id}`, request).pipe(
      catchError(() => {
        // Mock update operation
        const updatedRequest = {
          ...request,
          id,
          dateUpdated: new Date()
        } as Request;
        return of(updatedRequest).pipe(delay(500));
      })
    );
  }

  getAll(): Observable<Workflow[]> {
    return this.http.get<Workflow[]>(baseUrl).pipe(
      catchError(error => {
        console.error('Error fetching all workflows:', error);
        return of([]);
      })
    );
  }

  getById(id: string): Observable<Workflow> {
    // Check cache first
    const cachedWorkflow = this.workflowCache.get(id);
    if (cachedWorkflow) {
      return of(cachedWorkflow);
    }
    
    return this.http.get<Workflow>(`${baseUrl}/${id}`).pipe(
      tap(workflow => {
        console.log('Fetched workflow by ID:', workflow);
        // Update cache
        if (workflow) {
          this.workflowCache.set(id, workflow);
        }
      }),
      catchError(error => {
        console.error(`Error fetching workflow ID ${id}:`, error);
        return throwError(() => error);
      })
    );
  }

  update(id: string, params: any): Observable<Workflow> {
    console.log('Updating workflow with params:', params);
    
    return this.http.put<Workflow>(`${baseUrl}/${id}`, params).pipe(
      tap(workflow => {
        console.log('Workflow updated successfully:', workflow);
        // Update cache
        const cachedWorkflow = this.workflowCache.get(id);
        if (cachedWorkflow) {
          this.workflowCache.set(id, { ...cachedWorkflow, ...workflow });
        } else {
          this.workflowCache.set(id, workflow);
        }
      }),
      catchError(error => {
        console.error('Error updating workflow:', error);
        return throwError(() => error);
      })
    );
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${baseUrl}/${id}`).pipe(
      tap(() => {
        console.log(`Workflow ${id} deleted successfully`);
        // Remove from cache
        this.workflowCache.delete(id);
      }),
      catchError(error => {
        console.error(`Error deleting workflow ${id}:`, error);
        return throwError(() => error);
      })
    );
  }
  
  // Keep these methods for backward compatibility
  getByEmployee(employeeId: string): Observable<Workflow[]> {
    return this.getByEmployeeId(Number(employeeId));
  }
  
  // Methods for workflow actions
  approve(id: string, comment: string = ''): Observable<any> {
    return this.http.post<any>(`${baseUrl}/${id}/approve`, { comment });
  }
  
  reject(id: string, comment: string = ''): Observable<any> {
    return this.http.post<any>(`${baseUrl}/${id}/reject`, { comment });
  }
}
