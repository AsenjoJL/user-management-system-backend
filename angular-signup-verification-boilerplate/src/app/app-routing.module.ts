import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { HomeComponent } from './home/home.component'; // create this basic component
import { AuthGuard } from './_helpers/auth.guard'; // implement this guard properly
import { Role } from './_models/role'; // define Role enum (Admin, User, etc.)

const accountModule = () => import('./account/account.module').then(m => m.AccountModule);
const adminModule = () => import('./admin/admin.module').then(m => m.AdminModule);
const profileModule = () => import('./profile/profile.module').then(m => m.ProfileModule);

const routes: Routes = [
  { path: '', component: HomeComponent, canActivate: [AuthGuard] },
  { path: 'account', loadChildren: accountModule },
  { path: 'profile', loadChildren: profileModule, canActivate: [AuthGuard] },
  { path: 'admin', loadChildren: adminModule, canActivate: [AuthGuard], data: { roles: [Role.Admin] } },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
