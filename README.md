# IMovies — Full-Stack Movie Ticket Booking & Cinema Management Platform

**IMovies** is an enterprise-grade full-stack cinema ticketing, showtime scheduling, and theatre management web application built on the **MERN** stack (MongoDB, Express.js, React.js, Node.js).

Designed with a clean, light, accessible professional aesthetic, IMovies provides cinema-goers with a frictionless booking experience—from discovering movies to real-time seat selection and instant QR e-ticket verification—while equipping cinema administrators with comprehensive operational and box office management tools.

---

## Table of Contents

- [Overview & Architecture](#overview--architecture)
- [Design System & UI Guidelines](#design-system--ui-guidelines)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [API Documentation & Postman Guide](#api-documentation--postman-guide)
- [Testing & Quality Verification](#testing--quality-verification)
- [Project Structure](#project-structure)
- [Implementation Roadmap (Parts 1–5)](#implementation-roadmap-parts-15)

---

## Overview & Architecture

IMovies is organized into a decoupled, scalable architecture enforcing strict separation of concerns:

- **Client (`client/`)**: Modern React 18 single-page application built with Vite, React Router v6, Redux Toolkit, and Bootstrap 5 with custom light design tokens.
- **Server (`server/`)**: Express.js RESTful API engine with security hardening (Helmet), request rate limiting, centralized error handling, structured logging with sensitive field masking, and Socket.IO real-time capabilities.
- **Database**: MongoDB (via Mongoose ODM) with support for both local instances and MongoDB Atlas.

```
imovies/
├── client/                 # React frontend application (Vite)
│   ├── public/             # Static public assets
│   ├── src/
│   │   ├── app/            # Redux Toolkit global store configuration
│   │   ├── components/     # Reusable UI primitives (Button, Modal, Input, Badge, etc.)
│   │   ├── features/       # Redux state slices (auth, movies, booking, ui)
│   │   ├── layouts/        # Application shells (MainLayout, AdminLayout)
│   │   ├── pages/          # Full route pages (Customer, Checkout, Admin)
│   │   ├── services/       # Axios API client with unified interceptors
│   │   ├── index.css       # Light, professional cinema design tokens
│   │   ├── App.jsx         # Client routing configuration
│   │   └── main.jsx        # Bootstrap & React entry point
│   └── package.json
├── server/                 # Express REST API & WebSockets backend
│   ├── src/
│   │   ├── config/         # Environment validator, MongoDB connection, CORS
│   │   ├── controllers/    # HTTP controllers (health, movies, auth)
│   │   ├── data/           # Initial curated cinema seed dataset
│   │   ├── middleware/     # Rate limiter, errorHandler, 404, requestLogger
│   │   ├── routes/         # Versioned API routes (/api/v1)
│   │   ├── sockets/        # Real-time Socket.io seat hold manager
│   │   ├── utils/          # Standard response formatter & sensitive-data logger
│   │   ├── app.js          # Express app assembly & middleware stack
│   │   └── server.js       # HTTP server bootstrap & graceful shutdown
│   ├── tests/              # Jest & Supertest API integration suite
│   ├── .env.example        # Backend environment template
│   └── package.json
├── .env.example            # Root environment template
├── .gitignore              # Repository version control exclusions
├── package.json            # Root workspace & concurrent runner
└── README.md               # Project documentation
```

---

## Design System & UI Guidelines

Following strict project specifications, IMovies adheres to a **light, standard professional design** across all customer and administrative surfaces:

- **Background Palette**: Crisp white (`#ffffff`) and soft light-gray neutrals (`#f8fafc`, `#f1f5f9`).
- **Primary Accents**: Restrained cinema blue (`#0d6efd`, hover `#0b5ed7`) with subtle border lines (`#e2e8f0`).
- **Typography**: Dark, highly legible text (`#0f172a`, `#334155`) with the Inter typeface.
- **Seat Map Matrix**: Clear, accessible seat states (Available, Selected, Reserved, Wheelchair Accessible) utilizing shapes, borders, and icons in addition to color.
- **Responsive Layout**: Designed for mobile phones, tablets, laptops, and ultra-wide displays.

---

## Technology Stack

### Frontend
- **React.js 18** with functional components and JSX
- **Vite 6** for blazing-fast builds and module bundling
- **React Router DOM v6** for client-side navigation
- **Redux Toolkit & React Redux** for predictable shared state
- **Axios** with request/response interceptors
- **Bootstrap 5 & Bootstrap Icons** for structured responsive layouts
- **React Toastify** for dismissible, accessible alerts

### Backend
- **Node.js** (LTS >= 18.0.0)
- **Express.js 4**
- **Mongoose 8** for MongoDB modeling and validation
- **Helmet** for HTTP security headers
- **express-rate-limit** for brute-force and DoS protection
- **Morgan** with custom structured sanitization
- **Socket.io 4** for real-time seat lock broadcasting
- **bcryptjs & jsonwebtoken** for secure identity management
- **Jest & Supertest** for API test automation

---

## Prerequisites

Ensure the following tools are installed on your machine:
- **Node.js**: v18.0.0 or higher (`node -v`)
- **npm**: v9.0.0 or higher (`npm -v`)
- **Git**: (`git --version`)
- **MongoDB** *(Optional for Part 1; Required for Part 2)*: Local MongoDB server on port 27017 or a MongoDB Atlas connection string.

---

## Installation & Setup

1. **Clone or navigate to the repository:**
   ```bash
   cd e:\imovie
   ```

2. **Install all dependencies (root, server, and client):**
   ```bash
   npm run install:all
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the `server/` directory:
   ```bash
   cp .env.example server/.env
   ```

---

## Environment Variables

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `NODE_ENV` | Runtime environment (`development`, `production`, `test`) | `development` |
| `PORT` | Backend HTTP port | `5000` |
| `CLIENT_URL` | Permitted client origin for CORS | `http://localhost:5173` |
| `MONGODB_URI` | MongoDB connection URI | `mongodb://127.0.0.1:27017/imovies_db` |
| `JWT_SECRET` | Secret key for signing access tokens | *Strong 32+ char secret* |
| `JWT_EXPIRES_IN` | Access token duration | `1d` |
| `JWT_REFRESH_SECRET`| Secret key for refresh tokens | *Strong 32+ char secret* |
| `JWT_REFRESH_EXPIRES_IN`| Refresh token duration | `7d` |
| `PAYMENT_PROVIDER` | Active payment engine (`dev_mock`, `stripe`, `razorpay`)| `dev_mock` |
| `RATE_LIMIT_WINDOW_MIN` | Rate limit window in minutes | `15` |
| `RATE_LIMIT_MAX_REQUESTS` | Allowed requests per window | `500` |

---

## Running the Application

### 1. Concurrent Development Mode (Server + Client)
Run both backend and frontend simultaneously with color-coded terminal output:
```bash
npm run dev
```
- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:5000/api/v1](http://localhost:5000/api/v1)
- **Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

### 2. Standalone Server Mode
```bash
npm run server
```

### 3. Standalone Client Mode
```bash
npm run client
```

### 4. Production Build
```bash
npm run build
```

---

## API Documentation & Postman Guide

All API responses follow a uniform, developer-friendly JSON envelope:

```json
{
  "success": true,
  "message": "Operation description",
  "data": { ... },
  "timestamp": "2026-10-30T01:00:00.000Z"
}
```

### Key Endpoints

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Public | Register user account with bcrypt password hashing |
| `POST` | `/api/v1/auth/login` | Public | Sign in with email & password, receive access/refresh JWT |
| `GET` | `/api/v1/auth/me` | Protected | Retrieve authenticated user profile |
| `POST` | `/api/v1/auth/refresh` | Public | Refresh expired access token |
| `GET` | `/api/v1/users/profile` | Protected | Fetch current user preferences & settings |
| `PATCH` | `/api/v1/users/profile` | Protected | Update profile, favorite genres, accessibility |
| `PUT` | `/api/v1/users/password`| Protected | Change account password |
| `GET` | `/api/v1/movies` | Public | Discover movies with text search, genre, and pagination |
| `GET` | `/api/v1/movies/:id` | Public | Get detailed movie metadata and cast list |
| `POST` | `/api/v1/movies` | Admin | Register new cinema release |
| `GET` | `/api/v1/theatres` | Public | List theatres with city and accessibility filters |
| `GET` | `/api/v1/theatres/:id` | Public | Get venue details and screen specifications |
| `GET` | `/api/v1/shows` | Public | Query showtimes by movie, theatre, and date |
| `GET` | `/api/v1/shows/:id` | Public | Get show details with format & tier pricing |
| `GET` | `/api/v1/seats/show/:id`| Public | Fetch real-time seat availability map |
| `POST` | `/api/v1/seats/hold` | Protected | Temporarily hold seats (10-min TTL, atomic constraint) |
| `POST` | `/api/v1/seats/release`| Protected | Release held seats |
| `POST` | `/api/v1/bookings` | Protected | Create booking with server-calculated pricing |
| `GET` | `/api/v1/bookings` | Protected | List authenticated user's bookings |
| `GET` | `/api/v1/bookings/:id` | Protected | Get booking by ID (enforces object ownership) |
| `POST` | `/api/v1/bookings/:id/cancel` | Protected | Cancel booking and initiate refund |
| `GET` | `/api/v1/bookings/admin/all` | Admin | View all bookings across system |
| `POST` | `/api/v1/payments/process` | Protected | Process payment (supports dev mock & providers) |
| `GET` | `/api/v1/notifications`| Protected | List user notifications |
| `GET` | `/api/v1/admin/overview`| Admin | Consolidated box office analytics overview |
| `GET` | `/api/health` | Public | Health vitals and database connection status |

### Testing with Postman or Curl

```bash
# 1. Register a user
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Doe","email":"jane@example.com","password":"Password123!"}'

# 2. Login to get JWT
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jane@example.com","password":"Password123!"}'

# 3. Access protected user profile
curl -X GET http://localhost:5000/api/v1/auth/me \
  -H "Authorization: Bearer <YOUR_ACCESS_TOKEN>"

# 4. Filter movies by genre
curl -X GET "http://localhost:5000/api/v1/movies?genre=Sci-Fi"
```

---

## Database Seeding

To populate MongoDB with baseline users (`admin@imovies.com`, `user@imovies.com`), partner theatres, auditoriums, physical seats, movies, and showtimes:

```bash
npm run seed
# or to clear and re-seed:
npm run seed -- --force
```

---

## Testing & Quality Verification

Run the automated backend test suite:
```bash
npm test
```
The Jest suite validates:
- System health reporting (`/api/health` & `/api/v1/health`)
- User registration, normalization, and duplicate email prevention (409)
- Login validation, bcrypt password hashing, and token generation
- Password privacy (hash is never returned in JSON responses)
- Invalid or expired JWT rejection (401)
- Role-Based Access Control: USER denied access to ADMIN-only routes (403)
- Object-level ownership protection: User B forbidden from viewing User A's booking (403)
- Seat hold uniqueness: Database constraint rejecting colliding seat holds (409)
- Booking creation with server-side price recalculation
- Movie catalogue querying, filtering by genre, search, and pagination
- Route not found (404) and error handling

---

## Implementation Roadmap (Parts 1–5)

- [x] **Part 1**:
  - Repository audit and baseline setup.
  - Express architecture with security headers, rate limiting, and centralized error handling.
  - Light, professional UI foundation with Bootstrap 5 and custom design tokens.
  - Complete client route structure: Home, Catalogue, Details, Theatres, Shows, Seats, Checkout, QR Ticket, Profile, Bookings, and Admin Console.
  - Live movie catalogue endpoints and health check.
  - Automated integration testing and build verification.

- [x] **Part 2 (Current)**:
  - Core Mongoose models: `User`, `Movie`, `Theatre`, `Show`, `Seat`, `SeatLock`, `Booking`, `Payment`, `Notification`.
  - Database-level compound unique indexing on `(show, seatNumber)` for anti-double-booking concurrency protection with TTL holds.
  - Full-text search index on movies and compound indexes on shows and bookings.
  - JWT authentication with access/refresh tokens and bcryptjs hashing (password hash privacy).
  - Role-based authorization (`USER`, `ADMIN`) and object-level record ownership protection.
  - Complete REST API route groups (`auth`, `users`, `movies`, `theatres`, `shows`, `seats`, `bookings`, `payments`, `notifications`, `admin`).
  - Safe database seeder script (`server/src/scripts/seed.js`).
  - 32 automated integration tests passing with 100% success.

- [ ] **Part 3**:
  - Dynamic interactive cinema scheduling engine and seat layout configuration.
  - Real-time seat hold locks and state broadcasting using Socket.IO.
  - Concessions/food ordering and inventory management.

- [ ] **Part 4**:
  - Multi-provider payment gateway integration (Stripe, Razorpay, and Dev Mock).
  - Automated email receipts with PDF tickets and signed QR codes.
  - SmartMatch movie recommendation engine and group booking coordination.

- [ ] **Part 5**:
  - Comprehensive end-to-end testing (Cypress / Playwright).
  - Box office analytics, revenue charts, and occupancy reporting.
  - Docker containerization, CI/CD pipelines, and cloud deployment guides.
