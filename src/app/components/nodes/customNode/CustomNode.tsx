import { Handle, Node, NodeProps, Position } from "@xyflow/react";
import { memo } from "react";
import "./CustomNode.css";
import { ArrowDown, ArrowUp, Sun } from "lucide-react";
import { VARIANT_LABELS } from "@/app/Constants";

export type CustomNodeVariant = "input" | "output" | "default";

type CustomNodeData = {
  label: string;
  variant?: CustomNodeVariant;
  description?: string;
};

type CustomNodeType = Node<CustomNodeData, "custom">;

/**
 * CustomNode
 *
 * A flexible node with three variants that control which handles are shown:
 *  - "input"   — source handle only (bottom) — flow starts here
 *  - "output"  — target handle only (top)    — flow ends here
 *  - "default" — both handles                — mid-flow step
 *
 * Wrapped in `memo` to prevent re-renders when unrelated canvas state changes.
 */
const CustomNode = ({ data, selected }: NodeProps<CustomNodeType>) => {
  const variant: CustomNodeVariant = data.variant ?? "default";

  return (
    <div
      className={`custom-node custom-node--${variant} ${
        selected ? "custom-node--selected" : ""
      }`}
    >
      <div className="custom-node__glow" />

      {/* Bottom handle — Only Input and Default (as Sources) */}
      {(variant === "input" || variant === "default") && (
        <Handle
          type="source"
          position={Position.Bottom}
          id="bottom-source"
          className="custom-node__handle"
        />
      )}
      <div className="custom-node__header">
        <div className="custom-node__icon">
          {variant === "input" && <ArrowDown size={13} />}
          {variant === "output" && <ArrowUp size={13} />}
          {variant === "default" && <Sun size={13} />}
        </div>
        <span className="custom-node__type">{VARIANT_LABELS[variant]}</span>
      </div>

      <div className="custom-node__body">
        <div className="custom-node__label">
          {data.label || (
            <span className="custom-node__placeholder">Untitled</span>
          )}
        </div>
        {data.description && (
          <div className="custom-node__description">{data.description}</div>
        )}
      </div>

      <div className="custom-node__bar" />

      {/* Top handle — Only Default and Output (as Targets) */}
      {(variant === "output" || variant === "default") && (
        <Handle
          type="target"
          position={Position.Top}
          id="top-target"
          className="custom-node__handle"
        />
      )}
    </div>
  );
};

CustomNode.displayName = "CustomNode";

export default memo(CustomNode);
