# QUIZOPIA

A full-stack quiz platform built with React + Express + SQLite.

## Project Structure

```
/
├── frontend/          # React frontend (this Lovable project)
├── backend/           # Express.js + SQLite backend
│   ├── src/
│   │   ├── index.js       # Server entry point
│   │   ├── database.js    # SQLite setup
│   │   ├── middleware/    # Auth middleware
│   │   └── routes/        # API routes
│   ├── package.json
│   └── .env.example
└── README.md
```

## Quick Start

### Option 1: Frontend Only (Demo Mode)

The frontend works standalone with localStorage-based mock APIs. Just open the app!

**Default credentials:** admin@quizopia.com / admin123

### Option 2: Full Stack (Backend + Frontend)

1. **Start the Backend:**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   npm run dev
   ```

2. **Update Frontend API Service:**
   Edit `src/services/api.ts` to use real fetch calls instead of mock functions.

3. **Start Frontend:**
   ```bash
   npm install
   npm run dev
   ```

## Features

- **Authentication:** JWT-based email/password auth
- **Role-Based Access:** Admin and Student roles
- **Quiz Management:** Create, edit, delete quizzes
- **MCQ Questions:** 4 options with 1 correct answer
- **Timed Quizzes:** Auto-submit when time runs out
- **One Attempt:** Each student can attempt a quiz once
- **Score Tracking:** View results and progress

## Tech Stack

- **Frontend:** React, Vite, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Node.js, Express.js
- **Database:** SQLite (better-sqlite3)
- **Auth:** JWT (jsonwebtoken), bcrypt

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register user |
| POST | /api/auth/login | Login user |
| GET | /api/quizzes | Get all quizzes |
| POST | /api/quizzes | Create quiz (admin) |
| DELETE | /api/quizzes/:id | Delete quiz (admin) |
| GET | /api/questions/:quizId | Get quiz questions |
| POST | /api/questions | Add question (admin) |
| POST | /api/results | Submit quiz |
| GET | /api/results | Get all results (admin) |

## License

MIT - Built for educational purposes.