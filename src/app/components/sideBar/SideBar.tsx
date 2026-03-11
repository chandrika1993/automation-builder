"use client";

import { Grip, Link, Mail, Split, Sun, Timer } from "lucide-react";
import { useDnD } from "../../contexts/DnDContext";
import './SideBar.css'

/**
 * Static registry of all draggable node types.
 * To add a new node type: add an entry here and a matching key in `nodeTypes.tsx`.
 */
const NODE_TYPES = [
  { type: "email",     icon: <Mail size={15} />,  label: "Email",     description: "Send an email",           accent: "#34d399" },
  { type: "webhook",   icon: <Link size={15} />,  label: "Webhook",   description: "HTTP POST request",       accent: "#7dd3fc" },
  { type: "delay",     icon: <Timer size={15} />, label: "Delay",     description: "Wait N seconds",          accent: "#fbbf24" },
  { type: "condition", icon: <Split size={15} />, label: "Condition", description: "Branch on logic",         accent: "#f9a8d4" },
  { type: "custom",    icon: <Sun size={15} />,   label: "Custom",    description: "Input / Output / Default", accent: "#a78bfa" },
];

/**
 * SideBar
 *
 * Drag source panel for adding nodes to the canvas.
 * Sets the dragged node type via `DnDContext` so the canvas `onDrop`
 * handler knows what kind of node to create on drop.
 * Clears the type on drag end to avoid stale state if the drop is cancelled.
 */
const SideBar = () => {
  const { setType } = useDnD();

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    setType(nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <aside className="sidebar">

      <div className="sidebar__section-label">Nodes</div>

      <div className="sidebar__nodes">
        {NODE_TYPES.map(({ type, icon, label, description, accent }) => (
          <div
            key={type}
            className="sidebar__node"
            style={{ "--node-accent": accent } as React.CSSProperties}
            draggable
            onDragStart={(e) => onDragStart(e, type)}
            onDragEnd={() => setType(null as unknown as string)}
          >
            <div className="sidebar__node-icon">{icon}</div>
            <div className="sidebar__node-text">
              <span className="sidebar__node-label">{label}</span>
              <span className="sidebar__node-desc">{description}</span>
            </div>
            <div className="sidebar__node-drag">
              <Grip size={12}/>
            </div>
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
      
        <div className="tip-box">
          <h3>Tip <Grip size={12}/></h3>
          <p>
            Connect nodes by dragging from the sidebar
          </p>
        </div>
      </div>
    </aside>
  );
};

export default SideBar;