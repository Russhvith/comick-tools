"use client";

import { useCallback } from "react";
import { mutateResource, useResource } from "@/hooks/useResource";
import { request } from "@/lib/http";

type FileBody = { exists: boolean; content: string; modifiedAt: number | null };

const fileUrl = (toolId: string, path: string) => `/api/files?tool=${encodeURIComponent(toolId)}&path=${encodeURIComponent(path)}`;

export function useToolFile(toolId: string, path: string | undefined) {
  const key = path ? fileUrl(toolId, path) : null;
  const resource = useResource<FileBody>(key, () => request<FileBody>(key!));

  /**
   * Optimistic: the cache takes the new text straight away, and goes back
   * to what it was if the server refuses. Returns the previous content so
   * the caller can offer an undo.
   */
  const save = useCallback(
    async (content: string) => {
      if (!key) throw new Error("No file selected");
      const previous = resource.data;
      mutateResource<FileBody>(key, { exists: true, content, modifiedAt: Date.now() });
      try {
        await request(key, { method: "PUT", body: JSON.stringify({ content }) });
        return previous?.content ?? "";
      } catch (error) {
        if (previous) mutateResource(key, previous);
        throw error;
      }
    },
    [key, resource.data],
  );

  return { ...resource, save };
}
