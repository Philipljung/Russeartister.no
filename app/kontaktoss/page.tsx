import { Mail } from "lucide-react";

export default function KontaktOssPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-20 text-center">
      <div
        className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{ background: "rgba(99,102,241,0.1)" }}
      >
        <Mail size={28} style={{ color: "#818cf8" }} />
      </div>
      <h1
        className="text-2xl font-bold tracking-tight"
        style={{ color: "#f5f5f7" }}
      >
        Kontakt oss
      </h1>
      <p className="mt-4 text-sm leading-relaxed" style={{ color: "#86868b" }}>
        Kontakt oss på{" "}
        <a
          href="mailto:russeartister@gmail.com"
          className="underline transition-colors hover:text-white"
          style={{ color: "#818cf8" }}
        >
          russeartister@gmail.com
        </a>
      </p>
    </div>
  );
}
