export type ToolGroup = "public" | "admin";

/** `hint` is one short line under the field saying what it does. */
export type Field =
  | { flag: string; type: "bool"; label: string; hint?: string }
  | {
      flag: string;
      type: "text";
      label: string;
      hint?: string;
      placeholder?: string;
      /** Shown in a grey box before the input, like "comick.dev/anime/". */
      prefix?: string;
      /**
       * Turn a pasted ComicK link into its slug. Lists the path sections
       * that come before a slug, like ["anime"] for /anime/<slug>.
       */
      slugFrom?: string[];
      /** A text area on its own row instead of a one line input. */
      multiline?: boolean;
      /** Limit on what the script ends up sending, appended text included. */
      maxLength?: number;
      /** Text the script adds after the value (with a space), shown in grey. */
      appended?: string;
    }
  | { flag: string; type: "select"; label: string; hint?: string; options: string[] };

export type Script = {
  id: string;
  file: string;
  title: string;
  summary: string;
  fields: Field[];
  /** Talks to ComicK as the signed in account, so it needs the cookie in .env. */
  needsCookie?: boolean;
};

export type ToolFile = { path: string; label: string; hint?: string };

/**
 * One stage of a tool that works as a pipeline. A step is either a data
 * file shown through a `view`, or one of the tool's scripts.
 */
export type Step = {
  id: string;
  title: string;
  file?: string;
  view?: string;
  script?: string;
  /** Id of an earlier step that has to be ready before this script can run. */
  needs?: string;
  /** Id of the file step this script writes, used to tell if it's up to date. */
  produces?: string;
};

export type Tool = {
  /** group/folder, e.g. public/crunchyroll-importer */
  id: string;
  group: ToolGroup;
  folder: string;
  name: string;
  summary: string;
  scripts: Script[];
  files: ToolFile[];
  /** Present for tools that run in order. Without it the UI shows scripts as tabs. */
  steps?: Step[];
};

export type FieldValues = Record<string, string | boolean>;
