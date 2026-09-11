import Label from "./Label";
import HelperText from "./HelperText";
import ErrorText from "./ErrorText";

type FieldProps = {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  variant?: "admin" | "public" | "display" | "displayProfile";
  children: React.ReactNode;
};

export default function Field({
  label,
  required,
  hint,
  error,
  variant = "admin",
  children,
}: FieldProps) {
  return (
    <div>
      <Label required={required} variant={variant}>
        {label}
      </Label>
      {children}
      {hint ? <HelperText>{hint}</HelperText> : null}
      <ErrorText>{error}</ErrorText>
    </div>
  );
}
