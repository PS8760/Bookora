import Link from "next/link";

const team = [
  { name: "Abhishek Jamdade", role: "Leader", avatar: "AJ", color: "#0277BD" },
  { name: "Shyam Gupta", role: "Backend Dev & Deployment", avatar: "SG", color: "#2E7D32" },
  { name: "Radhika Kulkarni", role: "UI/UX Designer", avatar: "RK", color: "#C2185B" },
  { name: "Pranav Ghodke", role: "Frontend Dev", avatar: "PG", color: "#724A6A" },
];

export default function AboutPage() {
  return (
    <div className="pt-20">
      {/* Hero */}
        <section className="py-20 bg-[#FFF3C4]/30 border-b border-[#E8E0D0]">
          <div className="page-container text-center">
            <span className="badge bg-[#F5EDF4] text-[#724A6A] border border-[#D4B8CF] mb-5">About Bookora</span>
            <h1 className="text-4xl sm:text-5xl font-bold text-[#1A1A2E] mb-5">
              Built for the <span className="gradient-brand-text">Odoo Hackathon</span>
            </h1>
            <p className="text-[#4A4A6A] max-w-2xl mx-auto text-lg leading-relaxed">
              Bookora is a full-featured appointment booking system designed to solve real-world scheduling challenges — from real-time availability to preventing double bookings.
            </p>
          </div>
        </section>

        {/* Mission */}
        <section className="section">
          <div className="page-container">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold text-[#1A1A2E] mb-5">Our Mission</h2>
                <p className="text-[#4A4A6A] leading-relaxed mb-4">
                  We believe scheduling should be effortless. Whether you're a customer trying to book a dental appointment or a business managing hundreds of bookings — Bookora makes it seamless.
                </p>
                <p className="text-[#4A4A6A] leading-relaxed mb-6">
                  Built with enterprise-grade reliability: atomic transactions, real-time slot updates, and a booking state machine that prevents every known race condition.
                </p>
                <Link href="/register" className="btn-primary py-3 px-7 rounded-xl">
                  Get Started Free
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: "⚡", title: "Real-time", desc: "Live slot availability with WebSocket updates" },
                  { icon: "🔒", title: "Secure", desc: "Atomic transactions prevent double bookings" },
                  { icon: "🌍", title: "Timezone-aware", desc: "IANA timezone support for global users" },
                  { icon: "📱", title: "Responsive", desc: "Works beautifully on any device" },
                ].map((f, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-[#E8E0D0] p-5 shadow-[0_2px_8px_rgba(114,74,106,0.06)]">
                    <span className="text-2xl mb-2 block">{f.icon}</span>
                    <h3 className="font-semibold text-[#1A1A2E] mb-1 text-sm">{f.title}</h3>
                    <p className="text-xs text-[#4A4A6A] leading-relaxed">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="section bg-[#FFF3C4]/30">
          <div className="page-container">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-[#1A1A2E] mb-3">The Team</h2>
              <p className="text-[#4A4A6A]">Built with passion at the Odoo Hackathon</p>
            </div>
            <div className="flex flex-wrap justify-center gap-6">
              {team.map((m, i) => (
                <div key={i} className="card-hover bg-white rounded-2xl border border-[#E8E0D0] p-6 text-center w-48 shadow-[0_2px_12px_rgba(114,74,106,0.06)]">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold mx-auto mb-3 shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
                    style={{ background: m.color }}>
                    {m.avatar}
                  </div>
                  <h3 className="font-semibold text-[#1A1A2E] text-sm">{m.name}</h3>
                  <p className="text-xs text-[#8A8AAA] mt-1">{m.role}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tech stack */}
        <section className="section">
          <div className="page-container text-center">
            <h2 className="text-3xl font-bold text-[#1A1A2E] mb-10">Built With</h2>
            <div className="flex flex-wrap justify-center gap-3">
              {["Next.js 16", "TypeScript", "Tailwind CSS v4", "Prisma ORM", "PostgreSQL", "better-auth", "BullMQ", "Socket.io"].map((t) => (
                <span key={t} className="px-4 py-2 bg-white border border-[#E8E0D0] rounded-xl text-sm font-medium text-[#4A4A6A] shadow-[0_1px_4px_rgba(114,74,106,0.06)]">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </section>
    </div>
  );
}
