export const ACTION_SEMANTIC_VALIDATION_INSTRUCTIONS = `Validate a Recommended Action candidate.

Fail if the text:
- invents a relationship;
- invents an account owner;
- treats unknown relationship as weak or absent;
- recommends executable outreach (email, meeting, proposal, call);
- turns an opportunity hypothesis into a confirmed client need;
- raises priority above the deterministic value.

Unknown relationship must remain unknown.
store:false. No tools.`;
