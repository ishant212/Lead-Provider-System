# 🎯 Lead Provider — Mini Lead Distribution System

> A production-grade lead distribution system built with Next.js, PostgreSQL, and Prisma — featuring fair round-robin allocation, concurrency-safe transactions, real-time dashboards, and idempotent webhooks.

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791?style=flat-square)
![Prisma](https://img.shields.io/badge/ORM-Prisma-2D3748?style=flat-square)
![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?style=flat-square)
![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_CSS-38BDF8?style=flat-square)
![Status](https://img.shields.io/badge/Status-Complete-brightgreen?style=flat-square)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Features](#2-features)
3. [Architecture](#3-architecture)
4. [Tech Stack](#4-tech-stack)
5. [Database Schema](#5-database-schema)
6. [Allocation Algorithm](#6-allocation-algorithm)
7. [Concurrency Handling](#7-concurrency-handling)
8. [Webhook Idempotency](#8-webhook-idempotency)
9. [Folder Structure](#9-folder-structure)
10. [How to Run](#10-how-to-run)
11. [API Endpoints](#11-api-endpoints)
12. [Screenshots](#12-screenshots)

---

## 1. Overview

A customer visits the platform, submits a service enquiry, and the system instantly distributes the lead to exactly **3 providers** — following mandatory assignment rules and a fair round-robin rotation for the remaining slots.

The system is designed to be correct under simultaneous requests, survive server restarts, enforce quotas at the database level, and push live updates to open dashboards without page refresh.

---

## 2. Features

### Customer Form — `/request-service`
- Fields: Name, Phone, City, Service Type, Description
- Duplicate prevention: same phone + same service is rejected at the **database constraint level** (`UNIQUE(phone, serviceId)`)
- Triggers automatic provider assignment on submission

### Lead Distribution Engine
- Exactly **3 providers** assigned per lead
- **Mandatory rules** always respected:
  - Service 1 → Provider 1 always assigned
  - Service 2 → Provider 5 always assigned
  - Service 3 → Provider 1 + Provider 4 always assigned
- Remaining slots filled via **persistent round-robin** from a service-specific fair pool
- Provider monthly quota (10 leads) enforced — full providers are skipped
- Same provider cannot receive the same lead twice

### Provider Dashboard — `/dashboard`
- Shows all 8 providers with quota remaining, total leads received, and assigned lead details
- **Live updates** without page refresh via polling (SWR, 2s interval)
- Quota bar indicator — turns red when exhausted

### Test Tools — `/test-tools`
- **Webhook Simulator** — reset any provider's quota (1× or 3×) using the same idempotency key
- **Concurrency Tester** — fire 10 simultaneous lead creation requests to stress-test allocation
- Terminal-style log panel with timestamped results

### Webhook Safety — `POST /api/webhooks/payment`
- Quota resets **only** through the webhook endpoint
- Calling the same webhook multiple times has exactly one effect (idempotent)
- Uses a `WebhookEvent` table with a unique `idempotencyKey` to prevent duplicate processing

---

## 3. Architecture

### Lead Creation Flow

```
Customer Form (/request-service)
        ↓
POST /api/leads
        ↓
┌─────────────────────────────────────────┐
│         PostgreSQL Transaction          │
│  (Serializable Isolation)               │
│                                         │
│  1. Insert lead (unique phone+service)  │
│  2. Lock allocation_pointer row         │
│     (SELECT FOR UPDATE)                 │
│  3. Assign mandatory providers          │
│  4. Fill remaining via round-robin pool │
│  5. Persist new pointer index           │
│  6. Insert lead assignments             │
└─────────────────────────────────────────┘
        ↓
Dashboard polls /api/providers (SWR 2s)
```

### Webhook Idempotency Flow

```
POST /api/webhooks/payment { idempotencyKey }
        ↓
INSERT INTO WebhookEvent (idempotencyKey)
        ↓
 Key exists? → Return "Already processed" (no-op)
 Key new?    → Reset provider quota to 10 → Return "Success"
```

---

## 4. Tech Stack

| Technology | Purpose |
|------------|---------|
| Next.js 15 (App Router) | Full-stack framework |
| TypeScript | Type safety |
| PostgreSQL | Primary database |
| Prisma ORM | Schema management & queries |
| SWR | Data fetching + polling for real-time updates |
| Tailwind CSS | Styling |
| DM Sans / DM Serif Display | Typography |
| Lucide React | Icons |
| Neon / Railway | Cloud PostgreSQL hosting |

---

## 5. Database Schema

```prisma
model Service {
  id        Int      @id @default(autoincrement())
  name      String
  leads     Lead[]
}

model Provider {
  id              Int              @id @default(autoincrement())
  name            String
  monthlyQuota    Int              @default(10)
  assignedLeads   LeadAssignment[]
}

model Lead {
  id          String           @id @default(uuid())
  name        String
  phone       String
  city        String
  serviceId   Int
  description String?
  createdAt   DateTime         @default(now())
  service     Service          @relation(fields: [serviceId], references: [id])
  assignments LeadAssignment[]

  @@unique([phone, serviceId])   // enforces duplicate rule at DB level
}

model LeadAssignment {
  id         Int      @id @default(autoincrement())
  leadId     String
  providerId Int
  assignedAt DateTime @default(now())
  lead       Lead     @relation(fields: [leadId], references: [id])
  provider   Provider @relation(fields: [providerId], references: [id])

  @@unique([leadId, providerId])  // same provider cannot get same lead twice
}

model WebhookEvent {
  id              Int      @id @default(autoincrement())
  idempotencyKey  String   @unique   // prevents duplicate webhook processing
  processedAt     DateTime @default(now())
}
```

**Key design decisions:**
- `@@unique([phone, serviceId])` on `Lead` — the duplicate check cannot be bypassed, even if frontend validation is skipped
- `@@unique([leadId, providerId])` on `LeadAssignment` — double-assignment is impossible at the DB level
- `idempotencyKey @unique` on `WebhookEvent` — the insert fails on duplicates, making the reset a no-op automatically

---

## 6. Allocation Algorithm

For every new lead, the system:

1. **Reads mandatory providers** for the service from a static config map
2. **Checks each mandatory provider's quota** — skips if exhausted
3. **Calculates remaining slots** (`3 - mandatory assigned`)
4. **Reads the current round-robin pointer** for the service (locked with `SELECT FOR UPDATE`)
5. **Iterates the fair pool** from the pointer index, skipping:
   - Providers already assigned (mandatory overlap)
   - Providers over monthly quota
6. **Saves the new pointer index** to the database (persists across restarts)
7. **Inserts all assignments** within the same transaction

**Service pools:**

| Service | Mandatory | Fair Pool |
|---------|-----------|-----------|
| Service 1 | Provider 1 | Providers 2, 3, 4 |
| Service 2 | Provider 5 | Providers 6, 7, 8 |
| Service 3 | Provider 1, 4 | Providers 2, 3, 5, 6, 7, 8 |

---

## 7. Concurrency Handling

The allocation engine uses a **serializable database transaction** with `SELECT FOR UPDATE` on the `allocation_pointer` row for the relevant service.

This means:
- Two simultaneous leads for Service 1 cannot both read the same pointer value
- The second transaction waits until the first commits before proceeding
- Round-robin state is always consistent

```typescript
// Lock the pointer row before reading
const pointer = await tx.$queryRaw`
  SELECT pool_index FROM allocation_pointers
  WHERE service_id = ${serviceId}
  FOR UPDATE
`;
```

Under extreme concurrency (10 simultaneous requests), per-provider quota checks may occasionally allow one extra lead through before the commit is visible to a racing transaction. This is a known edge case acknowledged in the design — a per-provider row lock would fully prevent it at the cost of higher lock contention.

---

## 8. Webhook Idempotency

The quota reset webhook is safe to call multiple times. The first call inserts a `WebhookEvent` row with the provided `idempotencyKey` and resets the quota. Every subsequent call with the same key hits the unique constraint and returns "Already processed" without touching the quota.

```typescript
try {
  await tx.webhookEvent.create({ data: { idempotencyKey } });
  await tx.provider.update({ where: { id: providerId }, data: { monthlyQuota: 10 } });
} catch (e) {
  if (e.code === 'P2002') {
    return Response.json({ message: 'Already processed' }); // idempotent no-op
  }
}
```

---

## 9. Folder Structure

```
lead-provider/
│
├── assets/                          # Screenshots
│   ├── homepage.png
│   ├── request.png
│   ├── request_success.png
│   ├── dashboard.png
│   └── test-tools.png
│
├── prisma/
│   ├── schema.prisma                # Database models
│   └── seed.ts                      # Seeds 3 services, 8 providers, allocation pointers
│
├── src/
│   └── app/
│       ├── layout.tsx               # Root layout, navigation
│       ├── page.tsx                 # Home page
│       ├── globals.css
│       │
│       ├── request-service/
│       │   └── page.tsx             # Customer enquiry form
│       │
│       ├── dashboard/
│       │   └── page.tsx             # Provider dashboard (live polling)
│       │
│       ├── test-tools/
│       │   └── page.tsx             # Webhook simulator + concurrency tester
│       │
│       └── api/
│           ├── leads/
│           │   └── route.ts         # POST — create lead + allocate providers
│           ├── providers/
│           │   └── route.ts         # GET — all providers with quota + leads
│           ├── services/
│           │   └── route.ts         # GET — all services
│           └── webhooks/
│               └── payment/
│                   └── route.ts     # POST — idempotent quota reset
│
├── .env                             # DATABASE_URL
├── package.json
└── README.md
```

---

## 10. How to Run

### Prerequisites

- Node.js 18+
- A PostgreSQL database (Neon, Supabase, Railway, or local)

### Step 1 — Clone the repository

```bash
git clone <your-repo-url>
cd lead-provider
```

### Step 2 — Install dependencies

```bash
npm install
```

### Step 3 — Configure environment

Create a `.env` file in the root:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DBNAME"
```

> For a free cloud database, sign up at [neon.tech](https://neon.tech) and paste the connection string.

### Step 4 — Run database migrations and seed

```bash
npx prisma migrate dev --name init
npx prisma db seed
```

This creates all tables and seeds:
- 3 services (Service 1, Service 2, Service 3)
- 8 providers (Provider 1 through Provider 8), each with quota 10
- Allocation pointers for each service (round-robin state)

### Step 5 — Start the development server

```bash
npm run dev
```

App is available at `http://localhost:3000`

### Step 6 — *(Optional)* Inspect the database

```bash
npx prisma studio
```

---

## 11. API Endpoints

### Leads

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/leads` | Submit a lead + trigger allocation | ❌ |

**Request body:**
```json
{
  "name": "Ishant Shekhar",
  "phone": "9999999999",
  "city": "Darbhanga",
  "serviceId": 1,
  "description": "I need help with Service 1"
}
```

**Duplicate response (409):**
```json
{ "error": "A lead for this service already exists with this phone number." }
```

---

### Providers

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/providers` | All providers with quota + assigned leads | ❌ |
| `GET` | `/api/services` | All available services | ❌ |

---

### Webhook

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/webhooks/payment` | Reset provider quota (idempotent) | ❌ |

**Request body:**
```json
{
  "providerId": 3,
  "idempotencyKey": "payment_abc123"
}
```

**First call response:**
```json
{ "message": "Quota reset successfully" }
```

**Repeated call response (same key):**
```json
{ "message": "Already processed" }
```

---

## 12. Screenshots

### 🏠 Home Page
![Home](assets/homepage.png)

### 📋 Request Service
![Request Service](assets/request.png)

### ✅ Successful Submission
![Success](assets/request_success.png)

### 📊 Provider Dashboard
![Dashboard](assets/dashboard.png)

### 🛠 Test Tools
![Test Tools](assets/test-tools.png)

---

> Built as a full-stack engineering assignment demonstrating backend correctness, database consistency, and real-world concurrency handling over visual complexity.
