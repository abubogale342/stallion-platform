"use client";

import {
  AGENT_DRAFT_FIELDS,
  type AgentDraftDescriptor,
  type AgentDraftGroup,
  type FormAgentDrafts,
} from "@/types/stallion-agent";
import Label from "@/ui/Label";
import Textarea from "@/ui/Textarea";
import SectionCard from "../../SectionCard";
import CopyToClipboardButton from "./CopyToClipboardButton";

const GROUP_TITLES: Record<AgentDraftGroup, string> = {
  overview: "Overview drafts",
  outreach: "Outreach drafts",
};

const GROUP_HINTS: Record<AgentDraftGroup, string> = {
  overview:
    "Review copy only. Nothing here is published — approved text is copied into the profile summary by hand.",
  outreach:
    "Sent by hand through each channel. Copy the text out rather than editing it in place if you plan to adjust it before sending.",
};

function DraftField({
  descriptor,
  value,
  onChange,
}: {
  descriptor: AgentDraftDescriptor;
  value: string;
  onChange: (next: string) => void;
}) {
  const empty = !value.trim();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label variant="admin">{descriptor.label}</Label>
        {descriptor.copyable ? <CopyToClipboardButton value={value} /> : null}
      </div>

      <Textarea
        className="mt-1.5"
        rows={descriptor.group === "overview" ? 6 : 4}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={empty ? "Nothing generated yet." : undefined}
      />

      {descriptor.hint ? (
        <p className="mt-1 text-[11px] text-slate-500">{descriptor.hint}</p>
      ) : null}
    </div>
  );
}

export default function AgentDraftsSection({
  group,
  drafts,
  onChange,
}: {
  group: AgentDraftGroup;
  drafts: FormAgentDrafts;
  onChange: (field: AgentDraftDescriptor["field"], next: string) => void;
}) {
  const descriptors = AGENT_DRAFT_FIELDS.filter(
    (descriptor) => descriptor.group === group
  );

  return (
    <SectionCard title={GROUP_TITLES[group]}>
      <p className="text-xs leading-relaxed text-slate-500">
        {GROUP_HINTS[group]}
      </p>

      <div className="space-y-5">
        {descriptors.map((descriptor) => (
          <DraftField
            key={descriptor.field}
            descriptor={descriptor}
            value={drafts[descriptor.field]}
            onChange={(next) => onChange(descriptor.field, next)}
          />
        ))}
      </div>
    </SectionCard>
  );
}
