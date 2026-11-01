"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Building2, ImageUp, Loader2, Palette, Save, Share2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { DEFAULT_BRAND, SOCIAL_PLATFORMS, type BrandProfile, type SocialKey } from "@/lib/brand-defaults";
import { SOCIAL_ICONS } from "@/components/brand/SocialLinks";
import { adminFetch, LoadingRows, PageHeader, Panel } from "@/components/admin/kit";

/**
 * Admin → Brand (superadmin). One place for the brand name, legal details,
 * logo and social links that appear in emails, website and app footers, and
 * the Terms / Privacy pages.
 */
export function BrandSection() {
  const { data, isLoading } = useQuery<BrandProfile>({ queryKey: ["adminBrand"], queryFn: () => adminFetch("/api/admin/brand") });
  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <PageHeader icon={Palette} title="Brand" description="Name, logo, legal details and social links used across the site, app and emails." />
        <LoadingRows rows={5} />
      </div>
    );
  }
  return <BrandForm initial={data} />;
}

function BrandForm({ initial }: { initial: BrandProfile }) {
  const { toast } = useToast();
  const [form, setForm] = useState<BrandProfile>(initial);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  const set = <K extends keyof BrandProfile>(key: K, value: BrandProfile[K]) => setForm((f) => ({ ...f, [key]: value }));
  const setSocial = (key: SocialKey, value: string) => setForm((f) => ({ ...f, socials: { ...f.socials, [key]: value } }));

  const save = useMutation({
    mutationFn: () => adminFetch<BrandProfile>("/api/admin/brand", { method: "PUT", json: form }),
    onSuccess: (saved) => {
      queryClient.setQueryData(["adminBrand"], saved);
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      setForm(saved);
      toast({ title: "Brand saved", description: "Emails, footers and legal pages now use these details." });
    },
    onError: (e: Error) => toast({ title: "Couldn't save", description: e.message, variant: "destructive" }),
  });

  const uploadLogo = async (file: File) => {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body, credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || "Upload failed");
      const url = String(json.url);
      set("logoUrl", url.startsWith("http") ? url : `${window.location.origin}${url}`);
    } catch (e) {
      toast({ title: "Logo upload failed", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const logoPreview = form.logoUrl || "/icon-192.png";
  const filled = SOCIAL_PLATFORMS.filter((p) => form.socials[p.key]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Palette}
        title="Brand"
        description="Name, logo, legal details and social links used across the site, app and emails."
        actions={
          <Button className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white" disabled={!dirty || save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
            Save changes
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Panel title="Identity" description="Shown in emails, footers and the app.">
            <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
              <div className="flex flex-col items-center gap-2">
                <img src={logoPreview} alt="Logo preview" className="h-20 w-20 rounded-2xl border bg-muted object-contain" />
                <div className="flex gap-1">
                  <Button type="button" size="sm" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageUp className="h-4 w-4" />}
                  </Button>
                  {form.logoUrl && (
                    <Button type="button" size="sm" variant="ghost" onClick={() => set("logoUrl", "")} aria-label="Use the default logo">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) uploadLogo(f);
                  }}
                />
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="b-name">Brand name</Label>
                  <Input id="b-name" value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={60} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="b-logo">Logo link (PNG or JPG, https)</Label>
                  <Input id="b-logo" value={form.logoUrl} onChange={(e) => set("logoUrl", e.target.value)} placeholder="Leave empty to use the site icon" />
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-1.5">
              <Label htmlFor="b-tagline">Tagline</Label>
              <Input id="b-tagline" value={form.tagline} onChange={(e) => set("tagline", e.target.value)} maxLength={160} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Use a PNG or JPG for the logo: many email apps (including Outlook) can&apos;t show WebP or SVG.</p>
          </Panel>

          <Panel title="Legal & contact" description="Appears in the Terms, Privacy Policy and email footers.">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="b-legal">Registered business name</Label>
                <Input id="b-legal" value={form.legalName} onChange={(e) => set("legalName", e.target.value)} placeholder="e.g. 4LO4LO Ltd" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-email">Support email</Label>
                <Input id="b-email" type="email" value={form.supportEmail} onChange={(e) => set("supportEmail", e.target.value)} />
              </div>
            </div>
            <div className="mt-4 space-y-1.5">
              <Label htmlFor="b-address">Postal address</Label>
              <Textarea id="b-address" rows={2} value={form.postalAddress} onChange={(e) => set("postalAddress", e.target.value)} placeholder="Street, city, postcode, country" />
              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Privacy law requires the operator&apos;s identity and contact details, and US email law requires a postal address in announcement emails. A business address or registered PO box is fine.
              </p>
            </div>
          </Panel>

          <Panel title="Social media" description="Leave a field empty to hide that network.">
            <div className="grid gap-3 sm:grid-cols-2">
              {SOCIAL_PLATFORMS.map((p) => {
                const Icon = SOCIAL_ICONS[p.key];
                return (
                  <div key={p.key} className="space-y-1.5">
                    <Label htmlFor={`s-${p.key}`} className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full text-white" style={{ background: p.color }}>
                        <Icon className="h-3 w-3" />
                      </span>
                      {p.label}
                    </Label>
                    <Input id={`s-${p.key}`} value={form.socials[p.key] ?? ""} onChange={(e) => setSocial(p.key, e.target.value)} placeholder={p.placeholder} />
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Email preview" description="Header and footer of every email.">
            <div className="rounded-2xl bg-[#F4F2FA] p-4">
              <div className="mb-3 flex items-center gap-2">
                <img src={logoPreview} alt="" className="h-8 w-8 rounded-lg object-contain" />
                <span className="text-lg font-extrabold text-purple-700">{form.name || DEFAULT_BRAND.name}</span>
              </div>
              <div className="rounded-xl bg-white p-4 text-sm text-gray-700 shadow-sm">
                <div className="mb-3 h-1 rounded-full bg-gradient-to-r from-purple-600 to-pink-600" />
                <p className="font-bold text-gray-900">Your email content goes here</p>
                <p className="mt-1 text-gray-500">Every email uses this layout.</p>
              </div>
              <div className="mt-3 space-y-2 text-center text-xs text-gray-500">
                {filled.length > 0 && (
                  <div className="flex justify-center gap-1.5">
                    {filled.map((p) => {
                      const Icon = SOCIAL_ICONS[p.key];
                      return (
                        <span key={p.key} className="flex h-6 w-6 items-center justify-center rounded-full text-white" style={{ background: p.color }}>
                          <Icon className="h-3 w-3" />
                        </span>
                      );
                    })}
                  </div>
                )}
                <p>4lo4lo.site · Help · Privacy</p>
                <p>
                  © {new Date().getFullYear()} {form.legalName || form.name}
                  {form.postalAddress ? ` · ${form.postalAddress}` : ""}
                </p>
              </div>
            </div>
          </Panel>
          <Panel title="Where this appears">
            <ul className="space-y-2 text-sm text-muted-foreground">
              {[
                "Every email: logo and name in the header; social icons, legal name and address in the footer",
                "Website footers (home page and signed-in pages)",
                "Mobile app: More tab and welcome screen",
                "Terms of Service and Privacy Policy (operator name, address and contact email)",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <Share2 className="mt-0.5 h-4 w-4 shrink-0 text-purple-600" />
                  {t}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
