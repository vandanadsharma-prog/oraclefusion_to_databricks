# FastAPI backend (Oracle Fusion → Databricks)

This folder contains a real Python/FastAPI backend that the frontend “Run” button can call.

## Run locally

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 9000
```

Optional config:
- See `backend/.env.example` (copy to `backend/.env`)
- Demo Oracle schema bootstrap: `backend/sql/bootstrap_oracle_21c.sql`

Then set the frontend env var (PowerShell):

```powershell
$env:VITE_BACKEND_URL="http://localhost:9000"
npm run dev
```

If you use masked passwords (e.g. `••••••••`) in the UI, set:

```powershell
$env:BACKEND_ORACLE_PASSWORD="your_password"
```

For a step-by-step local setup (Oracle 21c + GoldenGate + frontend + backend), see `../LOCAL_SETUP.md`.

## Endpoints

- `POST /api/runs` → starts a run and returns `run_id`
- `GET /api/runs/{run_id}/events` → Server-Sent Events stream (logs/progress/status)
- `POST /api/runs/{run_id}/stop` → request stop
- `GET /fscmRestApi/resources/11.13.18.05/invoices` → mock Fusion invoices API
