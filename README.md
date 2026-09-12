# Real-Time Client Project Dashboard

A full-stack project management dashboard with role-based access control, real-time activity updates, task management, notifications, and scheduled overdue-task processing.

## 🚀 Features

### Authentication & Authorization
- JWT-based authentication
- Short-lived access tokens
- Refresh tokens stored in an HttpOnly cookie
- Refresh token rotation
- Password hashing using bcrypt
- API-level role-based access control
- Three roles:
  - Admin
  - Project Manager
  - Developer
- Backend verifies the user's current role from PostgreSQL for protected API requests

### Project & Task Management
- Admin and Project Managers can create projects
- Projects are associated with clients
- Project Managers can manage only projects they created
- Tasks can be assigned to Developers
- Task statuses:
  - To Do
  - In Progress
  - In Review
  - Done
- Task priorities:
  - Low
  - Medium
  - High
  - Critical
- Due dates
- Status-change history
- Activity logging
- Task filtering using query parameters
- Overdue tasks are automatically marked by a background cron job

### ⚡ Real-Time Activity Feed

The application uses Socket.IO for real-time communication.

When a task status changes:

1. The change is saved to PostgreSQL.
2. An activity record is created.
3. The activity is emitted through Socket.IO.
4. Authorized project viewers receive the update immediately.

Example:

> Ravi moved Task #12 from In Progress to In Review

The dashboard does not use polling for real-time updates.

### 🔔 Notifications

Notifications are stored in PostgreSQL.

The system supports:

- Developer assignment notifications
- Project Manager notification when a task enters In Review
- Real-time notification delivery
- Unread notification count
- Individual notification read status
- Mark-all-as-read functionality

### 📊 Role-Based Dashboards

#### Admin
- Total projects
- Total tasks
- Task status counts
- Overdue tasks
- Online users
- Global activity access

#### Project Manager
- Own projects
- Project task summary
- Tasks by priority
- Overdue tasks
- Project-specific activity

#### Developer
- Assigned tasks
- Task status counts
- Overdue tasks
- Tasks sorted by priority and due date

---

# 🛠️ Tech Stack

## Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- Axios
- React Router
- Socket.IO Client

## Backend
- Node.js
- Express
- TypeScript
- Prisma ORM
- Zod
- JWT
- bcrypt
- Socket.IO
- node-cron

## Database
- PostgreSQL

---

# 🏗️ Architecture

```text
                     ┌─────────────────────┐
                     │       React         │
                     │   TypeScript + Vite │
                     └──────────┬──────────┘
                                │
                    REST API    │    Socket.IO
                                │
                ┌───────────────┴───────────────┐
                │                               │
        ┌───────▼────────┐             ┌────────▼────────┐
        │ Express Backend │             │ Socket.IO Server │
        │   TypeScript    │             │  Real-Time Feed  │
        └───────┬────────┘             └────────┬────────┘
                │                               │
                │ Prisma ORM                    │
                └──────────────┬────────────────┘
                               │
                     ┌─────────▼─────────┐
                     │    PostgreSQL     │
                     │                   │
                     │ Users             │
                     │ Clients           │
                     │ Projects          │
                     │ Tasks             │
                     │ Activities        │
                     │ Notifications     │
                     │ Refresh Tokens    │
                     └───────────────────┘

                     ┌───────────────────┐
                     │    node-cron      │
                     │ Background Job    │
                     │ Overdue Tasks     │
                     └───────────────────┘

🔑 Authentication Flow
Login
  ↓
Validate credentials
  ↓
Compare password using bcrypt
  ↓
Generate short-lived JWT access token
  ↓
Generate random refresh token
  ↓
Hash refresh token
  ↓
Store hash in PostgreSQL
  ↓
Send refresh token using HttpOnly cookie
  ↓
Return access token to frontend


🔔 Notification Flow
Task assigned
      ↓
Notification saved in PostgreSQL
      ↓
Socket.IO notification event
      ↓
Developer receives notification
      ↓
Unread count updated

📁 Project Structure
project-dashboard/
│
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   ├── schema.prisma
│   │   ├── seed.ts
│   │   └── ...
│   │
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── lib/
│   │   └── server.ts
│   │
│   ├── .env
│   ├── prisma7.config.ts
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── auth/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── api.ts
│   │   ├── socket.ts
│   │   └── ...
│   │
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
└── README.md

💻 Local Setup
Prerequisites

Install:

Node.js
PostgreSQL
Git