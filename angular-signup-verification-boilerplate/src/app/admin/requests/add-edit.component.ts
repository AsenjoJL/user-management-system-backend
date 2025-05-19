import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { first } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';
import { Location } from '@angular/common';
import { catchError } from 'rxjs/operators';

import { RequestService, EmployeeService, AlertService, AccountService, WorkflowService } from '@app/_services';
import { Request, RequestItem, Employee } from '@app/_models';

@Component({
  templateUrl: './add-edit.component.html'
})
export class AddEditComponent implements OnInit {
    id: string;
    request: Request = {
        employeeId: null,
        type: '',
        status: 'Pending',
        requestItems: []
    };
    employees: Employee[] = [];
    accounts: any[] = [];
    loading = false;
    submitting = false;
    errorMessage = '';
    currentUser = null;
    initialRequestItems = [];

    constructor(
        private requestService: RequestService,
        private employeeService: EmployeeService,
        private accountService: AccountService,
        private alertService: AlertService,
        private workflowService: WorkflowService,
        private route: ActivatedRoute,
        private router: Router,
        private location: Location
    ) {
        this.currentUser = this.accountService.accountValue;
    }

    ngOnInit() {
        this.id = this.route.snapshot.params['id'];
        this.loading = true;

        // Load reference data (employees and accounts)
        forkJoin({
            employees: this.employeeService.getAll().pipe(
                first(),
                catchError(error => {
                    console.error('Error loading employees:', error);
                    return of([]);
                })
            ),
            accounts: this.accountService.getAll().pipe(
                first(),
                catchError(error => {
                    console.error('Error loading accounts:', error);
                    return of([]);
                })
            )
        }).subscribe({
            next: (data) => {
                this.employees = data.employees || [];
                this.accounts = data.accounts || [];
                console.log('Loaded employees:', this.employees.length);
                console.log('Loaded accounts:', this.accounts.length);
                
                // After loading reference data, load the specific request if editing
                if (this.id) {
                    this.loadRequest();
                } else {
                    // For new requests, add at least one item row
                    if (!this.request.requestItems || !this.request.requestItems.length) {
                        this.addItem();
                    }
                    this.loading = false;
                }
            },
            error: (error) => {
                console.error('Error loading reference data:', error);
                this.errorMessage = 'Failed to load reference data';
                this.loading = false;
            }
        });
    }

    loadRequest() {
        this.requestService.getById(this.id)
            .pipe(first())
            .subscribe({
                next: (request) => {
                    if (request) {
                        console.log('Loaded request data for editing:', request);
                        this.request = request;
                        
                        // Fix for items not displaying - check for both RequestItems and requestItems
                        if (request['RequestItems'] && Array.isArray(request['RequestItems']) && request['RequestItems'].length > 0) {
                            console.log('Found items in RequestItems:', request['RequestItems']);
                            this.request.requestItems = request['RequestItems'];
                        } else if (!this.request.requestItems || this.request.requestItems.length === 0) {
                            console.log('No items found in request, creating empty item');
                            this.request.requestItems = [];
                            this.addItem();
                        } else {
                            console.log('Found items in requestItems:', this.request.requestItems);
                        }
                        
                        // Save a copy of the initial request items for comparison
                        this.initialRequestItems = JSON.parse(JSON.stringify(this.request.requestItems || []));
                    }
                    this.loading = false;
                },
                error: (error) => {
                    console.error(`Error loading request ${this.id}:`, error);
                    this.errorMessage = 'Failed to load request';
                    this.loading = false;
                }
            });
    }

    getEmployeeDisplay(employeeId: number): string {
        const employee = this.employees.find(e => e.id === employeeId);
        if (!employee) return 'Unknown Employee';
        
        const account = this.accounts.find(a => a.id === employee.userId);
        if (account) {
            return `${account.firstName} ${account.lastName} (${account.email})`;
        }
        
        return `Employee ID: ${employee.employeeId}`;
    }

    addItem() {
        if (!this.request.requestItems) {
            this.request.requestItems = [];
        }
        this.request.requestItems.push({
            name: '',
            quantity: 1
        });
    }

    removeItem(index: number) {
        if (this.request.requestItems) {
            this.request.requestItems.splice(index, 1);
            
            // Ensure there's always at least one item
            if (this.request.requestItems.length === 0) {
                this.addItem();
            }
        }
    }

    save() {
        this.submitting = true;
        this.errorMessage = '';

        // Validate form
        if (!this.request.type) {
            this.errorMessage = 'Please select a request type';
            this.submitting = false;
            return;
        }

        if (!this.request.employeeId) {
            this.errorMessage = 'Please select an employee';
            this.submitting = false;
            return;
        }

        if (!this.request.requestItems || this.request.requestItems.length === 0) {
            this.errorMessage = 'Please add at least one item';
            this.submitting = false;
            return;
        }

        // Validate each item
        for (const item of this.request.requestItems) {
            if (!item.name) {
                this.errorMessage = 'Please enter a name for all items';
                this.submitting = false;
                return;
            }
            if (!item.quantity || item.quantity < 1) {
                this.errorMessage = 'Please enter a valid quantity for all items';
                this.submitting = false;
                return;
            }
        }

        // Prepare request data for saving
        const requestToSave = {
            ...this.request,
            employeeId: Number(this.request.employeeId),
            requestItems: this.request.requestItems.map(item => ({
                name: item.name,
                quantity: Number(item.quantity),
                description: item.description || ''
            }))
        };

        console.log('Saving request:', requestToSave);

        if (this.id) {
            // Update existing request
            console.log('Updating request with ID:', this.id);
            this.requestService.update(this.id, requestToSave)
                .pipe(first())
                .subscribe({
                    next: (savedRequest) => {
                        console.log('Request updated successfully:', savedRequest);
                        // Ensure we have the latest data
                        this.request = savedRequest;
                        this.createOrUpdateWorkflow(savedRequest);
                        this.alertService.success('Request updated', { keepAfterRouteChange: true });
                        this.submitting = false;
                        this.router.navigate(['/admin/requests']);
                    },
                    error: (error) => {
                        console.error('Error updating request:', error);
                        this.errorMessage = typeof error === 'string' ? error : 'Failed to update request';
                        this.submitting = false;
                    },
                    complete: () => {
                        console.log('Update operation completed');
                        this.submitting = false;
                    }
                });
        } else {
            // Create new request
            console.log('Creating new request');
            this.requestService.create(requestToSave)
                .pipe(first())
                .subscribe({
                    next: (newRequest) => {
                        console.log('Request created successfully:', newRequest);
                        this.createOrUpdateWorkflow(newRequest);
                        this.alertService.success('Request created', { keepAfterRouteChange: true });
                        this.submitting = false;
                        this.router.navigate(['/admin/requests']);
                    },
                    error: (error) => {
                        console.error('Error creating request:', error);
                        this.errorMessage = typeof error === 'string' ? error : 'Failed to create request';
                        this.submitting = false;
                    },
                    complete: () => {
                        console.log('Create operation completed');
                        this.submitting = false;
                    }
                });
        }
    }

    cancel() {
        this.location.back();
    }

    private createOrUpdateWorkflow(request: Request) {
        // Create or update workflow for the request
        const workflowData = {
            requestId: request.id,
            status: request.status as 'Pending' | 'Approved' | 'Rejected',
            employeeId: request.employeeId,
            type: `${request.type} Request`,
            details: {
                items: request.requestItems.map(item => `${item.name} (x${item.quantity})`).join(', '),
                requestId: request.id
            }
        };

        this.workflowService.create(workflowData)
            .pipe(first())
            .subscribe({
                next: () => console.log('Workflow created/updated successfully'),
                error: (error) => console.error('Error creating/updating workflow:', error)
            });
    }
}
