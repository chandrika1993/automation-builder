// utils/sanitize.ts

export function sanitizeNode(node: any) {
  return {
    id:       node.id,
    type:     node.type,
    position: { x: node.position?.x ?? 0, y: node.position?.y ?? 0 },
    data: {
      label:        node.data?.label,
      description:  node.data?.description,
      emailTo:      node.data?.emailTo,
      webhookUrl:   node.data?.webhookUrl,
      delaySeconds: node.data?.delaySeconds,
      condition:    node.data?.condition,
      variant:      node.data?.variant,
    },
  };
}

export function sanitizeEdge(edge: any) {
  return {
    id:           edge.id,
    source:       edge.source,
    target:       edge.target,
    sourceHandle: edge.sourceHandle ?? null,
    targetHandle: edge.targetHandle ?? null,
    type:         edge.type,
    animated:     edge.animated ?? true,
  };
}