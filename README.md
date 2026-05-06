# 🎬 PlexSwipe

PlexSwipe is a modern, Tinder-style web application designed to help you organize and curate your Plex media library with ease. Say goodbye to tedious manual editing—just swipe to tag, collect, or ignore items in your library.

![PlexSwipe Preview](src/assets/hero.png)

## ✨ V1 Features

- **Tinder-style Interface:** Effortlessly curate your library using intuitive swipe gestures (Up, Down, Left, Right).
- **Keyboard Shortcuts:** Use **Arrow Keys** (Left/Right/Up/Down) for rapid-fire desktop curation.
- **Robust Undo:** Made a mistake? Press **Backspace** or `Ctrl+Z` to immediately reverse the action on your Plex server and restore the card.
- **Customizable Actions:** Configure exactly what each swipe does:
  - Add or remove custom labels.
  - Add or remove media from collections.
  - Temporarily ignore items (great for "keep for 30 days" workflows).
- **Advanced Filtering:** Filter your library by status (Unlabeled/New, Specific Labels) and Collections.
- **Progress Tracking:** See exactly how many items are left in your current cleanup session with real-time counters.
- **PWA Support:** Install PlexSwipe as a standalone app on your mobile device for a native feel.
- **Direct Plex Integration:** Securely communicates with your Plex Media Server using official API standards.

## 🚀 Tech Stack

- **Frontend:** React 19, TypeScript
- **Styling:** Vanilla CSS (Modern CSS Nesting & Variables)
- **Animations:** React Tinder Card, Lucide React
- **Build Tool:** Vite
- **API Client:** Axios (with request serialization queueing)

## 🛠️ Getting Started

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

## ⚙️ Configuration

Launch the app and Sign In with Plex or enter your credentials manually:
1. **Plex Server URL:** (e.g., `http://192.168.1.100:32400`)
2. **X-Plex-Token:** Your unique authentication token.

### Default Showcase Actions
- **Swipe Up:** 🟦 Add to `favorite` collection.
- **Swipe Left:** 🟥 Add `delete` label.
- **Swipe Right:** 🟩 Ignore for 30 days (`keep_temp` workflow).
- **Swipe Down:** 🟧 Clear both `favorite` collection and `delete` label.

*You can customize these actions, colors, and icons in the Settings menu.*

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests to help improve PlexSwipe.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
*Disclaimer: This project is not affiliated with Plex Inc. Vibe coded with Gemini.*
