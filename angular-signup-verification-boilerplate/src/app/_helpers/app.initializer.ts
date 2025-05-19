import { AccountService } from '@app/_services';

export function appInitializer(accountService: AccountService) {
    return () => new Promise(resolve => {
        // Only attempt refresh if we have a refresh token
        const account = accountService.accountValue;
        if (accountService?.refreshToken) {
            console.log('App initializer: attempting to refresh token');
            accountService.refreshToken()
                .subscribe({
                    next: () => {
                        console.log('App initializer: token refresh successful');
                        resolve(true);
                    },
                    error: error => {
                        console.log('App initializer: token refresh failed', error.message);
                        accountService.logout(); // Clear invalid tokens
                        resolve(true);
                    }
                });
        } else {
            console.log('App initializer: no refresh token available');
            resolve(true);
        }
    });
}