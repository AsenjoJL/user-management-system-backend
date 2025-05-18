import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { RequestsRoutingModule } from './requests-routing.module';
import { ListComponent } from './list.component';
import { AddEditComponent } from './add-edit.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    RequestsRoutingModule
  ],
  declarations: [
    ListComponent,
    AddEditComponent
  ],
  providers: [
    // Any services specific to the requests module
  ]
})
export class RequestsModule { }
