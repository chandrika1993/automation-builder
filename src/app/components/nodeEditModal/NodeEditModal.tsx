// components/NodeEditModal.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Edge, Node } from "@xyflow/react";
import "./NodeEditModal.css";
import { Link, Mail, Split, Sun, Timer } from "lucide-react";
import { TYPE_ACCENTS } from "@/app/Constants";

/**
 * All editable fields a node can carry in its `data` object.
 * Fields beyond `label` are type-specific — only the relevant ones
 * are rendered based on `node.type`.
 */
export type NodeData = {
  label: string;
  description?: string;
  emailTo?: string;
  webhookUrl?: string;
  delaySeconds?: number;
  condition?: string;
  variant?: "input" | "output" | "default";
};

type Props = {
  node: Node<NodeData> | null;
  edges: Edge[];
  onSave: (nodeId: string, data: NodeData) => void;
  onClose: () => void;
  onDelete: (nodeId: string) => void;
};

const icons: Record<string, React.ReactNode> = {
  email:     <Mail size={16} />,
  webhook:   <Link size={16} />,
  delay:     <Timer size={16} />,
  condition: <Split size={16} />,
  custom:    <Sun size={15} />,
};

/**
 * NodeEditModal
 *
 * A floating modal for editing the data of a single ReactFlow node.
 * Renders a base set of fields (label, description) for all node types,
 * plus type-specific fields (email address, webhook URL, delay, condition,
 * custom variant) gated on `node.type`.
 *
 * Behaviour:
 *  - Syncs local form state from `node.data` whenever the active node changes
 *  - Auto-focuses the label input when it opens
 *  - Closes on Escape key or backdrop click
 *  - Blocks variant changes on connected custom nodes to prevent invalid graphs
 *  - Disables Save if the label is empty
 *
 * The modal does not write to ReactFlow directly — all changes go through
 * `onSave` / `onDelete` callbacks so the parent controls the state.
 */
export default function NodeEditModal({
  node,
  edges,
  onSave,
  onClose,
  onDelete,
}: Props) {
  const [form, setForm] = useState<NodeData>({ label: "" });
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Sync form when the active node changes
  useEffect(() => {
    if (node) {
      setForm({ ...node.data });
      // Small delay to ensure modal is visible before focusing
      setTimeout(() => firstInputRef.current?.focus(), 50);
    }
  }, [node]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!node) return null;

  // Check if this node is connected to any edges
  const isConnected = edges.some(
    (edge) => edge.source === node.id || edge.target === node.id
  );
  // We block changing to "Output" if it started as an "Input" and has connections
  const originalVariant = node.data.variant;
  const blockOutput = isConnected && originalVariant === "input";
  const blockInput = isConnected && originalVariant === "output";

  const set =
    (field: keyof NodeData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSave = () => {
    if (!form.label.trim()) return;
    onSave(node.id, form);
    onClose();
  };

  const handleDelete = () => {
    onDelete(node!.id);
    onClose();
  };

  // const typeLabel = TYPE_LABELS[node.type ?? ""] ?? node.type;

  const accent = TYPE_ACCENTS[node?.type ?? ""] ?? "#6366f1";

  return (
    // Clicking the backdrop closes the modal
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        style={{ "--modal-accent": accent } as React.CSSProperties}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <h2 className="modal-title">
              <span className="icon">{icons[node?.type ?? ""]}</span>
              Edit Node
            </h2>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <div className="modal-body">
          {/* Common fields */}
          <div className="field-group">
            <label className="field-label" htmlFor="node-label">
              Label <span className="required">*</span>
            </label>
            <input
              ref={firstInputRef}
              id="node-label"
              className="field-input"
              value={form.label}
              onChange={set("label")}
              placeholder="Node name"
            />
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="node-description">
              Description
            </label>
            <textarea
              id="node-description"
              className="field-input field-textarea"
              value={form.description ?? ""}
              onChange={set("description")}
              placeholder="What does this step do?"
              rows={2}
            />
          </div>

          {/* Type-specific fields */}
          {node.type === "email" && (
            <div className="field-group">
              <label className="field-label" htmlFor="node-email-to">
                Send To
              </label>
              <input
                id="node-email-to"
                className="field-input"
                value={form.emailTo ?? ""}
                onChange={set("emailTo")}
                placeholder="recipient@example.com"
                type="email"
              />
            </div>
          )}

          {node.type === "webhook" && (
            <div className="field-group">
              <label className="field-label" htmlFor="node-webhook-url">
                Webhook URL
              </label>
              <input
                id="node-webhook-url"
                className="field-input"
                value={form.webhookUrl ?? ""}
                onChange={set("webhookUrl")}
                placeholder="https://..."
                type="url"
              />
            </div>
          )}

          {node.type === "delay" && (
            <div className="field-group">
              <label className="field-label" htmlFor="node-delay">
                Delay (seconds)
              </label>
              <input
                id="node-delay"
                className="field-input"
                value={form.delaySeconds ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    delaySeconds: Number(e.target.value),
                  }))
                }
                placeholder="60"
                type="number"
                min={0}
              />
            </div>
          )}

          {node.type === "condition" && (
            <div className="field-group">
              <label className="field-label" htmlFor="node-condition">
                Condition Expression
              </label>
              <input
                id="node-condition"
                className="field-input field-mono"
                value={form.condition ?? ""}
                onChange={set("condition")}
                placeholder='e.g. data.status === "active"'
              />
            </div>
          )}

          {node.type === "custom" && (
            <div className="field-group">
              <label className="field-label">
                Node Variant
                {isConnected &&
                  (originalVariant === "input" ||
                    originalVariant === "output") && (
                    <span
                      style={{
                        color: "#ef4444",
                        fontSize: "11px",
                        marginLeft: "8px",
                      }}
                    >
                      (Locked: delete connections to change type)
                    </span>
                  )}
              </label>
              <div className="field-radio-group">
                {(["input", "default", "output"] as const).map((v) => {
                  // Disable the "output" option if the node is an input with edges
                  const isDisabled =
                    (v === "output" && blockOutput) ||
                    (v === "input" && blockInput);

                  return (
                    <label
                      key={v}
                      className={`field-radio ${
                        form.variant === v ? "field-radio--active" : ""
                      } ${isDisabled ? "field-radio--disabled" : ""}`}
                      style={
                        isDisabled
                          ? { opacity: 0.4, cursor: "not-allowed" }
                          : {}
                      }
                    >
                      <input
                        type="radio"
                        name="variant"
                        value={v}
                        checked={form.variant === v}
                        disabled={isDisabled}
                        onChange={() => {
                          if (!isDisabled) {
                            setForm((prev) => ({ ...prev, variant: v }));
                          }
                        }}
                      />
                      {v.charAt(0).toUpperCase() + v.slice(1)}
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <footer className="modal-footer">
          <button className="btn-danger" onClick={handleDelete}>
            Delete
          </button>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={!form.label.trim()}
            >
              Save Changes
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}