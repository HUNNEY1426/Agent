# 🚀 Terminal Agent

A CLI-based AI Terminal Agent built with Node.js, Express.js, and Gemini API.

---

# 📌 Features

- 🤖 AI Chat Assistant
- 📁 Create File
- 📖 Read File
- ❌ Delete File
- 💻 Run Terminal Commands
- 🧠 Conversation Memory
- 🎨 Beautiful CLI using Chalk & Ora
- ⚡ Express Backend API

---

# 🛠️ Installation

## Clone Repository

```bash
git clone <repository-url>
```

## Go to Project

```bash
cd ai
```

## Install Dependencies

```bash
npm install
```

## Create .env

```env
GEMINI_API_KEY=YOUR_API_KEY
```

## Start Server

```bash
node server.js
```

---

# 🚀 Usage

## Ask AI

```bash
node cli.js ask "What is Express?"
```

## Create File

```bash
node cli.js create notes.txt
```

## Read File

```bash
node cli.js read notes.txt
```

## Delete File

```bash
node cli.js delete notes.txt
```

## Run Terminal Command

```bash
node cli.js run "dir"
```

---

# 🏗️ Architecture

```
CLI
 │
 ▼
Express Server
 │
 ├── AI Route
 │      │
 │      ▼
 │   Gemini API
 │
 ├── File Route
 │      │
 │      ▼
 │   File System
 │
 └── Shell Route
        │
        ▼
   child_process
```

---

# 📂 Project Structure

```
ai/
│
├── benchmark/
│   └── benchmark.js
│
├── memory/
│   └── history.json
│
├── routes/
│   ├── ai.js
│   ├── file.js
│   └── shell.js
│
├── services/
│   ├── aiService.js
│   └── history.js
│
├── cli.js
├── server.js
├── package.json
├── .env
└── README.md
```

---

# 📊 Benchmark

| Metric | Result |
|---------|--------|
| Speed | Depends on API response |
| Accuracy | Good for coding questions |
| Memory | Stores previous conversation |
| Ease of Use | Beginner Friendly |

Compared with:

- Claude Code
- Gemini CLI
- OpenAI Codex CLI

---

# 📸 Screenshots

## Server Running

(Add Screenshot Here)

---

## AI Command

(Add Screenshot Here)

---

## Create File

(Add Screenshot Here)

---

## Run Command

(Add Screenshot Here)

---

# 👩‍💻 Tech Stack

- Node.js
- Express.js
- Commander.js
- Axios
- Chalk
- Ora
- Google Gemini API

---

# 📄 License

MIT License