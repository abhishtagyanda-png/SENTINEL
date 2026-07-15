"use client";

import { useState } from "react";
import { triggerSensor, triggerImage, MOCK_EVENTS, type ReportDetail } from "@/lib/api";
import { Radio, Loader2, ChevronDown, Zap, Volume2, Settings, FileText, Image as ImageIcon, Sliders } from "lucide-react";

interface SimulatorPanelProps {
  onNewReport: (report: ReportDetail) => void;
}

export default function SimulatorPanel({ onNewReport }: SimulatorPanelProps) {
  const [activeTab, setActiveTab] = useState<"presets" | "custom">("presets");
  const [selectedEvent, setSelectedEvent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  // Custom simulation states
  const [customType, setCustomType] = useState<"sensor" | "image">("sensor");
  const [location, setLocation] = useState("Server Room B3");
  const [motionDetected, setMotionDetected] = useState(true);
  const [doorState, setDoorState] = useState("forced");
  const [peopleCount, setPeopleCount] = useState(2);
  const [cameraFeedSummary, setCameraFeedSummary] = useState(
    "Two individuals in dark clothing tampering with server rack door locks."
  );
  const [imagePath, setImagePath] = useState("C:/path/to/test_image.jpg");
  const [acousticTokens, setAcousticTokens] = useState("[AUDIO: METALLIC_SCRAPING]");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleTriggerPreset = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const result = await triggerSensor(MOCK_EVENTS[selectedEvent].payload);
      if (result.report) {
        onNewReport(result.report);
      } else {
        setStatusMessage(`Suppressed at Edge: Anomaly Score ${result.anomaly_score.toFixed(2)} (${result.action})`);
      }
    } catch (error: any) {
      console.error("Failed to trigger sensor:", error);
      setStatusMessage(`API Error: ${error.message || "Failed to contact backend"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerCustom = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      if (customType === "sensor") {
        const payload = {
          event_id: `EVT-${Math.floor(Math.random() * 900) + 100}`,
          timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }).substring(0, 5),
          location,
          motion_detected: motionDetected,
          door_state: doorState,
          people_count: peopleCount,
          camera_feed_summary: cameraFeedSummary,
          acoustic_tokens: acousticTokens.trim() || undefined,
        };
        const result = await triggerSensor(payload);
        if (result.report) {
          onNewReport(result.report);
        } else {
          setStatusMessage(`Suppressed at Edge: Anomaly Score ${result.anomaly_score.toFixed(2)} (${result.action})`);
        }
      } else {
        const payload = {
          image_path: imagePath.trim(),
          location,
          acoustic_tokens: acousticTokens.trim() || undefined,
        };
        const result = await triggerImage(payload);
        if (result.report) {
          onNewReport(result.report);
        } else {
          setStatusMessage(`Suppressed at Edge: Anomaly Score ${result.anomaly_score.toFixed(2)} (${result.action})`);
        }
      }
    } catch (error: any) {
      console.error("Failed to trigger custom event:", error);
      setStatusMessage(`API Error: ${error.message || "Failed to contact backend"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-4 mb-4 flex flex-col min-h-0">
      {/* Title */}
      <div className="flex items-center gap-2 mb-3">
        <Radio className="w-4 h-4 text-indigo-400" />
        <h2 className="text-sm font-semibold text-slate-200 tracking-wide uppercase">
          Incident Simulator
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-950/80 p-0.5 rounded-lg border border-slate-800 mb-4 text-xs">
        <button
          onClick={() => { setActiveTab("presets"); setStatusMessage(null); }}
          className={`flex-1 py-1.5 rounded-md font-medium transition-colors ${
            activeTab === "presets"
              ? "bg-indigo-600 text-white"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          Preset Feeds
        </button>
        <button
          onClick={() => { setActiveTab("custom"); setStatusMessage(null); }}
          className={`flex-1 py-1.5 rounded-md font-medium transition-colors ${
            activeTab === "custom"
              ? "bg-indigo-600 text-white"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          Custom Input
        </button>
      </div>

      {/* PRESETS TAB CONTENT */}
      {activeTab === "presets" && (
        <div className="space-y-3">
          {/* Scenario dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full flex items-center justify-between px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-xs text-slate-300 hover:border-indigo-500/50 transition-colors"
            >
              <span className="truncate">{MOCK_EVENTS[selectedEvent].label}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-500 transition-transform ${
                  dropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {dropdownOpen && (
              <div className="absolute z-50 mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg shadow-xl overflow-hidden text-xs">
                {MOCK_EVENTS.map((event, i) => (
                  <button
                    key={event.payload.event_id}
                    onClick={() => {
                      setSelectedEvent(i);
                      setDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 transition-colors ${
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
          <div className="p-2.5 bg-slate-900/50 border border-slate-800 rounded-lg">
            <div className="flex items-center justify-between text-[9px] text-slate-500 uppercase tracking-wider mb-1">
              <span>Event Preview</span>
              <span className="mono-hash">{MOCK_EVENTS[selectedEvent].payload.event_id}</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {MOCK_EVENTS[selectedEvent].payload.camera_feed_summary}
            </p>
            
            {MOCK_EVENTS[selectedEvent].payload.acoustic_tokens && (
              <div className="mt-2 flex items-center gap-1.5 text-[9px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 w-fit font-medium">
                <Volume2 className="w-3 h-3 animate-pulse" />
                <span>Acoustic: {MOCK_EVENTS[selectedEvent].payload.acoustic_tokens}</span>
              </div>
            )}
            
            <div className="flex gap-2.5 mt-2.5 text-[9px] text-slate-500">
              <span>📍 {MOCK_EVENTS[selectedEvent].payload.location}</span>
              <span>🕐 {MOCK_EVENTS[selectedEvent].payload.timestamp}</span>
              <span>👥 {MOCK_EVENTS[selectedEvent].payload.people_count}</span>
            </div>
          </div>

          {/* Trigger button */}
          <button
            onClick={handleTriggerPreset}
            disabled={loading}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white text-xs font-semibold rounded-lg transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Processing Pipeline...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5" />
                <span>Trigger Edge Event</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* CUSTOM SIMULATION TAB CONTENT */}
      {activeTab === "custom" && (
        <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
          {/* Custom Input Type Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setCustomType("sensor")}
              className={`flex-1 py-1 flex items-center justify-center gap-1 rounded border text-[10px] font-semibold ${
                customType === "sensor"
                  ? "bg-indigo-950/40 text-indigo-400 border-indigo-500/50"
                  : "border-slate-800 text-slate-500 hover:text-slate-300"
              }`}
            >
              <FileText className="w-3 h-3" />
              Sensor Inputs
            </button>
            <button
              onClick={() => setCustomType("image")}
              className={`flex-1 py-1 flex items-center justify-center gap-1 rounded border text-[10px] font-semibold ${
                customType === "image"
                  ? "bg-indigo-950/40 text-indigo-400 border-indigo-500/50"
                  : "border-slate-800 text-slate-500 hover:text-slate-300"
              }`}
            >
              <ImageIcon className="w-3 h-3" />
              Image Path
            </button>
          </div>

          {/* Form fields */}
          <div className="space-y-2 text-xs">
            {/* Common Location */}
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">
                Incident Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Server Room B3"
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Custom SENSOR Fields */}
            {customType === "sensor" ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">
                      Door State
                    </label>
                    <select
                      value={doorState}
                      onChange={(e) => setDoorState(e.target.value)}
                      className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="normal">Normal</option>
                      <option value="forced">Forced Entry</option>
                      <option value="open">Left Open</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">
                      People Count
                    </label>
                    <input
                      type="number"
                      value={peopleCount}
                      onChange={(e) => setPeopleCount(parseInt(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 py-1.5">
                  <input
                    type="checkbox"
                    id="motion"
                    checked={motionDetected}
                    onChange={(e) => setMotionDetected(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="motion" className="text-[11px] text-slate-300 font-medium cursor-pointer">
                    Motion Detected at Zone
                  </label>
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">
                    Camera Feed Description
                  </label>
                  <textarea
                    value={cameraFeedSummary}
                    onChange={(e) => setCameraFeedSummary(e.target.value)}
                    placeholder="Describe what the camera sees..."
                    rows={2}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-300 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>
              </>
            ) : (
              /* Custom IMAGE Fields */
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">
                  Local Absolute Image Path
                </label>
                <input
                  type="text"
                  value={imagePath}
                  onChange={(e) => setImagePath(e.target.value)}
                  placeholder="e.g. C:/images/emergency_gate.jpg"
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[9px] text-slate-500 mt-1">
                  Provide the absolute path to an image file on your computer.
                </p>
              </div>
            )}

            {/* Custom Acoustic Token */}
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">
                Acoustic Anomalies (Audio Token)
              </label>
              <input
                type="text"
                value={acousticTokens}
                onChange={(e) => setAcousticTokens(e.target.value)}
                placeholder="e.g. [AUDIO: GLASS_BREAK]"
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-300 focus:outline-none focus:border-indigo-500 font-mono"
              />
              <p className="text-[9px] text-slate-500 mt-1">
                Prepend environmental anomalies to the prompt (e.g. `[AUDIO: SCREAM]`).
              </p>
            </div>
          </div>

          {/* Trigger button */}
          <button
            onClick={handleTriggerCustom}
            disabled={loading}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white text-xs font-semibold rounded-lg transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Reasoning with Gemma 4...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5" />
                <span>Simulate Custom Event</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Suppression/Error Messages */}
      {statusMessage && (
        <div className="mt-3 p-2 bg-slate-950/60 border border-slate-800 rounded-lg text-center">
          <p className="text-[10px] text-indigo-400 font-semibold leading-relaxed">
            {statusMessage}
          </p>
        </div>
      )}
    </div>
  );
}
