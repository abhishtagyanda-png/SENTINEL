"use client";

import { useEffect, useState, useCallback } from "react";
import { getReports, type ReportSummary } from "@/lib/api";
import {
  AlertTriangle,
  Eye,
  ShieldCheck,
  MapPin,
  Clock,
  Inbox,
} from "lucide-react";

interface IncidentQueueProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
  refreshTrigger: number;
}

function DecisionBadge({ decision }: { decision: string }) {
  const config: Record<string, { class: string; icon: React.ReactNode; label: string }> = {
    ESCALATE: {
      class: "badge-escalate",
      icon: <AlertTriangle className="w-3 h-3" />,
      label: "ESCALATE",
    },
    HOLD_FOR_REVIEW: {
      class: "badge-hold",
      icon: <Eye className="w-3 h-3" />,
      label: "REVIEW",
    },
    SUPPRESS: {
      class: "badge-suppress",
      icon: <ShieldCheck className="w-3 h-3" />,
      label: "SUPPRESS",
    },
  };

  const c = config[decision] || config.SUPPRESS;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${c.class}`}
    >
      {c.icon}
      {c.label}
    </span>
  );
}

export default function IncidentQueue({
  selectedId,
  onSelect,
  refreshTrigger,
}: IncidentQueueProps) {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    try {
      const data = await getReports();
      setReports(data);
      // Auto-select first report if none selected
      if (!selectedId && data.length > 0) {
        onSelect(data[0].report_id);
      }
    } catch {
      // Backend may not be running — keep empty
    } finally {
      setLoading(false);
    }
  }, [selectedId, onSelect]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports, refreshTrigger]);

  // Auto-refresh every 15s
  useEffect(() => {
    const interval = setInterval(fetchReports, 15000);
    return () => clearInterval(interval);
  }, [fetchReports]);

  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return ts;
    }
  };

  const truncateId = (id: string) => {
    if (id.length > 22) return id.slice(0, 22) + "…";
    return id;
  };

  return (
    <div className="glass-card p-4 flex-1 flex flex-col min-h-0">
      {/* Section title */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Inbox className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-semibold text-slate-200 tracking-wide uppercase">
            Incident Queue
          </h2>
        </div>
        <span className="text-[10px] text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded-full">
          {reports.length} events
        </span>
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-20 w-full" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && reports.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
          <Inbox className="w-10 h-10 text-slate-700 mb-3" />
          <p className="text-sm text-slate-500">No incidents yet</p>
          <p className="text-xs text-slate-600 mt-1">
            Trigger an edge event above to begin
          </p>
        </div>
      )}

      {/* Incident list */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 -mr-1">
        {reports.map((report) => (
          <button
            key={report.report_id}
            onClick={() => onSelect(report.report_id)}
            className={`w-full text-left p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
              selectedId === report.report_id
                ? "incident-active bg-slate-800/60 border-indigo-500/60"
                : "bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/30"
            }`}
          >
            {/* Top row: ID + Badge */}
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <span className="mono-hash text-[11px] text-slate-400">
                {truncateId(report.report_id)}
              </span>
              <DecisionBadge decision={report.decision} />
            </div>

            {/* Location + Time */}
            <div className="flex items-center gap-3 text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {report.location}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTime(report.timestamp_utc)}
              </span>
            </div>

            {/* Confidence bar */}
            <div className="mt-2 h-1 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${report.confidence * 100}%`,
                  background:
                    report.decision === "ESCALATE"
                      ? "linear-gradient(90deg, #ef4444, #f87171)"
                      : report.decision === "HOLD_FOR_REVIEW"
                      ? "linear-gradient(90deg, #f59e0b, #fbbf24)"
                      : "linear-gradient(90deg, #10b981, #34d399)",
                }}
              />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
