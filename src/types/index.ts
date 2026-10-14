export * from "./common";
export * from "./company";
export * from "./evidence";
export * from "./signal";
export * from "./opportunity";
export * from "./analysis";
export * from "./report";

export interface CurrentUser {
  name: string;
  role: string;
  organization: string;
  initials: string;
}
