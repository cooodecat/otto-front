import type { CICDNodeData } from "./CICDNodeData";

export type PipelineData = {
  flowNodes?: undefined | CICDNodeData[];
} & {
  [key: string]: any;
};
