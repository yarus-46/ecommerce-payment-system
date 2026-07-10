# E-Commerce Ordering & Payment System Backend

A robust Node.js/Express/TypeScript backend featuring object-oriented design patterns, relational database configuration, deep category trees with DFS recommendation algorithms, Redis caching, and Stripe & bKash payment strategy integrations.

---

## Features

1. **User Authentication**: Secure register/login flow using JWT tokens and bcrypt password hashing.
2. **Relational Database & Migrations**: Configured using Prisma ORM with PostgreSQL.
3. **Core OOP Models**: Pure Domain entities with business logic, stock safeguards, and deterministic total/subtotal algorithms.
4. **Payment Strategy Pattern**: Strategy Pattern registers and executes Stripe and bKash tokenized checkouts dynamically.
5. **DFS Category Recommendations**: Recursive Depth-First Search (DFS) traversals retrieve products from parent categories and all subcategories.
6. **Double-Layered Caching**: Category tree structure is cached in Redis (with automatic in-memory fallback to `node-cache`).
7. **Mock Testing Modes**: Fully functional out-of-the-box local testing using mock Stripe credentials and an interactive bKash simulator interface.

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm (v9+)
- PostgreSQL and Redis (Optional. If not running, you can connect to remote databases or test using our standalone mocks).

### 1. Installation
Navigate to the project folder and install dependencies:
```bash
npm install
```

### 2. Configure Environment
Copy and rename the environment template:
```bash
cp .env .env.local
```
Update `.env` values with your credentials (Stripe API Keys, bKash Sandbox, PostgreSQL database URL, Redis URL).

### 3. Database Generation
Generate Prisma database client:
```bash
npx prisma generate
```

To run migrations and seed sample products/users on a running PostgreSQL database:
```bash
npx prisma migrate dev --name init
npx prisma db seed
```
*(Alternatively, mock modes allow endpoints and tests to run successfully out-of-the-box even without a connected database!)*

### 4. Running the Application
To run the server in development mode (with hot-reloads):
```bash
npm run dev
```
The server starts on `http://localhost:3000`.

---

## Running Tests
Run Jest unit and integration tests (isolated mocks guarantee instant passes):
```bash
npm run test
```

---

## Interactive bKash Sandbox Testing
1. Login as the customer (using `customer@ecommerce.com` and `customerpassword`).
2. Copy the returned JWT token.
3. Submit a new order via `POST /api/orders` sending the token in the `Authorization: Bearer <JWT>` header.
4. Call `POST /api/payments/initiate` with body `{ "orderId": <order_id>, "provider": "bkash" }`.
5. The API returns a `bkashURL` pointing to `http://localhost:3000/api/payments/bkash/mock-checkout?paymentID=...`.
6. Open that link in your browser to view the interactive **bKash Checkout Simulator**! Input a 5-digit PIN and click Confirm to execute the payment, update order status, and decrease product stock atomically.

---

## Documentation
For complete ERD tables, system architecture diagram, sequence flows, and API reference, see [DOCUMENTATION.md](file:///Users/yarusrafi/.gemini/antigravity/scratch/ecommerce-payment-system/DOCUMENTATION.md).
