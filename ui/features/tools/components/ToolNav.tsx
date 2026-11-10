// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

"use client";

import Link from "next/link";
import { House } from "lucide-react";
import { NavItem } from "@/components/molecules/NavItem";
import { Sidebar, SidebarList, SidebarSection } from "@/components/organisms/Sidebar";
import { site } from "@/config/site";
import { groups, toolIcon } from "@/config/tools";
import { adminLocked, useAccount } from "@/features/account/useAccount";
import { cn } from "@/lib/cn";
import type { Tool, ToolGroup } from "@/types/tools";
import styles from "./ToolNav.module.css";

// Small and out of the way at the foot of the sidebar, where people look
// for this sort of thing.
const legal = [
  { href: "/legal/terms", label: "Terms" },
  { href: "/legal/privacy", label: "Privacy" },
  { href: "/legal/packages", label: "Open source" },
];

type Props = {
  tools: Tool[];
  /** "home" on the homepage, "legal/terms" and so on for legal pages, otherwise the open tool's id. */
  active: string;
  /** The workbench switches tools in place. Left out, the links navigate. */
  onSelectTool?: (toolId: string) => void;
};

const order: ToolGroup[] = ["public", "admin"];

/** The left sidebar, the same on the homepage and every tool. */
export function ToolNav({ tools, active, onSelectTool }: Props) {
  const { data: account } = useAccount();
  const locked = adminLocked(account);
  return (
    <Sidebar
      label="Pages"
      footer={
        <>
          <nav className={styles.legal} aria-label="Legal">
            {legal.map((l) => (
              <Link key={l.href} href={l.href} className={cn(styles.legalLink, active === l.href.slice(1) && styles.legalCurrent)} aria-current={active === l.href.slice(1) ? "page" : undefined}>
                {l.label}
              </Link>
            ))}
          </nav>
          <p className={styles.credit}>
            Made by{" "}
            <a href={site.author.url} target="_blank" rel="noreferrer">
              {site.author.name}
            </a>
          </p>
        </>
      }
    >
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
                  locked={locked && t.group === "admin" ? "not available for your account" : undefined}
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
