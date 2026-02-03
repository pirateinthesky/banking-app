# 🏦 Horizon - Modern Banking Platform

Horizon is a comprehensive financial technology (FinTech) platform that allows users to securely connect their bank accounts, view real-time transaction histories, and perform fund transfers between accounts.

## 🚀 Key Features

- **Multi-Bank Integration:** Securely connect real bank accounts using Plaid.
- **Fund Transfers:** Perform ACH transfers using the Dwolla infrastructure.
- **Dynamic Dashboard:** Real-time tracking of total balance and recent transactions.
- **Smart Balance Management:** Intelligent balance calculation that synchronizes database records with live bank data for accurate, real-time updates.
- **Modern UI/UX:** A sleek and responsive design built with Tailwind CSS and Shadcn/UI.

## 🛠️ Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** PostgreSQL (via Docker)
- **ORM:** Prisma
- **Bank API:** Plaid
- **Payment Processor:** Dwolla
- **Authentication:** NextAuth.js (v5)
- **Styling:** Tailwind CSS & Shadcn/UI

---

## 🏁 Installation Guide

Follow these steps to run the project in your local environment.

### Prerequisites

Make sure you have the following installed:
- [Node.js](https://nodejs.org/) (v18+)
- [Docker](https://www.docker.com/) (For PostgreSQL database)

### 1. Clone the Repository and Install Dependencies

Open your terminal and run the following commands:

```bash
git clone [https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git](https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git)
cd Banking-App
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory and populate it with your keys:

```env
# NEXT
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# DATABASE (Prisma / PostgreSQL via Docker)
# Ensure this matches your docker-compose configuration
DATABASE_URL="postgresql://user:password@localhost:5432/horizon_db?schema=public"

# AUTH (NextAuth)
AUTH_SECRET="generate_a_random_secret_here"

# PLAID (Bank Connections)
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET=your_plaid_secret
PLAID_ENV=sandbox
PLAID_PRODUCTS=auth,transactions,identity
PLAID_COUNTRY_CODES=US

# DWOLLA (Payment Processing)
DWOLLA_KEY=your_dwolla_key
DWOLLA_SECRET=your_dwolla_secret
DWOLLA_BASE_URL=[https://api-sandbox.dwolla.com](https://api-sandbox.dwolla.com)
DWOLLA_ENV=sandbox
```

### 3. Setup Database (Docker & Prisma)

Start the PostgreSQL container using Docker and synchronize the schema. Run these commands in your project terminal:

```bash
# 1. Start the Database Container
docker-compose up -d

# 2. Generate Prisma Client
npx prisma generate

# 3. Push Schema to Database
npx prisma db push
```

### 4. Run the Application

```bash
npm run dev
```

Visit `http://localhost:3000` in your browser.

---

## 🧪 Test Data (Sandbox)

You can use the following credentials to test the application in Sandbox mode:

**Plaid Login (inside the bank modal):**
- **Username:** `user_good`
- **Password:** `pass_good`
- **Pin:** `1234`

**Transfer Test:**
- To test the money transfer feature, copy the **Sharable ID** of one of your connected accounts (recipient) and paste it into the transfer form.

---
