"use client";

import { useEffect, useState } from "react";
import type { Member } from "@/contracts/schemas";

// Fake identity picker in place of Auth0 Universal Login for the cut-scope
// MVP (docs/context/mvp-revisado-110min.md). Real login is a post-MVP item.

export default function IdentityPickerPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [current, setCurrent] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const sessionRes = await fetch("/api/session");
      const sessionBody = await sessionRes.json();
      const member: Member | null = sessionBody.data?.member ?? null;
      setCurrent(member);

      const projectId = "proj-signup-validation";
      const membersRes = await fetch(`/api/members?projectId=${projectId}`);
      if (membersRes.ok) {
        const body = await membersRes.json();
        setMembers(body.data ?? []);
      } else if (member) {
        // Session exists but read failed for another reason; surface it.
        const body = await membersRes.json().catch(() => null);
        setError(body?.error?.message ?? "No se pudo cargar el equipo.");
      }
      setLoading(false);
    }
    load();
  }, []);

  async function choose(memberId: string) {
    setError(null);
    const res = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId }),
    });
    const body = await res.json();
    if (!res.ok) {
      setError(body?.error?.message ?? "No se pudo iniciar sesión.");
      return;
    }
    setCurrent(body.data.member);
    // Membership list needs a real session to read; refetch now that we have one.
    const membersRes = await fetch(`/api/members?projectId=${body.data.member.projectId}`);
    const membersBody = await membersRes.json();
    setMembers(membersBody.data ?? []);
  }

  if (loading) {
    return <main style={{ padding: "2rem" }}>Cargando…</main>;
  }

  if (current) {
    return (
      <main style={{ padding: "2rem" }}>
        <h1>NERV</h1>
        <p>
          Sesión iniciada como <strong>{current.displayName}</strong> ({current.accessRole}).
        </p>
        <p style={{ opacity: 0.7 }}>
          El espacio de trabajo (Kanban/Charter/chat) todavía no está montado aquí.
        </p>
      </main>
    );
  }

  return (
    <main style={{ padding: "2rem" }}>
      <h1>NERV</h1>
      <p>Elige tu identidad para continuar.</p>
      {error && <p style={{ color: "#ff6b6b" }}>{error}</p>}
      <ul style={{ listStyle: "none", padding: 0, display: "flex", gap: "0.75rem" }}>
        {members.map((m) => (
          <li key={m.id}>
            <button
              onClick={() => choose(m.id)}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "0.5rem",
                border: "1px solid #2a3441",
                background: "#111820",
                color: "inherit",
                cursor: "pointer",
              }}
            >
              {m.displayName}
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
