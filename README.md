# user-management-system-backend

#  Node.js + MySQL Authentication Boilerplate

A powerful and secure Node.js boilerplate API with **Email Verification**, **JWT Auth with Refresh Tokens**, and **Role-Based Access Control (Admin & User)**. This project is built using **Node.js**, **Express**, **Sequelize**, and **MySQL**.

---

##  Features

-  User Registration with Email Verification
-  JWT Authentication (15-min access + 7-day refresh token)
-  Refresh Token Rotation
-  Role-based Authorization (Admin/User)
-  Forgot Password & Reset Password
-  CRUD Operations on Accounts (with RBAC)
-  Swagger API Documentation
-  HTTP-only Cookies for Secure Auth
--

##  Technology Stack
- Node.js + Express
- MySQL with Sequelize ORM
- JWT (jsonwebtoken)
- Nodemailer (Email Support)
- Swagger UI Express

---

##  Project Structure
_helpers
_middleware
accounts
node_modules
.gitignore
README.md
config.jsono
package-lock.json
package.json
server.js
swagger.yaml

## 1. Clone the Repository
```bash
git clone https://github.com/your-username/node-auth-boilerplate.git
cd node-auth-boilerplate

##  Installation & Setup
**Helpers Folder
Path: /_helpers**
The helpers folder contains all the bits and pieces that don't fit into other folders but don't justify having a folder of their own.

**MySQL Database Wrapper
Path: /_helpers/db.js**
The MySQL database wrapper connects to MySQL using Sequelize and the MySQL2 client, and exports an object containing all of the database model objects in the application (currently only Account and RefreshToken). It provides an easy way to access any part of the database from a single point.
The initialize() function is executed once on api startup and performs the following actions:
Connects to MySQL server using the mysql2 db client and executes a query to create the database if it doesn't already exist.
Connects to the database with the Sequelize ORM.
Initializes the Account and RefreshToken models and attaches them to the exported db object.
Defines the one-to-many relationship between accounts and refresh tokens and configures refresh tokens to be deleted when the account they belong to is deleted.
Automatically creates tables in MySQL database if they don't exist by calling await sequelize.sync(). For more info on Sequelize model synchronization options see https://sequelize.org/master/manual/model-basics.html#model-synchronization.

**Role Object / Enum
Path: /_helpers/role.js**
The role object defines all the roles in the example application. I created it to use like an enum to avoid passing roles around as strings, so instead of 'Admin' and 'User' we can use Role.Admin and Role.User.

**Send Email Helper
Path: /_helpers/send-email.js**
The send email helper is a lightweight wrapper around the nodemailer module to simplify sending emails from anywhere in the application. It is used by the account service to send account verification and password reset emails.


**Swagger API Docs Route Handler (/api-docs)
Path: /_helpers/swagger.js****
The Swagger docs route handler uses the Swagger UI Express module to serve auto-generated Swagger UI documentation based on the swagger.yaml file from the /api-docs path of the api. The route handler is bound to the /api-docs path in the main server.js file.

**Express.js Middleware Folder
Path: /_middleware**
The middleware folder contains Express.js middleware functions that can be used by different routes / features within the Node.js boilerplate api.

**Authorize Middleware
Path: /_middleware/authorize.js**
The authorized middleware can be added to any route to restrict access to the route to authenticated users with specified roles. If the roles parameter is omitted (i.e. authorize()) then the route will be accessible to all authenticated users regardless of role. It is used by the accounts controller to restrict access to account CRUD routes and revoke token routes.
The authorize function returns an array containing two middleware functions:
The first (jwt({ ... })) authenticates the request by validating the JWT access token in the "Authorization" header of the http request. On successful authentication a user object is attached to the req object that contains the data from the JWT token, which in this example includes the user id (req.user.id).
The second authorizes the request by checking that the authenticated account still exists and is authorized to access the requested route based on its role. The second middleware function also attaches the role property and the ownsToken method to the req.user object so they can be accessed by controller functions.
If either authentication or authorization fails then a 401 Unauthorized response is returned.

**Global Error Handler Middleware
Path: /_middleware/error-handler.js**
The global error handler is used to catch all errors and remove the need for duplicated error handling code throughout the boilerplate application. It's configured as middleware in the main server.js file.
By convention errors of type 'string' are treated as custom (app specific) errors, this simplifies the code for throwing custom errors since only a string needs to be thrown (e.g. throw 'Invalid token'). Further to this if a custom error ends with the words 'not found' a 404 response code is returned, otherwise a standard 400 response is returned. See the account service for some examples of custom errors thrown by the api, errors are caught in the accounts controller for each route and passed to next(err) which passes them to this global error handler.

**Validate Request Middleware
Path: /_middleware/validate-request.js**
The validate request middleware function validates the body of a request against a Joi schema object.
It is used by schema middleware functions in controllers to validate the request against the schema for a specific route (e.g. authenticateSchema in the accounts controller).

**Accounts Feature Folder
Path: /accounts**
The accounts folder contains all code that is specific to the accounts feature of the node.js + mysql boilerplate api.

**Sequelize Account Model
Path: /accounts/account.model.js**
The account model uses Sequelize to define the schema for the accounts table in the MySQL database. The exported Sequelize model object gives full access to perform CRUD (create, read, update, delete) operations on accounts in MySQL, see the account service below for examples of it being used (via the db helper).
Fields with the type DataTypes.VIRTUAL are sequelize virtual fields that are not persisted in the database, they are convenience properties on the model that can include multiple field values (e.g. isVerified).
The defaultScope configures the model to exclude the password hash from query results by default. The withHash scope can be used to query accounts and include the password hash field in results.
The one-to-many relationship between accounts and refresh tokens is defined in the database wrapper.

**Sequelize Refresh Token Model
Path: /accounts/refresh-token.model.js**
The refresh token model uses Sequelize to define the schema for the refreshTokens table in the MySQL database. The exported Sequelize model object gives full access to perform CRUD (create, read, update, delete) operations on refresh tokens in MySQL, see the account service below for examples of it being used (via the db helper).
The DataTypes.VIRTUAL properties are convenience properties available on the sequelize model that don't get persisted to the MySQL database.
The one-to-many relationship between accounts and refresh tokens is defined in the database wrapper.

**Account Service
Path: /accounts/account.service.js**
The account service contains the core business logic for account sign up & verification, authentication with JWT & refresh tokens, forgot password & reset password functionality, as well as CRUD methods for managing account data. The service encapsulates all interaction with the sequelize account models and exposes a simple set of methods which are used by the accounts controller.
The top of the file contains the exported service object with just the method names to make it easy to see all the methods at a glance, the rest of the file contains the implementation functions for each service method, followed by local helper functions.

**xpress.js Accounts Controller
Path: /accounts/accounts.controller.js**
The accounts controller defines all /accounts routes for the Node.js + MySQL boilerplate api, the route definitions are grouped together at the top of the file and the implementation functions are below, followed by local helper functions. The controller is bound to the /accounts path in the main server.js file.
Routes that require authorization include the middleware function authorize() and optionally specify a role (e.g. authorize(Role.Admin), if a role is specified then the route is restricted to users in that role, otherwise the route is restricted to all authenticated users regardless of role. The auth logic is located in the authorize middleware.
The route functions revokeToken, getById, update and _delete include an extra custom authorization check to prevent non-admin users from accessing accounts other than their own. So regular user accounts (Role.User) have CRUD access to their own account but not to others, and admin accounts (Role.Admin) have full CRUD access to all accounts.
Routes that require schema validation include a middleware function with the naming convention <route>Schema (e.g. authenticateSchema). Each schema validation function defines a schema for the request body using the Joi library and calls validateRequest(req, next, schema) to ensure the request body is valid. If validation succeeds the request continues to the next middleware function (the route function), otherwise an error is returned with details of why validation failed. For more info about Joi schema validation see https://www.npmjs.com/package/joi.
Express is the web server used by the boilerplate api, it's one of the most popular web application frameworks for Node.js. For more info see https://expressjs.com/.

**Api Config
Path: /config.json**
The api config file contains configuration data for the boilerplate api, it includes the database connection options for the MySQL database, the secret used for signing and verifying JWT tokens, the emailFrom address used to send emails, and the smtpOptions used to connect and authenticate with an email server.
Configure SMTP settings for email within the smtpOptions property. For testing you can create a free account in one click at https://ethereal.email/ and copy the options below the title Nodemailer configuration.
IMPORTANT: The secret property is used to sign and verify JWT tokens for authentication, change it with your own random string to ensure nobody else can generate a JWT with the same secret to gain unauthorized access to your api. A quick and easy way is join a couple of GUIDs together to make a long random string (e.g. from https://www.guidgenerator.com/).

**Package.json
Path: /package.json**
The package.json file contains project configuration information including package dependencies which get installed when you run npm install.
The scripts section contains scripts that are executed by running the command npm run <script name>, the start script can also be run with the shortcut command npm start.
The start script starts the boilerplate api normally using node, and the start:dev script starts the api in development mode using nodemon which automatically restarts the server when a file is changed.
For more info see https://docs.npmjs.com/files/package.json.

**Server Startup File
Path: /server.js**
The server.js file is the entry point into the boilerplate Node.js api, it configures application middleware, binds controllers to routes and starts the Express web server for the api.

**Swagger API Documentation
Path: /swagger.yaml**
The Swagger YAML file describes the entire Node.js Boilerplate API using the OpenAPI Specification format, it includes descriptions of all routes and HTTP methods on each route, request and response schemas, path parameters, and authentication methods.
The YAML documentation is used by the swagger.js helper to automatically generate and serve interactive Swagger UI documentation on the /api-docs route of the boilerplate api. To preview the Swagger UI documentation without running the api simply copy and paste the below YAML into the swagger editor at https://editor.swagger.io/.



