# Stallion Registry Platform - Schema Specification

## Table: `stallion_registry_request`

### Overview
This table stores stallion registration requests submitted through the platform. Entries in this table are preserved for audit purposes and are archived (not deleted) after processing (both on approval and rejection). The workflow is handled by **database triggers**.

**Note:** The database triggers and approval/rejection workflows are **not part of Phase 1 Stripe integration work**. These are separate database-level operations.

**Approval workflow:**
- If approved: A **database trigger** creates an owner profile ([`Owner`](#table-owner)), stallion record ([`stallion`](#table-stallion)), and stallion ownership relationship ([`stallion_owner`](#table-stallion_owner)) from the request data. The request `status` is updated to "approved" and `is_archived` is set to `true`.

**Rejection workflow:**
- If rejected: A **database trigger** updates the request `status` to "rejected" and sets `is_archived` to `true`. The owner may receive a notification email.

### Fields

- `first_name` (VARCHAR, REQUIRED) - User's first name
- `last_name` (VARCHAR, REQUIRED) - User's last name
- `email` (VARCHAR, REQUIRED, UNIQUE) - User's email address
- `phone` (VARCHAR, REQUIRED) - User's phone number
- `ranch_farm_name` (VARCHAR, OPTIONAL) - Name of the ranch or farm
- `website` (VARCHAR, OPTIONAL) - Website URL (UI validation format: http://...; database stores as VARCHAR)
- `country` (VARCHAR, REQUIRED) - Country (flexible free-text or lookup-table-backed; suggested default: "Australia")
- `address_line_1` (VARCHAR, REQUIRED) - First line of address
- `address_line_2` (VARCHAR, OPTIONAL) - Second line of address
- `suburb` (VARCHAR, REQUIRED) - Suburb
- `state` (VARCHAR, REQUIRED) - State
- `postcode` (VARCHAR, REQUIRED) - Postcode
- `relationship_to_stallion` (VARCHAR, REQUIRED) - User's relationship to the stallion (flexible; validate via lookup table or CHECK constraint)
- `stallion_name` (VARCHAR, REQUIRED) - Name of the stallion
- `registration_number` (VARCHAR, REQUIRED, UNIQUE) - Breed registration number
- `breed` (VARCHAR, REQUIRED) - Breed of the stallion (flexible; validate via lookup table or CHECK constraint)
- `registry_association` (VARCHAR, REQUIRED) - Registry association (e.g., "AQHA NZ", "PHAA Australia")
- `date_of_birth` (DATE, REQUIRED) - Date of birth (UI validation format: mm/dd/yyyy; database uses native DATE type)
- `stallion_status` (VARCHAR, REQUIRED) - Current status of the stallion (flexible; validate via lookup table or CHECK constraint)
- `coat_colour` (VARCHAR, REQUIRED) - Coat color description
- `genetic_colour_codes` (VARCHAR/TEXT, REQUIRED) - Genetic color codes (flexible; if multiple values, store as JSON/ARRAY or junction table; validate via lookup table)
- `coat_pattern` (VARCHAR, REQUIRED) - Coat pattern description (e.g., "Solid", "Overo", "Tobiano", "Tovero", "Splash")
- `additional_coat_pattern_genetic_notes` (TEXT, OPTIONAL) - Additional notes (e.g., "minimal white, pattern not expressed, not deaf")
- `breeding_semen_availability` (JSON/ARRAY, OPTIONAL) - Available breeding/semen types (multiple selection). See [reference values](#breeding_semen_availability) for suggested options (flexible; validate via lookup table if desired)
- `semen_country_availability` (JSON/ARRAY, OPTIONAL) - Countries where semen is available (multiple selection). See [reference values](#semen_country_availability) for suggested options (flexible; validate via lookup table if desired)
- `primary_storage_distribution_provider` (VARCHAR, REQUIRED) - Primary provider (e.g., "GeneMovers", "International Horse Breeders", "Equivet")
- `breeding_notes` (TEXT, OPTIONAL) - Breeding notes (e.g., "live cover by arrangement, frozen semen for international shipments only")
- `genetic_testing_details` (JSON/ARRAY, REQUIRED) - Genetic test results (multiple selection). See [reference values](#genetic_testing_details) for suggested options (flexible; validate via lookup table if desired)
- `primary_stallion_photo_1` (VARCHAR, REQUIRED) - Primary profile image URL
- `primary_stallion_photo_2` (VARCHAR, REQUIRED) - Image of stallion standing square and side on URL
- `primary_stallion_photo_3` (VARCHAR, OPTIONAL) - Additional image (free form) URL
- `primary_stallion_photo_4` (VARCHAR, OPTIONAL) - Additional image (free form) URL
- `performance_record` (VARCHAR, OPTIONAL) - Performance record document/image URL
- `stud_fee_amount` (NUMERIC, OPTIONAL) - Stud fee amount requested (nullable; exact numeric value)
- `stud_fee_currency` (CHAR(3), OPTIONAL) - Stud fee currency code (e.g., "AUD", "USD")
- `stud_fee_note` (TEXT, OPTIONAL) - Additional notes about the requested stud fee (e.g., seasonal variation, discounts)
- `is_payment_made` (BOOLEAN, OPTIONAL, DEFAULT: false) - Whether payment has been made for the listing (**Phase 2**: Farm listing payment integration - not implemented in Phase 1)
- `submitted_by` (FOREIGN KEY, REQUIRED) - References [`user_profile.id`](#table-user_profile)
- `created_at` (TIMESTAMP) - Timestamp when request was created
- `updated_at` (TIMESTAMP) - Timestamp when request was last updated
- `status` (VARCHAR, OPTIONAL) - Request status (e.g., "pending", "approved", "rejected"; enforce via CHECK constraint if desired)
- `is_archived` (BOOLEAN, OPTIONAL, DEFAULT: false) - Whether the request has been archived (set to `true` after approval or rejection)
- `reviewed_at` (TIMESTAMP, OPTIONAL) - Timestamp when the request was reviewed
- `reviewed_by` (FOREIGN KEY, OPTIONAL) - References [`user_profile.id`](#table-user_profile) (admin who reviewed the request)
- `decision_note` (TEXT, OPTIONAL) - Note explaining the approval or rejection decision

### Reference values (suggested; not DB ENUMs)

These values are **suggested seed/reference data** for UI dropdowns and/or lookup tables. At the database level, prefer storing these fields as `VARCHAR/TEXT` and enforcing validity via either:
- **Lookup tables** (recommended for maximum flexibility and admin-managed updates), or
- **CHECK constraints** (lighter-weight, but requires migrations to change allowed values).

#### `breed`
- `Quarterhorse`
- `Paint`
- `Appaloosa`

#### `genetic_colour_codes`
- `Agouti (AG)`
- `Red factor (CCC)`
- `Cream Dilution (CD)`
- `Champagne`
- `Dun`
- `Prl - Pearl`
- `Silver`
- `Other`

#### `breeding_semen_availability`
- `Live Cover`
- `Chilled`
- `Frozen`

#### `semen_country_availability`
- `Australia`
- `New Zealand`
- `Canada`
- `America`
- `Mexico`
- `Germany`
- `Austria`
- `Italy`
- `Brazil`

#### `genetic_testing_details`
- `5-Panel`
- `7-Panel`
- `GBED - N/N`
- `HERDA - N/N`
- `HERDA - N/R`
- `HYPP - N/N`
- `HYPP - N/R`
- `MH - N/N`
- `MYHM - N/N`
- `MYHM - N/MYHM`
- `OLWS - N/N`
- `OLWS - N/R`
- `OLWS - n/O`
- `OLWS - Ovr/n`
- `Not Required`
- `Other / not listed`

#### `listing_type`
- `Ranch/farm listing`
- `Pedigree-only / historical record`

#### `stallion_status`
- `Standing (active)`
- `Not currently standing`
- `Deceased`
- `Historical/Pedigree reference only`

#### `relationship_to_stallion`
- `Owner`
- `Co-Owner`
- `Authorised Representative`
- `Stud Manager`
- `Breeding Service Provider`
- `Other`

#### `isAdmin`
- `true` - User has administrator privileges
- `false` - Regular customer user

### Notes
- Fields marked as REQUIRED must have values before submission
- Multiple selection fields (breeding_semen_availability, semen_country_availability, genetic_testing_details) can be stored as JSON arrays or in separate junction tables
- File upload fields (photos, performance records) store URLs referencing the file storage system
- Date format validation (mm/dd/yyyy) is handled at the UI level only; the database uses native DATE types

### Indexes
- `submitted_by` (foreign key)
- `reviewed_by` (foreign key)
- `status` (for filtering pending/approved/rejected requests)
- `is_archived` (for filtering archived vs active requests)

---

## Table: `Owner`

### Overview
This table stores owner/contact profile information for stallion owners. **Note:** This table maintains public-facing stallion owner profiles regardless of whether they have a login account. It is distinct from [`user_profile`](#table-user_profile), which manages authenticated platform access. A stallion owner might not be a registered user, or they might be managed by an agent.

### Fields

- `id` (PRIMARY KEY, AUTO_INCREMENT) - Unique identifier for the profile
- `first_name` (VARCHAR, REQUIRED) - Owner's first name
- `last_name` (VARCHAR, REQUIRED) - Owner's last name
- `email` (VARCHAR, REQUIRED, UNIQUE) - Owner's email address
- `phone` (VARCHAR, REQUIRED) - Owner's phone number
- `ranch_farm_name` (VARCHAR, OPTIONAL) - Name of the ranch or farm
- `website` (VARCHAR, OPTIONAL) - Website URL (UI validation format: http://...; database stores as VARCHAR)
- `country` (VARCHAR, REQUIRED) - Country (flexible free-text or lookup-table-backed; suggested default: "Australia")
- `address_line_1` (VARCHAR, REQUIRED) - First line of address
- `address_line_2` (VARCHAR, OPTIONAL) - Second line of address
- `suburb` (VARCHAR, REQUIRED) - Suburb
- `state` (VARCHAR, REQUIRED) - State
- `postcode` (VARCHAR, REQUIRED) - Postcode
- `created_at` (TIMESTAMP) - Timestamp when profile was created
- `updated_at` (TIMESTAMP) - Timestamp when profile was last updated

### Notes
- This table stores reusable owner/contact profiles that can be referenced by multiple [`stallion_registry_request`](#table-stallion_registry_request) records

### Indexes
- `email` (already unique, but index needed for uniqueness)

---

## Table: `stallion_owner`

### Overview
This table creates a many-to-many relationship between stallions and owners, including the type of relationship.

### Fields

- `id` (PRIMARY KEY, AUTO_INCREMENT) - Unique identifier for the relationship
- `stallion_id` (FOREIGN KEY, REQUIRED) - References [`stallion.id`](#table-stallion)
- `owner_id` (FOREIGN KEY, REQUIRED) - References [`Owner.id`](#table-owner)
- `relationship_to_stallion` (VARCHAR, REQUIRED) - Type of relationship (flexible; validate via lookup table or CHECK constraint)
- `created_at` (TIMESTAMP) - Timestamp when relationship was created
- `updated_at` (TIMESTAMP) - Timestamp when relationship was last updated

### Notes
- This table allows multiple owners per stallion and multiple stallions per owner
- A unique constraint should be applied on the combination of `stallion_id`, `owner_id`, and `relationship_to_stallion` to prevent duplicate relationships

### Indexes
- `stallion_id` (foreign key)
- `owner_id` (foreign key)
- Composite unique index on (`stallion_id`, `owner_id`, `relationship_to_stallion`)

---

## Table: `stallion`

### Overview
This table stores stallion information and details.

### Fields

- `id` (PRIMARY KEY, AUTO_INCREMENT) - Unique identifier for the stallion
- `stallion_name` (VARCHAR, REQUIRED) - Name of the stallion
- `registration_number` (VARCHAR, REQUIRED, UNIQUE) - Breed registration number
- `breed` (VARCHAR, REQUIRED) - Breed of the stallion (flexible; validate via lookup table or CHECK constraint)
- `registry_association` (VARCHAR, REQUIRED) - Registry association (e.g., "AQHA NZ", "PHAA Australia")
- `country` (VARCHAR, REQUIRED) - Country (flexible free-text or lookup-table-backed; suggested default: "Australia")
- `date_of_birth` (DATE, REQUIRED) - Date of birth (UI validation format: mm/dd/yyyy; database uses native DATE type)
- `stallion_status` (VARCHAR, REQUIRED) - Current status of the stallion (flexible; validate via lookup table or CHECK constraint)
- `coat_colour` (VARCHAR, REQUIRED) - Coat color description
- `genetic_colour_codes` (VARCHAR/TEXT, REQUIRED) - Genetic color codes (flexible; if multiple values, store as JSON/ARRAY or junction table; validate via lookup table)
- `coat_pattern` (VARCHAR, REQUIRED) - Coat pattern description (e.g., "Solid", "Overo", "Tobiano", "Tovero", "Splash")
- `additional_coat_pattern_genetic_notes` (TEXT, OPTIONAL) - Additional notes (e.g., "minimal white, pattern not expressed, not deaf")
- `breeding_semen_availability` (JSON/ARRAY, OPTIONAL) - Available breeding/semen types (multiple selection). See [reference values](#breeding_semen_availability) for suggested options (flexible; validate via lookup table if desired)
- `semen_country_availability` (JSON/ARRAY, OPTIONAL) - Countries where semen is available (multiple selection). See [reference values](#semen_country_availability) for suggested options (flexible; validate via lookup table if desired)
- `primary_storage_distribution_provider` (VARCHAR, REQUIRED) - Primary provider (e.g., "GeneMovers", "International Horse Breeders", "Equivet")
- `breeding_notes` (TEXT, OPTIONAL) - Breeding notes (e.g., "live cover by arrangement, frozen semen for international shipments only")
- `genetic_testing_details` (JSON/ARRAY, REQUIRED) - Genetic test results (multiple selection). See [reference values](#genetic_testing_details) for suggested options (flexible; validate via lookup table if desired)
- `primary_stallion_photo_1` (VARCHAR, REQUIRED) - Primary profile image URL
- `primary_stallion_photo_2` (VARCHAR, REQUIRED) - Image of stallion standing square and side on URL
- `primary_stallion_photo_3` (VARCHAR, OPTIONAL) - Additional image (free form) URL
- `primary_stallion_photo_4` (VARCHAR, OPTIONAL) - Additional image (free form) URL
- `performance_record` (VARCHAR, OPTIONAL) - Performance record document/image URL
- `stud_fee_amount` (NUMERIC, OPTIONAL) - Stud fee amount (nullable; exact numeric value)
- `stud_fee_currency` (CHAR(3), OPTIONAL) - Stud fee currency code (e.g., "AUD", "USD")
- `stud_fee_note` (TEXT, OPTIONAL) - Additional notes about the stud fee (e.g., seasonal variation, discounts)
- `created_at` (TIMESTAMP) - Timestamp when stallion record was created
- `updated_at` (TIMESTAMP) - Timestamp when stallion record was last updated

### Notes
- This table stores the actual stallion records that have been approved/registered
- Multiple selection fields (breeding_semen_availability, semen_country_availability, genetic_testing_details) can be stored as JSON arrays or in separate junction tables
- File upload fields (photos, performance records) store URLs referencing the file storage system
- Date format validation (mm/dd/yyyy) is handled at the UI level only; the database uses native DATE types

### Indexes
- `registration_number` (already unique, but index needed for uniqueness)
- `breed` (for filtering by breed)
- `country` (for filtering by country)

---

## Table: `stallion_pedigree`

### Overview
This table stores pedigree information for each stallion, allowing multi-generation ancestor lines to be recorded in a flexible, sortable structure.

### Fields

- `id` (PRIMARY KEY, AUTO_INCREMENT) - Unique identifier for the pedigree row
- `stallion_id` (FOREIGN KEY, REQUIRED) - References [`stallion.id`](#table-stallion)
- `generation` (INTEGER, REQUIRED) - Generation distance from the stallion (e.g., 1 = parents, 2 = grandparents)
- `line` (VARCHAR, REQUIRED) - Pedigree line descriptor (e.g., "sire", "dam", "paternal grandsire")
- `relation` (VARCHAR, REQUIRED) - Short relationship label (e.g., "sire", "dam", "grandsire")
- `ancestor_name` (VARCHAR, REQUIRED) - Name of the ancestor
- `ancestor_registration_number` (VARCHAR, OPTIONAL) - Registration number of the ancestor (if known)
- `sort_order` (INTEGER, OPTIONAL) - Sort order within a given generation/line for UI display

### Notes
- Supports arbitrary depth by increasing `generation` values
- `line` and `relation` are flexible text fields to support different registry conventions

### Indexes
- `stallion_id` (for fetching pedigree by stallion)
- Composite index on (`stallion_id`, `generation`, `sort_order`) for ordered pedigree views

---

## Table: `stallion_performance_result`

### Overview
This table stores performance results for each stallion, capturing show, competition, or event outcomes over time.

### Fields

- `id` (PRIMARY KEY, AUTO_INCREMENT) - Unique identifier for the performance result row
- `stallion_id` (FOREIGN KEY, REQUIRED) - References [`stallion.id`](#table-stallion)
- `year` (INTEGER, OPTIONAL) - Calendar year of the result
- `association_event` (VARCHAR, REQUIRED) - Association or event name (e.g., "AQHA World Show", "NRHA Futurity")
- `discipline_class` (VARCHAR, REQUIRED) - Discipline or class name (e.g., "Reining Open", "Trail", "Halters")
- `result` (VARCHAR, REQUIRED) - Result summary (e.g., "Champion", "Top 5", "Finalist")
- `reference_url` (VARCHAR, OPTIONAL) - URL to official results, score sheets, or verification
- `sort_order` (INTEGER, OPTIONAL) - Sort order for displaying results (e.g., most important results first)

### Notes
- Results can be filtered by year, association/event, and discipline/class
- `sort_order` allows manual curation of highlight results

### Indexes
- `stallion_id` (for fetching performance by stallion)
- `year` (for filtering by competition year)

---

## Table: `stallion_notable_progeny`

### Overview
This table stores notable progeny for each stallion, allowing an unlimited number of offspring achievements to be recorded and displayed.

### Fields

- `id` (PRIMARY KEY, AUTO_INCREMENT) - Unique identifier for the notable progeny row
- `stallion_id` (FOREIGN KEY, REQUIRED) - References [`stallion.id`](#table-stallion)
- `name` (VARCHAR, REQUIRED) - Name of the progeny
- `year` (INTEGER, REQUIRED) - Year of the achievement or notable result
- `association` (VARCHAR, OPTIONAL) - Association or organisation context (e.g., "AQHA", "NRHA")
- `discipline` (VARCHAR, REQUIRED) - Discipline or category (e.g., "Reining", "Trail", "Halters")
- `achievement` (VARCHAR, OPTIONAL) - Short description of the achievement (e.g., "World Champion", "Multiple ROMs")
- `reference_url` (VARCHAR, OPTIONAL) - URL to verify the achievement or provide more detail
- `sort_order` (INTEGER, OPTIONAL) - Sort order for displaying progeny (e.g., most notable first)

### Notes
- Supports an unlimited number of notable progeny entries per stallion
- Can be filtered by year, association, or discipline for UI displays

### Indexes
- `stallion_id` (for fetching notable progeny by stallion)
- `year` (for filtering by year of achievement)

---

## Table: `user_profile`

### Overview
This table stores user profile information linked to authentication. **Note:** This table is exclusively for **logged-in users** (admins, customers, stallion owners with accounts) and links directly to the auth system. It is distinct from [`Owner`](#table-owner), which stores public stallion owner details (which may exist without a login).

### Fields

- `id` (PRIMARY KEY, AUTO_INCREMENT) - Unique identifier for the user profile
- `auth_id` (FOREIGN KEY, REQUIRED, UNIQUE) - References `auth.users.id` (UUID)
- `isAdmin` (BOOLEAN, REQUIRED, DEFAULT: false) - Whether the user has administrator privileges
- `first_name` (VARCHAR, REQUIRED) - User's first name
- `last_name` (VARCHAR, REQUIRED) - User's last name
- `email` (VARCHAR, REQUIRED, UNIQUE) - User's email address
- `phone` (VARCHAR, OPTIONAL) - User's phone number
- `subscription_status` (TEXT/VARCHAR, OPTIONAL) - Current subscription status (e.g., "active", "past_due", "canceled"). Updated via Stripe webhook events.
- `subscription_expires_at` (TIMESTAMP, OPTIONAL) - Timestamp when subscription expires. Updated via Stripe webhook events.
- `hasActiveSubscription` (BOOLEAN, OPTIONAL, DEFAULT: false) - Whether user has an active subscription (derived/optional field, can be computed from `subscription_status` and `subscription_expires_at`)
- `created_at` (TIMESTAMP) - Timestamp when profile was created
- `updated_at` (TIMESTAMP) - Timestamp when profile was last updated

### Notes
- This table links user profiles to the authentication system
- Each user profile must have a unique reference to an auth record
- `subscription_status` and `subscription_expires_at` are updated via Stripe webhook events (server-side source of truth)
- `hasActiveSubscription` can be derived from `subscription_status` and `subscription_expires_at` (e.g., status = "active" AND expires_at > NOW())

### Indexes
- `auth_id` (foreign key, already unique)
- `email` (already unique, but index needed for uniqueness)
- `isAdmin` (for filtering admin users)
- `subscription_status` (for filtering by subscription status)
- `subscription_expires_at` (for filtering/querying subscription expiry)
- `hasActiveSubscription` (for filtering users with active subscriptions, if kept as stored field)

---

## Table: `favorites`

### Overview
This table stores user favorites, linking users to their favorite stallions.

### Fields

- `id` (PRIMARY KEY, AUTO_INCREMENT) - Unique identifier for the favorite record
- `user_profile_id` (FOREIGN KEY, REQUIRED) - References [`user_profile.id`](#table-user_profile)
- `stallion_id` (FOREIGN KEY, REQUIRED) - References [`stallion.id`](#table-stallion)
- `created_at` (TIMESTAMP) - Timestamp when favorite was created
- `updated_at` (TIMESTAMP) - Timestamp when favorite was last updated

### Notes
- This table creates a many-to-many relationship between [`user_profile`](#table-user_profile) and [`stallion`](#table-stallion)
- A unique constraint should be applied on the combination of `user_profile_id` and `stallion_id` to prevent duplicate favorites

### Indexes
- `user_profile_id` (foreign key)
- `stallion_id` (foreign key)
- Composite unique index on (`user_profile_id`, `stallion_id`)

---

## Table: `lookup_values`

### Overview
This table stores dynamic reference data (key-value pairs) for flexible fields like breed, country, stallion status, etc. It allows admins to manage dropdown options without schema changes. **Note:** A seed file containing all values from the "Reference values" section will be created to populate this table initially.

### Fields

- `id` (PRIMARY KEY, AUTO_INCREMENT) - Unique identifier for the lookup value
- `category` (VARCHAR, REQUIRED) - The category/type of the value (e.g., "breed", "country", "stallion_status")
- `value` (VARCHAR, REQUIRED) - The actual value to be stored/displayed (e.g., "Quarterhorse", "Australia")
- `label` (VARCHAR, OPTIONAL) - User-friendly label if different from value (e.g., "Quarter Horse (QH)")
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this value is currently available for selection
- `sort_order` (INTEGER, OPTIONAL, DEFAULT: 0) - For controlling display order in UI
- `created_at` (TIMESTAMP) - Timestamp when value was created
- `updated_at` (TIMESTAMP) - Timestamp when value was last updated

### Notes
- Used to populate UI dropdowns for fields marked as "flexible/lookup-table-backed"
- `category` should match the field name or logical group (e.g., `genetic_testing_details`, `listing_type`)
- Unique constraint on (`category`, `value`) prevents duplicates within a category
- **Validation:** Fields referencing these values may enforce validation on insert/update (e.g., via trigger or application logic) to ensure the value exists in this table for the corresponding category

### Indexes
- `category` (for efficient fetching of options by type)
- Composite unique index on (`category`, `value`)
- `is_active` (for filtering active options)

---

## Table: `service_provider`

### Overview
This table stores a lightweight reference directory of service providers (importers, exporters, and breeding agents) for international stallion owners. **Phase 1:** This is a read-only, reference-only table with seeded data. No authentication, payments, or admin UI required. It serves as a neutral contact directory.

### Fields

- `id` (PRIMARY KEY, AUTO_INCREMENT) - Unique identifier for the service provider
- `name` (VARCHAR, REQUIRED) - Name of the service provider/company
- `provider_type` (VARCHAR, REQUIRED) - Type of provider (e.g., "agent", "importer", "exporter")
- `countries_serviced` (JSON/ARRAY or TEXT, REQUIRED) - Countries where services are available (multiple selection)
- `website` (VARCHAR, OPTIONAL) - Website URL
- `contact_email` (VARCHAR, REQUIRED) - Contact email address
- `description` (TEXT, OPTIONAL) - Description of services provided
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this provider is currently active/listed
- `created_at` (TIMESTAMP) - Timestamp when provider record was created

### Notes
- **Phase 1:** Data is seeded only; no admin UI or authentication required
- `countries_serviced` can be stored as JSON array or comma-separated text depending on database capabilities
- This is a reference-only directory; no payment or booking functionality in Phase 1

### Indexes
- `provider_type` (for filtering by type: agent/importer/exporter)
- `is_active` (for filtering active providers)
- `contact_email` (for uniqueness if needed)

---

## Table: `association_registry`

### Overview
This table stores a lightweight reference directory of official breed associations and registries (non-commercial) for international stallion owners. **Phase 1:** This is a read-only, reference-only table with seeded data. No authentication, payments, or admin UI required. It serves as a neutral reference directory, separate from commercial service providers to maintain Registry neutrality.

### Fields

- `id` (PRIMARY KEY, AUTO_INCREMENT) - Unique identifier for the association/registry
- `name` (VARCHAR, REQUIRED) - Association/registry name (UI label: \"Association\"; e.g., "AQHA", "AmQHA")
- `country` (VARCHAR, REQUIRED) - Country where the association/registry is based
- `website` (VARCHAR, OPTIONAL) - Website URL
- `is_active` (BOOLEAN, DEFAULT: true) - Whether this association/registry is currently active/listed
- `created_at` (TIMESTAMP) - Timestamp when association/registry record was created

### Notes
- **Phase 1:** Data is seeded only; no admin UI or authentication required
- This table is separate from `service_provider` to distinguish official bodies from commercial providers
- This is a reference-only directory; no payment or booking functionality in Phase 1

### Indexes
- `country` (for filtering by country)
- `is_active` (for filtering active associations/registries)

---

## UI Mapping (Conceptual)

This section describes how key UI sections conceptually map to database tables:

- **Stallion Profile (core details)**: Backed by the `stallion` table (identity, registration, colour, stud fee, photos, core info)
- **Pedigree section/tab**: Backed by the `stallion_pedigree` table (multi-generation ancestor lines)
- **Performance/Results section/tab**: Backed by the `stallion_performance_result` table (show and competition results)
- **Notable Progeny section/tab**: Backed by the `stallion_notable_progeny` table (offspring achievements)

- **Owner details (public owner profile / contact panel)**: Backed by the `Owner` table (owner/contact name, ranch/farm, location, contact details)
- **Service Providers directory (agents/importers/exporters listing)**: Backed by the `service_provider` table (commercial providers directory)
- **Associations/Registries directory (non-commercial reference)**: Backed by the `association_registry` table (official bodies/registries)
