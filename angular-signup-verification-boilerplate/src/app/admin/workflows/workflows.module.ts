import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { ListComponent } from './list.component';

const routes: Routes = [
    { path: '', component: ListComponent },
    { path: 'employee/:id', component: ListComponent }
];

@NgModule({
    imports: [
        CommonModule,
        ReactiveFormsModule,
        FormsModule,
        RouterModule.forChild(routes)
    ],
    declarations: [
        ListComponent
    ]
})
export class WorkflowsModule { }
