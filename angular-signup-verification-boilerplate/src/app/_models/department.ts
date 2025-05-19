import { Employee } from './employee';

export interface Department {
    id?: number;
    name: string;
    description: string;
    employeeCount?: number;
    created?: Date;
    updated?: Date;
    
    // Optional navigation properties
    Employees?: Employee[];
    
    // UI state properties
    isDeleting?: boolean;
}
