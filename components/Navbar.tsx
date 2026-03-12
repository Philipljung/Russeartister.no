"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const navLinks = [
  { label: "Beats", href: "/beats", active: true },
  { label: "Samples & Presets", href: "/samples", active: false },
  { label: "Remakes", href: "/remakes", active: false },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav
      className="sticky top-0 z-50 w-full border-b"
      style={{
        background: "rgba(8,8,8,0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderColor: "#1e1e1e",
      }}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/beats" className="flex items-center transition-opacity hover:opacity-80">
          <Image
            src="/ra-logo.png"
            alt="Russeartister.no"
            width={120}
            height={32}
            style={{ objectFit: "contain", height: 28, width: "auto" }}
            priority
          />
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {navLinks.map((link) => {
            const isCurrentPage = pathname.startsWith(link.href);
            if (!link.active) {
              return (
                <span
                  key={link.href}
                  title="Kommer snart"
                  className="cursor-not-allowed rounded-md px-3 py-1.5 text-sm"
                  style={{ color: "#2a2a2a" }}
                >
                  {link.label}
                </span>
              );
            }
            return (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
                style={{
                  color: isCurrentPage ? "#f5f5f7" : "#86868b",
                  background: isCurrentPage ? "rgba(255,255,255,0.06)" : "transparent",
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Auth */}
        <div className="flex items-center gap-2">
          <Link
            href="/logg-inn"
            className="rounded-md px-4 py-1.5 text-sm font-medium transition-colors hover:opacity-80"
            style={{ color: "#86868b" }}
          >
            Logg inn
          </Link>
          <Link
            href="/registrer"
            className="rounded-md px-4 py-1.5 text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ background: "#f5f5f7", color: "#080808" }}
          >
            Registrer deg
          </Link>
        </div>
      </div>
    </nav>
  );
}
