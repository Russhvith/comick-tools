// One list so the command menu, hints and handlers can't drift apart.
export const shortcuts = {
  commandMenu: { combo: "mod+k", keys: ["Mod", "K"] },
  runScript: { combo: "mod+enter", keys: ["Mod", "Enter"] },
  saveFile: { combo: "mod+s", keys: ["Mod", "S"] },
  stopRun: { combo: "ctrl+c", keys: ["Ctrl", "C"], where: "in the console" },
} as const;
