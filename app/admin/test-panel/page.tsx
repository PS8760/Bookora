"use client";

import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  Play, FlaskConical, Trash2, CheckCircle2, XCircle,
  Clock, RefreshCw, Video, User, Building2, ChevronDown, ChevronRight
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface TestResult {
  id: string;
  name: string;
  status: "PASS" | "FAIL" | "SKIP";
  message: string;
  detail?: string;
  duration: number;
}

interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  duration: number;
}

// ── Test definitions (for display only) ───────────────────────────────────────
const TEST_CASES = [
  { id: "TC-01", name: "Booking Creates Meeting Automatically",   category: "Core",     icon: <Video size={14} /> },
  { id: "TC-02", name: "Join Button Hidden Before Time",           category: "UI Logic", icon: <Clock size={14} /> },
  { id: "TC-03", name: "Join Button Visible at Meeting Time",      category: "UI Logic", icon: <Clock size={14} /> },
  { id: "TC-04", name: "Join Button Hidden After Meeting Ends",    category: "UI Logic", icon: <Clock size={14} /> },
  { id: "TC-05", name: "Organiser Dashboard Shows Virtual Meetings", category: "Dashboard", icon: <Building2 size={14} /> },
  { id: "TC-06", name: "Admin Dashboard Shows All Meeting Fields", category: "Dashboard", icon: <Building2 size={14} /> },
  { id: "TC-07", name: "Unauthorized User Access Denied",          category: "Security", icon: <User size={14} /> },
  { id: "TC-08", name: "Reminder Email Sent 30 Mins Before",      category: "Email",    icon: <FlaskConical size={14} /> },
  { id: "TC-09", name: "Reschedule Updates Meeting Time",          category: "Workflow", icon: <RefreshCw size={14} /> },
  { id: "TC-10", name: "Cancellation Disables Join Button",        category: "Workflow", icon: <XCircle size={14} /> },
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  Core:      { bg: "#E3F2FD", text: "#1565C0" },
  "UI Logic":{ bg: "#FFF3E0", text: "#E65100" },
  Dashboard: { bg: "#F3E5F5", text: "#6A1B9A" },
  Security:  { bg: "#FFEBEE", text: "#C62828" },
  Email:     { bg: "#E8F5E9", text: "#2E7D32" },
  Workflow:  { bg: "#FFFBE9", text: "#D4A017" },
};

const DEMO_USERS = [
  { role: "Customer",  name: "Priya Sharma",   email: "test.customer@bookora.dev",  password: "TestPass@123", color: "#0277BD", bg: "#E1F5FE" },
  { role: "Organiser", name: "Dr. Arjun Mehta",email: "test.organiser@bookora.dev", password: "TestPass@123", color: "#724A6A", bg: "#F5EDF4" },
];

const MOCK_BOOKINGS = [
  { label: "Future Booking", id: "test-booking-future",   time: "Tomorrow 8:30 PM", status: "CONFIRMED", platform: "MEET" },
  { label: "Active Booking", id: "test-booking-active",   time: "Started 5 mins ago", status: "CONFIRMED", platform: "MEET" },
  { label: "Past Booking",   id: "test-booking-past",     time: "Yesterday 10:00 AM", status: "CONFIRMED", platform: "MEET" },
  { label: "Reminder Test",  id: "test-booking-reminder", time: "Starts in ~30 mins",  status: "CONFIRMED", platform: "MEET" },
];

const EDGE_CASES = [
  "Customer books and immediately checks dashboard — Join hidden ✓",
  "Meeting starts exactly on time — Join appears within 10-min buffer ✓",
  "Meeting ends mid-session — Join disappears instantly ✓",
  "Organiser cancels after customer already has link — meeting invalidated ✓",
  "Two users book same virtual service — each gets unique meeting link ✓",
  "Reminder email sent only once per meeting (no duplicates) ✓",
  "Admin views meeting from deleted organiser account — graceful fallback ✓",
];

// ── Result Card ───────────────────────────────────────────────────────────────
function ResultCard({ result }: { result: TestResult }) {
  const [expanded, setExpanded] = useState(false);
  const tc = TEST_CASES.find((t) => t.id === result.id);
  const catCfg = CATEGORY_COLORS[tc?.category ?? ""] ?? { bg: "#ECEFF1", text: "#546E7A" };

  return (
    <div className={`rounded-2xl border-2 overflow-hidden transition-all ${
      result.status === "PASS" ? "border-[#A5D6A7] bg-[#F9FFF9]"
      : result.status === "FAIL" ? "border-[#EF9A9A] bg-[#FFF5F5]"
      : "border-[#E8E0D0] bg-white"
    }`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        {result.status === "PASS" ? (
          <CheckCircle2 size={18} className="text-[#2E7D32] flex-shrink-0" />
        ) : result.status === "FAIL" ? (
          <XCircle size={18} className="text-[#C62828] flex-shrink-0" />
        ) : (
          <Clock size={18} className="text-[#8A8AAA] flex-shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-bold text-[#8A8AAA]">{result.id}</span>
            <span className="text-sm font-semibold text-[#1A1A2E] truncate">{result.name}</span>
          </div>
          <p className="text-xs text-[#4A4A6A] mt-0.5 truncate">{result.message}</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] text-[#8A8AAA]">{result.duration}ms</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            result.status === "PASS" ? "bg-[#E8F5E9] text-[#2E7D32]"
            : result.status === "FAIL" ? "bg-[#FFEBEE] text-[#C62828]"
            : "bg-[#ECEFF1] text-[#546E7A]"
          }`}>{result.status}</span>
          {expanded ? <ChevronDown size={14} className="text-[#8A8AAA]" /> : <ChevronRight size={14} className="text-[#8A8AAA]" />}
        </div>
      </button>

      {expanded && result.detail && (
        <div className="px-4 pb-3 border-t border-dashed border-[#E8E0D0]">
          <p className="text-xs font-mono bg-[#FFFBE9] text-[#4A4A6A] rounded-lg p-3 mt-2 break-all">
            {result.detail}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function TestPanelPage() {
  const [seeded, setSeeded]         = useState(false);
  const [seedLog, setSeedLog]       = useState<string[]>([]);
  const [seedCreds, setSeedCreds]   = useState<any>(null);
  const [results, setResults]       = useState<TestResult[]>([]);
  const [summary, setSummary]       = useState<TestSummary | null>(null);
  const [running, setRunning]       = useState<string | null>(null); // "all" | "TC-0X" | null
  const [seeding, setSeeding]       = useState(false);
  const [cleaning, setCleaning]     = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const call = async (path: string, body: object) => {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  };

  const handleSeed = async () => {
    setSeeding(true);
    setError(null);
    try {
      const j = await call("/api/admin/test/seed", { action: "seed" });
      setSeedLog(j.results ?? []);
      setSeedCreds(j.credentials);
      setSeeded(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSeeding(false);
    }
  };

  const handleRunAll = async () => {
    setRunning("all");
    setError(null);
    setResults([]);
    setSummary(null);
    try {
      const j = await call("/api/admin/test/run", {});
      setResults(j.results ?? []);
      setSummary(j.summary);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRunning(null);
    }
  };

  const handleRunSingle = async (testId: string) => {
    setRunning(testId);
    setError(null);
    try {
      const j = await call("/api/admin/test/run", { testId });
      setResults((prev) => {
        const filtered = prev.filter((r) => r.id !== testId);
        return [...filtered, ...(j.results ?? [])].sort((a, b) => a.id.localeCompare(b.id));
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRunning(null);
    }
  };

  const handleCleanup = async () => {
    setCleaning(true);
    setError(null);
    try {
      await call("/api/admin/test/seed", { action: "cleanup" });
      setSeeded(false);
      setSeedLog([]);
      setSeedCreds(null);
      setResults([]);
      setSummary(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCleaning(false);
    }
  };

  const passRate = summary ? Math.round((summary.passed / summary.total) * 100) : 0;

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6 max-w-5xl">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#F5EDF4] flex items-center justify-center">
              <FlaskConical size={24} className="text-[#724A6A]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#1A1A2E]">Virtual Meeting Test Panel</h1>
              <p className="text-sm text-[#8A8AAA] mt-0.5">10 automated test cases · 3 roles · Full lifecycle coverage</p>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleSeed}
              disabled={seeding || cleaning}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E8F5E9] text-[#2E7D32] text-sm font-bold hover:bg-[#C8E6C9] transition-colors disabled:opacity-50"
            >
              {seeding ? <RefreshCw size={14} className="animate-spin" /> : <FlaskConical size={14} />}
              {seeding ? "Seeding…" : "Seed Test Data"}
            </button>
            <button
              onClick={handleRunAll}
              disabled={running !== null || !seeded}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#724A6A] text-white text-sm font-bold hover:bg-[#5A3A54] transition-colors disabled:opacity-50 shadow-[0_4px_12px_rgba(114,74,106,0.3)]"
            >
              {running === "all" ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
              {running === "all" ? "Running…" : "Run All Tests"}
            </button>
            <button
              onClick={handleCleanup}
              disabled={seeding || cleaning || running !== null}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FFEBEE] text-[#C62828] text-sm font-bold hover:bg-[#FFCDD2] transition-colors disabled:opacity-50"
            >
              {cleaning ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
              {cleaning ? "Cleaning…" : "Cleanup"}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-3 rounded-xl bg-[#FFEBEE] border border-[#EF9A9A] text-sm text-[#C62828] font-medium">
            ⚠ {error}
          </div>
        )}

        {/* Summary bar */}
        {summary && (
          <div className="bg-white rounded-2xl border border-[#E8E0D0] p-5 shadow-[0_2px_12px_rgba(114,74,106,0.06)]">
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-[#1A1A2E]">Test Run Summary</p>
              <span className="text-xs text-[#8A8AAA]">{summary.duration}ms total</span>
            </div>
            <div className="flex gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-[#2E7D32]">{summary.passed}</p>
                <p className="text-xs text-[#8A8AAA]">Passed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-[#C62828]">{summary.failed}</p>
                <p className="text-xs text-[#8A8AAA]">Failed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-[#724A6A]">{summary.total}</p>
                <p className="text-xs text-[#8A8AAA]">Total</p>
              </div>
              <div className="flex-1 flex items-center gap-3 pl-4 border-l border-[#E8E0D0]">
                <div className="flex-1 bg-[#E8E0D0] rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full transition-all"
                    style={{
                      width: `${passRate}%`,
                      background: passRate === 100 ? "#2E7D32" : passRate >= 70 ? "#D4A017" : "#C62828",
                    }}
                  />
                </div>
                <span className="text-sm font-bold" style={{ color: passRate === 100 ? "#2E7D32" : passRate >= 70 ? "#D4A017" : "#C62828" }}>
                  {passRate}%
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Test Cases Column */}
          <div className="lg:col-span-2 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-[#1A1A2E] text-sm">Test Cases</h2>
              {!seeded && <span className="text-[11px] text-[#E65100] bg-[#FFF3E0] px-2 py-0.5 rounded-full">Seed data first</span>}
            </div>

            {TEST_CASES.map((tc) => {
              const result = results.find((r) => r.id === tc.id);
              const catCfg = CATEGORY_COLORS[tc.category] ?? { bg: "#ECEFF1", text: "#546E7A" };
              const isRunning = running === tc.id;

              return (
                <div key={tc.id} className="bg-white rounded-2xl border border-[#E8E0D0] overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3">
                    {result ? (
                      result.status === "PASS"
                        ? <CheckCircle2 size={16} className="text-[#2E7D32] flex-shrink-0" />
                        : <XCircle size={16} className="text-[#C62828] flex-shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-[#D4B8CF] flex-shrink-0" />
                    )}

                    <span className="text-xs font-mono font-bold text-[#8A8AAA] flex-shrink-0">{tc.id}</span>

                    <span className="flex-1 text-sm font-medium text-[#1A1A2E] truncate">{tc.name}</span>

                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: catCfg.bg, color: catCfg.text }}>
                      {tc.category}
                    </span>

                    <button
                      onClick={() => handleRunSingle(tc.id)}
                      disabled={running !== null || !seeded}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#F5EDF4] text-[#724A6A] text-[11px] font-bold hover:bg-[#724A6A] hover:text-white transition-colors disabled:opacity-40 flex-shrink-0"
                    >
                      {isRunning ? <RefreshCw size={11} className="animate-spin" /> : <Play size={11} />}
                      {isRunning ? "…" : "Run"}
                    </button>
                  </div>

                  {result && (
                    <div className={`px-4 py-2 border-t text-xs ${
                      result.status === "PASS" ? "bg-[#F9FFF9] border-[#C8E6C9] text-[#2E7D32]"
                      : "bg-[#FFF5F5] border-[#FFCDD2] text-[#C62828]"
                    }`}>
                      <span className="font-semibold">{result.status === "PASS" ? "✓" : "✗"}</span> {result.message}
                      {result.detail && (
                        <p className="text-[10px] mt-1 opacity-75 font-mono break-all">{result.detail}</p>
                      )}
                      <span className="ml-2 opacity-50">{result.duration}ms</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-4">

            {/* Seed Log */}
            {seedLog.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#E8E0D0] p-4 shadow-[0_2px_8px_rgba(114,74,106,0.06)]">
                <h3 className="font-bold text-[#1A1A2E] text-sm mb-3">📦 Seed Log</h3>
                <div className="flex flex-col gap-1">
                  {seedLog.map((log, i) => (
                    <p key={i} className={`text-xs font-mono ${log.startsWith("✓") ? "text-[#2E7D32]" : "text-[#8A8AAA]"}`}>
                      {log}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Test Credentials */}
            {seedCreds && (
              <div className="bg-white rounded-2xl border border-[#E8E0D0] p-4 shadow-[0_2px_8px_rgba(114,74,106,0.06)]">
                <h3 className="font-bold text-[#1A1A2E] text-sm mb-3">🔑 Test Credentials</h3>
                {DEMO_USERS.map((u) => (
                  <div key={u.role} className="mb-3 p-3 rounded-xl" style={{ background: u.bg }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: u.bg, color: u.color, border: `1px solid ${u.color}40` }}>
                        {u.role}
                      </span>
                      <span className="text-xs font-semibold text-[#1A1A2E]">{u.name}</span>
                    </div>
                    <p className="text-[10px] font-mono text-[#4A4A6A]">📧 {u.email}</p>
                    <p className="text-[10px] font-mono text-[#4A4A6A]">🔒 {u.password}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Mock Bookings */}
            <div className="bg-white rounded-2xl border border-[#E8E0D0] p-4 shadow-[0_2px_8px_rgba(114,74,106,0.06)]">
              <h3 className="font-bold text-[#1A1A2E] text-sm mb-3">📅 Mock Bookings</h3>
              <div className="flex flex-col gap-2">
                {MOCK_BOOKINGS.map((b) => (
                  <div key={b.id} className="p-2 rounded-lg bg-[#FFFBE9] border border-[#E8E0D0]">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-[#1A1A2E]">{b.label}</p>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#E8F5E9] text-[#2E7D32]">{b.platform}</span>
                    </div>
                    <p className="text-[10px] text-[#8A8AAA] font-mono mt-0.5">{b.time}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Edge Cases */}
            <div className="bg-white rounded-2xl border border-[#E8E0D0] p-4 shadow-[0_2px_8px_rgba(114,74,106,0.06)]">
              <h3 className="font-bold text-[#1A1A2E] text-sm mb-3">⚡ Edge Cases Covered</h3>
              <div className="flex flex-col gap-1.5">
                {EDGE_CASES.map((e, i) => (
                  <p key={i} className="text-[11px] text-[#4A4A6A] leading-snug">{e}</p>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
