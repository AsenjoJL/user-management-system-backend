import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { first } from 'rxjs/operators';
import { AccountService, AlertService, DepartmentService } from '@app/_services';
import { Department } from '@app/_models';

@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
})
export class ListComponent implements OnInit {
  departments: Department[] = [];
  loading = false;
  deleting = false;
  error = '';

  constructor(
    private router: Router,
    private departmentService: DepartmentService,
    private accountService: AccountService,
    private alertService: AlertService
  ) {}

  ngOnInit() {
    this.fetchDepartments();
  }

  fetchDepartments() {
    this.loading = true;
    this.error = '';
    
    this.departmentService.getAll()
      .pipe(first())
      .subscribe({
        next: departments => {
          this.departments = departments;
          this.loading = false;
        },
        error: error => {
          this.error = 'Failed to load departments. Please try again later.';
          this.alertService.error(this.error);
          this.loading = false;
          console.error(error);
        }
      });
  }

  // Account method to return the current user
  account() {
    return this.accountService.accountValue;
  }

  // Navigation methods referenced in the template
  edit(id: string) {
    this.router.navigate(['/admin/departments/add-edit', { id }]);
  }

  delete(id: string) {
    const department = this.departments.find(x => x.id === parseInt(id));
    if (!department) return;
    
    if (confirm(`Are you sure you want to delete department "${department.name}"?`)) {
      this.deleting = true;
      department.isDeleting = true;
      
      this.departmentService.delete(id)
        .pipe(first())
        .subscribe({
          next: () => {
            this.departments = this.departments.filter(x => x.id !== parseInt(id));
            this.alertService.success('Department deleted successfully', { keepAfterRouteChange: true });
            this.deleting = false;
          },
          error: error => {
            this.alertService.error('Error deleting department');
            department.isDeleting = false;
            this.deleting = false;
            console.error(error);
          }
        });
    }
  }

  add() {
    this.router.navigate(['/admin/departments/add-edit']);
  }

  retry() {
    this.fetchDepartments();
  }
}