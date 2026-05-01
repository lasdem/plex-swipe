# Plex OAuth & Server Discovery Plan

## Objective
Implement Plex OAuth PIN authentication flow to replace manual token entry, and add automatic Plex Server discovery (similar to Overseerr) so the user doesn't have to manually find their server URL.

## Key Files & Context
- `src/services/plexApi.ts`: Needs new API methods for requesting PINs, polling status, and fetching server resources.
- `src/components/SettingsModal.tsx`: Needs UI updates to handle the "Sign In with Plex" popup flow, polling state, and a server selection dropdown.

## Implementation Steps

### 1. Update `plexApi.ts`
Add the following helper functions at the bottom of the file to manage the OAuth lifecycle and server discovery:
- `getClientIdentifier()`: Generates and persists a unique `X-Plex-Client-Identifier` in `localStorage`.
- `requestPin()`: POSTs to `https://plex.tv/api/v2/pins` to generate a new PIN and returns the `id` and `code`.
- `checkPinStatus(pinId)`: GETs the PIN status to poll for the `authToken`.
- `getServers(token)`: GETs `https://plex.tv/api/v2/resources?includeHttps=1`, filters for `provides=server`, and maps the `connections` array into a usable `PlexServer[]` array (with name, uri, and local status).

### 2. Update `SettingsModal.tsx`
Refactor the connection settings section to support the new flow:
- **State Management:** Add state for `isAuthenticating` (boolean), `servers` (array of `PlexServer`), and `authError` (string).
- **OAuth Flow (`handlePlexSignIn`):**
  - Call `requestPin()`.
  - Open a popup window directed to `https://app.plex.tv/auth#?clientID=...&code=...&context[device][product]=PlexSwipe`.
  - Start a 2-second `setInterval` to poll `checkPinStatus()`.
  - Upon successful auth (token received): close popup, stop polling, save token to state, and immediately call `getServers(token)`.
- **UI Changes:**
  - Add a primary "Sign In with Plex" button.
  - If `servers` state is populated, render a `<select>` dropdown to let the user choose between discovered local/remote URIs.
  - Move the existing URL/Token inputs into an expandable or secondary "Manual Configuration" section as a fallback.

## Verification & Testing
- Click "Sign In with Plex" and verify the popup opens correctly formatted.
- Complete login in the popup and verify the modal automatically detects the token, closes the popup, and fetches the list of available servers.
- Select a server from the dropdown, save settings, and verify the main app successfully connects to that server and library loading works as expected.