import {
  CODE_MATCH,
  KEY_MATCH,
  formatKeyCombination,
  matchKeyCombination,
  parseKeyCombination,
  splitKeyCombinations,
  toCanonicalKeyCombination,
} from "./keyCombination";
import { getDefaultKeymap } from "./defaultKeymap";
import { resolveKeymap } from "./resolve";

const keyEvent = (
  init: Partial<
    Pick<
      KeyboardEvent,
      "key" | "code" | "ctrlKey" | "metaKey" | "altKey" | "shiftKey"
    >
  >,
) =>
  ({
    key: "",
    code: "",
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    ...init,
  } as KeyboardEvent);

const parse = (input: string, isMac = false) => {
  const parsed = parseKeyCombination(input, isMac);
  if (!parsed) {
    throw new Error(`invalid key combination "${input}"`);
  }
  return parsed;
};

const match = (input: string, init: Parameters<typeof keyEvent>[0]) =>
  matchKeyCombination(parse(input), keyEvent(init));

describe("parseKeyCombination()", () => {
  it("parses the modifiers", () => {
    expect(parse("ctrl+alt+shift+meta+k")).toEqual({
      ctrl: true,
      meta: true,
      alt: true,
      shift: true,
      key: "k",
      kind: "letter",
    });
    expect(parse("option+cmd+k")).toMatchObject({ alt: true, meta: true });
    expect(parse("Shift+K")).toMatchObject({ shift: true, key: "k" });
  });

  it("resolves mod to Cmd on macOS and to Ctrl elsewhere", () => {
    expect(parse("mod+s", true)).toMatchObject({ meta: true, ctrl: false });
    expect(parse("mod+s", false)).toMatchObject({ meta: false, ctrl: true });
  });

  it("parses the key names", () => {
    expect(parse("plus")).toMatchObject({ key: "+", kind: "symbol" });
    expect(parse("mod+minus")).toMatchObject({ key: "-", kind: "symbol" });
    expect(parse("comma")).toMatchObject({ key: ",", kind: "symbol" });
    expect(parse("escape")).toMatchObject({ key: "Escape", kind: "named" });
    expect(parse("space")).toMatchObject({ key: " ", kind: "named" });
    expect(parse("mod+shift+arrowup")).toMatchObject({
      key: "ArrowUp",
      kind: "named",
    });
    expect(parse("1")).toMatchObject({ key: "1", kind: "digit" });
    expect(parse("?")).toMatchObject({ key: "?", kind: "symbol" });
  });

  it("accepts + as the key after another +", () => {
    expect(parse("shift++")).toMatchObject({ shift: true, key: "+" });
  });

  it("rejects invalid key combinations", () => {
    expect(parseKeyCombination("mod+")).toBeNull();
    expect(parseKeyCombination("hyper+k")).toBeNull();
    expect(parseKeyCombination("ctrl+foo")).toBeNull();
    expect(parseKeyCombination("")).toBeNull();
  });
});

describe("splitKeyCombinations()", () => {
  it("splits a string at the commas", () => {
    expect(splitKeyCombinations("cmd+z, ctrl+z")).toEqual(["cmd+z", "ctrl+z"]);
    expect(splitKeyCombinations(["a,b", "C"])).toEqual(["a", "b", "c"]);
    expect(splitKeyCombinations("")).toEqual([]);
  });
});

describe("toCanonicalKeyCombination()", () => {
  it("makes equal key combinations equal strings", () => {
    expect(toCanonicalKeyCombination(parse("shift+mod+s"))).toBe(
      toCanonicalKeyCombination(parse("ctrl+shift+s")),
    );
    expect(toCanonicalKeyCombination(parse("mod+s", true))).toBe("meta+s");
    expect(toCanonicalKeyCombination(parse("mod+plus"))).toBe("ctrl+plus");
  });
});

describe("formatKeyCombination()", () => {
  it("formats the modifiers in a fixed order", () => {
    expect(formatKeyCombination("shift+mod+s", false)).toBe("Ctrl+Shift+S");
    expect(formatKeyCombination("mod+alt+s", true)).toBe("Cmd+Option+S");
    expect(formatKeyCombination("alt+s", false)).toBe("Alt+S");
  });

  it("formats the key names", () => {
    expect(formatKeyCombination("mod+plus", false)).toBe("Ctrl++");
    expect(formatKeyCombination("mod+delete", false)).toBe("Ctrl+Delete");
    expect(formatKeyCombination("escape", false)).toBe("Esc");
    expect(formatKeyCombination("mod+shift+arrowup", false)).toBe(
      "Ctrl+Shift+↑",
    );
  });

  it("returns an empty string for an invalid key combination", () => {
    expect(formatKeyCombination("foo+bar")).toBe("");
  });
});

describe("matchKeyCombination()", () => {
  it("requires the modifiers to be equal", () => {
    expect(match("mod+z", { key: "z", ctrlKey: true })).toBe(KEY_MATCH);
    expect(match("mod+z", { key: "z", ctrlKey: true, altKey: true })).toBe(0);
    expect(match("mod+z", { key: "Z", ctrlKey: true, shiftKey: true })).toBe(0);
    expect(match("z", { key: "z", ctrlKey: true })).toBe(0);
  });

  it("ignores CapsLock", () => {
    expect(match("r", { key: "R" })).toBe(KEY_MATCH);
    expect(match("shift+x", { key: "x", shiftKey: true })).toBe(KEY_MATCH);
  });

  it("matches a digit on event.code", () => {
    expect(match("shift+1", { key: "!", code: "Digit1", shiftKey: true })).toBe(
      KEY_MATCH,
    );
    expect(match("1", { key: "&", code: "Digit1" })).toBe(KEY_MATCH);
    expect(match("1", { key: "1", code: "Numpad1" })).toBe(KEY_MATCH);
    expect(match("1", { key: "!", code: "Digit1", shiftKey: true })).toBe(0);
  });

  it("falls back to event.code for a non-Latin layout", () => {
    // Russian layout
    expect(match("mod+z", { key: "я", code: "KeyZ", ctrlKey: true })).toBe(
      CODE_MATCH,
    );
    // a Latin key at a different position (French layout) is not a match
    expect(match("mod+z", { key: "w", code: "KeyZ", ctrlKey: true })).toBe(0);
  });

  it("matches a symbol on event.key, with or without Shift", () => {
    expect(match("?", { key: "?", code: "Slash", shiftKey: true })).toBe(
      KEY_MATCH,
    );
    expect(match("mod+plus", { key: "+", ctrlKey: true, shiftKey: true })).toBe(
      KEY_MATCH,
    );
    // Shift in the key combination must be held
    expect(match("mod+shift+<", { key: "<", ctrlKey: true })).toBe(0);
  });

  it("falls back to event.code for a symbol", () => {
    // Option+[ on macOS produces “
    expect(
      matchKeyCombination(
        parse("mod+alt+[", true),
        keyEvent({
          key: "“",
          code: "BracketLeft",
          metaKey: true,
          altKey: true,
        }),
      ),
    ).toBe(CODE_MATCH);
    // Shift on the event.code fallback must be equal
    expect(
      match("mod+[", {
        key: "{",
        code: "BracketLeft",
        ctrlKey: true,
        shiftKey: true,
      }),
    ).toBe(0);
    expect(
      match("mod+shift+[", {
        key: "{",
        code: "BracketLeft",
        ctrlKey: true,
        shiftKey: true,
      }),
    ).toBe(CODE_MATCH);
  });

  it("matches the named keys", () => {
    expect(match("delete", { key: "Delete" })).toBe(KEY_MATCH);
    expect(match("space", { key: " ", code: "Space" })).toBe(KEY_MATCH);
    expect(match("shift+tab", { key: "Tab" })).toBe(0);
  });
});

describe("resolveKeymap()", () => {
  const defaults = {
    "tool.rectangle": ["r", "2"],
    "tool.diamond": ["d", "3"],
    "tool.freedraw": ["p", "x", "7"],
    undo: ["mod+z"],
  };
  const isKnownCommand = (id: string) => id in defaults || id === "redo";

  it("returns the defaults without overrides", () => {
    const { keymap, conflicts, warnings } = resolveKeymap({
      defaults,
      isKnownCommand,
    });
    expect(keymap).toEqual(defaults);
    expect(conflicts).toEqual([]);
    expect(warnings).toEqual([]);
  });

  it("replaces all default key combinations of a command", () => {
    const { keymap } = resolveKeymap({
      defaults,
      overrides: { "tool.freedraw": "shift+p, 9" },
      isKnownCommand,
    });
    expect(keymap["tool.freedraw"]).toEqual(["shift+p", "9"]);
  });

  it("removes all key combinations with null", () => {
    const { keymap } = resolveKeymap({
      defaults,
      overrides: { "tool.diamond": null },
      isKnownCommand,
    });
    expect(keymap["tool.diamond"]).toEqual([]);
  });

  it("removes a key combination that an override takes from a different command", () => {
    const { keymap, conflicts } = resolveKeymap({
      defaults,
      overrides: { "tool.freedraw": ["d"] },
      isKnownCommand,
      isMac: false,
    });
    expect(keymap["tool.freedraw"]).toEqual(["d"]);
    expect(keymap["tool.diamond"]).toEqual(["3"]);
    expect(conflicts).toEqual([
      { keys: "d", ids: ["tool.freedraw", "tool.diamond"] },
    ]);
  });

  it("compares the key combinations after the platform resolves mod", () => {
    const { keymap, conflicts } = resolveKeymap({
      defaults,
      overrides: { redo: "ctrl+z" },
      isKnownCommand,
      isMac: false,
    });
    expect(keymap.undo).toEqual([]);
    expect(conflicts).toEqual([{ keys: "ctrl+z", ids: ["redo", "undo"] }]);

    expect(
      resolveKeymap({
        defaults,
        overrides: { redo: "ctrl+z" },
        isKnownCommand,
        isMac: true,
      }).keymap.undo,
    ).toEqual(["mod+z"]);
  });

  it("keeps a key combination that two overrides use, and reports it", () => {
    const { keymap, conflicts } = resolveKeymap({
      defaults,
      overrides: { "tool.rectangle": "q", "tool.diamond": "q" },
      isKnownCommand,
    });
    expect(keymap["tool.rectangle"]).toEqual(["q"]);
    expect(keymap["tool.diamond"]).toEqual(["q"]);
    expect(conflicts).toEqual([
      { keys: "q", ids: ["tool.rectangle", "tool.diamond"] },
    ]);
  });

  it("gives the key combinations of host commands precedence over the defaults", () => {
    const { keymap, conflicts } = resolveKeymap({
      defaults,
      hostCommands: { "host.save": { keys: "r" }, "host.open": {} },
      isKnownCommand,
    });
    expect(keymap["host.save"]).toEqual(["r"]);
    expect(keymap["host.open"]).toEqual([]);
    expect(keymap["tool.rectangle"]).toEqual(["2"]);
    expect(conflicts).toEqual([
      { keys: "r", ids: ["host.save", "tool.rectangle"] },
    ]);
  });

  it("lets an override replace the keys of a host command", () => {
    const { keymap } = resolveKeymap({
      defaults,
      hostCommands: { "host.save": { keys: "mod+s" } },
      overrides: { "host.save": "mod+shift+s" },
      isKnownCommand,
    });
    expect(keymap["host.save"]).toEqual(["mod+shift+s"]);
  });

  it("ignores an unknown command ID and an invalid key combination with a warning", () => {
    const { keymap, warnings } = resolveKeymap({
      defaults,
      overrides: {
        "tool.nope": "n",
        "host.unregistered": "u",
        "tool.rectangle": "ctrl+foo, r",
      } as any,
      isKnownCommand,
    });
    expect(keymap).not.toHaveProperty("tool.nope");
    expect(keymap).not.toHaveProperty("host.unregistered");
    expect(keymap["tool.rectangle"]).toEqual(["r"]);
    expect(warnings).toEqual([
      'keymap: unknown command "tool.nope"',
      'keymap: unknown command "host.unregistered"',
      'keymap: invalid key combination "ctrl+foo" for "tool.rectangle"',
    ]);
  });
});

describe("getDefaultKeymap()", () => {
  it("contains only valid key combinations", () => {
    for (const isMac of [true, false]) {
      for (const [id, keys] of Object.entries(getDefaultKeymap(isMac))) {
        for (const key of keys!) {
          expect([id, parseKeyCombination(key, isMac)]).not.toEqual([id, null]);
        }
      }
    }
  });

  it("has no key combination twice", () => {
    for (const isMac of [true, false]) {
      const { conflicts } = resolveKeymap({
        defaults: getDefaultKeymap(isMac),
        // every default is an override: each duplicate becomes a conflict
        overrides: getDefaultKeymap(isMac),
        isKnownCommand: () => true,
        isMac,
      });
      expect(conflicts).toEqual([]);
    }
  });
});
