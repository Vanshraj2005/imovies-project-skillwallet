# IMovies — Full-Stack Movie Ticket Booking & Cinema Management Platform

**IMovies** is an enterprise-grade full-stack cinema ticketing, showtime scheduling, concessions ordering, group coordination, and box-office intelligence web application built on the **MERN** stack (MongoDB, Express.js, React.js, Node.js).

Designed with a clean, light, accessible professional aesthetic, IMovies provides cinema-goers with a frictionless booking experience—from personalized SmartMatch recommendations and collaborative group planning to real-time seat selection, pre-ordered concessions, and instant QR e-ticket verification—while equipping cinema administrators with comprehensive operational, box-office, and inventory analytics.

---

## Table of Contents

- [Overview & Architecture](#overview--architecture)
- [Design System & UI Guidelines](#design-system--ui-guidelines)
- [Technology Stack](#technology-stack)
- [Features & Capabilities](#features--capabilities)
  - [1. SmartMatch™ Recommendations](#1-smartmatch-recommendations)
  - [2. Plan My Movie Night (Group Coordination)](#2-plan-my-movie-night-group-coordination)
  - [3. Accessible Cinema Finder](#3-accessible-cinema-finder)
  - [4. Food & Concessions Pre-Ordering](#4-food--concessions-pre-ordering)
  - [5. Reliable Booking & Concurrency Engine](#5-reliable-booking--concurrency-engine)
  - [6. Payment Gateway & Refund Lifecycle](#6-payment-gateway--refund-lifecycle)
  - [7. Cinema Intelligence Dashboard](#7-cinema-intelligence-dashboard)
  - [8. Real-Time Socket.IO Synchronization](#8-real-time-socketio-synchronization)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [API Documentation & Endpoint Reference](#api-documentation--endpoint-reference)
- [Database Seeding](#database-seeding)
- [Testing & Quality Verification](#testing--quality-verification)
- [Production Deployment & Containerization](#production-deployment--containerization)
- [Implementation Roadmap (Parts 1–5 Completed)](#implementation-roadmap-parts-15-completed)

---

## Overview & Architecture

IMovies is organized into a decoupled, scalable architecture enforcing strict separation of concerns:

- **Client (`client/`)**: Modern React 18 single-page application built with Vite, React Router v6, Redux Toolkit, and Bootstrap 5 with custom light design tokens.
- **Server (`server/`)**: Express.js RESTful API engine with security hardening (Helmet), request rate limiting, centralized error handling, structured logging with sensitive field masking, and Socket.IO real-time capabilities.
- **Database**: MongoDB (via Mongoose ODM) with compound indexing, TTL indexes for temporary seat holds, and aggregation pipelines for box office intelligence.

```
imovies/
├── client/                 # React frontend application (Vite)
│   ├── public/             # Static public assets
│   ├── src/
│   │   ├── app/            # Redux Toolkit global store configuration
│   │   ├── components/     # Reusable UI primitives (Button, Modal, Input, Badge, etc.)
│   │   ├── features/       # Redux state slices (auth, movies, booking, ui)
│   │   ├── layouts/        # Application shells (MainLayout, AdminLayout)
│   │   ├── pages/          # Full route pages (Customer, Discovery, Checkout, Admin)
│   │   ├── services/       # Axios API client with unified interceptors & endpoint groups
│   │   ├── index.css       # Light, professional cinema design tokens
│   │   ├── App.jsx         # Client routing configuration
│   │   └── main.jsx        # Bootstrap & React entry point
│   └── package.json
├── server/                 # Express REST API & WebSockets backend
│   ├── src/
│   │   ├── config/         # Environment validator, MongoDB connection, CORS
│   │   ├── controllers/    # Domain controllers (auth, movies, theatres, shows, seats,
│   │   │                   #   bookings, payments, food, groupPlans, recommendations, admin)
│   │   ├── data/           # Initial curated cinema seed dataset
│   │   ├── middleware/     # Rate limiter, errorHandler, 404, requestLogger, auth, roles
│   │   ├── models/         # Mongoose models (User, Movie, Theatre, Show, SeatLock,
│   │   │                   #   Booking, Payment, FoodItem, FoodOrder, GroupPlan, Notification)
│   │   ├── routes/         # Versioned API routes (/api/v1)
│   │   ├── sockets/        # Real-time Socket.IO room subscriptions & seat lock broadcasting
│   │   ├── utils/          # Standard response formatter & sensitive-data logger
│   │   ├── app.js          # Express app assembly & middleware stack
│   │   └── server.js       # HTTP server bootstrap & graceful shutdown
│   ├── tests/              # Automated integration test suites (Parts 1 - 5)
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
- **Accessibility (WCAG 2.1 AA)**: Interactive elements feature high-contrast visible focus rings, ARIA labels, semantic HTML landmarks, and never rely on color alone.
- **Seat Map Matrix**: Clear, accessible seat states (Available, Selected, Reserved, Wheelchair Accessible) utilizing distinct shapes, borders, and icons in addition to color.
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
- **Mongoose 8** for MongoDB modeling, validation, and aggregations
- **Helmet** for HTTP security headers
- **express-rate-limit** for brute-force and DoS protection
- **Morgan** with custom structured sanitization
- **Socket.io 4** for real-time seat lock broadcasting and notifications
- **bcryptjs & jsonwebtoken** for secure identity management
- **Jest & Supertest** for API test automation

---

## Features & Capabilities

### 1. SmartMatch™ Recommendations
- **Taste Profile Discovery**: Users configure preferred genres, languages, cinema locations, budget per ticket, and preferred showtimes.
- **Transparent Match Scoring**: Every recommendation provides a match percentage (e.g., `96% Match`) and explains the specific match rationale (e.g., `Matches preferred genre Sci-Fi`, `Within $20 budget`).
- **Guest Fallback**: Non-authenticated visitors receive high-rated trending releases automatically.

### 2. Plan My Movie Night (Group Coordination)
- **Collaborative Movie Nights**: Any user can create a group plan with title, target date, budget, and candidate movies.
- **Shareable Invitation Tokens**: Secure unique token links (`/group-plans?invite=grp_...`) allow friends to preview and join the party with one click.
- **Democratic Voting**: Members vote on candidate movies; real-time vote totals dynamically bubble up the group's top pick.
- **Synchronized Booking & Cost Sharing**: Authoritative per-person cost calculations (`totalAmount / memberCount`) prevent front-end price manipulation.

### 3. Accessible Cinema Finder
- **Explicit Verification Statuses**: Theatres and screens declare verified accessibility (`VERIFIED`, `UNVERIFIED`, `NOT_AVAILABLE`, `UNKNOWN`).
- **Granular Attributes**: Tracks step-free wheelchair access, companion seating, assistive listening (induction loops/RF headsets), closed captioning (CC), audio description (AD), and elevator access.
- **Filtered Schedules**: Dedicated filters on the homepage and showtimes pages allow users with accessibility requirements to locate suitable screenings immediately.

### 4. Food & Concessions Pre-Ordering
- **Curated Menu Catalog**: Categorized concessions (Snacks, Beverages, Hot Food, Combos, Desserts) with dietary badges (Vegetarian, Vegan, Gluten-Free) and calorie information.
- **Server-Verified Price Snapshots**: Line items capture price snapshots at checkout time, preventing retroactive alterations from future menu price adjustments.
- **Express Pickup Workflow**: Orders transition through `CONFIRMED` -> `PREPARING` -> `READY_FOR_PICKUP` -> `COLLECTED` with designated pickup counter assignments.

### 5. Reliable Booking & Concurrency Engine
- **Atomic All-or-Nothing Holds**: Multi-seat reservations hold all requested seats simultaneously via MongoDB compound unique indexes on `(show, seatNumber)`. If even one seat is held by another user, the entire request fails cleanly with 409 Conflict.
- **TTL Expiration**: Temporary seat holds automatically expire after 10 minutes, releasing the inventory for other cinema-goers.
- **Smart Seat Advisor**: Automatically suggests adjacent seats based on group size and screen geometry (best viewing angles in middle rows).

### 6. Payment Gateway & Refund Lifecycle
- **Authoritative Server Pricing**: Ticket prices, format surcharges, and taxes are calculated exclusively on the backend.
- **Idempotent Mock Gateway**: Generates unique transaction IDs (`txn_mock_...`), simulates authentic card network latency, and handles idempotency keys to prevent duplicate billing.
- **Cancellations & Refunds**: Eligible bookings cancelled before showtime trigger automated seat release and refund logging with transparent policy enforcement.

### 7. Cinema Intelligence Dashboard
- **Executive Box Office Audit**: Real-time aggregation of gross ticket sales, collected revenue, processed refunds, net revenue, and food sales.
- **Auditorium Occupancy**: Calculates occupied vs. total capacity percentages across active showtimes.
- **Popular Titles & Daily Trends**: Ranked list of top-performing movies and daily financial trend breakdowns over 7-day, 30-day, 90-day, or all-time horizons.

### 8. Real-Time Socket.IO Synchronization
- **Live Seat Locking**: When a user selects or holds seats, updates broadcast immediately to all clients in the show room (`show_<showId>`).
- **User Notification Channels**: Dedicated per-user rooms (`user_<userId>`) receive instant alerts for booking confirmations, cancellations, food order pickup readiness, and group invitations.

---

## Prerequisites

Ensure the following tools are installed:
- **Node.js**: v18.0.0 or higher (`node -v`)
- **npm**: v9.0.0 or higher (`npm -v`)
- **Git**: (`git --version`)
- **MongoDB**: Local MongoDB server on port 27017 or a MongoDB Atlas connection URI.

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
   ```bash
   cp server/.env.example server/.env
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

## API Documentation & Endpoint Reference

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
| **Authentication & Users** | | | |
| `POST` | `/api/v1/auth/register` | Public | Register user account with bcrypt password hashing |
| `POST` | `/api/v1/auth/login` | Public | Sign in with email & password, receive access & refresh JWTs |
| `GET` | `/api/v1/auth/me` | Protected | Retrieve authenticated user profile |
| `POST` | `/api/v1/auth/refresh` | Public | Refresh expired access token |
| `PUT` | `/api/v1/users/preferences` | Protected | Update SmartMatch taste preferences |
| `GET` | `/api/v1/movies/recommendations/smartmatch` | Public/Auth | Retrieve scored recommendations with transparent explanations |
| **Catalog & Scheduling** | | | |
| `GET` | `/api/v1/movies` | Public | Discover movies with text search, genre, and pagination |
| `GET` | `/api/v1/movies/:id` | Public | Get detailed movie metadata and cast list |
| `POST` | `/api/v1/movies` | Admin | Register new cinema release |
| `GET` | `/api/v1/theatres` | Public | List theatres with city and accessibility filters |
| `POST` | `/api/v1/theatres` | Admin | Create theatre with verified accessibility attributes |
| `GET` | `/api/v1/shows` | Public | Query showtimes by movie, theatre, date, and accessibility |
| `POST` | `/api/v1/shows` | Admin | Schedule showtime with overlap prevention |
| **Seat Concurrency & Bookings** | | | |
| `GET` | `/api/v1/seats/show/:id` | Public | Fetch real-time seat availability map |
| `POST` | `/api/v1/seats/hold` | Protected | Temporarily hold seats (10-min TTL, atomic constraint) |
| `POST` | `/api/v1/seats/release` | Protected | Release held seats |
| `GET` | `/api/v1/seats/advisor` | Public | Recommend optimal adjacent seats for group size |
| `POST` | `/api/v1/bookings` | Protected | Create booking with server-calculated pricing |
| `GET` | `/api/v1/bookings` | Protected | List authenticated user's bookings |
| `GET` | `/api/v1/bookings/:id` | Protected | Get booking by ID (enforces object ownership) |
| `POST` | `/api/v1/bookings/:id/cancel` | Protected | Cancel booking, release seats, and issue refund |
| `POST` | `/api/v1/bookings/check-in` | Admin | Atomic QR ticket check-in at cinema entrance |
| `POST` | `/api/v1/payments/process` | Protected | Process idempotent payment |
| **Group Movie Nights** | | | |
| `POST` | `/api/v1/group-plans` | Protected | Create group plan with candidates & invite token |
| `GET` | `/api/v1/group-plans` | Protected | List user's active group plans |
| `GET` | `/api/v1/group-plans/invite/:token` | Public | Retrieve plan preview via shareable invite link |
| `POST` | `/api/v1/group-plans/invite/:token/join` | Protected | Join group plan as a member |
| `POST` | `/api/v1/group-plans/:id/vote` | Protected | Cast member vote on candidate movies |
| `POST` | `/api/v1/group-plans/:id/finalize` | Organizer | Finalize chosen screening and calculate cost split |
| **Concessions & Food Ordering** | | | |
| `GET` | `/api/v1/food/items` | Public | Browse categorized concessions catalog |
| `POST` | `/api/v1/food/items` | Admin | Add new food or beverage item |
| `POST` | `/api/v1/food/orders` | Protected | Place food order with server-verified price snapshot |
| `GET` | `/api/v1/food/orders` | Protected | List user's active and previous food orders |
| `PATCH` | `/api/v1/food/orders/:id/status`| Admin | Transition order status (`PREPARING`, `READY_FOR_PICKUP`, `COLLECTED`) |
| **Cinema Intelligence & Admin** | | | |
| `GET` | `/api/v1/admin/overview` | Admin | Consolidated box office overview |
| `GET` | `/api/v1/admin/analytics` | Admin | Deep intelligence analytics (`?range=7d|30d|90d|all`) |
| `GET` | `/api/v1/bookings/admin/all` | Admin | Master oversight of all bookings across theatres |
| `GET` | `/api/health` | Public | System vitals and database connection health |

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

Run the comprehensive automated integration test suite:
```bash
npm test
```
The test suite executes 79 tests across 5 test suites with 100% pass rate:
1. `tests/server.test.js` — Health check, route not found handling, rate limiting.
2. `tests/auth_and_api.test.js` — User authentication, JWT issuance, password hashing privacy, RBAC, movie catalog search.
3. `tests/part3_discovery_and_admin.test.js` — Venue management, show scheduling overlap prevention, ticket pricing rules, admin oversight.
4. `tests/part4_booking_concurrency_and_payments.test.js` — Concurrency protection, all-or-nothing seat holds, Smart Seat Advisor, idempotent payments, QR admissions check-in, cancellations and refunds.
5. `tests/part5_smartmatch_group_accessibility_food_analytics.test.js` — SmartMatch recommendations, taste profile updates, group planning & cost sharing, accessibility filtering, concessions lifecycle, and Cinema Intelligence analytics.

---

## Production Deployment & Containerization

### Docker & Docker Compose
A production-ready `Dockerfile` and `docker-compose.yml` can be used to run IMovies with MongoDB:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:6.0
    restart: always
    environment:
      MONGO_INITDB_DATABASE: imovies_db
    volumes:
      - mongo_data:/data/db
    ports:
      - "27017:27017"

  imovies-server:
    build:
      context: ./server
      dockerfile: Dockerfile
    restart: always
    environment:
      NODE_ENV: production
      PORT: 5000
      MONGODB_URI: mongodb://mongodb:27017/imovies_db
      CLIENT_URL: https://imovies.yourdomain.com
      JWT_SECRET: ${JWT_SECRET}
    ports:
      - "5000:5000"
    depends_on:
      - mongodb

  imovies-client:
    build:
      context: ./client
      dockerfile: Dockerfile
    restart: always
    ports:
      - "80:80"
    depends_on:
      - imovies-server

volumes:
  mongo_data:
```

### Production Checklist
1. Set `NODE_ENV=production`.
2. Generate cryptographically strong secrets for `JWT_SECRET` and `JWT_REFRESH_SECRET` (`openssl rand -hex 32`).
3. Configure MongoDB Atlas with replica sets to enable transaction support.
4. Deploy the client build output (`client/dist`) behind Nginx, Cloudflare, or AWS CloudFront with gzip/brotli compression.
5. Set up SSL/TLS termination with Let's Encrypt certificates.

---

## Implementation Roadmap (Parts 1–5 Completed)

- [x] **Part 1 — MERN Architecture, Environment & Light UI Foundation**:
  - Full audit, directory structure, Vite client setup, Express API skeleton.
  - Consistent light professional theme (`#ffffff`, `#f8fafc`, `#0d6efd`, Inter typography).
  - Client routing, component primitives, responsive navigation, health checks.

- [x] **Part 2 — MongoDB Models, REST APIs, Authentication & Authorization**:
  - Core Mongoose models: `User`, `Movie`, `Theatre`, `Show`, `Seat`, `SeatLock`, `Booking`, `Payment`, `Notification`.
  - Anti-double-booking unique indexes and TTL holds.
  - JWT authentication with access/refresh tokens and bcrypt password privacy.
  - RBAC (`USER`, `ADMIN`), object-level authorization, and safe seeder.

- [x] **Part 3 — Discovery, Showtimes, Seat Selection & Cinema Administration**:
  - Homepage search, city location selector, movie discovery, and detail views.
  - Interactive showtime schedules with screen format allocations and pricing tiers.
  - Cinema administration console with CRUD for movies, theatres, and schedules with overlap prevention.

- [x] **Part 4 — Reliable Booking Engine, Concurrency, Payments & Admissions**:
  - Atomic all-or-nothing multi-seat holds with 409 Conflict rejection.
  - Smart Seat Advisor for adjacent group seating recommendations.
  - Idempotent payment processing with simulated gateway latency.
  - QR ticket generation, admissions scanner check-in, and automated cancellation refunds.
  - Socket.IO real-time seat lock broadcasts.

- [x] **Part 5 — SmartMatch, Group Coordination, Accessibility, Concessions & Analytics**:
  - SmartMatch personalized recommendation engine with transparent matching explanations.
  - Group movie night planning with shareable invite tokens, member voting, and split cost calculations.
  - Accessible Cinema Finder with verified venue and screening accessibility tags.
  - Food & concessions pre-ordering with server price snapshots and express counter assignment.
  - Cinema Intelligence Dashboard with MongoDB aggregations for financial audits, occupancy, and daily trends.
  - 100% automated test suite passing across all 5 parts (79 tests).
