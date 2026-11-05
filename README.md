# MagicReview AI

The landing page is preserved at `/`; invited users enter the live application at
`/login`, and anonymous review links open `/r/:code`.

Read [the frontend guide](docs/frontend-integration.md) for VITE_API_URL, sessions,
onboarding, public QR routing and known limits. Read [the implementation report](docs/frontend-implementation-report.md)
for validation results and a complete file inventory. Backend contracts are in
`backend/docs/`. No production configuration or deployment is implied.

Install frontend and backend dependencies separately with `npm ci` and
`npm --prefix backend ci`. Run `npm run dev` for the frontend and a separately
configured local `npm run dev:api` for the backend. Production remains
`npm run build` / `npm start`.

Tests: `npm test`, `npm run test:browser` (installed Chrome), and after building,
`npm run test:server`. Backend disposable MariaDB suites are documented in the report.

## Original Vite starter notes

### React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
