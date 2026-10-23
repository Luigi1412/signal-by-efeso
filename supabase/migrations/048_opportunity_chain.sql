ALTER TABLE public.opportunity_rationales DROP CONSTRAINT opportunity_rationales_type_check;
ALTER TABLE public.opportunity_rationales ADD CONSTRAINT opportunity_rationales_type_check CHECK(rationale_type IN (
 'signal_trigger','account_context','efeso_relevance','supporting_case','urgency_reason','uncertainty',
 'operational_implication','potential_need','client_validation','next_step'));
