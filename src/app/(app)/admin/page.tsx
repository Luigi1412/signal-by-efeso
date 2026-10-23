import type { Metadata } from "next";
import { AdminOverview } from "@/components/admin/admin-overview";
import { OpenAiStatusBanner } from "@/components/admin/openai-status-banner";
import { ui } from "@/i18n";

export const metadata: Metadata = { title: ui.admin.title };
export default function AdminPage() {
  return <AdminOverview statusBanner={<OpenAiStatusBanner />} />;
}
