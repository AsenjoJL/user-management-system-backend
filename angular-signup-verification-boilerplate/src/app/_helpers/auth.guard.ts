import { Injectable } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { AccountService } from '@app/_services';

@Injectable({ providedIn: 'root' })
export class AuthGuard {
    constructor(
        private router: Router, 
        private accountService: AccountService
    ) { }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
        const account = this.accountService.accountValue;
        
        if (account) {
            // Check if token is expired
            if (this.accountService.isTokenExpired(account.jwtToken)) {
                this.accountService.logout();
                return this.redirectToLogin(state);
            }

            // Check route role restrictions
            if (route.data?.roles && !route.data.roles.includes(account.role)) {
                this.router.navigate(['/']);
                return false;
            }

            return true;
        }

        return this.redirectToLogin(state);
    }

    private redirectToLogin(state: RouterStateSnapshot): boolean {
        this.router.navigate(['/account/login'], { 
            queryParams: { returnUrl: state.url } 
        });
        return false;
    }
}