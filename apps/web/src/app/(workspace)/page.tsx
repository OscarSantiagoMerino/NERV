import { readSnapshot } from "@/features/workspace/server/store";
import { Room } from "./room";

export const dynamic = "force-dynamic";

export default async function ProjectRoom() {
  const snapshot = await readSnapshot();
  return <Room snapshot={snapshot} />;
}
