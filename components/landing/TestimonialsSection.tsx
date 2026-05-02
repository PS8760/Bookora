const testimonials = [
  {
    name: "Priya Sharma",
    role: "Regular Customer",
    avatar: "PS",
    color: "#724A6A",
    rating: 5,
    text: "Bookora completely changed how I manage my appointments. I booked a dental checkup in under 2 minutes. The real-time slot updates are a game changer!",
  },
  {
    name: "Rahul Mehta",
    role: "Fitness Studio Owner",
    avatar: "RM",
    color: "#E65100",
    rating: 5,
    text: "As an organiser, the scheduling tools are incredibly powerful. My clients love the seamless booking experience and I love the zero double-bookings.",
  },
  {
    name: "Ananya Patel",
    role: "Spa Manager",
    avatar: "AP",
    color: "#2E7D32",
    rating: 5,
    text: "The capacity management and manual confirmation features are exactly what we needed. Our booking process is now completely automated.",
  },
];

export default function TestimonialsSection() {
  return (
    <section className="section bg-[#FFF3C4]/30">
      <div className="page-container">
        {/* Header */}
        <div className="text-center mb-14">
          <span className="badge bg-[#FFF3C4] text-[#D4A017] border border-[#FFE88A] mb-4">
            Testimonials
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1A2E] mb-4">
            Loved by <span className="gradient-brand-text">thousands</span>
          </h2>
          <p className="text-[#4A4A6A] max-w-xl mx-auto text-base">
            Don't just take our word for it — hear from our community.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="card-hover p-6 rounded-2xl bg-[#FFFBE9] border border-[#E8E0D0] shadow-[0_2px_12px_rgba(114,74,106,0.06)] flex flex-col gap-4"
            >
              {/* Stars */}
              <div className="flex gap-1">
                {Array.from({ length: t.rating }).map((_, s) => (
                  <svg key={s} width="14" height="14" viewBox="0 0 24 24" fill="#D4A017">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                ))}
              </div>

              {/* Quote */}
              <p className="text-sm text-[#4A4A6A] leading-relaxed flex-1">"{t.text}"</p>

              {/* Author */}
              <div className="flex items-center gap-3 pt-2 border-t border-[#E8E0D0]">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ background: t.color }}
                >
                  {t.avatar}
                </div>
                <div>
                  <p className="font-semibold text-sm text-[#1A1A2E]">{t.name}</p>
                  <p className="text-xs text-[#8A8AAA]">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
