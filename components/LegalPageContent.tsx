"use client";

import { useEffect, useState } from "react";
import { fetchLegalPage, type LegalPage } from "@/lib/fetchCms";

export default function LegalPageContent({ slug }: { slug: string }) {
  const [page, setPage] = useState<LegalPage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLegalPage(slug).then((data) => {
      setPage(data);
      setLoading(false);
    });
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm" style={{ color: "#3a3a3a" }}>Laster...</p>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm" style={{ color: "#3a3a3a" }}>Side ikke funnet.</p>
      </div>
    );
  }

  const updatedDate = new Date(page.updated_at).toLocaleDateString("nb-NO", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="mx-auto max-w-2xl px-6 py-14">
      <h1 className="mb-2 text-2xl font-bold tracking-tight" style={{ color: "#f5f5f7" }}>
        {page.title}
      </h1>
      <p className="mb-10 text-xs" style={{ color: "#3a3a3a" }}>
        Sist oppdatert: {updatedDate}
      </p>
      <div
        className="text-sm leading-relaxed"
        style={{
          color: "#86868b",
          whiteSpace: "pre-wrap",
          lineHeight: 1.8,
        }}
      >
        {page.content}
      </div>
    </div>
  );
}
