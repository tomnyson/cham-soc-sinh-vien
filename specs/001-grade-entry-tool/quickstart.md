# Quickstart: Grade Entry Dashboard Development

## Setup
1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and set `JWT_SECRET` and MongoDB URI.
3. Run the development server:
   ```bash
   npm run dev
   ```

## Development
- The dashboard view is located in `views/dashboard.ejs`.
- API controllers are in `src/controllers/`.
- Make sure to authenticate requests using Google OAuth/JWT before accessing `/dashboard`.
