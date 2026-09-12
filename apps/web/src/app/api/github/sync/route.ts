import { loadStore } from "@/server/platform/store";
import { requireProjectAccess } from "@/server/platform/session";
import { jsonData, jsonError, withApiErrors } from "@/server/platform/http";
import { GitHubError } from "@/server/github/client";
import { syncGitHub } from "@/server/github/sync";

/**
 * Reads the configured repository and folds it into the board. Also settles
 * any proposal whose result was never confirmed, by looking for its marker.
 * The repository is server configuration; nothing here comes from the body.
 */
export async function POST() {
  return withApiErrors(async () => {
    const store = await loadStore();
    await requireProjectAccess(store.project.id, "write");
    try {
      return jsonData(await syncGitHub());
    } catch (error) {
      if (error instanceof GitHubError) {
        return jsonError(
          502,
          error.code,
          `${error.message} The board still shows the last reading.`,
          true,
        );
      }
      throw error;
    }
  });
}
