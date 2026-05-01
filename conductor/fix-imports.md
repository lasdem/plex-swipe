# Fix PlexApi Import Errors

## Objective
Fix the `Uncaught SyntaxError` caused by importing TypeScript interfaces without the `type` keyword.

## Key Files & Context
- `src/App.tsx`
- `src/components/LibrarySelector.tsx`
- `src/components/CardStack.tsx`
- `src/components/SwipeCard.tsx`

## Implementation Steps
1. **App.tsx**: Update the import from `import { PlexService, PlexLibrary, PlexMediaItem } from './services/plexApi'` to `import { PlexService, type PlexLibrary, type PlexMediaItem } from './services/plexApi'`.
2. **LibrarySelector.tsx**: Update the import from `import { PlexLibrary } from '../services/plexApi';` to `import type { PlexLibrary } from '../services/plexApi';`.
3. **CardStack.tsx**: Update the import from `import { PlexMediaItem, PlexService } from '../services/plexApi';` to `import { PlexService, type PlexMediaItem } from '../services/plexApi';`.
4. **SwipeCard.tsx**: Update the import from `import { PlexMediaItem } from '../services/plexApi';` to `import type { PlexMediaItem } from '../services/plexApi';`.

## Verification & Testing
1. Save the changes. Vite's HMR should automatically apply them.
2. Verify that the white screen is gone and the application loads correctly without console errors.