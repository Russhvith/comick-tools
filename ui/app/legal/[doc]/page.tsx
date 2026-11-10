// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { pageTitle } from "@/config/site";
import { CookieFlow } from "@/features/legal/CookieFlow";
import { LegalPage, legalPages, type LegalName } from "@/features/legal/LegalPage";
import { PackageTables } from "@/features/legal/PackageTables";
import { packages, readLegal } from "@/lib/server/legal";
import { loadTools } from "@/lib/server/tools";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ doc: string }> };

async function which({ params }: Params): Promise<LegalName | null> {
  const { doc } = await params;
  return legalPages.some((p) => p.name === doc) ? (doc as LegalName) : null;
}

export async function generateMetadata(props: Params): Promise<Metadata> {
  const name = await which(props);
  return { title: pageTitle(legalPages.find((p) => p.name === name)?.title) };
}

export default async function LegalDocPage(props: Params) {
  const name = await which(props);
  const doc = name ? readLegal(name) : null;
  if (!name || !doc) redirect("/legal/terms");
  return (
    <LegalPage
      tools={loadTools()}
      current={name}
      doc={doc}
      // The privacy policy's drawing of where the cookie goes, drawn properly.
      figures={name === "privacy" ? [<CookieFlow key="cookie" />] : undefined}
      body={name === "packages" ? <PackageTables data={await packages()} /> : undefined}
    />
  );
}
