import { NextResponse } from "next/server";
import { DemoContextError } from "./tempStore";

const STATUS_BY_CODE: Record<string, number> = {
  not_found: 404,
  not_pending: 409,
  version_conflict: 409,
  stale_snapshot: 409,
  evidence_changed: 409,
};

export function errorResponse(error: unknown) {
  if (error instanceof DemoContextError) {
    const status = STATUS_BY_CODE[error.code] ?? 403;
    return NextResponse.json(
      { error: { code: error.code, message: error.message, retryable: false } },
      { status },
    );
  }
  return NextResponse.json(
    { error: { code: "internal_error", message: String(error), retryable: false } },
    { status: 500 },
  );
}
