import { profileSectionTitleClassName } from "@/components/profile/sectionTitle";

type SectionProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

/** Shared profile section shell — section headings use `text-3xl`, optional subtitle ~14–15px. */
export default function Section({ title, subtitle, children }: SectionProps) {
  return (
    <section className="rounded-xl border border-(--gold-soft) bg-(--bg-surface) p-5 md:p-6">
      <div className="mb-4 space-y-2">
        <h2 className={profileSectionTitleClassName}>
          {title}
        </h2>
        {subtitle ? (
          <p className="text-[14px] leading-snug text-zinc-500 md:text-[15px] md:leading-relaxed">
            {subtitle}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
