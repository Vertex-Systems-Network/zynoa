# apps/

Deployable applications. Each is created by its own Phase 0 work unit — do not add an app before its work unit starts.

| App             | Created in | Purpose                             |
| --------------- | ---------- | ----------------------------------- |
| `site/`         | WU-P0-08   | Marketing website (Next.js)         |
| `web/`          | WU-P0-07   | Dashboard (Next.js)                 |
| `api/`          | WU-P0-06   | Fastify HTTP API + SSE              |
| `worker/`       | WU-P0-09   | Temporal workers (TypeScript)       |
| `media-worker/` | Phase 4    | Python Temporal activities (FFmpeg) |
| `desktop/`      | Phase 3    | Tauri 2 shell for Windows/macOS     |
| `mobile/`       | Phase 5    | Expo app for iOS/Android            |

Layout and rules: `docs/plan/REPOSITORY.md`.
