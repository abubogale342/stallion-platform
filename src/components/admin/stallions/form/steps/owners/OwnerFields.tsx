"use client";

import type { FormOwnerLink } from "@/types/stallion-form";
import Input from "@/ui/Input";
import Label from "@/ui/Label";
import Textarea from "@/ui/Textarea";

export function OwnerFields({
  fields,
  onChange,
}: {
  fields: FormOwnerLink;
  onChange: (next: FormOwnerLink) => void;
}) {
  const set = <K extends keyof FormOwnerLink>(key: K, value: FormOwnerLink[K]) =>
    onChange({ ...fields, [key]: value });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label variant="admin" required>
          Owner name
        </Label>
        <Input
          className="mt-1.5"
          value={fields.owner_name}
          onChange={(e) => set("owner_name", e.target.value)}
        />
      </div>
      <div>
        <Label variant="admin">Farm / ranch</Label>
        <Input
          className="mt-1.5"
          value={fields.farm_ranch}
          onChange={(e) => set("farm_ranch", e.target.value)}
        />
      </div>
      <div>
        <Label variant="admin">Country</Label>
        <Input
          className="mt-1.5"
          value={fields.country}
          onChange={(e) => set("country", e.target.value)}
        />
      </div>
      <div>
        <Label variant="admin">Email</Label>
        <Input
          className="mt-1.5"
          type="email"
          value={fields.email}
          onChange={(e) => set("email", e.target.value)}
        />
      </div>
      <div>
        <Label variant="admin">Phone</Label>
        <Input
          className="mt-1.5"
          value={fields.phone}
          onChange={(e) => set("phone", e.target.value)}
        />
      </div>
      <div>
        <Label variant="admin">Website</Label>
        <Input
          className="mt-1.5"
          value={fields.farm_ranch_website}
          onChange={(e) => set("farm_ranch_website", e.target.value)}
          placeholder="https://"
        />
      </div>
      <div>
        <Label variant="admin">Facebook</Label>
        <Input
          className="mt-1.5"
          value={fields.facebook}
          onChange={(e) => set("facebook", e.target.value)}
          placeholder="URL or handle"
        />
      </div>
      <div>
        <Label variant="admin">Instagram</Label>
        <Input
          className="mt-1.5"
          value={fields.instagram}
          onChange={(e) => set("instagram", e.target.value)}
          placeholder="URL or handle"
        />
      </div>
      <div className="sm:col-span-2">
        <Label variant="admin">Full address</Label>
        <Textarea
          className="mt-1.5"
          rows={3}
          value={fields.full_address}
          onChange={(e) => set("full_address", e.target.value)}
          placeholder="Optional single block; used on the profile when set."
        />
      </div>
      <div>
        <Label variant="admin">Address line 1</Label>
        <Input
          className="mt-1.5"
          value={fields.address_line_1}
          onChange={(e) => set("address_line_1", e.target.value)}
        />
      </div>
      <div>
        <Label variant="admin">Address line 2</Label>
        <Input
          className="mt-1.5"
          value={fields.address_line_2}
          onChange={(e) => set("address_line_2", e.target.value)}
        />
      </div>
      <div>
        <Label variant="admin">Suburb</Label>
        <Input
          className="mt-1.5"
          value={fields.suburb}
          onChange={(e) => set("suburb", e.target.value)}
        />
      </div>
      <div>
        <Label variant="admin">State / region</Label>
        <Input
          className="mt-1.5"
          value={fields.state_region}
          onChange={(e) => set("state_region", e.target.value)}
        />
      </div>
      <div>
        <Label variant="admin">Postal code</Label>
        <Input
          className="mt-1.5"
          value={fields.postal_code}
          onChange={(e) => set("postal_code", e.target.value)}
        />
      </div>
      <div className="sm:col-span-2">
        <label className="flex items-center gap-2 text-sm text-slate-400">
          <input
            type="checkbox"
            checked={fields.public_display_name_only}
            onChange={(e) =>
              set("public_display_name_only", e.target.checked)
            }
          />
          Public display name only (hide contact details)
        </label>
      </div>
    </div>
  );
}
