import type { CodeBuildDetail } from "./CodeBuildDetail";

export type EventBridgeEvent = {
  id: string;
  version: string;
  account: string;
  time: string;
  region: string;
  source: string;
  resources: string[];
  "detail-type": string;
  detail: CodeBuildDetail;
};
