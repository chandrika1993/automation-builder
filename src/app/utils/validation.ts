import { Node, Edge } from "@xyflow/react";
import { NodeData } from "../components/nodeEditModal/NodeEditModal";

export type ValidationIssue = {
  type: "error" | "warning";
  message: string;
  nodeIds?: string[];
};

export type ValidationResult = {
  valid: boolean;
  issues: ValidationIssue[];
};

// Cycle detection
export function detectCycles(nodes: Node[], edges: Edge[]): string[] {
  const adjacency = new Map<string, string[]>();
  for (const node of nodes) adjacency.set(node.id, []);
  for (const edge of edges) adjacency.get(edge.source)?.push(edge.target);

  const visited = new Set<string>();
  const inStack = new Set<string>();
  const cycleNodes = new Set<string>();

  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    inStack.add(nodeId);
    for (const neighbor of adjacency.get(nodeId) ?? []) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) {
          cycleNodes.add(neighbor);
          return true;
        }
      } else if (inStack.has(neighbor)) {
        cycleNodes.add(neighbor);
        cycleNodes.add(nodeId);
        return true;
      }
    }
    inStack.delete(nodeId);
    return false;
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) dfs(node.id);
  }

  return Array.from(cycleNodes);
}

// Orphaned nodes
export function findOrphanedNodes(nodes: Node[], edges: Edge[]): string[] {
  if (nodes.length <= 1) return [];
  const connected = new Set<string>();
  for (const edge of edges) {
    connected.add(edge.source);
    connected.add(edge.target);
  }
  return nodes.filter((n) => !connected.has(n.id)).map((n) => n.id);
}

// Self-loop edges
export function findSelfLoops(edges: Edge[]): string[] {
  return edges.filter((e) => e.source === e.target).map((e) => e.source);
}

// Duplicate edges
export function findDuplicateEdges(edges: Edge[]): string[] {
  const seen = new Set<string>();
  const dupeIds = new Set<string>();
  for (const edge of edges) {
    const key = `${edge.source}→${edge.target}`;
    if (seen.has(key)) dupeIds.add(edge.id);
    else seen.add(key);
  }
  return Array.from(dupeIds);
}

// Start nodes (no incoming edges)
export function findStartNodes(nodes: Node[], edges: Edge[]): string[] {
  const hasIncoming = new Set(edges.map((e) => e.target));
  return nodes.filter((n) => !hasIncoming.has(n.id)).map((n) => n.id);
}

// End nodes (no outgoing edges)
export function findEndNodes(nodes: Node[], edges: Edge[]): string[] {
  const hasOutgoing = new Set(edges.map((e) => e.source));
  return nodes.filter((n) => !hasOutgoing.has(n.id)).map((n) => n.id);
}

// Unreachable nodes
export function findUnreachableNodes(nodes: Node[], edges: Edge[]): string[] {
  const startNodes = findStartNodes(nodes, edges);
  if (startNodes.length === 0) return [];

  const adjacency = new Map<string, string[]>();
  for (const node of nodes) adjacency.set(node.id, []);
  for (const edge of edges) adjacency.get(edge.source)?.push(edge.target);

  const reachable = new Set<string>();
  const queue = [...startNodes];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (reachable.has(current)) continue;
    reachable.add(current);
    for (const neighbor of adjacency.get(current) ?? []) {
      queue.push(neighbor);
    }
  }

  return nodes.filter((n) => !reachable.has(n.id)).map((n) => n.id);
}

// Over-connected nodes
const MAX_OUTGOING = 5;
export function findOverconnectedNodes(nodes: Node[], edges: Edge[]): string[] {
  const outCount = new Map<string, number>();
  for (const edge of edges) {
    outCount.set(edge.source, (outCount.get(edge.source) ?? 0) + 1);
  }
  return nodes
    .filter((n) => (outCount.get(n.id) ?? 0) > MAX_OUTGOING)
    .map((n) => n.id);
}

//    Invalid webhook URLs
// export function findInvalidWebhookUrls(nodes: Node[]): string[] {
//   return nodes
//     .filter((n) => {
//       if (n.type !== "webhook") return false;
//       const url = (n.data as NodeData).webhookUrl ?? "";
//       try { new URL(url); return false; } catch { return true; }
//     })
//     .map((n) => n.id);
// }

// //    Invalid email addresses
// const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// export function findInvalidEmails(nodes: Node[]): string[] {
//   return nodes
//     .filter((n) => {
//       if (n.type !== "email") return false;
//       const email = (n.data as NodeData).emailTo ?? "";
//       return email.trim() !== "" && !EMAIL_RE.test(email);
//     })
//     .map((n) => n.id);
// }

// Excessive delays
const MAX_DELAY_SECONDS = 60 * 60 * 24 * 7; // 1 week
export function findExcessiveDelays(nodes: Node[]): string[] {
  return nodes
    .filter((n) => {
      if (n.type !== "delay") return false;
      const secs = (n.data as NodeData).delaySeconds ?? 0;
      return secs > MAX_DELAY_SECONDS;
    })
    .map((n) => n.id);
}

// Input nodes must not have incoming edges
export function findInputNodesWithIncoming(
  nodes: Node[],
  edges: Edge[]
): string[] {
  const inputIds = new Set(
    nodes
      .filter(
        (n) => n.type === "custom" && (n.data as NodeData).variant === "input"
      )
      .map((n) => n.id)
  );
  return [
    ...new Set(
      edges.filter((e) => inputIds.has(e.target)).map((e) => e.target)
    ),
  ];
}

// Output nodes must not have outgoing edges
export function findOutputNodesWithOutgoing(
  nodes: Node[],
  edges: Edge[]
): string[] {
  const outputIds = new Set(
    nodes
      .filter(
        (n) => n.type === "custom" && (n.data as NodeData).variant === "output"
      )
      .map((n) => n.id)
  );
  return [
    ...new Set(
      edges.filter((e) => outputIds.has(e.source)).map((e) => e.source)
    ),
  ];
}

// Input nodes with no outgoing edges trigger nothing
export function findUnusedInputNodes(nodes: Node[], edges: Edge[]): string[] {
  const hasOutgoing = new Set(edges.map((e) => e.source));
  return nodes
    .filter(
      (n) =>
        n.type === "custom" &&
        (n.data as NodeData).variant === "input" &&
        !hasOutgoing.has(n.id)
    )
    .map((n) => n.id);
}

// Output nodes with no incoming edges are never reached
export function findUnusedOutputNodes(nodes: Node[], edges: Edge[]): string[] {
  const hasIncoming = new Set(edges.map((e) => e.target));
  return nodes
    .filter(
      (n) =>
        n.type === "custom" &&
        (n.data as NodeData).variant === "output" &&
        !hasIncoming.has(n.id)
    )
    .map((n) => n.id);
}

// No custom input node exists
export function hasNoInputNode(nodes: Node[]): boolean {
  return !nodes.some(
    (n) => n.type === "custom" && (n.data as NodeData).variant === "input"
  );
}

// No custom output node exists
export function hasNoOutputNode(nodes: Node[]): boolean {
  return !nodes.some(
    (n) => n.type === "custom" && (n.data as NodeData).variant === "output"
  );
}

// Edge goes directly from input → output with no processing in between
export function findShortCircuitEdges(nodes: Node[], edges: Edge[]): string[] {
  const inputIds = new Set(
    nodes
      .filter(
        (n) => n.type === "custom" && (n.data as NodeData).variant === "input"
      )
      .map((n) => n.id)
  );
  const outputIds = new Set(
    nodes
      .filter(
        (n) => n.type === "custom" && (n.data as NodeData).variant === "output"
      )
      .map((n) => n.id)
  );
  return edges
    .filter((e) => inputIds.has(e.source) && outputIds.has(e.target))
    .map((e) => e.id);
}

// Main validator
export function validateWorkflow(
  nodes: Node[],
  edges: Edge[]
): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (nodes.length === 0) {
    return {
      valid: false,
      issues: [{ type: "warning", message: "Workflow is empty." }],
    };
  }

  // Errors
  const cycleIds = detectCycles(nodes, edges);
  if (cycleIds.length > 0) {
    issues.push({
      type: "error",
      message: "Workflow contains a cycle — automation flows must be acyclic.",
      nodeIds: cycleIds,
    });
  }

  const selfLoopIds = findSelfLoops(edges);
  if (selfLoopIds.length > 0) {
    issues.push({
      type: "error",
      message: `${selfLoopIds.length} node(s) have a self-loop edge.`,
      nodeIds: selfLoopIds,
    });
  }

  //---> Further Checks which can be added
  // const invalidUrlIds = findInvalidWebhookUrls(nodes);
  // if (invalidUrlIds.length > 0) {
  //   issues.push({
  //     type:    "error",
  //     message: `${invalidUrlIds.length} webhook node(s) have an invalid URL.`,
  //     nodeIds: invalidUrlIds,
  //   });
  // }

  // const invalidEmailIds = findInvalidEmails(nodes);
  // if (invalidEmailIds.length > 0) {
  //   issues.push({
  //     type:    "error",
  //     message: `${invalidEmailIds.length} email node(s) have an invalid address.`,
  //     nodeIds: invalidEmailIds,
  //   });
  // }

  const inputWithIncomingIds = findInputNodesWithIncoming(nodes, edges);
  if (inputWithIncomingIds.length > 0) {
    issues.push({
      type: "error",
      message: `${inputWithIncomingIds.length} Input node(s) have incoming edges — Input nodes cannot receive connections.`,
      nodeIds: inputWithIncomingIds,
    });
  }

  const outputWithOutgoingIds = findOutputNodesWithOutgoing(nodes, edges);
  if (outputWithOutgoingIds.length > 0) {
    issues.push({
      type: "error",
      message: `${outputWithOutgoingIds.length} Output node(s) have outgoing edges — Output nodes cannot send connections.`,
      nodeIds: outputWithOutgoingIds,
    });
  }

  // Warnings
  const orphanIds = findOrphanedNodes(nodes, edges);
  if (orphanIds.length > 0) {
    issues.push({
      type: "warning",
      message: `${orphanIds.length} node(s) are disconnected from the workflow.`,
      nodeIds: orphanIds,
    });
  }

  const startIds = findStartNodes(nodes, edges);
  if (startIds.length === 0) {
    issues.push({
      type: "warning",
      message:
        "Workflow has no entry point — at least one node must have no incoming edges.",
    });
  }

  const endIds = findEndNodes(nodes, edges);
  if (endIds.length === 0) {
    issues.push({
      type: "warning",
      message:
        "Workflow has no end point — at least one node must have no outgoing edges.",
    });
  }

  const unreachableIds = findUnreachableNodes(nodes, edges);
  if (unreachableIds.length > 0) {
    issues.push({
      type: "warning",
      message: `${unreachableIds.length} node(s) are unreachable from any start node.`,
      nodeIds: unreachableIds,
    });
  }

  const dupeEdgeIds = findDuplicateEdges(edges);
  if (dupeEdgeIds.length > 0) {
    issues.push({
      type: "warning",
      message: `${dupeEdgeIds.length} duplicate edge(s) detected between the same nodes.`,
    });
  }

  const overconnectedIds = findOverconnectedNodes(nodes, edges);
  if (overconnectedIds.length > 0) {
    issues.push({
      type: "warning",
      message: `${overconnectedIds.length} node(s) have more than ${MAX_OUTGOING} outgoing connections.`,
      nodeIds: overconnectedIds,
    });
  }

  const excessiveDelayIds = findExcessiveDelays(nodes);
  if (excessiveDelayIds.length > 0) {
    issues.push({
      type: "warning",
      message: `${excessiveDelayIds.length} delay node(s) exceed 1 week — is this intentional?`,
      nodeIds: excessiveDelayIds,
    });
  }

  if (hasNoInputNode(nodes)) {
    issues.push({
      type: "warning",
      message:
        "Workflow has no Input node — add a Custom node set to 'Input' as an entry point.",
    });
  }

  if (hasNoOutputNode(nodes)) {
    issues.push({
      type: "warning",
      message:
        "Workflow has no Output node — add a Custom node set to 'Output' as an exit point.",
    });
  }

  const unusedInputIds = findUnusedInputNodes(nodes, edges);
  if (unusedInputIds.length > 0) {
    issues.push({
      type: "warning",
      message: `${unusedInputIds.length} Input node(s) have no outgoing edges and will never trigger anything.`,
      nodeIds: unusedInputIds,
    });
  }

  const unusedOutputIds = findUnusedOutputNodes(nodes, edges);
  if (unusedOutputIds.length > 0) {
    issues.push({
      type: "warning",
      message: `${unusedOutputIds.length} Output node(s) have no incoming edges and will never be reached.`,
      nodeIds: unusedOutputIds,
    });
  }

  const shortCircuitIds = findShortCircuitEdges(nodes, edges);
  if (shortCircuitIds.length > 0) {
    issues.push({
      type: "warning",
      message: `${shortCircuitIds.length} edge(s) connect directly from Input to Output with no processing steps.`,
      nodeIds: shortCircuitIds,
    });
  }

  return {
    valid: issues.filter((i) => i.type === "error").length === 0,
    issues,
  };
}