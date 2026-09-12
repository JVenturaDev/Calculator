# Calculator Frontend

This directory contains the Angular 20 frontend for [Calculator](../README.md). It implements the calculator UI, numeric and symbolic orchestration, browser persistence, quick plotting, the Graph Workspace, authentication flows, and the GitHub Pages offline demo.

Repository-wide setup, backend details, deployment status, and release information live in the [root README](../README.md).

## Development Setup

From `front-end/`:

```powershell
npm install
npm start
```

The development server runs at [http://localhost:4200](http://localhost:4200). `proxy.conf.json` forwards relative `/auth` and `/api` requests to `http://localhost:8080`; start the backend separately when testing real authentication or authenticated workspaces.

## Commands

```powershell
# One-shot Karma/Jasmine suite in Chrome Headless
npm test -- --progress=false --watch=false

# Interactive test watch mode
npm run test:watch

# Angular and TypeScript checks
npx ngc -p tsconfig.app.json
npx tsc --noEmit -p tsconfig.app.json
npx tsc --noEmit -p tsconfig.spec.json

# Production build
npm run build
```

Production output is written to `dist/angular-calculator/`.

## Application Architecture

The application uses standalone Angular components configured from `src/app/app.config.ts` and routed through `src/app/app.routes.ts`. The main protected routes are:

| Route | Purpose |
| --- | --- |
| `/login` | Real login and guest entry |
| `/register` | Account registration and guest entry |
| `/main` | Basic, scientific, and graphic calculator shell |
| `/graph-workspace` | Independent multi-function Graph Workspace |

`/main` and `/graph-workspace` use the same authentication guard. A real JWT session or an allowed GitHub Pages demo session can satisfy that guard.

### Calculator State and Evaluation

- `services/calculator-state/` exposes the calculator facade and shared calculation state.
- `services/engine-services/` contains tokenization and numeric evaluation integration.
- `services/input-services/` coordinates display input and calculator controls.
- `services/history-services/` and `services/memory-services/` manage restorable history and calculator memory.
- `components/calculation-renderers-component/` renders Human, Book, and Tree calculation views.

Numeric expressions continue through the tokenizer/postfix/RPN engine. CAS command routing is explicit and does not intercept ordinary calls such as `sin(1)`, `sqrt(16)`, or `log(10)`.

### Calculator Modes

- **Basic** provides arithmetic input and standard calculator controls.
- **Scientific** adds scientific functions, RAD/GRAD/DEG modes, memory controls, and assisted CAS commands.
- **Graphic** adds calculator-driven plotting while retaining the shared evaluation, history, and display behavior.

The Inspector shell exposes History, Memory, and a transient quick graph. The quick graph supports compatible 2D lines/contours and lazy-loaded 3D surfaces without persisting Graph Workspace state.

## CAS Integration

`services/cas/` contains the CAS AST, parser, formatter, exact rational layer, simplifier/canonicalizer, differentiator, integrator, solver, limits, Taylor/Maclaurin series, convergence analysis, typed errors, and public API.

The calculator command router recognizes only the supported commands:

- `simplify`
- `expand`
- `factor`
- `diff` / `differentiate`
- `integrate`
- `solve`
- `limit`
- `taylor` / `maclaurin`
- `convergence`

The CAS has controlled mathematical scope. Unsupported families return typed errors; they are not silently approximated.

## Graph Workspace

`components/graph-workspace/` contains the page, 2D/3D canvases, reactive containers, and inspector. `services/graph-workspace/` contains the shared state facade, serializer/repository, sampling view models, and 2D/3D samplers.

The same functions, colors, visibility, and selection are shared between views:

- `line` functions render in 2D for supported expressions in `x`;
- `contour` functions render in 2D for supported expressions in `x` and `y`;
- compatible contour functions render in 3D as `z = f(x, y)` surfaces;
- line functions are intentionally unsupported in the 3D view.

The 2D cartesian Plotly bundle is static. The GL3D bundle is loaded through an isolated dynamic import only when a 3D canvas is mounted.

## Frontend Persistence

| State | Mechanism | Lifetime |
| --- | --- | --- |
| Calculation history | `localStorage` | Across browser sessions |
| Calculator memory | IndexedDB | Across browser sessions |
| Graph Workspace | Versioned `localStorage` repository | Across browser sessions |
| Demo scientific workspace | `sessionStorage` | Current tab session |
| JWT | `localStorage` | Until logout/removal |
| Offline demo marker | `sessionStorage` | Current tab session |

Graph Workspace snapshots restore dates and versioned state, including the current view, 2D viewport, 3D scene/camera, functions, and selection. The demo scientific workspace has a separate key and never synchronizes with the backend.

## Authentication and Offline Demo

Normal login, registration, backend guest access, and authenticated workspace operations use relative `/auth/*` and `/api/workspace/*` endpoints. The auth interceptor adds `Authorization: Bearer <token>` only for a real token.

Offline guest mode is deliberately restricted to `jventuradev.github.io/Calculator/`. In that environment it:

- creates a session-only demo marker rather than a fake token;
- never sends the demo marker as an Authorization header;
- prevents scientific Workspace HTTP calls and uses isolated `sessionStorage` instead;
- keeps Graph Workspace browser persistence separate from authenticated workspace data.

On localhost and other hosts, guest authentication retains the normal backend flow.

## Important Directories

```text
src/app/
|-- components/                # Standalone UI, pages, calculators, canvases, inspector
|-- guards/                    # Route access checks
|-- lib/                       # Low-level calculator modules
|-- services/
|   |-- calculator-state/      # Shared calculator facade/state
|   |-- cas/                   # Controlled computer algebra system
|   |-- graph-workspace/       # Graph domain, persistence, sampling, view models
|   |-- history-services/      # localStorage history
|   |-- memory-services/       # IndexedDB memory
|   |-- workspace-api-service/ # Backend HTTP client
|   `-- workspace-services/    # Scientific workspace state and demo storage
|-- app.config.ts              # Application providers
`-- app.routes.ts              # Login, registration, calculator, and graph routes
```

## GitHub Pages Build

The root workflow builds the frontend with base href `/Calculator/`, copies `index.html` to `404.html` for SPA deep-link fallback, verifies the favicon and base href, and deploys `dist/angular-calculator/`.

GitHub Pages is a static frontend demo. Real login, registration, and backend-persisted scientific workspaces require the Spring Boot API; the Pages guest path exists so supported calculator, CAS, graphing, and local workspace behavior can still be explored.
