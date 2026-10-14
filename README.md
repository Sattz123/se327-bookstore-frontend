# bookstore-frontend

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

Import the shared client from `@/services/apiClient` in future API services. For example, `apiClient.get('/products')` will request `http://localhost:8080/api/products` with the example configuration. Product endpoints will be added in a later stage.

The client accepts JSON responses and uses a 10-second timeout. Feature services handle responses and errors as they are implemented.

The development server uses `http://localhost:5173` and stops if that port is occupied. The backend's `FRONTEND_ORIGIN` must match this origin for browser API requests.

### Tailwind CSS

Tailwind is installed through its Vite plugin. `src/assets/main.css` imports Tailwind and is loaded by `src/main.ts`. Use utility classes in Vue templates to style the application.

### Application layout and routes

`App.vue` contains the shared `AppHeader`, main `RouterView`, and `AppFooter`. Navigation wraps on narrow screens and highlights the current page. Keyboard users can skip directly to the main content.

| Path              | Current page                    |
| ----------------- | ------------------------------- |
| `/`               | Basic welcome page              |
| `/products`       | Books placeholder               |
| `/categories`     | Categories placeholder          |
| `/contact`        | Contact placeholder             |
| Any unmatched URL | Not-found page with a link home |

The placeholders share `ComingSoonView.vue` and will be replaced as each feature is implemented. This layout makes no backend requests yet. Pinia remains installed for future feature stores; the generated counter example has been removed.

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

The layout tests mount the real application with a fresh in-memory router for each test. They check header/footer navigation, active links, direct route entry, placeholder pages, page titles, unknown URLs, and returning home from the 404 page. Only jsdom's unsupported scrolling API is stubbed. `createBookstoreRouter` supplies the same route configuration to the app and tests; the running app keeps browser history.

Coverage includes all TypeScript and Vue source files, including untested files. Test files and type declarations are excluded. Inspect statements, branches, functions, and lines in `coverage/index.html`; `coverage/lcov.info` is available for the later SonarQube setup, and `coverage/coverage-summary.json` contains totals. Reports and build output are ignored by Git. No coverage threshold is imposed at this step.

This is a foundation baseline, not evidence that the full bookstore is tested. The Axios client and application bootstrap may remain uncovered at this stage. jsdom tests do not verify responsive appearance, real browser history/refresh behavior, or live backend integration; those need browser/integration checks.

References: [Vitest coverage](https://vitest.dev/guide/coverage.html), [Vue Test Utils with Vue Router](https://test-utils.vuejs.org/guide/advanced/vue-router.html), [Vue ESLint configuration](https://eslint.vuejs.org/user-guide/), and [Prettier installation](https://prettier.io/docs/install).

### GitHub Actions CI

`.github/workflows/frontend-ci.yml` runs on pushes to any branch and on pull requests targeting `develop` or `main`.

The single job uses Node.js 24 with npm caching, installs the exact dependencies from `package-lock.json` using `npm ci`, and runs `npm run check`. A failed lint, formatting check, type check, test, or build fails the job.

The workflow provides `VITE_BACKEND_URL` directly, so your local `.env` is not needed. Current component tests do not make backend requests; PostgreSQL and the backend are not started in this job.

Commit and push this change on `chore/quality-setup` using Fork. On GitHub, open the frontend repository's **Actions** tab and select **Frontend CI**. The **quality-checks** job shows each command's results. Download the **frontend-coverage** artifact for the HTML report, LCOV file, and coverage summary. Reports are retained for seven days. The upload step attempts to save available coverage even after a failure; earlier failures may prevent reports from being generated.

This step prepares the workflow; save an actual successful GitHub run as CI evidence after pushing. SonarQube analysis will be added separately.

Reference: [GitHub's setup-node action](https://github.com/actions/setup-node).
