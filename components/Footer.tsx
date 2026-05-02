import Link from "next/link";
import BookoraLogo from "@/components/BookoraLogo";

export default function Footer() {
  return (
    <footer className="bg-[#1A1A2E] text-[#FFFBE9] mt-auto">
      <div className="page-container py-16 px-6 sm:px-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 md:gap-14">
          {/* Brand */}
          <div className="md:col-span-1">
            <BookoraLogo height={96} className="mb-5 brightness-0 invert" />
            <p className="text-sm text-[#FFFBE9]/60 leading-relaxed">
              The perfect booking system for modern businesses. Schedule smarter, serve better.
            </p>
            <div className="flex gap-2.5 mt-4">
              {["twitter", "linkedin", "github"].map((s) => (
                <a
                  key={s}
                  href="#"
                  className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-[#724A6A] transition-colors text-xs font-bold"
                  aria-label={s}
                >
                  {s[0].toUpperCase()}
                </a>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold text-sm mb-3 text-[#D4A017]">Product</h4>
            <ul className="space-y-2">
              {["Features", "Services", "Integrations"].map((item) => (
                <li key={item}>
                  <Link href="#" className="text-sm text-[#FFFBE9]/60 hover:text-[#FFFBE9] transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-sm mb-3 text-[#D4A017]">Company</h4>
            <ul className="space-y-2">
              {["About", "Blog", "Careers", "Contact"].map((item) => (
                <li key={item}>
                  <Link href="#" className="text-sm text-[#FFFBE9]/60 hover:text-[#FFFBE9] transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-sm mb-3 text-[#D4A017]">Legal</h4>
            <ul className="space-y-2">
              {["Privacy Policy", "Terms of Service", "Cookie Policy", "Security"].map((item) => (
                <li key={item}>
                  <Link href="#" className="text-sm text-[#FFFBE9]/60 hover:text-[#FFFBE9] transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[#FFFBE9]/40">
            © {new Date().getFullYear()} Bookora. All rights reserved.
          </p>
          <p className="text-xs text-[#FFFBE9]/40">
            Built with ❤️ for the Odoo Hackathon
          </p>
        </div>
      </div>
    </footer>
  );
}
