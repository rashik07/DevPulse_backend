# DevPulse Backend (Issue Tracking System)

**Live URL:** [Insert Live URL Here] *(Update with your deployed link)*

## Features

- **User Authentication:** Secure signup and login functionality.
- **Role-Based Access Control (RBAC):** Users can have roles like `contributor` or `maintainer`, which dictate their permissions (e.g., only maintainers can delete issues).
- **Issue Tracking:** Create, read, update, and delete issues (bugs or feature requests).
- **Database Integration:** Persistent data storage using PostgreSQL.
- **Global Error Handling:** Centralized error management for reliable API responses.

## Tech Stack

- **Runtime Environment:** Node.js
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** PostgreSQL (`pg` library)
- **Authentication:** JSON Web Tokens (`jsonwebtoken`) & `bcryptjs` for password hashing
- **Development Tools:** `tsx` for local development, `tsup` for building

## Setup Steps

Follow these instructions to run the project locally:

1. **Clone the repository:**
   ```bash
   git clone <your-repository-url>
   cd assignment2
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory and add the following variables:
   ```env
   PORT=5000
   DATABASE_URL=your_postgresql_connection_string
   JWT_SECRET=your_jwt_secret_key
   ```
   *(Ensure you replace the placeholders with your actual database URL and secret key)*

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Build for production:**
   ```bash
   npm run build
   npm start
   ```

## API Endpoint List

### Authentication (`/api/auth`)
- `POST /api/auth/signup` - Register a new user
- `POST /api/auth/login` - Authenticate an existing user and get a token

### Issues (`/api/issues`)
- `POST /api/issues` - Create a new issue (Requires authentication: contributor/maintainer)
- `GET /api/issues` - Retrieve all issues
- `GET /api/issues/:id` - Retrieve a specific issue by ID
- `PATCH /api/issues/:id` - Update an issue (Requires authentication: contributor/maintainer)
- `DELETE /api/issues/:id` - Delete an issue (Requires authentication: maintainer only)

## Database Schema Summary

The database consists of two primary tables:

### 1. `users` Table
Stores user account information and role configurations.
- `id`: SERIAL PRIMARY KEY
- `name`: VARCHAR(100) (Not Null)
- `email`: VARCHAR(255) (Unique, Not Null)
- `password`: TEXT (Not Null, Hashed)
- `role`: VARCHAR(50) (Defaults to 'contributor', options: 'contributor', 'maintainer')
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

### 2. `issues` Table
Stores details about reported issues or feature requests.
- `id`: SERIAL PRIMARY KEY
- `title`: VARCHAR(150) (Not Null)
- `description`: TEXT (Not Null, min length 20)
- `type`: VARCHAR(20) (options: 'bug', 'feature_request')
- `status`: VARCHAR(20) (Defaults to 'open', options: 'open', 'in_progress', 'resolved')
- `reporter_id`: INT (Not Null, references user)
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP
