import Link from "next/link";
import BookoraLogo from "@/components/BookoraLogo";

export default function Footer() {
  return (
    <footer className="bg-[#FFFBE9] text-[#1A1A2E] mt-auto border-t border-[#E8E0D0]">
      <div className="page-container py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12 md:gap-16">
          {/* Brand */}
          <div className="md:col-span-1">
            <BookoraLogo height={48} className="mb-5" />
            <p className="text-sm text-[#4A4A6A] leading-relaxed">
              The perfect booking system for modern businesses. Schedule smarter, serve better.
            </p>
            <div className="flex gap-2.5 mt-4">
              {["twitter", "linkedin", "github"].map((s) => (
                <a
                  key={s}
                  href="#"
                  className="w-8 h-8 rounded-lg bg-[#F5EDF4] flex items-center justify-center hover:bg-[#724A6A] hover:text-white transition-all text-xs font-bold text-[#724A6A]"
                  aria-label={s}
                >
                  {s[0].toUpperCase()}
                </a>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold text-sm mb-3 text-[#724A6A]">Product</h4>
            <ul className="space-y-2">
              {["Features", "Services", "Integrations"].map((item) => (
                <li key={item}>
                  <Link href="#" className="text-sm text-[#4A4A6A] hover:text-[#724A6A] transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-sm mb-3 text-[#724A6A]">Company</h4>
            <ul className="space-y-2">
              {["About", "Blog", "Careers", "Contact"].map((item) => (
                <li key={item}>
                  <Link href="#" className="text-sm text-[#4A4A6A] hover:text-[#724A6A] transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-sm mb-3 text-[#724A6A]">Legal</h4>
            <ul className="space-y-2">
              {["Privacy Policy", "Terms of Service", "Cookie Policy", "Security"].map((item) => (
                <li key={item}>
                  <Link href="#" className="text-sm text-[#4A4A6A] hover:text-[#724A6A] transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14 pt-7 border-t border-[#E8E0D0] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[#8A8AAA]">
            © {new Date().getFullYear()} Bookora. All rights reserved.
          </p>
          <p className="text-xs text-[#8A8AAA]">
            Built with ❤️ for the Odoo Hackathon
          </p>
        </div>
      </div>
    </footer>
  );
}
