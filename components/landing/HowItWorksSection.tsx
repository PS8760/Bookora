const steps = [
  {
    step: "01",
    title: "Browse Services",
    desc: "Explore available appointment types from verified providers across categories.",
    icon: "🔍",
  },
  {
    step: "02",
    title: "Pick a Slot",
    desc: "Choose your preferred date and time from real-time available slots.",
    icon: "📅",
  },
  {
    step: "03",
    title: "Fill Details",
    desc: "Answer a few quick questions and confirm your booking information.",
    icon: "✏️",
  },
  {
    step: "04",
    title: "You're Booked!",
    desc: "Get instant confirmation with all details. Reschedule anytime if needed.",
    icon: "✅",
  },
];

export default function HowItWorksSection() {
  return (
    <section className="section bg-[#FFF3C4]/30">
      <div className="page-container">
        {/* Header */}
        <div className="text-center mb-14">
          <span className="badge bg-[#FFF3C4] text-[#D4A017] border border-[#FFE88A] mb-4">
            How It Works
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1A2E] mb-4">
            Book in <span className="gradient-brand-text">4 simple steps</span>
          </h2>
          <p className="text-[#4A4A6A] max-w-xl mx-auto text-base leading-relaxed">
            From discovery to confirmation in under 2 minutes. No phone calls, no waiting.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connector line (desktop) */}
          <div className="hidden lg:block absolute top-10 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-[#724A6A] via-[#D4A017] to-[#724A6A] opacity-20" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <div key={i} className="relative flex flex-col items-center text-center group">
                {/* Step circle */}
                <div className="relative mb-5">
                  <div className="w-20 h-20 rounded-2xl bg-[#FFFBE9] border-2 border-[#E8E0D0] flex items-center justify-center text-3xl shadow-[0_4px_16px_rgba(114,74,106,0.10)] group-hover:border-[#724A6A] group-hover:shadow-[0_8px_24px_rgba(114,74,106,0.18)] transition-all duration-200">
                    {s.icon}
                  </div>
                  <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[#724A6A] text-white text-xs font-bold flex items-center justify-center shadow-md">
                    {s.step}
                  </div>
                </div>
                <h3 className="font-semibold text-[#1A1A2E] mb-2">{s.title}</h3>
                <p className="text-sm text-[#4A4A6A] leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
