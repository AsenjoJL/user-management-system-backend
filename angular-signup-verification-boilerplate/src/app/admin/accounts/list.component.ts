import { Component, OnInit } from '@angular/core';
import { first } from 'rxjs/operators';
import { AlertService } from '@app/_services';

import { AccountService } from '@app/_services';
import { Account } from '@app/_models';

@Component({ templateUrl: 'list.component.html' })
export class ListComponent implements OnInit {
    accounts: any[];
    loading = false;

    constructor(
        private accountService: AccountService,
        private alertService: AlertService
    ) {}

    ngOnInit() {
        this.loading = true;
        this.accountService.getAll()
            .pipe(first())
            .subscribe({
                next: accounts => {
                    this.accounts = accounts;
                    this.loading = false;
                },
                error: error => {
                    this.alertService.error('Error loading accounts: ' + (error?.message || 'Unknown error'));
                    this.loading = false;
                }
            });
    }

    deleteAccount(id: string) {
        const account = this.accounts.find(x => x.id === id);
        account.isDeleting = true;
        this.accountService.delete(id)
            .pipe(first())
            .subscribe({
                next: () => {
                    this.accounts = this.accounts.filter(x => x.id !== id);
                    this.alertService.success('Account deleted successfully');
                },
                error: error => {
                    this.alertService.error('Error deleting account: ' + (error?.message || 'Unknown error'));
                    account.isDeleting = false;
                }
            });
    }

    toggleAccountStatus(id: string) {
        const account = this.accounts.find(x => x.id === id);
        
        // Don't allow toggling if account is an admin
        if (account.role === 'Admin') {
            this.alertService.error('Cannot change status of admin accounts');
            return;
        }
        
        account.isToggling = true;
        
        // Toggle the account status
        const newStatus = !account.isActive;
        const statusText = newStatus ? 'activated' : 'deactivated';
        
        this.accountService.updateStatus(id, newStatus)
            .pipe(first())
            .subscribe({
                next: (response) => {
                    // Update the account status locally after successful API call
                    account.isActive = newStatus;
                    this.alertService.success(`Account ${statusText} successfully`);
                    
                    // Display appropriate message about login access
                    if (newStatus) {
                        this.alertService.info(`User can now log in to the system`);
                    } else {
                        this.alertService.warn(`User has been blocked from logging in`);
                    }
                },
                error: (error) => {
                    this.alertService.error(`Error updating account status: ${error?.message || 'Server error occurred'}`);
                },
                complete: () => {
                    account.isToggling = false;
                }
            });
    }
}
