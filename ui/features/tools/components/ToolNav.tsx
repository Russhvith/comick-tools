"use client";

import { House } from "lucide-react";
import { NavItem } from "@/components/molecules/NavItem";
import { Sidebar, SidebarList, SidebarSection } from "@/components/organisms/Sidebar";
import { groups, toolIcon } from "@/config/tools";
import type { Tool, ToolGroup } from "@/types/tools";

type Props = {
  tools: Tool[];
  /** "home" on the homepage, otherwise the open tool's id. */
  active: string;
  /** The workbench switches tools in place. Left out, the links navigate. */
  onSelectTool?: (toolId: string) => void;
};

const order: ToolGroup[] = ["public", "admin"];

/** The left sidebar, the same on the homepage and every tool. */
export function ToolNav({ tools, active, onSelectTool }: Props) {
  return (
    <Sidebar label="Pages">
      <SidebarList>
        <li>
          <NavItem icon={House} label="Home" tone="neutral" href="/" active={active === "home"} />
        </li>
      </SidebarList>
      {order.map((group) => {
        const list = tools.filter((t) => t.group === group);
        if (!list.length) return null;
        return (
          <SidebarSection key={group} title={groups[group].title} note={groups[group].note}>
            {list.map((t) => (
              <li key={t.id}>
                <NavItem
                  icon={toolIcon(t.id)}
                  label={t.name}
                  tone={groups[t.group].tone}
                  href={`/tools/${t.id}`}
                  active={t.id === active}
                  onSelect={onSelectTool ? () => onSelectTool(t.id) : undefined}
                />
              </li>
            ))}
          </SidebarSection>
        );
      })}
    </Sidebar>
  );
}
