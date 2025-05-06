# Architecture Overview: EventPro

## 1. Overview

EventPro is a comprehensive event management platform designed to facilitate the organization and management of events, speakers, attendees, and certificates. The application follows a modern full-stack architecture with a clear separation between frontend and backend components.

The system is built as a single codebase containing both client and server components, allowing for simplified development and deployment. It employs a RESTful API architecture for communication between the client and server.

## 2. System Architecture

EventPro follows a three-tier architecture:

1. **Presentation Layer**: A React-based single-page application (SPA) with a component-based UI architecture
2. **Application Layer**: An Express.js server that handles API requests, authentication, and business logic
3. **Data Layer**: A PostgreSQL database accessed via Drizzle ORM for data persistence

### High-Level Architecture Diagram

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│                 │         │                 │         │                 │
│  Client (React) │ ───────▶│ Server (Express)│ ───────▶│  Database (PG)  │
│                 │         │                 │         │                 │
└─────────────────┘         └─────────────────┘         └─────────────────┘
       ^                           │                            │
       │                           │                            │
       └───────────────────────────┘                            │
              API Requests                                      │
                                                               │
                                    Data Persistence            │
                                    ◀────────────────────────────┘
```

## 3. Key Components

### 3.1 Frontend Architecture

The client-side application is built with React and organized around a component-based architecture. Key frontend technologies include:

- **React**: Core UI library
- **Shadcn UI**: Component library with a customized design system
- **TailwindCSS**: Utility-first CSS framework for styling
- **React Query**: Data fetching and state management
- **React Hook Form**: Form handling with validation
- **Wouter**: Lightweight routing library

The frontend is structured as follows:

- `/client/src/components`: Reusable UI components
  - `/ui`: Core UI components from Shadcn UI
  - `/layout`: Layout components like sidebar and navigation
  - `/dashboard`: Dashboard-specific components
  - `/events`: Event-related components
- `/client/src/pages`: Page components for different routes
- `/client/src/hooks`: Custom React hooks
- `/client/src/lib`: Utility functions and client-side API helpers

### 3.2 Backend Architecture

The server is built with Express.js and follows a modular architecture:

- `/server/index.ts`: Entry point for the Express server
- `/server/routes.ts`: API route definitions
- `/server/auth.ts`: Authentication logic using Passport.js
- `/server/storage.ts`: Data access layer interfacing with the database
- `/server/vite.ts`: Development server configuration for Vite

### 3.3 Database Architecture

The application uses PostgreSQL with Drizzle ORM for data access:

- `/db/index.ts`: Database connection setup
- `/db/seed.ts`: Database seeding for initial data
- `/shared/schema.ts`: Schema definitions shared between client and server

### 3.4 Authentication System

The application implements a session-based authentication system:

- Passport.js for authentication middleware
- Local strategy with username/password
- Secure password hashing using scrypt
- Session persistence in PostgreSQL using connect-pg-simple
- Role-based authorization (admin, speaker, user)

## 4. Data Flow

### 4.1 Authentication Flow

1. User submits credentials via login form
2. Server verifies credentials against hashed passwords in database
3. On successful authentication, session is created and stored in PostgreSQL
4. Session cookie is returned to client
5. Subsequent requests include session cookie for authentication

### 4.2 API Request Flow

1. Client makes API request with session cookie
2. Server authenticates request via session
3. Authorization middleware checks user role permissions
4. Request is processed and routed to appropriate handler
5. Data is retrieved/modified via the storage layer
6. Response is returned to client

### 4.3 Rendering Flow

1. Client-side navigation triggers route change
2. Protected routes verify authentication status
3. Page component fetches necessary data via React Query
4. UI renders based on fetched data and application state
5. Updates to data trigger re-rendering of affected components

## 5. External Dependencies

### 5.1 Core Dependencies

- **Frontend**:
  - React ecosystem (react, react-dom)
  - TailwindCSS for styling
  - Radix UI primitives for accessible components
  - React Query for data fetching
  - React Hook Form for form handling
  - Zod for validation

- **Backend**:
  - Express.js for API server
  - Passport.js for authentication
  - Drizzle ORM for database access
  - connect-pg-simple for session storage

- **Database**:
  - PostgreSQL via @neondatabase/serverless

### 5.2 Build Tools

- Vite for frontend bundling and development server
- TypeScript for type safety
- ESBuild for server bundling
- Drizzle Kit for database migrations

## 6. Deployment Strategy

The application is configured for deployment on Replit, as indicated by the `.replit` configuration file. The deployment process includes:

1. Building the client and server code with `npm run build`
2. Starting the production server with `npm run start`
3. Using environment variables for configuration

The build process:
- Bundles the client-side React application with Vite
- Bundles the server-side code with ESBuild
- Outputs the bundled files to the `dist` directory

The server is configured to serve static assets from the built client code and handle API requests through the Express routes.

### 6.1 Database Provisioning

The application expects a PostgreSQL database connection string to be provided via the `DATABASE_URL` environment variable. For Replit deployment, this would typically be a provisioned database, with the connection string stored in Replit Secrets.

### 6.2 Environment Configuration

The following environment variables are required:
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secret for session encryption

## 7. Development Workflow

The application supports the following development workflows:

1. **Local Development**: `npm run dev` starts both the server and client in development mode
2. **Database Schema Updates**: `npm run db:push` to apply schema changes
3. **Database Seeding**: `npm run db:seed` to populate initial data
4. **Type Checking**: `npm run check` for TypeScript validation

The development server includes features like hot module replacement and runtime error overlays for a better developer experience.