"use client";
import { ValidationResult } from "@/app/utils/validation";
import "./ValidationPanel.css";

type Props = { result: ValidationResult };

/**
 * ValidationPanel
 *
 * Renders inside the ReactFlow canvas as an overlay listing any validation
 * issues with the current workflow. Returns null when there are no issues.
 *
 * Errors block auto-save ("Fix errors to save").
 * Warnings are advisory and do not block saving.
 */
export default function ValidationPanel({ result }: Props) {
  if (result.issues.length === 0) return null;

  return (
    <div className="validation-panel">
      {result.issues.map((issue, i) => (
        <div key={i} className={`validation-issue validation-issue--${issue.type}`}>
          <span className="validation-icon">
            {issue.type === "error" ? "⚠" : "◉"}
          </span>
          {issue.message}
        </div>
      ))}
    </div>
  );
}