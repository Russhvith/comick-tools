"use client";

import { useCallback, useState } from "react";
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

type Status = "loading" | "ready" | "broken";

/** A 16:9 image that fades in, and shows a quiet placeholder if it's missing. */
export function Thumbnail({ src, alt, className, loading = "lazy" }: Props) {
  // The status remembers which src it belongs to. Resetting it in an effect
  // instead raced with cached images: they can finish loading before the
  // effect runs, which then flipped them back to loading for good.
  const [result, setResult] = useState<{ src: string; status: Status } | null>(null);
  const status: Status = result?.src === src ? result.status : "loading";

  // A cached image may already be complete by the time React attaches
  // onLoad, so check once the element exists too.
  const attach = useCallback(
    (img: HTMLImageElement | null) => {
      if (img?.complete) setResult({ src, status: img.naturalWidth > 0 ? "ready" : "broken" });
    },
    [src],
  );

  return (
    <span className={cn(styles.frame, className)} data-state={status}>
      {status === "broken" ? (
        <ImageOff size={16} aria-label={`${alt} (image missing)`} className={styles.missing} />
      ) : (
        <img
          ref={attach}
          src={src}
          alt={alt}
          loading={loading}
          decoding="async"
          className={styles.image}
          onLoad={() => setResult({ src, status: "ready" })}
          onError={() => setResult({ src, status: "broken" })}
        />
      )}
    </span>
  );
}
