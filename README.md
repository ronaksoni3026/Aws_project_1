# Institutional Campus Placement Portal

A secure, multi-tenant web application modeling an institutional campus placement portal with strict **Role-Based Access Control (RBAC)**, **physical entity isolation**, **statechart workflows**, **centralized server-side eligibility gating**, **transactional ATS pipelines**, and **application-level immutable audit logging**.

---

## Architecture & Technology Stack

| Layer | Technology | Key Architectural Responsibility |
|---|---|---|
| **Backend API** | FastAPI (Python 3.9+) | Dependency injection for RBAC, Pydantic validation, async handling, BackgroundTasks |
| **Database** | PostgreSQL / SQLite | Physical entity isolation, foreign keys, compound indexes, ACID transactions |
| **Authentication** | Stateless JWT (HS256) | Role claims (`STUDENT`, `RECRUITER`, `ADMIN`), passlib with bcrypt hashing |
| **Asynchronous Engine** | FastAPI `BackgroundTasks` | Non-blocking observer dispatches (applicant alerts on job archiving) |
| **API Shields** | SlowAPI | Route-level rate limiting protecting application submissions and auth |
| **Frontend UI** | React 18 + Tailwind CSS | Dynamic role-based dashboard rendering, eligibility tooltips, ATS data tables |

---

## System Actors & Access Control Matrix

```
                      ┌───────────────────────────────────────┐
                      │          FastAPI Gatekeeper           │
                      │       (JWT Claim & Role Check)        │
                      └──────────────────┬────────────────────┘
                                         │
                 ┌───────────────────────┼───────────────────────┐
                 ▼                       ▼                       ▼
      ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
      │  Student Applicant  │ │  Company Recruiter  │ │ Placement Cell Admin│
      │   (Table: students) │ │  (Table: recruiters)│ │   (Table: admins)   │
      └──────────┬──────────┘ └──────────┬──────────┘ └──────────┬──────────┘
                 │                       │                       │
      • Academic Metrics      • Staging Queue (PENDING) • Recruiter Vetting
      • Smart Job Feed        • Active Verification     • Job Vetting + Feedback
      • Eligibility Gating    • Job State Machine       • Immutable Audit Logs
      • Application Stepper   • ACID Batch ATS Updates  • Real-Time Platform KPIs
      • Background Alert Box  • Soft Deletions          • Query-Limited Views
```

---

## Core System Lifecycles & Statecharts

### 1. Recruiter Onboarding Workflow
```
[Registration] ──► (PENDING) ──► Admin Review ──► (ACTIVE)   ──► Job Creation Unlocked
                                            └──► (REJECTED) ──► HTTP 403 Forbidden
```
- Newly registered recruiters default to `PENDING`.
- Attempts to post jobs before activation are blocked with **HTTP 403 Forbidden**.

### 2. Job Posting State Machine & Feedback Loop
```
   ┌─────────────────────────────────────────────────────────────┐
   │                                                             │
   ▼                                                             │
[DRAFT] ──► [PENDING_APPROVAL] ──► Admin Approves ──► [ACTIVE] ──┼──► [CLOSED]
                 │                                               │
                 └──► Admin Requests Changes                     ▼
                             │                          [SOFT DELETED]
                             ▼                    (BackgroundTasks Alert)
                     [REQUIRES_CHANGES]
                   (with admin_feedback)
```
- When an admin rejects a job draft, it transitions to `REQUIRES_CHANGES` with mandatory `admin_feedback` text appended.
- Recruiter edits and resubmits without starting over.
- Soft delete flips `is_deleted = True` and dispatches asynchronous student alerts via `BackgroundTasks`.

### 3. Server-Side Eligibility Engine
All application submissions are intercepted server-side and evaluated against:
1. **Mathematical CGPA Check**: `student.cgpa >= job.min_cgpa`
2. **Categorical Department Check**: `student.branch in job.allowed_branches`
3. **Categorical Batch Check**: `student.graduation_year in job.allowed_graduation_years`
4. **Resume Verification**: `student.resume_url` must be a valid, sanitized `HttpUrl`

> If criteria are not met, the request is blocked with **HTTP 422 Unprocessable Entity** and a structured JSON payload:
```json
{
  "detail": {
    "message": "Eligibility criteria not met. Application rejected by server gatekeeper.",
    "eligible": false,
    "reasons": [
      "Minimum CGPA required is 8.00, but student profile has 7.20",
      "Student branch 'Mechanical' is not included in eligible departments: [CSE, ECE]"
    ]
  }
}
```

### 4. Applicant Tracking System (ATS) Funnel & ACID Batch Updates
```
[Applied] ──► [Under Review] ──► [Shortlisted] ──► [Offered] or [Rejected]
```
- Multi-candidate batch status updates are wrapped in an atomic PostgreSQL transaction.
- If any candidate reference is invalid or belongs to another job, the entire transaction rolls back immediately (zero partial writes).

---

## Quickstart & Local Setup

### 1. Prerequisites
- Python 3.9+ installed.
- (Optional) Docker for PostgreSQL container deployment.

### 2. Clone & Install Dependencies
```bash
git clone <repo-url>
cd Aws_project_1

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# Install locked dependencies
pip install -r requirements.txt
```

### 3. Run Automated Tests
```bash
pytest tests/ -v
```

### 4. Launch Application Server
```bash
# Seed initial admin and run FastAPI with hot reload
uvicorn backend.main:app --reload --port 8000
```
- Open browser at **`http://127.0.0.1:8000`** to access the interactive web portal.
- Interactive Swagger API docs are available at **`http://127.0.0.1:8000/docs`**.

### 5. Default Credentials for Instant Testing
- **Placement Cell Admin**: `admin@placement.edu` / `Admin@1234`
- Alternatively, register as a new **Student** or **Recruiter** directly from the UI.

---

## Docker Deployment (PostgreSQL Production Mode)
```bash
docker-compose up --build
```
This spins up:
- PostgreSQL 15 container (`placement_portal_postgres`) on port 5432.
- FastAPI backend container (`placement_portal_api`) on port 8000.

---

## API Route Summary

### Authentication (`/api/auth`)
- `POST /register/student` - Register student applicant.
- `POST /register/recruiter` - Register company recruiter (defaults to PENDING).
- `POST /login` - Role-aware login issuing stateless JWT.
- `GET /me` - Retrieve current user session.

### Student Applicant (`/api/student`)
- `GET /profile` & `PUT /profile` - Academic metric management with `HttpUrl` validation.
- `GET /jobs` - Smart job board enriched with server-side eligibility evaluation.
- `POST /jobs/{id}/apply` - Gated job application endpoint (HTTP 422 on failure).
- `GET /applications` - Student application macro-funnel tracker.
- `GET /notifications` - Asynchronous student alert inbox.

### Recruiter Portal (`/api/recruiter`)
- `GET /jobs` & `POST /jobs` - Job creation (locked with HTTP 403 for PENDING recruiters).
- `PUT /jobs/{id}` - Edit job (allowed in DRAFT and REQUIRES_CHANGES).
- `POST /jobs/{id}/submit` - Submit job for approval.
- `POST /jobs/{id}/close` - Close recruitment drive.
- `DELETE /jobs/{id}` - Soft-delete job with automated background alerts.
- `GET /jobs/{id}/applications` - Paginated ATS table with status/branch filtering.
- `POST /jobs/{id}/applications/batch-update` - ACID transactional batch updater.

### Administrative Oversight (`/api/admin`)
- `GET /recruiters/pending` - Recruiter onboarding staging queue.
- `POST /recruiters/{id}/approve` & `POST /recruiters/{id}/reject` - Recruiter vetting.
- `GET /jobs/pending` - Job review queue.
- `POST /jobs/{id}/approve` - Approve job for student discovery.
- `POST /jobs/{id}/request-changes` - Feedback loop (transitions to REQUIRES_CHANGES).
- `GET /audit-logs` - Paginated immutable audit trail.
- `GET /metrics` - Real-time platform KPI dashboard.