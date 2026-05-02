import Image from "next/image";
import Link from "next/link";

interface BookoraLogoProps {
  /** Height of the logo in px. Width scales automatically. Default: 40 */
  height?: number;
  /** Whether to wrap in a Link to "/". Default: true */
  linked?: boolean;
  /** Extra className on the wrapper */
  className?: string;
}

export default function BookoraLogo({
  height = 48,
  linked = true,
  className = "",
}: BookoraLogoProps) {
  const img = (
    <Image
      src="/Bookora_Logo.png"
      alt="Bookora"
      width={height * 3.125} // maintain ~3.125:1 aspect ratio
      height={height}
      className="object-contain"
      priority
    />
  );

  if (!linked) return <span className={className}>{img}</span>;

  return (
    <Link href="/" className={`inline-flex items-center ${className}`}>
      {img}
    </Link>
  );
}
