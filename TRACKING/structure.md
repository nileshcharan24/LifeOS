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
│   │   └── button.tsx
│   │   └── (other shadcn components)
│   └── mode-toggle.tsx
├── context/
│   └── ModeContext.tsx
├── features/
│   ├── ai/
│   │   └── OracleChat.tsx
│   ├── journal/
│   │   └── JournalEditor.tsx
├── lib/
│   ├── utils/
│   │   └── encryption.ts
│   └── supabase/
│       ├── client.ts
│       └── server.ts
├── services/
│   ├── ai/
│   │   └── aiService.ts
│   ├── economy/
│   │   └── xpService.ts
│   ├── journal/
│   │   └── journalService.ts
│   └── auth/
│       ├── authService.ts
│       └── authService.server.ts
└── types/
    ├── auth.ts
    └── database.types.ts
```
