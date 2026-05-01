# Implement Swipe Actions and Setup Docs

## Objective
Implement Plex API integration to add labels and collections based on user swipes. Use local storage to prevent recently swiped items from reappearing. Display "Requested By" tags synced via Kometa. Provide configuration documentation for Kometa and Maintainerr, and testing guidelines.

## Key Files & Context
- `src/services/plexApi.ts`: To be updated with methods to modify Plex item metadata (labels/collections).
- `src/App.tsx`: To handle swipe logic, state management, and item filtering based on local storage.
- `src/components/SwipeCard.tsx`: To display the "Requested By" label if it exists on the item.
- `docs/kometa.md`: New file detailing Kometa configuration.
- `docs/maintainerr.md`: New file detailing Maintainerr configuration.
- `docs/testing.md`: New file detailing how to reset local state and Plex tags for testing.

## Implementation Steps

### 1. Update Plex API Service (`src/services/plexApi.ts`)
- Add a new method `addTag(ratingKey: string, tagType: 'label' | 'collection', tagValue: string): Promise<void>`.
- This method will make a `PUT` request to `/library/metadata/{ratingKey}` with the appropriate tag parameters (e.g., `label[0].tag.tag=Value&label.locked=1`).

### 2. Handle Swipe Actions (`src/App.tsx`)
- Update `handleAction` to map directions to Plex actions:
  - **Swipe Up (Favorite):** Add `favorite` label.
  - **Swipe Left (Delete):** Add `leaving_soon` label and `Leaving Soon` collection.
  - **Swipe Right (Keep Temp):** Add `keep_temp` label.
- Implement a local storage mechanism (e.g., an object storing `ratingKey -> { action, timestamp }`).
- Update `handleSelectLibrary` to filter fetched items:
  - Remove items marked as `favorite` or `delete` in local storage.
  - Remove items marked as `keep_temp` if the timestamp is less than 30 days ago.

### 3. Display "Requested By" Tag (`src/components/SwipeCard.tsx`)
- Update the `PlexMediaItem` interface to include `Label?: { tag: string }[]`.
- In `SwipeCard.tsx`, extract the requester label (e.g., finding a label starting with `Requester:` or similar, based on the Kometa spec).
- Display this tag elegantly on the card UI.

### 4. Create Documentation (`docs/`)
- **`docs/kometa.md`**: Provide the YAML configuration snippet required for Kometa to pull Seerr requests and add them as Plex labels (e.g., using the `seerr` or `radarr`/`sonarr` builders with the `label` action).
- **`docs/maintainerr.md`**: Provide the rule configuration for Maintainerr:
  - Rule 1: Delete items in the `Leaving Soon` collection / with `leaving_soon` label older than 14 days.
  - Rule 2: Exclude items with the `favorite` label from all deletion rules.
- **`docs/testing.md`**: Provide guidelines on how to:
  - Clear the browser's local storage for the app.
  - Run a shell script or curl commands to bulk-remove test labels/collections from Plex.

## Verification & Testing
1. Swipe on a few test items and verify the labels/collections appear in the Plex Web UI.
2. Refresh the app and verify the swiped items do not reappear (or reappear only if keep_temp > 30 days).
3. Review the docs for clarity.