import type { ComponentType } from "react";
import { CrunchyrollInput } from "./CrunchyrollInput";
import { EpisodeList } from "./EpisodeList";
import type { ViewProps } from "./types";

// A tool.json step names its view as a string. Adding a view means adding
// a component here and using its name in the manifest.
export const stepViews: Record<string, ComponentType<ViewProps>> = {
  "crunchyroll-input": CrunchyrollInput,
  "episode-list": EpisodeList,
};

export type { ViewProps };
