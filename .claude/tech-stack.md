# CcACBP Tech Stack

## Runtime & Language

| Component | Choice | Version |
|-----------|--------|---------|
| Runtime | Node.js | 20+ (LTS) |
| Language | TypeScript | 5.x |
| Module System | ESM (`"type": "module"`) | — |

## Backend

| Component | Choice | Notes |
|-----------|--------|-------|
| Framework | Hono | Lightweight, fast, Web Standards API |
| Validation | Zod + @hono/zod-validator | Runtime type safety |
| ORM | Drizzle ORM | Type-safe, SQL-like, lightweight |
| Database | SQLite (via @libsql/client) | Simple, file-based, zero config, pure JS driver |
| Auth | TBD | — |

## Frontend

| Component | Choice | Notes |
|-----------|--------|-------|
| Framework | React 18+ | Component-based UI |
| Build Tool | Vite | Fast HMR, ESM-native |
| State (Server) | TanStack Query | Data fetching & caching |
| State (Client) | Zustand | Lightweight, minimal boilerplate |
| Routing | TanStack Router | Type-safe routing |

## Developer Experience

| Component | Choice | Notes |
|-----------|--------|-------|
| Package Manager | pnpm | Fast, disk efficient |
| Linter/Formatter | Biome | Single tool, fast, replaces ESLint+Prettier |
| Testing | Vitest | Fast, Vite-native, Jest-compatible API |
| Type Checking | tsc (--noEmit) | Strict mode enabled |
| Git Hooks | — | Pre-commit quality gates via scripts |

## Package Scripts

```bash
pnpm dev        # Start development server
pnpm build      # Production build
pnpm test       # Run tests with Vitest
pnpm lint       # Lint & format check with Biome
pnpm lint:fix   # Auto-fix lint & format issues
pnpm typecheck  # TypeScript type checking
```

## Project Structure

```
CcACBP/
├── .claude/               # Claude Code configuration
│   ├── agents/            # Agent definitions
│   ├── docs/              # Project documentation
│   ├── plans/             # Implementation plans
│   └── tech-stack.md      # This file
├── src/
│   ├── server/            # Backend (Hono)
│   │   ├── routes/        # API route handlers
│   │   ├── services/      # Business logic
│   │   ├── db/            # Database schema & queries
│   │   │   ├── schema.ts  # Drizzle schema definitions
│   │   │   └── index.ts   # DB connection
│   │   └── index.ts       # Server entry point
│   ├── client/            # Frontend (React + Vite)
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utilities & API client
│   │   ├── App.tsx        # Root component
│   │   └── main.tsx       # Client entry point
│   └── shared/            # Shared types & utilities
│       └── types.ts       # Shared TypeScript types
├── tests/                 # Test files
│   ├── server/            # Backend tests
│   └── client/            # Frontend tests
├── public/                # Static assets
├── CLAUDE.md              # Coding standards
├── package.json           # Dependencies & scripts
├── tsconfig.json          # TypeScript configuration
├── biome.json             # Biome configuration
├── vite.config.ts         # Vite configuration
├── vitest.config.ts       # Vitest configuration
├── drizzle.config.ts      # Drizzle ORM configuration
├── .env.example           # Environment variable template
└── .gitignore             # Git ignore rules
```

## Key Architectural Decisions

1. **Hono over Express**: Modern, Web Standards-based, built-in TypeScript support, smaller bundle
2. **Drizzle over Prisma**: No code generation step, SQL-like API, lighter weight, better edge compatibility
3. **Biome over ESLint+Prettier**: Single tool for both linting and formatting, significantly faster
4. **Vitest over Jest**: Native ESM support, Vite integration, faster execution, compatible API
5. **pnpm over npm/yarn**: Faster installs, strict dependency resolution, disk space efficient
6. **SQLite for dev**: Zero configuration, file-based, easy to reset — swap to PostgreSQL for production
