"use client";

import { useEffect, useState, useCallback } from "react";
import { Trash2, Clock, Loader2, ArrowRight, ArrowLeft } from "lucide-react";

type WorkflowMeta = {
  id:        string;
  name:      string;
  updatedAt?: string;
  createdAt?: string;
};

type Pagination = {
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
};

type Props = {
  currentId: string | null;
  currentName: string | null;  
  onOpen:    (id: string) => void;
};

async function fetchJSON<T = any>(
  url: string,
  options?: RequestInit
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  try {
    const res  = await fetch(url, options);
    const text = await res.text();
    if (!text?.trim()) return { ok: false, status: res.status, error: "Empty response" };
    let data: T;
    try { data = JSON.parse(text); }
    catch { return { ok: false, status: res.status, error: "Invalid JSON" }; }
    if (!res.ok) return { ok: false, status: res.status, error: (data as any)?.error ?? "Failed" };
    return { ok: true, data };
  } catch (err) {
    return { ok: false, status: 0, error: "Network error" };
  }
}

export default function WorkflowList({ currentId, currentName, onOpen }: Props) {
  const [workflows,  setWorkflows]  = useState<WorkflowMeta[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page,       setPage]       = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadPage = useCallback(async (p: number) => {
    setLoading(true);
    const result = await fetchJSON(`/api/automations?page=${p}&limit=8`);
    if (result.ok) {
      setWorkflows(result.data?.data ?? []);
      setPagination(result.data?.pagination ?? null);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadPage(page); }, [page, loadPage]);

  const handleDelete = useCallback(async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Delete this workflow?")) return;
    setDeletingId(id);
    await fetchJSON(`/api/automations/${id}`, { method: "DELETE" });
    await loadPage(page);
    setDeletingId(null);
  }, [page, loadPage]);

  const formatDate = (iso?: string) => {
    if (!iso) return "recently";
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric", month: "short"
    });
  };

  if (loading && workflows.length === 0) {
    return (
      <div className="nav-panel__empty">
        <Loader2 className="animate-spin" size={20} />
        <p>Fetching flows...</p>
      </div>
    );
  }

  return (
    <div className="nav-panel__list">
      {workflows.map((wf) => (
        <div
          key={wf.id}
          className={`automation-card ${wf.id === currentId ? "automation-card--active" : ""}`}
          onClick={() => onOpen(wf.id)}
        >
          <div className="automation-card__content">
            <h3>{wf.id === currentId ? (currentName || wf.name) : wf.name}</h3>
            <p>
              <Clock size={12} style={{ display: 'inline', marginRight: 4 }} />
              Edited {formatDate(wf.updatedAt ?? wf.createdAt)}
            </p>
          </div>
          
          <button
            className="automation-card__delete"
            onClick={(e) => handleDelete(e, wf.id)}
            disabled={deletingId === wf.id}
          >
            {deletingId === wf.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          </button>
        </div>
      ))}

      {pagination && pagination.totalPages > 1 && (
        <div className="nav-pagination">
          <button onClick={() => setPage(p => p - 1)} disabled={page === 1}>
            <ArrowLeft size={14} />
          </button>
          <span>{page} / {pagination.totalPages}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page === pagination.totalPages}>
            <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}