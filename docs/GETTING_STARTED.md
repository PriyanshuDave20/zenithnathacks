# Getting Started (for people new to coding with AI agents)

You do not need to understand all the code. You need to understand the routine. Read this once, then use the
copy-paste prompts below. If something confuses you, ask your agent: "Explain what you just did in plain words."

## The big picture in 60 seconds
- **Synapse** helps a patient and a clinician understand each other (translation, captions, simple language).
  It runs in a web browser on the clinician's device. It stores no patient data. See `docs/PRODUCT.md`.
- **An AI agent** (Claude or Codex) is a helper that reads and edits the code for you when you tell it what to do.
  It is fast but forgetful and sometimes wrong. You are the one in charge: you decide what to build and you check the result.
- **Why rules?** Several people and several agents edit one project at the same time. The rules keep us from
  overwriting each other's work.

## Words you will see
| Word | Plain meaning |
|------|---------------|
| Repo | The project folder, stored on GitHub. |
| Branch | Your own copy of the work, so you can change things without breaking anyone else. |
| Commit | A saved checkpoint with a short message. |
| Push | Send your commits to GitHub. |
| Pull request (PR) | A request to add your branch to the main project. A teammate looks at it first. |
| Merge | Your PR is accepted and joins `main`. |
| Lane | The folders you are allowed to edit (see below). |
| Prompt | The instruction you type to the agent. |
| Contract | The agreed shape of the data between frontend and backend (`docs/API.md`). |

## Your lane
Pick the row for your job. Only edit files in your lane.

| If you are... | You edit | You never edit |
|---------------|----------|----------------|
| Frontend (uses Claude) | `src/app/` pages, `src/components/` except `input/` | `src/app/api/`, `src/lib/server/`, `src/components/input/`, `src/lib/input/` |
| Backend 1: API (uses Codex) | `src/app/api/`, `src/lib/server/`, `src/lib/questions/` | pages and components |
| Backend 2: input channels, ICU and sign (uses Codex) | `src/components/input/`, `src/lib/input/` | API routes, `src/lib/server/`, other screens |

Your lane is a set of folders, not a job title. Backend 2 works in the browser, but only in the input folders.

If you need something outside your lane, do not do it. Ask the teammate who owns it (or put it in `docs/TASKS.md`).

## One-time setup
1. Install: Git, Node.js, and either Claude Code or Codex. Ask a teammate to help if you get stuck.
2. Clone the repo and run the setup script, as in the README.
3. Get your own Claude API key (backend people) and put it in a file named `.env`. **Never commit `.env`** and
   never paste a key into chat, code, or a document.
4. Run `npm run dev` and open http://localhost:3000. If you see the landing page, you are set.

## Your routine for every task
1. **Claim it.** Open `docs/TASKS.md`, put your name and branch on a row.
2. **Update.** `git pull --rebase origin main`
3. **Make your branch.** `git checkout -b yourname/short-task` (for example `sam/translate-api`)
4. **Start your agent** in the project folder (`claude` or `codex`) and give it a lane-limited prompt (below).
5. **Look at the result.** Run `npm run dev` and try it. Run `npm run typecheck` and `npm run lint`.
6. **Save and share.** Ask the agent: "Commit this and push the branch." Then open a pull request on GitHub.
7. **Hand off.** Ask the agent: "Update docs/TASKS.md and add an entry to the top of docs/HANDOFF.md."
8. **Get a review.** A teammate reads your PR before it merges. Reply to their comments.

Never work directly on `main`. Never run `git push --force`.

## Prompts you can copy
**Starting a session**
> Read AGENTS.md, docs/TEAM.md, docs/TASKS.md, and the top of docs/HANDOFF.md. Tell me in plain words what the project is,
> what my lane is, and what the next task is. Do not change any files yet.

**Starting a task (backend example)**
> I am Backend Person A. Implement only the translate route: `src/app/api/translate/` and `src/lib/server/translate/`.
> Follow the contract in docs/API.md. Do not edit contracts, package.json, or anything outside those folders. If you
> need a change elsewhere, stop and tell me. Explain each step in simple terms as you go.

**Starting a task (frontend example)**
> I am on frontend. Build the patient intake screen in `src/components/`. Use the mock data in `src/lib/mocks/`.
> Mobile first (390px wide), big buttons, high contrast. Do not edit src/app/api or src/lib/server. Explain your choices simply.

**When you do not understand something**
> Explain what this file does like I am new to programming. Then tell me what could go wrong if I change it.

**Before you finish**
> Run typecheck and lint, fix any problems in my lane, commit, push, and update docs/TASKS.md and docs/HANDOFF.md.

**To check the agent stayed in its lane**
> List every file you changed. Are any outside my lane? If so, undo those changes.

## Safety rules (these really matter)
- **No real patient information, ever.** Use made-up (synthetic) stories only. Never type a real name, date of birth,
  phone number, or address, even to test.
- **The app stores nothing about patients.** Do not add a database table for patients, visits, or messages.
- **Do not say "HIPAA compliant"** anywhere. We say "designed to avoid identifiable data".
- **Never commit secrets** (`.env`, API keys, tokens).
- We are a **communication aid, not a doctor.** The app never diagnoses.

## Working with an agent: good habits
- Give one small task at a time. "Build the whole app" goes badly; "build this one screen" goes well.
- Name the files or folders it may touch.
- Read what it says it did. If it says something you do not understand, ask.
- Test in the browser. An agent saying "done" does not mean it works.
- If it makes a mess, you can undo: tell it "undo your last changes" or ask a teammate. Do not panic.
- Agents forget everything between sessions. That is why we write `HANDOFF.md` and `TASKS.md`.

## If something goes wrong
| Problem | What to do |
|---------|------------|
| "Merge conflict" | Stop. Ask a teammate or ask the agent: "Explain this conflict and the safest way to fix it." Do not guess. |
| `git pull --rebase` fails | Commit or stash your work first, then try again. Ask for help if it still fails. |
| The agent edited the wrong files | Ask: "List files changed outside my lane and revert them." |
| The app will not start | Run `npm install`, then `npm run dev`. Paste the error to your agent and ask what it means. |
| You are not sure what to do next | Read the top of `docs/HANDOFF.md` and `docs/TASKS.md`, or ask in the team chat. |

## Where things live
- `docs/PRODUCT.md`: what we are building and why.
- `docs/API.md`: the contracts between frontend and backend.
- `docs/TASKS.md`: who is doing what.
- `docs/HANDOFF.md`: what the last person finished and what is next.
- `docs/TEAM.md`: the full team rules (the detailed version of this guide).
- `AGENTS.md`: what the agents read automatically.
