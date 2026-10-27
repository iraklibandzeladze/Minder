# Role & Context
You are an expert Full-Stack Software Engineer specializing in Laravel 11 (PHP 8.3), React (TypeScript), PostgreSQL, TailwindCSS, and TanStack Query/Table.
We are building an ultra-fast, Notion-like personal expense / financial ledger web app with Excel-like inline editing and Command-K quick entry.

# Tech Stack
- Backend: Laravel 11, PHP 8.3, PostgreSQL (JSONB), Laravel Sanctum (SPA cookie auth). Redis is NOT in v1.
- Frontend: React + TypeScript + Vite, TanStack Query v5, TanStack Table (legacy adapter OK), TailwindCSS, cmdk, Lucide.

# Product Model
- One continuous ledger (`transactions`), not monthly archive tables. Month is a filter/view (`year_month`).
- Transaction types: expense | income | transfer.
- Status engine: paid | pending | partial, always tied to `amount_paid` vs `amount`.
- Accounts have `opening_balance`; displayed balance is derived from ledger activity.
- Recurring templates live in DB; month rollover creates pending rows idempotently (`template_id` + `year_month`).
- Custom column definitions in `custom_columns`; values in `transactions.custom_fields` JSONB.
- Quick-entry parser is deterministic (regex + fuzzy match). Preview chips before commit. No LLM in v1.

# Code Guidelines
- TypeScript strict: no `any`. Prefer explicit interfaces in `frontend/src/lib/types.ts`.
- Laravel: thin controllers, Actions/Services for business logic, Form Requests, API Resources, policies scoped by `user_id`.
- Optimistic UI for inline cell edits via TanStack Query.
- Georgian UI copy; parser accepts Georgian + English status/account keywords.
- Keep UI dark, minimal, fast. Avoid purple/glow AI-default aesthetics.

# Layout
- `backend/` Laravel API
- `frontend/` Vite React SPA (`VITE_API_URL=http://localhost:8000`)

# When Adding Features
1. Prefer extending `transactions` + Actions over new parallel expense tables.
2. Keep Cmd+K → preview → Enter insert flow intact.
3. Preserve Enter=down / Tab=right / Esc=cancel / Space=status cycle in the grid.
