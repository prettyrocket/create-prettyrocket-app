# PrettyRocket App

Scaffolded with [create-prettyrocket-app](https://www.npmjs.com/package/create-prettyrocket-app):
Vite + React + TypeScript + MUI, deployed to GitHub Pages.

Requires Node 22 or newer.

## Scripts

| Command             | What it does                                   |
| ------------------- | ---------------------------------------------- |
| `npm run dev`       | Start the dev server                           |
| `npm run build`     | Type-check and build to `dist/`                |
| `npm run preview`   | Serve the production build locally             |
| `npm test`          | Run tests once (`npm run test:watch` to watch) |
| `npm run lint`      | ESLint                                         |
| `npm run format`    | Prettier (write); `format:check` to verify     |
| `npm run typecheck` | TypeScript only                                |

## Layout

```
src/
├─ main.tsx              # providers: React Query → MUI theme → router
├─ routes.tsx            # route table + navItems for the app bar
├─ theme.ts              # MUI theme; change ACCENT first
├─ api.ts                # fetchJson + example query (useLinks)
├─ queryClient.ts        # TanStack Query defaults
├─ layouts/RootLayout.tsx
├─ pages/                # one component per route
├─ components/           # shared components (ErrorPage, ColorModeToggle)
├─ hooks/                # useLocalStorage
└─ test/                 # setup + renderWithProviders / renderRoute helpers
public/                  # served as-is (favicon, links.json)
```

- **App title:** `VITE_APP_TITLE` in `.env` (browser tab and app bar).
- **Add a page:** create it in `src/pages/`, add a route in `routes.tsx`, and
  add it to `navItems` if it belongs in the app bar.
- **Imports:** use `@/` for anything under `src/`.
- **Example content:** the Home page's click counter and docs list show the
  patterns below; delete them (and `public/links.json`) when you start.

## Theme and dark mode

`src/theme.ts` sets one `ACCENT` color; dark mode uses a lighter shade of it so
links stay readable. Add other palette values per scheme under
`colorSchemes.light` / `colorSchemes.dark`.
The app bar toggle cycles **system → light → dark**, and MUI remembers the
choice in localStorage. Use theme values (`color="text.secondary"`,
`sx={{ bgcolor: 'background.paper' }}`) rather than hex colors so both schemes work.

## Data

**Saved state** — `useLocalStorage(key, initial)` works like `useState` but
persists as JSON and syncs across tabs. Like `useState`, only the first
`initial` is used, so inline `[]`/`{}` is fine. If the browser refuses to save
(storage full or blocked), the value still works until the page reloads:

```tsx
const [favorites, setFavorites] = useLocalStorage<string[]>('favorites', []);
```

**Fetching** — use TanStack Query with `fetchJson` from `src/api.ts` (it throws
an `HttpError` with `.status` on non-2xx responses, so errors reach `isError`).
Paths like `links.json` or `/data/items.json` load files from `public/`;
absolute URLs call APIs directly. Queries retry network and server errors
twice, but not 4xx responses:

```tsx
export function useThings() {
  return useQuery({
    queryKey: ['things'],
    queryFn: () => fetchJson<Thing[]>('https://api.example.com/things'),
  });
}
```

GitHub Pages is static hosting: an API you call from the browser must allow
CORS, and anything in the code or `.env` is public, so never put secrets there.
React Query Devtools (a floating button, bottom-left) appear in `npm run dev` only.

## Testing

Tests live next to the code as `*.test.ts(x)`. Helpers in `src/test/render.tsx`:

- `renderWithProviders(<Component />)` renders with the theme and a fresh
  QueryClient, and returns `user` (a userEvent instance) for interactions.
- `renderRoute('/about')` renders the whole app (layout + routes) at a path,
  and returns the `router` so you can assert on `router.state.location`.

`fetch` is stubbed in every test and answers 404 unless you mock it, so tests
never hit the network:

```tsx
vi.mocked(fetch).mockResolvedValueOnce(Response.json([{ id: 1 }]));
```

localStorage is cleared and mocks are restored after each test.

## Deploying

Pushing to `main` runs `.github/workflows/deploy.yml`: lint, format check,
tests, build, then deploy to GitHub Pages at `https://<user>.github.io/<repo>/`.
Pull requests run the same checks without deploying.
If Pages isn't enabled yet: **Settings → Pages → Source: GitHub Actions**.

How the pieces fit:

- **Base path.** A project site is served from `/<repo>/`, so the workflow
  builds with `BASE_PATH=/<repo>/`; Vite prefixes asset URLs with it and the
  router uses it as its basename. For a **custom domain** or a
  `<user>.github.io` repo the site is at the root: change the workflow to
  `BASE_PATH: /`.
- **`404.html`.** GitHub Pages has no SPA fallback: opening `/<repo>/about`
  directly would 404. The workflow copies `index.html` to `404.html`, so Pages
  serves the app for unknown paths and the router takes over. Keep that step.
- **Preview the Pages build locally:**
  `BASE_PATH=/<repo>/ npm run build && npm run preview`, then open
  `http://localhost:4173/<repo>/`. (In Git Bash on Windows, prefix with
  `MSYS_NO_PATHCONV=1` so the path isn't rewritten.)

## Bundle size

`vite.config.ts` puts React and MUI's styling runtime in their own chunks,
which stay cached between deploys and keep the main chunk under Vite's 500 kB
warning. If you add a large library (charts, editors, maps), load the page that
uses it lazily in `routes.tsx`, and the library ships in that page's chunk:

```tsx
{
  path: 'charts',
  lazy: async () => ({ Component: (await import('@/pages/ChartsPage')).ChartsPage }),
},
```

Don't add a chunk group for it: a group captures a library even when only a
lazy page imports it, so it would load up front again.

## Dependencies

Dependabot (`.github/dependabot.yml`) opens weekly PRs: minor/patch updates
grouped by area, majors one at a time, and security fixes grouped together.
New releases wait 3 days before being proposed. CI runs on each PR, so a green
grouped PR is usually safe to merge; read the changelog before merging a major.
