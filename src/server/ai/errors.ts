export class ControlledExtractionDisabledError extends Error {
  constructor() {
    super("Controlled extraction is disabled.");
    this.name = "ControlledExtractionDisabledError";
  }
}

export class UnsupportedDocumentTypeError extends Error {
  constructor(message = "Unsupported document type.") {
    super(message);
    this.name = "UnsupportedDocumentTypeError";
  }
}

export class DocumentTooLargeError extends Error {
  constructor(message = "Document exceeds the controlled extraction size limit.") {
    super(message);
    this.name = "DocumentTooLargeError";
  }
}

export class DocumentNeedsOcrError extends Error {
  constructor() {
    super("This PDF has no usable text layer. OCR is not implemented.");
    this.name = "DocumentNeedsOcrError";
  }
}

export class DocumentParseError extends Error {
  constructor(message = "The document could not be parsed.") {
    super(message);
    this.name = "DocumentParseError";
  }
}

export class ModelProviderUnavailableError extends Error {
  constructor(message = "The language model provider is unavailable.") {
    super(message);
    this.name = "ModelProviderUnavailableError";
  }
}

export class ModelRefusalError extends Error {
  constructor(message = "The model refused to complete the request.") {
    super(message);
    this.name = "ModelRefusalError";
  }
}

export class ModelIncompleteResponseError extends Error {
  constructor(message = "The model response was incomplete.") {
    super(message);
    this.name = "ModelIncompleteResponseError";
  }
}

export class CandidateValidationError extends Error {
  constructor(message = "Candidate validation failed.") {
    super(message);
    this.name = "CandidateValidationError";
  }
}

export class PromotionError extends Error {
  constructor(message = "Candidate promotion failed.") {
    super(message);
    this.name = "PromotionError";
  }
}

export function publicExtractionErrorMessage(error: unknown): string {
  if (error instanceof ControlledExtractionDisabledError) return "A extração controlada está desativada.";
  if (error instanceof UnsupportedDocumentTypeError) return "Tipo de documento não suportado. Use .txt ou PDF com camada de texto.";
  if (error instanceof DocumentTooLargeError) return error.message;
  if (error instanceof DocumentNeedsOcrError) {
    return "Este PDF não tem camada de texto utilizável. OCR está fora do escopo do Sprint 3.";
  }
  if (error instanceof DocumentParseError) return "Não foi possível interpretar o documento.";
  if (error instanceof ModelProviderUnavailableError) {
    const message = error.message.toLowerCase();
    if (message.includes("ollama")) {
      return "O mecanismo local de análise não está disponível.";
    }
    if (message.includes("openai_api_key") || message.includes("not configured")) {
      return "OpenAI não configurada neste ambiente.";
    }
    return "O provedor de modelo está indisponível.";
  }
  if (error instanceof ModelRefusalError) return "O modelo recusou a extração deste conteúdo.";
  if (error instanceof ModelIncompleteResponseError) return "A resposta do modelo ficou incompleta.";
  if (error instanceof PromotionError) return "A promoção do achado falhou.";
  return "Não foi possível concluir a extração controlada.";
}
