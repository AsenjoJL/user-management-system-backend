import { Department } from './department';
import { Account } from './account';

export interface Employee {
    id?: number;
    employeeId: string;
    userId: number;
    position: string;
    departmentId: number;
    hireDate: string;
    status: string;
    created?: Date;
    updated?: Date;
    
    // For display purposes
    departmentName?: string;
    userEmail?: string;
    
    // Optional navigation properties
    Department?: Department;
    Account?: Account;
}
