# Quickstart: Student Lesson Report & Redesign

This guide helps you set up the environment and run the portal locally.

## Setup & Running

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment**:
   Copy `.env.example` to `.env` and fill in:
   * `PORT` (default: 3000)
   * `MONGODB_URI` (MongoDB connection string)
   * `SESSION_SECRET` (session cryptographic key)

3. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Checking the Redesign
* Clear cache or force reload to load the updated `style.css`.
* Access `/grade-check` (Student portal) or log in as lecturer to access `/dashboard`.
