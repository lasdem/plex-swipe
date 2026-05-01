# Docker Deployment Plan

## Objective
Create a `Dockerfile` and `docker-compose.yml` to build, package, and deploy the PlexSwipe React application using a lightweight web server (Nginx). Include a custom Nginx configuration to handle SPA routing and potential CORS issues.

## Key Files & Context
- `Dockerfile` (New)
- `.dockerignore` (New)
- `docker-compose.yml` (New)
- `nginx.conf` (New)

## Implementation Steps

### 1. Create `.dockerignore`
- Ignore `node_modules`, `dist`, `.git`, and other unnecessary files to keep the Docker build context small and fast.

### 2. Create `nginx.conf`
- Create a custom Nginx configuration file.
- Configure `try_files $uri $uri/ /index.html` to handle React Router's client-side routing.
- Set up a reverse proxy location (e.g., `/plex-api/`) that can be optionally used to proxy requests to the Plex server to avoid CORS issues if Plex is hosted on a different domain without proper CORS headers.

### 3. Create Multi-stage `Dockerfile`
- **Stage 1 (Build):**
  - Base image: `node:20-alpine`.
  - Copy `package.json` and `package-lock.json` (if exists).
  - Run `npm install --legacy-peer-deps` (to handle the `@react-spring/web` version conflict).
  - Copy the rest of the application files.
  - Run `npm run build` to generate the production-ready static files in the `dist` directory.
- **Stage 2 (Serve):**
  - Base image: `nginx:alpine`.
  - Copy the custom `nginx.conf` to `/etc/nginx/conf.d/default.conf`.
  - Copy the built assets from Stage 1 into Nginx's default public directory (`/usr/share/nginx/html`).
  - Expose port `80` inside the container.
  - Run Nginx.

### 4. Create `docker-compose.yml`
- Define a service named `plex-swipe`.
- Set the build context to the current directory (`.`).
- Map host port `5173` (or any preferred port) to the container's port `80`.
- Add a `restart: unless-stopped` policy for reliability.

## Verification & Testing
- Run `docker compose up -d --build`.
- Access the application at `http://localhost:5173`.
- Verify the application loads correctly and connects to Plex.