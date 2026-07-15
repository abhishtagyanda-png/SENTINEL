"use client";

import { useEffect, useState } from "react";
import {
  getReportDetail,
  verifyReport,
  type ReportDetail,
  type VerifyResponse,
} from "@/lib/api";
import {
  Fingerprint,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  Loader2,
  Lock,
  FileKey2,
} from "lucide-react";

interface ForensicVaultProps {
  reportId: string | null;
}

export default function ForensicVault({ reportId }: ForensicVaultProps) {
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResponse | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!reportId) {
      setReport(null);
      setVerifyResult(null);
      return;
    }
    setLoading(true);
    setVerifyResult(null);
    getReportDetail(reportId)
      .then(setReport)
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
  }, [reportId]);

  const handleVerify = async () => {
    if (!reportId) return;
    setVerifying(true);
    try {
      const result = await verifyReport(reportId);
      setVerifyResult(result);
    } catch {
      setVerifyResult(null);
    } finally {
      setVerifying(false);
    }
  };

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // ── Empty / Loading States ───────────────────────────
  if (!reportId) {
    return (
      <div className="glass-card p-6 flex flex-col items-center justify-center text-center h-full">
        <Fingerprint className="w-12 h-12 text-slate-700 mb-3" />
        <h3 className="text-sm font-semibold text-slate-500">Forensic Vault</h3>
        <p className="text-xs text-slate-600 mt-1">
          Select an incident to view cryptographic integrity data.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="glass-card p-5 space-y-3">
        <div className="skeleton h-6 w-36" />
        <div className="skeleton h-20 w-full" />
        <div className="skeleton h-20 w-full" />
        <div className="skeleton h-10 w-full" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="glass-card p-5 flex items-center justify-center">
        <p className="text-sm text-slate-500">Failed to load forensic data.</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-5 space-y-4">
      {/* Title */}
      <div className="flex items-center gap-2">
        <Lock className="w-4 h-4 text-indigo-400" />
        <h2 className="text-sm font-semibold text-slate-200 tracking-wide uppercase">
          Forensic Vault
        </h2>
      </div>

      {/* SHA-256 Hash */}
      <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-lg">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <Fingerprint className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">
              SHA-256 File Hash
            </span>
          </div>
          <button
            onClick={() => handleCopy(report.sha256_hash, "sha")}
            className="text-slate-600 hover:text-slate-400 transition-colors"
          >
            {copiedField === "sha" ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
        <p className="mono-hash text-[11px] leading-relaxed break-all">
          {report.sha256_hash}
        </p>
      </div>

      {/* RSA Signature */}
      {report.signature_hex && (
        <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-lg">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <FileKey2 className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                RSA Signature (Hex)
              </span>
            </div>
            <button
              onClick={() => handleCopy(report.signature_hex, "rsa")}
              className="text-slate-600 hover:text-slate-400 transition-colors"
            >
              {copiedField === "rsa" ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          <p className="mono-hash text-[11px] leading-relaxed break-all max-h-24 overflow-y-auto">
            {report.signature_hex}
          </p>
        </div>
      )}

      {/* Verify Button */}
      <button
        onClick={handleVerify}
        disabled={verifying}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800/50 text-slate-300 text-sm font-medium rounded-lg border border-slate-700 transition-all duration-200 hover:border-indigo-500/50"
      >
        {verifying ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Verifying Integrity...</span>
          </>
        ) : (
          <>
            <ShieldCheck className="w-4 h-4" />
            <span>Verify Signature Integrity</span>
          </>
        )}
      </button>

      {/* Verify Result */}
      {verifyResult && (
        <div
          className={`p-4 rounded-xl animate-fade-in ${
            verifyResult.cryptographic_verification === "SUCCESS"
              ? "verify-success"
              : "verify-failed"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            {verifyResult.cryptographic_verification === "SUCCESS" ? (
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-red-400" />
            )}
            <span className="text-sm font-semibold">
              {verifyResult.cryptographic_verification === "SUCCESS"
                ? "Forensic Audit Passed"
                : "Cryptographic Error"}
            </span>
          </div>
          <p className="text-xs leading-relaxed opacity-80">
            {verifyResult.cryptographic_verification === "SUCCESS"
              ? "Signature is authentic and records have not been altered."
              : "Report contents do not match signature. Tampering detected!"}
          </p>
        </div>
      )}
    </div>
  );
}
