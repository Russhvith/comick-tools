import type { StepStatus } from "@/types/steps";
import type { ToolFile } from "@/types/tools";

export type ViewProps = {
  toolId: string;
  file: ToolFile;
  /** Changes whenever a run ends, which is when scripts write these files. */
  refreshKey: number;
  /** Tell the flow where this step stands so later steps can wait on it. */
  onStatus: (status: StepStatus) => void;
};
