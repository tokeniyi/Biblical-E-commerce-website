import type { Session } from "@your-app/shared";
import { serverApi } from "./server";

/** The staff session for admin pages, or null (the page shows E20 / sign-in). */
export async function loadStaff(): Promise<Extract<Session, { kind: "staff" }> | null> {
  try {
    const { session } = await (await serverApi()).getSession();
    return session.kind === "staff" ? session : null;
  } catch {
    return null;
  }
}
