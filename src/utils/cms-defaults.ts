import type { CmsSlug, CmsBlock } from "@/types/cms";
import { ls } from "@/utils/cms-i18n";

export const CMS_SLUG_LABELS: Record<CmsSlug, string> = {
  landing: "Landing page",
  about: "About us",
  pricing: "Pricing",
};

export const CMS_DEFAULT_TITLES: Record<CmsSlug, ReturnType<typeof ls>> = {
  landing: ls("Leading Sires Registry", "Leading Sires Registry"),
  about: ls("About us", "Sobre nós"),
  pricing: ls("Pricing", "Preços"),
};

export const CMS_DEFAULTS: Record<CmsSlug, CmsBlock[]> = {
  landing: [
    {
      type: "landing_hero",
      imageSrc: "/splash_page.png",
      overline: ls(
        "NOW ONBOARDING FOUNDING STALLIONS",
        "ACEITANDO GARANHÕES FUNDADORES"
      ),
      titleBeforeAccent: ls("Performance Stallion Breeding", "Registro de Garanhões de Performance"),
      titleAccent: ls("Registry", ""),
      subtitle: ls(
        "Pedigree · Performance · Breeding Information",
        "Pedigree · Performance · Informações de Reprodução"
      ),
      description: ls(
        "Leading Sires is a performance-focused sire registry created for breeders and horsemen who value proven working genetics.",
        "Leading Sires é um registro de garanhões focado em performance, criado para criadores e profissionais que valorizam genética de trabalho comprovada."
      ),
      tags: [
        ls("Quarter Horses", "Quarter Horses"),
        ls("Paints", "Paints"),
        ls("Appaloosas", "Appaloosas"),
      ],
      cta: {
        label: ls("Stallion Directory", "Diretório de Garanhões"),
        href: "/stallions",
      },
      referenceLeftTitle: ls(
        "Performance Stallion Breeding Registry",
        "Registro de Garanhões de Performance"
      ),
      referenceLeftText: ls(
        "Each stallion is presented on a single reference page that consolidates pedigree, performance and breeding information, supported by official association records and ranch or farm websites.",
        "Cada garanhão é apresentado em uma única página de referência que consolida pedigree, performance e informações de reprodução, com suporte de registros oficiais de associações e sites de haras ou fazendas."
      ),
      referenceRightTitle: ls("Independent Reference", "Referência Independente"),
      referenceRightText: ls(
        "Leading Sires is an independent reference platform, not a marketplace. We exist to provide clear and accessible information for breeders and horsemen across international borders.",
        "Leading Sires é uma plataforma de referência independente, não um marketplace. Existimos para fornecer informações claras e acessíveis para criadores e profissionais em diferentes países."
      ),
      industryTitle: ls(
        "Built for the Western Performance Industry",
        "Construído para a Indústria de Performance Western"
      ),
      industryText: ls(
        "By centralizing verifiable data, we reduce administrative burden and contribute to industry sustainability. Our registry supports owners and farms across:",
        "Ao centralizar dados verificáveis, reduzimos a carga administrativa e contribuímos para a sustentabilidade do setor. Nosso registro apoia proprietários e haras em:"
      ),
      regions: [
        ls("Australia", "Austrália"),
        ls("New Zealand", "Nova Zelândia"),
        ls("Europe", "Europa"),
        ls("Canada", "Canadá"),
        ls("North America", "América do Norte"),
        ls("South America", "América do Sul"),
      ],
      stats: [
        { value: ls("6+", "6+"), label: ls("Regions Covered", "Regiões Cobertas") },
        { value: ls("1", "1"), label: ls("Centralised Registry", "Registro Centralizado") },
        { value: ls("3", "3"), label: ls("Breeds", "Raças") },
        { value: ls("Free", "Grátis"), label: ls("Public Access", "Acesso Público") },
      ],
      learnMore: {
        label: ls("Learn More About The Registry", "Saiba Mais Sobre o Registro"),
        href: "/about",
      },
      readyTitle: ls("Ready to list your stallion?", "Pronto para listar seu garanhão?"),
      readySubtitle: ls("Join the founding registry", "Junte-se ao registro fundador"),
      readyCta: {
        label: ls("Submit a Listing", "Enviar um Anúncio"),
        href: "/submit-stallion/before-submit",
      },
    },
  ],

  about: [
    {
      type: "heading",
      level: 1,
      text: ls("About the Leading Sires Registry", "Sobre o Leading Sires Registry"),
      align: "center",
    },
    {
      type: "text",
      align: "center",
      text: ls(
        "Leading Sires Registry is an independent, performance-focused reference created for breeders and horsemen who value proven working genetics over marketing, built to function across international borders.\n\nThe registry provides a single, seasonally updated reference page per stallion, consolidating publicly available performance, pedigree, and breeding information, alongside stud-provided details. Each listing links directly back to the official breed association and the stallion's home stud or ranch, ensuring the information remains transparent and verifiable.\n\nLeading Sires is not a stud book, association or marketplace. It does not replace any existing breed or discipline registers. Instead, it exists to reduce administrative burden for stallion owners, provide clear and accessible information for breeders, and contribute positively to the sustainability and transparency of the western performance horse industry.",
        "O Leading Sires Registry é uma referência independente e focada em performance, criada para criadores e profissionais que valorizam genética de trabalho comprovada acima de marketing, projetada para funcionar além das fronteiras internacionais.\n\nO registro oferece uma única página de referência atualizada sazonalmente por garanhão, consolidando informações públicas de performance, pedigree e reprodução, junto com detalhes fornecidos pelo haras. Cada anúncio vincula diretamente à associação oficial da raça e ao haras ou fazenda do garanhão, garantindo que as informações permaneçam transparentes e verificáveis.\n\nLeading Sires não é um stud book, associação ou marketplace. Não substitui registros existentes de raça ou disciplina. Em vez disso, existe para reduzir a carga administrativa dos proprietários de garanhões, fornecer informações claras e acessíveis para criadores e contribuir positivamente para a sustentabilidade e transparência da indústria de cavalos de performance western."
      ),
    },
    {
      type: "grid",
      columns: 2,
      cells: [
        [
          {
            type: "heading",
            level: 2,
            text: ls("Pedigree and Historical Records", "Pedigree e Registros Históricos"),
          },
          {
            type: "text",
            text: ls(
              "The registry preserves pedigree and lineage information for stallions regardless of current standing status. Deceased stallions and historically significant sires may be included for pedigree reference and research purposes.\n\nWhere a stallion is no longer standing or ownership information is incomplete, records are presented in a factual, non-speculative manner.",
              "O registro preserva informações de pedigree e linhagem de garanhões independentemente do status atual de reprodução. Garanhões falecidos e garanhões historicamente significativos podem ser incluídos para referência de pedigree e fins de pesquisa.\n\nQuando um garanhão não está mais em reprodução ou as informações de propriedade estão incompletas, os registros são apresentados de forma factual, sem especulação."
            ),
          },
        ],
        [
          {
            type: "heading",
            level: 2,
            text: ls("International Scope", "Escopo Internacional"),
          },
          {
            type: "text",
            text: ls(
              "The Leading Sires Registry support owners and farms across Australia, New Zealand, Canada, North and South America and Europe.\n\nListings are presented in a consistent, non-commercial format and link back to official association records and stud or distributor websites in their original language, allowing breeders to access reliable information across jurisdictions.",
              "O Leading Sires Registry apoia proprietários e haras na Austrália, Nova Zelândia, Canadá, América do Norte e do Sul e Europa.\n\nOs anúncios são apresentados em formato consistente e não comercial e vinculam aos registros oficiais de associações e sites de haras ou distribuidores em seu idioma original, permitindo que criadores acessem informações confiáveis em diferentes jurisdições."
            ),
          },
        ],
        [
          {
            type: "heading",
            level: 2,
            text: ls("Independence of the Registry", "Independência do Registro"),
          },
          {
            type: "text",
            text: ls(
              "Inclusion of an owner or stallion profile does not imply endorsement, recommendation, or commercial partnership. The Leading Sires Registry functions as an independent reference platform, not a marketing service.",
              "A inclusão de um proprietário ou perfil de garanhão não implica endosso, recomendação ou parceria comercial. O Leading Sires Registry funciona como uma plataforma de referência independente, não um serviço de marketing."
            ),
          },
        ],
        [
          {
            type: "heading",
            level: 2,
            text: ls("Updates and Changes", "Atualizações e Alterações"),
          },
          {
            type: "text",
            text: ls(
              "Ownership, standing status, and service arrangements may change over time. Where possible, historical changes are recorded to maintain the integrity of the registry.\n\nOwners and authorised representatives are encouraged to keep information current for active records.",
              "Propriedade, status de reprodução e arranjos de serviço podem mudar ao longo do tempo. Sempre que possível, alterações históricas são registradas para manter a integridade do registro.\n\nProprietários e representantes autorizados são incentivados a manter as informações atualizadas para registros ativos."
            ),
          },
        ],
      ],
    },
    {
      type: "buttons",
      align: "center",
      items: [
        {
          label: ls("Stallion Directory", "Diretório de Garanhões"),
          href: "/stallions",
          variant: "secondary",
        },
        {
          label: ls("Submit a Stallion Listing", "Enviar um Anúncio de Garanhão"),
          href: "/submit-stallion/before-submit",
          variant: "secondary",
        },
      ],
    },
  ],

  pricing: [
    {
      type: "heading",
      level: 1,
      text: ls("Pricing", "Preços"),
      align: "center",
    },
    {
      type: "text",
      align: "center",
      text: ls(
        "The Leading Sires Registry is an independent global reference, not a marketplace. Listings are presented in a consistent, non commercial format and are not ranked, promoted, or prioritised.",
        "O Leading Sires Registry é uma referência global independente, não um marketplace. Os anúncios são apresentados em formato consistente e não comercial e não são classificados, promovidos ou priorizados."
      ),
    },
    {
      type: "heading",
      level: 2,
      text: ls("Stallion Listings", "Anúncios de Garanhões"),
      pricingCard: true,
    },
    {
      type: "text",
      text: ls(
        "Farm/Ranch Registry Account – 79 per year\n\n(USD/EUR/AUD/CAD/NZD – billed in your selected country)\n\n• Unlimited stallion profiles under one farm or ranch\n• Standardised stallion pages with verified registry links\n• Genetics, breeding information, media and service provider links\n• Updates managed annually or as required\n• No advertising, no featured placements, no performance rankings",
        "Conta de Registro de Fazenda/Haras – 79 por ano\n\n(USD/EUR/AUD/CAD/NZD – cobrado no país selecionado)\n\n• Perfis ilimitados de garanhões sob uma fazenda ou haras\n• Páginas padronizadas de garanhões com links de registro verificados\n• Genética, informações de reprodução, mídia e links de provedores de serviço\n• Atualizações gerenciadas anualmente ou conforme necessário\n• Sem publicidade, sem destaques pagos, sem rankings de performance"
      ),
    },
    {
      type: "heading",
      level: 2,
      text: ls("Pedigree-Only & Historical Listings", "Anúncios Apenas de Pedigree e Históricos"),
    },
    {
      type: "text",
      text: ls(
        "Pedigree and lineage records may be included at no cost where a stallion is:\n\n• deceased\n• no longer standing\n• of historical or breeding significance only\n\nThese records are presented for reference and research purposes and do not imply current availability or commercial activity.",
        "Registros de pedigree e linhagem podem ser incluídos sem custo quando um garanhão está:\n\n• falecido\n• fora de reprodução\n• apenas de significância histórica ou reprodutiva\n\nEsses registros são apresentados para fins de referência e pesquisa e não implicam disponibilidade atual ou atividade comercial."
      ),
    },
    {
      type: "heading",
      level: 2,
      text: ls("International Listings & Currency", "Anúncios Internacionais e Moeda"),
    },
    {
      type: "text",
      text: ls(
        "The Leading Sires Registry supports listings across:\n\n• Australia\n• New Zealand\n• Canada\n• North & South America\n• Europe",
        "O Leading Sires Registry suporta anúncios em:\n\n• Austrália\n• Nova Zelândia\n• Canadá\n• América do Norte e do Sul\n• Europa"
      ),
    },
    {
      type: "heading",
      level: 2,
      text: ls("Important Notes", "Notas Importantes"),
    },
    {
      type: "text",
      text: ls(
        "• The Leading Sires Registry is not a stud book, association or marketplace.\n• Listings are factual and reference based.",
        "• O Leading Sires Registry não é um stud book, associação ou marketplace.\n• Os anúncios são factuais e baseados em referência."
      ),
    },
  ],
};
