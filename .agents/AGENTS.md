# Nuxt 3 Coding Conventions

These are binding rules for any AI agent editing this codebase. If a rule and a request conflict, follow the rule and flag the conflict instead of silently deviating.

## 1. Project Principles
- Always prioritize readability over brevity.
- Never introduce breaking changes unless explicitly requested.
- Reuse existing code before writing new code.
- Follow existing project patterns rather than introducing new ones.
- Add comments.
- Keep components focused on a single responsibility.
- Prefer explicit code over clever abstractions.
- Assume Vue 3 (Composition API, `<script setup>`) and Nuxt 3 unless the project shows otherwise.

## 2. Folder Structure
- `pages/`: Route-driven views (file-based routing) - Create when the content needs its own URL.
- `components/`: Reusable UI pieces - Create when the markup is used more than once, or is complex enough to isolate.
- `layouts/`: Page shells (header/footer/nav wrappers) - Create when multiple pages share the same overall structure.
- `composables/`: Reusable reactive logic (`useX`) - Create when stateful logic is needed in more than one component.
- `stores/`: Pinia stores - Create when state must be shared across unrelated components/pages.
- `utils/`: Pure, stateless helper functions - Create when logic has no reactivity and no side effects.
- `types/`: Shared JSDoc typedefs (`@typedef`) for editor autocomplete/hints - Create when a shape is documented and reused in more than one file.
- `server/api/`: Nuxt server API routes (backend endpoints) - Create when exposing a backend endpoint the app calls.
- `server/middleware/`: Server-side request middleware (runs on every server request) - Create when you need to intercept/modify requests before they hit routes.
- `middleware/`: Nuxt route middleware (runs before navigation, client+server) - Create when you need to guard or redirect a route.
- `plugins/`: Nuxt plugins (register libraries, inject globals) - Create when third-party libraries need app-level setup.
- `assets/`: Files that go through the build pipeline (processed CSS, images referenced in code) - Create when the asset needs compilation/optimization.
- `public/`: Files served as-is at the root URL (favicon, robots.txt) - Create when the asset must NOT be processed and needs a stable URL.

> [!IMPORTANT]
> Do not put server middleware logic in `middleware/` or route guards in `server/middleware/` — they run in different contexts.

## 3. File Naming
- Components: `kebab-case.vue` (e.g., `car-card.vue`, `image-gallery.vue`, `filter-sidebar.vue`)
- Dynamic route pages: `[id].vue`, `[...slug].vue`, `[[optional]].vue`
- Composables: `useX.js` (e.g., `useCars.js`, `useAuth.js`, `useFilters.js`)
- Utilities: `camelCase.js` (e.g., `formatPrice.js`, `truncateText.js`)
- Types: `camelCase.js` (e.g., `car.js`, `user.js`), one domain per file
- Tests: same name as the file under test, suffixed `.spec.js`
- **Never**: `helper.js`, `utils.js`, `misc.js` — these are dumping grounds; name files by what they do.

## 4. Variable Naming
- **Never**: `a`, `data`, `temp`, `obj`, `res`
- **Instead**: `carList`, `selectedBrand`, `isLoading`, `currentPage`, `apiResponse`, `filteredCars`
- Booleans: prefix `is`/`has`/`can`/`should` (e.g., `isLoading`, `hasError`, `canEdit`), never bare `loading`, `visible`, `errorFlag`
- Arrays: plural (e.g., `cars`, `users`, `images`)
- Objects: singular (e.g., `car`, `user`, `image`)
- Functions: verb-first (e.g., `fetchCars()`, `loadImages()`, `updateFilters()`), never a bare noun (e.g., `cars()`, `filter()`)
- Constants (module-level, never reassigned config values): `SCREAMING_SNAKE_CASE` (e.g., `MAX_PAGE_SIZE`)
- JSDoc typedefs: kebab-case, no `I` prefix (e.g., `Car`, not `i-car`)

## 5. Declaration Order (inside `<script setup>`)
1. imports
2. JSDoc typedefs used only in this file (if any)
3. `defineProps` / `defineEmits` / `defineOptions` / `definePageMeta` (these must appear before any other logic — Vue's compiler macros are hoisted and expected near the top)
4. route / router
5. stores
6. composables
7. `ref` / `reactive` state
8. `computed`
9. `watch` / `watchEffect`
10. lifecycle hooks
11. plain functions/methods
12. `defineExpose` (if the component exposes anything to a parent via template ref)

## 6. `ref` vs `reactive`
- Use `ref` for: numbers, strings, booleans, null, Date, arrays, and any object that gets fully replaced (not just mutated).
- Use `reactive` for: forms, filters, config objects, grouped related state that is mutated in place, never replaced wholesale.
- Never group unrelated state into one `reactive` blob (e.g. `reactive({ loading, cars, modal, page })`) — each concern gets its own `ref`.
- Destructuring: plain `reactive()` objects lose reactivity when destructured. Use `toRefs()` on a local reactive object, or `storeToRefs()` when pulling state out of a Pinia store, before destructuring.

## 7. Computed
- Use for: derived state only — `filteredCars`, `sortedCars`, `totalPrice`, `isFormValid`, `formattedPrice`.
- Never use for: API calls, async operations, mutations, or side effects. A computed must be pure — it must not set other refs.
- It's fine for a computed to build the parameters for an API call (e.g. assembling a filters object), as long as the fetch itself happens elsewhere (in a function or watch), not inside the computed getter.

## 8. Watch
- Use only when something external must happen as a reaction to a change: URL updates, API requests, analytics, saving drafts, debouncing, pagination, infinite scroll.
- If the handler is just deriving a new value from another ref, that's a computed, not a watch.
- Know the options: `immediate` (run once on setup), `deep` (watch nested mutations), `flush: 'post'` (run after DOM update). Stop a watcher by calling the function `watch()` returns when it's no longer needed (e.g. in `onUnmounted`), rather than leaving it running.

## 9. watchEffect
- Use rarely — only when the dependencies genuinely can't be listed explicitly. Otherwise prefer `watch()`, since it's clearer about what triggers it.

## 10. Methods
- Do one thing.
- Stay under ~40 lines; past that, extract a helper — this is a signal the function has more than one responsibility, not a hard technical limit.
- Return early instead of nesting if/else.

## 11. API Layer
- Never fetch directly inside a page or component (`pages/index.vue` calling `fetch(...)` directly).
- Flow: component → composable (`useCars()`) → repository → API
- The repository is a plain module (e.g. `repositories/carRepository.js`) that wraps `$fetch` calls for one resource and returns structured data (documented with a JSDoc `@typedef` if the shape is reused). It knows the endpoint URLs; nothing above it does.
- The composable owns reactive state (`loading`, `error`, `data`) and calls the repository, exposing state + actions to components.
- Always use Nuxt's `$fetch` (or `useFetch`/`useAsyncData` on pages, see Section 12) — not `axios` or raw `fetch`, unless the project already depends on `axios`.
- Every API-backed composable must expose: `loading`, `error`, and a way to distinguish "not yet loaded" from "loaded but empty."
- Base URLs and secrets come from `runtimeConfig` (see Section 23), never hardcoded.

## 12. Nuxt SSR
- Use SSR for: SEO pages, product pages, blog, listing pages, detail pages, landing pages.
- CSR is fine for: dashboard, admin, profile settings, analytics, internal tools.
- Use `useAsyncData()` for SSR-friendly fetching of custom logic.
- Use `useFetch()` for standard data fetching that integrates with Nuxt's data layer.
- Avoid plain `fetch()` in page components.
- For a route that needs a different rendering mode than the app default, use `routeRules` in `nuxt.config.js` (hybrid rendering) rather than ad-hoc workarounds.
- If a specific page must be client-only, use `definePageMeta({ ssr: false })`.
- Wrap client-only UI fragments in `<ClientOnly>` rather than skipping SSR for the whole page.

## 13. Client-Only Code
- Only reach for client-only handling when touching: `window`, `document`, `localStorage`, `sessionStorage`, `navigator`, `IntersectionObserver`, `ResizeObserver`.
- Guard with `import.meta.client` (Nuxt 3). Do not use `process.client` — it's the deprecated Nuxt 2 pattern.
- For a whole component/section that only makes sense in the browser, wrap it in `<ClientOnly>` instead of scattering guards.
- Otherwise, stay SSR-compatible by default.

## 14. State Management
- Use `ref`/`reactive` for local, single-component state.
- Use Pinia only for state genuinely shared across unrelated components/pages.
- Never create a store for a modal, a dropdown, or a single page's local filters — that's local state.
- Prefer setup-syntax stores (`defineStore('id', () => {...})`) for consistency with Composition API usage elsewhere.
- Store id = file name, kebab-case (`stores/carFilters.js` → id `"car-filters"`).

## 15. Lifecycle Hooks
- `onMounted`: browser-only logic only (measuring DOM, initializing a browser-only library). Not for initial API fetches that should support SSR — use `useAsyncData()`/`useFetch()` for those.
- `onUnmounted`/`onBeforeUnmount`: required whenever `onMounted` set up a listener, observer, timer, or manual `watch()` stop-handle — clean up what you created.

## 16. Performance
- Lazy-load routes/components that aren't needed on initial paint via dynamic `import()` or `defineAsyncComponent`.
- Use `@nuxt/image` for image optimization rather than raw `<img>` for content images.
- Virtualize long lists (100+ items) rather than rendering them all.
- Memoize expensive derived values with `computed` (it caches automatically) instead of recomputing in the template.
- Use `shallowRef`/`markRaw` for large objects that don't need deep reactivity (e.g. third-party class instances, big static datasets).

## 17. Components
- Max ~350 lines. Max 5 props. Max 3 emits.
- If a component legitimately needs more, split it into subcomponents rather than exceeding the limit — the limit is a signal to decompose, not a target to negotiate.
- Prefer slots over prop-drilling boolean flags to control child markup.

## 18. JavaScript
- For a JavaScript project — do not introduce `.ts`/`.vue` with `lang="ts"`, TypeScript syntax, or type annotations anywhere.
- Type props with the runtime `defineProps({...})` object syntax, including `type` and `required`/`default` for every prop — never the bare `defineProps(['car', 'loading'])` array form once a component has more than one or two trivial props.
- Type emits with the runtime `defineEmits(['update', 'delete'])` array (or object form with validators for emits that carry a payload needing validation).
- Use JSDoc comments (`@param`, `@returns`, `@typedef`) on composables, repository functions, and utils to document shapes and expected types for editor hints — this is the closest equivalent to TypeScript's benefits without adding TypeScript.
- Validate function inputs explicitly where correctness matters (API boundaries, form submission) instead of relying on a type system to catch mismatches.
- Never guess a data shape — inspect the actual API response or an existing JSDoc `@typedef` before writing code that consumes it.
- Use optional chaining (`?.`) when accessing nested properties that may be null/undefined (`car?.owner?.name`), instead of manual `&&` chains (`car && car.owner && car.owner.name`) or unguarded access that can throw.
- Pair it with nullish coalescing (`??`) when a fallback value is needed (`car?.price ?? 0`) — don't reach for `||` for this, since `||` also overrides valid falsy values like `0` or `""`.

## 19. Accessibility
- Every interactive element must be reachable and operable by keyboard (tab, enter/space), not just mouse/touch.
- Every image needs meaningful alt text (or `alt=""` if purely decorative).
- Every form input needs an associated `<label>`.
- Use semantic HTML elements (`<button>`, `<nav>`, `<main>`) over generic `<div>`s with click handlers.
- Add ARIA attributes only when semantic HTML can't express the state (e.g. `aria-expanded` on a custom dropdown).
- Visible focus states must not be removed (`outline: none` without a replacement is not allowed).

## 20. Error Handling
- Every API-backed operation must account for: loading, error, retry, empty, success states — not just the happy path.
- Throw/return errors from the server using Nuxt's `createError()`; a global `error.vue` page handles unrecoverable navigation errors.
- Within a component/composable, catch errors at the repository or composable layer and surface them as the error state described in Section 11 — don't let raw exceptions reach the template.
- User-facing errors get a message via the project's toast/notification pattern (if one exists) rather than `console.error` alone.

## 21. Styling Conventions
- State the project's styling approach explicitly before writing styles (Tailwind utility classes vs scoped `<style>` with SCSS/CSS — check `nuxt.config.js`/ `package.json` for which is installed; don't introduce a second system).
- If Tailwind: compose utility classes directly in templates; extract to a component when the class list becomes unreadable, not before.
- If scoped CSS/SCSS: use `<style scoped>` per component; avoid global style overrides outside a dedicated `assets/css` entry file.
- Class naming (when not using Tailwind): BEM-style (`car-card__title`, `car-card--highlighted`).
- No inline `style="..."` attributes except for computed/dynamic values that can't be expressed as a class.

## 22. Linting & Formatting
- Follow the project's existing ESLint and Prettier configs; do not introduce new rules or override existing ones without being asked.
- Run the lint/format check before considering a change complete; fix violations rather than disabling rules inline.
- Don't hand-format code to differ from what Prettier would produce — let the formatter decide, don't fight it with manual spacing/line breaks.

## 23. Environment & Config
- All secrets and environment-dependent values (API base URLs, keys) go through Nuxt's `runtimeConfig` in `nuxt.config.js`, sourced from `.env`.
- Never hardcode a URL, key, or environment-specific value directly in a component, composable, or repository.
- Public (client-exposed) config goes under `runtimeConfig.public`; anything that must stay server-only does not.
- Never commit `.env` files; only `.env.example` with placeholder keys.

## 24. Security
- Never use `v-html` on content that isn't sanitized/trusted — it's a direct XSS vector.
- Never store auth tokens in `localStorage` if the project has an httpOnly-cookie-based auth flow available; follow whatever the existing auth setup already does rather than introducing a new storage mechanism.
- Validate and sanitize all user input on the server side, even if it's also validated client-side — client validation is UX, not security.
- Never log sensitive data (tokens, passwords, PII) to the console or external logging services.

## 25. Form Validation
- Use the project's existing validation library if one is installed; if none exists and one must be introduced, prefer `vee-validate` (Vue-native, integrates with `<script setup>`) with Yup schemas (Zod is TypeScript-oriented and less idiomatic in a plain-JS project) — don't hand-roll validation logic when either is available.
- Validation schemas/rules live near the form or in a shared `schemas/`/`validation/` location, not inline scattered across the template.
- Every validated field surfaces its error state using the same pattern as Section 20 (loading/error/etc.) — consistent, not ad hoc per form.

## 26. Package Manager
- Use whichever lockfile already exists in the project (`pnpm-lock.yaml`, `yarn.lock`, or `package-lock.json`) to determine the package manager — never mix managers or add a second lockfile.
- If starting a new project with no existing lockfile, default to pnpm.
- Never run `npm install` in a project that has a `pnpm-lock.yaml` or `yarn.lock` (and the equivalent for other combinations) — it creates a conflicting lockfile.

## 27. AI Agent Rules
- Search for an existing component before creating a new one.
- Reuse composables whenever possible.
- Do not duplicate business logic.
- Match the project's naming conventions and file organization.
- Avoid introducing new dependencies unless explicitly requested.
- Do not guess API shapes or data models — inspect existing types or interfaces first.
- Prefer SSR-compatible solutions in Nuxt unless the feature is inherently client-only.
- Ask for clarification rather than making assumptions when requirements are ambiguous.
- When a rule in this document conflicts with a pattern already present in the codebase, follow the existing codebase pattern and flag the discrepancy rather than silently picking one.
