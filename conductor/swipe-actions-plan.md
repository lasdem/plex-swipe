# Configurable Swipe Actions and Deck Filtering Plan

## Background & Motivation
The current swipe mechanism hardcodes actions (e.g., Up = favorite, Left = delete) and relies heavily on local storage to hide items. To support diverse user workflows, we need to make swipe actions configurable, shift the source of truth for labels/collections to Plex, and allow users to dynamically filter the deck to review previously swiped items.

## Scope & Impact
- **`src/services/plexApi.ts`**: Update `PlexMediaItem` interface to include `Collection`. Ensure metadata requests return collections if needed.
- **`src/components/SettingsModal.tsx`**: Add a "Swipe Action Builder" UI to map directions to explicit actions.
- **`src/App.tsx`**: 
  - Implement a Dynamic Filter Bar above the card stack.
  - Refactor state management to use an `ignore_list` instead of full action history.
  - Execute the sequence of explicit actions when a swipe occurs.
- **`src/components/SwipeCard.tsx`**: Render existing labels and collections as visual pill tags.
- **`src/components/LibrarySelector.tsx`**: May need minor UI adjustments to accommodate the filter bar.

## Proposed Solution

### 1. Swipe Action Builder (Explicit Actions)
Users will define an array of explicit actions for each swipe direction (Up, Down, Left, Right). 
Action schema: `type: 'add_label' | 'remove_label' | 'add_collection' | 'remove_collection' | 'ignore'`, `value: string`, `days?: number`.
*Conflict Resolution:* Tag conflicts are handled by explicit configuration (e.g., configuring Left to "Add leaving_soon" AND "Remove favorite").

### 2. State Management Shift (The Local Ignore List)
Local storage will transition from `plex_swipes` (storing complete action history) to an `ignore_list` mapping `ratingKey` to an `expirationTimestamp`. If `ignore(days)` is configured, the item is hidden locally until the expiry. 

### 3. Dynamic Filter Bar
Before loading the deck, users can select a filter:
- **Status:** Unlabeled (Default), Any Label, or Specific Label (e.g., 'favorite').
- **Collection:** Any, Specific Collection.
This allows users to review hidden items (like favorites) by changing the filter, and then swipe them to a new state.

### 4. Immediate Context (UI)
`SwipeCard` will parse `item.Label` and `item.Collection` and display them as small badge icons on the card.

## Alternatives Considered
- **Mutually Exclusive Groups:** We considered allowing users to define exclusive tag groups (where adding one removes others automatically), but chose **Explicit Actions** as it provides maximum flexibility and is simpler to implement.
- **Smart Views:** Considered pre-defined views (Inbox, Review), but chose the **Dynamic Filter Bar** for more granular ad-hoc filtering.

## Implementation Steps

### Phase 1: Core API & Interface Updates
1. Update `PlexMediaItem` in `plexApi.ts` to include `Collection?: { tag: string }[]`.
2. Define the configuration interfaces for Swipe Actions and the Ignore List.

### Phase 2: Configuration & Settings UI
1. Update `SettingsModal.tsx` to include the "Swipe Action Builder".
2. Default configuration should match the current behavior for backwards compatibility.
3. Save the new configuration object to `localStorage`.

### Phase 3: The Ignore List & Action Execution
1. Refactor `App.tsx`'s `handleAction` to read the configuration for the swiped direction and execute the defined steps sequentially.
2. Update the local storage mechanism to only write to `ignore_list` when an `ignore` action is triggered.
3. Migrate old `plex_swipes` to `ignore_list` based on their timestamps.

### Phase 4: Dynamic Filter Bar & Visibility
1. Implement a filter UI in `App.tsx` (or a new `FilterBar` component).
2. Filter the `items` array dynamically based on the selected filter (Label/Collection) AND the local `ignore_list`.
3. Update `SwipeCard.tsx` to map and render `Label` and `Collection` tags as badges on the poster.

## Verification & Testing
1. Configure custom actions (e.g., adding a label and removing a collection simultaneously) and verify the changes apply correctly on Plex.
2. Verify the `ignore` action properly hides the item and respects the expiration.
3. Test the Dynamic Filter Bar to ensure previously swiped items (e.g., favorites) can be pulled back into the deck and re-swiped.

## Migration & Rollback
- On load, parse the legacy `plex_swipes` local storage and convert `keep_temp` entries into the new `ignore_list` format, then delete `plex_swipes`.