# Bookstore Frontend

Modern Single Page Application (SPA) for the Bookstore reimplementation. Built with **Vue 3** (Composition API `<script setup>`), **TypeScript**, **Tailwind CSS v4**, **Pinia** (state management), **Vue Router 4**, **Axios**, and **Vitest**.

---

## Quick Start: How to Run After Cloning

Follow these step-by-step instructions to run the frontend on a clean machine from scratch.

### 1. Prerequisites

Ensure you have the following installed on your machine:

- **Node.js:** Version `22.18.0+` or `>= 24.12.0` (LTS recommended).
- **npm:** Version `10.0.0+` (included with Node.js).
- **Backend:** The backend service should be running on `http://localhost:8080` (see [`bookstore-backend/README.md`](../bookstore-backend/README.md)).

Verify your Node.js and npm versions:

```powershell
node -v
# Expected: v22.x.x or v24.x.x

npm -v
# Expected: 10.x.x
```

---

### 2. Clone and Navigate

```powershell
git clone <repository-url>
cd bookstore-reimplementation/bookstore-frontend
```

---

### 3. Setup Environment Variables

Copy `.env.example` to `.env` in this frontend project folder:

```powershell
# Windows PowerShell
Copy-Item .env.example .env

# macOS / Linux / Git Bash
cp .env.example .env
```

The default `.env` points to the local Spring Boot backend API:

```dotenv
# Frontend API base URL, including the backend's /api prefix
VITE_BACKEND_URL=http://localhost:8080/api
```

> [!NOTE]
> Vite embeds `VITE_` variables into the browser bundle at build time. Ensure `VITE_BACKEND_URL` points to your backend instance without a trailing slash.

---

### 4. Install Dependencies

Install the project dependencies using npm:

```powershell
npm install
```

---

### 5. Launch the Development Server

Start the Vite development server with Hot Module Replacement (HMR):

```powershell
npm run dev
```

Vite will serve the application on **`http://localhost:5173`**.

---

### 6. Open in Browser

- **Storefront:** [http://localhost:5173](http://localhost:5173)
- **Customer Sign-In:** [http://localhost:5173/login](http://localhost:5173/login)
- **Administrator Back-Office:** [http://localhost:5173/admin](http://localhost:5173/admin) (or [http://localhost:5173/admin/login](http://localhost:5173/admin/login))

---

## Default Seed Accounts

When the backend is running with the `dev` profile active, the following default credentials are ready for testing:

| Role              | Email                    | Password               | Access / Views                                                                      |
| ----------------- | ------------------------ | ---------------------- | ----------------------------------------------------------------------------------- |
| **Administrator** | `admin@bookstore.com`    | `AdminPassword123!`    | Back-Office (`/admin`): Dashboard, Products, Categories, Orders, Customers, Profile |
| **Customer**      | `customer@bookstore.com` | `CustomerPassword123!` | Storefront: Cart, Checkout, Addresses, Payment Methods, Order History, Wishlist     |

> [!TIP]
> You can also register a new customer account at any time via [http://localhost:5173/register](http://localhost:5173/register).

---

## Available npm Scripts

Run all commands from the `bookstore-frontend` directory:

| Script          | Command                 | Purpose                                                                                                                        |
| --------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `dev`           | `npm run dev`           | Launch the local Vite development server with HMR at `http://localhost:5173`                                                   |
| `build`         | `npm run build`         | Run strict type-check (`vue-tsc`) and compile production bundle into `dist/`                                                   |
| `preview`       | `npm run preview`       | Locally preview the compiled production build                                                                                  |
| `test`          | `npm test`              | Run Vitest unit, component, and workflow test suites                                                                           |
| `test:watch`    | `npm run test:watch`    | Run Vitest in interactive watch mode during development                                                                        |
| `test:coverage` | `npm run test:coverage` | Run Vitest with V8 code coverage report generation                                                                             |
| `lint`          | `npm run lint`          | Check code with ESLint (fails if any warnings or errors: `--max-warnings=0`)                                                   |
| `lint:fix`      | `npm run lint:fix`      | Automatically fix auto-fixable ESLint issues                                                                                   |
| `format:check`  | `npm run format:check`  | Verify code formatting with Prettier without modifying files                                                                   |
| `format`        | `npm run format`        | Automatically format all source files with Prettier                                                                            |
| `type-check`    | `npm run type-check`    | Run `vue-tsc --build` for strict TypeScript type checking                                                                      |
| `check`         | `npm run check`         | Run the complete verification suite: lint $\to$ format check $\to$ type check $\to$ tests with coverage $\to$ production build |

---

## Running Tests & Quality Verification

All component and workflow tests run in a mock `jsdom` environment and do **not** require PostgreSQL or a running backend server:

```powershell
# Run all automated tests
npm test

# Run tests with V8 coverage report
npm run test:coverage

# Full quality gate verification (lint, format, types, tests, build)
npm run check
```

Coverage reports are generated in the `coverage/` directory:

- **HTML Coverage Report:** `coverage/index.html`
- **LCOV Report (for SonarQube):** `coverage/lcov.info`
- **Summary JSON:** `coverage/coverage-summary.json`

---

## SonarQube Static Analysis

This project maintains zero code smells, zero vulnerabilities, and >80% code coverage on SonarQube.

To run local analysis using Docker and the official SonarScanner image:

1. Copy `.env.sonar.example` to `.env.sonar`.
2. Generate an analysis token in SonarQube under **My Account > Security** and paste it as `SONAR_TOKEN=<your-token>`.
3. Execute the analysis script:
   ```powershell
   .\scripts\sonar.ps1
   ```

_(The script automatically runs `npm run check`, normalizes Windows file paths in `coverage/lcov.info`, and maps to your local SonarQube container at `http://localhost:9000`)._

---

## Quality Gate & Review Summary (Stage 22)

Automated tests, static analysis, and SonarQube review confirm final quality metrics:

- **Automated tests:** 232 / 232 Vitest tests passing (100%) across 21 specification files.
- **Code coverage:** 84.84% Vitest line coverage (83.33% statement coverage, 74.02% branch coverage).
- **Duplication density:** Reduced from 10.8% baseline down to 3.0% overall and 1.98% on new code (meeting the <= 3.0% threshold).
- **Reliability and security:** 0 bugs, 0 vulnerabilities, 0 security hotspots.
- **Static analysis:** 0 ESLint warnings (`--max-warnings=0`), 100% Prettier formatting compliance, 0 `vue-tsc` type-checking errors, and clean production Vite bundle compilation.
- **Quality improvements:** Refactored complex checkout validation into reactive sub-checks (`isCartValid`, `isAddressValid`, `isPaymentValid`) and added `isValidCheckoutPayload` type guard. Added interaction tests covering checkout error recovery (401 redirect, 500 session recovery/retry button, and multi-field backend error formatting).

---

## Full Regression & End-to-End Workflows (Stage 21)

End-to-end browser workflows (`src/__tests__/EndToEndWorkflows.spec.ts`) exercise both customer and administrator journeys against a repeatable test dataset across Pinia stores and router views. The test suite covers:

- **Catalog and discovery:** Browsing book listings, keyword searching, category filtering, product detail views with multi-image navigation, and edition format selection (`PAPERBACK`, `HARDCOVER`, `EBOOK`, `AUDIOBOOK`).
- **Cart and wishlist:** Persisting format choices across cart operations, updating quantities, calculating line/order totals, and adding/removing wishlist items.
- **Address book and payment methods:** Managing shipping addresses and simulated payment methods with validation and default flags.
- **Checkout and order confirmation:** Order review with fingerprint verification, placing orders with delivery addresses and simulated payments, and viewing confirmation receipts.
- **Order history and profile:** Viewing historical order summaries and inspecting order details, with regression coverage verifying selected book formats are preserved in order details.
- **Administrator management and RBAC boundaries:** Rejecting unauthenticated and customer attempts to access `/admin`, overview dashboard business metrics, product inventory management, category management, order fulfillment status updates, customer directory, and administrator profile management.

---

## Application Layout & Route Architecture

### Public & Customer Routes

| Path                         | Description                                                         | Access   |
| ---------------------------- | ------------------------------------------------------------------- | -------- |
| `/`                          | Homepage with featured books, category highlights, and hero banner  | Public   |
| `/products`                  | Catalog browsing with search, category filters, and pagination      | Public   |
| `/products/:id`              | Book details, multi-image gallery, and edition format selector      | Public   |
| `/categories`                | List of all bookstore categories                                    | Public   |
| `/categories/:id`            | Filtered book listing within a specific category                    | Public   |
| `/cart`                      | Shopping cart with format-aware quantity controls and server totals | Customer |
| `/checkout`                  | Checkout review, shipping address selection, and payment options    | Customer |
| `/checkout/confirmation/:id` | Order confirmation receipt with immutable snapshot details          | Customer |
| `/orders`                    | Order history listing with status badges and timestamps             | Customer |
| `/orders/:id`                | Detailed purchase order view with snapshot delivery & items         | Customer |
| `/addresses`                 | Shipping address book with default selection                        | Customer |
| `/payment-methods`           | Saved simulated payment cards with default selection                | Customer |
| `/wishlist`                  | Saved favorite books                                                | Customer |
| `/profile`                   | Customer profile management (name, phone, password update)          | Customer |
| `/login`                     | Customer authentication                                             | Public   |
| `/register`                  | Customer self-registration                                          | Public   |
| `/forgot-password`           | Password recovery token request                                     | Public   |
| `/reset-password`            | Set new password via reset token                                    | Public   |
| `/contact`, `/faq`, `/terms` | Informational store pages with accessible disclosure controls       | Public   |

### Administrator Back-Office Routes (`/admin/**`)

All routes under `/admin/**` require an authenticated account with the `ADMIN` role. Unauthenticated requests are redirected to `/admin/login`; unauthorized customer accounts receive an access-denied view.

| Path                | Description                                                          |
| ------------------- | -------------------------------------------------------------------- |
| `/admin`            | Dashboard with business KPI cards and recent order activity          |
| `/admin/login`      | Dedicated administrator login portal                                 |
| `/admin/products`   | Product inventory management, stock controls, and archive actions    |
| `/admin/categories` | Category management with inline cover upload and visibility toggles  |
| `/admin/orders`     | Order fulfillment management with allowed state transitions          |
| `/admin/orders/:id` | Order fulfillment detail view with customer contact & snapshot items |
| `/admin/customers`  | Read-only directory of registered customers with purchase metrics    |
| `/admin/profile`    | Administrator profile and password management                        |

---

## Recommended Editor & Browser Setup

- **IDE:** [VS Code](https://code.visualstudio.com/) with the [Vue - Official (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) extension (disable Vetur).
- **TypeScript Support:** `vue-tsc` provides build-time type verification.
- **Browser DevTools:** Install [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd) for Pinia state inspection and component hierarchy debugging.
