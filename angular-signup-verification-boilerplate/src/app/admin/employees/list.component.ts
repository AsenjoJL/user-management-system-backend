import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { first, catchError } from 'rxjs/operators';

import { AccountService, AlertService } from '@app/_services';
import { EmployeeService } from '@app/_services/employee.service';
import { DepartmentService } from '@app/_services/department.service';

@Component({
  selector: 'app-list',
  templateUrl: './list.component.html'
})
export class ListComponent implements OnInit {
    employees: any[] = [];
    users: any[] = [];
    departments: any[] = [];
    loading: boolean = false;
    error: string = '';
    
    constructor(
        private employeeService: EmployeeService,
        private accountService: AccountService,
        private departmentService: DepartmentService,
        private alertService: AlertService,
        private router: Router
    ) {}

    ngOnInit() {
        this.loading = true;
        this.loadAllData();
    }
    
    // Load all necessary data from the API
    loadAllData() {
        // Load departments and users even if employees fail
        forkJoin({
            employees: this.employeeService.getAll().pipe(
                catchError(error => {
                    console.error('Error loading employees:', error);
                    this.error = 'Failed to load employees. Please try again.';
                    return of([]);
                })
            ),
            users: this.accountService.getAll().pipe(
                catchError(error => {
                    console.error('Error loading users:', error);
                    return of([]);
                })
            ),
            departments: this.departmentService.getAll().pipe(
                catchError(error => {
                    console.error('Error loading departments:', error);
                    return of([]);
                })
            )
        })
        .pipe(first())
        .subscribe({
            next: (data) => {
                this.employees = data.employees || [];
                this.users = data.users || [];
                this.departments = data.departments || [];
                this.loading = false;
                console.log('All data loaded successfully', {
                    employees: this.employees.length,
                    users: this.users.length,
                    departments: this.departments.length
                });
                
                // Clear error if we have successfully loaded employees
                if(this.employees.length > 0) {
                    this.error = '';
                }
            },
            error: (error) => {
                this.error = 'Failed to load data. Please try again.';
                this.alertService.error(this.error);
                this.loading = false;
                console.error('Error in forkJoin:', error);
            }
        });
    }

    fetchEmployees() {
        this.loading = true;
        this.employeeService.getAll()
            .pipe(first())
            .subscribe({
                next: (employees) => {
                    this.employees = employees;
                    this.loading = false;
                    this.error = '';
                },
                error: (error) => {
                    this.error = 'Failed to load employees';
                    this.alertService.error(this.error);
                    this.loading = false;
                    console.error('Error fetching employees:', error);
                }
            });
    }
    
    retry() {
        this.error = '';
        this.loadAllData();
    }
    
    account() {
        return this.accountService.accountValue;
    }
    
    edit(id: string) {
        this.router.navigate(['/admin/employees/edit', id]);
    }
    
    add() {
        this.router.navigate(['/admin/employees/add']);
    }
    
    transfer(employee: any) {
        this.router.navigate(['/admin/employees/transfer', employee.id]);
    }
    
    delete(id: string) {
        if (confirm('Are you sure you want to delete this employee?')) {
            this.employeeService.delete(id)
                .pipe(first())
                .subscribe({
                    next: () => {
                        this.alertService.success('Employee deleted');
                        this.fetchEmployees();
                    },
                    error: (error) => {
                        console.error('Error deleting employee:', error);
                        this.alertService.error('Failed to delete employee');
                    }
                });
        }
    }
    
    getUserEmail(userId: any): string {
        if (!userId) {
            return 'No User Assigned';
        }
        
        const userIdStr = userId.toString();
        const user = this.users.find(x => x.id && x.id.toString() === userIdStr);
        
        if (user) {
            return user.email;
        } else {
            return `Unknown User (ID: ${userId})`;
        }
    }

    getDepartmentName(departmentId: any): string {
        if (!departmentId) {
            return 'No Department';
        }
        
        const deptIdNum = Number(departmentId);
        const department = this.departments.find(x => Number(x.id) === deptIdNum);
        
        if (department) {
            return department.name;
        } else {
            return `Unknown Department (ID: ${departmentId})`;
        }
    }

    viewWorkflows(id: string) {
        // Navigate to workflows page for this employee
        this.router.navigate(['/admin/workflows'], { 
            queryParams: { employeeId: id } 
        });
    }

    viewRequests(id: string) {
        // Navigate to the requests page for this employee
        this.router.navigate(['/admin/requests'], { 
            queryParams: { employeeId: id } 
        });
    }
}