"use client";

/**
 * AutomationBuilder
 *
 * The main canvas component for building, editing, and managing automation workflows.
 * Wraps ReactFlow for the node/edge graph UI and handles:
 *
 *  - Loading the most recent workflow on mount
 *  - Auto-saving changes to the DB with debounce + validation guard
 *  - Switching between workflows via the collapsible nav panel
 *  - Creating, importing, and applying template workflows
 *  - Renaming workflows inline with optimistic rollback on failure
 *
 * State architecture:
 *  - ReactFlow node/edge state is the source of truth for the canvas
 *  - `lastSavedRef`   — serialized snapshot of the last successfully saved state;
 *                       compared against on every debounce tick to skip no-op saves
 *  - `workflowIdRef`  — mirrors `workflowId` state as a ref so async callbacks
 *                       always read the current id without stale closure issues
 *  - `workflowNameRef`— same pattern for the workflow name
 *  - `initialized`    — guards against ReactFlow's internal position changes
 *                       (fired on mount/fitView) being treated as user edits
 *  - `initTimerRef`   — tracks the settle timeout so rapid workflow switches
 *                       don't leave stale timers that re-open the save window
 *  - `workflowGenRef` — monotonic counter incremented on every workflow switch;
 *                       captured at auto-save schedule time and checked before
 *                       the PUT fires to abort saves that belong to a previous workflow
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addEdge,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  OnConnect,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  BackgroundVariant,
} from "@xyflow/react";
import dynamic from "next/dynamic";

import { useDnD } from "../contexts/DnDContext";
import "@xyflow/react/dist/style.css";
import "./styles.css";
import { nodeTypes } from "./nodes/nodeTypes";
import { NodeData } from "./nodeEditModal/NodeEditModal";
import ValidationPanel from "./validationPanel/ValidatePanel";
import { validateWorkflow } from "../utils/validation";
import SideBar from "./sideBar/SideBar";
import {
  AlertTriangle,
  Blocks,
  Check,
  Clock,
  LayoutTemplate,
  List,
  Loader2,
  Plus,
  X,
  XCircle,
} from "lucide-react";
import WorkflowMenu from "./workflowMenu/WorkflowMenu";
import { exportWorkflow, importWorkflow } from "../utils/workflowIO";
import {
  instantiateTemplate,
  WORKFLOW_TEMPLATES,
  WorkflowTemplate,
} from "../utils/workflowTemplates";
import { sanitizeEdge, sanitizeNode } from "../utils/sanitizeNodeEdges";
import { getTemplateIcon } from "../utils/workflowTemplateIcons";
import { MINIMAP_COLORS } from "../Constants";

// Lazy-Loaded client-side only to avoid SSR issues with ReactFlow internals.
const NodeEditModal = dynamic(() => import("./nodeEditModal/NodeEditModal"), {
  ssr: false,
});
const WorkflowList = dynamic(() => import("./workflowList/WorkflowList"), {
  ssr: false,
});

// Debounce helper
/**
 * Returns a debounced copy of `value` that only updates after `ms` milliseconds
 * of silence. Used to batch rapid node/edge changes before validation and save.
 */
function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

/**
 * Thin wrapper around `fetch` that:
 *  - Reads the response as text first (avoids JSON.parse throwing on empty bodies)
 *  - Returns a discriminated union: `{ ok: true, data }` | `{ ok: false, error }`
 *  - Catches network errors (DNS failure, CORS, offline) and surfaces them uniformly
 *
 * All API calls in this file go through fetchJSON so error handling is consistent.
 */
async function fetchJSON<T = any>(
  url: string,
  options?: RequestInit
): Promise<
  { ok: true; data: T } | { ok: false; status: number; error: string }
> {
  try {
    const res = await fetch(url, options);
    const text = await res.text();

    if (!text?.trim()) {
      return { ok: false, status: res.status, error: "Empty response body" };
    }

    let data: T;
    try {
      data = JSON.parse(text);
    } catch {
      return { ok: false, status: res.status, error: "Invalid JSON response" };
    }

    if (!res.ok) {
      const message =
        (data as any)?.error ?? res.statusText ?? "Request failed";
      return { ok: false, status: res.status, error: message };
    }

    return { ok: true, data };
  } catch (err) {
    // Network error, DNS failure, CORS, etc.
    return {
      ok: false,
      status: 0,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

const getNodeColor = (n: Node) => MINIMAP_COLORS[n.type ?? ""] ?? "#a1a1aa";

// Workflow payload type
type WorkflowPayload = {
  id?: string;
  name?: string;
  nodes?: any[];
  edges?: any[];
};

// Inner component
/**
 * Separated from the default export so it can safely call `useReactFlow()`,
 * which requires being rendered inside a `<ReactFlowProvider>`.
 */
function AutomationBuilderInner() {
  const reactFlowWrapper = useRef(null);
  const { screenToFlowPosition } = useReactFlow();
  const { type } = useDnD();

  const [workflowName, setWorkflowName] = useState("My Workflow");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("My Workflow");
  const [navState, setNavState] = useState<"flows" | "templates" | null>(null);

  const titleInputRef = useRef<HTMLInputElement>(null);

  //  ReactFlow state — base handlers renamed to *Base
  const [nodes, setNodes, onNodesChangeBase] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChangeBase] = useEdgesState<Edge>([]);

  const [editingNode, setEditingNode] = useState<Node<NodeData> | null>(null);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<
    "idle" | "loading" | "error" | "empty" | "ready"
  >("idle");
  const [saveStatus, setSaveStatus] = useState<
    "saved" | "saving" | "unsaved" | "error" | "blocked"
  >("saved");

  const isNavOpen = navState !== null;
  const navView = navState || "flows"; // defaults to 'flows' UI when closed or opening

  const closeNav = useCallback(() => setNavState(null), []);
  const openFlows = useCallback(() => setNavState("flows"), []);
  const openTemplates = useCallback(() => setNavState("templates"), []);
  const toggleNav = useCallback(
    () => setNavState((p) => (p ? null : "flows")),
    []
  );

  //  Refs
  const clickTimer = useRef<number | null>(null);
  const workflowNameRef = useRef(workflowName);
  const workflowIdRef = useRef(workflowId);

  /**
   * Serialized snapshot of the last successfully persisted nodes + edges.
   * Auto-save compares against this to skip no-op writes (e.g. ReactFlow
   * internal position corrections that don't represent user edits).
   */
  const lastSavedRef = useRef<{ nodes: string; edges: string }>({
    nodes: "[]",
    edges: "[]",
  });

  /**
   * Tracks the active settle timeout scheduled by `applyWorkflow`.
   * Cleared and replaced on every call so rapid workflow switches never
   * leave stale timers that re-open the `initialized` window.
   */
  const initTimerRef = useRef<number | null>(null);

  /**
   * Monotonic counter incremented on every `applyWorkflow` call.
   * Captured by the auto-save effect at schedule time and checked just
   * before the PUT fires — if the value has changed, the save is for a
   * previous workflow and is silently aborted to prevent data corruption.
   */
  const workflowGenRef = useRef(0);

  //  Debounced values
  // Single debounce at 600ms, shared by both validation (immediate) and
  // auto-save (delayed further by 1400ms inside the effect).
  const debouncedNodes = useDebounce(nodes, 600);
  const debouncedEdges = useDebounce(edges, 600);

  /**
   * Set to `false` at the start of every `applyWorkflow` call and `true`
   * 200ms later. While `false`, `onNodesChange` ignores all position changes
   * so ReactFlow's internal fitView/mount corrections don't mark the workflow
   * as unsaved or trigger auto-save.
   */
  const initialized = useRef(false);

  //  Validation
  /** Memoised validation result shown in the ValidationPanel overlay. */
  const validation = useMemo(
    () => validateWorkflow(debouncedNodes, debouncedEdges),
    [debouncedNodes, debouncedEdges]
  );

  //  applyWorkflow
  /**
   * Central function for loading any workflow into the canvas — used for:
   *  - Initial page load
   *  - Opening a workflow from the list
   *  - Creating a new workflow
   *  - Importing from a JSON file
   *  - Applying a template
   *
   * Responsibilities:
   *  1. Resets `initialized` and increments `workflowGenRef` to invalidate
   *     any in-flight auto-save belonging to the previous workflow
   *  2. Cancels any pending settle timer from a previous call
   *  3. Sanitizes nodes and edges before setting them
   *  4. Stamps `lastSavedRef` with the incoming content so auto-save
   *     doesn't immediately fire a redundant write on load
   *  5. Schedules a 200ms settle window before re-enabling save detection
   */
  const applyWorkflow = useCallback(
    (data: WorkflowPayload) => {
      initialized.current = false;
      workflowGenRef.current += 1;

      // Pre-stamp so the auto-save diff check sees no change on load
      if (initTimerRef.current) {
        window.clearTimeout(initTimerRef.current);
        initTimerRef.current = null;
      }

      const name = data.name ?? "My Workflow";
      workflowNameRef.current = name;

      const cleanNodes = (data.nodes ?? []).map(sanitizeNode);
      const cleanEdges = (data.edges ?? []).map(sanitizeEdge);

      lastSavedRef.current = {
        nodes: JSON.stringify(cleanNodes),
        edges: JSON.stringify(cleanEdges),
      };

      setNodes(cleanNodes);
      setEdges(cleanEdges);
      workflowIdRef.current = data.id ?? null;
      setWorkflowId(data.id ?? null);
      setWorkflowName(name);
      setTitleDraft(name);
      setSaveStatus("saved");

      // Re-enable save detection after ReactFlow finishes its internal layout
      initTimerRef.current = window.setTimeout(() => {
        initialized.current = true;
        initTimerRef.current = null;
      }, 200);
    },
    [setNodes, setEdges]
  );

  /**
   * Wraps ReactFlow's base handler to detect meaningful user edits.
   * Ignores all changes while `initialized` is false (settle window).
   *
   * "Meaningful" means:
   *  - Node deletion (type === "remove")
   *  - Drag-end position commit (type === "position", dragging === false, position set)
   *
   * ReactFlow also fires "dimensions", "select", and "reset" changes which are
   * intentionally ignored here — they don't represent user edits.
   */
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // If we are currently loading/applying a workflow, ignore everything
      if (!initialized.current) {
        onNodesChangeBase(changes);
        return;
      }

      const hasMeaningful = changes.some((c) => {
        // 1. Deleting a node is always meaningful
        if (c.type === "remove") return true;

        // 2. Position changes are only meaningful if they are the RESULT of a drag
        // Internal snaps/initializations often have dragging: false,
        // but they also often lack the 'event' property or specific flags.
        if (c.type === "position" && !c.dragging) {
          return !!c.position;
        }

        return false;
      });

      if (hasMeaningful) setSaveStatus("unsaved");

      onNodesChangeBase(changes);
    },
    [onNodesChangeBase]
  );

  //  Wrapped onEdgesChange — keyboard-deleted edges
  /** Marks unsaved when an edge is deleted via keyboard (Delete/Backspace). */
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const hasMeaningful = changes.some((c) => c.type === "remove");
      if (hasMeaningful) setSaveStatus("unsaved");
      onEdgesChangeBase(changes);
    },
    [onEdgesChangeBase]
  );

  //  Node click / double-click
  /**
   * Single click opens the node edit modal after 250ms.
   * The timer is cleared on double-click so only one action fires.
   * The timer is also cleared before setting a new one to prevent
   * rapid clicks from stacking multiple modal opens.
   */
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (clickTimer.current !== null) {
      window.clearTimeout(clickTimer.current);
      clickTimer.current = null;
    }
  
    clickTimer.current = window.setTimeout(() => {
      setEditingNode(node as Node<NodeData>);
      clickTimer.current = null;
    }, 250);
  }, []);

  const onNodeDoubleClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (clickTimer.current !== null) {
      window.clearTimeout(clickTimer.current);
      clickTimer.current = null;
    }
  
    setEditingNode(node as Node<NodeData>);
  }, []);

  //  Modal handlers — explicit setSaveStatus
  /** Applies edited node data and marks the workflow as unsaved. */
  const handleModalSave = useCallback(
    (nodeId: string, data: NodeData) => {
      setNodes((nds) => nds.map((n) => (n.id === nodeId ? { ...n, data } : n)));
      setEditingNode(null);
      setSaveStatus("unsaved"); // ← explicit: editing node data is a user action
    },
    [setNodes]
  );

  /** Removes the node and all its connected edges, then marks unsaved. */
  const handleModalDelete = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) =>
        eds.filter((e) => e.source !== nodeId && e.target !== nodeId)
      );
      setSaveStatus("unsaved"); // ← explicit: deleting via modal is a user action
    },
    [setNodes, setEdges]
  );

  //  Export / Import
  /** Serialises the current workflow to a JSON file and triggers a download. */
  const handleExport = useCallback(() => {
    const result = exportWorkflow(nodes, edges, workflowNameRef.current);
    if (!result.success) {
      alert(result.error);
    }
  }, [nodes, edges]);

  /**
   * Reads a JSON file selected by the user, validates it, and loads it into
   * the canvas as an unsaved workflow (no DB id assigned yet).
   *
   * Resets `lastSavedRef` to `"[]"` after `applyWorkflow` so the auto-save
   * diff check sees a real change and creates a new DB record.
   */
  const handleImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";
      importWorkflow(file).then((result) => {
        if (result.success) {
          if (result.nodes.length === 0) {
            alert("Cannot import — this workflow contains no nodes.");
            return;
          }

          //  Normalize null → undefined so validation sees the same
          //    shape as in-memory nodes
          const normalizedNodes = result.nodes.map((n) => ({
            ...n,
            data: {
              label: n.data.label ?? undefined,
              description: n.data.description ?? undefined,
              emailTo: n.data.emailTo ?? undefined,
              webhookUrl: n.data.webhookUrl ?? undefined,
              delaySeconds: n.data.delaySeconds ?? undefined,
              condition: n.data.condition ?? undefined,
              variant: n.data.variant ?? undefined,
            },
          }));

          //  Use normalizedNodes for validation
          const validation = validateWorkflow(
            normalizedNodes as Node[],
            result.edges as Edge[]
          );
          const hasErrors = validation.issues.some((i) => i.type === "error");

          if (hasErrors) {
            const errorMessages = validation.issues
              .filter((i) => i.type === "error")
              .map((i) => `• ${i.message}`)
              .join("\n");
            alert(`Cannot import — workflow has errors:\n\n${errorMessages}`);
            return;
          }

          //  Use normalizedNodes for apply too
          applyWorkflow({
            nodes: normalizedNodes,
            edges: result.edges,
            name: result.name,
            id: undefined,
          });

          //  Reset lastSavedRef so auto-save sees a real diff and
          // //    POSTs a fresh DB record instead of skipping
          lastSavedRef.current = { nodes: "[]", edges: "[]" };
          setSaveStatus("unsaved");
        } else {
          alert(result.error);
        }
      });
    },
    [applyWorkflow]
  );

  //  Templates
  /**
   * Instantiates a template and loads it as an unsaved workflow.
   * `lastSavedRef` is reset so auto-save creates a fresh DB record.
   */
  const handleSelectTemplate = useCallback(
    (template: WorkflowTemplate) => {
      // const { nodes, edges } = instantiateTemplate(template);
      // // const name = template.name;
      // setNodes(nodes.map(sanitizeNode));
      // setEdges(edges.map(sanitizeEdge));
      // setSaveStatus("unsaved"); // ← explicit: applying a template is a user action
      const { nodes, edges } = instantiateTemplate(template);
      applyWorkflow({ nodes, edges, name: template.name }); // ← use applyWorkflow
      lastSavedRef.current = { nodes: "[]", edges: "[]" };
      setSaveStatus("unsaved");
    },
    [applyWorkflow]
  );

  //  Workflow list
  /** Fetches a workflow by id and loads it, showing a loading overlay during fetch. */
  const handleOpenWorkflow = useCallback(
    async (id: string) => {
      setLoadState("loading");
      const result = await fetchJSON(`/api/automations/${id}`);
      if (!result.ok) {
        console.error("Failed to open workflow:", result.error);
        setLoadState("error");
        return;
      }
      applyWorkflow(result.data);
      setLoadState("ready");
    },
    [applyWorkflow]
  );

  /**
   * Creates a new empty workflow in the DB first (so we have an id),
   * then loads it into the canvas. This avoids the race condition where
   * dropping a node before the POST resolves would cause auto-save to
   * create a duplicate record.
   */
  const handleCreateWorkflow = useCallback(async () => {
    setNavState(null);
    setLoadState("loading");

    const result = await fetchJSON("/api/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New Workflow" }),
    });

    if (!result.ok || !result.data?.id) {
      console.error(
        "Failed to create workflow:",
        result.ok ? "no id" : result.error
      );
      setLoadState("error");
      return;
    }

    applyWorkflow({
      id: result.data.id,
      name: "New Workflow",
      nodes: [],
      edges: [],
    });
    setLoadState("ready");
  }, [applyWorkflow]);

  //  Title input focus
  useEffect(() => {
    if (editingTitle) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [editingTitle]);

  //  Initial load
  /**
   * `applyWorkflowRef` is a stable ref to the latest `applyWorkflow` callback.
   * Used in the load effect below so the effect's dependency array stays empty
   * (runs once on mount) while still calling the current version of the function.
   */
  const applyWorkflowRef = useRef(applyWorkflow);
  useEffect(() => {
    applyWorkflowRef.current = applyWorkflow;
  }, [applyWorkflow]);

  /**
   * On mount: fetch the workflow list and load the most recently updated one.
   * Transitions through loading → ready (or error / empty).
   */
  useEffect(() => {
    const load = async () => {
      setLoadState("loading");

      const listResult = await fetchJSON("/api/automations");
      if (!listResult.ok) {
        setLoadState("error");
        return;
      }

      const items: { id: string }[] = listResult.data?.data ?? [];
      if (items.length === 0) {
        setLoadState("empty");
        return;
      }

      const wfResult = await fetchJSON(`/api/automations/${items[0].id}`);
      if (!wfResult.ok) {
        setLoadState("error");
        return;
      }

      applyWorkflowRef.current(wfResult.data); // ← stable ref, not the callback
      setLoadState("ready");
      // initialized.current = true;
    };

    load();
  }, []);

  //  Auto-save
  /**
   * Fires whenever `debouncedNodes` or `debouncedEdges` change (600ms after
   * the last edit), then waits an additional 1400ms before actually writing
   * (2000ms total from the last edit).
   *
   * Guards (all must pass before a write is attempted):
   *  1. `initialized.current` — skip if the settle window is still open
   *  2. Node count > 0        — skip empty canvases
   *  3. Diff check            — skip if content matches `lastSavedRef`
   *  4. No validation errors  — block save and show "Fix errors to save"
   *  5. Generation check      — abort if the user switched workflows since
   *                             the effect last ran (capturedGen !== workflowGenRef)
   *
   * On success: stamps `lastSavedRef` with the saved content.
   * On failure: sets saveStatus to "error" so the user is informed.
   *
   * The effect cleanup cancels both the delay timeout and any in-flight fetch
   * when nodes/edges change again before the save completes.
   */
  useEffect(() => {
    if (!initialized.current) return; //If the user rapidly switches between workflows, stale debounced nodes from the previous workflow can still trigger a save after applyWorkflow has already reset state
    if (debouncedNodes.length === 0) return;

    const cleanNodes = debouncedNodes.map(sanitizeNode);
    const cleanEdges = debouncedEdges.map(sanitizeEdge);
    const nodesStr = JSON.stringify(cleanNodes);
    const edgesStr = JSON.stringify(cleanEdges);

    if (
      nodesStr === lastSavedRef.current.nodes &&
      edgesStr === lastSavedRef.current.edges
    )
      return;

    const currentValidation = validateWorkflow(debouncedNodes, debouncedEdges);
    const hasErrors = currentValidation.issues.some((i) => i.type === "error");
    if (hasErrors) {
      setSaveStatus("blocked");
      return;
    }

    let cancelled = false;
    const nameAtSaveTime = workflowNameRef.current;
    const capturedGen = workflowGenRef.current;

    const t = setTimeout(async () => {
      if (capturedGen !== workflowGenRef.current) return; // Abort if the user switched to a different workflow since this was scheduled

      setSaveStatus("saving");
      try {
        let id = workflowIdRef.current; // No id means this is an imported/template workflow not yet in the DB
        if (!id) {
          const createResult = await fetchJSON("/api/automations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: nameAtSaveTime }),
          });
          if (!createResult.ok || !createResult.data?.id) {
            if (!cancelled) setSaveStatus("error");
            return;
          }
          id = createResult.data.id;
          if (!cancelled) {
            setWorkflowId(id);
            workflowIdRef.current = id;
          }
        }
        const response = await fetch(`/api/automations/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nodes: cleanNodes, edges: cleanEdges }),
        });
        if (!cancelled && response.ok) {
          lastSavedRef.current = { nodes: nodesStr, edges: edgesStr };
          setSaveStatus("saved");
        }
      } catch {
        if (!cancelled) setSaveStatus("error");
      }
    }, 1400);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [debouncedNodes, debouncedEdges]);

  useEffect(() => {
    return () => {
      if (clickTimer.current !== null) {
        window.clearTimeout(clickTimer.current);
        clickTimer.current = null;
      }
  
      if (initTimerRef.current !== null) {
        window.clearTimeout(initTimerRef.current);
        initTimerRef.current = null;
      }
    };
  }, []);

  //  Commit title
  /**
   * Called on input blur or Enter key. Trims the draft, updates both state
   * and the ref, then PUTs the new name to the API.
   *
   * On API failure: rolls back the local title to the previous value so
   * the UI stays in sync with what's actually persisted.
   */
  const commitTitle = useCallback(async () => {
    setEditingTitle(false);
    const prevName = workflowNameRef.current;
    const trimmed = titleDraft.trim() || prevName;
    setTitleDraft(trimmed);
    setWorkflowName(trimmed);
    workflowNameRef.current = trimmed;
    if (!workflowIdRef.current || trimmed === prevName) return;
    try {
      const renameResult = await fetchJSON(
        `/api/automations/${workflowIdRef.current}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmed }),
        }
      );
      if (!renameResult.ok) {
        // Roll back the local title to what was actually saved
        setWorkflowName(prevName);
        setTitleDraft(prevName);
        workflowNameRef.current = prevName;
      }
    } catch (err) {
      console.error("Failed to rename:", err);
    }
  }, [titleDraft]);

  //  Flow callbacks
  /** Adds a new animated edge and marks the workflow as unsaved. */
  const onConnect: OnConnect = useCallback(
    (params) => {
      setEdges((eds) => addEdge({ ...params, animated: true }, eds));
      setSaveStatus("unsaved"); // ← explicit: connecting nodes is a user action
    },
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  /**
   * Converts the drop coordinates to ReactFlow canvas space, creates a new
   * node of the dragged type, and immediately opens its edit modal.
   */
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      if (!type) return;
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const newNode: Node = {
        id: crypto.randomUUID(),
        type,
        position,
        data: { label: `${type} node` },
      };
      setNodes((nds) => [...nds, newNode]);
      setEditingNode(newNode as Node<NodeData>);
      setSaveStatus("unsaved"); // ← explicit: dropping a node is a user action
    },
    [screenToFlowPosition, type, setNodes]
  );

  //  Render
  return (
    <div className={`automation-builder ${isNavOpen ? "nav-open" : ""}`}>
      {/* Collapsible Navigation Panel */}
      <div className={`nav-panel ${isNavOpen ? "nav-panel--open" : ""}`}>
        <div className="nav-panel__header">
          <h1 className="nav-panel__title">Automations</h1>
          <div className="nav-panel__header-actions">
            <button
              className="nav-panel__close-btn"
              onClick={closeNav}
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <button
          className="nav-panel__add-btn"
          onClick={handleCreateWorkflow}
          title="New Automation"
        >
          <Plus size={20} /> Create New
        </button>

        {/* Segmented Control / Tabs */}
        <div className="nav-panel__tabs-container">
          <div className="nav-panel__tabs">
            <button
              className={navState === "flows" ? "active" : ""}
              onClick={openFlows} // Sets state to 'flows'
            >
              <List size={16} /> My Flows
            </button>
            <button
              className={navState === "templates" ? "active" : ""}
              onClick={openTemplates} // Sets state to 'templates'
            >
              <LayoutTemplate size={16} /> Templates
            </button>
          </div>
        </div>

        <div className="nav-panel__content">
          {navView === "flows" ? (
            <WorkflowList
              currentId={workflowId}
              currentName={workflowName || null} // Workflow list — passes currentName so renamed workflows update immediately without waiting for a refetch
              onOpen={(id) => {
                handleOpenWorkflow(id);
                closeNav();
              }}
            />
          ) : (
            <div className="nav-panel__list">
              {/* Import WORKFLOW_TEMPLATES from your utils/workflowTemplates */}
              {WORKFLOW_TEMPLATES.map((template) => (
                <div
                  key={template.id}
                  className="automation-card"
                  onClick={() => {
                    handleSelectTemplate(template);
                    closeNav(); // Close panel after selection
                  }}
                >
                  <div className="automation-card__content">
                    <h3>{template.name}</h3>
                    <p>
                      {template.description || "Start with a pre-built flow"}
                    </p>
                  </div>

                  {/* Visual indicator for a template */}
                  <div className="template-badge">
                    {(() => {
                      const Icon = getTemplateIcon(template.icon);
                      return Icon ? (
                        <Icon size={14} />
                      ) : (
                        <LayoutTemplate size={14} />
                      );
                    })()}
                  </div>
                </div>
              ))}

              {WORKFLOW_TEMPLATES.length === 0 && (
                <div className="nav-panel__empty">
                  <p>No templates available.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="canvas-header">
        <div className="canvas-header__left">
          {/* Hamburger-style toggle for the nav panel - Contains list of Workflows saved and Templates*/}
          <button
            className={`canvas-header__logo-btn ${isNavOpen ? "active" : ""}`}
            onClick={toggleNav}
          >
            <Blocks size={16} />
          </button>

          {/* Inline title editor — click to activate, blur/Enter to commit */}
          {editingTitle ? (
            <input
              ref={titleInputRef}
              className="canvas-header__title-input"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitTitle();
                if (e.key === "Escape") {
                  setTitleDraft(workflowName);
                  setEditingTitle(false);
                }
              }}
              maxLength={80}
              spellCheck={false}
            />
          ) : (
            <span
              className="canvas-header__title"
              onClick={() => {
                setTitleDraft(workflowName);
                setEditingTitle(true);
              }}
              title="Click to rename"
            >
              {workflowName}
            </span>
          )}
        </div>

        {/* Save status pill — icon + label changes per state */}
        <div className={`save-status save-status--${saveStatus}`}>
          {saveStatus === "saving" && (
            <>
              <Loader2 size={13} className="spin" /> Saving…
            </>
          )}
          {saveStatus === "saved" && (
            <>
              <Check size={13} /> Saved
            </>
          )}
          {saveStatus === "unsaved" && (
            <>
              <Clock size={13} /> Unsaved
            </>
          )}
          {saveStatus === "error" && (
            <>
              <XCircle size={13} /> Save failed
            </>
          )}
          {saveStatus === "blocked" && (
            <>
              <AlertTriangle size={13} /> Fix errors to save
            </>
          )}
        </div>

        <div className="canvas-header__actions">
          {/* Kept menu for Export/Import, other buttons moved to Panel */}
          <WorkflowMenu onExport={handleExport} onImport={handleImport} />
        </div>
      </div>

      <div className="canvas-row">
        {/* Left sidebar — draggable node palette */}
        <SideBar />

        <div
          className="reactflow-wrapper"
          ref={reactFlowWrapper}
          onDrop={onDrop}
          onDragOver={onDragOver}
        >
          {/* Loading overlay */}
          {loadState === "loading" && (
            <div className="canvas-overlay">
              <div className="canvas-overlay__spinner" />
              <p className="canvas-overlay__text">Loading workflow…</p>
            </div>
          )}

          {/* Error overlay — shown on API failure */}
          {loadState === "error" && (
            <div className="canvas-overlay">
              <p className="canvas-overlay__icon">⚠</p>
              <p className="canvas-overlay__text">
                Failed to connect to server
              </p>
              <button
                className="canvas-overlay__btn"
                onClick={() => window.location.reload()}
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty state — shown when user has no workflows yet */}
          {loadState === "empty" && (
            <div className="canvas-overlay">
              <p className="canvas-overlay__icon">⬡</p>
              <p className="canvas-overlay__text">No workflows yet</p>
              <button
                className="canvas-overlay__btn"
                onClick={handleCreateWorkflow}
              >
                Create Your First Workflow
              </button>
            </div>
          )}

          {/* ReactFlow canvas — rendered when a workflow is ready */}
          {(loadState === "ready" || loadState === "idle") && (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              fitView
              onNodeDoubleClick={onNodeDoubleClick}
              onNodeClick={onNodeClick}
              nodeTypes={nodeTypes}
              deleteKeyCode={["Delete", "Backspace"]}
              proOptions={{ hideAttribution: true }}
            >
              {/* Canvas empty hint — shown inside the flow when no nodes exist */}
              {nodes.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state-icon">⬡</div>
                  <div className="empty-state-text">
                    Drag a node from the sidebar to get started
                  </div>
                </div>
              )}

              <Controls />

              <MiniMap
                nodeColor={getNodeColor}
                position="bottom-right"
                zoomable
                pannable
              />

              <Background
                variant={BackgroundVariant.Cross}
                gap={24}
                size={1}
                color="#2a2a35"
              />

              {/* Validation issues overlay — errors block save, warnings are advisory */}
              <ValidationPanel result={validation} />
            </ReactFlow>
          )}
        </div>
      </div>

      {/* ── Node Edit Modal — rendered outside the flow to avoid z-index issues ── */}
      {editingNode && (
        <NodeEditModal
          node={editingNode}
          edges={edges}
          onSave={handleModalSave}
          onClose={() => setEditingNode(null)}
          onDelete={handleModalDelete}
        />
      )}
    </div>
  );
}

/**
 * Wraps the inner component in a ReactFlowProvider, which is required by
 * `useReactFlow()` and all ReactFlow hooks used inside `AutomationBuilderInner`.
 */
export default function AutomationBuilder() {
  return (
    <ReactFlowProvider>
      <AutomationBuilderInner />
    </ReactFlowProvider>
  );
}
