import {
  COUNTRY_OWNERSHIP_FIELD_LABEL,
  COUNTRY_OWNERSHIP_HELPER_TEXT,
} from "@/utils/stallion";

export function CountryOwnershipFieldLabel({
  required,
  htmlFor,
}: {
  required?: boolean;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-sm font-medium text-slate-300"
    >
      {COUNTRY_OWNERSHIP_FIELD_LABEL}
      {required ? (
        <span className="text-slate-400" aria-hidden>
          {" "}
          *
        </span>
      ) : null}
    </label>
  );
}

export function CountryOwnershipFieldHelper() {
  return (
    <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
      {COUNTRY_OWNERSHIP_HELPER_TEXT}
    </p>
  );
}

/** Standard label + helper for country-of-ownership inputs in admin forms. */
export default function CountryOwnershipField({
  children,
  required,
  htmlFor,
}: {
  children: React.ReactNode;
  required?: boolean;
  htmlFor?: string;
}) {
  return (
    <div>
      <CountryOwnershipFieldLabel required={required} htmlFor={htmlFor} />
      {children}
      <CountryOwnershipFieldHelper />
    </div>
  );
}
