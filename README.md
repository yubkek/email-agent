# Email Agent

An AI-powered Gmail agent built with Groq (Llama 3.3 70B / Qwen 3 32B). Chat with your inbox — read, search, draft, and send emails through a conversational interface.

## Features

- **AI agent** — uses Groq function calling to autonomously decide which Gmail actions to take
- **Read & search** — list today's emails or search by sender, subject, keyword
- **Draft replies** — AI writes a draft, shown in an inline compose window you can edit
- **Send** — send replies directly from the chat
- **Thread grouping** — emails in the same thread are grouped as one card
- **Chat history** — conversations are saved locally and grouped by date

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- A Google account
- A [Groq](https://console.groq.com) account (free)

---

## Setup

### 1. Clone and enter the project

```bash
git clone <your-repo-url>
cd email-agent
```

### 2. Google Cloud — OAuth credentials

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project
3. **APIs & Services → Enable APIs** → enable **Gmail API**
4. **APIs & Services → OAuth consent screen**
   - User type: External
   - Fill in app name (e.g. `Email Agent`)
   - Add your Gmail address as a **Test user**
5. **APIs & Services → Credentials → Create Credentials → OAuth Client ID**
   - Application type: **Web application**
   - Authorized redirect URI: `http://localhost:3001/auth/google/callback`
6. Copy the **Client ID** and **Client Secret**

### 3. Groq API key

1. Go to [console.groq.com](https://console.groq.com)
2. **API Keys → Create API Key**
3. Copy the key

### 4. Configure environment

```bash
cd server
cp .env.example .env
```

Open `server/.env` and fill in:

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback
GROQ_API_KEY=your_groq_api_key
SESSION_SECRET=any_random_string
PORT=3001
```

### 5. Install dependencies

```bash
# In one terminal
cd server
npm install

# In another terminal
cd client
npm install
```

---

## Running

Open **two terminals**:

**Terminal 1 — Backend**
```bash
cd server
npm run dev
```

**Terminal 2 — Frontend**
```bash
cd client
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser and sign in with Google.

---

## Project Structure

```
email-agent/
├── server/
│   ├── index.js                  # Express app entry point
│   ├── routes/
│   │   ├── auth.js               # Google OAuth routes
│   │   ├── emails.js             # Gmail read/draft/send routes
│   │   └── agent.js              # Agent SSE endpoint
│   ├── services/
│   │   ├── gmail.js              # Gmail API wrapper
│   │   ├── agent.js              # Agentic loop (Groq + tool calls)
│   │   └── tools.js              # Tool definitions + executor
│   ├── middleware/
│   │   └── requireAuth.js
│   └── .env.example
└── client/
    └── src/
        ├── pages/
        │   ├── Login.jsx
        │   └── Chat.jsx           # Main chat UI + sidebar
        └── components/
            └── AgentMessage.jsx   # Tool steps, email list, draft compose
```

## Deploying (Render + Vercel)

### Backend → Render (free)

1. Push your repo to GitHub
2. Go to [render.com](https://render.com) → New → Web Service → connect your repo
3. Render will detect `render.yaml` automatically
4. Add these environment variables in the Render dashboard:

| Key | Value |
|-----|-------|
| `GOOGLE_CLIENT_ID` | from Google Cloud |
| `GOOGLE_CLIENT_SECRET` | from Google Cloud |
| `GOOGLE_REDIRECT_URI` | `https://your-app.onrender.com/auth/google/callback` |
| `GROQ_API_KEY` | from Groq console |
| `SESSION_SECRET` | any random string |
| `FRONTEND_URL` | your Vercel frontend URL (set after step below) |

### Frontend → Vercel (free)

1. Go to [vercel.com](https://vercel.com) → New Project → import your repo
2. Set **Root Directory** to `client`
3. Add environment variable: `VITE_API_URL` = your Render backend URL (e.g. `https://your-app.onrender.com`)
4. Deploy

### Final steps

1. In Google Cloud Console → **Credentials** → add your Render URL as an authorized redirect URI:
   `https://your-app.onrender.com/auth/google/callback`
2. In Google Cloud Console → **OAuth consent screen** → **Test users** → add each person's Gmail address
3. Share your Vercel URL with them — they click Sign in with Google and they're in

---

## How the agent works

1. User sends a message
2. Groq receives the message + 5 tool definitions
3. Groq decides which tools to call (or responds directly)
4. Server executes the tools against the Gmail API
5. Results stream back to Groq for further reasoning
6. Each step streams to the UI in real time via SSE

**Available tools:**
| Tool | Description |
|------|-------------|
| `list_today_emails` | Fetch all emails received today |
| `read_email` | Read the full body of an email |
| `search_emails` | Search Gmail with any query |
| `create_draft` | Save a reply as a Gmail draft |
| `send_reply` | Send a reply immediately |
