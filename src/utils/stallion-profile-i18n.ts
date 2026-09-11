import type { StallionBreed } from "@/types/stallion";
import { breedTypeToDisplay } from "@/utils/common";
import en from "../../messages/en.json";
import ptBR from "../../messages/pt-BR.json";

const BREED_MESSAGE_KEYS: Record<StallionBreed, string> = {
  "Quarter Horse": "quarterHorse",
  Paint: "paint",
  Appaloosa: "appaloosa",
};

type BreedMessages = {
  stallions?: {
    filters?: {
      breeds?: Record<string, string>;
    };
  };
};

function breedMessagesForLocale(locale: string): BreedMessages {
  return (locale === "pt-BR" ? ptBR : en) as BreedMessages;
}

export function breedMessageKey(
  breed: string | undefined | null
): string | undefined {
  if (!breed?.trim()) return undefined;
  const display = breedTypeToDisplay(breed.trim());
  return BREED_MESSAGE_KEYS[display];
}

export function formatBreedLabelFallback(
  breed: string | undefined | null,
  locale: string
): string | undefined {
  if (!breed?.trim()) return undefined;
  const display = breedTypeToDisplay(breed.trim());
  const key = BREED_MESSAGE_KEYS[display];
  const messages = breedMessagesForLocale(locale).stallions?.filters?.breeds;
  if (key && messages?.[key]) return messages[key];
  return display;
}

export function splitDisciplineCoverageText(value: string): string[] {
  return value
    .split(/[,;|]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function joinDisciplineCoverage(labels: string[]): string {
  return labels.filter(Boolean).join(", ");
}
