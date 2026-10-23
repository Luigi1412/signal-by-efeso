import assert from "node:assert/strict";
import test from "node:test";
import { validatedFitChain } from "./fit-chain";
import type { EfesoFitValidationOutput } from "@/server/ai/schemas/efeso-fit-validation-schema";

const chain = {movement:"A empresa anunciou uma fábrica",operational_implication:"Será necessário preparar a operação",possible_need:"Preparação do ramp-up",fit_rationale:"Capability de ramp-up",uncertainty:"O plano de execução não é público",client_validation:"Validar cronograma e gargalos",supporting_signal_ids:["signal-1"]} as EfesoFitValidationOutput;
test("Fit requires the complete operational chain and a known supporting movement",()=>{
  assert.equal(validatedFitChain(chain,["signal-1"])?.possibleNeed,"Preparação do ramp-up");
  assert.equal(validatedFitChain({...chain,operational_implication:null},["signal-1"]),null);
  assert.equal(validatedFitChain({...chain,client_validation:" "},["signal-1"]),null);
  assert.equal(validatedFitChain({...chain,supporting_signal_ids:[]},["signal-1"]),null);
  assert.equal(validatedFitChain(chain,["another-signal"]),null);
});
