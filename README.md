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

| Method | Endpoint | Description | Sample Query / Body |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | System vitals, uptime, memory & DB state | None |
| `GET` | `/api/v1/health` | Versioned health check | None |
| `GET` | `/api/v1/movies` | Fetch all movies with filters & pagination | `?genre=Sci-Fi&status=now_showing` |
| `GET` | `/api/v1/movies/:id` | Fetch detailed movie record | None |
| `POST` | `/api/v1/movies` | Register new movie (Admin) | `{ "title": "Dune 3", "genre": ["Sci-Fi"], "duration": 150 }` |

### Testing with Postman or Curl

```bash
# 1. Health check
curl -X GET http://localhost:5000/api/health

# 2. Get now showing movies
curl -X GET "http://localhost:5000/api/v1/movies?status=now_showing"

# 3. Filter by genre
curl -X GET "http://localhost:5000/api/v1/movies?genre=Sci-Fi"
```

---

## Testing & Quality Verification

Run the automated backend test suite:
```bash
npm test
```
The Jest suite validates:
- System health reporting (`/api/health` & `/api/v1/health`)
- Movie catalogue querying, filtering by genre, and pagination metadata
- Proper 404 responses for unrecognized routes
- Error formatting and stack trace suppression

---

## Implementation Roadmap (Parts 1–5)

- [x] **Part 1 (Current)**:
  - Repository audit and baseline setup.
  - Express architecture with security headers, rate limiting, and centralized error handling.
  - Light, professional UI foundation with Bootstrap 5 and custom design tokens.
  - Complete client route structure: Home, Catalogue, Details, Theatres, Shows, Seats, Checkout, QR Ticket, Profile, Bookings, and Admin Console.
  - Live movie catalogue endpoints and health check.
  - Automated integration testing and build verification.

- [ ] **Part 2**:
  - Full MongoDB Mongoose schemas (User, Movie, Theatre, Screen, Show, Booking, Review).
  - JWT authentication with refresh token rotation and role-based access control (RBAC).
  - User registration, profile updates, and password management.

- [ ] **Part 3**:
  - Cinema scheduling engine and dynamic seat layout builder.
  - Real-time seat hold locks using Socket.IO to prevent double-booking.
  - Concessions ordering and snack inventory management.

- [ ] **Part 4**:
  - Multi-provider payment gateway integration (Stripe, Razorpay, and Dev Mock).
  - Automated email receipts with PDF tickets and signed QR codes.
  - SmartMatch movie recommendation engine and group booking coordination.

- [ ] **Part 5**:
  - Comprehensive end-to-end testing (Cypress / Playwright).
  - Box office analytics, revenue charts, and occupancy reporting.
  - Docker containerization, CI/CD pipelines, and cloud deployment guides.
