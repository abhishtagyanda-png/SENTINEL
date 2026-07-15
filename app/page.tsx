"use client";

import { useState, useCallback } from "react";
import Header from "@/components/Header";
import SimulatorPanel from "@/components/SimulatorPanel";
import IncidentQueue from "@/components/IncidentQueue";
import ReasoningTrace from "@/components/ReasoningTrace";
import ForensicVault from "@/components/ForensicVault";
import NLPAssistant from "@/components/NLPAssistant";
import type { ReportDetail } from "@/lib/api";

export default function Dashboard() {
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleNewReport = useCallback((report: ReportDetail) => {
    setSelectedReportId(report.report_id);
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const handleSelect = useCallback((id: string) => {
    setSelectedReportId(id);
  }, []);

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <Header />

      {/* 3-Column Dashboard Grid */}
      <main className="flex-1 grid grid-cols-[280px_1fr_340px] gap-3 p-3 min-h-0 overflow-hidden">
        {/* ═══ LEFT COLUMN: Simulator + Incident Queue ═══ */}
        <div className="flex flex-col min-h-0 overflow-hidden">
          <SimulatorPanel onNewReport={handleNewReport} />
          <IncidentQueue
            selectedId={selectedReportId}
            onSelect={handleSelect}
            refreshTrigger={refreshTrigger}
          />
        </div>

        {/* ═══ CENTER COLUMN: Gemma 4 Reasoning Trace ═══ */}
        <div className="min-h-0 overflow-hidden">
          <ReasoningTrace reportId={selectedReportId} />
        </div>

        {/* ═══ RIGHT COLUMN: Forensics + NLP Assistant ═══ */}
        <div className="flex flex-col gap-3 min-h-0 overflow-y-auto">
          <ForensicVault reportId={selectedReportId} />
          <NLPAssistant />
        </div>
      </main>
    </div>
  );
}
