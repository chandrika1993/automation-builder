"use client";

import { useState } from "react";
import { installDemoApi } from "./api";
import { demoStore } from "./store";

const isDemo = process.env.NEXT_PUBLIC_DEMO === "1";

// Install the in-browser API at module load, before the builder's first fetch.
if (isDemo) installDemoApi();

const REPO_URL = "https://github.com/chandrika1993/automation-builder";

export default function DemoMode() {
  const [open, setOpen] = useState(true);
  if (!isDemo || !open) return null;

  const reset = () => {
    demoStore.reset();
    window.location.reload();
  };

  return (
    <div role="note" className="demo-banner">
      <span>Live demo: workflows are saved in your browser.</span>
      <button type="button" onClick={reset}>Reset samples</button>
      <a href={REPO_URL} target="_blank" rel="noopener noreferrer">View code</a>
      <button type="button" className="demo-banner-close" aria-label="Hide demo notice" onClick={() => setOpen(false)}>
        ×
      </button>
      <style>{`
        .demo-banner {
          position: fixed; left: 50%; bottom: 16px; transform: translateX(-50%); z-index: 1000;
          display: flex; align-items: center; gap: 12px; max-width: calc(100vw - 32px);
          padding: 8px 10px 8px 16px; border-radius: 999px;
          background: rgba(17, 17, 20, .9); color: #fff; font: 500 13px/1.4 var(--font-geist-sans, system-ui, sans-serif);
          box-shadow: 0 6px 24px rgba(0, 0, 0, .25); backdrop-filter: blur(6px);
        }
        .demo-banner a, .demo-banner button {
          color: inherit; font: inherit; background: none; border: 0; padding: 0; cursor: pointer;
          text-decoration: underline; text-underline-offset: 2px; white-space: nowrap;
        }
        .demo-banner .demo-banner-close {
          text-decoration: none; font-size: 18px; line-height: 1; width: 24px; height: 24px; border-radius: 50%;
        }
        .demo-banner .demo-banner-close:hover { background: rgba(255, 255, 255, .15); }
        @media (max-width: 560px) {
          .demo-banner { flex-wrap: wrap; justify-content: center; border-radius: 14px; gap: 4px 14px; padding: 8px 36px; font-size: 12px; left: 16px; right: 16px; transform: none; max-width: none; }
          .demo-banner span { flex-basis: 100%; text-align: center; }
          .demo-banner .demo-banner-close { position: absolute; top: 6px; right: 6px; }
        }
      `}</style>
    </div>
  );
}
