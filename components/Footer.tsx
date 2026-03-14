"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchFooterData, type FooterLink, type SiteSettings } from "@/lib/fetchCms";

export default function Footer() {
  const [links, setLinks] = useState<FooterLink[]>([]);
  const [settings, setSettings] = useState<SiteSettings>({
    copyright_text: "© 2025 Russeartister.no. Alle rettigheter forbeholdt.",
    footer_tagline: null,
  });

  useEffect(() => {
    fetchFooterData().then(({ links: l, settings: s }) => {
      setLinks(l);
      setSettings(s);
    });
  }, []);

  return (
    <footer
      className="border-t"
      style={{ borderColor: "#1e1e1e", background: "#080808" }}
    >
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
          {/* Brand */}
          <div>
            <p className="text-sm font-semibold tracking-wide" style={{ color: "#f5f5f7" }}>
              Russeartister.no
            </p>
            {settings.footer_tagline && (
              <p className="mt-0.5 text-xs" style={{ color: "#3a3a3a" }}>
                {settings.footer_tagline}
              </p>
            )}
          </div>

          {/* Links */}
          {links.length > 0 && (
            <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              {links.map((link) => (
                <Link
                  key={link.id}
                  href={link.url}
                  className="text-xs transition-colors hover:text-white"
                  style={{ color: "#3a3a3a" }}
                  {...(link.url.startsWith("http") || link.url.startsWith("mailto")
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          )}
        </div>

        <div className="mt-8 border-t pt-6" style={{ borderColor: "#141414" }}>
          <p className="text-center text-xs" style={{ color: "#2a2a2a" }}>
            {settings.copyright_text}
          </p>
        </div>
      </div>
    </footer>
  );
}
