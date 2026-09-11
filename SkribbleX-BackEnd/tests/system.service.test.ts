// tests/system.service.test.ts
import { SystemService } from "../src/services/system.service";
import { getIO } from "../src/config/socket.config";
import { getActiveRoomCount } from "../src/services/room.service";

jest.mock("../src/config/socket.config");
jest.mock("../src/services/room.service");

const mockedGetIO = getIO as jest.Mock;
const mockedGetActiveRoomCount = getActiveRoomCount as jest.Mock;

afterEach(() => {
  jest.clearAllMocks();
});

describe("SystemService.health", () => {
  it("reports UP with a healthy socket service once Socket.io is initialized", async () => {
    mockedGetIO.mockReturnValue({});
    mockedGetActiveRoomCount.mockReturnValue(3);

    const result = await SystemService.health();

    expect(result.status).toBe("UP");
    expect(result.services.socket).toBe("healthy");
    expect(result.rooms.active).toBe(3);
    expect(typeof result.timestamp).toBe("string");
    expect(typeof result.uptimeSeconds).toBe("number");
  });

  it("reports DOWN with an unhealthy socket service before Socket.io is initialized", async () => {
    mockedGetIO.mockReturnValue(null);
    mockedGetActiveRoomCount.mockReturnValue(0);

    const result = await SystemService.health();

    expect(result.status).toBe("DOWN");
    expect(result.services.socket).toBe("unhealthy");
  });
});
