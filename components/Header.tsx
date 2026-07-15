"use client";

import { useEffect, useState } from "react";
import { getSystemStatus, type SystemStatus } from "@/lib/api";
import { Shield, Wifi, WifiOff, Database, FileCheck, Cpu } from "lucide-react";

export default function Header() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [online, setOnline] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const data = await getSystemStatus();
        setStatus(data);
        setOnline(data.status === "online");
      } catch {
        setOnline(false);
        setStatus(null);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="header-gradient px-6 py-3 flex items-center justify-between">
      {/* Left: Logo */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <Shield className="w-8 h-8 text-indigo-400" />
          <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-indigo-500 rounded-full animate-pulse" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-wide">
            <span className="text-indigo-400">VIGIL</span>
          </h1>
          <p className="text-[10px] text-slate-500 tracking-widest uppercase">
            Operator Dashboard v1.0
          </p>
        </div>
      </div>

      {/* Right: System Status */}
      <div className="flex items-center gap-4">
        {/* Subsystem indicators */}
        {status && (
          <div className="hidden md:flex items-center gap-3 mr-2">
            <SubsystemPill
              icon={<Cpu className="w-3 h-3" />}
              label="Gemma 4"
              status={status.subsystems.edge_ollama_gemma4}
            />
            <SubsystemPill
              icon={<Database className="w-3 h-3" />}
              label={`RAG (${status.subsystems.chromadb_document_count} docs)`}
              status={status.subsystems.rag_vector_db}
            />
            <SubsystemPill
              icon={<FileCheck className="w-3 h-3" />}
              label={`Vault (${status.subsystems.reports_count})`}
              status={status.subsystems.forensic_vault}
            />
          </div>
        )}

        {/* Main status badge */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
            online
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
              : "bg-red-500/10 text-red-400 border border-red-500/30"
          }`}
        >
          {online ? (
            <Wifi className="w-3.5 h-3.5" />
          ) : (
            <WifiOff className="w-3.5 h-3.5" />
          )}
          <span className={`status-dot ${online ? "online" : "offline"}`} />
          <span>{online ? "SYSTEM ONLINE" : "SYSTEM OFFLINE"}</span>
        </div>
      </div>
    </header>
  );
}

function SubsystemPill({
  icon,
  label,
  status,
}: {
  icon: React.ReactNode;
  label: string;
  status: string;
}) {
  const isReady = status === "ready" || status === "active";
  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium ${
        isReady
          ? "bg-slate-800/50 text-slate-400"
          : "bg-red-500/10 text-red-400"
      }`}
    >
      {icon}
      <span>{label}</span>
      <span className={`status-dot ${isReady ? "online" : "offline"}`} />
    </div>
  );
}
