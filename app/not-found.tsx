import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-20">
      <div className="text-center max-w-md">
        <div className="text-8xl mb-6">📅</div>
        <h1 className="text-6xl font-bold text-[#724A6A] mb-3">404</h1>
        <h2 className="text-2xl font-bold text-[#1A1A2E] mb-4">Page not found</h2>
        <p className="text-[#4A4A6A] mb-8 leading-relaxed">
          Looks like this slot is unavailable. The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/" className="btn-primary py-3 px-7 rounded-xl">Go Home</Link>
          <Link href="/services" className="btn-outline py-3 px-7 rounded-xl">Browse Services</Link>
        </div>
      </div>
    </div>
  );
}