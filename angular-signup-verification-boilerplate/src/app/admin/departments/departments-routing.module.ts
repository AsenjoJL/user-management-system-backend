import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AddEditComponent } from './add-edit.component';
import { ListComponent } from './list.component';

const routes: Routes = [
    { path: 'add-edit', component: AddEditComponent },
    { path: 'list', component: ListComponent },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class DepartmentsRoutingModule { }