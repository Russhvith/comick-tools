"use client";

import { useEffect, useState } from "react";
import type { VersionInfo } from "@/lib/version";

type Props = {
  version: string;
  onUpdateStarted: (runId: string) => void;
};

export default function VersionStatus({ version, onUpdateStarted }: Props) {
  const [info, setInfo] = useState<VersionInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function check(refresh = false) {
    setChecking(true);
    try {
      const res = await fetch(`/api/version${refresh ? "?refresh=1" : ""}`);
      setInfo(await res.json());
    } catch {
      setError("Couldn't reach the server");
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    void check();
  }, []);

  async function update() {
    setError(null);
    const res = await fetch("/api/update", { method: "POST" });
    const body = await res.json();
    if (!res.ok) {
      setError(body.error);
      return;
    }
    onUpdateStarted(body.run.id);
  }

  return (
    <div className="version">
      <div>
        Version <code>{info?.current ?? version}</code>
        {info?.commit && (
          <>
            {" "}
            on <code>{info.commit}</code>
          </>
        )}
      </div>
      {info?.updateAvailable && info.latest ? (
        <>
          <div>
            <a href={info.latest.url} target="_blank" rel="noreferrer">
              {info.latest.name || `v${info.latest.version}`}
            </a>{" "}
            is out.
          </div>
          <button className="update-button" onClick={() => void update()}>
            Update to {info.latest.version}
          </button>
        </>
      ) : (
        <>
          <div>{checking ? "Checking GitHub..." : info?.checkError ?? (info ? "Up to date" : "")}</div>
          <button className="text-button" onClick={() => void check(true)} disabled={checking}>
            Check for updates
          </button>
        </>
      )}
      {error && <div className="form-error">{error}</div>}
    </div>
  );
}
