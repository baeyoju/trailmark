from __future__ import annotations

import os
import socket
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

import psycopg
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from psycopg.rows import dict_row

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env")
DATABASE_URL = os.environ.get("DATABASE_URL", "")
TRACKER_KEY = os.environ.get("TRACKER_KEY", "change-this-local-key")

app = Flask(__name__)


def connect() -> psycopg.Connection:
    if not DATABASE_URL:
        raise RuntimeError("Set DATABASE_URL in backend/.env to your Supabase PostgreSQL connection string.")
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


@app.before_request
def authorize_and_cors_preflight():
    origin = request.headers.get("Origin", "")
    if request.method == "OPTIONS":
        return ("", 204)
    if request.path.startswith("/api/") and request.path not in ("/api/health",) and request.headers.get("X-Tracker-Key") != TRACKER_KEY:
        return jsonify(error="Unauthorized. Set the matching TRACKER_KEY in the backend and extension."), 401


@app.after_request
def add_cors_headers(response):
    origin = request.headers.get("Origin", "")
    if origin in ("http://localhost:5173", "http://127.0.0.1:5173") or origin.startswith(("chrome-extension://", "moz-extension://")):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Vary"] = "Origin"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, X-Tracker-Key"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, DELETE, OPTIONS"
    return response


@app.get("/api/health")
def health():
    return jsonify(status="ok")


@app.post("/api/visits")
def record_visit():
    data = request.get_json(silent=True) or {}
    url = data.get("url", "")
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        return jsonify(error="Only http and https pages can be recorded."), 400
    visited_at = data.get("visited_at")
    if not isinstance(visited_at, str):
        visited_at = datetime.now(timezone.utc).isoformat()

    with connect() as db:
        row = db.execute(
            """INSERT INTO public.visits
                (url, title, domain, device_hostname, browser, transition, visited_at)
               VALUES (%s, %s, %s, %s, %s, %s, %s)
               ON CONFLICT (url, visited_at) DO NOTHING
               RETURNING *""",
            (
                url[:4096],
                str(data.get("title", ""))[:500],
                parsed.hostname.lower(),
                socket.gethostname()[:255],
                str(data.get("browser", "Chromium"))[:80],
                str(data.get("transition", "navigate"))[:80],
                visited_at[:50],
            ),
        ).fetchone()
        if row is None:
            row = db.execute(
                "SELECT * FROM public.visits WHERE url = %s AND visited_at = %s",
                (url[:4096], visited_at[:50]),
            ).fetchone()
    return jsonify(row), 201


@app.get("/api/visits")
def list_visits():
    limit = min(max(request.args.get("limit", 100, type=int), 1), 500)
    query = request.args.get("q", "").strip()
    with connect() as db:
        if query:
            rows = db.execute(
                """SELECT * FROM public.visits
                   WHERE domain ILIKE %s OR title ILIKE %s OR url ILIKE %s OR device_hostname ILIKE %s
                   ORDER BY visited_at DESC LIMIT %s""",
                (f"%{query}%", f"%{query}%", f"%{query}%", f"%{query}%", limit),
            ).fetchall()
        else:
            rows = db.execute(
                "SELECT * FROM public.visits ORDER BY visited_at DESC LIMIT %s", (limit,)
            ).fetchall()
    return jsonify(rows)


@app.get("/api/summary")
def summary():
    with connect() as db:
        total = db.execute("SELECT COUNT(*) AS count FROM public.visits").fetchone()["count"]
        domains = db.execute("SELECT COUNT(DISTINCT domain) AS count FROM public.visits").fetchone()["count"]
        top = db.execute(
            "SELECT domain, COUNT(*) AS visits FROM public.visits GROUP BY domain ORDER BY visits DESC LIMIT 8"
        ).fetchall()
    return jsonify(total_visits=total, unique_sites=domains, top_sites=top)


@app.delete("/api/visits")
def clear_visits():
    with connect() as db:
        db.execute("DELETE FROM public.visits")
    return jsonify(deleted=True)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
