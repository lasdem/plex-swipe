# 🎬 PlexSwipe

PlexSwipe is a modern, Tinder-style web application designed to help you organize and curate your Plex media library with ease. Say goodbye to tedious manual editing—just swipe to tag, collect, or ignore items in your library.

![PlexSwipe Preview](https://via.placeholder.com/800x450.png?text=PlexSwipe+Interface+Preview)

## ✨ Features

- **Tinder-style Interface:** Effortlessly curate your library using intuitive swipe gestures (Up, Down, Left, Right).
- **Customizable Actions:** Configure exactly what each swipe does:
  - Add or remove custom labels.
  - Add or remove media from collections.
  - Temporarily ignore items (great for "keep for 30 days" workflows).
- **Advanced Filtering:** Filter your library by status (Unlabeled/New, Specific Labels) and Collections.
- **Direct Plex Integration:** Communicates directly with your Plex Media Server API—no middleman required.
- **Privacy First:** All configurations and Plex tokens are stored locally in your browser.

## 🚀 Tech Stack

- **Frontend:** React 19, TypeScript
- **Styling:** Tailwind CSS 4
- **Animations:** React Spring, React Tinder Card
- **Build Tool:** Vite
- **Icons:** Lucide React

## 🛠️ Getting Started

### Prerequisites

- A running **Plex Media Server**.
- Your **Plex Token** (Find it [here](https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/)).
- Node.js (v18+) and npm/pnpm.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/lasdem/plex-swipe.git
   cd plex-swipe
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   Navigate to `http://localhost:5173`.

### 🐳 Running with Docker

If you prefer to run PlexSwipe in a containerized environment, you can use Docker Compose:

1. **Build and start the container:**
   ```bash
   docker compose up -d
   ```

2. **Access the application:**
   Navigate to `http://localhost:5173`.

3. **Stop the container:**
   ```bash
   docker compose down
   ```

## ⚙️ Configuration

When you first launch PlexSwipe, you'll be prompted to enter:
1. **Plex Server URL:** (e.g., `http://192.168.1.100:32400`)
2. **Plex Token:** Your unique authentication token.

### Default Swipe Actions
- **Swipe Up:** Add `favorite` label.
- **Swipe Left:** Add `leaving_soon` label.
- **Swipe Right:** Add `keep_temp` label and ignore for 30 days.
- **Swipe Down:** (Unassigned by default).

*You can customize these actions in the Settings menu.*

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests to help improve PlexSwipe.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
*Disclaimer: This project is not affiliated with Plex Inc. Vibe coded with Gemini.*
