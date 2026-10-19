import { ui } from "@/i18n";
import { getLanguageModelProviderName, getOllamaExtractionModel, getOpenAiApiKey } from "@/server/ai/config";

export function OpenAiStatusBanner() {
  const provider = getLanguageModelProviderName();
  if (provider === "ollama") {
    const model = getOllamaExtractionModel();
    return (
      <p className="rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
        {ui.admin.localModelActive}
        {model ? ` · ${model}` : ""}
      </p>
    );
  }
  if (getOpenAiApiKey()) return null;
  return (
    <p className="rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
      {ui.admin.openaiNotConfigured}
    </p>
  );
}
