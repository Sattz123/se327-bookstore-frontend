# bookstore-frontend

## Administrator customers (Stage 18)

Open **Customers** in the back-office sidebar (`/admin/customers`) to search names/emails and view contact details, join dates, non-cancelled order counts and total order values. The list is paginated and read-only, matching the original scope. Pending orders are included in order value; this is not a revenue report. Administrators are excluded from the customer list.

## Administrator categories (Stage 17)

Open **Categories** in the back-office sidebar (`/admin/categories`). Create/edit the name, visibility and optional image in one form; selecting an image shows a preview and uploads it with **Save category**. Existing image URLs and image removal are supported. Category images also appear in storefront category cards, with an initial-letter fallback for missing images.

The table supports name/visibility filtering, product counts and Hide/Show. Hiding a category also hides its books from browsing. Deleting requires confirmation and is blocked while any products (including archived ones) remain; use the product editor to reassign them, then reload categories. Server conflicts preserve form drafts and offer reload. Image/name/visibility changes save in one request, including during initial category creation.

## Product images (Stage 16)

In **New product**, select and preview up to five images before saving. **Save product** creates the book and uploads those images in order, carrying forward the returned product version after each upload. The first image is the cover. If an upload fails after creation, the saved book remains open for recovery instead of creating a duplicate; check its saved images and add any missing files.

Edit an existing product to upload, preview, replace or remove images. Each PNG/JPEG must be at most 5 MB and 4096×4096 pixels. These image operations save immediately and preserve other unsaved form fields. Canceling the product form does not undo saved image changes. Image updates use the same product-version checks as inventory; reload the editor if the server reports a conflict.

Uploaded image URLs work in the storefront's cover components and product gallery. Select a thumbnail (or use left/right arrows while focused in the thumbnail list) to change the main image. Missing files show the existing cover fallback. The backend upload directory must be retained across restarts.

## Administrator products (Stage 15)

Open **Products and inventory** in the back-office sidebar (`/admin/products`). Search by title/author, filter by category or visibility, and page through all books, including hidden ones. Create/edit title, author, description, price, stock, category, formats and visibility. Each table row supports a quick stock update and Hide/Show; Archive asks for confirmation and retains the record and order history. Hidden categories are labeled because they also hide their books from the storefront.

Updates send the product version. If another edit or checkout changed it, the server returns a conflict and keeps the draft; reload the product to discard edits and use the latest version. Existing images are preserved. Image upload controls are added separately in Stage 16.

## Administrator access (Stage 14)

Open `/admin/login` (also linked from the normal sign-in page). Administrator accounts use the same login API as customers. An administrator signing in normally is sent to `/admin` by default; the storefront header includes a **Back office** link. Customer credentials are rejected by the administrator sign-in flow without granting access.

The `/admin` layout has an Overview sidebar, storefront/account links, and sign-out. Each administrator navigation validates the JWT against the protected `/api/admin/session` endpoint instead of trusting the saved browser role. Guests go to administrator login with a return URL; customers receive an access-denied page. The backend enforces roles independently. Logout/role changes remove the private layout. Product/inventory management will be added in Stage 15.

## Customer order history (Stage 13)

Use **Orders** in the signed-in header to open `/orders`. Purchases appear newest first with their date, payment display, saved total and Pending/Completed status. Open an order to view `/orders/:id`, including the original titles, formats, quantities, prices and delivery details. Checkout confirmation links to that order and the full history. Both routes require login; empty history, loading, unavailable orders and retry states are handled. Order data is cleared on account changes.

## Checkout (Stage 12)

Proceed from the cart to `/checkout`, select a saved delivery address and either cash on delivery or a saved simulated card, then review the server-priced items and total. Cash creates a pending order; simulated card payment creates a completed order without a real charge. Confirmation at `/checkout/confirmation/:id` reloads saved order snapshots and is owner-only.

Price/cart changes or stock conflicts stop the purchase and require a fresh review. Errors preserve the cart. After a lost response, **Retry order** reuses the exact payload and UUID to recover the original result. The pending request is retained in session storage for that customer across page reloads; choices remain locked until the server resolves it. A successful checkout clears the pending key and refreshes the cart count. Account changes clear private screen data and ignore earlier responses.

## Shopping cart (Stage 11)

On a book's detail page, choose an offered format and a positive whole quantity, then add it to the cart. Guests are sent to login with a return URL. The authenticated `/cart` page supports quantity updates and removal. The header count includes quantities across every line.

The cart is saved by the backend for the signed-in customer, including the selected format. Adding the same book/format increases the existing quantity; other formats create separate lines. All formats share the book's stock limit. Totals and prices come from the server, and stock is not reserved. Unavailable saved selections remain visible for correction/removal. Checkout is implemented separately in Stage 12.

The Pinia store clears private cart data on account changes/logout and ignores responses from an earlier session. API errors keep existing items and edits visible, with retry feedback.

## Simulated payment methods (Stage 10)

Signed-in users open **Payment methods** in the header or `/payment-methods`. Add fake provider/cardholder details, the last four digits only, expiry month/year, and an optional default flag. Cards are displayed masked; full card numbers and CVVs are not requested. This feature stores display records only and does not charge anything.

The page supports list/add/delete/default selection, loading/retry, validation feedback, delete confirmation, and duplicate-action prevention. Failed saves retain the draft. Changing accounts discards private records and drafts and ignores late responses. Deleting the default leaves no default until the user chooses another. Backend migration V8 is required. The existing authenticated Axios client and route guards are reused.

## Address book (Stage 9)

Signed-in users can open **Addresses** in the header or visit `/addresses`. The page lists delivery addresses, marks the default, and offers add/edit forms, default selection, and delete confirmation. It uses `AddressService` and the existing authenticated Axios client; no address owner ID is sent by the browser.

Label, recipient name, and address line are required. Phone, city, province/state, and postal code are optional, matching the original address book. Forms enforce the backend's length limits, preserve edits after a failed save, and show server validation errors. Pending actions disable duplicate submissions. Loading/error/retry states are included, and changing accounts or leaving the view discards stale responses and address drafts.

The backend guarantees at most one default per customer. Deleting the default, or clearing its checkbox while editing, leaves no default until another is chosen. After successful changes the list is reloaded from the server. Route guards send guests to sign-in with a return URL. Start the backend with migration V7 available before using this page.

`AddressBook.spec.ts` covers route protection, list/loading/empty/error states, add/edit/cancel, validation failures and preserved drafts, duplicate submission prevention, default switching, confirmed deletion, missing/ownership errors, expired auth, and stale responses across account changes. `AddressService.spec.ts` checks the real Axios request configuration with a controlled adapter. Both run in the existing `npm run check` workflow.

Vue 3, TypeScript, and Tailwind frontend for the bookstore reimplementation.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

On first setup, copy `.env.example` to `.env` in this frontend folder (PowerShell: `Copy-Item .env.example .env`). Keep your existing `.env` if it already exists. Commit the example and `package-lock.json`; `.env` is ignored by Git.

### Backend connection

`VITE_BACKEND_URL` sets the Axios base URL and defaults to `http://localhost:8080/api` when absent. This is the frontend's own setting; it does not read the backend's `.env`. Restart Vite after changing it. Vite includes `VITE_` settings in the browser bundle, so they must not contain secrets. Production builds use the value present when building.

`ProductService` uses the shared Axios client to request `GET /products`, `/products/featured`, and `/products/{id}`. `CategoryService` requests `/categories`. With the example configuration these resolve under `http://localhost:8080/api`. Run the backend and its PostgreSQL database alongside Vite. The backend's local `dev` profile provides the five categories, 60 books, and covers.

The client accepts JSON responses and uses a 10-second timeout. Feature services handle responses and errors as they are implemented.

The development server uses `http://localhost:5173` and stops if that port is occupied. The backend's `FRONTEND_ORIGIN` must match this origin for browser API requests.

### Tailwind CSS

Tailwind is installed through its Vite plugin. `src/assets/main.css` imports Tailwind and is loaded by `src/main.ts`. Use utility classes in Vue templates to style the application.

### Application layout and routes

`App.vue` contains the shared `AppHeader`, main `RouterView`, and `AppFooter`. Navigation wraps on narrow screens and highlights the current page. Keyboard users can skip directly to the main content.

| Path              | Current page                         |
| ----------------- | ------------------------------------ |
| `/`               | Featured/newest books and categories |
| `/products`       | Live book catalog                    |
| `/products/:id`   | Book details                         |
| `/categories`     | Visible category list                |
| `/categories/:id` | Books within a category              |
| `/contact`        | Contact placeholder                  |
| Any unmatched URL | Not-found page with a link home      |

Contact still uses `ComingSoonView.vue` and will be replaced in a later stage. Pinia remains installed for future feature stores; the generated counter example has been removed.

### Book catalog

`src/types/catalog.ts` matches the backend's product/category DTOs. `ProductListView` displays a responsive grid of `BookCard` components; selecting a card opens `ProductDetailView`. Detail pages show the author, category, description, price, stock, formats, and ordered covers. Prices use dollars to match the original bookstore.

The home page shows the newest eight visible books as featured books and links to visible categories. `/categories` lists categories, and `/categories/2` shows books in that category. Category cards use initials because the original category image files were unavailable.

Search matches title or author. The URL stores `q`, `categoryId`, and the one-based `page`; category pages use the category ID in the path. For example, `/products?q=harry&categoryId=2&page=1` or `/categories/2?q=harry`. Search/filter submission resets to the first page. Previous/Next preserve the other filters, and refresh/Back restore the selected query. The server returns `{content, page, size, totalElements, totalPages}` with a fixed 15 books per page, newest first. Invalid URLs show a reset option; a valid page beyond the last provides a link to the first page. Missing or hidden categories display a category-not-found message.

Both views display loading, failure/retry, and empty or missing-book states. Hidden books and books in hidden categories are omitted by the backend. Out-of-stock books remain viewable. Route changes cancel old requests so a delayed response cannot replace the next book. `BookCover` resolves image paths against the API's backend origin and shows a fallback when no cover is available or an image fails.

To try it locally, start the backend with its development profile, run `npm run dev`, visit `/products`, and select a book. Refreshing `/products/1` also loads the detail directly. There are no cart or checkout controls at this stage.

Routes use browser history. Vite handles direct visits and refreshes during development; the production host must serve `index.html` for frontend routes. See [Vue Router history mode](https://router.vuejs.org/guide/essentials/history-mode.html).

References: [Tailwind with Vite](https://tailwindcss.com/docs/installation/using-vite), [Axios instances](https://axios-http.com/docs/instance), and [Vite environment settings](https://vite.dev/guide/env-and-mode).

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Linting, formatting, tests, and coverage

Run commands from this frontend folder. The component tests use Vitest, Vue Test Utils, and jsdom; they do not require PostgreSQL, the backend, or the Vite server.

| Command                 | What it does                                                                            |
| ----------------------- | --------------------------------------------------------------------------------------- |
| `npm run lint`          | Check Vue/TypeScript code with ESLint; warnings also fail the command                   |
| `npm run lint:fix`      | Apply available ESLint fixes                                                            |
| `npm run format:check`  | Check formatting without changing files                                                 |
| `npm run format`        | Format source, configuration, and documentation using Prettier                          |
| `npm run type-check`    | Check application, tooling, and test TypeScript                                         |
| `npm test`              | Run component tests once                                                                |
| `npm run test:watch`    | Rerun tests while editing                                                               |
| `npm run test:coverage` | Run tests and generate V8 coverage reports                                              |
| `npm run check`         | Run lint, formatting checks, type checks, tests with coverage, and the production build |

The layout tests mount the real application with a fresh in-memory router for each test. They check header/footer navigation, active links, direct route entry, placeholder pages, page titles, unknown URLs, and returning home from the 404 page. The catalog service is mocked so these tests make no network requests; jsdom's unsupported scrolling API is stubbed. `createBookstoreRouter` supplies the same route configuration to the app and tests; the running app keeps browser history.

`ProductCatalog.spec.ts` mounts the actual app/routes and covers list/detail success, loading, empty results, 404/invalid IDs, server/network failures and retries, optional fields, stock, cover selection/fallbacks, and cancellation of stale requests. `ProductService.spec.ts` uses a controlled Axios adapter to verify HTTP requests without a running server and checks display/image URL helpers. The existing `npm run check` CI job runs all tests and generates coverage.

`CatalogDiscovery.spec.ts` covers featured home sections, category lists/pages, loading/retries, combined URL filters, page navigation, Back navigation, resetting pages after search, empty/out-of-range results, invalid URL values, missing/hidden categories, and delayed search responses. Service tests also check query parameters and the featured/category endpoints. Backend integration tests independently enforce category visibility and 15-item pagination with PostgreSQL.

Coverage includes all TypeScript and Vue source files, including untested files. Test files and type declarations are excluded. Inspect statements, branches, functions, and lines in `coverage/index.html`; `coverage/lcov.info` is available for the later SonarQube setup, and `coverage/coverage-summary.json` contains totals. Reports and build output are ignored by Git. No coverage threshold is imposed at this step.

This is a foundation baseline, not evidence that the full bookstore is tested. The Axios client and application bootstrap may remain uncovered at this stage. jsdom tests do not verify responsive appearance, real browser history/refresh behavior, or live backend integration; those need browser/integration checks.

References: [Vitest coverage](https://vitest.dev/guide/coverage.html), [Vue Test Utils with Vue Router](https://test-utils.vuejs.org/guide/advanced/vue-router.html), [Vue ESLint configuration](https://eslint.vuejs.org/user-guide/), and [Prettier installation](https://prettier.io/docs/install).

### GitHub Actions CI

`.github/workflows/frontend-ci.yml` runs on pushes to any branch and on pull requests targeting `develop` or `main`.

The single job uses Node.js 24 with npm caching, installs the exact dependencies from `package-lock.json` using `npm ci`, and runs `npm run check`. A failed lint, formatting check, type check, test, or build fails the job.

The workflow provides `VITE_BACKEND_URL` directly, so your local `.env` is not needed. Current component tests do not make backend requests; PostgreSQL and the backend are not started in this job.

Commit and push this change on `chore/quality-setup` using Fork. On GitHub, open the frontend repository's **Actions** tab and select **Frontend CI**. The **quality-checks** job shows each command's results. Download the **frontend-coverage** artifact for the HTML report, LCOV file, and coverage summary. Reports are retained for seven days. The upload step attempts to save available coverage even after a failure; earlier failures may prevent reports from being generated.

Save an actual successful GitHub run as CI evidence after pushing. Local SonarQube analysis is run separately as described below.

Reference: [GitHub's setup-node action](https://github.com/actions/setup-node).

### Local SonarQube analysis

Use the existing local SonarQube Docker container at `http://localhost:9000`; start it with `docker start sonarqube` if stopped. A fresh machine needs its own SonarQube installation first.

First setup:

1. Log in and create a local project with key `se327-bookstore-frontend` and name `SE327 Bookstore Frontend`.
2. Select its built-in **Sonar way** quality gate. Record the actual gate conditions shown on the server as tool settings, not an invented course requirement.
3. Generate a **Project Analysis Token** for this frontend project under **My Account > Security**, with an appropriate expiry date.
4. Copy `.env.sonar.example` to `.env.sonar` and paste the token after `SONAR_TOKEN=`. Use unquoted `KEY=value` lines. This file is ignored by Git; do not put tokens in screenshots or the report.

With Docker Desktop and Node.js running, execute from this frontend folder:

```powershell
.\scripts\sonar.ps1
```

The script runs `npm run check`, normalizes Windows source paths in the generated LCOV file, and launches SonarSource's official scanner Docker image. It maps the server's `localhost` address to `host.docker.internal` for Docker Desktop. The source folder is mounted at `/usr/src`, and scanner downloads are cached in the `se327-sonar-scanner-cache` Docker volume. The scanner uses `sonar-project.properties` and imports `coverage/lcov.info`.

`sonar.qualitygate.wait=true` makes a failed gate fail the scan command. The script restores the prior token/server environment variables afterward. No extra scanner npm dependency is required.

Community Build provides one analysis stream per project, without separate feature-branch or pull-request reports. Normally scan the integrated `develop` snapshot. A pre-merge scan examines the current checkout but replaces that same Sonar project snapshot. Record the actual Git branch, commit, and any uncommitted source changes; the Sonar main-branch label does not prove that Git `main` was scanned.

GitHub-hosted CI cannot reach your laptop's local server. Build/test CI continues on GitHub; Sonar scans run manually here. Automatic scans would need a separately configured self-hosted runner or a reachable server. If added later, use GitHub Actions secrets for tokens.

After scanning, save the frontend dashboard's quality-gate result, coverage, findings, new-code definition, and actual gate conditions for the report. Coverage includes implementation source; test files and declarations are classified separately. Until a real scan completes, this is configuration rather than a successful analysis result.

References: [SonarScanner Docker usage](https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/scanners/sonarscanner#sonarscanner-from-docker-image), [LCOV coverage import](https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/test-coverage/javascript-typescript-test-coverage), and [SonarQube tokens](https://docs.sonarsource.com/sonarqube-community-build/user-guide/managing-tokens).
