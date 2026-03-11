"use client";

import { useRef, useState, useEffect } from "react";
import { Download, Upload, Ellipsis } from "lucide-react";
import "./WorkflowMenu.css";

type Props = {
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export default function WorkflowMenu({ onExport, onImport }: Props) {
  const [open, setOpen] = useState(false);
  const menuRef         = useRef<HTMLDivElement>(null);
  const importRef       = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="workflow-menu" ref={menuRef}>
      <button
        className={`header-btn workflow-menu__trigger ${open ? "workflow-menu__trigger--active" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-label="More options"
        aria-expanded={open}
        title="More options"
      >
        <Ellipsis size={15} color="var(--text-subtle)"/>
      </button>

      {/* Dropdown is position:absolute — never affects header layout */}
      <div className={`workflow-menu__dropdown ${open ? "workflow-menu__dropdown--open" : ""}`}
        aria-hidden={!open}
      >
        <div className="workflow-menu__label">Workflow</div>

        <button
          className="workflow-menu__item"
          onClick={() => { onExport(); setOpen(false); }}
          tabIndex={open ? 0 : -1}
        >
          <span className="workflow-menu__item-icon workflow-menu__item-icon--export">
            <Download size={13} />
          </span>
          <span className="workflow-menu__item-text">
            <span className="workflow-menu__item-title">Export</span>
            <span className="workflow-menu__item-desc">Save as .json file</span>
          </span>
        </button>

        <button
          className="workflow-menu__item"
          onClick={() => { importRef.current?.click(); setOpen(false); }}
          tabIndex={open ? 0 : -1}
        >
          <span className="workflow-menu__item-icon workflow-menu__item-icon--import">
            <Upload size={13} />
          </span>
          <span className="workflow-menu__item-text">
            <span className="workflow-menu__item-title">Import</span>
            <span className="workflow-menu__item-desc">Load from .json file</span>
          </span>
        </button>

        <input
          ref={importRef}
          type="file"
          accept=".json"
          style={{ display: "none" }}
          onChange={(e) => { onImport(e); e.target.value = ""; }}
        />
      </div>
    </div>
  );
}