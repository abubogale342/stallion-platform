import type { BreedingServiceProvider, Owner, Stallion } from "@/types/stallion";
import { profileSubheadingClassName } from "@/components/profile/sectionTitle";
import { getTranslations } from "next-intl/server";

function ownerAddress(owner: Owner): string {
  const full = owner.full_address?.trim();
  if (full) return full;
  return owner.address_city_state?.trim() ?? "";
}

function ownerHref(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, "")}`;
}

function SocialLinks({
  website,
  facebook,
  instagram,
  labels,
}: {
  website?: string;
  facebook?: string;
  instagram?: string;
  labels: {
    facebook: string;
    instagram: string;
    website: string;
  };
}) {
  const websiteHref = ownerHref(website);
  const facebookHref = ownerHref(facebook);
  const instagramHref = ownerHref(instagram);

  if (!websiteHref && !facebookHref && !instagramHref) return null;

  return (
    <div className="flex items-center gap-3 pt-1">
      {facebookHref ? (
        <a
          href={facebookHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-400 transition hover:text-white"
          aria-label={labels.facebook}
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
          </svg>
        </a>
      ) : null}
      {instagramHref ? (
        <a
          href={instagramHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-400 transition hover:text-white"
          aria-label={labels.instagram}
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.17.054 1.97.24 2.43.403a4.088 4.088 0 011.47.957c.453.453.779.898.957 1.47.163.46.35 1.26.404 2.43.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.054 1.17-.24 1.97-.404 2.43a4.088 4.088 0 01-.957 1.47 4.088 4.088 0 01-1.47.957c-.46.163-1.26.35-2.43.404-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.17-.054-1.97-.24-2.43-.404a4.088 4.088 0 01-1.47-.957 4.088 4.088 0 01-.957-1.47c-.163-.46-.35-1.26-.404-2.43C2.175 15.584 2.163 15.204 2.163 12s.012-3.584.07-4.85c.054-1.17.24-1.97.404-2.43a4.088 4.088 0 01.957-1.47 4.088 4.088 0 011.47-.957c.46-.163 1.26-.35 2.43-.404C8.416 2.175 8.796 2.163 12 2.163zM12 0C8.741 0 8.333.014 7.053.072 5.775.131 4.902.333 4.14.63a6.21 6.21 0 00-2.245 1.462A6.21 6.21 0 00.433 4.337C.136 5.1-.066 5.972-.008 7.25-.066 8.53 0 8.938 0 12.197s.014 3.667.072 4.947c.058 1.278.26 2.15.558 2.913a6.21 6.21 0 001.462 2.245 6.21 6.21 0 002.245 1.462c.762.297 1.635.5 2.913.558C8.53 24.014 8.938 24 12.197 24s3.667-.014 4.947-.072c1.278-.058 2.15-.26 2.913-.558a6.21 6.21 0 002.245-1.462 6.21 6.21 0 001.462-2.245c.297-.762.5-1.635.558-2.913.058-1.28.072-1.688.072-4.947s-.014-3.667-.072-4.947c-.058-1.278-.26-2.15-.558-2.913a6.21 6.21 0 00-1.462-2.245A6.21 6.21 0 0019.86.433C19.1.136 18.227-.066 16.95.072 15.67.014 15.262 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 11-2.88 0 1.44 1.44 0 012.88 0z" />
          </svg>
        </a>
      ) : null}
      {websiteHref ? (
        <a
          href={websiteHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-400 transition hover:text-white"
          aria-label={labels.website}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 21a9 9 0 100-18 9 9 0 000 18zM3.6 9h16.8M3.6 15h16.8M12 3a14.5 14.5 0 014 9 14.5 14.5 0 01-4 9 14.5 14.5 0 01-4-9 14.5 14.5 0 014-9z"
            />
          </svg>
        </a>
      ) : null}
    </div>
  );
}

function ProviderFieldRow({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  return (
    <p>
      <span className="text-zinc-500">{label}: </span>
      {trimmed}
    </p>
  );
}

function OwnerBlock({
  owner,
  labels,
}: {
  owner: Owner;
  labels: {
    email: string;
    mobile: string;
    social: {
      facebook: string;
      instagram: string;
      website: string;
    };
  };
}) {
  const nameOnly = Boolean(owner.public_display_name_only);
  const address = ownerAddress(owner);
  return (
    <div className="space-y-2 text-base leading-relaxed text-zinc-400">
      <p className="profile-canvas-text font-normal text-white">{owner.owner_name}</p>
      {nameOnly ? null : (
        <>
          {address ? <p className="whitespace-pre-line">{address}</p> : null}
          {owner.email?.trim() ? (
            <p>
              <span className="text-zinc-500">{labels.email}: </span>
              {owner.email.trim()}
            </p>
          ) : null}
          {owner.phone?.trim() ? (
            <p>
              <span className="text-zinc-500">{labels.mobile}: </span>
              {owner.phone.trim()}
            </p>
          ) : null}
          <SocialLinks
            website={owner.farm_ranch_website}
            facebook={owner.facebook}
            instagram={owner.instagram}
            labels={labels.social}
          />
        </>
      )}
    </div>
  );
}

function BreedingManagerBlock({
  breedingManager,
  labels,
}: {
  breedingManager: NonNullable<Stallion["breeding_manager_contact"]>;
  labels: {
    title: string;
    email: string;
    phone: string;
  };
}) {
  const name = breedingManager.name?.trim();
  const organization = breedingManager.organization?.trim();
  const email = breedingManager.email?.trim();
  const phone = breedingManager.phone?.trim();

  if (!name && !organization && !email && !phone) return null;

  return (
    <div>
      <h3 className={profileSubheadingClassName}>{labels.title}</h3>
      <div className="mt-4 space-y-2 text-base leading-relaxed text-zinc-400">
        {name ? <p className="profile-canvas-text font-normal text-white">{name}</p> : null}
        {organization ? <p>{organization}</p> : null}
        {email ? (
          <p>
            <span className="text-zinc-500">{labels.email}: </span>
            {email}
          </p>
        ) : null}
        {phone ? (
          <p>
            <span className="text-zinc-500">{labels.phone}: </span>
            {phone}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ServiceProviderCard({
  provider,
  labels,
}: {
  provider: BreedingServiceProvider;
  labels: {
    contact: string;
    country: string;
    email: string;
    phone: string;
    social: {
      facebook: string;
      instagram: string;
      website: string;
    };
  };
}) {
  return (
    <div className="w-full max-w-md shrink-0 rounded border border-white/10 bg-[var(--bg-surface)] px-4 py-3 text-base leading-relaxed text-zinc-400 sm:w-auto sm:min-w-[12rem]">
      {provider.name?.trim() ? (
        <p className="profile-canvas-text font-normal text-white">{provider.name.trim()}</p>
      ) : null}
      <div className={provider.name?.trim() ? "mt-2 space-y-2" : "space-y-2"}>
        <ProviderFieldRow label={labels.contact} value={provider.contact_name} />
        <ProviderFieldRow label={labels.country} value={provider.country} />
        <ProviderFieldRow label={labels.email} value={provider.email} />
        <ProviderFieldRow label={labels.phone} value={provider.phone} />
        <SocialLinks website={provider.website} labels={labels.social} />
      </div>
    </div>
  );
}

export default async function OwnersServiceProvidersSection({
  stallion,
}: {
  stallion: Stallion;
}) {
  const t = await getTranslations("profile.owners");
  const socialLabels = {
    facebook: t("social.facebook"),
    instagram: t("social.instagram"),
    website: t("social.website"),
  };
  const owners = stallion.owners ?? [];
  const serviceProviders = stallion.breeding_service_providers ?? [];
  const breedingManager = stallion.breeding_manager_contact;

  const hasOwners = owners.length > 0;
  const hasServiceProviders = serviceProviders.length > 0;
  const hasBreedingManager =
    Boolean(
      breedingManager &&
        (breedingManager.name ||
          breedingManager.organization ||
          breedingManager.email ||
          breedingManager.phone)
    );
  const sectionCount =
    Number(hasOwners) + Number(hasBreedingManager) + Number(hasServiceProviders);

  if (!hasOwners && !hasServiceProviders && !hasBreedingManager) {
    return null;
  }

  return (
    <section className="border-y border-white/10 px-5 py-8 sm:px-8 lg:px-10">
      <div
        className={`grid gap-10 ${
          sectionCount >= 3
            ? "lg:grid-cols-3 lg:gap-12"
            : sectionCount === 2
              ? "lg:grid-cols-2 lg:gap-16"
              : ""
        }`}
      >
        {hasOwners ? (
          <div>
            <h3 className={profileSubheadingClassName}>{t("owner")}</h3>
            <div className="mt-4 space-y-8">
              {owners.map((owner) => (
                <OwnerBlock
                  key={owner.owner_id}
                  owner={owner}
                  labels={{
                    email: t("email"),
                    mobile: t("mobile"),
                    social: socialLabels,
                  }}
                />
              ))}
            </div>
          </div>
        ) : null}

        {hasBreedingManager && breedingManager ? (
          <BreedingManagerBlock
            breedingManager={breedingManager}
            labels={{
              title: t("breedingManager"),
              email: t("email"),
              phone: t("phone"),
            }}
          />
        ) : null}

        {hasServiceProviders ? (
          <div>
            <h3 className={profileSubheadingClassName}>{t("breedingServiceProvider")}</h3>
            <div className="mt-4 flex flex-wrap gap-4">
              {serviceProviders.map((provider, index) => (
                <ServiceProviderCard
                  key={provider.id ?? `${provider.name ?? "provider"}-${index}`}
                  provider={provider}
                  labels={{
                    contact: t("contact"),
                    country: t("country"),
                    email: t("email"),
                    phone: t("phone"),
                    social: socialLabels,
                  }}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
