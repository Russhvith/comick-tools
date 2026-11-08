export type ToolGroup = "public" | "admin";

export type Field =
  | { flag: string; type: "bool"; label: string }
  | { flag: string; type: "text"; label: string; placeholder?: string }
  | { flag: string; type: "select"; label: string; options: string[] };

export type Script = {
  id: string;
  file: string;
  title: string;
  summary: string;
  fields: Field[];
};

export type ToolFile = { path: string; label: string; hint?: string };

export type Tool = {
  /** group/folder, e.g. public/crunchyroll-importer */
  id: string;
  group: ToolGroup;
  folder: string;
  name: string;
  summary: string;
  scripts: Script[];
  files: ToolFile[];
};

export type FieldValues = Record<string, string | boolean>;
