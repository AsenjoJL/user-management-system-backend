import { Component, OnInit } from '@angular/core';
import { first, catchError } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs'; 
import { Router, ActivatedRoute } from '@angular/router';

import { AccountService, EmployeeService, RequestService, AlertService } from '@app/_services';
import { Request } from '@app/_models';

@Component({
  templateUrl: 'list.component.html'
})
export class ListComponent implements OnInit {
  requests: Request[] = [];
  employees: any[] = [];
  accounts: any[] = [];
  loading = false;
  error = '';
  employeeIdFilter: string = null;
  retryAttempts = 0;
  maxRetryAttempts = 2;

  constructor(
    private requestService: RequestService,
    private accountService: AccountService,
    private employeeService: EmployeeService,
    private alertService: AlertService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.loading = true;
    
    // Check for employeeId query parameter
    this.route.queryParams.subscribe(params => {
      if (params.employeeId) {
        this.employeeIdFilter = params.employeeId;
        console.log(`Filtering requests for employee ID: ${this.employeeIdFilter}`);
      }
    });
    
    // Load reference data
    forkJoin({
      employees: this.employeeService.getAll().pipe(
        first(),
        catchError(error => {
          console.error('Error loading employees:', error);
          return of([]);
        })
      ),
      accounts: this.accountService.getAll().pipe(
        first(),
        catchError(error => {
          console.error('Error loading accounts:', error);
          return of([]);
        })
      )
    }).subscribe({
      next: (data) => {
        this.employees = data.employees || [];
        this.accounts = data.accounts || [];
        console.log('Loaded employees:', this.employees.length);
        console.log('Loaded accounts:', this.accounts.length);
        
        // After loading reference data, load requests
        this.loadRequests();
      },
      error: (error) => {
        console.error('Error loading reference data:', error);
        // Still try to load requests even if reference data failed
        this.loadRequests();
      }
    });
  }

  loadRequests() {
    this.loading = true;
    this.error = '';
    
    const observable = this.employeeIdFilter ? 
      this.requestService.getByEmployee(Number(this.employeeIdFilter)) : 
      this.requestService.getAll();
    
    observable.pipe(first()).subscribe({
      next: (requests) => {
        this.requests = requests || [];
        
        // Normalize request items for all requests - ensure we only use requestItems (lowercase)
        this.requests = this.requests.map(request => {
          // Handle possible API inconsistency (API might return items as RequestItems)
          if (request['RequestItems'] && !request.requestItems) {
            request.requestItems = request['RequestItems'];
          } else if (!request.requestItems) {
            request.requestItems = [];
          }
          return request;
        });

        console.log(`Loaded ${this.requests.length} requests with items:`, 
          this.requests.map(r => ({id: r.id, items: r.requestItems?.length || 0})));
        
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading requests:', error);
        this.error = 'Failed to load requests';
        this.loading = false;
        
        // If we still have earlier data, don't clear it
        if (this.requests.length === 0) {
          this.loadMockData();
        }
      }
    });
  }
  
  loadMockData() {
    console.log('Loading mock request data as fallback');
    this.requests = [
      {
        id: 1,
        employeeId: this.employeeIdFilter ? Number(this.employeeIdFilter) : 1,
        type: 'Equipment',
        status: 'Pending',
        requestItems: [
          { id: 1, name: 'Laptop', quantity: 1 },
          { id: 2, name: 'Monitor', quantity: 2 }
        ]
      },
      {
        id: 2,
        employeeId: this.employeeIdFilter ? Number(this.employeeIdFilter) : 2,
        type: 'Office Supplies',
        status: 'Approved',
        requestItems: [
          { id: 3, name: 'Notebooks', quantity: 5 },
          { id: 4, name: 'Pens', quantity: 10 }
        ]
      }
    ];
    
    this.loading = false;
    this.error = 'Using sample data - API connection failed';
  }
  
  getEmployeeInfo(employeeId: number): string {
    if (!employeeId) return 'Unknown';
    
    // Find the employee by ID
    const employee = this.employees.find(emp => emp.id === employeeId);
    
    if (employee) {
      // Find the associated account for this employee
      const account = this.accounts.find(acc => acc.id === employee.userId);
      
      if (account) {
        // Return email and role as shown in the image
        const role = account.role === 'Admin' ? 'Admin User' : 'Normal User';
        return `${account.email} (${role})`;
      }
      
      return `${employee.employeeId}`;
    }
    
    return `Employee ID: ${employeeId}`;
  }

  // Account method to return the current user
  account() {
    return this.accountService.accountValue;
  }

  add() {
    // If we have an employee filter, pass it to the add page
    if (this.employeeIdFilter) {
      this.router.navigate(['/admin/requests/add'], { 
        queryParams: { employeeId: this.employeeIdFilter } 
      });
    } else {
      this.router.navigate(['/admin/requests/add']);
    }
  }

  edit(id: number) {
    this.router.navigate(['/admin/requests/edit', id]);
  }

  retry() {
    this.error = '';
    this.retryAttempts++;
    this.loadRequests();
  }
}
