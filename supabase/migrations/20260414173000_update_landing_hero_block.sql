-- Refresh landing page to the custom hero block used by the renderer.

UPDATE public.cms_pages
SET
  blocks = $cms_landing$[
    {
      "type": "landing_hero",
      "imageSrc": "/splash_page.png",
      "overline": "NOW ONBOARDING FOUNDING STALLIONS",
      "titleBeforeAccent": "Performance Stallion Breeding",
      "titleAccent": "Registry",
      "subtitle": "Pedigree · Performance · Breeding Information",
      "description": "Leading Sires is a performance-focused sire registry created for breeders and horsemen who value proven working genetics.",
      "tags": ["Quarter Horses", "Paints", "Appaloosas"],
      "cta": { "label": "Stallion Directory", "href": "/stallions" },
      "referenceLeftTitle": "Performance Stallion Breeding Registry",
      "referenceLeftText": "Each stallion is presented on a single reference page that consolidates pedigree, performance and breeding information, supported by official association records and ranch or farm websites.",
      "referenceRightTitle": "Independent Reference",
      "referenceRightText": "Leading Sires is an independent reference platform, not a marketplace. We exist to provide clear and accessible information for breeders and horsemen across international borders.",
      "industryTitle": "Built for the Western Performance Industry",
      "industryText": "By centralizing verifiable data, we reduce administrative burden and contribute to industry sustainability. Our registry supports owners and farms across:",
      "regions": ["Australia", "New Zealand", "Europe", "Canada", "North America", "South America"],
      "stats": [
        { "value": "6+", "label": "Regions Covered" },
        { "value": "1", "label": "Centralised Registry" },
        { "value": "3", "label": "Breeds" },
        { "value": "Free", "label": "Public Access" }
      ],
      "learnMore": { "label": "Learn More About The Registry", "href": "/about" },
      "readyTitle": "Ready to list your stallion?",
      "readySubtitle": "Join the founding registry",
      "readyCta": { "label": "Submit a Listing", "href": "/submit-stallion/before-submit" }
    }
  ]$cms_landing$::jsonb,
  updated_at = now()
WHERE slug = 'landing';
