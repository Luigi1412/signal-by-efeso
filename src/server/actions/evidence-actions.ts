"use server";

import { signedSourceUrlInput } from "@/server/validation";
import { getSignedSourceUrlForSnapshot } from "@/server/services/evidence-foundation-service";
import { assertEfesoAccess } from "@/server/access/require-efeso-access";

export async function createSourceFileSignedUrlAction(
  snapshotId: string,
): Promise<{ ok: true; url: string } | { ok: false; error: "invalid" | "unavailable" }> {
  try {
    await assertEfesoAccess();
  } catch {
    return { ok: false, error: "unavailable" };
  }
  const parsed = signedSourceUrlInput.safeParse({ snapshotId });
  if (!parsed.success) return { ok: false, error: "invalid" };
  try {
    const url = await getSignedSourceUrlForSnapshot(parsed.data.snapshotId);
    return { ok: true, url };
  } catch {
    return { ok: false, error: "unavailable" };
  }
}
