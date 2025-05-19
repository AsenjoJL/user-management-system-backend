import { Employee } from './employee';

export interface RequestItem {
    id?: number;
    name: string;
    quantity: number;
    description?: string;
    requestId?: number;
}

export interface Request {
    id?: number;
    employeeId: number;     // Keep this for direct access
    type: string;
    requestItems: RequestItem[];
    status: string;
    createdDate?: string;
    description?: string;
    employee?: Employee;    // Add navigation property
    
    // Add runtime properties used by the UI
    refreshing?: boolean;
    updating?: boolean;
}
