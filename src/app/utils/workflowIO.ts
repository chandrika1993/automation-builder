// utils/workflowIO.ts

import { Node, Edge } from "@xyflow/react";
import { NodeData } from "../components/nodeEditModal/NodeEditModal";
import { validateWorkflow } from "./validation";

type CleanNode = {
  id: string;
  type: string | undefined;
  position: { x: number; y: number };
  data: NodeData;
};

type CleanEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle: string | null | undefined;
  targetHandle: string | null | undefined;
  type?: string;
};

type WorkflowExport = {
  version: string;
  name: string;
  exportedAt: string;
  nodes: CleanNode[];
  edges: CleanEdge[];
};

export type ImportResult =
  | { success: true; nodes: Node[]; edges: Edge[]; name: string }
  | { success: false; error: string };

export type ExportResult =
  | { success: true }
  | { success: false; error: string };

export function exportWorkflow(
  nodes: Node[],
  edges: Edge[],
  name = "My Workflow"
): ExportResult {
  //   Guard: empty canvas                ─
  if (nodes.length === 0) {
    return {
      success: false,
      error: "Cannot export an empty workflow — add at least one node.",
    };
  }

  //   Guard: validation errors              
  const validation = validateWorkflow(nodes, edges);
  const errors = validation.issues.filter((i) => i.type === "error");
  if (errors.length > 0) {
    const messages = errors.map((i) => `• ${i.message}`).join("\n");
    return {
      success: false,
      error: `Cannot export — workflow has errors:\n\n${messages}`,
    };
  }

  const payload: WorkflowExport = {
    version: "1.0",
    name,
    exportedAt: new Date().toISOString(),
    nodes: nodes.map(({ id, type, position, data }) => ({
      id,
      type,
      position: { x: position.x, y: position.y },
      data: {
        label: (data as NodeData).label,
        description: (data as NodeData).description,
        emailTo: (data as NodeData).emailTo,
        webhookUrl: (data as NodeData).webhookUrl,
        delaySeconds: (data as NodeData).delaySeconds,
        condition: (data as NodeData).condition,
        variant: (data as NodeData).variant,
      },
    })),
    edges: edges.map(
      ({ id, source, target, sourceHandle, targetHandle, type }) => ({
        id,
        source,
        target,
        sourceHandle,
        targetHandle,
        type,
      })
    ),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name.replace(/\s+/g, "_")}_${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Delay revoke so browser has time to start the download
  setTimeout(() => URL.revokeObjectURL(url), 100);

  return { success: true };
}

//  Import                                   
export function importWorkflow(file: File): Promise<ImportResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(
          e.target?.result as string
        ) as Partial<WorkflowExport>;

        if (
          !parsed.version ||
          !Array.isArray(parsed.nodes) ||
          !Array.isArray(parsed.edges)
        ) {
          return resolve({
            success: false,
            error: "Invalid workflow file — missing required fields.",
          });
        }

        // Remap IDs so imported nodes never clash with existing canvas nodes
        const idMap = new Map<string, string>();

        const nodes: Node[] = parsed.nodes.map((n) => {
          const newId = crypto.randomUUID();
          idMap.set(n.id, newId);
          return {
            id: newId,
            type: n.type,
            position: n.position ?? { x: 0, y: 0 },
            data: n.data ?? {},
          } as Node;
        });

        const edges: Edge[] = parsed.edges.map((e) => ({
          id: crypto.randomUUID(),
          source: idMap.get(e.source) ?? e.source,
          target: idMap.get(e.target) ?? e.target,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
          type: e.type,
          animated: true,
        })) as Edge[];

        resolve({
          success: true,
          nodes,
          edges,
          name: parsed.name ?? "Imported Workflow",
        });
      } catch {
        resolve({
          success: false,
          error:
            "Could not parse file — make sure it is a valid JSON workflow.",
        });
      }
    };

    reader.onerror = () =>
      resolve({ success: false, error: "Failed to read file." });

    reader.readAsText(file);
  });
}