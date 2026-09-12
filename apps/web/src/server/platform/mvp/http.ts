import { NextResponse } from "next/server";
import { DemoError } from "./index";

// Wire format per docs/mvp/CONTRATOS.md §3: {data: T} / {error:{code,message,retryable}}.

export function jsonData<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}

export function jsonError(status: number, code: string, message: string, retryable = false): NextResponse {
  return NextResponse.json({ error: { code, message, retryable } }, { status });
}

export function withApiErrors(handler: () => Promise<NextResponse> | NextResponse): Promise<NextResponse> {
  return Promise.resolve()
    .then(handler)
    .catch((err) => {
      if (err instanceof DemoError) {
        return jsonError(err.status, err.code, err.message, err.retryable);
      }
      console.error(err);
      return jsonError(500, "INTERNAL", "Unexpected server error.", true);
    });
}
