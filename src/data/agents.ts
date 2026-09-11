export type AgentListing = {
  id: string;
  name: string;
  serviceType: string;
  region: string;
  specialisation: string;
  website?: string;
  email?: string;
  notes?: string;
};

export const agents: AgentListing[] = [
  {
    id: "AG-001",
    name: "Global Equine Logistics",
    serviceType: "Import / Export",
    region: "USA – EU",
    specialisation: "Frozen semen transport & documentation",
    website: "https://example-logistics.com",
    email: "info@example-logistics.com",
    notes: "Handles international breeding shipments and customs paperwork.",
  },
  {
    id: "AG-002",
    name: "Southern Hemisphere Breeding Services",
    serviceType: "Breeding Agent",
    region: "Australia / New Zealand",
    specialisation: "Stallion representation & semen distribution",
    website: "https://example-breeding.com",
  },
  {
    id: "AG-003",
    name: "EuroEquine Transport",
    serviceType: "Transport & Logistics",
    region: "EU",
    specialisation: "Equine transport and EU documentation",
  },
];
