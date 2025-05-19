import { Employee } from './employee';

export interface Workflow {
    id?: number;
    employeeId: number;
    type: string;
    details: any;
    status: 'Pending' | 'Approved' | 'Rejected';
    createdDate?: string;
    updatedDate?: string;
    
    // Optional navigation properties
    Employee?: Employee;
    
    // Runtime properties
    refreshing?: boolean;
    updating?: boolean;
}
