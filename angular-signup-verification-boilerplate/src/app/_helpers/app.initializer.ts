import { AccountService } from '@app/_services';

export function appInitializer(accountService: AccountService) {
    return () => new Promise(resolve => {
        // attempt to refresh token on app start up to auto authenticate
        console.log('App initializer: attempting to refresh token');
        accountService.refreshToken()
            .subscribe({
                next: () => {
                    console.log('App initializer: token refresh successful');
                    resolve(true);
                },
                error: error => {
                    console.log('App initializer: token refresh failed', error);
                    resolve(true); // Resolve anyway to let the app continue
                }
            });
    });
}