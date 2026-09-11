export interface DTOSystemHealth {
  status: "UP" | "DOWN";
  timestamp: string;
  uptimeSeconds: number;
  services: {
    socket: "healthy" | "unhealthy";
  };
  rooms: {
    active: number;
  };
}
