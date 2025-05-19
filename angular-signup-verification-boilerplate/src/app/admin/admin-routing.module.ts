import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { SubnavComponent } from './subnav.component';
import { LayoutComponent } from './layout.component';
import { OverviewComponent } from './overview.component';
import { ListComponent as RequestListComponent } from './requests/list.component';
import { ListComponent as WorkflowListComponent } from './workflows/list.component';

const accountsModule = () => import('./accounts/accounts.module').then(x => x.AccountsModule);
const employeesModule = () => import('./employees/employees.module').then(x => x.EmployeesModule);
const departmentsModule = () => import('./departments/departments.module').then(x => x.DepartmentsModule);
const requestsModule = () => import('./requests/requests.module').then(x => x.RequestsModule);
const workflowsModule = () => import('./workflows/workflows.module').then(x => x.WorkflowsModule);

const employeesRoutes: Routes = [
    { path: '', loadChildren: employeesModule },
    { path: '', component: SubnavComponent, outlet: 'subnav' },
    { path: ':id/workflows', component: WorkflowListComponent }
];

const routes: Routes = [
    {
        path : '', component: LayoutComponent,
        children: [
            { path : '', component: OverviewComponent }, // Default route without subnav
            { 
                path : 'accounts', 
                children: [
                    { path: '', loadChildren: accountsModule },
                    { path: '', component: SubnavComponent, outlet: 'subnav' }
                ] 
            },
            { 
                path : 'employees', 
                children: employeesRoutes
            },
            { 
                path : 'departments', 
                children: [
                    { path: '', loadChildren: departmentsModule },
                    { path: '', component: SubnavComponent, outlet: 'subnav' }
                ] 
            },
            { 
                path : 'requests', 
                children: [
                    { path: '', loadChildren: requestsModule },
                    { path: '', component: SubnavComponent, outlet: 'subnav' }
                ] 
            },
            { 
                path : 'workflows', 
                children: [
                    { path: '', loadChildren: workflowsModule },
                    { path: '', component: SubnavComponent, outlet: 'subnav' }
                ] 
            },
            {
                path: 'requests',
                component: RequestListComponent
            }
        ]
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class AdminRoutingModule { }