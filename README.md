<div align="center">

# 🧠 AfterMe
### *The Proactive AI Ambient Memory Layer for Physical Belongings & Context*

**Never leave anything behind. An ambient intelligence layer that connects physical spaces, GPS geofencing, and Google Gemini Multimodal AI.**

<br/>

[![Firebase](https://img.shields.io/badge/Firebase-Firestore_%26_Auth-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Google Gemini](https://img.shields.io/badge/AI_Engine-Gemini_2.5_Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript_5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/Frontend-React_19_+_Vite-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![React Native](https://img.shields.io/badge/Mobile-Expo_React_Native-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![Leaflet](https://img.shields.io/badge/Maps-Leaflet_Dark_Matter-199900?style=for-the-badge&logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![License](https://img.shields.io/badge/License-Proprietary_Restricted-red.svg?style=for-the-badge)](./LICENSE)

<br/>

[🚀 **Explore Features**](#-key-features) • [🏛️ **Architecture**](#️-system-architecture) • [🎬 **Live Demo Walkthrough**](#-1-minute-golden-demo-for-judges) • [👥 **The Team**](#-the-team--authors) • [🔒 **License**](#-proprietary-license)

---

</div>

<br/>

## 🌟 The Problem & The AfterMe Solution

| Traditional Note / Reminder Apps ❌ | The AfterMe Proactive Ambient Layer ⚡ |
| :--- | :--- |
| **Passive**: You must remember to open the app and manually search. | **Proactive**: Automatically monitors your GPS position and alerts you *before* you leave a place. |
| **No spatial awareness**: Notes don't understand where you are physically located. | **GPS Geofenced**: Dynamically calculates distance in meters and draws a safety radius around items. |
| **Hallucination-prone AI**: Standard chatbots often guess where items are. | **Strict Grounding**: Zero hallucinations. Only retrieves verifiable recorded memories with citations. |
| **Single-format**: Text-only notes with no visual spatial context. | **Multimodal Vision & Voice**: Snap photos of items/parking spots + hear AI voice spoken aloud. |

---

## ⚡ Key Features

```text
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                AFTERME CAPABILITY MATRIX                                 │
├───────────────────────────────┬──────────────────────────────────────────────────────────┤
│ 🧠 Gemini Multimodal Vision   │ • Structured entity extraction (object, location, risk)  │
│                               │ • 📸 Photo memory capture (reads parking bays, lockers)  │
│                               │ • Zero-hallucination grounded conversational retrieval   │
│                               │ • Contextual linking (e.g., Passport ↔ Visa Appointment) │
├───────────────────────────────┼──────────────────────────────────────────────────────────┤
│ 🛰️ Real-Time GPS & Map Radar  │ • Auto-detects physical latitude & longitude via browser │
│                               │ • Interactive dark-matter radar beacon & geofence rings  │
│                               │ • 🎯 Glowing target area circle when asking for items    │
│                               │ • 1-Click 100m / 500m departure simulator steppers       │
├───────────────────────────────┼──────────────────────────────────────────────────────────┤
│ 🔐 Firebase Cloud Backend     │ • Cloud Firestore collections (memories, alerts, users)  │
│                               │ • Google Sign-In & Email/Password Authentication         │
│                               │ • Multi-tenant user data isolation & security rules      │
├───────────────────────────────┼──────────────────────────────────────────────────────────┤
│ 🔊 AI Voice Assistant (TTS)   │ • Text-to-Speech natural voice answer playback           │
│                               │ • Real-time microphone speech-to-text input              │
├───────────────────────────────┼──────────────────────────────────────────────────────────┤
│ 🚗 Smart Parking Finder       │ • 1-Click "Parked Car Here" widget with GPS coordinates  │
│                               │ • Automatic vehicle marker & walking distance calculator │
├───────────────────────────────┼──────────────────────────────────────────────────────────┤
│ 📱 True Cross-Platform        │ • Obsidian Glassmorphism Web App (localhost:5173)        │
│                               │ • React Native Expo Mobile App (iOS / Android / Web)     │
└───────────────────────────────┴──────────────────────────────────────────────────────────┘
```

---

## 🏛️ System Architecture

```mermaid
flowchart TB
    subgraph UI["📱 Multi-Platform Client Layer"]
        WEB["🌐 Web Dashboard<br/>(React 19 + Leaflet + Vite)"]
        MOB["📱 Mobile App<br/>(React Native + Expo)"]
    end

    subgraph Server["⚡ Node.js & TypeScript Backend Engine"]
        ROUTER["REST API Router (/api)"]
        GEO["🛰️ Proactive Geofencing Engine<br/>(Haversine Distance Math)"]
        GROUND["🛡️ Grounded Retrieval Layer<br/>(Anti-Hallucination Guardrails)"]
    end

    subgraph Cloud["🔥 Google Firebase & Cloud AI"]
        FS[("🔥 Cloud Firestore<br/>(memories, alerts, user_state)")]
        AUTH["🔐 Firebase Auth<br/>(Google & Email/Password)"]
        GEMINI["🧠 Google Gemini API<br/>(gemini-2.5-flash Multimodal)"]
    end

    WEB <-->|HTTP / WebSockets| ROUTER
    MOB <-->|HTTP REST / FCM| ROUTER
    ROUTER <-->|Token Verify| AUTH
    ROUTER <-->|Admin SDK CRUD| FS
    ROUTER <-->|Multimodal Extraction| GEMINI
    ROUTER <-->|GPS Distance Check| GEO
    GEO -->|Trigger Departure Alert| FS
```

---

## 🎬 1-Minute Golden Demo (For Judges & Teammates)

Experience the complete proactive flow in 4 quick steps:

```text
 1. CREATE MEMORY        2. SIMULATE DEPARTURE      3. PROACTIVE ALERT        4. ASK & HEAR VOICE
┌─────────────────┐     ┌─────────────────────┐    ┌────────────────────┐    ┌─────────────────────┐
│ Speak:          │     │ Click:              │    │ 🚨 System Warning: │    │ Ask:                │
│ "I left my      │ ──► │ "[ Leave Conference │ ─► │ "You left your     │ ─► │ "Where is my        │
│ black laptop    │     │   Room (150m away) ]│    │  laptop charger in │    │  charger?"          │
│ charger in the  │     │                     │    │  Conference Room!" │    │ 🎯 Circles map area │
│ conference room"│     │ Radar marker moves  │    │ 60m geofence alarm │    │ 🔊 Speaks aloud     │
└─────────────────┘     └─────────────────────┘    └────────────────────┘    └─────────────────────┘
```

---

## 🚀 Quickstart Guide

### 1. Clone & Install Dependencies
```bash
# Clone the repository
git clone https://github.com/rajdeep-r24/AfterMe.git
cd AfterMe

# Install monorepo dependencies
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env` and `backend/.env`:
```bash
cp .env.example .env
cp backend/.env.example backend/.env
```
* **Firebase Project**: Pre-configured with `afterme-ai-app` (Project Number: `377448090451`).
* *(Optional)* Add your `GEMINI_API_KEY` in `.env`. An intelligent offline fallback engine is built-in so all demos work 100% reliably even offline!

### 3. Run the Development Server
```bash
npm run dev
```
* 🌐 **Web Dashboard**: [http://localhost:5173](http://localhost:5173)
* 🧠 **Backend API**: [http://localhost:3001](http://localhost:3001)

### 4. Run the Mobile App (Expo)
```bash
npm run mobile
```
Press `w` for browser preview or scan the QR code with **Expo Go** on your physical phone!

### 5. Run Automated Test Suites
```bash
# E2E Golden Demo & Anti-Hallucination Guardrails
node test-full-demo.js

# Real-Time GPS & Geofence Departure Engine
node test-gps-geofence.js

# Multimodal Photo Capture & Parking Verification
node test-multimodal-tts.js

# Cross-Platform Firestore Synchronization
node test-cross-platform.js
```

---

## 📡 REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/memories` | Natural language / multimodal photo memory extraction via Gemini & Firestore save |
| `GET` | `/api/memories` | Filtered list of user memories (`belonging`, `task`, `document`, `potentially_forgotten`) |
| `PATCH`| `/api/memories/:id/status` | Update memory status (`retrieved`, `completed`, `active`) |
| `POST` | `/api/ask` | Grounded conversational retrieval with zero hallucinations and citations |
| `POST` | `/api/location/gps` | Real-time GPS coordinate telemetry with Haversine distance geofence calculation |
| `POST` | `/api/location/change` | Simulate location departure and evaluate left-behind items |
| `POST` | `/api/demo/seed-golden` | 1-Click seed Golden Demo persona into Firestore |
| `POST` | `/api/demo/reset` | Clean slate reset for new demo or evaluation session |

---

## 👥 The Team & Authors

<table align="center" width="100%">
  <tr>
    <td align="center" width="33%">
      <a href="https://github.com/Pranav7758051011">
        <img src="https://avatars.githubusercontent.com/u/107771746?v=4" width="100px" style="border-radius:50%;" onerror="this.src='https://github.com/Pranav7758051011.png'" /><br />
        <sub><b>Pranav Bade</b></sub>
      </a>
      <br />
      <sub>🧠 Co-Founder & Systems Lead</sub>
      <br />
      <sub><i>Core Architecture & Backend</i></sub>
      <br />
      <a href="https://github.com/Pranav7758051011"><img src="https://img.shields.io/badge/GitHub-Pranav7758051011-181717?style=flat-square&logo=github" /></a>
    </td>
    <td align="center" width="33%">
      <a href="https://github.com/rajdeep-r24">
        <img src="https://ui-avatars.com/api/?name=Rajdeep+Rathod&background=10b981&color=fff&size=200&bold=true" width="100px" style="border-radius:50%;" /><br />
        <sub><b>Rajdeep Rathod</b></sub>
      </a>
      <br />
      <sub>⚡ Co-Founder & AI Architect</sub>
      <br />
      <sub><i>Spatial Intelligence & Cloud</i></sub>
      <br />
      <a href="https://github.com/rajdeep-r24"><img src="https://img.shields.io/badge/GitHub-rajdeep--r24-181717?style=flat-square&logo=github" /></a>
    </td>
    <td align="center" width="33%">
      <a href="https://github.com/Vedant-git-333">
        <img src="https://github.com/Vedant-git-333.png" width="100px" style="border-radius:50%;" /><br />
        <sub><b>Vedant Soni</b></sub>
      </a>
      <br />
      <sub>🎨 Co-Founder & Product Lead</sub>
      <br />
      <sub><i>Mobile, Vision & UX</i></sub>
      <br />
      <a href="https://github.com/Vedant-git-333"><img src="https://img.shields.io/badge/GitHub-Vedant--git--333-181717?style=flat-square&logo=github" /></a>
    </td>
  </tr>
</table>

---

## 🔒 Proprietary License

**Copyright &copy; 2026 Pranav Bade, Rajdeep Rathod, and Vedant Soni. All Rights Reserved.**

> **RESTRICTED SOURCE-AVAILABLE LICENSE**:
> No person, organization, or third party may use, copy, modify, adapt, merge, publish, distribute, sublicense, or sell copies of this software or any part of its source code without the **explicit, prior written permission signed by all three authors (Pranav Bade, Rajdeep Rathod, and Vedant Soni)**.
> 
> Evaluation is permitted solely by designated evaluators of the **Google Gemini AI Hackathon**.
> 
> See the complete legal terms in the [`LICENSE`](./LICENSE) file.

<br/>

<div align="center">
  <sub>Built with 💙 for the Google Gemini AI Hackathon</sub>
</div>