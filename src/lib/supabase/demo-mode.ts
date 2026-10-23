export function demoModeEnabled(nodeEnv:string|undefined,demoMode:string|undefined,demoAuthMode:string|undefined):boolean {
  if(nodeEnv==="production") return false;
  const explicit=demoMode?.trim().toLowerCase();
  if(explicit==="true") return true;
  if(explicit==="false") return false;
  return demoAuthMode==="true";
}
