# bookstore-frontend

This template should help get you started developing with Vue 3 in Vite.

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

| Path | Current page |
| --- | --- |
| `/` | Basic welcome page |
| `/products` | Books placeholder |
| `/categories` | Categories placeholder |
| `/contact` | Contact placeholder |
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
