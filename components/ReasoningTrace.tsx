"use client";

import { useEffect, useState } from "react";
import { getReportDetail, type ReportDetail } from "@/lib/api";
import {
  Brain,
  AlertTriangle,
  Eye,
  ShieldCheck,
  ChevronDown,
  Users,
  Calendar,
  ShieldAlert,
  History,
  Target,
  Megaphone,
} from "lucide-react";

interface ReasoningTraceProps {
  reportId: string | null;
}

const STEP_META = [
  {
    key: "step1",
    title: "Entities & Actions Detected",
    icon: <Users className="w-4 h-4" />,
    color: "text-blue-400",
  },
  {
    key: "step2",
    title: "Security Schedule Cross-Reference",
    icon: <Calendar className="w-4 h-4" />,
    color: "text-purple-400",
  },
  {
    key: "step3",
    title: "Security Policy Evaluation",
    icon: <ShieldAlert className="w-4 h-4" />,
    color: "text-cyan-400",
  },
  {
    key: "step4",
    title: "Historical Patterns Match",
    icon: <History className="w-4 h-4" />,
    color: "text-amber-400",
  },
  {
    key: "step5",
    title: "Intent & Severity Assessment",
    icon: <Target className="w-4 h-4" />,
    color: "text-red-400",
  },
];

export default function ReasoningTrace({ reportId }: ReasoningTraceProps) {
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [openSteps, setOpenSteps] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!reportId) {
      setReport(null);
      return;
    }
    setLoading(true);
    getReportDetail(reportId)
      .then((data) => {
        setReport(data);
        setOpenSteps(new Set());
      })
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
  }, [reportId]);

  const toggleStep = (step: string) => {
    setOpenSteps((prev) => {
      const next = new Set(prev);
      if (next.has(step)) next.delete(step);
      else next.add(step);
      return next;
    });
  };

  const expandAll = () => {
    setOpenSteps(new Set(STEP_META.map((s) => s.key)));
  };

  // ── Empty / Loading States ───────────────────────────
  if (!reportId) {
    return (
      <div className="glass-card h-full flex flex-col items-center justify-center text-center p-8">
        <Brain className="w-14 h-14 text-slate-700 mb-4" />
        <h3 className="text-lg font-semibold text-slate-500">No Incident Selected</h3>
        <p className="text-sm text-slate-600 mt-2 max-w-xs">
          Select an incident from the queue or trigger a new edge event to view the Gemma 4 reasoning trace.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="glass-card h-full p-6 space-y-4">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-24 w-full" />
        <div className="skeleton h-16 w-full" />
        <div className="skeleton h-16 w-full" />
        <div className="skeleton h-16 w-full" />
        <div className="skeleton h-16 w-full" />
        <div className="skeleton h-16 w-full" />
        <div className="skeleton h-32 w-full" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="glass-card h-full flex items-center justify-center p-8">
        <p className="text-sm text-slate-500">Failed to load report details.</p>
      </div>
    );
  }

  // ── Decision config ──────────────────────────────────
  const decisionConfig: Record<string, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
    ESCALATE: {
      bg: "bg-red-500/10",
      border: "border-red-500/40",
      text: "text-red-400",
      icon: <AlertTriangle className="w-6 h-6" />,
    },
    HOLD_FOR_REVIEW: {
      bg: "bg-amber-500/10",
      border: "border-amber-500/40",
      text: "text-amber-400",
      icon: <Eye className="w-6 h-6" />,
    },
    SUPPRESS: {
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/40",
      text: "text-emerald-400",
      icon: <ShieldCheck className="w-6 h-6" />,
    },
  };

  const dc = decisionConfig[report.decision] || decisionConfig.SUPPRESS;
  const anomalyScore = report.scene_tokens?.anomaly_score ?? report.confidence;
  const scoreColor =
    anomalyScore >= 0.8
      ? "#ef4444"
      : anomalyScore >= 0.5
      ? "#f59e0b"
      : "#10b981";

  return (
    <div className="glass-card h-full p-5 overflow-y-auto space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-1">
        <Brain className="w-5 h-5 text-indigo-400" />
        <h2 className="text-sm font-semibold text-slate-200 tracking-wide uppercase">
          Gemma 4 Reasoning Trace
        </h2>
      </div>

      {/* Top Row: Anomaly Score + Decision Banner */}
      <div className="flex items-center gap-4">
        {/* Anomaly Score Ring */}
        <div
          className="anomaly-ring flex-shrink-0"
          style={
            {
              "--score": anomalyScore,
              "--ring-color": scoreColor,
            } as React.CSSProperties
          }
        >
          <div className="text-center">
            <div className="text-xl font-bold" style={{ color: scoreColor }}>
              {anomalyScore.toFixed(2)}
            </div>
            <div className="text-[9px] text-slate-500 uppercase tracking-wider">
              Anomaly
            </div>
          </div>
        </div>

        {/* Decision Banner */}
        <div
          className={`flex-1 flex items-center gap-3 p-4 rounded-xl border ${dc.bg} ${dc.border} ${
            report.decision === "ESCALATE" ? "animate-pulse-glow" : ""
          }`}
        >
          <div className={dc.text}>{dc.icon}</div>
          <div>
            <div className={`text-lg font-bold tracking-wide ${dc.text}`}>
              {report.decision.replace(/_/g, " ")}
            </div>
            <div className="text-[11px] text-slate-500">
              Confidence: {(report.confidence * 100).toFixed(0)}% • {report.location}
            </div>
          </div>
        </div>
      </div>

      {/* Sensor Summary */}
      {report.scene_tokens && (
        <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-lg">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
            Edge Sensor Summary
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            {report.scene_tokens.sensor_summary}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[10px] text-slate-600">Preliminary Intent:</span>
            <span className="mono-hash text-indigo-400 text-[11px]">
              {report.scene_tokens.preliminary_intent}
            </span>
          </div>
        </div>
      )}

      {/* 5-Step CoT Accordion */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">
            Chain-of-Thought Trace
          </span>
          <button
            onClick={expandAll}
            className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Expand All
          </button>
        </div>

        <div className="space-y-1.5">
          {STEP_META.map((step, i) => {
            const content =
              report.reasoning_steps?.[step.key as keyof typeof report.reasoning_steps];
            const isOpen = openSteps.has(step.key);

            return (
              <div
                key={step.key}
                className="bg-slate-900/40 border border-slate-800 rounded-lg overflow-hidden transition-colors hover:border-slate-700"
              >
                <button
                  onClick={() => toggleStep(step.key)}
                  className="w-full flex items-center gap-3 p-3 text-left"
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isOpen
                        ? "bg-indigo-500/20 text-indigo-400"
                        : "bg-slate-800 text-slate-500"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className={step.color}>{step.icon}</span>
                  <span className="flex-1 text-sm text-slate-300 font-medium">
                    {step.title}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-600 accordion-chevron ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isOpen && content && (
                  <div className="px-3 pb-3 pt-0 ml-12 animate-fade-in">
                    <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">
                      {content}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Operator Briefing Box */}
      <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl">
        <div className="flex items-center gap-2 mb-2">
          <Megaphone className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
            Operator Briefing
          </span>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          {report.operator_message}
        </p>
      </div>
    </div>
  );
}
