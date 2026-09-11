# Billing Model

## Overview

This document defines the billing structure for the Stallion Registry Platform. **Phase 1** implements subscription-only billing via Stripe.

## Pricing Structure

### Annual Subscription
- **Amount:** 39 (exact value in local currency)
- **Frequency:** Yearly
- **Currency:** User's local currency based on their country
- **Purpose:** Provides access to subscription-gated features (e.g., favorites)

## Currency Handling

- Pricing uses exact values in each country's local currency (no conversion)
- 39 means 39 USD in United States, 39 AUD in Australia, 39 EUR in Europe, etc.
- Users see and pay prices in their local currency
- No currency conversion or exchange rate calculations are applied

## Billing Model Details

### Subscription Payment
- Single annual subscription product
- One Stripe product, one price per currency
- Subscription state tracked via `user_profile.subscription_status` and `user_profile.subscription_expires_at`
- `user_profile.hasActiveSubscription` is derived from subscription state

## Integration Points

### Database Schema
- `user_profile.subscription_status` - Current subscription status (e.g., "active", "past_due", "canceled")
- `user_profile.subscription_expires_at` - Timestamp when subscription expires
- `user_profile.hasActiveSubscription` - Derived boolean indicating active subscription (optional, can be computed from status and expiry)

### Payment Processing
- Integration with Stripe payment gateway for subscriptions
- Subscription state derived exclusively from server-side Stripe webhook events (source of truth)

## Stripe Integration Implementation Roadmap (Conceptual)

This roadmap outlines how to integrate Stripe for subscription billing in Phase 1.

### Core checkout and subscription confirmation
- Create a single Stripe product with one price per currency for the annual subscription (39 in local currency)
- Implement a server-side endpoint or Edge Function to:
  - Create a Stripe Checkout Session for subscription checkout
  - Associate the Stripe session with `user_profile` via metadata or reference IDs
- Subscription state must be derived exclusively from server-side Stripe webhook events (not client redirects), which act as the source of truth

### Stripe webhook flow (server-side source of truth)
- Subscription state is derived exclusively from server-side Stripe webhook events
- Implement webhook handler (Edge Function) that listens for and processes the following events:
  - **`checkout.session.completed`** - Fired when a Checkout Session is successfully completed. Use this to identify when a subscription checkout is completed and link it to the user.
  - **`customer.subscription.created`** - Fired when a new subscription is created. Update `user_profile.subscription_status` to "active" and set `subscription_expires_at` based on the subscription period.
  - **`customer.subscription.updated`** - Fired when a subscription is updated (status changes, renewal, etc.). Update `subscription_status` (e.g., "active", "past_due", "canceled") and `subscription_expires_at` accordingly.
  - **`customer.subscription.deleted`** - Fired when a subscription is canceled or deleted. Update `subscription_status` to "canceled" and clear or update `subscription_expires_at`.
- Validate webhook signatures to ensure events originate from Stripe
- Implement idempotent server-side handling:
  - Use idempotency keys or idempotent upserts when updating `user_profile.subscription_status` and `subscription_expires_at`
  - Ensure handlers are safe to call multiple times (no duplicate updates)
  - Handle retries gracefully - if a webhook temporarily fails, allow Stripe to retry without side effects
- On successful subscription activation:
  - Set `user_profile.subscription_status = "active"`
  - Set `user_profile.subscription_expires_at` based on subscription period end date
  - Derive `hasActiveSubscription = true` (or compute from status and expiry)
- On subscription cancellation or expiration:
  - Update `subscription_status` accordingly (e.g., "canceled", "past_due")
  - Update `subscription_expires_at` if applicable
  - Derive `hasActiveSubscription = false`

### Phase 1 Scope (Explicitly In Scope)
- Single annual subscription ($39)
- One Stripe product, one price per currency
- Stripe Checkout
- Sync subscription state into `user_profile`:
  - `subscription_status`
  - `subscription_expires_at`
- Gate favourites via RLS based on subscription status

### Phase 1 Scope (Explicitly Out of Scope)
- Farm listing payments (handled manually)
- Refund logic
- Admin billing UI
- Transaction reporting
- Multiple checkout flows

## Business Rules

### Subscription Requirements
- Subscription is required for access to subscription-gated features (e.g., favorites)
- Subscription status is derived from Stripe webhook events (server-side source of truth)
- Subscription state is synchronized to `user_profile` fields via webhook handlers

## Future Considerations

- **Multi-farm discounts:** Potential discounts for users managing multiple farms
- **Promotional pricing:** Seasonal discounts or promotional offers
- **Corporate accounts:** Bulk pricing for organizations managing multiple farms
- **Currency stability:** Handling currency fluctuations and pricing updates

## Implementation Notes

### Phase 1
- Subscription-only billing via Stripe
- Single annual subscription product
- Server-side webhook-driven subscription state management
- Currency support for primary markets

### Future Phases (Out of Scope for Phase 1)
- Farm listing payment integration
- Refund logic and admin tooling
- Advanced billing analytics
- Transaction reporting
- Admin billing UI

