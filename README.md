# 🌱 EcoPulse

🌿 Collective Climate Intelligence platform transforming daily quick-commerce checkouts into proactive planetary action. Features zero-hallucination receipt parsing, dynamic compliance curve gauges, localized squad leaderboards, and forward-looking AI behavior coaching. Built with React 18, Vite, Tailwind CSS, and serverless Firebase. 🚀


![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite_Build-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase_Serverless-FFCA28?style=for-the-badge&logo=firebase&logoColor=white)
![Gemini API](https://img.shields.io/badge/Gemini_2.5_Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)

---

## 🛑 The Problem: The "Calorie Counting" Trap
Traditional carbon trackers fail because of **user fatigue**. Expecting users to manually log every item they buy or mile they drive results in 95% churn. Furthermore, abstract numbers like "1.2 metric tons of CO2" mean nothing to the average consumer.

## 💡 The Solution: Passive Intelligence
EcoPulse is a zero-friction carbon tracking platform. Users simply upload or paste their digital Quick-Commerce receipts (Zepto, Blinkit, Swiggy Instamart). Our deterministic AI pipeline passively calculates the exact carbon weight of their lifestyle, assigns a localized grade, and ranks them on a live, anonymous global leaderboard. No typing. Just data.

---

## 🏗️ Core Architecture & Tech Stack

We bypassed heavy, traditional backend frameworks to build a hyper-fast, serverless architecture that scales instantly.

| Layer | Technology | Engineering Rationale |
| :--- | :--- | :--- |
| **Frontend UI** | **React 18 & Vite** | Blazing-fast hot module replacement (HMR) and optimized builds. Highly modular, state-driven components. |
| **Styling** | **Tailwind CSS** | Utility-first CSS enabled us to rapidly prototype a sleek, dark-mode dashboard with complex data visualizations. |
| **Database & Auth** | **Firebase (Firestore)** | **Serverless syncing.** Anonymous Auth eliminates user friction. Firestore’s `onSnapshot` pushes real-time leaderboard updates to the client. |
| **AI Intelligence** | **Gemini 2.5 Flash** | Chosen for high-speed inference and strict adherence to JSON schema outputs, ensuring the OCR extraction never hallucinates formatting. |

---

## 🛠️ Key Engineering Features (How We Built It)

### 1. The Three-Layer Deterministic Pipeline (Zero Hallucination)
LLMs are notoriously bad at math. To guarantee data integrity, we decoupled extraction from calculation:
* **Layer 1 (Extraction):** Gemini isolates raw items and quantities from messy unstructured text.
* **Layer 2 (Normalization):** A custom JS engine standardizes edge-case units (e.g., converting "1 Dozen Eggs", "1 Bunch Spinach", or "1 Toilet Paper Roll") into a universal mass metric (`total_weight_kg`).
* **Layer 3 (Resolution):** Data is processed against a hardcoded, localized Indian Carbon Matrix to calculate exact `co2e_kg` footprints. 

### 2. The Categorical Fallback Penalty
What happens if a user buys a brand-new, highly-processed energy drink our database doesn't recognize? Instead of assigning it 0.0 kg CO2e (which rewards bad habits), our engine automatically drops it into an `unmapped_penalty` bucket, applying a strict 2.0 kg CO2e/kg fallback factor. We also inject `confidence` and `uncertainty` metrics into the payload for absolute data transparency.

### 3. Dual-Mode Orchestrator (The Sandbox Shield)
To guarantee 100% uptime during live presentations regardless of venue Wi-Fi or API rate limits, the app features a smart router:
* **Live API Mode:** Connects to Google's REST endpoints for live inference on custom text.
* **Cached Demo Mode:** Instantly intercepts preset requests and routes them to a local JSON asset registry, returning resolved data in <1 second.

### 4. Viral Export Engine (HTML5 Canvas)
To solve customer acquisition via social gamification, we engineered a custom rendering function that paints the user's React DOM state (scores, ranks, merchant data) directly onto a hidden HTML5 `<canvas>`. This generates a downloadable PNG scorecard and a pre-filled WhatsApp link.

---

## 🚀 Quick Start (Local Deployment)

To run the EcoPulse Dashboard locally:

**1. Clone the repository and navigate to the directory:**
```bash
git clone https://github.com/avz-sharma/ecopulse.git
cd ecopulse
```

**2. Install dependencies:**
```bash
npm install
```

**3. Run the development server:**
```bash
npm run dev
```

**4. Open the application:**
Access the dashboard in your browser at `http://localhost:5173`.

**5. (Optional) Set up Environment Variables:**
Copy `.env.example` to `.env` and supply your Firebase keys and Gemini API keys:
```env
VITE_FIREBASE_API_KEY=your_firebase_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain_here
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id_here
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket_here
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id_here
VITE_FIREBASE_APP_ID=your_firebase_app_id_here
VITE_FIREBASE_MEASUREMENT_ID=your_firebase_measurement_id_here
VITE_APP_ID=ecopulse-app
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

---

## 📂 Project Structure

```
Ecopulse/
├── agents/                   # Custom LLM agent definitions (Core Prompts)
│   ├── carbon_resolver_agent.md
│   └── extractor_agent.md
├── docs/                     # Design documents, categories, and emission factors
│   ├── dynamic_categories.txt
│   ├── factors.txt
│   └── logic.txt
├── src/                      # React frontend source code
│   ├── components/           # React component views
│   │   ├── ActionPlan.jsx    # Gamification/quest panel
│   │   ├── Leaderboard.jsx   # Shared carbon standings
│   │   ├── Scorecard.jsx     # Visual carbon receipt calculator
│   │   └── Uploader.jsx      # OCR uploader and presets
│   ├── utils/                # Calculation & parsing utilities
│   │   └── logic.js          # Core math/grading rules
│   ├── App.jsx               # Application entry point & core logic
│   ├── index.css             # Main styling configurations
│   ├── logic.test.js         # Math engine unit tests
│   └── main.jsx              # React mounting logic
├── .env.example              # Template environment variables file
├── .gitignore                # Git ignore configurations
├── index.html                # Vite entry point
├── package.json              # Project dependencies & scripts
├── vite.config.js            # Vite configurations
└── README.md                 # Project README (This file)
```
