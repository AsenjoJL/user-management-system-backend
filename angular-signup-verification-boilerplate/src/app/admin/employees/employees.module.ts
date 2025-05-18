import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { EmployeesRoutingModule } from './employees-routing.module';
import { ListComponent } from './list.component';
import { AddEditComponent } from './add-edit.component';
import { TransferComponent } from './transfer.component';
import { EmployeeService } from '@app/_services/employee.service';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        EmployeesRoutingModule
    ],
    declarations: [
        // AddEditComponent should be here if it's not standalone
        AddEditComponent,
        ListComponent,
        TransferComponent
    ],
    providers: [
        EmployeeService
    ]
})
export class EmployeesModule { }