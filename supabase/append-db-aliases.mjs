import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const target = join(root, "src/types/database.ts");
const marker = "export type AnalysisRecord =";
const aliases = `
/** Convenience aliases. Distinct from frontend/demo intelligence domain types. */
export type WorkspaceRow = Database["public"]["Tables"]["workspaces"]["Row"]
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"]
export type WorkspaceMembershipRow = Database["public"]["Tables"]["workspace_memberships"]["Row"]
export type CompanyRow = Database["public"]["Tables"]["companies"]["Row"]
export type CompanyEntityRow = Database["public"]["Tables"]["company_entities"]["Row"]
export type AnalysisRecord = Database["public"]["Tables"]["analyses"]["Row"]
export type ResearchRunRecord = Database["public"]["Tables"]["research_runs"]["Row"]
`;

const current = readFileSync(target, "utf8");
if (!current.includes(marker)) {
  writeFileSync(target, `${current.trimEnd()}\n${aliases}`);
}
