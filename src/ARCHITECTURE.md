# WebTrak frontend architecture

## Layout

```
src/
├── app/                    # Next.js App Router (thin route files only)
├── components/             # All reusable & feature UI
│   ├── dashboard/
│   ├── learning-development/
│   ├── allocation/
│   ├── reports/
│   └── shared/             # Cross-feature UI (e.g. WebTrakBrand)
├── context/                # React context providers (AuthContext)
├── hooks/                  # Shared hooks
│   └── learning/           # Learning & development hooks
├── services/               # API / backend access (hrms, employeeApi)
├── api/                    # HTTP client, endpoints, errors
├── utils/                  # Pure helpers (formatters, transforms)
│   ├── dashboard/
│   └── learning/
├── constants/              # Static config, enums, route maps
├── types/                  # TypeScript types & interfaces
└── lib/                    # App-level libraries (e.g. auth helpers)

public/
└── assets/
    ├── icons/              # SVG icons
    └── images/             # PNG/wordmarks
```

## Path alias

`@/*` → `src/*` (see `tsconfig.json`).

## Conventions

| Concern | Location |
|--------|----------|
| Routing | `src/app/**/page.tsx` — compose clients, no business logic |
| UI | `src/components/{feature}/` |
| API calls | `src/services/*.service.ts` |
| HTTP plumbing | `src/api/` |
| Helpers | `src/utils/` |
| Config / enums | `src/constants/` |
| Types | `src/types/` |
| Auth session | `src/context/AuthContext.tsx`, `src/lib/auth.ts` |

## Dashboard modules

Each module: `src/app/(protected)/dashboard/{module}/page.tsx` → `src/components/dashboard/{module}/*PageClient.tsx`.

Navigation uses real URLs via `src/constants/routes.ts` and `DashboardNavContext` (pathname-based).

## Learning & development

Same pattern: thin pages under `src/app/.../learning-development/`, clients under `src/components/learning-development/`.

## Incremental cleanup

Large legacy `*PageClient` files still hold module state; prefer extracting:

- types → `src/types/{module}.ts`
- constants → `src/constants/{module}.ts`
- helpers → `src/utils/{module}/`
- sub-UI → `src/components/{feature}/sections/`

without changing behavior.
