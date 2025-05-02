# WorkBook - Team Collaboration Platform

WorkBook is a comprehensive task management and team collaboration platform that enables real-time project tracking and intelligent workflow optimization.

## Features

- **User Authentication**
  - Email/password login and registration
  - Secure password hashing
  - Session management
  - User profile management

- **Dashboard**
  - Overview of tasks, projects, and activities
  - Key productivity metrics
  - Progress indicators
  - Quick access to important features

- **Task Management**
  - Personal and project task tracking
  - Kanban-style drag-and-drop interface
  - Task status updates (todo, in progress, completed)
  - Task priority levels
  - Due date tracking
  - Recurring tasks (daily, weekly, monthly)

- **Project Management**
  - Create and join projects
  - Assign team members to tasks
  - Progress tracking
  - Resource allocation

- **Real-time Chat**
  - Team communication channels
  - Project-specific chat rooms
  - File sharing within chats
  - Notification system

- **File Sharing**
  - Upload and manage files
  - File organization by project
  - Secure file storage
  - File version tracking

- **Analytics**
  - Task completion rates
  - Project progress visualization
  - Team performance metrics
  - Productivity trends

- **Accessibility Features**
  - High contrast mode
  - Colorblind mode
  - Text-to-speech compatibility

## Tech Stack

- **Frontend**
  - React.js with TypeScript
  - React Query for data fetching
  - Shadcn UI components
  - Tailwind CSS for styling
  - Wouter for routing
  - React Hook Form for form management
  - Zod for validation
  - WebSockets for real-time features

- **Backend**
  - Node.js with Express
  - TypeScript for type safety
  - Passport.js for authentication
  - WebSockets for real-time communication
  - Multer for file uploads

- **Database**
  - PostgreSQL
  - Drizzle ORM
  - Relational data modeling

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm or yarn
- PostgreSQL

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/workbook.git
   cd workbook
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory with the following variables:
   ```
   DATABASE_URL=postgresql://<username>:<password>@<host>:<port>/<database>
   SESSION_SECRET=your_secret_key
   PORT=5000
   ```

4. Initialize the database:
   ```
   npm run db:push
   ```

5. Seed the database with initial data:
   ```
   npm run db:seed
   ```

6. Start the development server:
   ```
   npm run dev
   ```

7. Open your browser and navigate to `http://localhost:5000`

## Project Structure

```
workbook/
├── client/               # Frontend code
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Utility functions
│   │   ├── pages/        # Page components
│   │   ├── App.tsx       # Main application component
│   │   └── main.tsx      # Entry point
│   └── index.html        # HTML template
├── db/                   # Database setup and seeding
├── server/               # Backend code
│   ├── auth.ts           # Authentication logic
│   ├── file-uploads.ts   # File upload handling
│   ├── index.ts          # Server entry point
│   ├── routes.ts         # API routes
│   ├── storage.ts        # Data storage interface
│   └── vite.ts           # Vite development server setup
├── shared/               # Shared code between client and server
│   └── schema.ts         # Database schema definitions
├── uploads/              # Uploaded files storage
├── drizzle.config.ts     # Drizzle ORM configuration
├── package.json          # Project dependencies
└── README.md             # Project documentation
```

## API Documentation

### Authentication

- `POST /api/register` - Register a new user
- `POST /api/login` - Login with username/password
- `POST /api/logout` - Logout current user
- `GET /api/user` - Get current user information

### Projects

- `GET /api/projects` - List user's projects
- `GET /api/projects/:id` - Get project details
- `POST /api/projects` - Create a new project
- `PATCH /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Project Members

- `GET /api/projects/:id/members` - List project members
- `POST /api/projects/:id/members` - Add member to project
- `DELETE /api/projects/:id/members/:userId` - Remove member from project

### Tasks

- `GET /api/projects/:id/tasks` - List project tasks
- `GET /api/user/tasks` - List tasks assigned to current user
- `GET /api/personal-tasks` - List personal tasks of current user
- `POST /api/projects/:id/tasks` - Create project task
- `POST /api/personal-tasks` - Create personal task
- `PATCH /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Chat

- `GET /api/projects/:id/chat-rooms` - List project chat rooms
- `GET /api/chat-rooms/:id/messages` - Get chat messages
- `POST /api/chat-rooms/:id/messages` - Send chat message

### Files

- `GET /api/projects/:id/files` - List project files
- `POST /api/projects/:id/files` - Upload project file
- `DELETE /api/files/:id` - Delete file

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Shadcn UI for the beautiful component library
- Tailwind CSS for the utility-first CSS framework
- Drizzle ORM for the simple and type-safe database access