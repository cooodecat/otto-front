export type CodeBuildDetail = {
  "build-status": "FAILED" | "IN_PROGRESS" | "STOPPED" | "SUCCEEDED";
  "build-id": string;
  "project-name": string;
  "current-phase"?: undefined | string;
  "current-phase-context"?: undefined | string;
  "additional-information"?:
    | undefined
    | {
        "build-complete"?: undefined | boolean;
        "build-number"?: undefined | number;
        initiator?: undefined | string;
        "start-time"?: undefined | string;
        "end-time"?: undefined | string;
        environment?:
          | undefined
          | {
              "environment-variables"?:
                | undefined
                | {
                    name: string;
                    value: string;
                    type?: undefined | string;
                  }[];
            };
        logs?:
          | undefined
          | {
              "group-name"?: undefined | string;
              "stream-name"?: undefined | string;
              "deep-link"?: undefined | string;
            };
      };
};
