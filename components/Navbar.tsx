"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Session, AuthChangeEvent } from "@supabase/supabase-js";

const navLinks = [
  { label: "Beats", href: "/beats", active: true },
  { label: "Samples & Presets", href: "/samples", active: true },
  { label: "Remakes", href: "/remakes", active: false },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseClient();

    // Read session from local storage — instant, no network call.
    void (async () => {
      const { data, error } = await supabase.auth.getSession();
      console.log(
        "[Navbar] Initial session:",
        data.session ? `user=${data.session.user.email}` : "none",
        error ? `error=${error.message}` : ""
      );
      setSession(data.session);
      setAuthReady(true);
    })();

    // Subscribe to auth state changes (login, logout, token refresh).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, newSession: Session | null) => {
      console.log("[Navbar] Auth state changed:", event, newSession?.user?.email ?? "null");
      setSession(newSession);
      setAuthReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  async function handleSignOut() {
    console.log("[Navbar] Signing out...");
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    console.log("[Navbar] Signed out");
    setMenuOpen(false);
    router.push("/beats");
    router.refresh();
  }

  const username = session?.user?.user_metadata?.username as string | undefined;

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
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 md:px-6">
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

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-1">
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

        {/* Desktop auth */}
        <div
          className="hidden md:flex items-center gap-2"
          style={{ minWidth: 160, justifyContent: "flex-end" }}
        >
          {!authReady ? (
            <div style={{ width: 160, height: 32 }} />
          ) : session && username ? (
            <>
              <Link
                href="/nedlastninger"
                className="rounded-md px-3 py-1.5 text-sm font-medium transition-opacity hover:opacity-80"
                style={{
                  color: pathname.startsWith("/nedlastninger") ? "#f5f5f7" : "#86868b",
                  background: pathname.startsWith("/nedlastninger") ? "rgba(255,255,255,0.06)" : "transparent",
                }}
              >
                Mine nedlastninger
              </Link>
              <Link
                href={`/profile/${username}`}
                className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-opacity hover:opacity-80"
                style={{ color: "#f5f5f7", background: "rgba(255,255,255,0.06)" }}
              >
                <div
                  className="flex items-center justify-center rounded-md text-xs font-bold select-none"
                  style={{
                    width: 22,
                    height: 22,
                    background: "linear-gradient(135deg, #2a1a5e 0%, #1a2a5e 100%)",
                    color: "rgba(255,255,255,0.6)",
                    flexShrink: 0,
                  }}
                >
                  {username.slice(0, 1).toUpperCase()}
                </div>
                {username}
              </Link>
              <button
                onClick={handleSignOut}
                className="rounded-md px-3 py-1.5 text-sm transition-colors hover:opacity-80"
                style={{ color: "#86868b" }}
              >
                Logg ut
              </button>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex items-center justify-center rounded-lg p-2 transition-colors"
          style={{ color: "#86868b" }}
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? "Lukk meny" : "Meny"}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div
          className="md:hidden border-t"
          style={{
            background: "rgba(8,8,8,0.97)",
            borderColor: "#1e1e1e",
          }}
        >
          <div className="px-4 py-3 flex flex-col gap-1">
            {/* Nav links */}
            {navLinks.map((link) => {
              const isCurrentPage = pathname.startsWith(link.href);
              if (!link.active) {
                return (
                  <span
                    key={link.href}
                    className="cursor-not-allowed rounded-lg px-3 py-2.5 text-sm"
                    style={{ color: "#2a2a2a" }}
                  >
                    {link.label} (kommer snart)
                  </span>
                );
              }
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
                  style={{
                    color: isCurrentPage ? "#f5f5f7" : "#86868b",
                    background: isCurrentPage ? "rgba(255,255,255,0.06)" : "transparent",
                  }}
                >
                  {link.label}
                </Link>
              );
            })}

            {/* Divider */}
            <div className="my-2 h-px" style={{ background: "#1e1e1e" }} />

            {/* Auth section */}
            {authReady && (
              <>
                {session && username ? (
                  <>
                    <Link
                      href={`/profile/${username}`}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
                      style={{ color: "#f5f5f7", background: "rgba(255,255,255,0.04)" }}
                    >
                      <div
                        className="flex items-center justify-center rounded-md text-xs font-bold select-none shrink-0"
                        style={{
                          width: 24,
                          height: 24,
                          background: "linear-gradient(135deg, #2a1a5e 0%, #1a2a5e 100%)",
                          color: "rgba(255,255,255,0.6)",
                        }}
                      >
                        {username.slice(0, 1).toUpperCase()}
                      </div>
                      {username}
                    </Link>
                    <Link
                      href="/nedlastninger"
                      className="rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
                      style={{
                        color: pathname.startsWith("/nedlastninger") ? "#f5f5f7" : "#86868b",
                      }}
                    >
                      Mine nedlastninger
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="text-left rounded-lg px-3 py-2.5 text-sm transition-colors"
                      style={{ color: "#86868b" }}
                    >
                      Logg ut
                    </button>
                  </>
                ) : (
                  <div className="flex gap-2 pt-1">
                    <Link
                      href="/logg-inn"
                      className="flex-1 rounded-xl px-4 py-2.5 text-center text-sm font-medium transition-colors"
                      style={{ background: "rgba(255,255,255,0.06)", color: "#f5f5f7" }}
                    >
                      Logg inn
                    </Link>
                    <Link
                      href="/registrer"
                      className="flex-1 rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition-opacity hover:opacity-90"
                      style={{ background: "#f5f5f7", color: "#080808" }}
                    >
                      Registrer deg
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
