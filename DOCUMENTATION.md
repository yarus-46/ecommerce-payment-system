# E-Commerce Ordering & Payment System Documentation

This document describes the system architecture, database schema, payment flows, and API specifications for the E-Commerce Ordering & Payment System.

---

## 1. System Architecture

The backend is architected following clean architecture and Domain-Driven Design (DDD) principles:
- **Domain Layer**: Contains pure OOP domain models (`User`, `Product`, `Order`, `Payment`, `Category`) representing business rules.
- **Repository Layer**: Maps database queries to domain entities using Prisma ORM.
- **Service Layer**: Orchestrates domain behaviors, stock transactions, category DFS tree traversal, and payment strategy execution.
- **Controller/Routing Layer**: Exposes Express REST APIs.
- **Payment Strategy**: A clean Strategy Pattern decouples order logic from specific payment providers.

```mermaid
graph TD
    Client[REST API Clients / Frontend] --> Router[Express Router]
    Router --> Controller[API Controllers]
    Controller --> AuthMiddleware[Auth Middleware]
    Controller --> Service[Services: OrderService, CategoryService, PaymentService]
    Service --> Domain[Domain OOP Entities: User, Product, Order, Payment]
    Service --> PaymentContext[PaymentContext Strategy Pattern]
    PaymentContext --> StripeStrategy[StripePaymentStrategy]
    PaymentContext --> BkashStrategy[BkashPaymentStrategy]
    Service --> Repository[Repositories: ProductRepo, OrderRepo, PaymentRepo]
    Repository --> Prisma[Prisma ORM]
    Prisma --> Postgres[(PostgreSQL DB)]
    CategoryService --> Cache[Cache Layer: Redis / local memory]
```

---

## 2. Entity-Relationship Diagram (ERD)

The database schema utilizes relational mapping, foreign keys, and indexes for performant queries.

```mermaid
erDiagram
    USER {
        Int id PK
        String email UK
        String passwordHash
        String role
        DateTime createdAt
        DateTime updatedAt
    }
    CATEGORY {
        Int id PK
        String name
        Int parentId FK
        DateTime createdAt
        DateTime updatedAt
    }
    PRODUCT {
        Int id PK
        String name
        String sku UK
        String description
        Float price
        Int stock
        String status
        Int categoryId FK
        DateTime createdAt
        DateTime updatedAt
    }
    ORDER {
        Int id PK
        Int userId FK
        Float totalAmount
        String status
        DateTime createdAt
        DateTime updatedAt
    }
    ORDER_ITEM {
        Int id PK
        Int orderId FK
        Int productId FK
        Int quantity
        Float price
        Float subtotal
    }
    PAYMENT {
        Int id PK
        Int orderId FK
        String provider
        String transactionId UK
        String status
        Json rawResponse
        DateTime createdAt
        DateTime updatedAt
    }

    USER ||--o{ ORDER : places
    CATEGORY ||--o{ PRODUCT : contains
    CATEGORY ||--o{ CATEGORY : "parent-child"
    PRODUCT ||--o{ ORDER_ITEM : "ordered in"
    ORDER ||--|{ ORDER_ITEM : consists_of
    ORDER ||--o{ PAYMENT : has
```

---

## 3. Payment Flow Diagrams

### 3.1 Stripe Payment Flow
```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant Frontend
    participant Backend
    participant StripeAPI as Stripe Server

    Customer->>Frontend: Select Stripe & click Pay
    Frontend->>Backend: POST /api/payments/initiate { orderId, provider: "stripe" }
    Backend->>StripeAPI: Create PaymentIntent (amount, orderId)
    StripeAPI-->>Backend: Return client_secret & paymentIntentId
    Backend->>Backend: Save Payment (provider: "stripe", status: "pending")
    Backend-->>Frontend: Return client_secret & transactionId
    Frontend->>StripeAPI: Confirm payment with card details (Client SDK)
    StripeAPI-->>Customer: Success/Fail authorization
    Note over Backend, StripeAPI: Stripe webhook processes event asynchronously
    StripeAPI->>Backend: POST /api/payments/stripe/webhook (payment_intent.succeeded)
    Backend->>Backend: Verify signature & execute stock reduction inside transaction
    Backend->>Backend: Update Order to "paid" & Payment to "success"
```

### 3.2 bKash Payment Flow (Tokenized Checkout)
```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant Frontend
    participant Backend
    participant bKashAPI as bKash Sandbox/Live

    Customer->>Frontend: Select bKash & click Pay
    Frontend->>Backend: POST /api/payments/initiate { orderId, provider: "bkash" }
    Backend->>bKashAPI: POST /checkout/token/grant (credentials)
    bKashAPI-->>Backend: id_token
    Backend->>bKashAPI: POST /checkout/payment/create (amount, orderId, callbackURL)
    bKashAPI-->>Backend: paymentID & bkashURL
    Backend->>Backend: Save Payment (provider: "bkash", status: "pending")
    Backend-->>Frontend: Return bkashURL (redirect link)
    Frontend->>Customer: Redirect to bKash portal (or mock simulator)
    Customer->>Customer: Input Phone PIN & OTP
    Customer->>Frontend: Callback redirect with status
    Frontend->>Backend: GET /api/payments/bkash/execute?paymentID=...&orderId=...
    Backend->>bKashAPI: POST /checkout/payment/execute { paymentID }
    bKashAPI-->>Backend: transactionStatus: "Completed", trxID: "..."
    Backend->>Backend: Update order to "paid" & decrease stock inside transaction
    Backend-->>Frontend: Redirect to Order Details page
```

---

## 4. API Documentation

### 4.1 User Authentication
- **`POST /api/auth/register`**
  - Body: `{ "email": "test@test.com", "password": "password123", "role": "customer" }` (role is optional)
  - Response (217): `{ "message": "User registered successfully", "user": { "id": 1, "email": "test@test.com", "role": "customer" } }`
- **`POST /api/auth/login`**
  - Body: `{ "email": "test@test.com", "password": "password123" }`
  - Response (200): `{ "message": "Login successful", "token": "JWT_TOKEN", "user": { "id": 1, "role": "customer" } }`

### 4.2 Products
- **`GET /api/products`**
  - Query Parameters: `categoryId` (optional)
  - Response (200): List of products.
- **`GET /api/products/:id`**
  - Response (200): Product details.
- **`POST /api/admin/products`** (Admin privileges required)
  - Headers: `Authorization: Bearer <JWT>`
  - Body: `{ "name": "Apple Watch", "sku": "WATCH9", "price": 399.99, "stock": 50, "categoryId": 1 }`
- **`PUT /api/admin/products/:id`** (Admin privileges required)
- **`DELETE /api/admin/products/:id`** (Admin privileges required)

### 4.3 Categories & Recommendations (DFS + Caching)
- **`GET /api/categories`**
  - Returns hierarchical category tree (cached).
- **`POST /api/categories`** (Admin privileges required)
  - Body: `{ "name": "Smartphones", "parentId": 1 }`
- **`GET /api/categories/:id/recommendations`**
  - Performs **DFS traversal** to find products belonging to category `:id` and all nested child categories.

### 4.4 Orders
- **`POST /api/orders`**
  - Headers: `Authorization: Bearer <JWT>`
  - Body: `{ "items": [ { "productId": 1, "quantity": 2 } ] }`
  - Response (217): Order details with deterministic subtotals and totals.
- **`GET /api/orders/mine`**
  - Headers: `Authorization: Bearer <JWT>`
  - Returns all orders belonging to logged-in user.
- **`GET /api/orders/:id`**

### 4.5 Payments (Strategy Pattern)
- **`POST /api/payments/initiate`**
  - Headers: `Authorization: Bearer <JWT>`
  - Body: `{ "orderId": 1, "provider": "stripe" }` or `{ "orderId": 1, "provider": "bkash" }`
  - Response (201): Stripe payment secret / clientSecret OR bKash checkout URL.
- **`GET /api/payments/mine`**
  - Headers: `Authorization: Bearer <JWT>`
  - Returns payment list for the user.
- **`POST /api/payments/stripe/webhook`**
  - Raw event webhook receiver.
- **`GET /api/payments/bkash/execute`**
  - Executes payment. Used as callback landing route.
