## src/ Directory Structure (Feature-Based Architecture)

```text
src/
├── app/
│   ├── favicon.ico
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── layout/
│   │   ├── ModeToggle.tsx
│   │   ├── Navbar.tsx
│   │   └── Sidebar.tsx
│   └── ui/
├── context/
│   └── ModeContext.tsx
├── features/
│   ├── ai/
│   │   ├── DailySummary.tsx
│   │   └── OracleChat.tsx
│   ├── dashboard/
│   │   ├── IndulgenceShop.tsx
│   │   ├── QuestBoard.tsx
│   │   └── XPProgress.tsx
│   ├── forms/
│   │   ├── HealthLog.tsx
│   │   └── ReflectionForm.tsx
│   └── memory/
│       ├── MemoryLaneGallery.tsx
│       └── UploadButton.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useLocalStorage.ts
│   ├── useMode.ts
│   └── usePoints.ts
├── lib/
│   ├── supabase.ts
│   ├── utils.ts
│   └── ml/
├── schemas/
│   └── validation.ts
├── services/
│   ├── habitService.ts
│   ├── xpEngine.ts
│   └── ai/
│       ├── aiService.ts
│       └── orchestrator.ts
├── store/
│   ├── PointsStore.ts
│   └── UIStore.ts
└── types/
    ├── database.types.ts
    └── index.ts
