export type AlbDetail = {
  targetGroupArn: string;
  target: {
    id: string;
    port: number;
    availabilityZone?: undefined | string;
  };
  state: "draining" | "healthy" | "unavailable" | "unhealthy";
  stateTransitionReason?: undefined | string;
  timestamp: string;
};
