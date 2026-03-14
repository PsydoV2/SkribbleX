// tests/room.service.test.ts
import {
  createRoom,
  getRoom,
  joinRoom,
  leaveRoom,
  startGame,
  selectWord,
  processGuess,
  endRound,
  nextRound,
  getRoomPublic,
  updateSettings,
} from "../src/services/room.service";

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("../src/services/word.service", () => ({
  WordService: {
    getRandomWord: jest.fn(() => "Katze"),
    getRandomWords: jest.fn(() => ["Katze", "Hund", "Pferd"]),
    getCategories: jest.fn((lang: string) =>
      lang === "de"
        ? [
            "Tiere",
            "Essen & Trinken",
            "Sport",
            "Berufe",
            "Natur",
            "Objekte",
            "Fantasy & Mythologie",
            "Fahrzeuge",
          ]
        : [
            "Animals",
            "Food & Drinks",
            "Sports",
            "Jobs",
            "Nature",
            "Objects",
            "Fantasy & Mythology",
            "Vehicles",
          ],
    ),
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setupRoom() {
  return createRoom();
}

function setupRoomWithPlayers(count: number = 2) {
  const roomID = setupRoom();
  const sockets: string[] = [];
  for (let i = 0; i < count; i++) {
    const socketId = `socket-${i}`;
    joinRoom({
      roomID,
      socketId,
      playerID: `player-${i}`,
      name: `Player ${i}`,
    });
    sockets.push(socketId);
  }
  return { roomID, sockets };
}

/**
 * Starts a game AND immediately selects the first word choice,
 * so the room is in "playing" phase when returned.
 */
function setupStartedGame(playerCount: number = 2) {
  const { roomID, sockets } = setupRoomWithPlayers(playerCount);
  const onRoundEnd = jest.fn();
  startGame(roomID, sockets[0], onRoundEnd);
  // Bypass word selection: pick first choice so we're in "playing" phase
  const selRoom = getRoom(roomID)!;
  selectWord(roomID, selRoom.drawerId!, selRoom.wordChoices![0], onRoundEnd);
  return { roomID, sockets, onRoundEnd, room: getRoom(roomID)! };
}

function getNonDrawer(roomID: string, sockets: string[]) {
  return sockets.find((s) => s !== getRoom(roomID)!.drawerId)!;
}

// ─── createRoom ───────────────────────────────────────────────────────────────

describe("createRoom", () => {
  it("gibt eine roomID zurück", () => {
    const roomID = createRoom();
    expect(typeof roomID).toBe("string");
    expect(roomID.length).toBeGreaterThan(0);
  });

  it("jede roomID ist einzigartig", () => {
    const ids = new Set(Array.from({ length: 10 }, () => createRoom()));
    expect(ids.size).toBe(10);
  });

  it("startet in der Lobby-Phase", () => {
    expect(getRoom(createRoom())?.phase).toBe("lobby");
  });

  it("startet ohne Spieler", () => {
    expect(Object.keys(getRoom(createRoom())!.players)).toHaveLength(0);
  });

  it("startet mit Runde 0", () => {
    expect(getRoom(createRoom())!.round).toBe(0);
  });

  it("startet mit Standardsprache Deutsch", () => {
    expect(getRoom(createRoom())!.language).toBe("de");
  });

  it("startet mit allen deutschen Kategorien als Default", () => {
    const room = getRoom(createRoom())!;
    expect(room.categories).toContain("Tiere");
    expect(room.categories.length).toBeGreaterThan(0);
  });

  it("hostId ist null bei leerem Raum", () => {
    expect(getRoom(createRoom())!.hostId).toBeNull();
  });
});

// ─── getRoom ─────────────────────────────────────────────────────────────────

describe("getRoom", () => {
  it("gibt den Raum zurück wenn er existiert", () => {
    const roomID = createRoom();
    expect(getRoom(roomID)).toBeDefined();
  });

  it("gibt undefined zurück wenn Raum nicht existiert", () => {
    expect(getRoom("DOESNOTEXIST")).toBeUndefined();
  });
});

// ─── joinRoom ────────────────────────────────────────────────────────────────

describe("joinRoom", () => {
  it("fügt einen Spieler hinzu", () => {
    const roomID = setupRoom();
    joinRoom({ roomID, socketId: "s1", playerID: "p1", name: "Alice" });
    expect(Object.keys(getRoom(roomID)!.players)).toHaveLength(1);
  });

  it("erster Spieler wird Host", () => {
    const roomID = setupRoom();
    joinRoom({ roomID, socketId: "s1", playerID: "p1", name: "Alice" });
    expect(getRoom(roomID)!.hostId).toBe("s1");
  });

  it("zweiter Spieler wird nicht Host", () => {
    const roomID = setupRoom();
    joinRoom({ roomID, socketId: "s1", playerID: "p1", name: "Alice" });
    joinRoom({ roomID, socketId: "s2", playerID: "p2", name: "Bob" });
    expect(getRoom(roomID)!.hostId).toBe("s1");
  });

  it("Spieler startet mit 0 Punkten", () => {
    const roomID = setupRoom();
    joinRoom({ roomID, socketId: "s1", playerID: "p1", name: "Alice" });
    expect(getRoom(roomID)!.players["s1"].score).toBe(0);
  });

  it("Spieler startet mit hasGuessed = false", () => {
    const roomID = setupRoom();
    joinRoom({ roomID, socketId: "s1", playerID: "p1", name: "Alice" });
    expect(getRoom(roomID)!.players["s1"].hasGuessed).toBe(false);
  });

  it("Name wird auf 32 Zeichen gekürzt", () => {
    const roomID = setupRoom();
    joinRoom({ roomID, socketId: "s1", playerID: "p1", name: "A".repeat(50) });
    expect(getRoom(roomID)!.players["s1"].name).toHaveLength(32);
  });

  it("Name wird getrimmt", () => {
    const roomID = setupRoom();
    joinRoom({ roomID, socketId: "s1", playerID: "p1", name: "  Alice  " });
    expect(getRoom(roomID)!.players["s1"].name).toBe("Alice");
  });

  it("wirft 404 wenn Raum nicht existiert", () => {
    expect(() =>
      joinRoom({
        roomID: "NOPE",
        socketId: "s1",
        playerID: "p1",
        name: "Alice",
      }),
    ).toThrow(expect.objectContaining({ status: 404 }));
  });

  it("wirft 409 wenn dieselbe playerID zweimal joined", () => {
    const roomID = setupRoom();
    joinRoom({ roomID, socketId: "s1", playerID: "p1", name: "Alice" });
    expect(() =>
      joinRoom({ roomID, socketId: "s2", playerID: "p1", name: "Alice2" }),
    ).toThrow(expect.objectContaining({ status: 409 }));
  });

  it("wirft 400 wenn Spiel bereits läuft", () => {
    const { roomID, sockets } = setupRoomWithPlayers(2);
    startGame(roomID, sockets[0], jest.fn());
    expect(() =>
      joinRoom({ roomID, socketId: "s99", playerID: "p99", name: "Late" }),
    ).toThrow(expect.objectContaining({ status: 400 }));
  });
});

// ─── leaveRoom ───────────────────────────────────────────────────────────────

describe("leaveRoom", () => {
  it("entfernt Spieler aus dem Raum", () => {
    const { roomID, sockets } = setupRoomWithPlayers(2);
    leaveRoom(roomID, sockets[1]);
    expect(getRoom(roomID)!.players[sockets[1]]).toBeUndefined();
  });

  it("gibt null zurück und löscht Raum wenn letzter Spieler geht", () => {
    const roomID = setupRoom();
    joinRoom({ roomID, socketId: "s1", playerID: "p1", name: "Alice" });
    expect(leaveRoom(roomID, "s1")).toBeNull();
    expect(getRoom(roomID)).toBeUndefined();
  });

  it("migriert Host wenn Host den Raum verlässt", () => {
    const { roomID, sockets } = setupRoomWithPlayers(2);
    leaveRoom(roomID, sockets[0]);
    expect(getRoom(roomID)!.hostId).toBe(sockets[1]);
  });

  it("Host bleibt unverändert wenn Nicht-Host geht", () => {
    const { roomID, sockets } = setupRoomWithPlayers(2);
    leaveRoom(roomID, sockets[1]);
    expect(getRoom(roomID)!.hostId).toBe(sockets[0]);
  });

  it("gibt null zurück wenn Raum nicht existiert", () => {
    expect(leaveRoom("NOPE", "s1")).toBeNull();
  });

  it("gibt aktualisierten Raum zurück wenn noch Spieler übrig", () => {
    const { roomID, sockets } = setupRoomWithPlayers(3);
    const room = leaveRoom(roomID, sockets[2]);
    expect(room).not.toBeNull();
    expect(Object.keys(room!.players)).toHaveLength(2);
  });

  it("löscht Timer wenn Raum geleert wird", () => {
    jest.useFakeTimers();
    const { roomID, sockets } = setupRoomWithPlayers(2);
    startGame(roomID, sockets[0], jest.fn());
    leaveRoom(roomID, sockets[0]);
    leaveRoom(roomID, sockets[1]);
    // Kein offener Handle – Timer wurde gecleant
    expect(getRoom(roomID)).toBeUndefined();
    jest.useRealTimers();
  });
});

// ─── updateSettings ──────────────────────────────────────────────────────────

describe("updateSettings", () => {
  it("Host kann Sprache auf Englisch ändern", () => {
    const roomID = setupRoom();
    joinRoom({ roomID, socketId: "s1", playerID: "p1", name: "Alice" });
    updateSettings(roomID, "s1", { language: "en" });
    expect(getRoom(roomID)!.language).toBe("en");
  });

  it("Kategorien werden beim Sprachwechsel auf neue Sprache zurückgesetzt", () => {
    const roomID = setupRoom();
    joinRoom({ roomID, socketId: "s1", playerID: "p1", name: "Alice" });
    updateSettings(roomID, "s1", { language: "en" });
    const room = getRoom(roomID)!;
    expect(room.categories).toContain("Animals");
    expect(room.categories).not.toContain("Tiere");
  });

  it("Host kann Kategorien auswählen", () => {
    const roomID = setupRoom();
    joinRoom({ roomID, socketId: "s1", playerID: "p1", name: "Alice" });
    updateSettings(roomID, "s1", { categories: ["Tiere", "Sport"] });
    expect(getRoom(roomID)!.categories).toEqual(["Tiere", "Sport"]);
  });

  it("ungültige Kategorien werden herausgefiltert", () => {
    const roomID = setupRoom();
    joinRoom({ roomID, socketId: "s1", playerID: "p1", name: "Alice" });
    updateSettings(roomID, "s1", { categories: ["Tiere", "UNGÜLTIG"] });
    expect(getRoom(roomID)!.categories).toEqual(["Tiere"]);
  });

  it("wirft 400 wenn alle Kategorien ungültig sind", () => {
    const roomID = setupRoom();
    joinRoom({ roomID, socketId: "s1", playerID: "p1", name: "Alice" });
    expect(() =>
      updateSettings(roomID, "s1", { categories: ["FAKE1", "FAKE2"] }),
    ).toThrow(expect.objectContaining({ status: 400 }));
  });

  it("Host kann maxRounds ändern", () => {
    const roomID = setupRoom();
    joinRoom({ roomID, socketId: "s1", playerID: "p1", name: "Alice" });
    updateSettings(roomID, "s1", { maxRounds: 5 });
    expect(getRoom(roomID)!.maxRounds).toBe(5);
  });

  it("wirft 400 wenn maxRounds < 1", () => {
    const roomID = setupRoom();
    joinRoom({ roomID, socketId: "s1", playerID: "p1", name: "Alice" });
    expect(() => updateSettings(roomID, "s1", { maxRounds: 0 })).toThrow(
      expect.objectContaining({ status: 400 }),
    );
  });

  it("wirft 400 wenn maxRounds > 10", () => {
    const roomID = setupRoom();
    joinRoom({ roomID, socketId: "s1", playerID: "p1", name: "Alice" });
    expect(() => updateSettings(roomID, "s1", { maxRounds: 11 })).toThrow(
      expect.objectContaining({ status: 400 }),
    );
  });

  it("wirft 403 wenn Nicht-Host Settings ändert", () => {
    const { roomID } = setupRoomWithPlayers(2);
    expect(() =>
      updateSettings(roomID, "socket-1", { language: "en" }),
    ).toThrow(expect.objectContaining({ status: 403 }));
  });

  it("wirft 400 wenn Spiel bereits läuft", () => {
    const { roomID, sockets } = setupRoomWithPlayers(2);
    startGame(roomID, sockets[0], jest.fn());
    expect(() =>
      updateSettings(roomID, sockets[0], { language: "en" }),
    ).toThrow(expect.objectContaining({ status: 400 }));
  });

  it("wirft 404 wenn Raum nicht existiert", () => {
    expect(() => updateSettings("NOPE", "s1", { language: "en" })).toThrow(
      expect.objectContaining({ status: 404 }),
    );
  });

  it("mehrere Settings gleichzeitig ändern", () => {
    const roomID = setupRoom();
    joinRoom({ roomID, socketId: "s1", playerID: "p1", name: "Alice" });
    updateSettings(roomID, "s1", {
      language: "en",
      categories: ["Animals"],
      maxRounds: 5,
    });
    const room = getRoom(roomID)!;
    expect(room.language).toBe("en");
    expect(room.categories).toEqual(["Animals"]);
    expect(room.maxRounds).toBe(5);
  });
});

// ─── startGame ───────────────────────────────────────────────────────────────

describe("startGame", () => {
  it("setzt Phase auf wordSelection", () => {
    const { roomID, sockets } = setupRoomWithPlayers(2);
    const room = startGame(roomID, sockets[0], jest.fn());
    expect(room.phase).toBe("wordSelection");
  });

  it("bietet 3 Wortoptionen an", () => {
    const { roomID, sockets } = setupRoomWithPlayers(2);
    const room = startGame(roomID, sockets[0], jest.fn());
    expect(room.wordChoices).toHaveLength(3);
  });

  it("setzt Runde auf 1", () => {
    expect(setupStartedGame().room.round).toBe(1);
  });

  it("nach selectWord ist Phase playing", () => {
    expect(setupStartedGame().room.phase).toBe("playing");
  });

  it("nach selectWord ist Wort gesetzt", () => {
    expect(setupStartedGame().room.word).toBe("Katze");
  });

  it("setzt einen Drawer", () => {
    expect(setupStartedGame().room.drawerId).toBeTruthy();
  });

  it("erster Drawer ist socket-0 (Runde 1, Index 0)", () => {
    const { room } = setupStartedGame();
    expect(room.drawerId).toBe("socket-0");
  });

  it("setzt roundStartedAt nach Wortwahl", () => {
    const before = Date.now();
    const { room } = setupStartedGame();
    expect(room.roundStartedAt).toBeGreaterThanOrEqual(before);
  });

  it("setzt guessedPlayerIds zurück", () => {
    const { room } = setupStartedGame();
    expect(room.guessedPlayerIds.size).toBe(0);
  });

  it("hasGuessed aller Spieler ist false", () => {
    const { room } = setupStartedGame();
    Object.values(room.players).forEach((p) =>
      expect(p.hasGuessed).toBe(false),
    );
  });

  it("hint wird nach Wortwahl gesetzt", () => {
    const { room } = setupStartedGame();
    expect(room.currentHint).toBe("_____"); // "Katze" → 5 underscores
  });

  it("wirft 403 wenn Nicht-Host startet", () => {
    const { roomID, sockets } = setupRoomWithPlayers(2);
    expect(() => startGame(roomID, sockets[1], jest.fn())).toThrow(
      expect.objectContaining({ status: 403 }),
    );
  });

  it("wirft 400 wenn weniger als 2 Spieler", () => {
    const roomID = setupRoom();
    joinRoom({ roomID, socketId: "s1", playerID: "p1", name: "Alice" });
    expect(() => startGame(roomID, "s1", jest.fn())).toThrow(
      expect.objectContaining({ status: 400 }),
    );
  });

  it("wirft 400 wenn Spiel bereits läuft", () => {
    const { roomID, sockets } = setupRoomWithPlayers(2);
    startGame(roomID, sockets[0], jest.fn());
    expect(() => startGame(roomID, sockets[0], jest.fn())).toThrow(
      expect.objectContaining({ status: 400 }),
    );
  });

  it("wirft 404 wenn Raum nicht existiert", () => {
    expect(() => startGame("NOPE", "s1", jest.fn())).toThrow(
      expect.objectContaining({ status: 404 }),
    );
  });

  it("Timer feuert onRoundEnd nach 80 Sekunden", () => {
    jest.useFakeTimers();
    const { onRoundEnd, roomID } = setupStartedGame();
    jest.advanceTimersByTime(80_000);
    expect(onRoundEnd).toHaveBeenCalledWith(
      roomID,
      "Katze",
      expect.any(Boolean),
    );
    jest.useRealTimers();
  });

  it("Timer feuert nicht wenn Phase nicht playing ist", () => {
    jest.useFakeTimers();
    const { onRoundEnd, room } = setupStartedGame();
    room.phase = "roundEnd"; // manuell überschreiben
    jest.advanceTimersByTime(80_000);
    expect(onRoundEnd).not.toHaveBeenCalled();
    jest.useRealTimers();
  });
});

// ─── selectWord ──────────────────────────────────────────────────────────────

describe("selectWord", () => {
  it("setzt Phase auf playing", () => {
    const { roomID, sockets } = setupRoomWithPlayers(2);
    startGame(roomID, sockets[0], jest.fn());
    const room = getRoom(roomID)!;
    selectWord(roomID, room.drawerId!, room.wordChoices![0], jest.fn());
    expect(getRoom(roomID)!.phase).toBe("playing");
  });

  it("setzt das gewählte Wort", () => {
    const { roomID, sockets } = setupRoomWithPlayers(2);
    startGame(roomID, sockets[0], jest.fn());
    const room = getRoom(roomID)!;
    selectWord(roomID, room.drawerId!, "Hund", jest.fn());
    expect(getRoom(roomID)!.word).toBe("Hund");
  });

  it("löscht wordChoices nach Auswahl", () => {
    const { roomID, sockets } = setupRoomWithPlayers(2);
    startGame(roomID, sockets[0], jest.fn());
    const room = getRoom(roomID)!;
    selectWord(roomID, room.drawerId!, room.wordChoices![0], jest.fn());
    expect(getRoom(roomID)!.wordChoices).toBeNull();
  });

  it("wirft 403 wenn Nicht-Drawer ein Wort wählt", () => {
    const { roomID, sockets } = setupRoomWithPlayers(2);
    startGame(roomID, sockets[0], jest.fn());
    const room = getRoom(roomID)!;
    const nonDrawer = sockets.find((s) => s !== room.drawerId)!;
    expect(() =>
      selectWord(roomID, nonDrawer, room.wordChoices![0], jest.fn()),
    ).toThrow(expect.objectContaining({ status: 403 }));
  });

  it("wirft 400 bei ungültigem Wort", () => {
    const { roomID, sockets } = setupRoomWithPlayers(2);
    startGame(roomID, sockets[0], jest.fn());
    const room = getRoom(roomID)!;
    expect(() =>
      selectWord(roomID, room.drawerId!, "UNGÜLTIG", jest.fn()),
    ).toThrow(expect.objectContaining({ status: 400 }));
  });

  it("wirft 400 wenn nicht in wordSelection Phase", () => {
    const { room } = setupStartedGame(); // already in playing
    expect(() =>
      selectWord(room.roomID, room.drawerId!, "Katze", jest.fn()),
    ).toThrow(expect.objectContaining({ status: 400 }));
  });
});

// ─── processGuess ────────────────────────────────────────────────────────────

describe("processGuess", () => {
  it("correct bei richtigem Guess", () => {
    const { roomID, sockets } = setupStartedGame();
    const { result } = processGuess({
      roomID,
      socketId: getNonDrawer(roomID, sockets),
      guess: "Katze",
    });
    expect(result).toBe("correct");
  });

  it("wrong bei falschem Guess", () => {
    const { roomID, sockets } = setupStartedGame();
    const { result } = processGuess({
      roomID,
      socketId: getNonDrawer(roomID, sockets),
      guess: "Hund",
    });
    expect(result).toBe("wrong");
  });

  it("correct ist case-insensitive", () => {
    const { roomID, sockets } = setupStartedGame();
    const { result } = processGuess({
      roomID,
      socketId: getNonDrawer(roomID, sockets),
      guess: "KATZE",
    });
    expect(result).toBe("correct");
  });

  it("correct trimmt Whitespace", () => {
    const { roomID, sockets } = setupStartedGame();
    const { result } = processGuess({
      roomID,
      socketId: getNonDrawer(roomID, sockets),
      guess: "  Katze  ",
    });
    expect(result).toBe("correct");
  });

  it("drawer wenn Drawer rät", () => {
    const { roomID, room } = setupStartedGame();
    const { result } = processGuess({
      roomID,
      socketId: room.drawerId!,
      guess: "Katze",
    });
    expect(result).toBe("drawer");
  });

  it("already_guessed wenn Spieler zweimal rät", () => {
    const { roomID, sockets } = setupStartedGame(3);
    const guesser = getNonDrawer(roomID, sockets);
    processGuess({ roomID, socketId: guesser, guess: "Katze" });
    expect(
      processGuess({ roomID, socketId: guesser, guess: "Katze" }).result,
    ).toBe("already_guessed");
  });

  it("Guesser bekommt Punkte", () => {
    const { roomID, sockets } = setupStartedGame();
    const guesser = getNonDrawer(roomID, sockets);
    processGuess({ roomID, socketId: guesser, guess: "Katze" });
    expect(getRoom(roomID)!.players[guesser].score).toBeGreaterThan(0);
  });

  it("Score liegt zwischen 50 und 150", () => {
    const { roomID, sockets } = setupStartedGame();
    const guesser = getNonDrawer(roomID, sockets);
    processGuess({ roomID, socketId: guesser, guess: "Katze" });
    const score = getRoom(roomID)!.players[guesser].score;
    expect(score).toBeGreaterThanOrEqual(50);
    expect(score).toBeLessThanOrEqual(150);
  });

  it("Guess wird auf 100 Zeichen begrenzt (kein Crash)", () => {
    const { roomID, sockets } = setupStartedGame();
    const { result } = processGuess({
      roomID,
      socketId: getNonDrawer(roomID, sockets),
      guess: "K".repeat(200),
    });
    expect(result).toBe("wrong");
  });

  it("roundOver true wenn alle Nicht-Drawer erraten haben", () => {
    const { roomID, sockets } = setupStartedGame(2);
    const { roundOver } = processGuess({
      roomID,
      socketId: getNonDrawer(roomID, sockets),
      guess: "Katze",
    });
    expect(roundOver).toBe(true);
  });

  it("roundOver false wenn noch nicht alle erraten haben", () => {
    const { roomID, sockets } = setupStartedGame(3);
    const nonDrawers = sockets.filter((s) => s !== getRoom(roomID)!.drawerId);
    const { roundOver } = processGuess({
      roomID,
      socketId: nonDrawers[0],
      guess: "Katze",
    });
    expect(roundOver).toBe(false);
  });

  it("Phase wechselt zu roundEnd wenn alle erraten haben (nicht letzte Runde)", () => {
    const { roomID, sockets } = setupStartedGame(2);
    processGuess({
      roomID,
      socketId: getNonDrawer(roomID, sockets),
      guess: "Katze",
    });
    expect(getRoom(roomID)!.phase).toBe("roundEnd");
  });

  it("Drawer bekommt Punkte wenn alle erraten haben", () => {
    const { roomID, sockets } = setupStartedGame(2);
    const drawer = getRoom(roomID)!.drawerId!;
    processGuess({
      roomID,
      socketId: getNonDrawer(roomID, sockets),
      guess: "Katze",
    });
    expect(getRoom(roomID)!.players[drawer].score).toBeGreaterThan(0);
  });

  it("Drawer bekommt keine Punkte wenn niemand erraten hat (Timer abläuft)", () => {
    jest.useFakeTimers();
    const { roomID, room } = setupStartedGame(2);
    const drawer = room.drawerId!;
    jest.advanceTimersByTime(80_000);
    expect(getRoom(roomID)?.players[drawer]?.score ?? 0).toBe(0);
    jest.useRealTimers();
  });

  it("wirft 404 wenn Raum nicht existiert", () => {
    expect(() =>
      processGuess({ roomID: "NOPE", socketId: "s1", guess: "Katze" }),
    ).toThrow(expect.objectContaining({ status: 404 }));
  });

  it("wirft 400 wenn Spiel nicht läuft", () => {
    const { roomID } = setupRoomWithPlayers(2);
    expect(() =>
      processGuess({ roomID, socketId: "socket-0", guess: "Katze" }),
    ).toThrow(expect.objectContaining({ status: 400 }));
  });
});

// ─── endRound ────────────────────────────────────────────────────────────────

describe("endRound", () => {
  it("setzt Phase auf roundEnd wenn nicht letzte Runde", () => {
    const { room } = setupStartedGame();
    endRound(room);
    expect(room.phase).toBe("roundEnd");
  });

  it("gibt false zurück wenn nicht letzte Runde", () => {
    const { room } = setupStartedGame();
    expect(endRound(room)).toBe(false);
  });

  it("setzt Phase auf gameEnd in letzter Runde", () => {
    const { room } = setupStartedGame();
    room.round = room.maxRounds;
    endRound(room);
    expect(room.phase).toBe("gameEnd");
  });

  it("gibt true zurück in letzter Runde", () => {
    const { room } = setupStartedGame();
    room.round = room.maxRounds;
    expect(endRound(room)).toBe(true);
  });

  it("löscht den Timer", () => {
    jest.useFakeTimers();
    const { room, onRoundEnd } = setupStartedGame();
    endRound(room);
    jest.advanceTimersByTime(80_000);
    expect(onRoundEnd).not.toHaveBeenCalled(); // Timer wurde gecleant
    jest.useRealTimers();
  });
});

// ─── nextRound ───────────────────────────────────────────────────────────────

describe("nextRound", () => {
  it("erhöht Rundenzahl auf 2", () => {
    const { roomID } = setupStartedGame();
    expect(nextRound(roomID, jest.fn()).round).toBe(2);
  });

  it("Drawer rotiert bei 2 Spielern", () => {
    const { roomID, room: firstRoom } = setupStartedGame();
    const firstDrawer = firstRoom.drawerId;
    expect(nextRound(roomID, jest.fn()).drawerId).not.toBe(firstDrawer);
  });

  it("setzt Phase auf wordSelection für nächste Runde", () => {
    const { roomID } = setupStartedGame();
    expect(nextRound(roomID, jest.fn()).phase).toBe("wordSelection");
  });

  it("bietet 3 neue Wortoptionen an", () => {
    const { roomID } = setupStartedGame();
    const room = nextRound(roomID, jest.fn());
    expect(room.wordChoices).toHaveLength(3);
  });

  it("nach selectWord ist Wort gesetzt", () => {
    const { roomID } = setupStartedGame();
    const selRoom = nextRound(roomID, jest.fn());
    selectWord(roomID, selRoom.drawerId!, selRoom.wordChoices![0], jest.fn());
    expect(getRoom(roomID)!.word).toBe("Katze");
  });

  it("setzt guessedPlayerIds zurück", () => {
    const { roomID, sockets } = setupStartedGame(3);
    const nonDrawers = sockets.filter((s) => s !== getRoom(roomID)!.drawerId);
    processGuess({ roomID, socketId: nonDrawers[0], guess: "Katze" });
    const room = nextRound(roomID, jest.fn());
    expect(room.guessedPlayerIds.size).toBe(0);
  });

  it("setzt hasGuessed aller Spieler zurück", () => {
    const { roomID, sockets } = setupStartedGame(3);
    const nonDrawers = sockets.filter((s) => s !== getRoom(roomID)!.drawerId);
    processGuess({ roomID, socketId: nonDrawers[0], guess: "Katze" });
    const room = nextRound(roomID, jest.fn());
    Object.values(room.players).forEach((p) =>
      expect(p.hasGuessed).toBe(false),
    );
  });

  it("wirft 404 wenn Raum nicht existiert", () => {
    expect(() => nextRound("NOPE", jest.fn())).toThrow(
      expect.objectContaining({ status: 404 }),
    );
  });
});

// ─── getRoomPublic ────────────────────────────────────────────────────────────

describe("getRoomPublic", () => {
  it("enthält kein Wort", () => {
    const { room } = setupStartedGame();
    expect(getRoomPublic(room)).not.toHaveProperty("word");
  });

  it("enthält Wortlänge", () => {
    const { room } = setupStartedGame();
    expect(getRoomPublic(room).wordLength).toBe("Katze".length);
  });

  it("wordLength ist null in der Lobby", () => {
    expect(getRoomPublic(getRoom(createRoom())!).wordLength).toBeNull();
  });

  it("enthält currentHint", () => {
    const { room } = setupStartedGame();
    expect(getRoomPublic(room).currentHint).toBe("_____");
  });

  it("currentHint ist null in der Lobby", () => {
    expect(getRoomPublic(getRoom(createRoom())!).currentHint).toBeNull();
  });

  it("timeLeftMs ist gesetzt während playing", () => {
    const { room } = setupStartedGame();
    const tl = getRoomPublic(room).timeLeftMs;
    expect(tl).not.toBeNull();
    expect(tl).toBeGreaterThan(0);
    expect(tl).toBeLessThanOrEqual(80_000);
  });

  it("timeLeftMs ist null in der Lobby", () => {
    expect(getRoomPublic(getRoom(createRoom())!).timeLeftMs).toBeNull();
  });

  it("enthält language", () => {
    expect(getRoomPublic(getRoom(createRoom())!).language).toBe("de");
  });

  it("enthält categories", () => {
    const pub = getRoomPublic(getRoom(createRoom())!);
    expect(Array.isArray(pub.categories)).toBe(true);
    expect(pub.categories.length).toBeGreaterThan(0);
  });

  it("enthält availableCategories", () => {
    const pub = getRoomPublic(getRoom(createRoom())!);
    expect(Array.isArray(pub.availableCategories)).toBe(true);
  });

  it("enthält keine internen Felder (roundTimerHandle)", () => {
    const { room } = setupStartedGame();
    expect(getRoomPublic(room)).not.toHaveProperty("roundTimerHandle");
  });

  it("enthält kein roundStartedAt", () => {
    const { room } = setupStartedGame();
    expect(getRoomPublic(room)).not.toHaveProperty("roundStartedAt");
  });
});
