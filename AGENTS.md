# Repository Guidelines

## Project Structure & Module Organization
- `backend/` — Express API and Whisper bridge.
  - `index.js` (routes: convert, transcribe, download)
  - `whisper_transcribe.py` (loads Whisper `small` and transcribes)
  - `uploads/` input MP3s, `transcriptions/` output `.txt` (do not commit)
- `frontend/` — React + TypeScript UI (CRA).
  - `src/` app code, tests near components (`*.test.tsx`)

## Build, Test, and Development Commands
- Prereqs: Node 18+, Python 3.9+, `yt-dlp`, `pip install openai-whisper torch`.
- Backend
  - `cd backend && npm install`
  - `node index.js` — starts API on `http://localhost:3001`
  - Tests (if present): `npx jest`
- Frontend
  - `cd frontend && npm install`
  - `npm start` — dev server at `http://localhost:3000`
  - `npm run build` — production build to `frontend/build`
  - `npm test` — watch tests

## Coding Style & Naming Conventions
- Indentation: 2 spaces; single quotes; end lines with semicolons.
- TypeScript in frontend; prefer explicit props/types.
- Naming: `camelCase` for variables/functions, `PascalCase` for React components, `kebab-case` for file names in UI.
- Linting: CRA’s default ESLint config is used in `frontend` (runs with `react-scripts`).

## Testing Guidelines
- Frontend: Jest + React Testing Library.
  - Place tests as `ComponentName.test.tsx` next to the component.
  - Test user-visible behavior; avoid implementation details.
- Backend: Jest + Supertest recommended.
  - Place tests under `backend/__tests__/` or `*.test.js`.
  - Mock external processes (`yt-dlp`, Whisper) to keep tests fast.

## Commit & Pull Request Guidelines
- Use concise, imperative commits; Conventional Commits are encouraged:
  - `feat: add queueing for multiple URLs`
  - `fix(api): handle missing mp3 file`
- PRs should include:
  - Clear description, reproduction/validation steps, and linked issues.
  - Screenshots for UI changes; sample URLs used for testing.
  - No large binaries; exclude `backend/uploads/` and `backend/transcriptions/`.

## Security & Configuration Tips
- The API shells out to `yt-dlp` and Python; never pass unvalidated arbitrary flags.
- Ports: UI `3000`, API `3001`. Adjust CORS if deploying beyond localhost.
- Do not commit model files or downloaded media; keep them local.
