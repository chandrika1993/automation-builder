import { Handle, Position } from "@xyflow/react";
import "./BaseNode.css";

/**
 * Props shared by all node types. Each concrete node (email, webhook, delay,
 * etc.) computes these from its own ReactFlow `data` and passes them down.
 */
type BaseNodeProps = {
  selected: boolean;
  accent: string;
  typeLabel: string;
  icon: React.ReactNode;
  label: string;
  meta?: { key: string; val: string };
  description?: string;
};

/**
 * BaseNodeComponent
 *
 * Shared canvas card rendered by every node type in the flow.
 * Provides a consistent layout — icon + type label header, user label,
 * optional meta row, optional description — so individual node files
 * only need to supply their type-specific data.
 *
 * Handles:
 *  - target (top)  — incoming connections
 *  - source (bottom) — outgoing connections
 *
 * The `--node-accent` CSS custom property controls the accent colour
 * used for the border, glow, and bottom bar.
 */
const BaseNodeComponent = ({ selected, accent, typeLabel, icon, label, meta, description }: BaseNodeProps) => {
  return (
    <div
      className={`email-node ${selected ? "email-node--selected" : ""}`}
      style={{ "--node-accent": accent } as React.CSSProperties}
    >
      <div className="email-node__glow" />

      <Handle type="target" position={Position.Top} className="email-node__handle" />

      <div className="email-node__header">
        <div className="email-node__icon">{icon}</div>
        <span className="email-node__type">{typeLabel}</span>
      </div>

      <div className="email-node__body">
        <div className="email-node__label">
          {label || <span className="email-node__placeholder">Untitled</span>}
        </div>
        {meta && (
          <div className="email-node__meta">
            <span className="email-node__meta-key">{meta.key}</span>
            <span className="email-node__meta-val">{meta.val}</span>
          </div>
        )}
        {description && (
          <div className="email-node__description">{description}</div>
        )}
      </div>

      <div className="email-node__bar" />

      <Handle type="source" position={Position.Bottom} className="email-node__handle" />
    </div>
  );
};
// export { BaseNode as FlowBaseNode };
export default BaseNodeComponent;