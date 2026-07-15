"use client";

import { useState } from "react";
import { triggerSensor, MOCK_EVENTS, type ReportDetail } from "@/lib/api";
import { Radio, Loader2, ChevronDown, Zap } from "lucide-react";

interface SimulatorPanelProps {
  onNewReport: (report: ReportDetail) => void;
}

export default function SimulatorPanel({ onNewReport }: SimulatorPanelProps) {
  const [selectedEvent, setSelectedEvent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleTrigger = async () => {
    setLoading(true);
    try {
      const result = await triggerSensor(MOCK_EVENTS[selectedEvent].payload);
      onNewReport(result);
    } catch (error) {
      console.error("Failed to trigger sensor:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-4 mb-4">
      {/* Section title */}
      <div className="flex items-center gap-2 mb-4">
        <Radio className="w-4 h-4 text-indigo-400" />
        <h2 className="text-sm font-semibold text-slate-200 tracking-wide uppercase">
          Local Edge Feeds
        </h2>
      </div>

      {/* Scenario dropdown */}
      <div className="relative mb-3">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-slate-300 hover:border-indigo-500/50 transition-colors"
        >
          <span className="truncate">{MOCK_EVENTS[selectedEvent].label}</span>
          <ChevronDown
            className={`w-4 h-4 text-slate-500 transition-transform ${
              dropdownOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {dropdownOpen && (
          <div className="absolute z-50 mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg shadow-xl overflow-hidden animate-fade-in">
            {MOCK_EVENTS.map((event, i) => (
              <button
                key={event.payload.event_id}
                onClick={() => {
                  setSelectedEvent(i);
                  setDropdownOpen(false);
                }}
                className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                  i === selectedEvent
                    ? "bg-indigo-500/15 text-indigo-300"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                {event.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Event preview */}
      <div className="mb-3 p-2.5 bg-slate-900/50 border border-slate-800 rounded-lg">
        <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">
          <span>Event Preview</span>
          <span className="mono-hash">{MOCK_EVENTS[selectedEvent].payload.event_id}</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          {MOCK_EVENTS[selectedEvent].payload.camera_feed_summary}
        </p>
        <div className="flex gap-3 mt-2 text-[10px] text-slate-500">
          <span>📍 {MOCK_EVENTS[selectedEvent].payload.location}</span>
          <span>🕐 {MOCK_EVENTS[selectedEvent].payload.timestamp}</span>
          <span>👥 {MOCK_EVENTS[selectedEvent].payload.people_count}</span>
        </div>
      </div>

      {/* Trigger button */}
      <button
        onClick={handleTrigger}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white text-sm font-medium rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/20"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Processing Pipeline...</span>
          </>
        ) : (
          <>
            <Zap className="w-4 h-4" />
            <span>Trigger Edge Event</span>
          </>
        )}
      </button>
    </div>
  );
}
