// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

"use client";

import { useState } from "react";
import { Button } from "@/components/atoms/Button";
import { Modal } from "@/components/organisms/Modal";
import { SettingsForm } from "./SettingsForm";
import { TermsDialog } from "./TermsDialog";
import { useSettings } from "./useSettings";

/**
 * What a first visit needs, in order: the Terms, then a cookie in .env.
 * Tool pages force the Terms (`requireTerms`), the homepage leaves them
 * to its account card. The setup can be put off, it comes back on the
 * next page load while .env still has no cookie.
 */
export function Onboarding({ requireTerms = false }: { requireTerms?: boolean }) {
  const { data } = useSettings();
  const [later, setLater] = useState(false);
  if (!data) return null;

  if (!data.agreed) return requireTerms ? <TermsDialog open /> : null;

  const needsSetup = !data.cookie.set && !later;
  return (
    <Modal
      open={needsSetup}
      title={data.envExists ? "Finish setting up" : "Set up ComicK Tools"}
      subtitle="These go into the .env file. You can change them any time in Settings."
      onRequestClose={() => setLater(true)}
    >
      <SettingsForm
        settings={data}
        saveLabel="Save and continue"
        onSaved={() => setLater(true)}
        extra={
          <Button variant="ghost" onClick={() => setLater(true)}>
            Later
          </Button>
        }
      />
    </Modal>
  );
}
