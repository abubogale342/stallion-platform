import { getCountryFlagSrc } from "@/utils/stallion";

type CountryFlagProps = {
  code: string;
  className?: string;
};

export default function CountryFlag({ code, className }: CountryFlagProps) {
  const src = getCountryFlagSrc(code);
  if (!src) return null;

  return (
    <img
      src={src}
      width={20}
      height={15}
      alt=""
      aria-hidden
      className={
        className ??
        "inline-block h-[15px] w-[20px] shrink-0 align-middle rounded-[1px] object-cover"
      }
    />
  );
}
