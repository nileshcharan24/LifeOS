Act as a Senior Lead Engineer. We are implementing Step 4.B: Planning & Productivity (The Quest System) and adding Level-Up animations.

### 1. QUEST SERVICE (`src/services/productivity/questService.ts`)
- Create functions: `fetchQuests`, `createQuest`, and `completeQuest`.
- Logic for `completeQuest`:
    - Update the quest status to 'completed' in the `quests` table.
    - Call `grantXP(amount, reason)` from the economy service.
    - Use `revalidatePath('/dashboard')` to refresh the server cache.

### 2. QUEST UI COMPONENTS
- **QuestCard.tsx**: Display title, description, and a difficulty badge (Easy, Medium, Hard, Epic).
- **CreateQuestModal.tsx**: A Shadcn Dialog with a form. 
- **XP Mapping**: Easy=50, Medium=100, Hard=200, Epic=500. Ensure the XP reward is saved to the DB.

### 3. LEVEL-UP ANIMATION & UI
- Update `src/components/economy/XPDisplay.tsx`:
    - Use 'framer-motion' (install if needed) to create a "Level Up" ceremony.
    - If the `level` value from the `useRealtimeXP` hook increases, trigger a full-screen Confetti effect (using `canvas-confetti`) and a central Modal: "LEVEL UP: SYSTEM EVOLVED".
    - Add a "Shimmer" effect to the XP progress bar when it fills up.

### 4. THE QUEST BOARD (`src/app/dashboard/quests/page.tsx`)
- Display a responsive grid of 'Active' quests.
- Implement the "Complete Quest" button on each card.
- Ensure that clicking "Complete" triggers the Realtime XP bar movement instantly.

### 5. SYNC MEMEX
- Update @TRACKING/progress.md: Mark 4.B as [x] COMPLETED.