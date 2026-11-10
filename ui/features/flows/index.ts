import type { ComponentType } from "react";
import { MassDeleteFlow } from "./massDelete/MassDeleteFlow";
import type { FlowProps } from "./types";

// A tool.json can name one of these as its "flow". Adding one means a
// component here and its name in the manifest. Unknown names fall back to
// the plain form, so a typo never leaves a tool without a way to run.
export const flows: Record<string, ComponentType<FlowProps>> = {
  "mass-delete": MassDeleteFlow,
};

export type { FlowProps };
