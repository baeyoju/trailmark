# trailmark
A local first browsing history tracker with a React dashboard, Flask API, Supabase PostgreSQL database, and browser extensions for Chromium based browsers and Firefox.

## Configure Supabase

1. In the Supabase SQL Editor, run [`supabase/migrations/20261108000000_create_visits.sql`](supabase/migrations/20261108000000_create_visits.sql).
2. In the Supabase dashboard, open **Connect** and copy a PostgreSQL connection string. For a local persistent Flask service, use the **Session pooler** connection if your network is IPv4 only.
3. Copy `backend/.env.example` to `backend/.env`, then set `DATABASE_URL` to that connection string. Keep this password private and do not put it in the frontend or an extension.

The `visits` table has row level security enabled and does not grant access to browser client roles. The Flask service uses `DATABASE_URL` on the server. The browser extensions and dashboard continue to call the local Flask API.

## Start the backend

From the project root, create a virtual environment and install the backend dependencies:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
py app.py
```

Flask listens only on `127.0.0.1:5000`. Change `TRACKER_KEY` in `backend/.env` and use the same value in both extension `background.js` files and `frontend/src/App.jsx`.

## Start the dashboard

In another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL Vite prints, usually `http://localhost:5173`.

## Install the browser extension

For Chrome, Edge, or Brave, open the browser's extensions page, turn on **Developer mode**, choose **Load unpacked**, and select this project's `extension` folder. In Firefox, open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on**, and select `extension-firefox/manifest.json`. Keep Flask running while browsing. Install the extension separately in each browser profile you want to track.

The extension records top level page navigations, including single page app URL changes. It does not record browser internal pages (`chrome://`), file URLs, or subframe navigation. It records page URLs and titles, which can include sensitive information embedded in a URL. The hostname shown for a visit is the computer running Flask. Earlier local database records are not copied into Supabase by this change; new visits get a hostname when saved. Use the dashboard's **Clear** action to delete recorded history, or stop the Flask service to pause collection.

## API

- `GET /api/health` — service health
- `POST /api/visits` — record a visit
- `GET /api/visits?limit=100&q=example` — recent/searchable visits
- `GET /api/summary` — totals and top sites
- `DELETE /api/visits` — clear all visits

All `/api` routes except health require the `X-Tracker-Key` header.
