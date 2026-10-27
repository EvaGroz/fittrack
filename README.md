# FitTrack

A full-stack fitness tracker: log workouts (exercises, sets, reps, weight), plan your week, and follow your progress with charts and personal records.

| Service | Tech | Folder | Dev port |
|---|---|---|---|
| Frontend | React 19, Vite, React Router, Tailwind CSS 4, Recharts | `frontend/` | 5173 |
| Backend | Node.js, Express 5, Mongoose 9, JWT, bcrypt | `backend/` | 5000 |
| Database | MongoDB | (external) | 27017 |

## Features

- **Auth** – register / log in with JWT; passwords hashed with bcrypt.
- **Exercise library** – 30 seeded exercises with photos; search and filter by muscle group and equipment; add, edit and delete your own custom exercises (with an optional image URL). Exercises without an image, or whose image fails to load, show an icon for their muscle group.
- **Workouts** – name, date and notes; add exercises and log sets (set number, reps, weight in kg); edit and delete everything.
- **Weekly plans** – assign a workout and/or exercises to each day (Mon–Sun), add notes, and mark days as done.
- **History & statistics** – past workouts grouped by week; per-exercise max weight over time (line chart) and volume; workouts per week; personal records. All statistics are computed with MongoDB aggregation pipelines.

## Project structure

```
fittrack/
├── backend/                  # Express REST API (self-contained, can be its own build context)
│   ├── data/seed-exercises.json
│   ├── src/
│   │   ├── server.js         # entry point: env → listen → connect DB → seed
│   │   ├── app.js            # Express app factory (used by server.js and tests)
│   │   ├── config/           # env.js (reads env vars), db.js (builds the Mongo URI)
│   │   ├── models/           # User, Exercise, Workout, WeeklyPlan
│   │   ├── controllers/      # route handlers incl. stats aggregations
│   │   ├── routes/           # /api/* routers
│   │   ├── middleware/       # JWT auth, error handling
│   │   └── seed/             # inserts seed exercises when the collection is empty
│   ├── tests/                # Jest + supertest + mongodb-memory-server
│   └── .env.example
└── frontend/                 # React SPA
    ├── vite.config.js        # dev proxy: /api → backend
    └── src/
        ├── api/client.js     # fetch wrapper, relative /api URLs
        ├── context/          # auth state
        ├── components/       # UI primitives, modals, charts
        └── pages/            # one file per route
```

## Prerequisites

- **Node.js 22 or newer** (developed and tested with Node 26) and npm
- **MongoDB** running locally on `localhost:27017` (no authentication needed for local dev)

## Running locally

### 1. Backend

```bash
cd backend
cp .env.example .env        # Windows PowerShell: copy .env.example .env
# edit .env and set JWT_SECRET to a long random string
npm install
npm run dev                 # nodemon, restarts on changes  (or: npm start)
```

The API listens on http://localhost:5000. Check http://localhost:5000/api/health – it should return `"db": "connected"`.

On every start the backend **syncs the exercise library** from `backend/data/seed-exercises.json`. Each library exercise is upserted by name: missing ones are inserted, and changed fields (muscle group, equipment, description, image) are updated in place, so existing workouts keep their references.
- Custom exercises are never touched. A unique index on library names prevents duplicates, even when several backend instances start at the same time.
- Library exercises that are removed from the file are kept, because workouts may still reference them.
- The log shows the result, e.g. `Exercise library synced ...: 0 inserted, 2 updated, 28 unchanged`.

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 and register an account.

The frontend only calls **relative** URLs (`/api/...`). In development, Vite proxies `/api` to `http://localhost:5000` (see `frontend/vite.config.js`). The target can be changed with the `VITE_API_PROXY_TARGET` environment variable when starting the dev server.

### Production build of the frontend

```bash
cd frontend
npm run build               # outputs static files to frontend/dist
npm run preview             # optional: serve the build locally (with the same /api proxy)
```

`dist/` is a static SPA. Whatever serves it must also forward `/api` to the backend and fall back to `index.html` for client-side routes.

## Configuration (backend)

All backend configuration comes from environment variables. For local development they are loaded from `backend/.env` via dotenv; real environment variables take precedence. Nothing is hard-coded.

| Variable | Default | Description |
|---|---|---|
| `PORT` | `5000` | HTTP port of the API |
| `MONGO_HOST` | `localhost` | MongoDB host |
| `MONGO_PORT` | `27017` | MongoDB port |
| `MONGO_DB` | `fittrack` | Database name |
| `MONGO_USER` | *(empty)* | MongoDB user. Leave empty to connect without authentication |
| `MONGO_PASSWORD` | *(empty)* | MongoDB password |
| `JWT_SECRET` | *(none – required)* | Secret for signing JWTs. The server refuses to start without it |
| `CORS_ORIGIN` | *(empty)* | Allowed origin(s), comma separated. Empty = no cross-origin requests (not needed when the frontend goes through a proxy) |
| `SEED_FILE` | `backend/data/seed-exercises.json` | Optional alternative seed file |

The connection string is built from these values:

- without credentials: `mongodb://MONGO_HOST:MONGO_PORT/MONGO_DB`
- with `MONGO_USER` **and** `MONGO_PASSWORD`: `mongodb://USER:PASSWORD@MONGO_HOST:MONGO_PORT/MONGO_DB?authSource=admin` (credentials are URL-encoded)

On startup the server begins listening immediately, then connects to MongoDB (retrying up to 10 times, 3 s apart) and seeds. While the database is not connected `/api/health` returns **503**, which makes it usable as a readiness probe. The process shuts down gracefully on `SIGTERM`/`SIGINT`.

## Tests

```bash
cd backend
npm test
```

Tests use Jest, supertest and **mongodb-memory-server**, so no running MongoDB is required. They cover:
- the health endpoint, including the 503 case;
- registration, login and token validation;
- the Mongo connection-string builder;
- the exercise-library sync: inserts, idempotency, in-place updates, and custom exercises left untouched;
- validation of custom exercise image URLs.

> The first run downloads a MongoDB binary (~100 MB) into the user cache, so it can take a few minutes. Later runs take a few seconds.

## npm scripts

| Folder | Script | What it does |
|---|---|---|
| backend | `npm run dev` | Start the API with nodemon (auto-reload) |
| backend | `npm start` | Start the API with node |
| backend | `npm test` | Run the Jest test suite |
| frontend | `npm run dev` | Start the Vite dev server on port 5173 |
| frontend | `npm run build` | Build the production bundle into `dist/` |
| frontend | `npm run preview` | Serve the production build locally |

## API overview

All routes are under `/api`. Everything except `/health` and `/auth/register|login` requires an `Authorization: Bearer <token>` header. Errors are returned as `{ "message": "..." }`.

| Method | Route | Description |
|---|---|---|
| GET | `/health` | API and database status (200 / 503) |
| POST | `/auth/register` | `{ name, email, password }` → `{ token, user }` |
| POST | `/auth/login` | `{ email, password }` → `{ token, user }` |
| GET | `/auth/me` | Current user |
| GET | `/exercises?search=&muscleGroup=&equipment=&custom=` | Library + your custom exercises |
| GET | `/exercises/meta` | Allowed muscle groups and equipment |
| GET | `/exercises/:id` | One exercise |
| POST | `/exercises` | Create a custom exercise: `{ name, muscleGroup, equipment, description?, image? }`. `image` must be an `http(s)://` URL (library exercises use `/exercises/<name>.jpg`, served by the frontend) |
| PUT / DELETE | `/exercises/:id` | Update / delete your custom exercise (delete is blocked while it is used in a workout) |
| GET | `/workouts?from=&to=&limit=` | Your workouts, newest first |
| POST | `/workouts` | `{ name, date, notes, exercises: [{ exercise, sets: [{ setNumber, reps, weight }] }] }` |
| GET / PUT / DELETE | `/workouts/:id` | Read / update / delete a workout |
| GET | `/plans` | Your weekly plans |
| POST | `/plans` | `{ name, weekStart, days? }` – always stores all 7 days; `weekStart` snaps to Monday |
| GET / PUT / DELETE | `/plans/:id` | Read / update / delete a plan |
| PATCH | `/plans/:id/days/:day` | Update one day (`mon`..`sun`): `{ workout, exercises, notes, done }` |
| GET | `/stats/summary` | Totals: workouts, this week, sets, volume |
| GET | `/stats/exercise/:exerciseId` | Max weight & volume per day, totals, best set |
| GET | `/stats/weekly?weeks=12` | Workouts and volume per ISO week |
| GET | `/stats/records` | Personal record per exercise |

## Notes

- Dates are stored as UTC midnight and displayed in UTC, so a workout logged for a given day always shows on that day.
- Volume = Σ (reps × weight) over all sets.
- Library exercise images live in `frontend/public/exercises/` and are served by the frontend (they end up in `dist/exercises/`). The database only stores the path, e.g. `/exercises/barbell-bench-press.jpg`. Custom-exercise image URLs are loaded directly from the URL the user enters.

## Credits

Exercise photos come from **[free-exercise-db](https://github.com/yuhonas/free-exercise-db)** by yuhonas, released under **[The Unlicense](https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE.md)** (public domain). That project is based on [exercises.json](https://github.com/wrkout/exercises.json) (also Unlicense). The images were resized to a maximum width of 800px, re-encoded as JPEG and renamed. Attribution is not required by the license, but is given here with thanks.

<details>
<summary>Image sources per exercise</summary>

Most images use the first frame (`0.jpg`) of the source exercise. "Closest match" means the dataset has no exact equivalent.

| FitTrack exercise | Source exercise (folder / frame) |
|---|---|
| Barbell Bench Press | Barbell_Bench_Press_-_Medium_Grip / 0 |
| Incline Dumbbell Press | Incline_Dumbbell_Press / 0 |
| Push-Up | Pushups / 0 |
| Cable Fly | Cable_Crossover / 0 |
| Chest Press Machine | Leverage_Chest_Press / 0 |
| Deadlift | Barbell_Deadlift / 0 |
| Pull-Up | Pullups / 0 |
| Barbell Row | Bent_Over_Barbell_Row / 0 |
| Lat Pulldown | Wide-Grip_Lat_Pulldown / 0 |
| Seated Cable Row | Seated_Cable_Rows / 0 |
| Single-Arm Dumbbell Row | One-Arm_Dumbbell_Row / 0 |
| Barbell Back Squat | Barbell_Full_Squat / 0 |
| Romanian Deadlift | Romanian_Deadlift / 0 |
| Leg Press | Leg_Press / 0 |
| Walking Lunge | Dumbbell_Lunges / 0 – closest match (stationary dumbbell lunge) |
| Lying Leg Curl | Lying_Leg_Curls / 0 |
| Standing Calf Raise | Standing_Calf_Raises / 0 |
| Goblet Squat | Goblet_Squat / 0 |
| Overhead Press | Standing_Military_Press / 0 |
| Dumbbell Lateral Raise | Side_Lateral_Raise / 0 |
| Face Pull | Face_Pull / 0 |
| Barbell Curl | Barbell_Curl / 0 |
| Hammer Curl | Hammer_Curls / 0 |
| Tricep Pushdown | Triceps_Pushdown / 0 |
| Dips | Dips_-_Triceps_Version / 0 |
| Plank | Plank / 1 |
| Hanging Leg Raise | Hanging_Leg_Raise / 0 |
| Kettlebell Swing | One-Arm_Kettlebell_Swings / 1 – closest match (one-arm swing) |
| Burpee | Mountain_Climbers / 0 – closest match (no burpee in the dataset) |
| Rowing Machine | Rowing_Stationary / 0 |

</details>
