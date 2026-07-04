# Project Flow & Rental Logic Blueprint — ReWeara ✨

This document details the core workflows, mathematical validation formulas, cryptographic integrations, and state machine changes that drive the ReWeara fashion-rental platform. Understanding these flows is crucial for explaining the technical integrity of the platform during architectural reviews and system-design interviews.

---

## 1. Streamlined MVP Booking & Rental State Machine

The rental lifecycle of a physical fashion asset is transactional, circular, and time-bounded. To optimize development velocity and ensure high reliability for the local Pune launch, ReWeara implements a simplified but highly scalable **6-state machine**. Highly transient operational stages (such as late returns or damaged material tracking) are decoupled from status enums into audited logistics boolean flags.

### Simplified Status Enums Flow

```
                              [ pending_payment ]
                                       │
                ┌──────────────────────┼──────────────────────┐
                │ (Payment Fails or    │ (Payment Confirmed   │ (15-Minute Hold
                │  User Abandons)      │  HMAC verified)      │  Expires)
                ▼                      ▼                      ▼
          [ cancelled ]          [ confirmed ]          [ cancelled ]
                                       │
                                       ▼ (Garment Pickup or Delivery)
                                   [ active ]
                                       │
                                       ▼ (Returned to Warehouse)
                                  [ returned ]
                                       │
                                       ▼ (Inspection & Deposit Audit)
                                  [ completed ]
                      (Deposit Refunded / Charges Assessed)
```

### Complete State Definitions

| State Name | Group | Technical Definition |
| :--- | :--- | :--- |
| `pending_payment` | Payment | Temporary 15-minute hold established while payment order processing occurs on Razorpay. |
| `confirmed` | Operational | Cryptographic HMAC verified. Hold is permanently dropped; date range locked for transit prep. |
| `active` | Rental | Garment has been picked up or delivered, and is currently in the customer's possession. |
| `returned` | Warehouse | Outfit returned to headquarters. Awaiting manual dry-cleaning and damage assessment checks. |
| `completed` | Finalized | Security deposit resolved (refunded/charged). Booking archived and catalog item marked as ready. |
| `cancelled` | Dead | Holds timed out, payment aborted, or parallel checkout collision resolved. |

### Decoupled Logistics Audit Flags
Instead of complicating the main transactional state machine with edge-case statuses, ReWeara tracks material incidents via independent boolean properties inside the `logistics` schema sub-document:
* `logistics.isLate` (Boolean): Flagged if the customer fails to return the garment by the scheduled rental end date.
* `logistics.isDamaged` (Boolean): Flagged if material tearing, stain marks, or stitching damage are found during check-in.

### Standardized Payment Statuses
* `pending`: Payment order created; awaiting Razorpay callback.
* `paid`: HMAC verified by backend API; funds captured.
* `failed`: Payment declined or checkout session expired.
* `refunded`: Entire transaction deposit refunded to user.
* `partially_refunded`: Partial deposit returned due to damage or late returns.

---

### MVP Simplification Trade-offs & Rationale
1. **Reduced State Complexity**: Managing 6 states instead of 11 reduces boundary bugs, simplifies index management, and minimizes complex query pipelines for inventory catalogs.
2. **Robust Auditing Trails**: Moving volatile states like `damaged` or `late` to sub-document booleans ensures we never lose historical record of user behaviors even after a booking progresses to `completed` status.
3. **Seamless Future Extensibility**: If ReWeara scales nationally and requires dedicated dispatch teams, intermediate states like `dispatched` or `in_transit` can be introduced easily without breaking the database architecture or model pipelines.

---

## 2. 15-Minute Reservation Expiration Logic

### The Business and Logistics Problem
If an outfit is removed from inventory the moment a customer enters checkout, malicious or indecisive users could start checkouts on multiple outfits, blocking real buyers. Conversely, if we don't lock inventory during checkout, two users could reach the final payment screen for the same Lehenga, leading to an overlapping double-payment failure.

### The ReWeara Solution
ReWeara uses a **15-minute temporary reservation lock**:
1. When a user clicks "Proceed to Payment", a booking record is written with status `pending_payment`.
2. A timestamp is computed: `reservationExpiresAt = current_time + 15 minutes`.
3. The booking availability engine respects this temporary lock *only* if `reservationExpiresAt` has not passed.
4. If the user does not complete checkout within 15 minutes, the lock expires. The outfit becomes instantly searchable and bookable by other users, without requiring manual admin intervention.

### Automated Cleanup Strategy
To keep the database clean and efficient, we leverage a native **MongoDB Time-To-Live (TTL) index**:
```javascript
// Creates a TTL index on reservationExpiresAt
bookingSchema.index({ reservationExpiresAt: 1 }, { expireAfterSeconds: 0 });
```
#### How It Works:
* When `reservationExpiresAt` exceeds the current server system time, MongoDB's background thread automatically drops the document.
* Inside our `/api/bookings/verify-payment` endpoint, we remove the `reservationExpiresAt` field from the document upon successful payment confirmation. This converts the temporary hold into a permanent booking block.

---

## 3. Concurrency & Race Condition Prevention

In high-concurrency environments (e.g., during wedding seasons), race conditions can occur if multiple checkout requests process at the exact same millisecond. NAIVE systems only check availability at the start of checkout, leading to duplicate bookings.

### The ReWeara Multi-Check Protection Scheme

```
[ User A Checkout ]                  [ Express API Server ]                  [ User B Checkout ]
        │                                      │                                      │
        │ ──(1) create-order ────────────────> │                                      │
        │                                      │ ──(2) Check Collisions ────────┐     │
        │                                      │     Status='confirmed' OR      │     │
        │                                      │     active lock (User B)?      │     │
        │                                      │     None Found!                │     │
        │                                      │ <──────────────────────────────┘     │
        │                                      │ ──(3) Set 15m Lock (User A) ───> [ MongoDB Atlas ]
        │                                      │                                      │
        │                                      │ <──(4) create-order ──────────────── │
        │                                      │ ──(5) Check Collisions ────────┐     │
        │                                      │     Active Lock (User A)       │     │
        │                                      │     Found!                     │     │
        │                                      │ <──────────────────────────────┘     │
        │                                      │ <──(6) Return 409 Conflict ───────── │
```

### The Two-Stage Verification Protocol

#### Stage 1: Pre-Checkout Lock Check
When generating the Razorpay Order, we check for overlapping confirmed bookings or active temporary holds. If clear, we immediately write the `pending_payment` lock.

#### Stage 2: Post-Payment Double Validation
Before finalizing the payment receipt and transitioning the booking to `confirmed`, the server re-runs the collision query inside a **MongoDB Transaction Session**:
* It ensures no other client successfully confirmed a booking for that date range during the payment window.
* If a conflict is detected (e.g., an admin override or session breach), the payment is flagged, a cancellation order is dispatched, and an automated full refund of both rent and deposit is triggered via the Razorpay API.

---

## 4. Refund & Material Damage Deduction Matrix

The refundable deposit represents a core customer trust signal. To ensure administrative fairness and transparency, ReWeara establishes a rigid damage and late return fee deduction schedule.

### Standardized Deduction Rules

```
Total Deposit Held (e.g., ₹2000)
       │
       ├─► [ Scenario A ] ──► Wear & tear only ─────► Refund: 100% (₹2000)
       │
       ├─► [ Scenario B ] ──► Minor stains/rips ────► Deduct: ₹300 (Refund: ₹1700)
       │
       ├─► [ Scenario C ] ──► Late return penalty ──► Deduct: ₹500/day
       │
       └─► [ Scenario D ] ──► Unwearable damage ────► Forfeit: 100% (Deduct ₹2000)
```

### Business Logic Matrix

| Incident Type | Severity | Assessment Details | Deduction Amount | Status Transition |
| :--- | :--- | :--- | :--- | :--- |
| **Normal Use** | None | Minor wear, easily dry-cleaned surface dust, loose threads. | **₹0 (100% Refund)** | `depositRefundStatus = 'refunded'` |
| **Minor Stain** | Low | Sangeet food stains, cosmetic smudges requiring targeted dry-cleaning. | **₹300 flat** | `depositRefundStatus = 'partially_deducted'` |
| **Minor Tear** | Medium | Border stitch separations, small zipper snaps, hem tears. | **₹500 flat** | `depositRefundStatus = 'partially_deducted'` |
| **Late Return** | High | Customer returns outfit late without pre-approval. | **₹500 per day** | `depositRefundStatus = 'partially_deducted'` |
| **Major Damage** | Severe | Large burns, extensive tearing, permanent stains that make the outfit unrentable. | **100% Forfeit** | `depositRefundStatus = 'forfeited'` |

### Standardized Refund Ledger Allocation Code
When processing refunds in the admin panel, the backend updates the transaction ledger automatically:
```javascript
const deduction = minorStains ? 300 : (lateDays * 500);
const refundAmount = Math.max(0, booking.financials.depositAmount - deduction);

booking.depositRefundDetails = {
  refundedAmount: refundAmount,
  deductedAmount: deduction,
  reasonForDeduction: deduction > 0 ? "Stains/Late fee deduction applied" : "Returned in excellent condition",
  razorpayRefundId: refundResponse.id,
  processedAt: new Date(),
  processedBy: adminUserId
};
```

---

## 5. Wishlist System Architecture

The Wishlist (Saved Favorites) feature is a key engagement driver that allows users to curate outfits for upcoming wedding seasons.

### Data Flow Diagram

```
[ Customer UI ]                    [ Axios Service Client ]                 [ Express Controller ]
       │                                       │                                      │
       │ ── 1. Click Heart Icon (OutfitId) ──> │                                      │
       │                                       │ ── 2. POST /api/wishlist/toggle ───> │
       │                                       │                                      │
       │                                       │ ── 3. Run $pull or $addToSet ──────> [ MongoDB ]
       │                                       │      Atomic Array Update             │
       │                                       │ <── 4. Returns updated array ──────── │
       │ <── 5. Heart transitions state ────── │                                      │
```

### Database Design & Schema Decision
Rather than creating a separate collection for wishlists (which would require joining collections for every catalog view), we store wishlists directly within the `User` document:
```javascript
savedFavorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Outfit' }]
```

#### Why This is Highly Efficient for MVP scale:
1. **Atomic Operations**: Adding or removing items uses MongoDB's highly efficient `$addToSet` (preventing duplicates) and `$pull` (removing items) operators. This bypasses structural locks.
2. **Fast Hydration**: When the user opens their profile page, we load and populate their saved items in a single query:
   ```javascript
   User.findById(userId).populate('savedFavorites');
   ```

---

## 6. Support & Live Customer Help Flow

To keep the platform lightweight and cost-efficient for the Pune-first MVP launch, we avoid heavy support ticketing systems and instead integrate a free, premium live support widget (**Tawk.to**) paired with direct WhatsApp redirection.

```
       [ Help Widget Trigger ] ──(Customer clicks "Need Help?")
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼ (Business Hours)   ▼ (Off-Hours)
  [ Live Chat ]       [ WhatsApp Redirection ]
  - Instant           - Sends pre-filled text:
    Tawk.to UI          "Hi ReWeara, I'm checking
                        out SKU: RWR-Lehenga-02"
```

### Technical Integration Strategy:
1. **Lightweight Embedding**: The Tawk.to JavaScript SDK is loaded asynchronously in the background. This ensures that the core product catalog and images load instantly without delay.
2. **Context-Aware WhatsApp Links**: On the Outfit Details page, we render an elegant "Inquire on WhatsApp" CTA that auto-generates a deep link containing the outfit's SKU and name:
   ```javascript
   const waLink = `https://wa.me/919999999999?text=Hi%20ReWeara%20team,%20I%20am%20interested%20in%20renting%20${outfit.name}%20(SKU:%20${outfit.sku}).%20Is%20it%20available?`;
   ```
3. **Future Scalability**: When scaling to a multi-city platform, we can transition this setup to a centralized service desk (e.g., Zendesk or Freshchat API) without making any breaking modifications to our core React UI layout.

---

## 7. Phase 2: Authentication & Authorization Lifecycle

In Phase 2, we successfully implemented a secure, recruiter-ready user authentication, Zod validation, and session management layer.

### The Authentication Data Lifecycle

```
Signup (POST /signup) ──► Zod Schema Check ──► Hash Password ──► MongoDB Write
                                                                     │
┌────────────────────────────────────────────────────────────────────┘
▼
Issue Access Token (JSON body) + Issue Refresh Token (Secure httpOnly Cookie)
```

### Flow Sequence Scenarios

#### 1. User Registration (`POST /api/v1/auth/signup`)
- Client submits `name`, `email`, `password`, and `phone` parameters.
- Express validation middleware asserts payload formats against the strict Zod schema:
  - Email: Conformity to standard address filters, trimmed, and mapped to lowercase.
  - Password: Minimum 8 characters, requiring at least one uppercase letter and one digit.
  - Phone: Confirmed matching standard 10-digit Indian mobile numbers (`/^[6-9]\d{9}$/`).
- Password is cryptographically salted (work factor 10) inside `User` Mongoose schema hooks before write.
- Server returns a status code `201 Created` with a stateless Access Token inside JSON response, and sets the HTTP-only Refresh Token inside response cookies.

#### 2. User Authentication (`POST /api/v1/auth/login`)
- Client submits `email` and `password`.
- Payload is validated against Zod schema rules.
- The database is scanned using `User.findOne({ email }).select('+password')`.
- The unhashed candidate password compares against the database hash via `bcrypt.compare()`.
- Successful verification triggers issuance of new token pairs (Access Token in JSON, Refresh Token in cookie).

#### 3. Token Renewal Cycle (`POST /api/v1/auth/refresh-token`)
- When the short-lived access token expires (15 minutes), the React client automatically fires a silent renewal request behind the scenes.
- The Express backend parses request cookies via standard `cookie-parser` to extract `req.cookies.refreshToken`.
- Service decrypts `refreshToken` using the system `REFRESH_SECRET`.
- If valid, the system performs **Refresh Token Rotation (RTR)**: it generates a brand new access token AND a brand new refresh token, updates the secure httpOnly cookie with the rotated refresh token, and returns the new access token in the JSON body.
- If verification fails or the token is expired, the server automatically **clears the refresh cookie** (`res.clearCookie`) from the client browser to securely reset session states.

#### 4. Secure Profile Hydration (`GET /api/v1/auth/me/profile`)
- Secured endpoints enforce the `protect` middleware.
- Request headers must contain the bearer authorization header: `Authorization: Bearer <access_token>`.
- JWT decodes inside route controllers, populating the active database fields `req.user` for clean, secure retrieval of wishlists and booking histories.

---

## 8. Refresh Token Rotation (RTR) & Security Strategy

To shield ReWeara from session hijacking and token duplication exploits, we establish a robust **Refresh Token Security Strategy**:

### 1. Token Lifespan Separation Philosophy
* **Access Tokens**: Short-lived (15 minutes). Held purely in React memory (state). If intercepted, the exposure window is extremely limited.
* **Refresh Tokens**: Long-lived (7 days). Set securely as an `httpOnly`, `secure`, `sameSite=strict` cookie. Kept safe from browser XSS leaks.

### 2. Mitigation against Stolen Tokens (Reuse Detection)
If an attacker manages to steal a Refresh Token, they can attempt to exchange it for new access keys. To mitigate this:
1. **Refresh Token Rotation (RTR)**: Every single time a refresh token is used to renew access, the server invalidates that specific refresh token and issues a *brand-new* refresh token.
2. **Reuse Detection (Mismatched Nonce)**: The system maintains an active session registry or records a `tokenNonce` within the token payload.
3. **Exploit Lockout Trigger**: If the server receives an expired or previously used refresh token, it assumes a breach occurred (that the token was stolen and reused by an attacker). The server **instantly revokes all active session cookies and tokens** associated with that parent User ID, forcing the real owner and the attacker to re-authenticate, securing the account immediately.

### 3. Session Revocation / Logout Invalidation
Upon calling `POST /logout`, the server sets the browser's refresh cookie expiration to `now - 10 seconds`. This forces the client browser to immediately discard the session cookie, cleanly invalidating any future refresh loops.

---

## 9. Super Admin Initial Database Seeding

To bootstrap the system owner account securely without exposing registrations endpoints to public abuse, we implement a dedicated **Super Admin Seeding Script** (`backend/scripts/seedSuperAdmin.js`).

```
[ Developer Shell ] ──► Run `npm run seed`
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│             Assert Environment Variables Presence           │ ──► Checks SUPER_ADMIN_EMAIL & PASSWORD
└─────────────────────────────────────────────────────────────┐
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│          Query DB for Existing 'super_admin' Profile        │ 
└─────────────────────────────────────────────────────────────┘
                               │
              ┌────────────────┴────────────────┐
              ▼ (Already Exists)                ▼ (No Admin Found)
     [ Seeding Blocked ]               [ Write Admin to DB ]
     - Logs: Seeding cancelled         - Mongoose Pre-save Hook hashes
     - Closes DB connection              password using Bcrypt
     - Graceful Exit (0)               - Logs: Seeding successful!
                                       - Closes DB connection
```

### Seeding Safety Constraints:
* **Environment-Bound**: Master admin details are loaded securely from `.env` secrets (`SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`).
* **Conflict Prevention**: The script scans the collection for either the matching email address or any profile with role `super_admin`. If found, it blocks execution and exits safely, preventing accidental credential overwrites on staging environments.
* **Automatic Hashing**: The script writes directly through Mongoose, ensuring the user model's pre-save salt hooks execute naturally to hash the database password.

---

## 10. Phase 3 Business Logic Refinements & Hardening

To prepare ReWeara for live customer deployment and high-level technical reviews, the following business domain layers were audited, refined, and documented:

### 1. Correct Algorithmic Complexity of Date Overlap Scans
Rather than stating dates are scanned in mathematically rigid $O(1)$ constant time (which is inaccurate for database engines), we detail how MongoDB indexes execute range queries under the hood:
* **B-Tree Traversal & Indexed Range Scans**: When querying overlapping dates, MongoDB performs an **optimized B-tree index traversal** to locate the start of the matching index range, followed by a **performant indexed range scan** through the leaf nodes matching the date boundaries.
* **Reduced Collection Scanning Cost**: The compound index `{ outfit: 1, status: 1, rentalStartDate: 1, rentalEndDate: 1 }` ensures that collection scans are completely avoided. The database never sweeps unrelated user documents, dramatically reducing read latency.
* **Recruiter Interview Tip**: Tell your interviewer: *"We completely decouple search performance from inventory scaling by routing date checks through index-assisted query execution. This keeps query times extremely fast and constant in real-world application envelopes."*

### 2. TTL Lifecycle Safety Audit
* **Why The Bug is Dangerous**: MongoDB’s background TTL index thread automatically deletes any document whose indexed date field (`reservationExpiresAt`) has expired. If confirmed, active, completed, or cancelled bookings retain this timestamp, MongoDB will wipe them out. This causes a catastrophic loss of historical records, accounting ledgers, and operational audit trails.
* **The Solution & Reasoning**:
  - Unpaid reservations remain as `pending_payment` temporary holds and are reaped naturally after 15 minutes if checkout is abandoned, keeping database clutter low.
  - Upon successful verification or when a parallel checkout collision aborts an order, we unset the `reservationExpiresAt` field inside `BookingService`. This drops the path in MongoDB, immunizing successful and historical cancelled records from TTL sweeps.

### 3. Outfit SEO Slug Hardening & Collision Prevention
* **SEO and Routing Rationale**: Modern brides discover rental boutiques via organic search queries. Transitioning routes from raw ObjectIDs (e.g., `/outfits/60d07e618b7...`) to SEO-friendly, alphanumeric slugs (e.g., `/outfits/red-bridal-lehenga`) drastically improves search engine indexing, click-through rates, and customer link sharing.
* **Collision Prevention Workflow**:
  - We normalize custom or auto-slugified inputs through a rigorous pre-validate regex loop, stripping trailing dashes and uppercase characters.
  - The async Mongoose hook queries the database via `findOne` to verify uniqueness. If a collision is caught, it automatically appends incrementing suffixes (`-1`, `-2`, etc.), preventing database constraint crashes while keeping URLs descriptive.

### 4. Review Moderation & Brand Safety Workflow
* **Spam Prevention**: A premium luxury brand must be protected from artificial rating inflation, competitor spam, or inappropriate customer reviews.
* **The Workflow**:
  1. Reviews default strictly to `pending_payment` moderation states.
  2. Public catalog queries execute reviews using `Review.find({ outfit: outfitId, moderationStatus: 'approved' })`, ensuring unapproved entries are hidden.
  3. Outfit catalog pages query reviews strictly with the filter `{ moderationStatus: 'approved' }`, guaranteeing unmoderated or rejected feedback is never leaked.
  - We retain anti-abuse protection by maintaining a compound unique index `{ user: 1, outfit: 1 }` to block duplicate rating submissions.

---

## 11. Administrative Bookings Control & Security Safeguards

To facilitate logistics oversight and quality check audits, ReWeara implements an administrative bookings pipeline at `/admin/bookings`.

### 1. Paginated Log Retrieval & Filtering
* **The Endpoint:** `GET /api/v1/bookings/admin?status=X&page=Y&limit=Z`
* **Query Execution:** The frontend requests fresh logs dynamically. If a status filter is selected (e.g. `'pending'`), the query resets page count parameters back to `1` to avoid indexing empty datasets.
* **Badging Rules:** Badges are styled using only verified design system color tokens (`brand-gold`, `brand-blush`, `brand-sage`, `brand-dust`, `brand-espresso`, and `#8D4237` Terracotta), ensuring standard Tailwind raw colors are completely avoided.

### 2. Sibling Modal Architecture (Stacking Context Invalidation)
Modals positioned with `position: fixed` will offset abnormally or clip if an ancestor element applies a CSS transform (like the `translateY` values in our `.animate-fade-in` transitions).
* **The Resolution:** 
  1. We wrap the view in a React Fragment (`<> ... </>`).
  2. We close the animated wrapper container div prior to rendering the modal block.
  3. The modal is rendered as a **true root-level sibling**, aligning its coordinate base relative to the document viewport boundary.

### 3. Hardened Lockout of Manual Payment Approvals
Manually transitioning bookings from `pending` to `confirmed` automatically set payment status to `'paid'` in database models, creating a production fraud vulnerability.
* **The Hardening Resolution:** 
  - We deleted `'confirmed'` from the allowed status transition lists for `'pending'` state models on both the backend service and client components.
  - The map is locked as:
    ```javascript
    pending: ['cancelled']
    ```
  - Bookings can now only progress to `confirmed` and `paid` status by completing the Razorpay cryptographic signature flow, protecting financial pipelines.

### 4. Audit Notes History Splitting & Fragmentation
To prevent exponential note duplication during sequential booking status overrides:
* **The Problem:** Pre-filling the update textarea with a booking's full previous notes history caused the frontend to submit the accumulated logs as new input. The backend then appended the text on top of itself, creating duplicated logs.
* **The Resolution:** 
  1. We configured the update modal notes textarea to initialize with an empty string (`''`) by default, so only fresh comments are submitted.
  2. We added a read-only scrollable panel displaying previous logs in the modal layout, using a parsing utility to format appended delimiters onto separate lines for enhanced admin readability:
     ```javascript
     {activeBooking.adminNotes.split(' | ').join('\n')}
     ```

### 5. Read-Only Terminal State History Logs
To ensure audit trails remain readable even after a booking reaches a terminal state (such as `cancelled` or `refunded`):
* **The Solution:** The Actions column renders a `"View History"` button for terminal bookings.
* **Modal Overlay Rules:** 
  1. Title updates dynamically to `"Booking Audit History"` / `"Archive Log Review"`.
  2. Next Status Selector dropdown and Add Audit Note inputs are hidden.
  3. Action buttons are replaced by a single full-width `"Close"` button to prevent any edits while preserving full transparency of historical transactions.


