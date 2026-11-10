"use client";

import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/cn";
import styles from "./Thumbnail.module.css";

type Props = {
  src: string;
  alt: string;
  className?: string;
  /** Lazy suits long lists, eager suits the one big image in a dialog. */
  loading?: "lazy" | "eager";
};

/** A 16:9 image that fades in, and shows a quiet placeholder if it's missing. */
export function Thumbnail({ src, alt, className, loading = "lazy" }: Props) {
  const [state, setState] = useState<"loading" | "ready" | "broken">("loading");
  useEffect(() => setState("loading"), [src]);

  return (
    <span className={cn(styles.frame, className)} data-state={state}>
      {state === "broken" ? (
        <ImageOff size={16} aria-label={`${alt} (image missing)`} className={styles.missing} />
      ) : (
        <img
          src={src}
          alt={alt}
          loading={loading}
          decoding="async"
          className={styles.image}
          onLoad={() => setState("ready")}
          onError={() => setState("broken")}
        />
      )}
    </span>
  );
}
