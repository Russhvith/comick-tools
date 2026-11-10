// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import styles from "./Switch.module.css";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "role">;

/**
 * An on/off toggle. Under the hood it's still a checkbox, so it works with
 * a wrapping label, the keyboard and forms like any other one.
 */
export function Switch({ className, ...rest }: Props) {
  return <input type="checkbox" role="switch" className={cn(styles.switch, className)} {...rest} />;
}
