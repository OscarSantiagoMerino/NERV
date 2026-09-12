import { getDemoContext } from "@/server/platform/mvp";
import { jsonData, withApiErrors } from "@/server/platform/mvp/http";
import { demoProfiles } from "@/contracts/mvp/demo-fixture";

// Entry point: no profile required yet, per CONTRATOS.md §3.
export async function GET(request: Request) {
  return withApiErrors(() => {
    getDemoContext(request, { requireProfile: false });
    return jsonData({ demoMode: true as const, profiles: demoProfiles });
  });
}
