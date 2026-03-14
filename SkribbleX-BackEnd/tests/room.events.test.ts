// tests/room.events.test.ts
import { registerRoomEvents } from "../src/events/room.events";
import * as roomService from "../src/services/room.service";

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("../src/services/room.service");
jest.mock("../src/utils/LogHelper", () => ({
  LogHelper: { logInfo: jest.fn() },
}));

const mockedService = roomService as jest.Mocked<typeof roomService>;

// Minimaler Socket-Mock
function makeSocket(id = "socket-1") {
  const handlers: Record<string, Function> = {};
  return {
    id,
    on: jest.fn((event: string, handler: Function) => {
      handlers[event] = handler;
    }),
    emit: jest.fn(),
    to: jest.fn().mockReturnThis(),
    join: jest.fn(),
    leave: jest.fn(),
    // Event manuell feuern
    fire: (event: string, ...args: any[]) => handlers[event]?.(...args),
  };
}

// Minimaler IO-Mock
function makeIo() {
  const io = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  };
  // io.to(...).emit(...) soll auf io.emit landen
  io.to.mockReturnValue(io);
  return io;
}

// Basis-Setup
function setup(socketId = "socket-1") {
  const socket = makeSocket(socketId);
  const io = makeIo();
  registerRoomEvents(io as any, socket as any);
  return { socket, io };
}

// Fake RoomState
function fakeRoom(
  overrides: Partial<ReturnType<typeof roomService.getRoomPublic>> = {},
) {
  return {
    roomID: "ROOM1",
    players: {
      "socket-1": {
        playerID: "p1",
        socketId: "socket-1",
        name: "Alice",
        score: 0,
        hasGuessed: false,
      },
      "socket-2": {
        playerID: "p2",
        socketId: "socket-2",
        name: "Bob",
        score: 0,
        hasGuessed: false,
      },
    },
    hostId: "socket-1",
    drawerId: "socket-1",
    word: "Katze",
    round: 1,
    maxRounds: 3,
    roundDurationMs: 80_000,
    phase: "playing" as const,
    guessedPlayerIds: new Set<string>(),
    roundStartedAt: Date.now(),
    roundTimerHandle: null,
    strokeHistory: [],
    language: "de" as const,
    categories: ["Tiere"],
    ...overrides,
  };
}

function fakePublicRoom() {
  return {
    roomID: "ROOM1",
    players: [],
    hostId: "socket-1",
    drawerId: "socket-1",
    round: 1,
    maxRounds: 3,
    phase: "playing" as const,
    wordLength: 5,
    currentHint: "_____",
    timeLeftMs: 70_000,
    language: "de" as const,
    categories: ["Tiere"],
    availableCategories: ["Tiere", "Sport"],
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedService.getRoomPublic.mockReturnValue(fakePublicRoom());
});

// ─── room:create ─────────────────────────────────────────────────────────────

describe("room:create", () => {
  it("ruft createRoom auf und gibt roomID zurück", () => {
    mockedService.createRoom.mockReturnValue("ROOM1");
    const { socket } = setup();
    const cb = jest.fn();
    socket.fire("room:create", {}, cb);
    expect(mockedService.createRoom).toHaveBeenCalled();
    expect(cb).toHaveBeenCalledWith({ ok: true, roomID: "ROOM1" });
  });

  it("gibt ok:false zurück bei Fehler", () => {
    mockedService.createRoom.mockImplementation(() => {
      throw { message: "fail" };
    });
    const { socket } = setup();
    const cb = jest.fn();
    socket.fire("room:create", {}, cb);
    expect(cb).toHaveBeenCalledWith({ ok: false, error: "fail" });
  });

  it("funktioniert auch ohne callback", () => {
    mockedService.createRoom.mockReturnValue("ROOM1");
    const { socket } = setup();
    expect(() => socket.fire("room:create", {})).not.toThrow();
  });
});

// ─── room:join ───────────────────────────────────────────────────────────────

describe("room:join", () => {
  it("joined Socket dem Room und ruft callback mit Raum auf", () => {
    mockedService.joinRoom.mockReturnValue({ room: fakeRoom(), reconnected: false } as any);
    const { socket } = setup();
    const cb = jest.fn();
    socket.fire(
      "room:join",
      { roomID: "ROOM1", playerID: "p1", name: "Alice" },
      cb,
    );
    expect(socket.join).toHaveBeenCalledWith("ROOM1");
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
  });

  it("emittet room:player-joined an andere Spieler", () => {
    mockedService.joinRoom.mockReturnValue({ room: fakeRoom(), reconnected: false } as any);
    const { socket } = setup();
    socket.fire(
      "room:join",
      { roomID: "ROOM1", playerID: "p1", name: "Alice" },
      jest.fn(),
    );
    expect(socket.to).toHaveBeenCalledWith("ROOM1");
    expect(socket.emit).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
    );
  });

  it("gibt ok:false bei Fehler zurück", () => {
    mockedService.joinRoom.mockImplementation(() => {
      throw { message: "Room not found" };
    });
    const { socket } = setup();
    const cb = jest.fn();
    socket.fire(
      "room:join",
      { roomID: "NOPE", playerID: "p1", name: "Alice" },
      cb,
    );
    expect(cb).toHaveBeenCalledWith({ ok: false, error: "Room not found" });
  });
});

// ─── room:leave ──────────────────────────────────────────────────────────────

describe("room:leave", () => {
  it("ruft leaveRoom auf", () => {
    mockedService.leaveRoom.mockReturnValue(fakeRoom() as any);
    const { socket } = setup();
    socket.fire("room:leave", { roomID: "ROOM1" });
    expect(mockedService.leaveRoom).toHaveBeenCalledWith("ROOM1", "socket-1");
  });

  it("emittet room:player-left wenn Raum noch existiert", () => {
    mockedService.leaveRoom.mockReturnValue(fakeRoom() as any);
    const { socket, io } = setup();
    socket.fire("room:leave", { roomID: "ROOM1" });
    expect(io.emit).toHaveBeenCalledWith(
      "room:player-left",
      expect.any(Object),
    );
  });

  it("emittet nichts wenn Raum nach Leave leer ist", () => {
    mockedService.leaveRoom.mockReturnValue(null);
    const { io } = setup();
    const { socket } = setup();
    socket.fire("room:leave", { roomID: "ROOM1" });
    expect(io.emit).not.toHaveBeenCalled();
  });
});

// ─── disconnect ──────────────────────────────────────────────────────────────

describe("disconnect", () => {
  it("ruft leaveRoom auf wenn Socket in einem Raum war", () => {
    mockedService.joinRoom.mockReturnValue({ room: fakeRoom(), reconnected: false } as any);
    mockedService.leaveRoom.mockReturnValue(null);
    const { socket } = setup();
    // Erst joinen damit Mapping existiert
    socket.fire(
      "room:join",
      { roomID: "ROOM1", playerID: "p1", name: "Alice" },
      jest.fn(),
    );
    socket.fire("disconnect");
    expect(mockedService.leaveRoom).toHaveBeenCalledWith("ROOM1", "socket-1");
  });

  it("tut nichts wenn Socket in keinem Raum war", () => {
    const { socket } = setup();
    expect(() => socket.fire("disconnect")).not.toThrow();
    expect(mockedService.leaveRoom).not.toHaveBeenCalled();
  });
});

// ─── lobby:settings ──────────────────────────────────────────────────────────

describe("lobby:settings", () => {
  it("ruft updateSettings auf", () => {
    mockedService.updateSettings.mockReturnValue(fakeRoom() as any);
    const { socket } = setup();
    const cb = jest.fn();
    socket.fire("lobby:settings", { roomID: "ROOM1", language: "en" }, cb);
    expect(mockedService.updateSettings).toHaveBeenCalledWith(
      "ROOM1",
      "socket-1",
      expect.objectContaining({ language: "en" }),
    );
  });

  it("broadcastet lobby:settings-updated an alle im Raum", () => {
    mockedService.updateSettings.mockReturnValue(fakeRoom() as any);
    const { socket, io } = setup();
    socket.fire(
      "lobby:settings",
      { roomID: "ROOM1", language: "en" },
      jest.fn(),
    );
    expect(io.emit).toHaveBeenCalledWith(
      "lobby:settings-updated",
      expect.any(Object),
    );
  });

  it("gibt ok:true zurück bei Erfolg", () => {
    mockedService.updateSettings.mockReturnValue(fakeRoom() as any);
    const { socket } = setup();
    const cb = jest.fn();
    socket.fire("lobby:settings", { roomID: "ROOM1" }, cb);
    expect(cb).toHaveBeenCalledWith({ ok: true });
  });

  it("gibt ok:false bei Fehler zurück", () => {
    mockedService.updateSettings.mockImplementation(() => {
      throw { message: "Only the host can change settings" };
    });
    const { socket } = setup();
    const cb = jest.fn();
    socket.fire("lobby:settings", { roomID: "ROOM1" }, cb);
    expect(cb).toHaveBeenCalledWith({
      ok: false,
      error: "Only the host can change settings",
    });
  });
});

// ─── game:start ──────────────────────────────────────────────────────────────

describe("game:start", () => {
  it("ruft startGame auf", () => {
    mockedService.startGame.mockReturnValue(fakeRoom() as any);
    const { socket } = setup();
    socket.fire("game:start", { roomID: "ROOM1" }, jest.fn());
    expect(mockedService.startGame).toHaveBeenCalledWith(
      "ROOM1",
      "socket-1",
      expect.any(Function),
      expect.any(Function),
    );
  });

  it("emittet game:selecting-word an alle", () => {
    mockedService.startGame.mockReturnValue(fakeRoom() as any);
    const { socket, io } = setup();
    socket.fire("game:start", { roomID: "ROOM1" }, jest.fn());
    expect(io.emit).toHaveBeenCalledWith(
      "game:selecting-word",
      expect.any(Object),
    );
  });

  it("emittet game:word-choices nur an den Drawer", () => {
    mockedService.startGame.mockReturnValue(fakeRoom() as any);
    const { socket, io } = setup();
    socket.fire("game:start", { roomID: "ROOM1" }, jest.fn());
    expect(io.to).toHaveBeenCalledWith("socket-1"); // drawerId
    expect(io.emit).toHaveBeenCalledWith(
      "game:word-choices",
      expect.any(Object),
    );
  });

  it("gibt ok:true zurück", () => {
    mockedService.startGame.mockReturnValue(fakeRoom() as any);
    const { socket } = setup();
    const cb = jest.fn();
    socket.fire("game:start", { roomID: "ROOM1" }, cb);
    expect(cb).toHaveBeenCalledWith({ ok: true });
  });

  it("gibt ok:false bei Fehler zurück", () => {
    mockedService.startGame.mockImplementation(() => {
      throw { message: "Only the host can start the game" };
    });
    const { socket } = setup();
    const cb = jest.fn();
    socket.fire("game:start", { roomID: "ROOM1" }, cb);
    expect(cb).toHaveBeenCalledWith({
      ok: false,
      error: "Only the host can start the game",
    });
  });
});

// ─── game:guess ──────────────────────────────────────────────────────────────

describe("game:guess", () => {
  it("emittet game:guess-correct an Guesser bei richtigem Guess", () => {
    mockedService.processGuess.mockReturnValue({
      result: "correct",
      room: fakeRoom() as any,
      roundOver: false,
    });
    const { socket } = setup();
    socket.fire("game:guess", { roomID: "ROOM1", guess: "Katze" }, jest.fn());
    expect(socket.emit).toHaveBeenCalledWith(
      "game:guess-correct",
      expect.any(Object),
    );
  });

  it("emittet game:player-guessed an andere bei richtigem Guess", () => {
    mockedService.processGuess.mockReturnValue({
      result: "correct",
      room: fakeRoom() as any,
      roundOver: false,
    });
    const { socket } = setup();
    socket.fire("game:guess", { roomID: "ROOM1", guess: "Katze" }, jest.fn());
    expect(socket.to).toHaveBeenCalledWith("ROOM1");
  });

  it("emittet room:message bei falschem Guess", () => {
    mockedService.processGuess.mockReturnValue({
      result: "wrong",
      room: fakeRoom() as any,
      roundOver: false,
    });
    const { socket, io } = setup();
    socket.fire("game:guess", { roomID: "ROOM1", guess: "Hund" }, jest.fn());
    expect(io.emit).toHaveBeenCalledWith(
      "room:message",
      expect.objectContaining({ type: "guess", text: "Hund" }),
    );
  });

  it("emittet nichts bei drawer-Result", () => {
    mockedService.processGuess.mockReturnValue({
      result: "drawer",
      room: fakeRoom() as any,
      roundOver: false,
    });
    const { socket, io } = setup();
    socket.fire("game:guess", { roomID: "ROOM1", guess: "Katze" }, jest.fn());
    expect(io.emit).not.toHaveBeenCalled();
    expect(socket.emit).not.toHaveBeenCalled();
  });

  it("emittet game:round-ended wenn roundOver true", () => {
    mockedService.processGuess.mockReturnValue({
      result: "correct",
      room: fakeRoom({ phase: "roundEnd" }) as any,
      roundOver: true,
    });
    const { socket, io } = setup();
    socket.fire("game:guess", { roomID: "ROOM1", guess: "Katze" }, jest.fn());
    expect(io.emit).toHaveBeenCalledWith(
      "game:round-ended",
      expect.objectContaining({ word: "Katze" }),
    );
  });

  it("emittet game:ended nach Verzögerung wenn roundOver true und gameEnd", () => {
    jest.useFakeTimers();
    mockedService.getRoom.mockReturnValue(
      fakeRoom({ phase: "gameEnd" }) as any,
    );
    mockedService.processGuess.mockReturnValue({
      result: "correct",
      room: fakeRoom({ phase: "gameEnd" }) as any,
      roundOver: true,
    });
    const { socket, io } = setup();
    socket.fire("game:guess", { roomID: "ROOM1", guess: "Katze" }, jest.fn());
    // game:round-ended wird sofort gesendet, game:ended nach ROUND_END_DELAY_MS
    expect(io.emit).toHaveBeenCalledWith(
      "game:round-ended",
      expect.objectContaining({ word: "Katze" }),
    );
    jest.advanceTimersByTime(5_000);
    expect(io.emit).toHaveBeenCalledWith("game:ended", expect.any(Object));
    jest.useRealTimers();
  });

  it("gibt ok:false bei Fehler zurück", () => {
    mockedService.processGuess.mockImplementation(() => {
      throw { message: "Game is not running" };
    });
    const { socket } = setup();
    const cb = jest.fn();
    socket.fire("game:guess", { roomID: "ROOM1", guess: "Katze" }, cb);
    expect(cb).toHaveBeenCalledWith({
      ok: false,
      error: "Game is not running",
    });
  });
});

// ─── room:message ────────────────────────────────────────────────────────────

describe("room:message", () => {
  it("broadcastet Chat-Nachricht in der Lobby", () => {
    mockedService.getRoom.mockReturnValue(fakeRoom({ phase: "lobby" }) as any);
    const { socket, io } = setup();
    socket.fire("room:message", { roomID: "ROOM1", text: "Hallo!" });
    expect(io.emit).toHaveBeenCalledWith(
      "room:message",
      expect.objectContaining({ type: "chat", text: "Hallo!" }),
    );
  });

  it("blockiert Nachrichten während playing", () => {
    mockedService.getRoom.mockReturnValue(
      fakeRoom({ phase: "playing" }) as any,
    );
    const { socket, io } = setup();
    socket.fire("room:message", { roomID: "ROOM1", text: "Ich cheat" });
    expect(io.emit).not.toHaveBeenCalled();
  });

  it("blockiert leere Nachrichten", () => {
    mockedService.getRoom.mockReturnValue(fakeRoom({ phase: "lobby" }) as any);
    const { socket, io } = setup();
    socket.fire("room:message", { roomID: "ROOM1", text: "   " });
    expect(io.emit).not.toHaveBeenCalled();
  });

  it("kürzt Text auf 200 Zeichen", () => {
    mockedService.getRoom.mockReturnValue(fakeRoom({ phase: "lobby" }) as any);
    const { socket, io } = setup();
    socket.fire("room:message", { roomID: "ROOM1", text: "A".repeat(300) });
    const call = io.emit.mock.calls.find(
      ([event]: [string]) => event === "room:message",
    );
    expect(call?.[1].text).toHaveLength(200);
  });

  it("tut nichts wenn Raum nicht existiert", () => {
    mockedService.getRoom.mockReturnValue(undefined);
    const { socket, io } = setup();
    expect(() =>
      socket.fire("room:message", { roomID: "NOPE", text: "hi" }),
    ).not.toThrow();
    expect(io.emit).not.toHaveBeenCalled();
  });
});

// ─── draw:stroke ─────────────────────────────────────────────────────────────

describe("draw:stroke", () => {
  it("broadcastet Strokes von Drawer an andere", () => {
    mockedService.getRoom.mockReturnValue(
      fakeRoom({ drawerId: "socket-1" }) as any,
    );
    const { socket } = setup("socket-1");
    socket.fire("draw:stroke", { roomID: "ROOM1", strokes: [{ x: 1, y: 2 }] });
    expect(socket.to).toHaveBeenCalledWith("ROOM1");
  });

  it("blockiert Strokes von Nicht-Drawer", () => {
    mockedService.getRoom.mockReturnValue(
      fakeRoom({ drawerId: "socket-2" }) as any,
    );
    const { socket } = setup("socket-1");
    socket.fire("draw:stroke", { roomID: "ROOM1", strokes: [] });
    expect(socket.to).not.toHaveBeenCalled();
  });

  it("blockiert Strokes wenn Phase nicht playing", () => {
    mockedService.getRoom.mockReturnValue(
      fakeRoom({ drawerId: "socket-1", phase: "lobby" }) as any,
    );
    const { socket } = setup("socket-1");
    socket.fire("draw:stroke", { roomID: "ROOM1", strokes: [] });
    expect(socket.to).not.toHaveBeenCalled();
  });

  it("tut nichts wenn Raum nicht existiert", () => {
    mockedService.getRoom.mockReturnValue(undefined);
    const { socket } = setup();
    expect(() =>
      socket.fire("draw:stroke", { roomID: "NOPE", strokes: [] }),
    ).not.toThrow();
  });
});

// ─── draw:clear ──────────────────────────────────────────────────────────────

describe("draw:clear", () => {
  it("broadcastet draw:clear von Drawer", () => {
    mockedService.getRoom.mockReturnValue(
      fakeRoom({ drawerId: "socket-1" }) as any,
    );
    const { socket } = setup("socket-1");
    socket.fire("draw:clear", { roomID: "ROOM1" });
    expect(socket.to).toHaveBeenCalledWith("ROOM1");
  });

  it("blockiert draw:clear von Nicht-Drawer", () => {
    mockedService.getRoom.mockReturnValue(
      fakeRoom({ drawerId: "socket-2" }) as any,
    );
    const { socket } = setup("socket-1");
    socket.fire("draw:clear", { roomID: "ROOM1" });
    expect(socket.to).not.toHaveBeenCalled();
  });
});
