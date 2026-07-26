# Guidelines for frontend-tales-be

## Tech Stack Overview
- **Framework:** NestJS (v11) with TypeScript
- **Database:** PostgreSQL managed via Prisma ORM
- **Cache/Session:** Redis (`ioredis`, `@nestjs-modules/ioredis`)
- **Storage & Mail:** AWS S3 (`@aws-sdk/client-s3`), Nodemailer
- **Auth:** Passport.js (JWT, Google OAuth2, GitHub OAuth2), bcrypt, cookie-parser
- **Validation & Docs:** `class-validator`, `class-transformer`, Joi, Swagger (`@nestjs/swagger`)
- **Testing:** Jest (Unit/Spec), Supertest (E2E)

---

## Commands

### Development
- `npm run start:dev` — Start development server with hot-reload
- `npm run start:debug` — Start in debug mode with watch
- `npm run build` — Build production bundle (`nest build`)
- `npm run start:prod` — Run built app from `dist/src/main`

### Code Quality & Formatting
- `npm run lint` — Lint and auto-fix TypeScript files using ESLint
- `npm run format` — Format all code using Prettier

### Testing
- `npm test` — Run unit tests (`src/**/*.spec.ts`)
- `npm run test:watch` — Run unit tests in watch mode
- `npm run test:cov` — Run tests with coverage output
- `npm run test:e2e` — Run end-to-end tests (`./test/jest-e2e.json`)

### Prisma (Database)
- `npx prisma generate` — Generate Prisma Client
- `npx prisma migrate dev` — Apply pending migrations in dev environment
- `npx prisma studio` — Open database visual manager

---

## Code Style & Architecture Rules

### 1. NestJS Architecture Patterns
- Follow standard NestJS modular architecture (`Module`, `Controller`, `Service`).
- Keep Controllers thin: limit them to route handling, DTO mapping, and calling services. Put business logic exclusively in Services.
- Always use **DTOs** (`class-validator` / `class-transformer`) for request body validation and query params.
- Decorate API endpoints with Swagger decorators (`@ApiTags`, `@ApiOperation`, `@ApiResponse`) where appropriate.

### 2. Database & Data Integrity
- Use Prisma Client for database interaction—avoid writing raw SQL queries.
- Never edit existing Prisma migrations manually after they have been pushed or committed. Create new migrations (`npx prisma migrate dev`) for schema updates.
- Strictly adhere to `package-lock.json`—do not modify lockfile versions manually.

### 3. Error Handling & Security
- Use NestJS built-in exceptions (`BadRequestException`, `UnauthorizedException`, `NotFoundException`, etc.) rather than generic `Error` instances.
- Maintain security defaults: ensure route endpoints requiring authentication are protected using appropriate Passport Guards (`@UseGuards(JwtAuthGuard)`).
- Never log secrets, JWT secrets, database connection URLs, or AWS credentials in console outputs or test files.

### 4. Testing Expectations
- Place unit tests adjacent to the file being tested (e.g., `user.service.ts` -> `user.service.spec.ts`).
- Mock external side-effects (AWS S3, Redis, Nodemailer, Prisma) in unit tests.
- When adding or refactoring endpoints, run `npm test` and `npm run lint` to verify stability before concluding tasks.