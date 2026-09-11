export type AdminDashboardBreakdownRow = {
  label: string;
  count: number;
};

export type AdminDashboardCountryDisciplineRow = {
  country: string;
  discipline: string;
  count: number;
};

export type AdminDashboardStats = {
  totals: { stallions: number };
  byPublishStatus: { published: number; draft: number };
  review: { stallionResearches: number };
  byCountry: AdminDashboardBreakdownRow[];
  byDiscipline: AdminDashboardBreakdownRow[];
  countryDiscipline: AdminDashboardCountryDisciplineRow[];
  photos: { withImage: number; withoutImage: number };
  geneticTesting: { withResults: number; withoutResults: number };
  generatedAt: string;
};
