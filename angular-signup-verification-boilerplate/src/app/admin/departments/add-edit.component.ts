import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { first } from 'rxjs/operators';
import { Department } from '@app/_models';
import { DepartmentService, AlertService } from '@app/_services';

@Component({
  selector: 'app-add-edit',
  templateUrl: './add-edit.component.html'
})
export class AddEditComponent implements OnInit {
  form: FormGroup;
  id: string;
  isAddMode: boolean;
  loading = false;
  submitting = false;
  submitted = false;
  error = '';
  
  constructor(
    private formBuilder: FormBuilder,
    private departmentService: DepartmentService,
    private alertService: AlertService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.id = this.route.snapshot.params['id'];
    this.isAddMode = !this.id;
    
    // Form validation
    this.form = this.formBuilder.group({
      name: ['', Validators.required],
      description: ['', Validators.required]
    });
    
    if (!this.isAddMode) {
      this.loading = true;
      this.departmentService.getById(this.id)
        .pipe(first())
        .subscribe({
          next: department => {
            this.form.patchValue(department);
            this.loading = false;
          },
          error: error => {
            this.error = 'Error loading department data';
            this.alertService.error(this.error);
            this.loading = false;
            console.error('Error loading department:', error);
          }
        });
    }
  }
  
  // Convenience getter for easy access to form fields
  get f() { return this.form.controls; }

  onSubmit() {
    this.submitted = true;
    this.error = '';
    
    // Reset alerts
    this.alertService.clear();
    
    // Stop here if form is invalid
    if (this.form.invalid) {
      return;
    }
    
    this.submitting = true;
    
    // Create the department object
    const department: Department = {
      name: this.form.value.name,
      description: this.form.value.description
    };
    
    console.log('Submitting department:', department);
    
    if (this.isAddMode) {
      this.createDepartment(department);
    } else {
      this.updateDepartment(department);
    }
  }
  
  private createDepartment(department: Department) {
    this.departmentService.create(department)
      .pipe(first())
      .subscribe({
        next: () => {
          this.alertService.success('Department added successfully', { keepAfterRouteChange: true });
          this.router.navigate(['../'], { relativeTo: this.route });
        },
        error: error => {
          this.error = error?.message || 'Error adding department';
          this.alertService.error(this.error);
          this.submitting = false;
          console.error('Error creating department:', error);
        }
      });
  }
  
  private updateDepartment(department: Department) {
    this.departmentService.update(this.id, department)
      .pipe(first())
      .subscribe({
        next: () => {
          this.alertService.success('Department updated successfully', { keepAfterRouteChange: true });
          this.router.navigate(['../../'], { relativeTo: this.route });
        },
        error: error => {
          this.error = error?.message || 'Error updating department';
          this.alertService.error(this.error);
          this.submitting = false;
          console.error('Error updating department:', error);
        }
      });
  }
}