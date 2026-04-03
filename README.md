# 🗄️ DevVault

> **Your personal knowledge engine** — built for developers and curious minds who refuse to let great ideas slip away.

---

## What is DevVault?

DevVault is a mobile-first knowledge base app for capturing, organizing, and exploring everything you learn. Notes, snippets, tutorials, tools — all in one beautiful, offline-first vault.

No cloud required. No subscriptions. Just you and your knowledge.

---

## ✨ Features

| Feature | Description |
|---|---|
| 📝 **Rich Notes** | Write with Markdown — bold, code blocks, headers, tables |
| 🏷️ **Smart Metadata** | Organize by category, lifecycle phase, domain, and custom sections |
| 🔍 **Instant Search** | Full-text search with multi-select filter chips |
| 🗺️ **Knowledge Graph** | Visual graph showing how your notes connect |
| 📷 **Image Attachments** | Attach photos from camera or gallery |
| 🎙️ **Voice Input** | Dictate titles and content via speech recognition |
| 🌙 **5 Themes** | Minimal, Modern, Glassmorphism, Tactile, Terminal |
| 🎨 **Accent Colors** | 8 accent color options to personalize your vault |
| 📦 **Export / Import** | Back up and restore your entire vault as JSON |
| ⚡ **Offline First** | 100% local — SQLite database, no internet needed |

---

## 📱 Screenshots

> *Terminal theme · Graph view · Search filters*

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- Android device or emulator (iOS supported too)

### Install & Run

```bash
# Clone the repository
git clone https://github.com/your-username/DevVault.git
cd DevVault/DevVault

# Install dependencies
npm install

# Start the dev server
npx expo start -c
```

Scan the QR code with **Expo Go** on your phone, or press `a` to open on Android emulator.

---

## 🏗️ Build APK

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to your Expo account
eas login

# Build an APK (Android)
eas build --platform android --profile preview
```

Download the APK from the link provided after the build completes.

---

## 🗂️ Project Structure

```
DevVault/
├── app/
│   ├── (tabs)/          # Main tab screens (Vault, Search, Add, Settings)
│   ├── item/            # Item detail, create, and edit screens
│   └── metadata/        # Manage sections & labels
├── components/          # Reusable UI components
│   ├── ItemCard.tsx     # Knowledge item card
│   ├── ItemForm.tsx     # Create/edit form
│   ├── GraphView.tsx    # Interactive knowledge graph
│   └── ...
├── context/
│   ├── ThemeContext.tsx # Theme & accent color management
│   └── VaultContext.tsx # Data & SQLite state management
├── lib/
│   └── database.ts      # SQLite schema & queries
└── constants/
    └── colors.ts        # Design tokens
```

---

## 🛠️ Tech Stack

- **[Expo](https://expo.dev)** — React Native framework
- **[Expo Router](https://expo.github.io/router)** — File-based navigation
- **[Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/)** — Local database
- **[React Native SVG](https://github.com/software-mansion/react-native-svg)** — Graph rendering
- **[Expo Speech Recognition](https://github.com/jamsch/expo-speech-recognition)** — Voice input
- **[AsyncStorage](https://react-native-async-storage.github.io/async-storage/)** — Settings persistence

---

## 🎨 Themes

| Theme | Description |
|---|---|
| **Minimal** | Dark & sharp — clean dark background, no clutter |
| **Modern** | Clean light mode — crisp and bright |
| **Glassmorphism** | Frosted blur panels with floating blobs |
| **Tactile** | Depth & texture — raised card surfaces |
| **Terminal** | Hacker aesthetic — green-on-black monospace |

---