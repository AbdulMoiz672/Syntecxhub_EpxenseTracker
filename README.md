# Syntecxhub_EpxenseTracker

A responsive expense-tracking dashboard built with React, Vite, Express, and MongoDB. Users register and sign in before reaching the dashboard. MongoDB stores accounts, expenses, and server-side sessions; each account can access only its own expenses.

## Features

- Add expenses with merchant, amount, category, date, and optional note.
- View recent transactions, search them, filter by category, and delete records.
- Review monthly totals, budget progress, daily averages, category totals, and a rolling seven-day chart.
- Persist expense records in MongoDB rather than browser storage.
- Register and sign in with an email and password.
- Keep sessions in MongoDB and protect expenses with HTTP-only cookies.
- Isolate expense records by authenticated account.
- Validate expense fields in the API and database model.
- Use a responsive dashboard layout on desktop and mobile.

The database starts empty. Expenses previously saved only in browser localStorage are not automatically imported.

## Technology

- React 18 and Vite 6 for the browser application.
- Express 4 for the JSON API.
- Mongoose 8 for MongoDB connection, schema validation, and persistence.
- bcryptjs for password hashing, `express-session` for authentication sessions, and `connect-mongo` for session storage.
- `concurrently` to run the API and Vite development server together.
- Lucide React for interface icons.

## Project Layout

```text
src/
  App.jsx              Session gate, dashboard, summaries, and expense form
  AuthPage.jsx         Registration and sign-in interface
  main.jsx             React entry point
  styles.css           Responsive dashboard styling
  auth.css             Responsive authentication styling
  data/
    authApi.js         Browser client for account/session endpoints
    expensesApi.js     Browser HTTP client for the expense API
server/
  index.js             Express auth/API routes and MongoDB connection
  models/
    Expense.js         Mongoose schema and field validation
    User.js            Mongoose account schema
.env.example           Local MongoDB and API defaults
index.html              Vite HTML entry point
vite.config.js          React plugin and /api development proxy
package.json            Dependencies and npm scripts
```

## Requirements

- Node.js 20 or newer and npm.
- MongoDB Community Server running locally, or an accessible MongoDB instance.
- MongoDB Compass is optional and is only a database client; it does not start MongoDB Server.

The default database connection is:

```text
mongodb://127.0.0.1:27017/expense_tracker
```

The database name is `expense_tracker`. Mongoose stores accounts in `users` and expense records in `expenses`; MongoDB-backed sessions use `sessions`. A randomly generated cookie-signing key is stored in `app_settings`, so it persists across server restarts without a manually configured session secret.

## Configure

Copy `.env.example` to `.env` if you need to change the defaults. On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Then edit `.env`:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/expense_tracker
PORT=3102
```

`MONGODB_URI` selects the MongoDB server and database. `PORT` selects the Express API port. The `.env` file is ignored by Git. For MongoDB Atlas, use the connection URI provided by Atlas as `MONGODB_URI`; keep credentials private and configure Atlas network access for the development machine.

## Run Locally

Start MongoDB Server before starting the application. Then, from the project directory:

```bash
npm install
npm run dev
```

The `dev` script starts both processes:

- Vite frontend: `http://localhost:5173`
- Express API: `http://127.0.0.1:3102`

Vite proxies requests under `/api` to Express. If port 5173 is already occupied, Vite may select the next available port and print it in the terminal. `npm run dev:api` starts only the API; `npm run dev:web` starts only Vite.

Check API and database status at:

```text
http://127.0.0.1:3102/api/health
```

A healthy response includes `"status":"ok"` and `"database":"connected"`.

## API Reference

All endpoints return JSON. Registration and login establish a MongoDB-backed session using an HTTP-only cookie. Expense routes require that session.

| Method | Path | Description | Success |
| --- | --- | --- | --- |
| `GET` | `/api/health` | Report API and MongoDB connection status. | `200` |
| `POST` | `/api/auth/register` | Create an account and sign in. | `201` |
| `POST` | `/api/auth/login` | Verify credentials and sign in. | `200` |
| `GET` | `/api/auth/session` | Return the current signed-in account. | `200` |
| `POST` | `/api/auth/logout` | Destroy the current session. | `200` |
| `GET` | `/api/expenses` | Return the current user's expenses, newest dates first. | `200` |
| `POST` | `/api/expenses` | Validate and create an expense for the current user. | `201` |
| `DELETE` | `/api/expenses/:id` | Delete one of the current user's expenses. | `200` |

Registration accepts `name`, `email`, and `password`. Passwords must contain 8–128 characters; passwords are never stored as plain text. Duplicate email addresses return `409`. Login accepts `email` and `password`; invalid credentials return `401`. Expense endpoints return `401` if there is no valid session.

Example create request:

```json
{
  "merchant": "Corner Cafe",
  "category": "Dining",
  "amount": 12.5,
  "date": "2026-09-28",
  "note": "Lunch"
}
```

Expense fields:

- `merchant`: required string, trimmed, maximum 60 characters.
- `category`: required; one of `Groceries`, `Dining`, `Transport`, `Shopping`, `Subscriptions`, `Housing`, or `Other`.
- `amount`: required number greater than zero.
- `date`: required valid calendar date in `YYYY-MM-DD` format.
- `note`: optional string, maximum 80 characters.
- `id`: generated by MongoDB and returned as a string.

Invalid fields and malformed IDs return `400`; an unknown expense ID returns `404`; unexpected server errors return `500`.

## Build

Create a production frontend bundle and preview it with:

```bash
npm run build
npm run preview
```

For a production deployment, run the API with `node server/index.js`, configure a production MongoDB URI, use HTTPS, and serve the frontend through a host or reverse proxy that routes `/api` to Express. Restrict access to MongoDB because it stores password hashes, sessions, and the cookie-signing key. Existing expenses from the earlier shared collection have no owner and are not automatically assigned to new accounts.

## Troubleshooting

### `ECONNREFUSED 127.0.0.1:27017`

MongoDB Compass tried to connect, but no MongoDB Server is accepting connections on the local default port. Install MongoDB Community Server and start its Windows service, then retry in Compass with `mongodb://127.0.0.1:27017`. Compass alone is not the server.

In PowerShell, the service status can be checked with:

```powershell
Get-Service MongoDB
```

If the project uses a different MongoDB host or port, update `MONGODB_URI` in `.env`, then restart `npm run dev` so the API reloads the configuration.

### API is unavailable

Check the `api` process output in the terminal. The API does not start listening until it connects to MongoDB. Confirm MongoDB is running, confirm `MONGODB_URI`, and check that port 3102 is available. Then restart `npm run dev` and open `/api/health` again.

### Compass opens but the project still cannot connect

Compass may connect to a URI different from the one configured in `.env`. Use the same server host, port, and database URI in both places. For a local server, the project default is `mongodb://127.0.0.1:27017/expense_tracker`.
