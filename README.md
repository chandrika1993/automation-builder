# Senior Full-Stack Developer - Technical Challenge

## 🎯 Overview

This challenge involves building a **visual automation workflow builder** where users can create automation flows by connecting nodes (actions) together using a drag-and-drop interface.

Think of it as a simplified version of tools like n8n, where each node represents an action and edges define the flow between actions.

## 🚀 Tech Stack

This starter project includes:

- **[Next.js](https://nextjs.org/docs)** - React framework with App Router
- **[ReactFlow](https://reactflow.dev/learn)** - Visual node-based editor
- **[TypeScript](https://www.typescriptlang.org/)** - Type safety
- **CSS** - Styling (keep it simple, or use your preferred solution)
- **[Jest](https://jestjs.io/)** - Testing framework

**Feel free to add any libraries you need** - just document your reasoning for the choices you make.

## 📋 Challenge Requirements

### Frontend Tasks

#### 1. Node Creation & Editing
- [ ] Create a modal that allows users to edit node properties (at minimum: node name/label) --> done
- [ ] The modal should open when:
  - A new node is dropped onto the canvas --> done
  - An existing node is clicked/double-clicked  --> done
- [ ] Ensure the changes persist in the workflow state --> done

#### 2. UI/UX Enhancement
- [ ] Improve the overall visual design and user experience       --> done
- [ ] Consider: color scheme, spacing, typography, node styling, controls placement     --> done
- [ ] Make it intuitive and pleasant to use     --> done

### Backend Tasks

#### 3. Data Persistence
- [ ] Choose and set up a database (PostgreSQL or MongoDB recommended)    --> done
- [ ] Design a schema for storing automation workflows        --> done
- [ ] Consider what data needs to be persisted: workflows, nodes, edges, metadata     --> done

#### 4. CRUD API
- [ ] Implement API endpoints for automation workflows:   --> done
  - `POST /api/automations` - Create new workflow
  - `GET /api/automations/:id` - Retrieve workflow
  - `PUT /api/automations/:id` - Update workflow
  - `DELETE /api/automations/:id` - Delete workflow

### Bonus: Be Creative! 🎨

Add features that showcase your skills and thinking:
- Different node types (email, webhook, delay, condition, etc.) --> done
- Workflow validation (detect cycles, orphaned nodes) --> done
- Undo/redo functionality   --> incomplete
- Workflow templates or examples    --> done
- Export/import workflows   --> done
- Dark mode   --> incomplete
- Keyboard shortcuts  --> done
- Or anything else you think would be valuable!

## ⚙️ Getting Started

### Prerequisites
- Node.js 22 (use `nvm use` to switch to the correct version)
- Database (PostgreSQL/MongoDB) - you can use Docker or a cloud service

### Installation

```bash
nvm use
npm i
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 📝 What We're Looking For

**We're not expecting perfection!** This is about understanding your approach to software development and how you communicate in an asynchronous environment.

### Code Quality
- **Clean, readable code** with consistent style
- **Proper separation of concerns** (components, services, utilities)
- **Type safety** - leverage TypeScript effectively
- **Error handling** - both client and server-side
- **Sensible abstractions** - neither over-engineered nor overly simplistic

### Testing
- **Strategic testing** - focus on critical paths
- Unit tests for business logic
- Integration tests for API endpoints (optional but appreciated)
- If you don't have time for tests, **document your testing strategy**:
  - What would you test?
  - What testing approach would you take?
  - Where are the critical test areas?

### Documentation
- **Code comments** where the intent isn't obvious
- **README updates** if you add new setup steps
- **Architecture decisions** - explain your database schema, API design choices
- **Trade-offs** - what would you do differently with more time?

### UI/UX
- **Functional and intuitive** interface       --> done
- **Responsive** to different screen sizes (at least desktop)   --> done
- **Visual polish** - doesn't need to be fancy, but should be thoughtful     --> done

## 📤 Submission Guidelines

### Time Expectations
Spend **4-8 hours** on this challenge. We respect your time - if something isn't finished, that's completely fine! Just document what you would have done.

### What to Submit

1. **Code**: Push your solution to a Git repository (GitHub, GitLab, etc.)
2. **Documentation**: Update this README with:
   - Setup instructions (especially for database)
   - Architecture decisions and trade-offs
   - What you'd improve with more time
   - Testing strategy (if tests aren't included)
3. **Database**: Include schema/migrations or a setup script (if needed)
4. **Environment**: Provide `.env.example` file with required variables (if needed)

### How to Submit

1. **Create a private repository** with the shared code as your initial commit
2. **Commit your changes** as you would in a professional environment (meaningful commit messages, logical grouping, etc.)
3. **Share the repository** with `adrien.fischer@otera.ai`

### Evaluation Criteria

We'll assess your submission based on:

- Code Quality
- Functionality
- Full-Stack Skills
- Communication
- Testing

## 💡 Tips & Hints

- **Start simple** - get the core functionality working first, then enhance
- **Document as you go** - note your decisions and trade-offs
- **Don't over-engineer** - we value pragmatic solutions
- **Use AI tools** if you want - just be ready to discuss your choices
- **Ask questions** if requirements are unclear (in real work, you would!)

## 🤔 Questions?

If you have questions about the requirements or run into issues with the starter code, please reach out. We want you to succeed!

> **Have fun building!** We're excited to see your approach and creativity. 🚀

------------------------------------------------------------------------------------------------------------------------------


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
