# Manage Stallions — quick guide

**Where:** Dashboard → Manage Stallions (`/dashboard/stallions`). You must be signed in.

---

## Directory list

| Action | What it does |
|--------|----------------|
| Search | Filter by stallion name (updates as you type). |
| Publish status | Show All, Published, or Draft only. |
| Pagination | Move through pages at the bottom. |
| Add stallion | Opens the create wizard. |
| Name (blue link) | Public profile — only when published and a slug exists. |

---

## Row actions

- **Edit** — Full 7-step wizard (identity through owners). Photos are not here.
- **Edit media** — Primary photo, gallery, and video URL only.
- **Publish / Unpublish** — Toggles public directory visibility (with confirmation). If publish fails, a toast lists missing/invalid fields; use Edit to fix them.

**Draft** = saved in the database, hidden from the public directory.  
**Published** = visible on `/stallions/[slug]`.

---

## Creating a stallion

1. Click **Add stallion** → walk through steps 1–7 with **Next** (each step is validated before you advance).
2. On the last step (Owners), click **Save stallion** → record is created as a **draft** and you are sent to the editor.
3. Add photos via **Edit media** (from the list or after save).
4. When ready, **Publish** from the list or **Publish** on the last wizard step (draft edits).

---

## Editing a stallion

- Use the step tabs at the top to jump between sections.
- **Back / Next** — move through steps; **Next** validates the current step.
- **Save changes** — Saves without publishing (available on any step for existing records).
- **Published** listings: saving updates the live profile; you are not unpublished automatically.
- **Draft** on the last step: **Publish** saves the form, runs full publish checks, then goes live if everything passes.

**Steps:** Identity → Pedigree → Performance & racing → Progeny & crops → Breeding → Health → Owners.

**Money fields** use a currency dropdown (USD, AUD, GBP, etc.), not free text.

---

## Edit media

**URL:** `/dashboard/stallions/[id]/media`

- **Primary photo** — one hero image; Remove clears storage and DB.
- **Gallery** — Add images (multi-select); each file uploads and saves in order.
- **Video URL** — optional; click Save video URL (separate from photo uploads).
- Uploads go to Supabase storage and `stallion_images` immediately; no need to save the main wizard for photos.

Link **Full editor** returns to the wizard.

---

## Typical workflow

1. Add stallion → fill wizard → Save stallion (draft).
2. Edit media → primary + gallery.
3. Edit → finish breeding, health, owners, etc.
4. Publish when validation passes.
5. To hide from the site: Unpublish (stays in admin as draft).

---

## Tips

- Pressing Enter in text fields does not submit the wizard (avoids accidental saves).
- Publish errors point to the first step that still has problems.
- Published stallions need enough identity/breeding data to pass server-side checks; fix what the toast lists, then publish again.
