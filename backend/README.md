# Quizopia Backend

Express.js + SQLite backend for the Quizopia quiz platform.

## Setup

1. Navigate to this directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment file:
   ```bash
   cp .env.example .env
   ```

4. Start the server:
   ```bash
   npm run dev
   ```

The server will run on `http://localhost:3001`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user

### Quizzes
- `GET /api/quizzes` - Get all quizzes
- `GET /api/quizzes/:id` - Get quiz by ID
- `POST /api/quizzes` - Create quiz (admin only)
- `DELETE /api/quizzes/:id` - Delete quiz (admin only)

### Questions
- `GET /api/questions/:quizId` - Get questions for a quiz
- `POST /api/questions` - Add question (admin only)
- `DELETE /api/questions/:id` - Delete question (admin only)

### Results
- `GET /api/results` - Get all results (admin only)
- `GET /api/results/user/:userId` - Get user results
- `POST /api/results` - Submit quiz result
