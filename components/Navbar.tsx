"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Session, AuthChangeEvent } from "@supabase/supabase-js";

const navLinks = [
  { label: "Beats", href: "/beats", active: true },
  { label: "Samples & Presets", href: "/samples", active: false },
  { label: "Remakes", href: "/remakes", active: false },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);

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

  async function handleSignOut() {
    console.log("[Navbar] Signing out...");
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    console.log("[Navbar] Signed out");
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

        {/* Auth — hidden until we know the auth state to prevent layout flash */}
        <div
          className="flex items-center gap-2"
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
      </div>
    </nav>
  );
}
