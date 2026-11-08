// In-browser stand-in for the Workflow table, used only by the static demo.
// Workflows live in localStorage, so each visitor gets their own copy and
// their edits survive a reload. If storage is blocked (private mode, etc.)
// it falls back to memory for the current tab.

import { WORKFLOW_TEMPLATES, instantiateTemplate } from "@/app/utils/workflowTemplates";

export type DemoWorkflow = {
  id: string;
  name: string;
  nodes: unknown[];
  edges: unknown[];
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = "automation-builder-demo:v1";

// Sample data: a few of the built-in templates, with example addresses filled
// in so every node looks configured.
const SEEDED_TEMPLATES = [
  "insurance-claims-processing",
  "banking-loan-application",
  "gbs-order-to-cash",
];

let memory: DemoWorkflow[] | null = null;

function newId(): string {
  // Short, cuid-like ids, matching the format the real API returns.
  return "c" + crypto.randomUUID().replace(/-/g, "").slice(0, 24);
}

function fillExamples(nodes: Array<{ type?: string; data?: Record<string, unknown> }>) {
  return nodes.map((node) => {
    const data = { ...(node.data ?? {}) };
    if (node.type === "webhook" && !data.webhookUrl) {
      const slug = String(data.label ?? "hook").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      data.webhookUrl = `https://api.example.com/hooks/${slug}`;
    }
    if (node.type === "email" && !data.emailTo) {
      data.emailTo = "team@example.com";
    }
    return { ...node, data };
  });
}

function seed(): DemoWorkflow[] {
  const now = Date.now();
  const wanted = SEEDED_TEMPLATES
    .map((id) => WORKFLOW_TEMPLATES.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));
  const templates = wanted.length > 0 ? wanted : WORKFLOW_TEMPLATES.slice(0, 3);

  return templates.map((template, i) => {
    const { nodes, edges } = instantiateTemplate(template);
    // Space the timestamps so the first template is the most recent one,
    // which is the workflow the builder opens on first load.
    const stamp = new Date(now - i * 60 * 60 * 1000).toISOString();
    return {
      id: newId(),
      name: template.name,
      nodes: fillExamples(nodes),
      edges,
      createdAt: stamp,
      updatedAt: stamp,
    };
  });
}

function read(): DemoWorkflow[] {
  if (memory) return memory;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        memory = parsed;
        return memory;
      }
    }
  } catch {
    // Storage blocked or corrupted: start fresh below.
  }
  memory = seed();
  write(memory);
  return memory;
}

function write(rows: DemoWorkflow[]) {
  memory = rows;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {
    // Keep working from memory if storage is unavailable or full.
  }
}

const byUpdatedDesc = (a: DemoWorkflow, b: DemoWorkflow) =>
  b.updatedAt.localeCompare(a.updatedAt);

export const demoStore = {
  list(page: number, limit: number) {
    const rows = [...read()].sort(byUpdatedDesc);
    const start = (page - 1) * limit;
    return {
      total: rows.length,
      items: rows.slice(start, start + limit).map(({ id, name, createdAt, updatedAt }) => ({
        id,
        name,
        createdAt,
        updatedAt,
      })),
    };
  },

  get(id: string) {
    return read().find((w) => w.id === id) ?? null;
  },

  create(input: { name?: string; nodes?: unknown[]; edges?: unknown[] }) {
    const now = new Date().toISOString();
    const row: DemoWorkflow = {
      id: newId(),
      name: input.name ?? "Untitled Workflow",
      nodes: input.nodes ?? [],
      edges: input.edges ?? [],
      createdAt: now,
      updatedAt: now,
    };
    write([...read(), row]);
    return row;
  },

  update(id: string, patch: { name?: string; nodes?: unknown[]; edges?: unknown[] }) {
    const rows = read();
    const index = rows.findIndex((w) => w.id === id);
    if (index === -1) return null;
    const row: DemoWorkflow = {
      ...rows[index],
      ...(patch.name !== undefined && { name: patch.name }),
      ...(patch.nodes !== undefined && { nodes: patch.nodes }),
      ...(patch.edges !== undefined && { edges: patch.edges }),
      updatedAt: new Date().toISOString(),
    };
    const next = [...rows];
    next[index] = row;
    write(next);
    return row;
  },

  remove(id: string) {
    const rows = read();
    if (!rows.some((w) => w.id === id)) return false;
    write(rows.filter((w) => w.id !== id));
    return true;
  },

  reset() {
    write(seed());
  },
};
