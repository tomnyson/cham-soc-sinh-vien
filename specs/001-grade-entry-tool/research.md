# Research: Grade Entry & Student Status Dashboard

## Authentication Method (Clarification)
- **Decision**: Use existing Google OAuth and JWT-based Authentication.
- **Rationale**: The project already has an `auth.middleware.js` that checks for a JWT token (in cookie or `Authorization` header), and a `User` model using Google OAuth. Lecturers will authenticate using this existing system, so no new auth mechanism is needed.
- **Alternatives considered**: Simple password (rejected because it's less secure and an existing Google OAuth implementation is already present). Open access (rejected due to security risks regarding student grades).

## Backend Framework & Tools
- **Decision**: Node.js + Express, EJS template engine, Mongoose (MongoDB).
- **Rationale**: This is the current stack of the project.
- **Alternatives considered**: N/A, continuing with existing stack.
