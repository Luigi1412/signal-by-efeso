const FORBIDDEN_OUTREACH = [
  "send email",
  "enviar e-mail",
  "schedule meeting",
  "agendar reunião",
  "send proposal",
  "enviar proposta",
  "call the client",
  "ligar para o cliente",
  "contact ceo",
  "contact the ceo",
  "call client",
];

export function detectForbiddenOutreach(text: string): boolean {
  const hay = text.toLowerCase();
  return FORBIDDEN_OUTREACH.some((phrase) => hay.includes(phrase));
}

export function detectInventedOwner(text: string, ownerKnown: boolean): boolean {
  if (ownerKnown) return false;
  return /\b(partner [a-z]|consultant [a-z]|account owner is)\b/i.test(text);
}

export function detectRelationshipOverclaim(text: string, strengthUnknown: boolean): boolean {
  if (!strengthUnknown) return false;
  return /relationship is weak|relacionamento (é|e) fraco|no relationship exists|não há relacionamento/i.test(text);
}
