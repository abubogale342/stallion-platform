# Authentication - Supabase

## Overview

This document defines the authentication model for the Stallion Registry Platform using Supabase.

## Authentication Model

### User Types

The platform supports two user types (determined by `user_profile.isAdmin`):
- **Administrators** (`isAdmin = true`) - Platform administrators with full access
- **Customers** (`isAdmin = false`) - Regular users who can submit requests and manage favorites

### Supabase Auth Integration

- User authentication is handled by Supabase Auth (`auth.users` table)
- `user_profile.auth_id` references `auth.users.id` (UUID)

### Helper Functions

A helper function checks if the current user has admin privileges by looking up their `isAdmin` field in the `user_profile` table. The function returns `true` if `isAdmin = true`, otherwise `false`.

---

## Subscription Gated Features

### Overview

Subscription status gates access to platform features. The `user_profile.subscription_status` and `user_profile.subscription_expires_at` fields (or derived `hasActiveSubscription`) determine access to subscription-based features.

### Feature Access

**Subscription-Gated Features:**
- Adding stallions to favorites requires an active subscription
- Subscription status is derived from `user_profile.subscription_status` and `subscription_expires_at` (or computed `hasActiveSubscription`)
- Users without an active subscription cannot create favorite entries

### Subscription Status Control

Subscription status is controlled by Stripe webhook events (server-side source of truth). Users cannot modify subscription status directly. Subscription state is synchronized to `user_profile` fields via webhook handlers that process Stripe events.

---

## RLS Strategy (Current Phase)

RLS is enabled on **all tables** to ensure that every query is evaluated against row-level access rules. The strategy for this phase is:

- **Public-readable tables**
  - Some tables are intentionally readable by anonymous/public users for directory and discovery purposes:
    - `stallion`, `stallion_pedigree`, `stallion_performance_result`, `stallion_notable_progeny`
    - `Owner` (public owner profiles)
    - `service_provider` and `association_registry` (reference directories)
  - These tables are read-only for non-admin users; only admins can modify their contents.

- **Admin capabilities**
  - Admin users (`isAdmin = true`) can create, read, update, and delete (CRUD) rows on **all tables**
  - Admin access is used for:
    - Managing stallion records and related reference data
    - Reviewing and deciding on `stallion_registry_request` records
    - Maintaining lookup and directory data

- **Non-admin users and subscription awareness**
  - Non-admin users can:
    - Create and manage `favorites` **only when** subscription is active (derived from `subscription_status` and `subscription_expires_at`, or `hasActiveSubscription`)

---

## Future Enhancements

- **Service Provider Management:** Add admin write access for Phase 2+ to allow managing the service provider directory
- **Owner Self-Service:** Allow owners to update their own profiles if they are linked to user accounts
- **Audit Logging:** Consider adding audit tables for tracking changes and maintaining compliance
- **Role-Based Permissions:** Expand beyond admin/customer if additional user roles are needed in the future
