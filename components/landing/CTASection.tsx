import Link from "next/link";

export default function CTASection() {
  return (
    <section className="section bg-[#FFFBE9]">
      <div className="page-container">
        <div
          className="relative rounded-3xl overflow-hidden p-10 sm:p-16 text-center"
          style={{
            background: "linear-gradient(135deg, #724A6A 0%, #5A3854 40%, #1A1A2E 100%)",
          }}
        >
          {/* Background decoration */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10"
              style={{ background: "radial-gradient(circle, #D4A017, transparent)" }} />
            <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-10"
              style={{ background: "radial-gradient(circle, #FFFBE9, transparent)" }} />
            <svg className="absolute inset-0 w-full h-full opacity-5" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="cta-dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="1" fill="#FFFBE9" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#cta-dots)" />
            </svg>
          </div>

          <div className="relative z-10">
            <span className="badge bg-[#D4A017]/20 text-[#D4A017] border border-[#D4A017]/30 mb-5">
              Get Started Today
            </span>
            <h2 className="text-3xl sm:text-5xl font-bold text-[#FFFBE9] mb-5 leading-tight">
              Ready to simplify
              <br />
              your scheduling?
            </h2>
            <p className="text-[#FFFBE9]/70 max-w-lg mx-auto mb-8 text-base leading-relaxed">
              Join thousands of businesses and customers who trust Bookora for seamless appointment management.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 bg-[#FFFBE9] text-[#724A6A] font-semibold px-8 py-3.5 rounded-xl hover:bg-white transition-colors shadow-lg text-sm"
              >
                Start for Free
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </Link>
              <Link
                href="/services"
                className="inline-flex items-center gap-2 bg-transparent text-[#FFFBE9] font-semibold px-8 py-3.5 rounded-xl border border-[#FFFBE9]/30 hover:bg-[#FFFBE9]/10 transition-colors text-sm"
              >
                Browse Services
              </Link>
            </div>
            <p className="text-[#FFFBE9]/40 text-xs mt-6">No credit card required · Free forever plan available</p>
          </div>
        </div>
      </div>
    </section>
  );
}
