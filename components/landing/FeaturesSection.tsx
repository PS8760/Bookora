const features = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
    title: "Real-Time Availability",
    desc: "See live slot availability as it updates. No more double bookings or stale calendars.",
    color: "#F5EDF4",
    accent: "#724A6A",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    title: "Secure & Reliable",
    desc: "Enterprise-grade security with atomic transactions. Your data and bookings are always safe.",
    color: "#E8F5E9",
    accent: "#2E7D32",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
    title: "Flexible Scheduling",
    desc: "Weekly recurring or custom flexible windows. Configure exactly how your business operates.",
    color: "#FFF3E0",
    accent: "#E65100",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    title: "Multi-Role Access",
    desc: "Customers, Organisers, and Admins each get a tailored experience with the right permissions.",
    color: "#F5EDF4",
    accent: "#724A6A",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
    title: "Payment Integration",
    desc: "Collect advance payments seamlessly. Two-phase booking ensures no slot is lost mid-payment.",
    color: "#FFF8E1",
    accent: "#D4A017",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    title: "Reports & Insights",
    desc: "Track peak hours, provider utilization, and booking trends with beautiful analytics.",
    color: "#F3E5F5",
    accent: "#9B6B92",
  },
];

export default function FeaturesSection() {
  return (
    <section className="section bg-[#FFFBE9]">
      <div className="page-container">
        {/* Header */}
        <div className="text-center mb-14">
          <span className="badge bg-[#F5EDF4] text-[#724A6A] border border-[#D4B8CF] mb-4">
            Why Bookora
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1A2E] mb-4">
            Everything you need to{" "}
            <span className="gradient-brand-text">book smarter</span>
          </h2>
          <p className="text-[#4A4A6A] max-w-xl mx-auto text-base leading-relaxed">
            Built for modern businesses and their customers. Every feature designed to make scheduling effortless.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div
              key={i}
              className="card-hover group p-6 rounded-2xl bg-[#FFFBE9] border border-[#E8E0D0] shadow-[0_2px_12px_rgba(114,74,106,0.06)]"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                style={{ background: f.color, color: f.accent }}
              >
                {f.icon}
              </div>
              <h3 className="font-semibold text-[#1A1A2E] mb-2 text-base">{f.title}</h3>
              <p className="text-sm text-[#4A4A6A] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
