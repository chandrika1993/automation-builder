import { CustomNodeVariant } from "./components/nodes/customNode/CustomNode";


export const TYPE_ACCENTS: Record<string, string> = {
  email: "#059669",
  webhook: "#0284c7",
  delay: "#d97706",
  condition: "#db2777",
  custom: "#7c3aed",
};

// MiniMap colors — outside component, never recreated
export const MINIMAP_COLORS: Record<string, string> = {
  email: "#6ee7b7",
  webhook: "#7dd3fc",
  delay: "#fbbf24",
  condition: "#f9a8d4",
  custom: "#818cf8",
};

export const VARIANT_LABELS: Record<CustomNodeVariant, string> = {
  input: "Input",
  output: "Output",
  default: "Default",
};