import Link from "next/link";
import { loadStore } from "@/server/platform/store";
import { getCurrentMember } from "@/server/platform/session";
import { Room } from "./room";

export const dynamic = "force-dynamic";

export default async function ProjectRoom() {
  const viewer = await getCurrentMember();
  if (viewer === null) {
    return (
      <main className="ck-workspace">
        <h1>NERV</h1>
        <p className="ck-intro">Pick a demo profile before opening the project room.</p>
        <Link className="ck-btn ck-btn--primary" href="/">
          Choose a profile
        </Link>
      </main>
    );
  }

  return <Room store={await loadStore()} viewer={viewer} />;
}
