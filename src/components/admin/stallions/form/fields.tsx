"use client";

import type { FieldPath, RegisterOptions } from "react-hook-form";
import { get, useFormContext } from "react-hook-form";
import type { StallionFormValues } from "@/types/stallion-form";
import { currencySelectOptions } from "@/utils/common";
import Label from "@/ui/Label";
import Input from "@/ui/Input";
import Textarea from "@/ui/Textarea";
import Select from "@/ui/Select";
import ErrorText from "@/ui/ErrorText";
import HelperText from "@/ui/HelperText";

export function FormError({ name }: { name: FieldPath<StallionFormValues> }) {
  const {
    formState: { errors },
  } = useFormContext<StallionFormValues>();
  const err = get(errors, name) as { message?: string } | undefined;
  return <ErrorText>{err?.message}</ErrorText>;
}

export function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <Label required={required} variant="admin">
      {children}
    </Label>
  );
}

export { default as SectionCard } from "./SectionCard";

export function RhfTextField<N extends FieldPath<StallionFormValues>>({
  name,
  label,
  required,
  rules,
  type = "text",
  placeholder,
  hint,
}: {
  name: N;
  label: string;
  required?: boolean;
  rules?: RegisterOptions<StallionFormValues, N>;
  type?: string;
  placeholder?: string;
  hint?: string;
}) {
  const { register } = useFormContext<StallionFormValues>();
  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      <Input
        type={type}
        placeholder={placeholder}
        {...register(name, rules)}
      />
      {hint ? <HelperText>{hint}</HelperText> : null}
      <FormError name={name} />
    </div>
  );
}

export function RhfTextarea<N extends FieldPath<StallionFormValues>>({
  name,
  label,
  rows = 4,
  rules,
  placeholder,
  hint,
}: {
  name: N;
  label: string;
  rows?: number;
  rules?: RegisterOptions<StallionFormValues, N>;
  placeholder?: string;
  hint?: string;
}) {
  const { register } = useFormContext<StallionFormValues>();
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <Textarea
        rows={rows}
        placeholder={placeholder}
        {...register(name, rules)}
      />
      {hint ? <HelperText>{hint}</HelperText> : null}
      <FormError name={name} />
    </div>
  );
}

export function RhfCurrencySelect<N extends FieldPath<StallionFormValues>>({
  name,
  label,
  required,
  rules,
  allowEmpty,
}: {
  name: N;
  label: string;
  required?: boolean;
  rules?: RegisterOptions<StallionFormValues, N>;
  /** When true, first option is blank (e.g. performance rows with no earnings). */
  allowEmpty?: boolean;
}) {
  const { watch } = useFormContext<StallionFormValues>();
  const stored = watch(name);
  return (
    <RhfSelect
      name={name}
      label={label}
      required={required}
      rules={rules}
      options={currencySelectOptions({
        allowEmpty,
        include: typeof stored === "string" ? stored : undefined,
      })}
    />
  );
}

export function RhfSelect<N extends FieldPath<StallionFormValues>>({
  name,
  label,
  required,
  rules,
  options,
  hint,
}: {
  name: N;
  label: string;
  required?: boolean;
  rules?: RegisterOptions<StallionFormValues, N>;
  options: { value: string; label: string }[];
  hint?: string;
}) {
  const { register } = useFormContext<StallionFormValues>();
  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      <Select {...register(name, rules)}>
        {options.map((o) => (
          <option key={o.value || "__empty"} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
      {hint ? <HelperText>{hint}</HelperText> : null}
      <FormError name={name} />
    </div>
  );
}

