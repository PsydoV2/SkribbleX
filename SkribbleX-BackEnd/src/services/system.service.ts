import { DTOSystemHealth } from "../types/DTOSystemHealth";
import { getIO } from "../config/socket.config";
import { getActiveRoomCount } from "./room.service";

export const SystemService = {
  async health(): Promise<DTOSystemHealth> {
    const isSocketHealthy = getIO() !== null;

    return {
      status: isSocketHealthy ? "UP" : "DOWN",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      services: {
        socket: isSocketHealthy ? "healthy" : "unhealthy",
      },
      rooms: {
        active: getActiveRoomCount(),
      },
    };
  },
};
