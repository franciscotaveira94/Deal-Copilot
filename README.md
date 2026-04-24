# Deal Copilot

Personal AE deal tracker. Local SQLite. Local AI. Nothing leaves your Mac.

## What it does

- **Today** — what needs your attention: overdue, due this week, going cold, upcoming meetings, recent activity
- **Pipeline** — kanban view, drag deals between stages
- **Accounts** — table of everything with stage, priority, ARR, next action
- **Account detail** — paste anything (email, transcript, voice note), AI structures it into the timeline. Live copilot chat grounded in that account's full history.
- **Actions** — open, overdue, completed across all accounts

## Privacy

- All data lives in a SQLite file at `prisma/dev.db`
- AI runs locally via Ollama — the model is on your Mac, prompts never leave it
- If you ever switch to Anthropic Claude (optional), only then do prompts leave your machine
- No telemetry, no cloud sync, no hosting

## Setup

Already installed on this machine. If you're starting fresh:

```bash
# 1. Install Ollama
brew install ollama
brew services start ollama
ollama pull llama3.1:8b

# 2. Install app deps
cd /Users/franciscotaveira94/AE/deal-copilot
npm install
npx prisma generate
npx prisma migrate dev
```

## Run it

```bash
cd /Users/franciscotaveira94/AE/deal-copilot
npm run dev
```

Open http://localhost:3000

## AI backends

The app uses **Ollama by default** (local, free). You can switch to Claude for higher quality by setting `ANTHROPIC_API_KEY` in `.env`.

| Feature | Ollama (default) | Anthropic Claude |
|---|---|---|
| Privacy | ✅ Local only | ❌ Prompts go to Anthropic |
| Cost | Free | ~$3-8/mo personal use |
| Quality (structuring) | Good | Excellent |
| Quality (chat) | Good | Excellent |
| Speed (chat reply) | ~4-10s on M-series | ~1-3s |
| Setup | `brew install ollama && ollama pull llama3.1:8b` | Sign up at console.anthropic.com |

### Use a different Ollama model

Edit `.env`:

```
OLLAMA_MODEL=qwen2.5:7b      # alternative, often better at JSON
OLLAMA_MODEL=llama3.1:70b    # if you have the GPU for it
OLLAMA_MODEL=gemma3:4b       # smaller, faster, weaker
```

Then pull it: `ollama pull <model>` and restart `npm run dev`.

### Switch to Claude later

Just add `ANTHROPIC_API_KEY=sk-ant-...` to `.env` and restart. Ollama becomes the fallback.

## Seed with real deals

```bash
npx tsx prisma/seed.ts
```

Resets the DB and loads Monument + Gunnercooke from our conversations.

## Daily rhythm

- **Mon AM** (5 min): Today view. Knock out overdue.
- **After each customer interaction** (2 min): open the account, paste into the "Paste anything" box. AI structures it. Done.
- **Before each meeting** (2 min): open the account, ask copilot: *"prep me for this meeting"*.
- **Fri EoD** (5 min): Today view. Any accounts going cold?

## Backup

SQLite file: Time Machine handles it. Or manually:

```bash
cp prisma/dev.db ~/deal-copilot-backup-$(date +%Y%m%d).db
```

## Ollama operations

```bash
# Check it's running
curl http://localhost:11434/api/version

# See what models are loaded
ollama list

# Stop / start the service
brew services stop ollama
brew services start ollama

# Free up memory (unloads model from RAM until next use)
curl -X DELETE http://localhost:11434/api/generate -d '{"model":"llama3.1:8b","keep_alive":0}'
```

## Tech

- Next.js 16 (App Router) + TypeScript + Tailwind 4
- Prisma 7 + SQLite via better-sqlite3 adapter
- Ollama (primary AI) + Anthropic SDK (optional)
- @dnd-kit/core for the kanban drag-and-drop
- Lucide icons, Inter font

## Data model

- `Account` → companies
- `Contact` → people at an account
- `TimelineEntry` → meetings, emails, calls, notes, decisions, milestones
- `Action` → todos linked (or not) to an account
- `ChatMessage` → per-account copilot history
