// In-browser version of the /api/automations routes, used only by the static
// demo. It intercepts fetch calls to those paths and answers them from
// demoStore, with the same status codes and JSON shapes as
// src/app/api/automations. Every other request goes to the network as usual.

import { demoStore } from "./store";

const BASE = "/api/automations";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function readBody(init?: RequestInit): Promise<
  { ok: true; data: Record<string, unknown> } | { ok: false; error: string }
> {
  const text = typeof init?.body === "string" ? init.body : "";
  if (!text.trim()) return { ok: false, error: "Empty request body" };
  try {
    const data = JSON.parse(text);
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return { ok: false, error: "Invalid request data" };
    }
    return { ok: true, data };
  } catch {
    return { ok: false, error: "Invalid JSON" };
  }
}

const asArray = (value: unknown) => (Array.isArray(value) ? value : undefined);

async function handle(url: URL, method: string, init?: RequestInit): Promise<Response> {
  const rest = url.pathname.slice(BASE.length).replace(/^\/+|\/+$/g, "");

  // Collection: /api/automations
  if (rest === "") {
    if (method === "GET") {
      const limit = Math.min(Number(url.searchParams.get("limit")) || 10, 50);
      const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
      const { total, items } = demoStore.list(page, limit);
      return json({
        data: items,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      });
    }
    if (method === "POST") {
      const body = await readBody(init);
      if (!body.ok) return json({ error: body.error }, 400);
      const name = typeof body.data.name === "string" ? body.data.name : undefined;
      const row = demoStore.create({
        name,
        nodes: asArray(body.data.nodes),
        edges: asArray(body.data.edges),
      });
      return json(row, 201);
    }
    return json({ error: "Method not allowed" }, 405);
  }

  // Item: /api/automations/:id
  const id = decodeURIComponent(rest);

  if (method === "GET") {
    const row = demoStore.get(id);
    return row ? json(row) : json({ error: "Workflow not found" }, 404);
  }

  if (method === "PUT") {
    const body = await readBody(init);
    if (!body.ok) return json({ error: body.error }, 400);
    const { name, nodes, edges } = body.data;
    if (name === undefined && nodes === undefined && edges === undefined) {
      return json({ error: "Invalid data" }, 400);
    }
    if (name !== undefined && (typeof name !== "string" || name.length < 1 || name.length > 100)) {
      return json({ error: "Invalid data" }, 400);
    }
    const row = demoStore.update(id, {
      name: name as string | undefined,
      nodes: asArray(nodes),
      edges: asArray(edges),
    });
    return row ? json(row) : json({ error: "Workflow not found" }, 404);
  }

  if (method === "DELETE") {
    return demoStore.remove(id)
      ? new Response(null, { status: 204 })
      : json({ error: "Workflow not found" }, 404);
  }

  return json({ error: "Method not allowed" }, 405);
}

let installed = false;

export function installDemoApi() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const networkFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const raw =
      typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(raw, window.location.href);
    const isApi =
      url.origin === window.location.origin &&
      (url.pathname === BASE || url.pathname.startsWith(BASE + "/"));

    if (!isApi) return networkFetch(input, init);

    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    // A short, realistic delay so loading and saving states are visible.
    await new Promise((resolve) => setTimeout(resolve, 120));
    return handle(url, method, init);
  };
}
