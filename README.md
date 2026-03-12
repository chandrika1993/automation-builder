
# Automation Builder

A visual workflow automation builder built with Next.js and ReactFlow. Create, edit, and manage multi-step automation workflows using a drag-and-drop canvas.

The goal of this project is to demonstrate:

- Clean architecture and separation of concerns
- Type-safe full-stack development
- Scalable workflow data persistence
- Thoughtful UI/UX improvements
- Practical API design


- # 🚀 Tech Stack

## Frontend
- Next.js
- React
- TypeScript
- React Flow (workflow canvas)

## Backend
- Next.js API Routes
- TypeScript

## Database
- PostgreSQL
- Prisma ORM

---

# ✨Features

## Workflow Builder
- Drag and drop nodes onto the canvas
- Connect nodes using edges
- Edit node properties using a modal
- Real-time workflow state updates

## Workflow Management
- Create workflows
- Retrieve workflows
- Update workflows
- Delete workflows

## UI/UX Improvements
- Improved node styling
- Better spacing and layout
- Clear visual hierarchy
- Intuitive controls

## Additional Features
- Multiple node types (email, webhook, delay, condition)
- Workflow validation (cycle detection and orphan nodes)
- Keyboard shortcuts
- Workflow Templates
- Export / import workflows
  
---

## Setup Instructions

### Prerequisites

- Node.js 22
- PostgreSQL (or any Prisma-supported database)

### Installation

```bash
git clone <repo-url>
cd automation-builder
npm install
```

### Environment

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Required variables:

```
DATABASE_URL=postgresql://user:password@localhost:5432/automation_builder
```

### Database

## 🗄 Database Setup (Prisma + PostgreSQL)

This project uses **PostgreSQL** as the database and **Prisma ORM** for schema management and database access.

You can run PostgreSQL either **locally** or using **Docker (recommended)**.

---

# Option 1 — Using Docker (Recommended)

### 1. Start PostgreSQL with Docker

Run the following command:

```bash
docker run --name workflow-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=automation_workflows \
  -p 5432:5432 \
  -d postgres
```
This will start a PostgreSQL container running on port 5432.
---

Run Prisma migrations to create the schema:

```bash
npx prisma migrate dev --name init
npx prisma generate
```

Or if a migration already exists:

```bash
npx prisma migrate deploy
npx prisma generate
```

To inspect the database in the browser:

```bash
npx prisma studio
```

### Running Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Database Schema

```prisma
model Workflow {
  id        String   @id @default(cuid())
  name      String
  nodes     Json     @default("[]")
  edges     Json     @default("[]")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

## Architecture

### Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Framework  | Next.js 15 (App Router)           |
| Canvas     | ReactFlow (`@xyflow/react`)       |
| Database   | PostgreSQL via Prisma ORM         |
| Validation | Zod (API), custom util (canvas)   |
| Styling    | Plain CSS Modules                 |

### Key Architecture Decisions

**Ref-mirrored state for async callbacks**

`workflowId` and `workflowName` are held in both React state (for rendering) and refs (`workflowIdRef`, `workflowNameRef`). Async callbacks like auto-save and `commitTitle` read from refs to avoid stale closure bugs — they always see the current value regardless of when they were created.

**Generation counter for stale save prevention**

`workflowGenRef` is a monotonic integer incremented on every `applyWorkflow` call. The auto-save effect captures it at schedule time and checks it before firing the PUT. If the user switches workflows before the debounce resolves, the stale save is silently aborted, preventing one workflow's nodes from overwriting another's.

**`initialized` settle window**

ReactFlow fires internal position change events when a workflow loads (fitView, mount corrections). A 200ms window where `initialized.current = false` prevents these from being treated as user edits and triggering unnecessary saves or unsaved-change indicators.

**`lastSavedRef` diff check**

Rather than saving on every debounce tick, auto-save serialises nodes and edges and compares them against `lastSavedRef`. Saves are skipped entirely when nothing meaningful has changed — this avoids redundant writes from ReactFlow's internal state corrections.

**Partial PUT updates**

The `PUT /api/automations/[id]` route only writes fields present in the request body using conditional object spreading. A rename-only request does not touch nodes/edges columns, and a canvas save does not touch the name column.

**`applyWorkflow` as the single load path**

All ways of loading a workflow (initial page load, opening from list, creating new, importing, applying a template) go through a single `applyWorkflow` function. This ensures consistent behaviour: refs are synced, `lastSavedRef` is stamped, and the settle window is always respected.

---

## API Routes

### `GET /api/automations`
Returns a paginated list of workflows ordered by most recently updated.
Query params: `page` (default 1), `limit` (default 10, max 50).

### `POST /api/automations`
Creates a new workflow. Body: `{ name: string }`.

### `GET /api/automations/[id]`
Returns a single workflow by id. Normalises `nodes`/`edges` to `[]` if null.

### `PUT /api/automations/[id]`
Partial update. Accepts any combination of `name`, `nodes`, `edges`. At least one field required.

### `DELETE /api/automations/[id]`
Deletes a workflow. Returns 204 No Content.

---

## What I'd Improve With More Time

**Undo / Redo**

The `useHistory` hook exists but is not yet wired into the canvas. Connecting it to `onNodesChange` / `onEdgesChange` with Ctrl+Z / Ctrl+Y support would be a high-value UX improvement.

**Optimistic UI for workflow list**

Currently, renaming a workflow updates the canvas header immediately but the list relies on `currentName` prop injection as a workaround. A proper optimistic update with rollback in the list component would be cleaner.

**Auto-save for empty workflows**

Auto-save skips workflows with no nodes (`debouncedNodes.length === 0`). This means a newly created workflow with only a name change is not persisted until a node is added. The fix is to include name-only diffs in the save trigger.

**Error recovery UI**

Save failures currently show a "Save failed" pill with no recovery action. A retry button or a toast with more context would improve the experience.

**Node connection validation**

Validation runs on the full graph but does not prevent invalid connections at the point of drop. ReactFlow's `isValidConnection` prop could block illegal edges (e.g. output → output) before they are created.

**Row-level security / multi-tenancy**

All workflows are currently global. Adding a `userId` foreign key and filtering all queries by the authenticated user would be needed before a production deployment.

**Pagination edge case**

If the current page becomes empty after a deletion (e.g. deleting the last item on page 3), the list does not auto-retreat to page 2. Adding a correction in the delete handler would fix this.

---

## Testing Strategy

No automated tests are included in this submission. The following is the strategy that would be applied with more time:

**Unit tests** (Vitest)
- `useHistory` — undo/redo stack behaviour, branching truncation
- `validateWorkflow` — all error and warning conditions
- `sanitizeNode` / `sanitizeEdge` — field normalisation edge cases
- `fetchJSON` — empty body, invalid JSON, non-ok status, network error

**Integration tests** (Vitest + Prisma test database)
- Each API route handler: happy path, 404, invalid body, partial update
- Confirm `P2025` Prisma error maps to 404, not 500

**Component tests** (React Testing Library)
- `NodeEditModal` — form sync on node change, variant lock rules, save disabled when label empty
- `ValidationPanel` — renders nothing when no issues, correct classes per issue type
- `WorkflowList` — uses `currentName` over fetched name for the active workflow

**E2E tests** (Playwright)
- Create workflow → add node → rename → verify auto-save indicator cycles to "Saved"
- Import a valid JSON file → canvas populates → save fires
- Import an invalid JSON file → error alert shown, canvas unchanged

----

## Some Screenshots of the App

A Template Loaded on the Screen
<img width="3024" height="1652" alt="image" src="https://github.com/user-attachments/assets/dc47e594-9ce2-44e8-a526-d223b4e5f315" />

Edit Node Modal which appears on Single and Double Click
<img width="962" height="888" alt="image" src="https://github.com/user-attachments/assets/28f354cd-e765-4f17-8285-2f41e0241a7a" />

Side Navigation Panel with functionalities - View all Saved Workflows (list with delete option), Templates Section, Create Blank Workflow
<img width="602" height="1656" alt="image" src="https://github.com/user-attachments/assets/3ad1bf16-6b63-4e6a-8722-03956f4eb1e9" />

<img width="600" height="1656" alt="image" src="https://github.com/user-attachments/assets/59ddaa79-8c2e-4c77-9c45-b1d6f34d7ad2" />

Export and Import Functionality which appears as a drop down from the Header Button
<img width="602" height="424" alt="image" src="https://github.com/user-attachments/assets/8a50159a-cf85-4fd1-9e82-4f89e8c7d17f" />

Rename workflow functionality- appears when user clicks on the current Workflow Name
<img width="762" height="80" alt="image" src="https://github.com/user-attachments/assets/00b283a5-f230-4da6-b9c1-f2d533c814f6" />


