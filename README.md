
# Multiplayer Quiz Backend (API)

TypeScript + Express backend intended for a multiplayer quiz app. At the moment, the implemented feature is a question-fetching API that proxies Open Trivia DB (or any compatible provider) and validates query params.

## Tech

- Node.js + TypeScript
- Express
- `dotenv` for environment variables
- `node-fetch` for calling the question provider

## Getting started

### 1) Install

```bash
npm install
```

### 2) Configure environment

Create a `.env` file in the project root:

```bash
PORT=5000
BASE_QUESTION_URL=https://opentdb.com/api.php?amount=
```

- `PORT` (optional): server port (defaults to `5000`)
- `BASE_QUESTION_URL` (optional): base URL used by the questions service.
	- Default is `https://opentdb.com/api.php?amount=`
	- The server appends `amount` and optional query params like `&category=...`.

### 3) Run

Development:

```bash
npm run dev
```

Production build + start:

```bash
npm run build
npm start
```

## Scripts

- `npm run dev` — run the server with `ts-node`
- `npm run build` — compile TypeScript
- `npm start` — run compiled output from `dist/`

## API

### GET /

Health check / sanity endpoint.

Response: `Hello World`

### GET /api/questions

Fetches quiz questions from the configured provider (defaults to Open Trivia DB).

Important: the router for this endpoint exists in [src/routes/getQuestions.ts](src/routes/getQuestions.ts) but it is not currently mounted in the server entrypoint [src/index.ts](src/index.ts). If you call `/api/questions` right now, it will 404.

To enable it, mount the router in `src/index.ts` (example):

```ts
import getQuestionsRouter from "./routes/getQuestions.js";

app.use(getQuestionsRouter);
```

#### Query params

- `noofQuestion` (number, optional): number of questions, default `10`
- `category` (number, optional): allowed categories are `9` through `32`
- `difficulty` (string, optional): one of `easy | medium | hard`
- `type` (string, optional): one of `multiple | boolean`

If `category`, `difficulty`, or `type` is invalid, the server returns `500` with `{ "error": "..." }`.

#### Example requests

```bash
curl "http://localhost:5000/api/questions"
curl "http://localhost:5000/api/questions?noofQuestion=5&category=18&difficulty=easy&type=multiple"
```

## Notes / current status

- There is no multiplayer state (rooms, players, sockets) implemented yet in this repo; this is currently an HTTP API + question provider integration.
- `pg` is installed but not yet used by the code.

