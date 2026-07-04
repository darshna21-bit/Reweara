# ReWeara — Recruiter-Grade Technical & HR Interview Guide 🎓

This document serves as a comprehensive preparation manual for technical interviews, design reviews, and HR behavioral screenings. It covers the architectural decisions, database index optimizations, security safeguards, and logical workflows implemented in the **ReWeara** premium fashion rental platform.

---

## ── TABLE OF CONTENTS ──
1. **Core Product & Database Architecture** (MERN, Mongoose, B-Trees, TTL Holds)
2. **Security & Financial Engineering** (Razorpay HMAC, JWT RTR, Admin Lockout, RBAC)
3. **Logistics & Late Fee/Refund Engines** (Date calculations, formulas, state updates)
4. **Frontend Architecture & Stacking Context Bug** (Vite, React Fragments, Stacking context resolution)
5. **HR & Behavioral Q&As** (Handling concurrency, tech debt, conflict resolution)

---

## 1. CORE PRODUCT & DATABASE ARCHITECTURE

### Q1: What is ReWeara, and why did you choose the MERN stack (Vite + Express + Mongo) for it?
**Answer:**
ReWeara is a premium circular fashion rental platform designed to let customers rent designer Indian ethnic wear. 
* **Frontend (Vite + React):** Selected to achieve ultra-fast Hot Module Replacement (HMR) during development, static asset bundling, and sub-second page loads. We host the built assets on a global edge CDN for near-zero latency.
* **Backend (Node.js + Express):** Node's asynchronous, non-blocking I/O model is highly performant for concurrent operations like processing payment webhooks and executing database queries. It also allows us to share validation schemas (Zod) between frontend and backend.
* **Database (MongoDB):** Rental outfits have complex, polymorphic attributes (different designer categories, sizes, colors, media arrays, and dynamic availability date arrays). Storing them as single JSON-like documents avoids heavy, multi-table SQL joins and enables fast, flexible query patterns.

### Q2: How does the system validate that an outfit is available for a selected rental window?
**Answer:**
We check for availability overlap at the database layer using Mongoose queries optimized by a **compound index**.
1. **The Query Formula:** A collision occurs if a booking exists for the same outfit where the booking's `startDate` occurs before/on the requested `endDate`, AND the booking's `endDate` occurs after/on the requested `startDate`, excluding cancelled orders:
   ```javascript
   let query = {
     outfit: outfitId,
     bookingStatus: { $ne: 'cancelled' },
     startDate: { $lte: requestedEnd },
     endDate: { $gte: requestedStart }
   };
   ```
2. **Index Optimization:** To prevent expensive collection scans, we created a compound index called `booking_overlap_scan_index`:
   ```javascript
   bookingSchema.index({ outfit: 1, bookingStatus: 1, startDate: 1, endDate: 1 });
   ```
3. **Traversing index:** We force the query runner to use this index by appending `.hint('booking_overlap_scan_index')`. This converts a slow $O(N)$ table scan into a fast $O(\log N)$ B-Tree index traversal followed by a range scan on the index leaf nodes, keeping response times sub-millisecond even under heavy concurrent load.

### Q3: Explain how the 15-minute checkout hold is implemented. How does it prevent memory/database leaks?
**Answer:**
When a customer begins the checkout process, the system instantiates a temporary database lock document to hold the outfit for 15 minutes while they complete their payment on the gateway.
1. **TTL Index (Time-To-Live):** We set a MongoDB TTL index on the `reservationExpiresAt` field:
   ```javascript
   bookingSchema.index({ reservationExpiresAt: 1 }, { expireAfterSeconds: 0 });
   ```
2. **Automatic Expiry:** If the customer closes the browser and walks away, MongoDB's background thread automatically reaps (deletes) the document when the current time passes the expiration date, freeing up the outfit dates.
3. **Locking dates permanently:** If the payment succeeds, we verify the signature and explicitly set `booking.reservationExpiresAt = undefined`. This drops the date field from the document, turning the temporary lock into a permanent confirmed booking that is safe from TTL deletion.

---

## 2. SECURITY & FINANCIAL ENGINEERING

### Q4: Why did we explicitly disable the admin's ability to manually change a booking's status from "pending" to "confirmed" via the dashboard?
**Answer:**
Allowing admins to manually transition a booking from `pending` to `confirmed` is a severe **financial fraud vulnerability** in a production application. 
* **The Vulnerability:** The transition to `confirmed` automatically updates `paymentStatus` to `'paid'`. If an admin can trigger this through the dashboard, they can mark any order as paid without real money changing hands, bypassing the payment gateway entirely.
* **The Fix:** We updated the state machine transitions in the backend service (`bookingService.js`) and the frontend component (`AdminBookings.jsx`):
  ```javascript
  pending: ['cancelled'] // confirmed is removed
  ```
  The **only** pathway for a booking to enter the `confirmed` status is by executing the cryptographic signature callback verification (`verifyPaymentSignature`), which checks real payments against the Razorpay gateway.

### Q5: How does the system cryptographically verify payments to prevent transaction spoofing?
**Answer:**
We utilize **HMAC (Hash-based Message Authentication Code) SHA-256** signature verification:
1. When Razorpay captures a payment, it returns three parameters: `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature`.
2. Our backend retrieves the private `RAZORPAY_KEY_SECRET` (stored as an environment variable, never checked into version control).
3. We generate our own signature in-memory:
   ```javascript
   const generatedSignature = crypto
     .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
     .update(`${razorpay_order_id}|${razorpay_payment_id}`)
     .digest('hex');
   ```
4. **Timing Attack Protection:** We compare the received signature and our generated signature using a constant-time buffer comparison check to prevent timing side-channel attacks:
   ```javascript
   crypto.timingSafeEqual(Buffer.from(generatedSignature), Buffer.from(receivedSignature));
   ```
   If they match, we confirm the payment is genuine.

### Q6: What is Refresh Token Rotation (RTR), and how is it implemented?
**Answer:**
Standard JWT architectures store refresh tokens in client storage with long lifespans (e.g., 7 days). If a hacker steals the refresh token, they can indefinitely renew sessions.
* **Our RTR Implementation:** In the `/refresh-token` endpoint, when a client presents a valid refresh token, the server immediately invalidates it, generates a **brand-new access token**, and a **brand-new refresh token**.
* **One-time Use:** The new refresh token is sent back in a secure cookie, overwriting the old one. If an expired or invalid refresh token is presented, the server immediately clears the cookie (`res.clearCookie('refreshToken')`), logging the user out.
* **HttpOnly Cookie Guarding:** All refresh tokens are stored in the browser as `HttpOnly`, `Secure`, and `SameSite=Strict` cookies. This makes them inaccessible to client-side scripts, protecting the tokens from XSS (Cross-Site Scripting) theft.

### Q7: We encountered a bug where super_admin sessions were repeatedly invalidated and logged out upon page refresh, while normal customer accounts worked fine. What was the root cause of this, and how did you resolve it?
**Answer:**
The bug was caused by a combination of a frontend request race condition and a non-atomic database write on the backend during Refresh Token Rotation (RTR):
1. **The Concurrency Race Condition:** On page refresh in administrative views (like `/admin/refunds`), multiple protected API calls mount and execute concurrently. Since the in-memory access token is cleared on page reload, these calls fail with `401 Unauthorized` and trigger the Axios response interceptor's token refresh mechanism. Meanwhile, `AuthContext`'s initial mounting effect also fires a refresh call. This leads to duplicate concurrent requests to `/auth/refresh-token` sending the same refresh token cookie. Normal customer pages don't fetch private data on mount, so they didn't trigger this parallel overlap.
2. **The Non-Atomic Write (Lost Update):** Originally, the backend updated `activeRefreshTokenIds` using in-memory JS array manipulation followed by a full `user.save()`. When concurrent refreshes hit the server, both read the user document at the same time, computed their updates, and whichever saved last overwrote the other's entry. The tab holding the overwritten token would fail its next verification, trigger the RTR security breach block (suspected token compromise), clear all active sessions, and log the user out.
3. **The Resolution:**
   * **Frontend Promise Sharing:** We created a unified `performRefreshToken()` helper in the Axios client. Both the initial mount load and the `401` response interceptors call this helper, which registers a single shared `refreshPromise`, eliminating duplicate requests entirely.
   * **Backend Atomic Updates:** We replaced `user.save()` with a two-step atomic update sequence: first, we atomically `$pull` the old token using a query match on `tokenId` (guaranteeing that only one request can rotate it), and second, we `$push` the rotated data using the `$slice` operator to cap the arrays. If a concurrent call fails the pull query, it falls back gracefully to verify against the recently rotated token grace list, preventing session invalidations.

---

## 3. LOGISTICS & DEPOSIT REFUND ENGINES

### Q7: Walk through the algorithmic steps of the Deposit Refund Engine. How are late fees and damage deductions calculated?
**Answer:**
When an admin processes a refund for a returned outfit (via `PATCH /bookings/admin/:id/refund-deposit`), the engine applies standard business rules:
1. **Pre-condition Check:** Verifies that the booking's `depositRefundDetails.status` is strictly `'pending_review'` (meaning the item is returned and checked-in, but the refund is not yet processed).
2. **Late Days Calculation:** Computes the difference between `actualReturnDate` and `endDate`:
   ```javascript
   const diffTime = actualReturn.getTime() - end.getTime();
   const lateDays = Math.max(0, Math.ceil(diffTime / (1000 * 3600 * 24)));
   ```
3. **Daily Rental Rate Calculation:** Determined dynamically based on the original booking fee divided by duration:
   ```javascript
   const dailyRentRate = booking.totalRentAmount / bookedDays;
   ```
4. **Late Fee Charge:** ReWeara charges **100% of the daily rent rate** for every late return day:
   ```javascript
   const lateFeeAmount = dailyRentRate * lateDays;
   ```
5. **Final Refund Amount:** Applied using the formula:
   $$\text{Final Refund} = \max(0, \text{Security Deposit} - \text{Late Fee} - \text{Damage Deduction})$$
6. **Audit and State Sync:** The system updates `paymentStatus` to `'refunded'`, marks `depositRefundDetails.status` as `'processed'`, writes a logger trace, and logs the acting admin's ID for accountability.

---

## 4. FRONTEND ARCHITECTURE & STACKING CONTEXTS

### Q8: What was the UI/UX stacking context bug we encountered with the modal overlay, and how did you resolve it?
**Answer:**
* **The Symptom:** On shorter screen heights, the "Update Status" modal dialog was cut off at the bottom, hiding action buttons and preventing form submission.
* **The Stacking Context Root Cause:** The parent container wrapper of the page used an `animate-fade-in` animation class. In CSS, the final state of the keyframes had:
  ```css
  to { transform: translateY(0); }
  ```
  Even though `translateY(0)` is a neutral shift, **any non-none CSS transform property establishes a new local containing block** for all descendant elements, including those styled with `position: fixed`. Consequently, the modal overlay positioned itself relative to the scrolling wrapper container rather than the browser viewport, causing clipping and scroll offsets.
* **The Resolution:** 
  1. We wrapped the `AdminBookings` return statement in a React Fragment (`<> ... </>`).
  2. We closed the main `.animate-fade-in` container wrapper div *before* rendering the modal.
  3. We rendered the modal overlay as a **true root-level sibling** outside of the animated wrapper.
  4. We added `overflow-y-auto` to the fixed overlay container to handle any potential screen overflows gracefully.

---

## 5. HR & BEHAVIORAL QUESTIONS

### Q9: Tell me about a time you identified a security vulnerability or critical logic bug in a project and how you resolved it.
**Answer:**
"During the implementation of the Admin Bookings panel, I noticed that the dashboard allowed administrators to manually transition a booking from 'pending' to 'confirmed'. Doing so automatically updated the payment status of the booking to 'paid' in the database. 

I recognized that this was a serious risk—in production, an administrator could flag arbitrary bookings as paid without any actual payment transaction taking place. I brought this up with the team, proposing that we block manual transitions to 'confirmed' entirely. We restricted the admin's transition options for pending bookings solely to 'cancelled'. Confirmations are now locked down, and can only be triggered cryptographically by the Razorpay webhook verify endpoint. This enforces strict separation of concerns and protects financial transactions."

### Q10: How do you handle technical debt or design system violations when working on a codebase?
**Answer:**
"I believe in keeping the codebase clean and strictly aligned with the design system. For example, while building status badges for payment and delivery lifecycles, I noticed that generic Tailwind colors (like `bg-red-50` or `bg-zinc-100`) were being introduced. 

Rather than letting that technical debt slide, I consulted our design tokens configuration. I replaced all foreign classes with our defined theme colors (`brand-gold`, `brand-blush`, `brand-sage`, `brand-dust`, and our specific `#8D4237` Terracotta code). This keeps the code clean, makes global branding edits simple, and ensures the UI feels premium and consistent to the end-user."

### Q11: How do you handle a situation where a database update or API response fails during an admin operation?
**Answer:**
"When designing admin controls, I prioritize **Optimistic Updates** alongside **Hardened Error Masking**. 
* On the UI side, we update the local component state in-place to keep the interface fast and responsive. 
* On the API side, if a request encounters an error, the code catches the exception and masks it appropriately: 4xx validation or business logic errors (like illegal state transitions) are displayed to the user with the exact backend message so they know how to fix it, while unexpected 5xx database failures are masked behind a generic message to keep security high. The UI then safely rolls back any optimistic assumptions."

### Q12: What was the biggest challenge you faced during this project, and how did you overcome it?
**Answer:**
"I faced two major engineering challenges that required deep architectural and layout-level troubleshooting:

1. **Backend Concurrency & Race Conditions (Double Bookings):**
   * *The Challenge:* In a luxury rental system, multiple customers might attempt to checkout the exact same garment for overlapping dates at the same second. Checking date availability only at the beginning of the checkout process leaves a race condition vulnerability during the payment transaction window.
   * *The Solution:* We built a **two-stage verification protocol**. First, we wrote a temporary checkout lock document using a 15-minute MongoDB TTL index. Second, and most critically, during payment signature capture, we ran a post-checkout overlap double-check query encapsulated inside a **MongoDB Transaction Session**. If a concurrency collision occurred, we immediately rolled back the transaction, flagged the booking as cancelled, and queued an automated full refund via the Razorpay API.

2. **CSS Stacking Contexts & Containment Blocks (Frontend Layout):**
   * *The Challenge:* On shorter screen heights, our administrative status transition overlay dialog was clipped at the bottom of the screen, making form buttons completely unreachable. This was caused by the parent page wrapper using an `.animate-fade-in` CSS transform class. By W3C spec, any non-none transform establishes a new local containing block for descendants, forcing `position: fixed` elements to align relative to theScrolling wrapper div instead of the browser viewport.
   * *The Solution:* We refactored the component structure. We wrapped the main return in a React Fragment (`<> ... </>`), closed the `.animate-fade-in` wrapper container *before* rendering the overlay, and appended the modal as a **true root-level sibling**. This allowed the fixed overlay to escape the transform containment block and align relative to the viewport, which solved the clipping and scroll issues completely."

---

## 6. RATE LIMITING & SECURITY TRADE-OFFS

### Q13: Walk through the rate-limiting setup. What is a known limitation of the current IP-based brute-force protection, and how would you resolve it in production?
**Answer:**
* **Current Setup:** We mount an `authLimiter` middleware (using `express-rate-limit`) on both the `/api/v1/auth/signup` and `/api/v1/auth/login` endpoints. It restricts request volumes to a strict maximum of **10 attempts per 15-minute window** before returning a `429 Too Many Requests` operational error.
* **The Limitation:** Because the limiter has no custom `keyGenerator` specified, it keys requests **strictly by the client IP address** (`req.ip`). This means that while brute-force attempts from a single IP are blocked after 10 tries, an attacker using a proxy list, VPN, or distributed botnet can rotate IP addresses and make unlimited authentication attempts against a single target account.
* **The Production Fix:** To secure this at high scale, we would define a custom `keyGenerator` combining the client IP and the login email identifier:
  ```javascript
  keyGenerator: (req) => {
    const emailKey = req.body.email ? req.body.email.toLowerCase().trim() : 'anonymous';
    return `${req.ip}_${emailKey}`;
  }
  ```
  This keys the rate limits per IP-and-account combination, preventing distributed brute force vectors against target profiles.

### Q14: During local testing of the Production CSP in Incognito mode over HTTP, we noticed a silent token refresh 401 failure. Is this a production issue?
**Answer:**
* **The Root Cause:** This is a local-development testing quirk that occurs specifically due to the combination of **HTTP (non-secure context)**, **port differences** (Vite on `:5173` making requests to Express on `:5000`), and **browser Incognito restrictions**. Because the ports differ, the requests are cross-origin. Even though they share the same registrable domain (`localhost`), modern browsers in Incognito mode apply strict cookie blocking rules that may refuse to write or send cross-origin `HttpOnly` credentials (including `sameSite: 'strict'` cookies) over non-HTTPS connections.
* **The Production Exemption:** In a real production deployment, this issue is fully resolved because:
  1. The connection is served entirely over **HTTPS** (establishing a secure context).
  2. The application is served from the same domain (e.g., frontend and API unified under a single domain or sharing standard wildcards/subdomains).
* **The Verification Plan:** We have marked this as a known testing limitation and flagged it for a **real manual verification pass immediately post-deployment** on the actual HTTPS-secured production domain to verify cookie storage and silent rotation behavior.
