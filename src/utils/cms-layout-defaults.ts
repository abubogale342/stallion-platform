import type { CmsFooterLayout, CmsHeaderLayout } from "@/types/cms";
import { ls } from "@/utils/cms-i18n";

export const DEFAULT_HEADER_LAYOUT: CmsHeaderLayout = {
  brand: ls("Leading Sires", "Leading Sires"),
  registry: ls("Registry", "Registro"),
  stallionDirectory: ls("Stallion Directory", "Diretório de Garanhões"),
  mareDirectory: ls("Mare Directory", "Diretório de Éguas"),
  blog: ls("Blog", "Blog"),
  about: ls("About", "Sobre"),
  pricing: ls("Pricing", "Preços"),
  resources: ls("Resources", "Recursos"),
  commercialDirectory: ls("Commercial Directory", "Diretório Comercial"),
  associationsRegistries: ls(
    "Associations & Registries",
    "Associações e Registros"
  ),
  login: ls("Login", "Entrar"),
};

export const DEFAULT_FOOTER_LAYOUT: CmsFooterLayout = {
  brandTitle: ls("Leading Sires Registry", "Leading Sires Registry"),
  tagline: ls(
    "Performance stallion reference platform",
    "Plataforma de referência de garanhões de performance"
  ),
  breeds: ls("Quarter Horses | Paints | Appaloosas", "Quarter Horses | Paints | Appaloosas"),
  regionsLine1: ls(
    "Australia | New Zealand | Europe | Canada",
    "Austrália | Nova Zelândia | Europa | Canadá"
  ),
  regionsLine2: ls("North & South America", "América do Norte e do Sul"),
  linksHeading: ls("Links", "Links úteis"),
  submitListing: ls("Submit a Listing", "Enviar um Anúncio"),
  contactHeading: ls("Contacts Us", "Fale Conosco"),
  contactEmail: "info@leadingsiresregistry.com",
  copyright: ls(
    "© 2026 Leading Sires Registry | Records may include active, historical, or deceased stallions for pedigree and reference purposes.",
    "© 2026 Leading Sires Registry | Os registros podem incluir garanhões ativos, históricos ou falecidos para fins de pedigree e referência."
  ),
  termsOfUse: ls("Terms of Use", "Termos de Uso"),
  privacyPolicy: ls("Privacy Policy", "Política de Privacidade"),
};
