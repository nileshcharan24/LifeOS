## src/ Directory Structure (Feature-Based Architecture)

```text
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── signup/
│   │   │   └── page.tsx
│   │   └── actions.ts
│   ├── auth/
│   │   └── confirm/
│   │       └── page.tsx
│   ├── dashboard/
│   │   └── page.tsx
│   ├── favicon.ico
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx
│   └── ui/
│   └── mode-toggle.tsx
├── context/
│   └── ModeContext.tsx
├── lib/
│   └── supabase/
│       ├── client.ts
│       └── server.ts
├── services/
│   └── auth/
│       ├── authService.ts
│       └── authService.server.ts
└── types/
    ├── auth.ts
    └── database.types.ts
