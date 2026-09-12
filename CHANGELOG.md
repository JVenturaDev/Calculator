# Changelog

All notable changes to Calculator are documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.0] - 2026-09-11

### Added

- Basic, scientific, and graphic calculator modes with keyboard input, angle modes, complex numbers, history, and memory.
- A controlled computer algebra system supporting simplification, canonicalization, selected expansion and factorization, differentiation, integration, equation solving, limits, series, and convergence analysis.
- Exact rational arithmetic and typed errors for symbolic operations outside the supported scope.
- Quick 2D/3D plotting and a persistent multi-function Graph Workspace with line, contour, and supported surface rendering.
- Interactive graph selection, hover, legend controls, viewport persistence, 3D camera persistence, and reset actions.
- Scientific calculation workspaces with expressions, tags, calculation cards, and Human, Book, and Tree step renderers.
- JWT login, registration, guest access, route protection, and an isolated GitHub Pages offline guest mode.
- Spring Boot workspace API backed by PostgreSQL.
- GitHub Pages deployment with SPA fallback and lazy-loaded Plotly GL3D support.

### Changed

- Migrated the frontend to Angular standalone components and reactive state services.
- Unified numeric, symbolic, history, restoration, and display contracts across calculator modes.
- Versioned Graph Workspace persistence and added migration support for earlier snapshots.
- Optimized Plotly delivery by keeping the cartesian bundle separate from the lazy GL3D bundle.
- Improved responsive calculator, workspace, graph canvas, function-list, and inspector layouts.

### Fixed

- Stabilized calculator display focus, mobile scrolling, virtual-keyboard behavior, and access to the equals action.
- Normalized new workspace items, calculations, dates, steps, and complex values before immediate rendering.
- Corrected incomplete Tree renderer links after serialized complex values were reconstructed.
- Hardened offline demo storage recovery and preserved in-memory state when browser storage is unavailable or full.
- Fixed symbolic canonicalization, exact rational output, solver/integrator regressions, and history metadata restoration.
- Completed release regression coverage across numeric calculation, CAS commands, graphing, persistence, and responsive UI behavior.

[0.1.0]: https://github.com/JVenturaDev/Calculator/tree/v0.1.0
