<!-- ==========================================================================
     BANNER
     ========================================================================== -->
<p align="center">
  <img src="assets/banner.png" alt="Build with Google Antigravity" width="100%">
</p>

<h1 align="center">🚀 Build with Google Antigravity</h1>

<p align="center">
  <b>A collection of things I've built with Google Antigravity — from first prompt to working application.</b>
</p>

<p align="center">
  This is where I keep what I build with <b>Google Antigravity</b>, and it's also the resource I use during my live, hands-on sessions — no slides, just real building.
</p>

---

## 👋 Welcome

Welcome to **Build with Google Antigravity** — a collection of things I've built using <img src="assets/google-antigravity-rainbow.svg" alt="Google Antigravity" height="18">, from small experiments to full working apps.

This repository also doubles as the resource I use during my live, hands-on sessions — **no slides**, just real prompting, building, and iterating in front of you. Everything I build, prompt, and iterate on lives right here, so you can follow along in real time or revisit it afterwards at your own pace.

Whether you're completely new to Google Antigravity or just curious how far you can push natural-language driven development, this repo is designed to be a practical reference — not a theory dump.

---

## 🚀 What We'll Explore

- 🧠 **What Google Antigravity is** and the philosophy behind it
- ⚙️ **How Antigravity works** at a high level
- 💡 **Going from an idea to a working application**
- ✍️ **Prompting Antigravity effectively**
- 🏗️ **Building real applications** through natural-language instructions
- 🔁 **Iterating** on an existing app conversationally
- 🧪 **Using Antigravity's development and testing capabilities**
- 📦 **Practical, live examples/demos**
- 📚 **Lessons learned** and resources to keep exploring after the session

---

## 🧠 What is Google Antigravity?

**Google Antigravity** is an agentic development environment — it lets you describe what you want to build, iterate on it, and evolve it further using natural language, while the agent handles scaffolding, code generation, and project structure on your behalf.

The example applications in this repository were built using Antigravity, and they're used throughout the session as live, working reference points rather than slides or diagrams. Rather than making broader claims here, the session itself — and the code in this repo — is the best demonstration of how it works.

---

## 🛠️ Repository Contents

| File / Folder | What it contains | When to use it |
| :--- | :--- | :--- |
| [0 - Pomodoro Timer/](0%20-%20Pomodoro%20Timer) | A vanilla HTML/CSS/JS **Pomodoro Focus Dashboard** — countdown timer, task spotlight, procedural ambient sounds, and productivity analytics. See its [README](0%20-%20Pomodoro%20Timer/README.md). | Reference for a simple, zero-dependency app built with Antigravity — a good first example to study. |
| [1 - Personal Expense Tracker/](1%20-%20Personal%20Expense%20Tracker) | **Spendly** — a React + TypeScript + Vite expense tracker with Gemini-powered auto-categorization, budgets, and analytics. See its [README](1%20-%20Personal%20Expense%20Tracker/README.md). | Example of a more complex, componentized app with AI integration — useful for the "building" and "iterating" parts of the session. |
| [2 - Smart Group Trip Planner/](2%20-%20Smart%20Group%20Trip%20Planner) | **TripSync** — a React + TypeScript group trip planner with a scoring engine, itineraries, and live weather data. See its [README](2%20-%20Smart%20Group%20Trip%20Planner/README.md). | Example of a feature-rich, multi-view application — used for demonstrating iteration and testing during the session. |

> Each project folder is self-contained with its own `README.md`, `package.json` (where applicable), and `assets/` for screenshots — check the folder's README for setup and run instructions.

---

## 🧪 Hands-on / Demo Flow

The session generally follows this flow. You can replicate it on your own after the session using the same rhythm:

```
💡 Idea → ✍️ Prompt → 🏗️ Build → ▶️ Run → 🧪 Test → 🔁 Iterate → ✨ Improve
```

1. **Idea** — Start with a simple, clearly stated concept for an app.
2. **Prompt** — Describe the idea to Antigravity in natural language.
3. **Build** — Let the agent scaffold and generate the working application.
4. **Run** — Launch the app and see it working end-to-end.
5. **Test** — Verify the app behaves as expected.
6. **Iterate** — Ask for changes, fixes, or new features conversationally.
7. **Improve** — Refine the UI, UX, and functionality based on what you see.

The three example apps in this repository ([0 - Pomodoro Timer](0%20-%20Pomodoro%20Timer), [1 - Personal Expense Tracker](1%20-%20Personal%20Expense%20Tracker), [2 - Smart Group Trip Planner](2%20-%20Smart%20Group%20Trip%20Planner)) are each snapshots of this flow in action.

---

## ✨ Prompting Tips

Practical advice for getting better results out of Antigravity:

- **Clearly describe the desired outcome** — state what the app should do, not just a vague theme.
- **Provide context** — mention relevant constraints, existing files, or prior decisions.
- **Specify UI/UX expectations** — layout, style, tone (e.g. "minimalist", "glassmorphic", "dashboard-style").
- **Define functional requirements** — what must work, what data is involved, what interactions matter.
- **Let the agent inspect the existing project** before asking for changes, instead of assuming it already knows everything.
- **Iterate instead of one giant prompt** — small, incremental asks tend to produce more reliable results than trying to specify everything up front.
- **Ask the agent to test and verify its work** — request a run-through or validation instead of assuming the first output is correct.

```text
Example prompt style:

"Build a Pomodoro timer web app with a focus/short-break/long-break cycle, a clean minimalist UI, and a settings panel to customize durations. Use plain HTML/CSS/JS, no frameworks."
```

---

## 📂 Resources

**In this repository:**

- 🍅 [Pomodoro Timer README](0%20-%20Pomodoro%20Timer/README.md) — demo app #1
- 💰 [Personal Expense Tracker README](1%20-%20Personal%20Expense%20Tracker/README.md) — demo app #2
- ✈️ [Smart Group Trip Planner README](2%20-%20Smart%20Group%20Trip%20Planner/README.md) — demo app #3

---

## 🔗 Connect With Me

<p align="center">
  <a href="https://www.linkedin.com/in/ritwickbhargav80">
    <img src="assets/linkedin-qr.png" alt="LinkedIn QR Code" width="180">
  </a>
  <br>
  <i>Scan or click to connect with me on LinkedIn</i>
</p>

---

## 📚 References

Official Google Antigravity resources referenced during the session:

- [Get Started with Google Antigravity](https://www.skills.google/focuses/163036?catalog_rank=%7B%22rank%22%3A517%2C%22num_filters%22%3A0%2C%22has_search%22%3Afalse%7D&locale=en&parent=catalog&qlcampaign=5k-dodl-65)
- [Getting Started with Google Antigravity](https://codelabs.developers.google.com/getting-started-google-antigravity#0)
- [Authoring Google Antigravity Skills](https://codelabs.developers.google.com/getting-started-with-antigravity-skills#0)
- [Hands-on with Antigravity CLI](https://codelabs.developers.google.com/antigravity-cli-hands-on#0)
- [Build and Deploy to Google Cloud with Antigravity](https://codelabs.developers.google.com/build-and-deploy-gcp-with-antigravity#0)

**For Credits:**
- [Google Enterprise Agent Ready](https://developers.google.com/program/gear)
- [Google Skills Subscriptions](https://www.skills.google/subscriptions)

---

## 🙌 Thank You

Thank you for being part of **Build with Google Antigravity**! Whether you followed along live or you're exploring this repository afterwards, I hope it gives you a practical starting point for building with Antigravity. Happy building! 🚀

