We need to build a comprehensive data ingestion tool that enables users to extract data from Oracle Fusion (ERP) and load it into Databricks Unity Catalog, supporting four different integration patterns. The tool will have a visual UI for designing pipelines and a backend that simulates or actually performs the data movement using local Oracle 21c and Oracle GoldenGate instances. Below is a detailed prompt to generate the frontend and backend code.

---

## Prompt: Build a Data Ingestion Tool for Oracle Fusion → Databricks

### Overview
Create a web-based application that allows users to design, configure, and execute data ingestion pipelines from Oracle Fusion (simulated by a local Oracle 21c database) to Databricks (Delta tables in Unity Catalog). The tool must present four distinct integration options as a flowchart, let users click on each component to fill in connection details, and then simulate or actually run the data movement with appropriate logging and progress visualization.

The four options (based on research notes) are:

1. **BICC + Cloud Storage + AutoLoader**  
   - Use Oracle Business Intelligence Cloud Connector (BICC) to extract data into cloud storage (e.g., Azure Data Lake Storage Gen2), then use Databricks AutoLoader to incrementally ingest into Delta tables.  
   - *Simulation approach*: generate mock extract files (CSV/Parquet) into a local folder representing cloud storage; AutoLoader is simulated by a Spark job that reads new files and writes to Delta.

2. **Oracle GoldenGate (CDC) to Databricks**  
   - Use Oracle GoldenGate (installed locally) to capture changes from the source Oracle database and stream them directly to Databricks via the GoldenGate Databricks connector.  
   - *Simulation approach*: if GoldenGate is available, configure it to write to a local trail and then use a script to forward to Databricks; otherwise simulate by reading Oracle redo logs (via LogMiner) and generating change events.

3. **Direct REST API Calls from Databricks**  
   - For low‑volume, real‑time needs, call Oracle Fusion REST APIs (e.g., `fscmRestApi`) directly from a Databricks notebook.  
   - *Simulation approach*: build a mock REST API server (FastAPI) that serves fake Fusion data with filtering by `LastUpdateDate`. Databricks notebooks (simulated by Python scripts) query this API and write to Delta.

4. **Manual / JDBC Connection**  
   - For small datasets, use a JDBC connection from Databricks to the Oracle database (or manually upload files).  
   - *Simulation approach*: a Spark JDBC read from the local Oracle 21c database, with optional pushdown filters, and write to Delta.

The tool must provide a unified UI to configure any of these pipelines, visualize the data flow with technical labels (e.g., “REST API – Paginated”, “BICC – Full Export”, “GoldenGate – CDC Trail”), and execute the pipeline with real‑time logs and status updates.

### Functional Requirements

#### 1. Pipeline Designer (Flow Diagram)
- Use a flowchart library (e.g., React Flow) to create a canvas with draggable nodes representing:
  - **Source**: Oracle Fusion (simulated by local Oracle DB)
  - **Integration Options**: Four nodes for BICC, GoldenGate, REST API, JDBC
  - **Intermediate Storage** (optional): Cloud storage (ADLS, S3, etc.) – shown as a node for BICC path
  - **Target**: Databricks Unity Catalog (Delta table)
- Users can connect nodes (source → option → storage → target) to define a pipeline.
- Each node is clickable to open a configuration panel with fields specific to that component.

#### 2. Configuration Panels
- **Source (Oracle Fusion)**:  
  - Connection details: host, port, service name, username, password (encrypted)  
  - Table/View to extract: dropdown or text input  
  - Optional: filter column (e.g., `LastUpdateDate`) for incremental loads  
- **BICC Node**:  
  - BICC export format (CSV, Parquet)  
  - Output path (cloud storage simulator: local folder)  
  - Schedule/trigger (immediate or cron)  
- **GoldenGate Node**:  
  - GoldenGate installation path, Extract parameters  
  - Trail file location  
  - Databricks connection details (JDBC/Spark connector)  
- **REST API Node**:  
  - API endpoint URL (or mock server URL)  
  - Authentication (OAuth2, basic)  
  - Pagination settings  
  - Filter (e.g., `?lastUpdateDate=...`)  
- **JDBC Node**:  
  - Oracle JDBC URL, credentials  
  - Query or table name  
  - Pushdown filter  
- **Cloud Storage Node**:  
  - Storage type (ADLS, S3, local)  
  - Container/bucket path  
  - Credentials (if applicable)  
- **Databricks Target**:  
  - Workspace URL, access token  
  - Catalog, schema, table name  
  - Write mode (append, overwrite, merge)  
  - Delta table options (partitioning, Z-ordering)

#### 3. Execution & Simulation
- After configuration, user clicks “Run” on a pipeline.
- Backend executes the steps according to the selected option, either by:
  - Actually using installed components (Oracle GoldenGate, local Spark) OR
  - Simulating the data movement with logging and mock data (for demo/presentation).
- Real‑time logs appear in the UI (e.g., “Extracting via BICC...”, “Writing to storage...”, “AutoLoader detected new file...”, “CDC stream started...”).
- Progress bar or status icons for each node.
- On completion, show summary: rows extracted, rows loaded, time taken.

#### 4. Backend Simulation Details
- For **BICC**: generate random data matching the selected table schema (can be predefined or discovered from Oracle) and write files to a local directory. Then simulate AutoLoader by periodically scanning that directory and appending to a Delta table (using a local Spark session or Delta Lake library).
- For **GoldenGate**: if actual GoldenGate is available, provide configuration templates and start/stop commands; otherwise simulate by tailing Oracle redo logs using LogMiner (via Python/cx_Oracle) and producing change events (INSERT/UPDATE/DELETE) that are written to a Delta table as CDC.
- For **REST API**: start a mock FastAPI server that serves paginated JSON responses from a predefined dataset (or from Oracle queries). The ingestion script (Python) calls the API, transforms, and writes to Delta.
- For **JDBC**: use Spark (PySpark) locally (or via Databricks Connect) to read from Oracle and write to Delta.
- All Oracle interactions must use `cx_Oracle` or `oracledb` (python-oracledb) and handle credentials securely (environment variables or encrypted config).
- Databricks interactions: if a real Databricks workspace is unavailable, simulate using local Delta tables (DuckDB or Delta Lake Python library). But the UI should allow optional real connection.

#### 5. Technology Stack
- **Frontend**: React with TypeScript, React Flow for diagrams, Tailwind CSS for styling, and a component library (e.g., shadcn/ui). State management: Zustand or Redux Toolkit.
- **Backend**: Python (FastAPI) for REST API endpoints, with subprocess management for local tools. Use `oracledb` for Oracle connectivity, `delta-spark` or `deltalake` (Python) for Delta operations. For Spark, use `pyspark` with local mode if needed.
- **Database**: SQLite or PostgreSQL for storing pipeline configurations and credentials (encrypted).
- **Authentication**: simple login (optional, but can be omitted for local tool).

#### 6. Deliverables
- Full source code for frontend and backend.
- Documentation on how to set up and run the tool locally (including dependencies: Node.js, Python, Oracle Instant Client, Spark, etc.).
- A sample Oracle database schema (scripts) to populate with test data.
- Mock REST API server code (FastAPI) that mimics Oracle Fusion endpoints.
- Configuration templates for GoldenGate (if used).

#### 7. Additional Considerations
- **Security**: Passwords and tokens must be stored encrypted (e.g., using Fernet or a keyring).
- **Extensibility**: The tool should be designed so new integration options can be added later.
- **Error Handling**: Graceful failure messages in UI and logs.
- **Performance**: For simulation, handle up to a few thousand rows; no need for massive scale.

### Example Workflow
1. User opens the tool, sees an empty canvas.
2. Drags “Oracle Fusion” node onto canvas.
3. Drags “BICC” node and connects to source.
4. Drags “Cloud Storage” node and connects to BICC.
5. Drags “Databricks” node and connects to storage.
6. Clicks each node to fill in details (e.g., source table = `GL_BALANCE_FACT`, BICC output folder = `./data/bicc/`, storage path = `./data/adls/`, target table = `bronze.invoices`).
7. Clicks “Run”. Backend starts: generates CSV files, then runs AutoLoader (Spark job) to read from storage and write to Delta.
8. UI shows live logs: “BICC export complete: 1000 rows”, “AutoLoader started”, “Loaded 1000 rows to delta table”.
9. Final status: “Success”.

### References
- [Databricks Community Thread on Oracle Fusion to Azure Databricks](https://community.databricks.com/t5/data-engineering/design-oracle-fusion-scm-to-azure-databricks/m-p/138999)
- [Oracle BICC Documentation](https://docs.oracle.com/en/cloud/saas/applications-common/26a/biacc/index.html)
- [Oracle GoldenGate for Databricks](https://docs.oracle.com/en/cloud/paas/goldengate-service/idmji/)
- [Perficient Blog: Databricks for Oracle Fusion Cloud](https://blogs.perficient.com/2025/02/24/databricks-for-oracle-fusion-cloud-applications/)
- [Perficient Blog: Databricks Accelerator](https://blogs.perficient.com/2025/02/25/databricks-accelerator-for-oracle-fusion-applications/)
- [GoldenGate to ADLS](https://docs.oracle.com/en/cloud/paas/goldengate-service/mamqs/)

### Notes
- Since Oracle Fusion is not directly accessible, use a local Oracle 21c database to simulate the source. The mock REST API should also serve data from this database.
- GoldenGate local installation can be used optionally; if not present, simulate CDC using LogMiner or a trigger-based mechanism.
- The UI must be clean, professional, and intuitive, with accurate technical labels (e.g., “BICC – Full Export via REST”, “GoldenGate – Trail to Databricks Connector”).
- All four options must be demonstrable in the tool.

