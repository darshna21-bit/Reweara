# Tech Stack & Architectural Decisions — ReWeara ✨

This document details the architectural decisions, design philosophies, security protocols, scalability roadmaps, and trade-offs made when engineering the ReWeara luxury fashion rental platform.

---

## 1. Technology Selection Comparison Matrix

To ensure our choices are engineering-grounded rather than buzzword-driven, we mapped our core requirements against standard industry alternatives:

| Tier | Chosen Tech | Explored Alternatives | Selection Rationale & Trade-offs |
| :--- | :--- | :--- | :--- |
| **Frontend** | **React.js (Vite)** | Next.js / Angular | **React on Vite** offers faster build speeds and lighter bundles for an MVP. Unlike Next.js (which requires server-side execution rendering), Vite builds static client files that can be distributed globally at virtually zero cost on Vercel's Edge CDN. This is optimal for a Pune-first local launch. |
| **Backend** | **Node.js (Express)** | FastAPI (Python) / Spring Boot (Java) | **Node.js** excels at high-concurrency, I/O-bound operations (such as payment callbacks and database updates). It allows us to share TypeScript/JavaScript validation models directly between the frontend and backend, maximizing development velocity. Spring Boot is too heavy for an early-stage MVP, while Python's FastAPI lacks the extensive ecosystem Node has for payment gateway integrations. |
| **Database** | **MongoDB (Atlas)** | PostgreSQL / MySQL | **MongoDB** stores outfits as flexible, polymorphic documents containing nested media objects, size details, and unavailable date arrays. This maps perfectly to our catalog schema without requiring complex, multi-table joins. We enforce data consistency at the application level using Mongoose schemas. |
| **Media Host** | **Cloudinary CDN** | Local Storage / AWS S3 | **Cloudinary** automates responsive image scaling, format conversion (e.g., auto-WebP conversion), and try-on video reel compression on the fly. Doing this on our own servers would significantly drag down our backend CPU performance, while AWS S3 does not offer native real-time image optimization. |
| **Payments** | **Razorpay** | Stripe / PayPal | **Razorpay** is the market leader for digital payments in India, supporting native UPI, popular credit/debit cards, and instant bank transfers. It provides a robust, developer-friendly dashboard for deposit hold-backs and refund APIs, making it ideal for our Pune-first launch. |
| **Hosting** | **Railway ──► AWS** | Render / Heroku | **Railway** is utilized initially for rapid deployment, automated CI/CD from Git, and low configuration overhead. Once the product scales and requires dedicated CPU scaling, we will transition to an **AWS EC2 / ECS** setup using Docker containers to scale costs and performance. |

---

## 2. Security Architecture Specification

ReWeara enforces a multi-layered security model to protect financial transactions and user data. Security controls are implemented at all points of entry:

```
[ Incoming API Request ]
           │
           ▼
┌──────────────────────┐  ──► Drops malicious query payloads
│  Helmet.js Headers   │
└──────────────────────┘
           │
           ▼
┌──────────────────────┐  ──► Limits brute-force login attempts
│  Rate Limiting WAF   │
└──────────────────────┘
           │
           ▼
┌──────────────────────┐  ──► Blocks cross-origin domain abuse
│ CORS Policies Gate   │
└──────────────────────┘
           │
           ▼
┌──────────────────────┐  ──► Decodes JWT token; binds req.user
│ JWT Authentication   │
└──────────────────────┘
           │
           ▼
┌──────────────────────┐  ──► Enforces role validation ('super_admin')
│  RBAC Security Guard │
└──────────────────────┘
           │
           ▼
┌──────────────────────┐  ──► Rejects malformed payload sizes/formats
│ Zod Validation Layer │
└──────────────────────┘
           │
           ▼
    [ Controller Execution ]
```

### Key Security Implementations

* **JWT (JSON Web Token) Auth**: State is completely stateless. Tokens are signed via a high-entropy `JWT_SECRET` key, verifying client authentication on every API request.
* **Role-Based Access Control (RBAC)**: Secure routes are protected by a middleware filter that validates authorization levels:
  - `customer`: Browses outfits, saves wishlists, pays rentals.
  - `sister_admin` / `didi_admin`: Updates items, manages order shipping status.
  - `super_admin`: Triggers financial deposit refund APIs and accesses global revenue dashboards.
* **Bcrypt Password Hashing**: Direct passwords are never stored. Passwords undergo salt hashing using a work factor of 10 (`bcryptjs`).
* **Helmet & CORS Guarding**: Blocks malicious cross-origin requests and shields metadata in HTTP headers to prevent server finger-printing.
* **Express Rate Limiting**: Prevents API exhaustion by limiting connections on sensitive endpoints (e.g., maximum 10 login attempts per 15 minutes per IP address).
* **Razorpay Cryptographic Webhooks**: Payment verification endpoints generate a SHA-256 HMAC signature using the private `RAZORPAY_KEY_SECRET`. This matches against the incoming Razorpay header signature to prevent spoofing.

---

## 3. Scalability Roadmap

As ReWeara scales from 30 boutique outfits in Pune to thousands of items nationwide, our system architecture is designed to scale with it:

### Phase 1: MVP Architecture (Pune Launch)
* **Setup**: Single Node.js instance on Railway connected to a free-tier MongoDB Atlas cluster.
* **Logistics**: Direct manual pickups or local Pune delivery drivers.
* **Data Layer**: Straightforward indexed queries on MongoDB.

### Phase 2: Growth Architecture (Regional Expansion)
* **Cache Acceleration**: Integrate **Redis** to cache catalog queries and outfit details. This reduces MongoDB database load by up to 80% for read-heavy operations.
* **Asynchronous Jobs**: Implement **BullMQ** (powered by Redis) to manage non-blocking, background tasks such as generating late return alerts, sending email invoices, and triggering reminder SMS.
* **Containerization**: Package our application using Docker and deploy on an **AWS ECS / Fargate** cluster behind an Application Load Balancer (ALB).

### Phase 3: Enterprise Architecture (Multi-City Scaling)
* **Distributed Database**: Enable MongoDB horizontal sharding, partitioning outfit documents based on geographical region (e.g., `city: 'Pune'`, `city: 'Mumbai'`).
* **Event-Driven Workflows**: Move to a microservices architecture using **Apache Kafka** or **AWS SQS** to coordinate logistics, quality inspections, financial auditing, and user notification events.

---

## 4. Deployment Architecture & Operations

```
                   [ Customer Internet ]
                             │
                             ▼
               ┌──────────────────────────┐
               │    Vercel Edge CDN       │
               │   (Frontend Static Host) │
               └──────────────────────────┘
                             │
                             │ (Secure CORS REST Calls)
                             ▼
               ┌──────────────────────────┐
               │   Railway / AWS EC2      │
               │  (Express App Instance)  │
               └──────────────────────────┘
                ┌────────────┴────────────┐
                ▼                         ▼
    ┌──────────────────────┐  ┌──────────────────────┐
    │  MongoDB Atlas DB    │  │   Cloudinary CDN     │
    │  (State Database)    │  │   (Media Repository) │
    └──────────────────────┘  └──────────────────────┘
```

### Operational Plan

* **Process Management (`PM2`)**: The production Node instance runs under a PM2 process manager configured for cluster mode to leverage multiple CPU cores:
  ```bash
  pm2 start src/server.js -i max --env production
  ```
  This guarantees automatic zero-downtime reboots if an unexpected thread exception occurs.
* **Health Check Endpoint**: We expose `/api/health` returning CPU usage, database connection status, and transaction latency to allow external monitors to audit server health.
* **Secret Management**: High-entropy keys (JWT keys, Cloudinary tokens, Razorpay secrets) are isolated from code and loaded directly into target environments via secured hosting dashboards.

---

## 5. Engineering Trade-offs for the MVP Stage

Engineering is the discipline of managing tradeoffs. To optimize development velocity, we made several intentional architectural decisions for our MVP release:

### 1. Unified Monolithic API over Microservices
* **Decision**: We use a modular monolithic backend codebase rather than split services.
* **Trade-off**: While microservices isolate scale, they introduce high infrastructure complexity and developer overhead (e.g., managing inter-service communication and distributed transactions). A modular monolith allows us to build features quickly, while strict directory structure makes it easy to refactor into microservices if needed later.

### 2. MERN Stack over Enterprise Java/Spring
* **Decision**: We chose Javascript/Node.js over Spring Boot or ASP.NET.
* **Trade-off**: Spring Boot provides more robust enterprise type-safety and threading models. However, the MERN stack allows sharing validation rules and models between client and server, significantly speeding up development for our small startup team.

### 3. Application-Level Data Integrity over Strict SQL Foreign Keys
* **Decision**: We use MongoDB Atlas with validation checks managed via Mongoose models, rather than a traditional relational database (e.g., PostgreSQL).
* **Trade-off**: PostgreSQL provides rigid relational schemas and foreign key constraints at the engine level. However, MongoDB's flexible document model excels at storing polymorphic garment attributes and dynamic availability structures in a single collection. We enforce integrity checks via Mongoose schema validators on the server.

### 4. Client-Led Payment Verification (Webhook Reconciliation Gap)
* **Decision**: We use client-initiated `/verify-payment` HTTP requests to capture and confirm bookings, rather than fully implementing server-side webhooks.
* **Trade-off & Risk**: If a client completes payment in the popup but experiences a network drop or closes the tab before the `/verify-payment` call completes, the backend has no record of the payment and the booking hold will expire via TTL after 15 minutes. This creates a real-money risk of un-reconciled transactions. For our live launch (scheduled July 27), implementing a Razorpay Webhook handler to listen to asynchronous server-to-server callbacks (`payment.captured`) is a critical priority.

---

## 6. Phase 2 Architectural Decisions Log

During the implementation of the backend foundation, several key technical choices were made to optimize developer velocity, bundle size, security, and automated testing capabilities.

### 1. Separation of `app.js` (Express configuration) and `server.js` (Server network socket)
* **The Decision**: We isolated Express initialization from HTTP server listener sockets.
* **Recruiter/Interview Rationale**: This is a production-grade testing pattern. It allows in-memory integration testing suites (like Supertest + Jest) to load `app.js` and execute mock requests without binding to real, physical TCP ports. This prevents port collision failures in remote continuous integration (CI/CD) runners while keeping our test executions fast.

### 2. Refactoring to Standard `cookie-parser` Middleware
* **The Decision**: We replaced our custom manual string splitting parser with standard Express `cookie-parser` middleware.
* **Technical Rationale**: Ad-hoc string parsing of raw cookie headers is vulnerable to edge-case anomalies (e.g. malformed spaces, semicolon splits inside token strings, character encoding mismatches). Using standard `cookie-parser` provides a battle-tested parser, supports cookie signing (cryptographic verification of integrity using HMAC secrets), maps cookies directly to the clean `req.cookies` object, and integrates seamlessly into the Express middleware lifecycle.

### 3. Zod Schema Validation Selection over Fragile Manual/Regex Checks
* **The Decision**: We chose **Zod** schema validations to secure our API gateways (inputs and configurations).
* **Recruiter/Interview Rationale**: Zod follows the industry-standard **"Parse, Don't Validate"** pattern. Unlike traditional regex-based check modules or manual assertions (which are complex to maintain and vulnerable to prototype pollution attacks), Zod strictly parses incoming payloads. It automatically strips unmapped properties, coercively sanitizes values (trimming whitespaces, forcing lowercase email registers), and provides type-safety early in the request execution cycle, protecting Mongoose models from corrupted inputs.

### 4. Hardened JWT Secret Entropy (32-Character Minimum Constraint)
* **The Decision**: We enforce a strict **minimum of 32 characters** for `JWT_SECRET` and `REFRESH_SECRET` inside our Zod environment validator schema.
* **Security Rationale**: Signing JWTs using weak, low-entropy secrets makes signatures vulnerable to offline high-speed dictionary brute-force attacks. Modern GPU-based clusters can crack 128-bit keys in minutes. Requiring a minimum of 32 characters (256-bit entropy threshold) makes HS256 JWT signatures mathematically immune to offline dictionary key extraction attacks, safeguarding session authenticity.

### 5. CORS Wildcard Origin with Credentials Vulnerability
* **The Decision**: We explicitly locked our CORS configuration origin to `process.env.CLIENT_URL` and restricted allowed methods/headers.
* **Security Rationale**: Enabling `credentials: true` (necessary for secure HttpOnly cookie transits) while utilizing a wildcard origin (`origin: '*'`) represents an extreme security vulnerability. In fact, W3C specifications and modern browsers **expressly forbid wildcard origins when credentials are enabled** and will throw a structural console security error, blocking the API altogether. We prevent domain leaks by locking access strictly to our frontend domain URL.

### 6. Refresh Token Rotation (RTR) Cookie Invalidation
* **The Decision**: We implemented a strict token-rotation lifecycle inside the `/refresh-token` controller handler.
* **Technical Rationale**: Standard refresh token systems leave tokens valid for their entire lifespan (e.g. 7 days). If an attacker steals a token, they can silently renew sessions without the owner's knowledge. With **Refresh Token Rotation (RTR)**, the moment a refresh token is used, the server immediately generates a **new access token** AND a **new refresh token**, overwriting the client's cookie with the updated token. If validation fails or the token is expired, the server clears the cookie (`res.clearCookie`) instantly, securely resetting client states.

### 7. Winston-alternative Custom Structured Logger & Observability
* **The Decision**: We handcrafted a lightweight structured logger wrapper around standard output.
* **Observability benefits**: Setting up a production cluster without logging structure makes runtime debugging impossible. Our custom logging manager formats output based on `NODE_ENV`: emitting human-readable, colorized terminal logs in local development, and outputting flat JSON logs (including stack traces for operational exceptions) in production. This guarantees immediate out-of-the-box compatibility with cloud log forwarders (ElasticSearch, AWS CloudWatch, Datadog) while maintaining zero dependency footprint bloat.

---

## 7. Phase 3 Architectural & Business Logic Decisions Log

During the implementation of the core business domain layer and model architecture, several critical refinements were introduced to harden transaction reliability, prevent database bugs, and secure circular inventory workflows.

### 1. Correct Algorithmic Complexity of Overlap Scans
* **The Terminology**: We replace mathematically rigid constant-time $O(1)$ database assertions with realistic engineering descriptions.
* **Technical Rationale**: Under the hood, MongoDB index searches utilize B-Trees. Checking date ranges is not mathematically constant-time; it requires **optimized B-tree index traversal** to locate range boundaries, followed by **performant indexed range scans** of the colliding records. 
* **Recruiter/Interview Talking Point**: We explicitly force index execution by calling `.hint('booking_overlap_scan_index')` on our availability engine. This results in **index-assisted query execution** and **reduced collection scanning cost**, converting expensive full collection scans into highly performant, sub-millisecond lookups that easily withstand heavy operational booking requests.

### 2. TTL Safety Audit & Concurrency Hold Lifecycles
* **The Critical Risk**: A standard MongoDB TTL index automatically deletes documents once the indexed date field passes. If confirmed or cancelled bookings retain the `reservationExpiresAt` field, MongoDB's background thread will permanently delete these active or historical records, destroying financial ledgers and critical audit histories.
* **The Solution**: 
  - For successful checkouts: Upon signature validation, `booking.reservationExpiresAt` is explicitly unset (`undefined` in Mongoose), removing it from the document and immunizing the booking from TTL reaping.
  - For parallel collision failures: If the post-payment check catches a race-condition date conflict, the booking is transitioned to `cancelled`, and `booking.reservationExpiresAt` is immediately unset as well. This guarantees that cancelled audit trails are preserved indefinitely to facilitate automated customer refunds and operational auditing.

### 3. Outfit Slug Hardening & Duplicate Collision Prevention
* **The Decision**: Outfit URLs must be clean, SEO-friendly, and validated (e.g. `/outfits/royal-maroon-bridal-lehenga`).
* **The Implementation**: The `slug` field is marked as unique, indexed, and validated against Zod URL-path schemas. In the Mongoose schema, we handcraft a robust, async-safe `pre('validate')` hook:
  - If a slug is not manually set, the hook automatically sanitizes and normalizes the title.
  - The hook queries the database using `this.constructor.findOne`. If a slug collision is detected (e.g., two outfits share the exact same title), it automatically appends an incremental counter (e.g., `-1`, `-2`) to guarantee absolute uniqueness without throwing database duplicate key crashes.

### 4. Review Moderation Hardening & Abuse Prevention
* **The Decision**: Reviews must undergo administrative moderation to prevent spam, rating manipulation, or offensive submissions from appearing publicly.
* **The Implementation**: We implement a standardized `moderationStatus` enum (`pending`, `approved`, `rejected`) that defaults strictly to `'pending'`.
* **Security & Recruiter Rationale**: 
  - Redundant fields like `isApproved` (Boolean) are removed to preserve `moderationStatus` as the single source of truth, avoiding dual-state synchronization bugs.
  - Outfit catalog pages query reviews strictly with the filter `{ moderationStatus: 'approved' }`, guaranteeing unmoderated or rejected feedback is never leaked.
  - We retain anti-abuse protection by maintaining a compound unique index `{ user: 1, outfit: 1 }` to block duplicate rating submissions.

### 5. Streamlined Booking Lifecycle (MVP Review)
* **The Decision**: We reduce the booking state machine complexity from 11 states down to 6 core lifecycle stages (`pending_payment`, `confirmed`, `active`, `returned`, `completed`, `cancelled`).
* **Operational Rationale**: Consolidating logistics events (like damages or late returns) into independent boolean schema fields (`logistics.isLate`, `logistics.isDamaged`) keeps the transactional engine simple and predictable. It minimizes state transition bugs for our Pune-first launch while fully preserving administrative auditing capabilities and future scalability.

### 6. Escaping Transform Stacking Contexts in Fixed Modals
* **The Decision**: We render fixed modal overlays as direct siblings to the root-level layout, outside of animated wrappers.
* **Technical Rationale**: W3C standards specify that any ancestor utilizing a CSS transform (including `translateY(0)` transitions) establishes a local containing block for descendants. This breaks absolute/fixed element rendering relative to the viewport. Rendering modals outside of transformed wrappers ensures cross-browser positioning stability.

### 7. Decoupled Incremental Audit Notes
* **The Decision**: We separated administrative log history rendering from new input values.
* **Technical Rationale**: Standardizing backend logs to append strings (`+=`) requires frontends to send only new increments. Pre-filling input boxes with previous history leads to exponential duplication. We clear the input state by default and display history in a parsed, read-only window.

### 8. Read-Only Archive Access for Terminal Records
* **The Decision**: We provide a read-only variant of the action modal for terminal-state bookings.
* **Technical Rationale**: Once a booking transitions to a terminal state (cancelled/refunded), no further status updates are possible. However, the accumulated audit trail remains highly valuable for customer support and dispute review. Creating a read-only modal variant allows full history access while preventing any modifications.





