export type EcsDetail = {
  eventName?: undefined | string;
  eventType?:
    | undefined
    | "SERVICE_TASK_DEFINITION_UPDATED"
    | "SERVICE_STEADY_STATE"
    | "SERVICE_DEPLOYMENT_COMPLETED"
    | "SERVICE_DEPLOYMENT_IN_PROGRESS"
    | "SERVICE_DEPLOYMENT_FAILED";
  serviceName?: undefined | string;
  serviceArn?: undefined | string;
  desiredCount?: undefined | number;
  runningCount?: undefined | number;
  pendingCount?: undefined | number;
  deploymentId?: undefined | string;
  clusterArn: string;
  taskArn?: undefined | string;
  taskDefinitionArn?: undefined | string;
  lastStatus?:
    | undefined
    | "PENDING"
    | "STOPPED"
    | "RUNNING"
    | "ACTIVATING"
    | "STOPPING"
    | "DEPROVISIONING";
  desiredStatus?: undefined | "STOPPED" | "RUNNING";
  startedAt?: undefined | string;
  stoppedAt?: undefined | string;
  stoppedReason?: undefined | string;
  stopCode?: undefined | string;
  executionStoppedAt?: undefined | string;
  stoppingAt?: undefined | string;
  exitCode?: undefined | number;
  connectivity?: undefined | "CONNECTED" | "DISCONNECTED";
  connectivityAt?: undefined | string;
  createdAt?: undefined | string;
  updatedAt?: undefined | string;
  version?: undefined | number;
  group?: undefined | string;
  cpu?: undefined | string;
  memory?: undefined | string;
  availabilityZone?: undefined | string;
  launchType?: undefined | string;
  platformVersion?: undefined | string;
  pullStartedAt?: undefined | string;
  pullStoppedAt?: undefined | string;
  containers?:
    | undefined
    | {
        name: string;
        lastStatus: string;
        exitCode?: undefined | number;
        image?: undefined | string;
        imageDigest?: undefined | string;
        runtimeId?: undefined | string;
        taskArn?: undefined | string;
        networkInterfaces?:
          | undefined
          | {
              attachmentId: string;
              privateIpv4Address: string;
            }[];
        cpu?: undefined | string;
      }[];
};
