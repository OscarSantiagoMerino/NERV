import { getDemoContext, getState } from "@/server/platform/mvp";
import { jsonData, withApiErrors } from "@/server/platform/mvp/http";

export async function GET(request: Request) {
  return withApiErrors(() => {
    getDemoContext(request); // requires a known X-Nerv-Profile
    return jsonData(getState());
  });
}
