import { isDarwin } from "@excalidraw/common";

import {
  parseKeyCombination,
  splitKeyCombinations,
  toCanonicalKeyCombination,
} from "./keyCombination";

import type {
  CommandId,
  HostCommand,
  HostCommandId,
  KeyCombination,
  KeymapConflict,
  KeymapOverrides,
} from "./types";

export type ResolvedKeymap = {
  keymap: Record<CommandId, KeyCombination[]>;
  conflicts: KeymapConflict[];
  warnings: string[];
};

/**
 * Resolves the default keymap, the default key combinations of the host
 * commands and the overrides of the host into the effective keymap.
 *
 * 1. An override replaces all key combinations of the command. `null`
 *    removes them.
 * 2. If an override (or a host command) uses a key combination of a
 *    different command, the key combination is removed from the different
 *    command, and the removal is reported as a conflict. If two overrides use
 *    the same key combination, both keep it, and the conflict is reported.
 * 3. An override of an unknown command and an invalid key combination are
 *    ignored with a warning.
 */
export const resolveKeymap = ({
  defaults,
  hostCommands = {},
  overrides = {},
  isKnownCommand,
  isMac = isDarwin,
}: {
  defaults: Partial<Record<CommandId, readonly KeyCombination[]>>;
  hostCommands?: Partial<Record<HostCommandId, Pick<HostCommand, "keys">>>;
  overrides?: KeymapOverrides;
  isKnownCommand: (id: string) => boolean;
  isMac?: boolean;
}): ResolvedKeymap => {
  const warnings: string[] = [];

  /** valid, deduplicated key combinations, with their canonical forms */
  const normalize = (
    id: string,
    value: KeyCombination | readonly KeyCombination[],
  ) => {
    const result = new Map<string, KeyCombination>();
    for (const keys of splitKeyCombinations(value)) {
      const parsed = parseKeyCombination(keys, isMac);
      if (!parsed) {
        warnings.push(`keymap: invalid key combination "${keys}" for "${id}"`);
        continue;
      }
      const canonical = toCanonicalKeyCombination(parsed);
      if (!result.has(canonical)) {
        result.set(canonical, keys);
      }
    }
    return result;
  };

  const resolved = new Map<CommandId, Map<string, KeyCombination>>();
  for (const [id, keys] of Object.entries(defaults)) {
    resolved.set(id as CommandId, normalize(id, keys!));
  }

  /** commands whose key combinations the host set */
  const explicit = new Set<CommandId>();

  for (const [id, command] of Object.entries(hostCommands)) {
    resolved.set(id as CommandId, new Map());
    if (command?.keys != null) {
      resolved.set(id as CommandId, normalize(id, command.keys));
      explicit.add(id as CommandId);
    }
  }

  for (const [id, keys] of Object.entries(overrides)) {
    if (!isKnownCommand(id) && !(id in hostCommands)) {
      warnings.push(`keymap: unknown command "${id}"`);
      continue;
    }
    resolved.set(
      id as CommandId,
      keys === null || keys === undefined ? new Map() : normalize(id, keys),
    );
    explicit.add(id as CommandId);
  }

  // key combinations of the host win over the defaults of other commands
  const conflicts = new Map<string, KeymapConflict>();
  for (const id of explicit) {
    for (const [canonical, keys] of resolved.get(id)!) {
      for (const [otherId, otherKeys] of resolved) {
        if (otherId === id || !otherKeys.has(canonical)) {
          continue;
        }
        if (!explicit.has(otherId)) {
          otherKeys.delete(canonical);
        }
        const conflict = conflicts.get(canonical) ?? { keys, ids: [id] };
        if (!conflict.ids.includes(otherId)) {
          conflict.ids.push(otherId);
        }
        conflicts.set(canonical, conflict);
      }
    }
  }

  const keymap = {} as Record<CommandId, KeyCombination[]>;
  for (const [id, keys] of resolved) {
    keymap[id] = [...keys.values()];
  }

  return {
    keymap,
    // a command that keeps the key combination comes first
    conflicts: [...conflicts.entries()].map(([canonical, conflict]) => ({
      keys: conflict.keys,
      ids: [
        ...conflict.ids.filter((id) => resolved.get(id)!.has(canonical)),
        ...conflict.ids.filter((id) => !resolved.get(id)!.has(canonical)),
      ],
    })),
    warnings,
  };
};
