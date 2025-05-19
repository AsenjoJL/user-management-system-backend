# User Management System

A modern, full-stack user management system built with Angular and Node.js. This system provides comprehensive user management capabilities with a beautiful, responsive UI.

## Features

### User Management
- User registration and authentication
- Role-based access control (Admin/User)
- Profile management
- Password reset functionality
- Remember me option
- Secure login system

### Admin Dashboard
- User account management
- Employee management
- Department organization
- Real-time user monitoring
- System activity tracking

### Employee Management
- Employee profile creation and management
- Department assignment
- Employee status tracking
- Workflow management

### Department Management
- Department creation and organization
- Employee assignment to departments
- Department hierarchy management

## Tech Stack

### Frontend
- Angular 10
- Bootstrap 5
- Font Awesome icons
- SCSS for styling
- TypeScript

### Backend
- Node.js
- Express.js
- MongoDB
- JWT Authentication

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v14 or higher)
- npm (v6 or higher)
- MongoDB
- Angular CLI (`npm install -g @angular/cli`)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/user-management-system.git
cd user-management-system
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Install frontend dependencies:
```bash
cd frontend
npm install
```

4. Configure environment variables:
   - Create a `.env` file in the backend directory
   - Add the following variables:
```
PORT=4000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

## Running the Application

1. Start the backend server:
```bash
cd backend
npm start
```

2. Start the frontend development server:
```bash
cd frontend
ng serve
```

3. Access the application at `http://localhost:4200`

## Project Structure

```
user-management-system/
├── frontend/                 # Angular frontend application
│   ├── src/
│   │   ├── app/
│   │   │   ├── account/     # Authentication components
│   │   │   ├── admin/       # Admin dashboard components
│   │   │   ├── home/        # Home page components
│   │   │   └── shared/      # Shared components and services
│   │   └── assets/          # Static assets
│   └── package.json
│
└── backend/                  # Node.js backend application
    ├── src/
    │   ├── controllers/     # Route controllers
    │   ├── models/         # Database models
    │   ├── routes/         # API routes
    │   └── middleware/     # Custom middleware
    └── package.json
```

## API Endpoints

### Authentication
- POST `/api/account/register` - Register new user
- POST `/api/account/login` - User login
- POST `/api/account/forgot-password` - Request password reset
- POST `/api/account/reset-password` - Reset password

### User Management
- GET `/api/users` - Get all users (Admin only)
- GET `/api/users/:id` - Get user by ID
- PUT `/api/users/:id` - Update user
- DELETE `/api/users/:id` - Delete user

### Employee Management
- GET `/api/employees` - Get all employees
- POST `/api/employees` - Create new employee
- PUT `/api/employees/:id` - Update employee
- DELETE `/api/employees/:id` - Delete employee

### Department Management
- GET `/api/departments` - Get all departments
- POST `/api/departments` - Create new department
- PUT `/api/departments/:id` - Update department
- DELETE `/api/departments/:id` - Delete department

## Security Features

- JWT-based authentication
- Password hashing using bcrypt
- Role-based access control
- Input validation and sanitization
- CORS protection
- Rate limiting
- XSS protection

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@example.com or create an issue in the repository.

## Acknowledgments

- Angular Team for the amazing framework
- Bootstrap Team for the UI components
- Font Awesome for the icons
- All contributors who have helped shape this project 