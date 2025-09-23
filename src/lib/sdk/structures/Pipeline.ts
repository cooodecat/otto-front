import type { Format } from "typia/lib/tags/Format";

import type { Project } from "./Project";

export type Pipeline = {
  pipelineId: string;
  projectId: string;
  project: Project;
  data: any;
  pipelineName: string;
  createdAt: string & Format<"date-time">;
  updatedAt: string & Format<"date-time">;
};
