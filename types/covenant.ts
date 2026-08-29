export type ComponentStatus = "draft" | "testing" | "active" | "blocked" | "verified";

export type CovenantComponent = {
  name: string;
  authority: string;
  output: string;
  status: ComponentStatus;
};

export type Invariant = {
  id: string;
  rule: string;
  owner: string;
};

export type DemoStep = {
  timebox: string;
  screen: string;
  action: string;
};

export type RiskProfile = {
  name: string;
  perTrade: string;
  portfolioHeat: string;
  dailyHalt: string;
};
