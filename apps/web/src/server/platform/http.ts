import { NextResponse } from "next/server";
import { AccessError } from "./session";

// Wire format per docs/plan/CONTRATOS.md §4: business routes return
// {data: ...}; errors return {error: {code, message, retryable}}.

export function jsonData<T>(data: T, init?: number): NextResponse {
  return NextResponse.json({ data }, { status: init ?? 200 });
}

export function jsonError(status: number, code: string, message: string, retryable = false): NextResponse {
  return NextResponse.json({ error: { code, message, retryable } }, { status });
}

/** Wraps a route handler so AccessError and validation errors become the standard error envelope. */
export function withApiErrors(handler: () => Promise<NextResponse>): Promise<NextResponse> {
  return handler().catch((err) => {
    if (err instanceof AccessError) {
      return jsonError(err.status, err.code, err.message, err.retryable);
    }
    console.error(err);
    return jsonError(500, "INTERNAL", "Unexpected server error.", true);
  });
}
