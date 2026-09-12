import { cookies } from "next/headers";
import { loadStore } from "./store";
import type { Member } from "@/contracts/schemas";

// Fake identity in place of Auth0 (docs/context/mvp-revisado-110min.md: "un
// selector de identidad falso" instead of real login). `authSubject` on
// Member still exists so P1/P3 code and the wire format don't change if
// Auth0 comes back post-MVP.

const COOKIE_NAME = "nerv_member_id";

export async function getCurrentMember(): Promise<Member | null> {
  const store = await loadStore();
  const jar = await cookies();
  const memberId = jar.get(COOKIE_NAME)?.value;
  if (!memberId) return null;
  return store.members.find((m) => m.id === memberId) ?? null;
}

export async function setCurrentMember(memberId: string): Promise<Member> {
  const store = await loadStore();
  const member = store.members.find((m) => m.id === memberId);
  if (!member) {
    throw new AccessError(400, "UNKNOWN_MEMBER", `No member with id '${memberId}'.`);
  }
  const jar = await cookies();
  jar.set(COOKIE_NAME, memberId, { httpOnly: true, sameSite: "lax", path: "/" });
  return member;
}

export async function clearCurrentMember(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export class AccessError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    /** Informative only: it never authorises a blind retry of a write. */
    public retryable = false,
  ) {
    super(message);
  }
}

/**
 * Per CONTRATOS.md §3: never trust an actor id sent by the client. Every
 * mutating route calls this and uses the returned member's id/role, not
 * anything from the request body.
 */
export async function requireProjectAccess(
  projectId: string,
  permission: "read" | "write" | "lead",
): Promise<Member> {
  const member = await getCurrentMember();
  if (!member) {
    throw new AccessError(401, "NO_SESSION", "Sign in with a member identity first.");
  }
  if (member.projectId !== projectId) {
    throw new AccessError(403, "WRONG_PROJECT", "This member does not belong to the requested project.");
  }
  if (permission === "lead" && member.accessRole !== "lead") {
    throw new AccessError(403, "LEAD_REQUIRED", "This action requires the project lead.");
  }
  return member;
}
