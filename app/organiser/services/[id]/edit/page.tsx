"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import OrganiserLayout from "@/components/organiser/OrganiserLayout";

type Tab = "schedule" | "questions" | "options" | "misc";

interface Question {
  id: string;
  text: string;
  type: "TEXT" | "MULTIPLE_CHOICE" | "BOOLEAN" | "NUMBER";
  required: boolean;
  order: number;
  options: { id: string; label: string; order: number }[];
}

const QUESTION_TYPES = [
  { value: "TEXT",            label: "Single line text" },
  { value: "MULTIPLE_CHOICE", label: "Multiple choice" },
  { value: "BOOLEAN",         label: "Yes / No" },
  { value: "NUMBER",          label: "Number" },
];

export default function EditServicePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const serviceId = params.id;

  const [activeTab, setActiveTab] = useState<Tab>("schedule");
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState(false);

  // ── Main form state ────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    title: "", description: "", category: "", icon: "",
    durationMinutes: "30", venue: "",
    type: "USER_BASED",
    assignmentMode: "AUTOMATIC",
    manualConfirm: false,
    advancePayment: false, paymentAmount: "", currency: "INR",
    maxPerSlot: "1",
    isPublished: false,
    introMessage: "",
    confirmMessage: "",
  });

  // ── Questions state ────────────────────────────────────────────────────────
  const [questions, setQuestions]         = useState<Question[]>([]);
  const [qLoading, setQLoading]           = useState(false);
  const [addingQ, setAddingQ]             = useState(false);
  const [newQ, setNewQ]                   = useState({ text: "", type: "TEXT", required: false, options: "" });
  const [deletingQId, setDeletingQId]     = useState<string | null>(null);

  // ── Schedule state (UI mockup for Odoo wireframe) ──
  const [scheduleType, setScheduleType]   = useState<"WEEKLY" | "FLEXIBLE">("WEEKLY");

  // ── Load service ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!serviceId) return;
    setLoading(true);
    fetch(`/api/appointments/${serviceId}`)
      .then((r) => r.json())
      .then((j) => {
        if (!j?.data) { setError(j?.error?.message ?? "Failed to load"); return; }
        const s = j.data;
        setForm({
          title: s.title ?? "", description: s.description ?? "",
          category: s.category ?? "", icon: s.icon ?? "",
          durationMinutes: String(s.durationMinutes ?? 30),
          venue: s.venue ?? "", type: s.type ?? "USER_BASED",
          assignmentMode: s.assignmentMode ?? "AUTOMATIC",
          manualConfirm: Boolean(s.manualConfirm),
          advancePayment: Boolean(s.advancePayment),
          paymentAmount: s.paymentAmount ?? "", currency: s.currency ?? "INR",
          maxPerSlot: String(s.maxPerSlot ?? 1),
          isPublished: Boolean(s.isPublished),
          introMessage: s.introMessage ?? "",
          confirmMessage: s.confirmMessage ?? "",
        });
        setQuestions(s.questions ?? []);
      })
      .catch(() => setError("Failed to load service."))
      .finally(() => setLoading(false));
  }, [serviceId]);

  // ── Save main form ─────────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError("Title is required."); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch(`/api/appointments/${serviceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(), description: form.description.trim() || null,
          category: form.category.trim() || null, icon: form.icon.trim() || null,
          durationMinutes: Number(form.durationMinutes || "30"),
          venue: form.venue.trim() || null, type: form.type,
          assignmentMode: form.assignmentMode,
          manualConfirm: form.manualConfirm,
          advancePayment: form.advancePayment,
          paymentAmount: form.advancePayment ? Number(form.paymentAmount || "0") : null,
          currency: form.currency,
          maxPerSlot: Number(form.maxPerSlot || "1"),
          introMessage: form.introMessage.trim() || null,
          confirmMessage: form.confirmMessage.trim() || null,
        }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) { setError(j?.error?.message ?? "Failed to save."); return; }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch { setError("Network error."); }
    finally { setSaving(false); }
  };

  // ── Publish / Unpublish ────────────────────────────────────────────────────
  const handlePublish = async () => {
    const method = form.isPublished ? "DELETE" : "POST";
    const res = await fetch(`/api/appointments/${serviceId}/publish`, { method });
    if (res.ok) setForm((f) => ({ ...f, isPublished: !f.isPublished }));
  };

  // ── Add question ───────────────────────────────────────────────────────────
  const handleAddQuestion = async () => {
    if (!newQ.text.trim()) return;
    setQLoading(true);
    const options = newQ.type === "MULTIPLE_CHOICE"
      ? newQ.options.split(",").map((o) => o.trim()).filter(Boolean)
      : undefined;
    const res = await fetch(`/api/appointments/${serviceId}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: newQ.text.trim(), type: newQ.type, required: newQ.required, options }),
    });
    const j = await res.json();
    if (res.ok && j.data) {
      setQuestions((prev) => [...prev, j.data]);
      setNewQ({ text: "", type: "TEXT", required: false, options: "" });
      setAddingQ(false);
    }
    setQLoading(false);
  };

  // ── Delete question ────────────────────────────────────────────────────────
  const handleDeleteQuestion = async (questionId: string) => {
    setDeletingQId(questionId);
    const res = await fetch(`/api/appointments/${serviceId}/questions/${questionId}`, { method: "DELETE" });
    if (res.ok) setQuestions((prev) => prev.filter((q) => q.id !== questionId));
    setDeletingQId(null);
  };

  const field = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const check = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.checked }));

  const TABS: { key: Tab; label: string; emoji: string }[] = [
    { key: "schedule",  label: "Schedule",  emoji: "📅" },
    { key: "questions", label: "Questions", emoji: "❓" },
    { key: "options",   label: "Options",   emoji: "⚙️" },
    { key: "misc",      label: "Misc",      emoji: "✏️" },
  ];

  if (loading) return (
    <OrganiserLayout>
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-2 border-[#724A6A] border-t-transparent animate-spin" />
      </div>
    </OrganiserLayout>
  );

  return (
    <OrganiserLayout>
      <div className="max-w-4xl">

        {/* ── Top action bar ── */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Link href="/organiser/services" className="btn-outline text-sm py-2 px-4">← Back</Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-[#1A1A2E] truncate">{form.title || "Edit Service"}</h1>
            <p className="text-xs text-[#8A8AAA] mt-0.5">Configure your service, questions, and booking rules</p>
          </div>
          <Link href={`/book/${serviceId}`} target="_blank"
            className="px-4 py-2 text-sm font-semibold border border-[#E8E0D0] rounded-xl hover:bg-[#FFFBE9] text-[#4A4A6A] transition-colors">
            Preview ↗
          </Link>
          <button onClick={handlePublish}
            className={`px-5 py-2 text-sm font-bold rounded-xl transition-all shadow-sm ${
              form.isPublished
                ? "bg-[#E8F5E9] text-[#2E7D32] border border-[#A5D6A7] hover:bg-[#FFEBEE] hover:text-[#C62828] hover:border-[#EF9A9A]"
                : "bg-[#724A6A] text-white hover:bg-[#5A3854] shadow-[0_4px_12px_rgba(114,74,106,0.3)]"
            }`}>
            {form.isPublished ? "✓ Published" : "Publish"}
          </button>
        </div>

        {/* ── Basic info always visible ── */}
        <div className="bg-white rounded-2xl border border-[#E8E0D0] p-6 mb-4 shadow-[0_2px_12px_rgba(114,74,106,0.06)]">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
            <div className="sm:col-span-2 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#8A8AAA] uppercase tracking-wide mb-1">Appointment Title</label>
                <input className="input-base text-xl font-bold" value={form.title} onChange={field("title")} placeholder="e.g. Dental Care" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#8A8AAA] uppercase tracking-wide mb-1">Duration (min)</label>
                  <input type="number" min={5} step={5} className="input-base" value={form.durationMinutes} onChange={field("durationMinutes")} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#8A8AAA] uppercase tracking-wide mb-1">Location</label>
                  <input className="input-base" value={form.venue} onChange={field("venue")} placeholder="Doctor's Office" />
                </div>
              </div>
            </div>
            {/* Icon / image placeholder */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-full h-24 rounded-xl border-2 border-dashed border-[#E8E0D0] bg-[#FFFBE9] flex flex-col items-center justify-center gap-1 relative overflow-hidden group">
                <input 
                  type="file" 
                  accept="image/*" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                  title="Upload Image"
                  onChange={async (e) => {
                    if (e.target.files && e.target.files[0]) {
                      const file = e.target.files[0];
                      const formData = new FormData();
                      formData.append("file", file);
                      try {
                        const res = await fetch("/api/upload", { method: "POST", body: formData });
                        const data = await res.json();
                        if (data.url) setForm((f) => ({ ...f, icon: data.url }));
                      } catch (err) {
                        console.error("Upload failed", err);
                      }
                    }
                  }} 
                />
                {form.icon?.startsWith('/') || form.icon?.startsWith('http') ? (
                  <img src={form.icon} alt="Icon" className="w-full h-full object-cover" />
                ) : form.icon ? (
                  <span className="text-5xl">{form.icon}</span>
                ) : (
                  <span className="text-xs text-[#8A8AAA] group-hover:text-[#724A6A] transition-colors">Upload Picture</span>
                )}
              </div>
              <input className="input-base text-sm text-center" value={form.icon} onChange={field("icon")} placeholder="Emoji e.g. 🦷" />
            </div>
          </div>

          {/* Book by: User/Resources + Assignment */}
          <div className="mt-4 pt-4 border-t border-[#F0EAD8] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <p className="text-xs font-semibold text-[#8A8AAA] uppercase tracking-wide mb-2">Book</p>
              <div className="flex gap-4 mb-4">
                {[["USER_BASED", "User"], ["RESOURCE_BASED", "Resources"]].map(([val, lbl]) => (
                  <label key={val} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input type="radio" name="type" value={val} checked={form.type === val}
                      onChange={() => setForm((f) => ({ ...f, type: val }))}
                      className="accent-[#724A6A]" />
                    {lbl}
                  </label>
                ))}
              </div>
              
              <div className="flex items-center gap-4">
                <span className="text-xs font-semibold text-[#8A8AAA] uppercase tracking-wide w-10">{form.type === 'USER_BASED' ? 'user' : 'Resources'}</span>
                {form.type === 'USER_BASED' ? (
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2"><div className="w-6 h-6 border border-[#1A1A2E] text-[10px] flex items-center justify-center font-bold">A1</div><span className="text-sm font-medium">User 1</span></div>
                    <div className="flex items-center gap-2"><div className="w-6 h-6 border border-[#1A1A2E] text-[10px] flex items-center justify-center font-bold">A2</div><span className="text-sm font-medium">User 2</span></div>
                  </div>
                ) : (
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2"><div className="w-6 h-6 border border-[#1A1A2E] text-[10px] flex items-center justify-center font-bold">R1</div><span className="text-sm font-medium">Resource 1</span></div>
                    <div className="flex items-center gap-2"><div className="w-6 h-6 border border-[#1A1A2E] text-[10px] flex items-center justify-center font-bold">R2</div><span className="text-sm font-medium">Resource 2</span></div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex flex-col justify-between">
              <div>
                <p className="text-xs font-semibold text-[#8A8AAA] uppercase tracking-wide mb-2">Assignment</p>
                <div className="flex gap-4 mb-4">
                  {[["AUTOMATIC", "Automatically"], ["MANUAL", "By visitor"]].map(([val, lbl]) => (
                    <label key={val} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input type="radio" name="assignment" value={val} checked={form.assignmentMode === val}
                        onChange={() => setForm((f) => ({ ...f, assignmentMode: val }))}
                        className="accent-[#724A6A]" />
                      {lbl}
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <span className="text-xs font-semibold text-[#8A8AAA] uppercase tracking-wide mr-2">Manage capacity</span>
                  <input type="checkbox" className="accent-[#724A6A]" checked={Number(form.maxPerSlot) > 1}
                    onChange={(e) => setForm((f) => ({ ...f, maxPerSlot: e.target.checked ? "10" : "1" }))} />
                  Allow
                  <input type="number" min={1} className="w-8 border-b-2 border-[#1A1A2E] bg-transparent text-center outline-none"
                    value={form.maxPerSlot} onChange={field("maxPerSlot")} />
                  Simultaneous Appointment(s) per user
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="bg-white rounded-2xl border border-[#E8E0D0] shadow-[0_2px_12px_rgba(114,74,106,0.06)] overflow-hidden">
          <div className="flex border-b border-[#E8E0D0] bg-[#FFFBE9]/50 px-2 pt-2 gap-1">
            {TABS.map(({ key, label, emoji }) => (
              <button key={key} onClick={() => setActiveTab(key)}
                className={`px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-all border-b-2 ${
                  activeTab === key
                    ? "text-[#724A6A] border-[#724A6A] bg-white"
                    : "text-[#8A8AAA] border-transparent hover:text-[#4A4A6A]"
                }`}>
                {emoji} {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSave}>
            <div className="p-6">

              {/* ── SCHEDULE TAB ── */}
              {activeTab === "schedule" && (
                <div className="overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xl font-bold italic text-[#724A6A]">schedule = {scheduleType.toLowerCase()}</span>
                  </div>
                  
                  {scheduleType === "WEEKLY" ? (
                    <div className="border border-[#E8E0D0] rounded-lg">
                      <div className="grid grid-cols-3 bg-[#FFFBE9] border-b border-[#E8E0D0] px-4 py-2 text-xs font-semibold text-[#8A8AAA] uppercase tracking-wide">
                        <div>Every</div><div>From</div><div>To</div>
                      </div>
                      <div className="divide-y divide-[#F0EAD8]">
                        {[
                          { d: "Monday", f: "9:00", t: "12:00" }, { d: "Monday", f: "14:00", t: "17:00" },
                          { d: "Tuesday", f: "9:00", t: "12:00" }, { d: "Tuesday", f: "14:00", t: "17:00" },
                          { d: "Wednesday", f: "9:00", t: "12:00" }, { d: "Wednesday", f: "14:00", t: "17:00" },
                          { d: "Thursday", f: "9:00", t: "12:00" }, { d: "Thursday", f: "14:00", t: "17:00" },
                          { d: "Friday", f: "9:00", t: "12:00" }, { d: "Friday", f: "14:00", t: "17:00" }
                        ].map((s, i) => (
                          <div key={i} className="grid grid-cols-[1fr_1fr_1fr_30px] gap-4 px-4 py-2 items-center text-sm font-medium text-[#1A1A2E]">
                            <div>{s.d}</div>
                            <div className="flex items-center gap-4">{s.f} <span className="text-[#8A8AAA]">→</span></div>
                            <div>{s.t}</div>
                            <button className="text-[#8A8AAA] hover:text-[#C62828] p-1"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></button>
                          </div>
                        ))}
                      </div>
                      <button className="w-full text-left px-4 py-3 text-sm font-medium text-[#724A6A] hover:bg-[#F5EDF4] border-t border-[#E8E0D0]">Add a Line</button>
                    </div>
                  ) : (
                    <div className="border border-[#E8E0D0] rounded-lg">
                      <div className="bg-[#FFFBE9] border-b border-[#E8E0D0] px-4 py-2 text-xs font-semibold text-[#8A8AAA] uppercase tracking-wide">
                        Slot
                      </div>
                      <div className="divide-y divide-[#F0EAD8]">
                        {[
                          { f: "Dec 12, 11:00 AM", t: "Dec 15, 12:00 PM" },
                          { f: "Dec 01, 11:00 AM", t: "Dec 01, 06:00 PM" }
                        ].map((s, i) => (
                          <div key={i} className="flex justify-between items-center px-4 py-3 text-sm font-medium text-[#1A1A2E]">
                            <div className="flex items-center gap-6">
                              <span>{s.f}</span><span className="text-[#8A8AAA]">→</span><span>{s.t}</span>
                            </div>
                            <button className="text-[#8A8AAA] hover:text-[#C62828] p-1"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></button>
                          </div>
                        ))}
                      </div>
                      <button className="w-full text-left px-4 py-3 text-sm font-medium text-[#724A6A] hover:bg-[#F5EDF4] border-t border-[#E8E0D0]">Add a Line</button>
                    </div>
                  )}
                </div>
              )}

              {/* ── QUESTIONS TAB ── */}
              {activeTab === "questions" && (
                <div>
                  <div className="border border-[#E8E0D0] rounded-xl overflow-hidden mb-4">
                    <div className="grid grid-cols-[1.5fr_1fr_1fr_80px_40px] gap-3 px-4 py-3 bg-[#FFFBE9] border-b border-[#E8E0D0] text-xs font-semibold text-[#8A8AAA] uppercase tracking-wide">
                      <span>Question</span><span>Answer type</span><span>Answer</span><span className="text-center">mandatory</span><span />
                    </div>
                    <div className="divide-y divide-[#F0EAD8]">
                      {questions.map((q) => (
                        <div key={q.id} className="grid grid-cols-[1.5fr_1fr_1fr_80px_40px] gap-3 px-4 py-3 items-center hover:bg-[#F9F5F0]">
                          <span className="text-sm font-medium text-[#1A1A2E] truncate">{q.text}</span>
                          <span className="text-xs text-[#4A4A6A]">{QUESTION_TYPES.find((t) => t.value === q.type)?.label ?? q.type}</span>
                          <span className="text-xs text-[#4A4A6A] italic truncate">{q.type === 'NUMBER' ? '9876543210' : 'Sample Answer'}</span>
                          <div className="flex justify-center">
                            <input type="checkbox" checked={q.required} readOnly className="accent-[#724A6A] w-4 h-4 cursor-not-allowed opacity-70" />
                          </div>
                          <button type="button" onClick={() => handleDeleteQuestion(q.id)} disabled={deletingQId === q.id} className="w-6 h-6 ml-auto rounded hover:bg-[#FFEBEE] flex items-center justify-center text-[#C62828] transition-colors disabled:opacity-40">
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    {!addingQ ? (
                      <button type="button" onClick={() => setAddingQ(true)} className="w-full text-left px-4 py-3 text-sm font-medium text-[#724A6A] hover:bg-[#F5EDF4] transition-colors border-t border-[#E8E0D0]">
                        Add a question
                      </button>
                    ) : (
                      <div className="p-0 bg-white border-t border-[#E8E0D0]">
                        <div className="flex overflow-x-auto border-b border-[#E8E0D0] bg-[#FFFBE9]">
                          {[
                            { val: "TEXT", label: "Single line text" },
                            { val: "TEXT", label: "Multi-line text" },
                            { val: "NUMBER", label: "Phone Number" },
                            { val: "MULTIPLE_CHOICE", label: "Radio(One Answer)" },
                            { val: "MULTIPLE_CHOICE", label: "Checkboxes(Multiple Answers)" }
                          ].map(t => (
                            <button key={t.label} type="button" onClick={() => setNewQ(q => ({...q, type: t.val as any}))} 
                              className={`px-4 py-2 text-xs font-semibold whitespace-nowrap transition-colors border-b-2 ${newQ.type === t.val ? 'border-[#724A6A] text-[#1A1A2E] bg-white' : 'border-transparent text-[#8A8AAA] hover:text-[#4A4A6A]'}`}>
                              {t.label}
                            </button>
                          ))}
                        </div>
                        <div className="p-4 space-y-4">
                          <div>
                            <label className="block text-xs font-semibold text-[#724A6A] mb-1">Question</label>
                            <input autoFocus className="w-full border-b-2 border-[#1A1A2E] bg-transparent text-sm py-1 font-medium outline-none text-[#1A1A2E] placeholder:text-[#8A8AAA]" placeholder="Anything else we should know ?" value={newQ.text} onChange={e => setNewQ(q => ({...q, text: e.target.value}))} />
                          </div>
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 text-sm font-medium text-[#1A1A2E] cursor-pointer">
                              Mandatory Answer
                              <input type="checkbox" className="accent-[#724A6A] w-4 h-4 ml-2" checked={newQ.required} onChange={e => setNewQ(q => ({...q, required: e.target.checked}))} />
                            </label>
                          </div>
                          <div className="flex gap-2 pt-2">
                            <button type="button" onClick={handleAddQuestion} disabled={!newQ.text.trim() || qLoading} className="px-5 py-2 text-xs font-semibold bg-[#724A6A] text-white rounded hover:bg-[#5A3854] disabled:opacity-50">Save</button>
                            <button type="button" onClick={() => setAddingQ(false)} className="px-5 py-2 text-xs font-semibold text-[#4A4A6A] hover:bg-[#F0EAD8] rounded">Cancel</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── OPTIONS TAB ── */}
              {activeTab === "options" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <label className="flex items-center gap-3 text-sm font-semibold text-[#1A1A2E] cursor-pointer mb-2">
                        <input type="checkbox" className="accent-[#724A6A] w-4 h-4" checked={form.manualConfirm} onChange={check("manualConfirm")} />
                        Manual confirmation
                      </label>
                      <div className="pl-7">
                        <span className="text-sm text-[#4A4A6A]">Upto</span>
                        <input type="text" className="w-12 border-b-2 border-[#1A1A2E] bg-transparent text-center text-sm font-medium mx-2 outline-none text-[#1A1A2E]" value="50%" readOnly />
                        <span className="text-sm text-[#4A4A6A]">of capacity</span>
                      </div>
                    </div>

                    <div>
                      <label className="flex items-center gap-3 text-sm font-semibold text-[#1A1A2E] cursor-pointer mb-2">
                        <input type="checkbox" className="accent-[#724A6A] w-4 h-4" checked={form.advancePayment} onChange={check("advancePayment")} />
                        Paid Booking
                      </label>
                      <div className="pl-7 flex items-center">
                        <input type="text" className="border-b-2 border-[#724A6A] bg-transparent text-sm font-medium pb-1 outline-none text-[#724A6A] w-[240px]" placeholder="Booking Fees (Rs 200 Per booking)" value={form.paymentAmount ? `Booking Fees (Rs ${form.paymentAmount} Per booking)` : "Booking Fees (Rs 200 Per booking)"} onChange={(e) => setForm(f => ({...f, paymentAmount: e.target.value.replace(/[^0-9]/g, '')}))} />
                      </div>
                    </div>

                    <div className="pt-2">
                      <p className="text-sm font-semibold text-[#1A1A2E] mb-3">Schedule</p>
                      <div className="flex gap-6 pl-2">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="radio" name="scheduleType" className="accent-[#724A6A] w-4 h-4" checked={scheduleType === "WEEKLY"} onChange={() => setScheduleType("WEEKLY")} />
                          weekly
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="radio" name="scheduleType" className="accent-[#724A6A] w-4 h-4" checked={scheduleType === "FLEXIBLE"} onChange={() => setScheduleType("FLEXIBLE")} />
                          flexible
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="flex items-center justify-between max-w-[300px]">
                      <span className="text-sm font-semibold text-[#1A1A2E]">Create Slot</span>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-semibold text-[#724A6A]">00:{String(form.durationMinutes).padStart(2, '0')}</span>
                        <span className="text-[#8A8AAA]">hours</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between max-w-[360px]">
                      <span className="text-sm font-semibold text-[#1A1A2E]">Cancellation</span>
                      <div className="flex items-center gap-2 text-[11px] font-medium text-[#4A4A6A]">
                        up to
                        <input type="text" className="w-12 border-b-2 border-[#1A1A2E] bg-transparent text-center outline-none text-[#1A1A2E]" defaultValue="01:00" />
                        hour(s) before the booking
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── MISC TAB ── */}
              {activeTab === "misc" && (
                <div className="flex flex-col gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">Introduction Page Message</label>
                    <p className="text-xs text-[#8A8AAA] mb-2">Shown to customers before they pick a slot.</p>
                    <textarea rows={4} className="input-base resize-none" value={form.introMessage} onChange={field("introMessage")}
                      placeholder="Schedule your visit today and experience expert care brought right to your doorstep." />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">Confirmation Page Message</label>
                    <p className="text-xs text-[#8A8AAA] mb-2">Shown after booking is confirmed.</p>
                    <textarea rows={4} className="input-base resize-none" value={form.confirmMessage} onChange={field("confirmMessage")}
                      placeholder="Thank you for your trust, we look forward to meeting you." />
                  </div>
                </div>
              )}
            </div>

            {/* ── Save bar ── */}
            <div className="flex items-center gap-3 px-6 py-4 border-t border-[#E8E0D0] bg-[#FFFBE9]/40">
              {error && <p className="text-sm text-[#C62828] flex-1">{error}</p>}
              {success && <p className="text-sm text-[#2E7D32] flex-1">✓ Saved successfully</p>}
              {!error && !success && <div className="flex-1" />}
              <button type="submit" disabled={saving}
                className="btn-primary py-2.5 px-8 rounded-xl disabled:opacity-60 shadow-[0_4px_12px_rgba(114,74,106,0.2)]">
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </OrganiserLayout>
  );
}
