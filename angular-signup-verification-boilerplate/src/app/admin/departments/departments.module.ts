import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

import { AddEditComponent } from './add-edit.component';
import { ListComponent } from './list.component';

const routes: Routes = [
  { path: '', component: ListComponent },
  { path: 'add-edit', component: AddEditComponent }
];

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes)
  ],
  declarations: [
    AddEditComponent,
    ListComponent
  ]
})
export class DepartmentsModule { }