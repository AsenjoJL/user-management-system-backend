import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { first } from 'rxjs/operators';
import { forkJoin } from 'rxjs';

import { EmployeeService } from '@app/_services/employee.service';
import { DepartmentService } from '@app/_services/department.service';
import { WorkflowService } from '@app/_services/workflow.service';
import { AlertService } from '@app/_services';

@Component({
  selector: 'app-transfer',
  templateUrl: './transfer.component.html'
})
export class TransferComponent implements OnInit {
  id: string;
  employee: any = {};
  departments: any[] = [];
  newDepartmentId: number;
  currentDepartmentName: string = '';
  errorMessage: string;
  
  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private employeeService: EmployeeService,
    private departmentService: DepartmentService,
    private workflowService: WorkflowService,
    private alertService: AlertService
  ) {}
  
  ngOnInit() {
    this.id = this.route.snapshot.params['id'];
    
    // Load both employee and department data in parallel
    forkJoin({
      employee: this.employeeService.getById(this.id),
      departments: this.departmentService.getAll()
    }).pipe(first()).subscribe({
      next: ({ employee, departments }) => {
        this.employee = employee;
        this.departments = departments;
        
        // Set the current department name with better error handling
        if (employee && employee.departmentId) {
          const currentDept = departments.find(d => Number(d.id) === Number(employee.departmentId));
          
          if (currentDept) {
            this.currentDepartmentName = currentDept.name;
            console.log(`Current department set to: ${this.currentDepartmentName} (ID: ${employee.departmentId})`);
          } else {
            console.error(`Department with ID ${employee.departmentId} not found in the departments list:`, departments);
            this.currentDepartmentName = `Unknown (ID: ${employee.departmentId})`;
            
            // Attempt to fetch the specific department directly as a fallback
            this.departmentService.getById(employee.departmentId.toString())
              .pipe(first())
              .subscribe({
                next: (department) => {
                  if (department) {
                    this.currentDepartmentName = department.name;
                    console.log(`Retrieved department name: ${department.name}`);
                  }
                },
                error: (error) => console.error('Error fetching department:', error)
              });
          }
          
          // Initialize newDepartmentId with a different department to prevent same-department transfer
          this.newDepartmentId = this.findDifferentDepartment(employee.departmentId);
          
          // Log for debugging
          console.log(`Current department ID: ${employee.departmentId}, Selected new department ID: ${this.newDepartmentId}`);
        } else {
          console.warn('Employee has no department ID assigned');
          this.currentDepartmentName = 'No Department Assigned';
        }
      },
      error: (error) => {
        this.errorMessage = 'Could not load employee or department data';
        console.error('Error loading data:', error);
      }
    });
  }
  
  // Find a department ID that's different from the employee's current one
  private findDifferentDepartment(currentDeptId: number): number {
    if (this.departments.length > 0) {
      // First try to find a different department than current
      const differentDept = this.departments.find(d => Number(d.id) !== Number(currentDeptId));
      if (differentDept) {
        return differentDept.id;
      }
      // If not found (unlikely), return null
      return null;
    }
    return null;
  }
  
  // Transfer the employee
  transfer() {
    // Validate
    if (!this.newDepartmentId) {
      this.errorMessage = 'Please select a new department';
      return;
    }
    
    // Convert to numbers for accurate comparison
    const currentDeptId = Number(this.employee.departmentId);
    const newDeptId = Number(this.newDepartmentId);
    
    if (currentDeptId === newDeptId) {
      this.errorMessage = 'Cannot transfer to the same department. Please select a different department.';
      return;
    }
    
    // Get department names for the workflow details
    const fromDept = this.currentDepartmentName;
    const toDept = this.departments.find(d => Number(d.id) === newDeptId)?.name || 'New Department';
    
    // Clear any previous error message
    this.errorMessage = '';
    
    // First update the employee
    this.employeeService.update(this.id, { 
      ...this.employee,
      departmentId: this.newDepartmentId 
    })
    .pipe(first())
    .subscribe({
      next: (updatedEmployee) => {
        console.log("Employee department updated successfully");
        
        // Now create a workflow for this transfer
        const workflowDetails = {
          employeeId: parseInt(this.id),
          type: 'Transfer',
          details: { from: fromDept, to: toDept },
          status: 'Pending' as 'Pending' | 'Approved' | 'Rejected'
        };
        
        // Create workflow record
        this.workflowService.create(workflowDetails)
          .pipe(first())
          .subscribe({
            next: () => {
              this.alertService.success('Employee transferred successfully', { keepAfterRouteChange: true });
              this.router.navigate(['/admin/employees']);
            },
            error: (error) => {
              console.error('Error creating workflow:', error);
              // Continue even if workflow creation fails
              this.alertService.success('Employee transferred successfully but workflow creation failed', { keepAfterRouteChange: true });
              this.router.navigate(['/admin/employees']);
            }
          });
      },
      error: (error) => {
        this.errorMessage = 'Could not transfer employee: ' + (error.message || error);
        console.error('Error transferring employee:', error);
      }
    });
  }
}