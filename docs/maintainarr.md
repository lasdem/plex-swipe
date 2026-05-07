# Maintainarr Configuration for PlexSwipe

Maintainarr is used to automate the deletion of items you've swiped "Left" on and protect items you've swiped "Up" on.

> **Important Note:** By default, PlexSwipe's "Swipe Up" action adds items to a Plex Collection named `favorite`. For the following Maintainarr rules to work correctly, you should change the "Swipe Up" behavior in PlexSwipe's settings to **add a label** named `favorite` instead of adding to a collection.

## 1. Deletion Rule Example (Swipe Left)
When you swipe Left, PlexSwipe adds the label `delete`. You can configure a rule in Maintainarr to automatically remove these items after a set period, while ensuring favorites are protected.

### General Tab Settings
Create a new Collection in Maintainarr and configure the General settings:
- **Name:** `Leaving Soon - Movies` (or your preferred name)
- **Description:** Movies that will soon be deleted.
- **Library:** Select your target library (e.g., `Movies`)
- **Radarr/Sonarr server:** Select the matching server (e.g., `Movies`)
- **Radarr/Sonarr action:** `Unmonitor and delete files`
- **Take action after days:** `90` (Wait 90 days before deleting, adjust to your preference)
- **Options to Enable:**
  - Active
  - Show on Plex library recommended / Plex home (Optional)
  - Enable overlays (Optional, to visually indicate it's leaving soon)
  - Add import list exclusions
  - Use rules

### Rules Tab Settings
Configure the rules to target the `delete` label and explicitly exclude the `favorite` label.

**Rule #1**
- **First Value:** `Plex - [list] Labels`
- **Action:** `Contains (Exact list match)`
- **Custom Value:** `delete`

**Operator:** `AND`

**Rule #2**
- **First Value:** `Plex - [list] Labels`
- **Action:** `Not Contains (Exact list match)`
- **Custom Value:** `favorite`

## 2. Protection Rule (Swipe Up)
When you swipe Up, PlexSwipe adds the label `favorite` (if configured as advised above).
Because we added Rule #2 to the deletion setup above, Maintainarr will **never** delete an item that has the `favorite` label, even if it accidentally also has the `delete` label. No separate collection or rule is needed just for protection.

## 3. Temporary Keep (Swipe Right)
When you swipe Right, PlexSwipe simply hides the item from your current view.
- **Important:** This action does **not** add any labels or modify the item in Plex.
- The item's ID is saved to a local "ignore list" within your browser's storage.
- PlexSwipe will hide it from you for **30 days** (configurable in settings).
- After the timeout period expires, it will show up again for another decision.
- No Maintainarr rule is needed (or possible) for this action, as it doesn't leave a trace in Plex.
