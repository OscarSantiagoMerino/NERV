import { NextResponse } from "next/server";
import { readSnapshot, StoreError } from "./store";
import { ACTOR_HEADER, type Member } from "../types";

/**
 * Stands in for P2's `requireProjectAccess`. It trusts a header, so it is a
 * development double only — swap this one function for the Auth0-backed guard
 * and every route below keeps working unchanged.
 */
export async function resolveActor(request: Request): Promise<Member> {
  const memberId = request.headers.get(ACTOR_HEADER);
  if (memberId === null || memberId.length === 0) {
    throw new AccessError(401, "no_session", "Choose a member before acting on this project.");
  }

  const snapshot = await readSnapshot();
  const member = snapshot.members.find((candidate) => candidate.id === memberId);
  if (member === undefined) {
    throw new AccessError(403, "not_a_member", "That member has no access to this project.");
  }
  return member;
}

export class AccessError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function data(payload: unknown, status = 200): NextResponse {
  return NextResponse.json({ data: payload }, { status });
}

export function failure(
  status: number,
  code: string,
  message: string,
  retryable = false,
): NextResponse {
  return NextResponse.json({ error: { code, message, retryable } }, { status });
}

const storeStatus = {
  not_found: 404,
  version_conflict: 409,
  invalid_reference: 422,
} as const;

export async function route(handler: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof AccessError) {
      return failure(error.status, error.code, error.message);
    }
    if (error instanceof StoreError) {
      return failure(storeStatus[error.code], error.code, error.message);
    }
    return failure(500, "unexpected", "Something failed on the server.", true);
  }
}
