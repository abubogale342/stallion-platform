"use client";

import type {
  AgentFlagSeverity,
  ConflictFlag,
  MissingInformationFlag,
} from "@/types/stallion-agent";
import Badge from "@/ui/Badge";
import SectionCard from "../../SectionCard";

const SEVERITY_VARIANT: Record<
  AgentFlagSeverity,
  "danger" | "warning" | "muted"
> = {
  high: "danger",
  medium: "warning",
  low: "muted",
};

/**
 * `field` is a column name as the agent knows it. Shown as-is rather than
 * prettified: it is the reviewer's only reliable handle on *which* field is in
 * question, and a friendlier rendering would have to guess at a mapping that
 * the agent is free to change.
 */
function FieldName({ value }: { value: string }) {
  if (!value.trim()) return null;
  return (
    <code className="rounded bg-slate-900/80 px-1.5 py-0.5 font-mono text-[11px] text-slate-300">
      {value}
    </code>
  );
}

function MissingFlagRow({ flag }: { flag: MissingInformationFlag }) {
  return (
    <li className="rounded-lg border border-amber-500/25 bg-amber-950/20 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={SEVERITY_VARIANT[flag.severity]}>{flag.severity}</Badge>
        <FieldName value={flag.field} />
      </div>
      {flag.message.trim() ? (
        <p className="mt-2 text-xs leading-relaxed text-amber-100/80">
          {flag.message}
        </p>
      ) : null}
    </li>
  );
}

function ConflictFlagRow({ flag }: { flag: ConflictFlag }) {
  return (
    <li className="rounded-lg border border-red-500/30 bg-red-950/20 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={SEVERITY_VARIANT[flag.severity]}>{flag.severity}</Badge>
        <FieldName value={flag.field} />
      </div>

      {flag.description.trim() ? (
        <p className="mt-2 text-xs leading-relaxed text-red-100/80">
          {flag.description}
        </p>
      ) : null}

      {/*
        The competing values are the point of a conflict flag: the reviewer
        cannot resolve one without seeing what each source actually claimed, so
        they are listed with their provenance rather than summarised away.
      */}
      {flag.values.length ? (
        <ul className="mt-3 space-y-1.5">
          {flag.values.map((entry, index) => (
            <li
              key={`${entry.value}-${entry.snippet_id ?? index}`}
              className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs"
            >
              <span className="font-medium text-slate-100">{entry.value}</span>
              <span className="text-slate-500">
                {entry.source_name?.trim() || entry.source_type || "unattributed"}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {flag.recommended_review_action.trim() ? (
        <p className="mt-3 border-t border-red-500/20 pt-2 text-[11px] leading-relaxed text-slate-400">
          <span className="font-semibold uppercase tracking-wide text-slate-500">
            Suggested action:{" "}
          </span>
          {flag.recommended_review_action}
        </p>
      ) : null}
    </li>
  );
}

export default function AgentFlagsSection({
  missingFlags,
  conflictFlags,
}: {
  missingFlags: MissingInformationFlag[];
  conflictFlags: ConflictFlag[];
}) {
  const total = missingFlags.length + conflictFlags.length;

  return (
    <SectionCard
      title="Flags"
      headerAction={
        total ? (
          <Badge variant={conflictFlags.length ? "danger" : "warning"}>
            {total} to review
          </Badge>
        ) : (
          <Badge variant="success">Clear</Badge>
        )
      }
    >
      {total === 0 ? (
        <p className="text-xs text-slate-500">
          The last run raised no missing-information or conflict flags.
        </p>
      ) : (
        <div className="space-y-5">
          {conflictFlags.length ? (
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-red-300/80">
                Conflicts ({conflictFlags.length})
              </p>
              <ul className="space-y-2">
                {conflictFlags.map((flag, index) => (
                  <ConflictFlagRow key={`${flag.field}-${index}`} flag={flag} />
                ))}
              </ul>
            </div>
          ) : null}

          {missingFlags.length ? (
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-amber-300/80">
                Missing information ({missingFlags.length})
              </p>
              <ul className="space-y-2">
                {missingFlags.map((flag, index) => (
                  <MissingFlagRow key={`${flag.field}-${index}`} flag={flag} />
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </SectionCard>
  );
}
