import { requireEfesoAdmin } from "@/server/access/require-efeso-access";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireEfesoAdmin();
  return children;
}
