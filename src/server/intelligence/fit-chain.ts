import type { EfesoFitValidationOutput } from "@/server/ai/schemas/efeso-fit-validation-schema";
export interface FitOperationalChain {
  movement:string;operationalImplication:string;possibleNeed:string;fitRationale:string;uncertainty:string;clientValidation:string;signalIds:string[];
}
export function validatedFitChain(output:EfesoFitValidationOutput,signalIds:readonly string[]):FitOperationalChain|null {
  const fields=[output.movement,output.operational_implication,output.possible_need,output.fit_rationale,output.uncertainty,output.client_validation];
  if(fields.some(value=>!value?.trim())) return null;
  const linked=[...new Set(output.supporting_signal_ids??[])];
  if(linked.length===0||linked.some(id=>!signalIds.includes(id))) return null;
  return {movement:fields[0]!,operationalImplication:fields[1]!,possibleNeed:fields[2]!,fitRationale:fields[3]!,uncertainty:fields[4]!,clientValidation:fields[5]!,signalIds:linked};
}
