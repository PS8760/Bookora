"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import OrganiserLayout from "@/components/organiser/OrganiserLayout";

export default function NewServicePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", duration: "30", type: "USER_BASED",
    schedule: "WEEKLY", assignment: "AUTOMATIC", maxCapacity: "1",
    manualConfirm: false, advancePayment: false, paymentAmount: "",
    manualConfirm: false, advancePayment: false, paymentAmount: "",
    deliveryMode: "PHYSICAL",
    virtualPlatform: "MEET",
    physicalAddress: "",
    physicalRoom: "",
    mapsLink: "",
    virtualPrice: "",
    physicalPrice: "",
    virtualDuration: "",
    physicalDuration: "",
  });
  const [step, setStep] = useState(0);
  const STEPS = ["Basic Info", "Schedule", "Booking Rules", "Questions"];

  const savingRef = useRef(false);

  const handleCreate = async (publish: boolean) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          durationMinutes: Number(form.duration),
          maxPerSlot: Number(form.maxCapacity),
          paymentAmount: form.advancePayment && form.paymentAmount ? Number(form.paymentAmount) : null,
          isPublished: publish,
          deliveryMode: form.deliveryMode,
          virtualPlatform: form.virtualPlatform,
          physicalAddress: form.physicalAddress,
          physicalRoom: form.physicalRoom,
          mapsLink: form.mapsLink,
          virtualPrice: form.virtualPrice ? Number(form.virtualPrice) : null,
          physicalPrice: form.physicalPrice ? Number(form.physicalPrice) : null,
          virtualDuration: form.virtualDuration ? Number(form.virtualDuration) : null,
          physicalDuration: form.physicalDuration ? Number(form.physicalDuration) : null,
        }),
      });
      if (res.ok) {
        router.push("/organiser/services");
        return; // Prevent resetting saving state while redirecting
      } else {
        const json = await res.json();
        alert(json.error?.message || "Failed to create service.");
      }
    } catch (e) {
      alert("Error creating service.");
    }
    savingRef.current = false;
    setSaving(false);
  };

  return (
    <OrganiserLayout>
      <div className="max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => history.back()} className="p-2 rounded-xl hover:bg-[#F5EDF4] text-[#4A4A6A] transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <h1 className="text-2xl font-bold text-[#1A1A2E]">Create New Service</h1>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <button
                onClick={() => setStep(i)}
                className={`flex items-center gap-2 text-sm font-medium transition-colors ${i <= step ? "text-[#724A6A]" : "text-[#8A8AAA]"}`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  i < step ? "bg-[#724A6A] text-white" :
                  i === step ? "bg-[#724A6A] text-white ring-4 ring-[#724A6A]/20" :
                  "bg-[#E8E0D0] text-[#8A8AAA]"
                }`}>
                  {i < step ? "✓" : i + 1}
                </div>
                <span className="hidden sm:block">{s}</span>
              </button>
              {i < STEPS.length - 1 && <div className={`h-0.5 w-6 sm:w-10 rounded ${i < step ? "bg-[#724A6A]" : "bg-[#E8E0D0]"}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-[#E8E0D0] p-6 shadow-[0_2px_12px_rgba(114,74,106,0.06)]">
          {/* Step 0: Basic Info */}
          {step === 0 && (
            <div className="flex flex-col gap-4">
              <h2 className="font-semibold text-[#1A1A2E] text-lg mb-2">Basic Information</h2>
              <div>
                <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">Service Title *</label>
                <input className="input-base" placeholder="e.g. Dental Checkup" value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">Description</label>
                <textarea className="input-base resize-none" rows={3} placeholder="Describe your service..."
                  value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">Duration (minutes) *</label>
                  <select className="input-base cursor-pointer" value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: e.target.value })}>
                    {["15","30","45","60","90","120"].map(d => <option key={d} value={d}>{d} min</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">Venue / Location</label>
                  <input className="input-base" placeholder="e.g. Room 101" value={form.venue}
                    onChange={(e) => setForm({ ...form, venue: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1A1A2E] mb-2">Appointment Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: "USER_BASED", label: "User Based", desc: "Assign to a team member", icon: "👤" },
                    { value: "RESOURCE_BASED", label: "Resource Based", desc: "Assign to a resource (room, equipment)", icon: "🏢" },
                  ].map((t) => (
                    <button key={t.value} type="button" onClick={() => setForm({ ...form, type: t.value })}
                      className={`flex flex-col items-start p-3 rounded-xl border-2 transition-all text-left ${
                        form.type === t.value ? "border-[#724A6A] bg-[#F5EDF4]" : "border-[#E8E0D0] bg-[#FFFBE9] hover:border-[#D4B8CF]"
                      }`}>
                      <span className="text-xl mb-1">{t.icon}</span>
                      <span className="text-sm font-semibold text-[#1A1A2E]">{t.label}</span>
                      <span className="text-xs text-[#8A8AAA]">{t.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Schedule */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <h2 className="font-semibold text-[#1A1A2E] text-lg mb-2">Schedule Configuration</h2>
              <div>
                <label className="block text-sm font-semibold text-[#1A1A2E] mb-2">Schedule Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: "WEEKLY", label: "Weekly Recurring", desc: "Same hours every week", icon: "🔄" },
                    { value: "FLEXIBLE", label: "Flexible Windows", desc: "Custom date/time windows", icon: "📅" },
                  ].map((t) => (
                    <button key={t.value} type="button" onClick={() => setForm({ ...form, schedule: t.value })}
                      className={`flex flex-col items-start p-3 rounded-xl border-2 transition-all text-left ${
                        form.schedule === t.value ? "border-[#724A6A] bg-[#F5EDF4]" : "border-[#E8E0D0] bg-[#FFFBE9] hover:border-[#D4B8CF]"
                      }`}>
                      <span className="text-xl mb-1">{t.icon}</span>
                      <span className="text-sm font-semibold text-[#1A1A2E]">{t.label}</span>
                      <span className="text-xs text-[#8A8AAA]">{t.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {form.schedule === "WEEKLY" && (
                <div>
                  <label className="block text-sm font-semibold text-[#1A1A2E] mb-2">Working Hours</label>
                  <div className="space-y-2">
                    {["Monday","Tuesday","Wednesday","Thursday","Friday"].map((day) => (
                      <div key={day} className="flex items-center gap-3 p-3 bg-[#FFFBE9] rounded-xl border border-[#E8E0D0]">
                        <input type="checkbox" defaultChecked className="accent-[#724A6A]" />
                        <span className="text-sm font-medium text-[#1A1A2E] w-24">{day}</span>
                        <input type="time" defaultValue="09:00" className="input-base py-1.5 text-sm w-28" />
                        <span className="text-[#8A8AAA] text-sm">to</span>
                        <input type="time" defaultValue="17:00" className="input-base py-1.5 text-sm w-28" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Booking Rules */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <h2 className="font-semibold text-[#1A1A2E] text-lg mb-2">Booking Rules</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">Max Capacity per Slot</label>
                  <input type="number" min="1" max="100" className="input-base" value={form.maxCapacity}
                    onChange={(e) => setForm({ ...form, maxCapacity: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">Resource Assignment</label>
                  <select className="input-base cursor-pointer" value={form.assignment}
                    onChange={(e) => setForm({ ...form, assignment: e.target.value })}>
                    <option value="AUTOMATIC">Automatic</option>
                    <option value="MANUAL">Manual (by visitor)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  { key: "manualConfirm", label: "Manual Confirmation", desc: "You must approve each booking before it's confirmed" },
                  { key: "advancePayment", label: "Require Advance Payment", desc: "Customers must pay before the booking is confirmed" },
                ].map((toggle) => (
                  <div key={toggle.key} className="flex items-center justify-between p-4 bg-[#FFFBE9] rounded-xl border border-[#E8E0D0]">
                    <div>
                      <p className="text-sm font-semibold text-[#1A1A2E]">{toggle.label}</p>
                      <p className="text-xs text-[#8A8AAA] mt-0.5">{toggle.desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, [toggle.key]: !form[toggle.key as keyof typeof form] })}
                      className={`relative w-11 h-6 rounded-full transition-colors ${
                        form[toggle.key as keyof typeof form] ? "bg-[#724A6A]" : "bg-[#E8E0D0]"
                      }`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        form[toggle.key as keyof typeof form] ? "translate-x-5" : "translate-x-0.5"
                      }`} />
                    </button>
                  </div>
                ))}

                {form.type === "USER_BASED" && (
                  <div className="flex flex-col gap-4 p-4 bg-[#F5EDF4] rounded-xl border border-[#D4B8CF]">
                    <div>
                      <p className="text-sm font-semibold text-[#724A6A] mb-2">Service Delivery Mode</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {[
                          { value: "VIRTUAL", label: "Virtual Only", icon: "💻" },
                          { value: "PHYSICAL", label: "Physical Only", icon: "📍" },
                          { value: "HYBRID", label: "Hybrid", icon: "🔄" },
                        ].map((m) => (
                          <button
                            key={m.value}
                            type="button"
                            onClick={() => setForm({ ...form, deliveryMode: m.value })}
                            className={`flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all ${
                              form.deliveryMode === m.value
                                ? "border-[#724A6A] bg-white text-[#724A6A]"
                                : "border-transparent bg-[#FFFBE9] text-[#4A4A6A] hover:border-[#D4B8CF]"
                            }`}
                          >
                            <span className="text-xl mb-1">{m.icon}</span>
                            <span className="text-xs font-bold">{m.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {(form.deliveryMode === "VIRTUAL" || form.deliveryMode === "HYBRID") && (
                      <div className="flex flex-col gap-2 p-3 bg-white rounded-lg border border-[#D4B8CF]">
                        <p className="text-xs font-bold text-[#724A6A]">Virtual Settings</p>
                        <div className="flex gap-2">
                          {["MEET", "ZOOM", "TEAMS", "CUSTOM"].map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setForm({ ...form, virtualPlatform: p })}
                              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                form.virtualPlatform === p
                                  ? "bg-[#724A6A] text-white border-[#724A6A]"
                                  : "bg-white text-[#724A6A] border-[#D4B8CF] hover:border-[#724A6A]"
                              }`}
                            >
                              {p === "MEET" ? "Google Meet" : p === "ZOOM" ? "Zoom" : p === "TEAMS" ? "MS Teams" : "Custom Link"}
                            </button>
                          ))}
                        </div>
                        {form.deliveryMode === "HYBRID" && (
                          <div className="flex gap-2 mt-2">
                            <input type="number" className="input-base text-xs flex-1" placeholder="Virtual Price (optional)" value={form.virtualPrice} onChange={(e) => setForm({ ...form, virtualPrice: e.target.value })} />
                            <input type="number" className="input-base text-xs flex-1" placeholder="Virtual Duration (mins, opt)" value={form.virtualDuration} onChange={(e) => setForm({ ...form, virtualDuration: e.target.value })} />
                          </div>
                        )}
                      </div>
                    )}

                    {(form.deliveryMode === "PHYSICAL" || form.deliveryMode === "HYBRID") && (
                      <div className="flex flex-col gap-2 p-3 bg-white rounded-lg border border-[#D4B8CF]">
                        <p className="text-xs font-bold text-[#724A6A]">Physical Venue Settings</p>
                        <input type="text" className="input-base text-sm" placeholder="Full Address" value={form.physicalAddress} onChange={(e) => setForm({ ...form, physicalAddress: e.target.value })} />
                        <div className="flex gap-2">
                          <input type="text" className="input-base text-sm flex-1" placeholder="Room / Cabin" value={form.physicalRoom} onChange={(e) => setForm({ ...form, physicalRoom: e.target.value })} />
                          <input type="text" className="input-base text-sm flex-1" placeholder="Maps Link (optional)" value={form.mapsLink} onChange={(e) => setForm({ ...form, mapsLink: e.target.value })} />
                        </div>
                        {form.deliveryMode === "HYBRID" && (
                          <div className="flex gap-2 mt-1">
                            <input type="number" className="input-base text-xs flex-1" placeholder="Physical Price (optional)" value={form.physicalPrice} onChange={(e) => setForm({ ...form, physicalPrice: e.target.value })} />
                            <input type="number" className="input-base text-xs flex-1" placeholder="Physical Duration (mins, opt)" value={form.physicalDuration} onChange={(e) => setForm({ ...form, physicalDuration: e.target.value })} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {form.advancePayment && (
                <div>
                  <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">Payment Amount (₹)</label>
                  <input type="number" className="input-base" placeholder="e.g. 500" value={form.paymentAmount}
                    onChange={(e) => setForm({ ...form, paymentAmount: e.target.value })} />
                </div>
              )}
            </div>
          )}

          {/* Step 3: Questions */}
          {step === 3 && (
            <div className="flex flex-col gap-4">
              <h2 className="font-semibold text-[#1A1A2E] text-lg mb-2">Custom Questions</h2>
              <p className="text-sm text-[#4A4A6A]">Add questions customers must answer when booking.</p>
              <div className="p-4 bg-[#FFFBE9] rounded-xl border border-dashed border-[#D4B8CF] text-center">
                <button className="btn-outline text-sm py-2 px-4 rounded-lg">
                  + Add Question
                </button>
              </div>
              <div className="p-5 bg-[#F5EDF4] rounded-xl border border-[#D4B8CF]">
                <p className="text-sm font-semibold text-[#724A6A] mb-1">🎉 Ready to publish!</p>
                <p className="text-xs text-[#4A4A6A]">Your service is configured. You can publish it now or save as draft.</p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-6 pt-5 border-t border-[#E8E0D0]">
            {step > 0 && (
              <button onClick={() => setStep(step - 1)} className="btn-outline flex-1 py-2.5 rounded-xl">← Back</button>
            )}
            {step < STEPS.length - 1 ? (
              <button onClick={() => setStep(step + 1)} className="btn-primary flex-1 py-2.5 rounded-xl">
                Continue →
              </button>
            ) : (
              <div className="flex gap-2 flex-1">
                <button disabled={saving} onClick={() => handleCreate(false)} className="btn-outline flex-1 py-2.5 rounded-xl text-sm disabled:opacity-50">
                  {saving ? "Saving..." : "Save Draft"}
                </button>
                <button disabled={saving} onClick={() => handleCreate(true)} className="btn-primary flex-1 py-2.5 rounded-xl text-sm disabled:opacity-50">
                  {saving ? "Publishing..." : "Publish Service 🚀"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </OrganiserLayout>
  );
}
