import { Component, OnInit, OnDestroy } from '@angular/core';
import { first, timeout, catchError } from 'rxjs/operators';
import { ActivatedRoute, Router } from '@angular/router';
import { of, Subscription, timer } from 'rxjs';

import { AccountService, WorkflowService, AlertService, EmployeeService } from '@app/_services';
import { Workflow } from '@app/_models';

@Component({ templateUrl: 'list.component.html' })
export class ListComponent implements OnInit, OnDestroy {
    workflows: Workflow[] = [];
    employeeId: string = null;
    employeeName: string = '';
    loading: boolean = false;
    error: string = '';
    private subscriptions: Subscription[] = [];
    
    constructor(
        private accountService: AccountService,
        private workflowService: WorkflowService,
        private employeeService: EmployeeService,
        private route: ActivatedRoute,
        private router: Router,
        private alertService: AlertService
    ) {}

    ngOnInit() {
        // Get employee ID from route query params
        this.route.queryParams.subscribe(params => {
            if (params.employeeId) {
                this.employeeId = params.employeeId;
                this.loadEmployeeDetails();
                this.loadWorkflows();
            } else {
                // No employee ID in query params, check URL params
                const urlEmployeeId = this.route.snapshot.params['id'];
                if (urlEmployeeId) {
                    this.employeeId = urlEmployeeId;
                    this.loadEmployeeDetails();
                    this.loadWorkflows();
                } else {
                    this.error = 'No employee specified. Please go back and select an employee.';
                }
            }
        });
        
        // Add a fallback timeout to prevent endless loading state
        const loadingTimeout = timer(8000).subscribe(() => {
            if (this.loading) {
                console.warn('Loading timeout exceeded');
                this.loading = false;
                
                // If we still have no workflows, show some mock data
                if (this.workflows.length === 0) {
                    this.showMockData();
                    this.error = 'Loading took too long. Showing sample data.';
                }
            }
        });
        
        this.subscriptions.push(loadingTimeout);
    }
    
    ngOnDestroy() {
        // Clean up subscriptions to prevent memory leaks
        this.subscriptions.forEach(sub => sub.unsubscribe());
    }

    // This method is needed for the HTML template
    account() {
        return this.accountService.accountValue;
    }
    
    private loadEmployeeDetails() {
        if (!this.employeeId) return;
        
        // Load employee details to display name
        this.employeeService.getById(this.employeeId)
            .pipe(first())
            .subscribe({
                next: (employee) => {
                    if (employee) {
                        this.employeeName = `${employee.employeeId}`;
                    }
                },
                error: (error) => {
                    console.error('Error loading employee details:', error);
                }
            });
    }

    private loadWorkflows() {
        if (!this.employeeId) return;
        
        this.loading = true;
        this.error = '';
        
        const numericId = parseInt(this.employeeId);
        if (!isNaN(numericId)) {
            console.log(`Loading workflows for employee ID: ${numericId}`);
            
            this.workflowService.getByEmployeeId(numericId)
                .pipe(first())
                .subscribe({
                    next: (workflows) => {
                        console.log(`Received ${workflows.length} workflows`);
                        this.workflows = workflows;
                        this.loading = false;
                        
                        // If no workflows were returned, show a helpful message
                        if (this.workflows.length === 0) {
                            this.error = 'No workflows found for this employee.';
                        }
                    },
                    error: (error) => {
                        console.error('Error loading workflows:', error);
                        this.error = 'Failed to load workflows. Please try again.';
                        this.loading = false;
                        
                        // Show mock data on error for better UX
                        this.showMockData();
                    }
                });
        } else {
            this.loading = false;
            this.error = 'Invalid employee ID';
        }
    }
    
    private showMockData() {
        // Create some realistic mock data for demonstration
        const employeeIdNum = parseInt(this.employeeId) || 1;
        this.workflows = [
            { 
                id: 100, 
                employeeId: employeeIdNum, 
                type: 'Onboarding', 
                details: { task: 'Complete orientation and training' },
                status: 'Approved',
                createdDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days ago
            },
            { 
                id: 101, 
                employeeId: employeeIdNum, 
                type: 'Transfer', 
                details: { from: 'HR', to: 'Engineering' },
                status: 'Pending',
                createdDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days ago
            }
        ];
    }

    updateStatus(workflow: Workflow) {
        // Show loading indicator during update
        workflow.updating = true;
        
        this.workflowService.updateStatus(workflow.id, workflow.status)
            .pipe(first())
            .subscribe({
                next: () => {
                    workflow.updating = false;
                    this.alertService.success(`Workflow status updated to ${workflow.status}`);
                },
                error: (error) => {
                    workflow.updating = false;
                    console.error('Error updating workflow status:', error);
                    this.alertService.error('Failed to update workflow status');
                }
            });
    }

    // Format workflow details based on type
    formatDetails(details: any): string {
        if (!details) return '';
        
        // Handle array of steps
        if (Array.isArray(details.steps)) {
            return details.steps.join(', ');
        }
        
        // Handle key-value pairs
        if (typeof details === 'object') {
            return Object.entries(details)
                .map(([key, value]) => `${key}: ${value}`)
                .join(', ');
        }
        
        // Fallback for simple string values
        return details.toString();
    }

    // Convert details object to array with properly formatted keys for display
    getFormattedDetailsArray(details: any): {key: string, value: any}[] {
        if (!details) return [];
        
        return Object.entries(details).map(([key, value]) => {
            // Format the key with proper capitalization
            const formattedKey = key.charAt(0).toUpperCase() + key.slice(1);
            return {
                key: formattedKey,
                value: value
            };
        });
    }

    // Helper method to check if an object is empty
    objectIsEmpty(obj: any): boolean {
        if (!obj) return true;
        return Object.keys(obj).length === 0;
    }
    
    // Method to navigate back to employees list
    back() {
        this.router.navigate(['/admin/employees']);
    }
    
    // Add a new method for creating a new workflow (onboarding)
    createOnboarding() {
        if (!this.employeeId) return;
        
        const numericId = parseInt(this.employeeId);
        if (!isNaN(numericId)) {
            this.workflowService.createOnboarding({ employeeId: numericId })
                .pipe(first())
                .subscribe({
                    next: (workflow) => {
                        this.alertService.success('Onboarding workflow created successfully');
                        // Add the new workflow to the list
                        this.workflows.unshift(workflow);
                    },
                    error: (error) => {
                        console.error('Error creating onboarding workflow:', error);
                        this.alertService.error('Failed to create onboarding workflow');
                    }
                });
        }
    }

    // Add this helper method to split the items string into an array for better display
    splitItemsList(itemsString: string): string[] {
        if (!itemsString) return [];
        
        // Split the string by commas, and trim each item
        return itemsString.split(',').map(item => item.trim());
    }
}
