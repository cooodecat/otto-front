import type { AlbDetail } from "./AlbDetail";
import type { CodeBuildDetail } from "./CodeBuildDetail";
import type { EcsDetail } from "./EcsDetail";

export type EventBridgeEvent = {
  id: string;
  version: string;
  account: string;
  time: string;
  region: string;
  source: string;
  resources: string[];
  "detail-type": string;
  detail: CodeBuildDetail | EcsDetail | AlbDetail;
};
