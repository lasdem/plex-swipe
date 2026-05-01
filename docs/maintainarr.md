# Maintainarr Configuration for PlexSwipe

Maintainarr is used to automate the deletion of items you've swiped "Left" on and protect items you've swiped "Up" on.

## 1. Deletion Rule (Swipe Left)
When you swipe Left, PlexSwipe adds the label `leaving_soon`.

### Rule Setup:
- **Target:** Label is `leaving_soon`.
- **Condition:** Item has been in the collection/labeled for **14 days**.
- **Action:** Delete files and remove from Plex.

## 2. Protection Rule (Swipe Up)
When you swipe Up, PlexSwipe adds the label `favorite`. You should configure Maintainarr to never delete these items.

### Rule Setup:
- **Target:** Label is `favorite`.
- **Condition:** Always true.
- **Action:** Add to **Exclusion List** (Global or per-rule).

## 3. Temporary Keep (Swipe Right)
When you swipe Right, PlexSwipe adds the label `keep_temp`.
- This item will stay in your library.
- PlexSwipe will hide it from you for **30 days**.
- After 30 days, it will show up again for another decision.
- No Maintainarr rule is needed for this unless you want to auto-delete these if they haven't been swiped "Up" after multiple rotations.
