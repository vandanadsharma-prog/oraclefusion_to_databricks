# Local Setup (Windows): Frontend + FastAPI backend + Oracle 21c + GoldenGate

This guide assumes **no Oracle experience**. It is written for running everything locally on Windows.

## 1) What you’re running

- **Frontend (Vite + React)**: the UI with the “Run Pipeline” button.
- **Backend (FastAPI)**: receives the “Run” request and runs the selected pattern.
- **Oracle 21c (local)**: used to *simulate* Oracle Fusion’s underlying data tables.
- **GoldenGate (local)**: optional. Right now the backend verifies `ggsci` exists and can read its version; full Extract/Replicat wiring can be added next.

Important context (Fusion SaaS reality):
- Oracle Fusion SaaS does **not** give JDBC/SQL access to its underlying DB. For real Fusion, you typically use **REST/SOAP**, **BICC**, **OTBI**, etc.
- In this demo tool, we simulate “Fusion data” using a local Oracle 21c database so you can test the pipeline patterns end-to-end.

---

## 2) Prerequisites (install once)

Install these first:
- **Node.js** (LTS) + npm
- **Python** 3.10+ (3.11 recommended)
- **Oracle Database 21c** (local installation)
- **Oracle GoldenGate 21c** (optional)

You’ll also need a terminal (PowerShell) and permission to run local services.

---

## 3) Start the frontend (UI)

From the repo root:

```powershell
npm i
npm run dev
```

This starts the UI (usually at `http://localhost:5173`).

---

## 4) Start the backend (FastAPI)

Open a second terminal:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 9000
```

You should be able to open:
- `http://localhost:9000/health`

---

## 5) Point the UI “Run” button to the backend

In the *frontend* terminal (repo root), set:

```powershell
$env:VITE_BACKEND_URL="http://localhost:9000"
npm run dev
```

If `VITE_BACKEND_URL` is **not** set, the UI will keep using **SIMULATION** mode.

---

## 6) Connect the tool to Oracle 21c (local)

### 6.0 Make sure Oracle is running

After you install Oracle Database 21c, it runs as Windows services.

1) Open Windows **Services**:
- Press `Win + R` → type `services.msc` → Enter

2) Look for Oracle services and make sure they’re **Running**:
- A database service like `OracleService...` (name varies)
- A listener service like `...TNSListener` (name varies)

3) Optional: verify the listener is listening on port 1521:

```powershell
netstat -ano | findstr :1521
```

If you don’t see anything listening on `:1521`, the listener likely isn’t running yet.

### 6.1 Find your Oracle “service name”

The tool needs:
- host (usually `localhost`)
- port (usually `1521`)
- **service name** (common examples: `ORCLPDB1` or `XEPDB1`)

If you installed Oracle XE 21c, the PDB service is commonly `XEPDB1`.
If you installed Oracle Database 21c with a default container, it’s often `ORCLPDB1`.

Optional: you can also run this to see services known to the listener:

```powershell
lsnrctl status
```

Look for lines like `Service "ORCLPDB1" has 1 instance(s).`

### 6.2 Create demo tables + user (recommended)

This repo includes a bootstrap SQL script:
- `backend/sql/bootstrap_oracle_21c.sql`

Run it in your PDB using SQL*Plus (ships with Oracle DB):

```powershell
cd c:\Users\HP\Documents\Jobs\InfoBeans\Projects\oraclefusion_to_databricks
sqlplus system@localhost:1521/ORCLPDB1
```

Then inside SQL*Plus:

```sql
@backend/sql/bootstrap_oracle_21c.sql
```

It creates:
- user: `FUSION_USER`
- password: `FusionPass123`
- tables used by the templates:
  - `FUSION_USER.GL_JE_HEADERS`
  - `FUSION_USER.AP_INVOICES_ALL`
  - `FUSION_USER.OE_ORDER_HEADERS_ALL`

### 6.3 Put Oracle connection values into the UI

In the UI, click the **Oracle Fusion** node and set:
- `host`: `localhost`
- `port`: `1521`
- `serviceName`: `ORCLPDB1` (or your PDB service, e.g. `XEPDB1`)
- `username`: `FUSION_USER`
- `password`: `FusionPass123`
- `table`: `FUSION_USER.GL_JE_HEADERS` (for the BICC template)
- `filterColumn` / `filterValue` (optional)

### 6.4 Masked password handling (important)

Some templates show passwords as `••••••••`. If you leave that masked value in the UI, the backend will NOT know your real password.

Fix: set an environment variable before starting the backend:

```powershell
$env:BACKEND_ORACLE_PASSWORD="FusionPass123"
cd backend
uvicorn app.main:app --reload --port 9000
```

---

## 7) Connect the tool to GoldenGate (local)

### 7.1 What is implemented today

Backend runner file:
- `backend/app/services/runners/goldengate.py`

Current behavior:
- Finds `ggsci.exe` using either:
  - the UI field **GoldenGate → installPath**
  - OR `ggsci` on your system `PATH`
- Runs `version` in `ggsci` (non-interactive) and streams output to the UI logs
- **Does not** yet generate CDC into Databricks/Delta (that wiring is the next step)

### 7.2 Where to set the GoldenGate install path

In the UI, click the **GoldenGate** node and set:
- `installPath`: the folder that contains `ggsci.exe`

Example:
- `C:\Oracle\gg21c` (only an example — use your real folder)

Alternative (PATH):
- Add the GoldenGate home to your `PATH` so `ggsci` works in PowerShell:
  - `ggsci`

### 7.3 Quick validation

With backend running and `VITE_BACKEND_URL` set:
- Load the **GoldenGate CDC** template
- Click **Run Pipeline**
- Look at “Execution Logs” for a line indicating `ggsci` was found and its version output

If it fails, you’ll see a clear error like:
- “GoldenGate ggsci not found (set installPath or add ggsci to PATH).”

---

## 8) Which pipeline pattern should you try first?

Recommended order:
1. **REST API**: doesn’t require Oracle DB; uses the backend’s mock Fusion endpoint (default: `http://localhost:9000/fscmRestApi/...`).
2. **BICC**: connects to Oracle and exports a table to a CSV file under your configured `outputPath`.
3. **JDBC**: currently runs a SELECT against Oracle (counts rows); Spark write is still a stub.
4. **GoldenGate**: currently validates `ggsci`; full CDC wiring is still a stub.

---

## 9) Where to “plug in” real installation paths / tools in code

- Oracle 21c connectivity + export logic:
  - `backend/app/services/runners/bicc.py`
  - `backend/app/services/runners/jdbc.py`
- GoldenGate install path resolution + GG command execution:
  - `backend/app/services/runners/goldengate.py`
- UI → backend wiring (Run button):
  - `src/app/store/pipelineStore.ts`

---

## 10) Troubleshooting

- Backend not used (still simulation):
  - Ensure `VITE_BACKEND_URL` is set in the terminal where you run `npm run dev`.
- CORS issues:
  - Backend allows `http://localhost:5173` by default; see `backend/app/core/config.py`.
- Oracle connect failures:
  - Verify host/port/serviceName
  - Verify the DB and Listener services are running
  - If password is masked in UI, set `BACKEND_ORACLE_PASSWORD`
- GoldenGate not found:
  - Set GoldenGate node `installPath` to the folder containing `ggsci.exe`, or add it to PATH
