# ReWeara — The Outfit Baar ✨

ReWeara is a premium, fashion-tech startup platform for luxury Indian wedding outfit rentals. Designed to bring a modern, Pinterest-inspired luxury boutique experience to local rentals, it starts in Pune with a curated, high-end collection and a highly scalable, production-grade technical architecture. 

This repository is structured to be **production-ready, highly maintainable, and recruiter-friendly**, showcasing solid software engineering patterns suitable for professional startup environments.

---

## 📖 1. Problem Statement & Mission

### Why ReWeara Exists
Indian wedding celebrations, sangeets, receptions, and traditional occasions are magnificent, visual events requiring high-fidelity luxury garments (Lehengas, Sarees, Gowns). However, these premium garments pose significant customer pain points:
* **Extreme Financial Friction**: Designer outfits cost anywhere from ₹15,000 to ₹1,00,000+, yet they are typically worn only once or twice before sitting indefinitely in a closet.
* **Lack of Trust in Rental Ecosystems**: Existing Indian rental websites often look dated, have opaque fee structures, unreliable cleaning standards, and untrustworthy security deposits that are delayed or wrongfully withheld.
* **Cluttered Shopping Experience**: Traditional e-commerce interfaces are overwhelming and lack the premium visual curation that Gen Z and modern brides seek on platforms like Pinterest and high-end fashion boutiques.

### The ReWeara Solution
ReWeara ("The Outfit Baar ✨") bridges the gap between premium fashion and circular sustainability:
* **Affordable Luxury Access**: High-end outfits are offered for rent at 10–15% of their original MRP.
* **Transparent Deposit Engine**: Seamless integration of a standardized, refundable deposit ledger directly linked to verified quality checks and automated gateway-level refunds.
* **Pinterest-Inspired Curation**: A clean, elegant, high-performance UI emphasizing rich media (walking-flair reels, dynamic image carousels, detailed alteration notes) that makes browsing feel like an editorial experience.

---

## 🎯 2. MVP Scope vs. Future Roadmap

We build with a highly disciplined startup mindset: launching a razor-sharp, secure MVP locally in Pune first, while engineering the core models to scale seamlessly to a multi-city national framework.

```
┌──────────────────────────────────────────┐     ┌──────────────────────────────────────────┐
│              MVP SCOPE (Pune)            │  ──> │         FUTURE ROADMAP (Scale)           │
├──────────────────────────────────────────┤     ├──────────────────────────────────────────┤
│ • Secure JWT Auth & Admin Guarding       │     │ • AI-Driven Outfit Recommendations       │
│ • Rich Outfit Catalog & Size Charts      │     │ • Intelligent Computer-Vision Sizing     │
│ • Real-time Availability Conflict Engine │     │ • Multi-City Shared Inventory Systems   │
│ • 15-Minute Booking Reservation Holds    │     │ • Automated Regional Courier API (Dunzo) │
│ • Unified Checkout (Rent + Refund Deposit)│    │ • Predictive Cleaning Analytics         │
│ • Manual Admin Inspection & Gate Refunds │     │ • Collaborative Bridal Group Wishlists   │
│ • Support Widgets & Customer Reviews     │     │ • Personal Stylist Video Consultations  │
└──────────────────────────────────────────┘     └──────────────────────────────────────────┘
```

---

## 🏗️ 3. Decoupled System Architecture & Request Lifecycle

ReWeara follows a **decoupled Client-Server pattern**. The repository is divided into two distinct primary scopes:

* **`/frontend`**: A fast React application powered by Vite, utilizing Vanilla CSS for maximum styling control, fluid micro-interactions, responsive design, and smooth animations.
* **`/backend`**: An Express.js REST API using Node.js, Mongoose/MongoDB Atlas, JWT authorization, Cloudinary for dynamic media assets, and Razorpay for payment orchestration.

### The Request Lifecycle Flow
Below is a deep look at how data and control propagate through the system during a rental checkout request:

```
[ React Client ]
      │ (1) User clicks checkout with (dates, outfitId)
      ▼
[ Axios API Layer ] ──> (Translates request payload, injects Bearer JWT Token)
      │
      ▼
[ Express Router ] ──> (Matches route e.g., POST `/api/bookings/create-order`)
      │
      ▼
[ JWT Auth Middleware ] ──> (Decodes JWT, checks database for 'customer' role profile)
      │
      ▼
[ Validation Layer ] ──> (Zod schema checks: validates date ISO strings and billing schema)
      │
      ▼
[ Booking Controller ] ──> (Executes transactional business checks)
      │
      ├─> [ Availability Service ] ──(2. DB Lock check on overlap)──> [ MongoDB Atlas ]
      │
      ├─> [ Razorpay Client Service ] ──(3. Generates Order ID)─────> [ Razorpay Gateway ]
      │
      ▼
[ Success Response ] ──(4. Server returns JSON Order details) ──> Client displays Razorpay UI
```

---

## 📂 4. Project Directory Tree

```
reweara/
├── backend/
│   ├── docs/                   # Postman specs and local Pune inventory spreadsheets
│   ├── logs/                   # Server error and warning log registers
│   ├── scripts/                # Database seeding routines (SuperAdmin, Demo Catalog)
│   │   ├── seedSuperAdmin.js
│   │   └── seedDemoOutfits.js
│   ├── tests/                  # automated API integration specs
│   ├── src/
│   │   ├── config/             # Configured connection clients (DB, Cloudinary, Razorpay)
│   │   │   ├── env.js
│   │   │   └── db.js
│   │   ├── controllers/        # Route business logic handlers
│   │   │   ├── authController.js
│   │   │   ├── outfitController.js
│   │   │   ├── bookingController.js
│   │   │   ├── reviewController.js
│   │   │   └── wishlistController.js
│   │   ├── middleware/         # Auth guards, error handlers, rate limiters, security
│   │   ├── models/             # Mongoose Schemas (User, Outfit, Booking, Review)
│   │   │   ├── User.js
│   │   │   ├── Outfit.js
│   │   │   ├── Booking.js
│   │   │   └── Review.js
│   │   ├── routes/             # REST route maps routing to controllers
│   │   ├── services/           # Decoupled business engine routines (booking holds)
│   │   ├── utils/              # Structured loggers, error classes & wrappers
│   │   ├── validators/         # Zod schemas payload validations
│   │   ├── app.js              # Express app bootstrapping
│   │   └── server.js           # Network socket port binder & graceful shutdowns
│   ├── .env.example
│   ├── .env
│   └── package.json
└── frontend/
    ├── public/                 # Static local assets
    ├── src/
    │   ├── assets/             # Images, logos
    │   ├── components/         # Reusable atomic UI elements (buttons, inputs, cards)
    │   ├── context/            # React Contexts (Authentication state, booking session)
    │   ├── hooks/              # Custom reusable React hooks
    │   ├── pages/              # Routed pages (Home, Collection, OutfitDetail, AdminDashboard)
    │   ├── services/           # Axios-based API service calls to the backend
    │   ├── styles/             # Global modular Vanilla CSS and variables
    │   ├── App.jsx             # Main routing setup
    │   └── main.jsx            # React root mount
    ├── package.json
    └── vite.config.js
```

---

## 🔌 5. Completed REST API Endpoint Matrix

All API endpoints enforce strict Zod schema parsing and return uniform envelopes: `{"success": true, "data": {}, "message": ""}`.

| Method | Endpoint | Description | Payload Constraints | Auth Protection |
| :--- | :--- | :--- | :--- | :--- |
| **POST** | `/api/v1/auth/signup` | Registers customer profile. | `{ name, email, password, phone }` | Public (Zod parsed, 10 reqs/15m) |
| **POST** | `/api/v1/auth/login` | Log in and issue JWT credentials. | `{ email, password }` | Public (Zod parsed, 10 reqs/15m) |
| **POST** | `/api/v1/auth/logout` | Clears HTTP refresh cookie. | None | Public |
| **POST** | `/api/v1/auth/refresh-token` | Renews expired access token using refresh cookie. | None | Public (True RTR Rotations) |
| **GET** | `/api/v1/auth/me/profile` | Fetches active authenticated user details. | None | Private (Access Bearer JWT) |
| **GET** | `/api/v1/outfits` | Fetches filtered catalog of garments. | None (Query filters supported) | Public |
| **GET** | `/api/v1/outfits/:id` | Fetches specific measurements, images, and holds. | None | Public |
| **POST** | `/api/v1/outfits` | Binds a new garment to the catalog. | Zod parsed creation schema | Private (SuperAdmin/Admin Only) |
| **PUT** | `/api/v1/outfits/:id` | Modifies catalog garment details. | Zod parsed modification schema | Private (SuperAdmin/Admin Only) |
| **DELETE** | `/api/v1/outfits/:id` | Marked catalog garment as inactive (Soft delete). | None | Private (SuperAdmin/Admin Only) |
| **POST** | `/api/v1/bookings/check-availability` | Queries date overlaps. | `{ outfitId, startDate, endDate }` | Public |
| **POST** | `/api/v1/bookings/create-order` | Instantiates a 15m lock and generates Razorpay Order ID. | Zod parsed checkout dates schema | Private (Customer Only) |
| **POST** | `/api/v1/bookings/verify-payment` | Verifies signatures, runs post-check, confirms booking. | `{ razorpayOrderId, razorpayPaymentId, signature }` | Private (Customer Only) |
| **POST** | `/api/v1/bookings/admin/:id/refund-deposit`| Executes manual deposit refunds and deductions. | `{ deductionAmount, deductionReason }` | Private (SuperAdmin Only) |
| **POST** | `/api/v1/reviews` | Submits a product review (Unique user/outfit check). | Zod parsed review schema | Private (Customer Only) |
| **GET** | `/api/v1/reviews/outfit/:id` | Fetches all approved reviews for a garment. | None | Public |
| **GET** | `/api/v1/wishlist` | Fetches customer favorites wishlist array. | None | Private (Customer Only) |
| **POST** | `/api/v1/wishlist/toggle` | Atomically adds/removes item in favorites. | `{ outfitId }` | Private (Customer Only) |

---

## 🚀 6. Running the Backend Foundation & Seeding Locally

### 1. Database Prerequisite
Ensure you have a local MongoDB instance running on `mongodb://127.0.0.1:27017/reweara` or provide a remote MongoDB Atlas connection string inside `/backend/.env`.

### 2. Seeding the Initial Super Admin
Before starting the server, register the initial master system owner (`super_admin`) securely by executing:
```bash
cd backend
npm run seed
```
*Look for the successful execution output:*
`[SUCCESS]: 🚀 SEEDING SUCCESS: SuperAdmin [Darshan] created successfully inside database!`

### 3. Startup Boot
1. Launch the Express server in development mode:
   ```bash
   npm run dev
   ```
2. Look for the startup signatures:
   ```
   [2026-05-26T22:32:51.123Z] [SUCCESS]: 🔌 MongoDB Connected Successfully: 127.0.0.1:27017
   [2026-05-26T22:32:51.125Z] [SUCCESS]: 🚀 ReWeara server initialized in [development] mode.
   [2026-05-26T22:32:51.126Z] [SUCCESS]:    Listening on interface: http://localhost:5000
   ```

---

## 🖼️ 7. User Interface Showroom (Placeholders)

Below are the designed sections for visual walkthroughs once deployed:

### The Pinterest-Inspired Landing Page
```
┌────────────────────────────────────────────────────────────────────────┐
│  REWEARA | The Outfit Baar ✨                         [Cart] [Account]  │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│                      RENT THE LUXURY DESIGNERS                         │
│                    FOR YOUR NEXT WEDDING EVENT                         │
│                                                                        │
│                       [ Browse Outfits ]                               │
│                                                                        │
│  [ Lehenga Card ]      [ Gown Card ]       [ Saree Card ]              │
│  Rent: ₹899/day        Rent: ₹1200/day     Rent: ₹699/day              │
│  Deposit Refundable    Deposit Refundable  Deposit Refundable          │
└────────────────────────────────────────────────────────────────────────┘
```
*(Dynamic images of user interfaces, interactive cart slides, and the unified admin panel analytics will be embedded here during production staging).*

---

## 🎯 8. Recruiter & System-Design Interview Talking Points

When presenting this project to interviewers or senior developers, highlight these structural mechanisms to prove engineering leadership:

### 1. Robust Schema-First Environment Validation
* **The Decision**: Navigating loose environment setups leads to operational bugs in CI/CD containers.
* **The Execution**: By using **Zod** schema assertions inside `src/config/env.js`, we validate data types (forcing `PORT` coercion to integer), assert high-entropy JWT secrets, and validate URL parameters during bootstrapping. The container crashes early and cleanly if any keys are missing, saving hours of environment debugging.

### 2. High-Assurance Input Sanitization
* **The Decision**: Relying purely on Mongoose validations or loose client-side input checking is a database injection hazard.
* **The Execution**: We route request payloads directly to Zod schemas prior to reaching controllers. This strips unknown properties, trims whitespace, forces lowercase email mappings, and guarantees type conformity early, protecting downstream code blocks.

### 3. Graceful Process Lifecycle Monitoring
* **The Decision**: Simple crashes can corrupt database operations and drop client connections.
* **The Execution**: Express is decoupled from database bootstrap configurations. The `server.js` orchestrator coordinates startup connections, and registers graceful termination handlers to trap system signals (`SIGTERM`/`SIGINT`). This guarantees that open MongoDB sockets are cleanly disposed of and pending connections finish processing before the container terminates.

### 4. Concurrency Protection & Overlap Engine
* **The Decision**: Navigating double bookings on physical outfits represents a severe operational failure.
* **The Execution**: ReWeara implements a multi-check validation sequence:
  - **Check 1**: A pre-checkout database scan checks for confirmed overlaps or active holds, locking the target outfit for **15 minutes** with a database TTL index hold.
  - **Check 2**: A post-payment transaction revalidation check asserts that no duplicate lock breached our dates while the client was processing payments on Razorpay.
  - **Sanitization Buffer**: A 2-day cleaning window is dynamically appended to all return dates inside search scan ranges, preventing overlaps.
  - **Index-Assisted Query Execution**: Overlap checks utilize a compound index `{ outfit: 1, status: 1, rentalStartDate: 1, rentalEndDate: 1 }`. This enables optimized B-tree index traversal and a performant indexed range scan, bypassing expensive collection scans to evaluate conflicts. This drastically reduces collection scanning cost and maintains sub-millisecond latency under high concurrency.
