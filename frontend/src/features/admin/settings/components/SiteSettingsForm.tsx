// frontend/src/features/admin/settings/components/SiteSettingsForm.tsx

"use client";

import { useEffect, useState } from "react";

import { FALLBACK_SITE_SETTINGS } from "@/features/site/defaults";
import { WEEK_DAYS } from "@/features/site/types";
import type { OpeningDay, SiteSettings, WeekDay } from "@/features/site/types";

type SettingsResponse = SiteSettings & {
  updatedAt: string;
};

const inputClassName =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";

const labelClassName = "mb-1.5 block text-sm font-medium text-slate-700";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>

      {children}
    </section>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  maxLength,
  required = false,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  maxLength?: number;
  required?: boolean;
}) {
  return (
    <div>
      <label className={labelClassName} htmlFor={name}>
        {label}
        {required && <span className="ml-1 text-red-600">*</span>}
      </label>

      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        required={required}
        className={inputClassName}
      />
    </div>
  );
}

function TextAreaField({
  label,
  name,
  value,
  onChange,
  placeholder,
  maxLength,
  rows = 4,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
}) {
  return (
    <div>
      <label className={labelClassName} htmlFor={name}>
        {label}
      </label>

      <textarea
        id={name}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={rows}
        className={inputClassName}
      />

      {maxLength && (
        <p className="mt-1 text-right text-xs text-slate-400">
          {value.length}/{maxLength} characters
        </p>
      )}
    </div>
  );
}

async function getErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();

    if (
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof body.error === "string"
    ) {
      return body.error;
    }
  } catch {
    // Use the fallback message if the response is not valid JSON.
  }

  return "Something went wrong. Please try again.";
}

function formatDay(day: WeekDay): string {
  const names: Record<WeekDay, string> = {
    mon: "Monday",
    tue: "Tuesday",
    wed: "Wednesday",
    thu: "Thursday",
    fri: "Friday",
    sat: "Saturday",
    sun: "Sunday",
  };

  return names[day];
}

export default function SiteSettingsForm() {
  const [settings, setSettings] = useState<SiteSettings>(FALLBACK_SITE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadSettings() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/admin/site/", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(await getErrorMessage(response));
        }

        const data = (await response.json()) as SettingsResponse;

        setSettings(data);
        setUpdatedAt(data.updatedAt);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }

        setError(err instanceof Error ? err.message : "Unable to load website settings.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadSettings();

    return () => controller.abort();
  }, []);

  function updateField<K extends keyof SiteSettings>(field: K, value: SiteSettings[K]) {
    setSettings((current) => ({
      ...current,
      [field]: value,
    }));

    setSuccess("");
  }

  function updateOpeningDay(day: WeekDay, changes: Partial<OpeningDay>) {
    setSettings((current) => ({
      ...current,
      openingHours: current.openingHours.map((item) =>
        item.day === day ? { ...item, ...changes } : item,
      ),
    }));

    setSuccess("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    const payload = {
      business_name: settings.businessName,
      tagline: settings.tagline,
      about_text: settings.aboutText,
      phone: settings.phone,
      whatsapp_number: settings.whatsappNumber,
      whatsapp_greeting: settings.whatsappGreeting,
      email: settings.email,
      address: settings.address,
      google_maps_url: settings.googleMapsUrl,
      opening_hours: settings.openingHours,
      hours_note: settings.hoursNote,
      facebook_url: settings.facebookUrl,
      instagram_url: settings.instagramUrl,
      tiktok_url: settings.tiktokUrl,
      order_note: settings.orderNote,
      seo_title: settings.seoTitle,
      seo_description: settings.seoDescription,
    };

    try {
      const response = await fetch("/api/admin/site/", {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      const data = (await response.json()) as SettingsResponse;

      setSettings(data);
      setUpdatedAt(data.updatedAt);
      setSuccess("Website settings saved successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save website settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
          <p className="mt-3 text-sm text-slate-500">Loading website settings...</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Website Settings</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage the business information displayed across your storefront.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving changes..." : "Save changes"}
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          {success}
        </div>
      )}

      <Section
        title="Business information"
        description="The name and description customers see when visiting your website."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Business name"
            name="businessName"
            value={settings.businessName}
            onChange={(value) => updateField("businessName", value)}
            placeholder="e.g. Mwangaza Agrovet"
            maxLength={120}
            required
          />

          <Field
            label="Tagline"
            name="tagline"
            value={settings.tagline}
            onChange={(value) => updateField("tagline", value)}
            placeholder="A short description of your business"
            maxLength={160}
          />

          <div className="sm:col-span-2">
            <TextAreaField
              label="About the business"
              name="aboutText"
              value={settings.aboutText}
              onChange={(value) => updateField("aboutText", value)}
              placeholder="Tell customers about your business..."
              rows={5}
            />
          </div>
        </div>
      </Section>

      <Section
        title="Contact and WhatsApp"
        description="How customers can reach your business and place orders."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Phone number"
            name="phone"
            value={settings.phone}
            onChange={(value) => updateField("phone", value)}
            placeholder="+254 7XX XXX XXX"
            maxLength={30}
          />

          <Field
            label="WhatsApp number"
            name="whatsappNumber"
            value={settings.whatsappNumber}
            onChange={(value) => updateField("whatsappNumber", value)}
            placeholder="2547XXXXXXXX"
            maxLength={15}
          />

          <Field
            label="Email address"
            name="email"
            type="email"
            value={settings.email}
            onChange={(value) => updateField("email", value)}
            placeholder="info@example.com"
          />

          <Field
            label="WhatsApp greeting"
            name="whatsappGreeting"
            value={settings.whatsappGreeting}
            onChange={(value) => updateField("whatsappGreeting", value)}
            placeholder="Hello, I would like to order:"
            maxLength={200}
          />

          <div className="sm:col-span-2">
            <label className={labelClassName}>Generated WhatsApp link</label>
            <input
              type="text"
              value={settings.whatsappUrl}
              readOnly
              className={`${inputClassName} bg-slate-50 text-slate-500`}
            />
            <p className="mt-1 text-xs text-slate-500">
              This link is generated automatically from your WhatsApp number.
            </p>
          </div>
        </div>
      </Section>

      <Section
        title="Business location"
        description="Your physical location and the map customers can use to find you."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Business address"
            name="address"
            value={settings.address}
            onChange={(value) => updateField("address", value)}
            placeholder="Town, street or building"
            maxLength={255}
          />

          <Field
            label="Google Maps URL"
            name="googleMapsUrl"
            type="url"
            value={settings.googleMapsUrl}
            onChange={(value) => updateField("googleMapsUrl", value)}
            placeholder="https://maps.google.com/..."
          />
        </div>
      </Section>

      <Section
        title="Opening hours"
        description="Set the days and times when your business is open."
      >
        <div className="space-y-4">
          {WEEK_DAYS.map((day) => {
            const hours = settings.openingHours.find((item) => item.day === day);

            if (!hours) {
              return (
                <div
                  key={day}
                  className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
                >
                  {formatDay(day)}: Opening hours were not provided by the server. Reload the
                  settings before editing.
                </div>
              );
            }

            return (
              <div
                key={day}
                className="grid gap-3 rounded-lg border border-slate-200 p-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-800">{formatDay(day)}</p>
                </div>

                <div>
                  <label className={labelClassName} htmlFor={`${day}-opens`}>
                    Opens
                  </label>
                  <input
                    id={`${day}-opens`}
                    type="time"
                    value={hours.opens}
                    disabled={hours.closed}
                    onChange={(event) => updateOpeningDay(day, { opens: event.target.value })}
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label className={labelClassName} htmlFor={`${day}-closes`}>
                    Closes
                  </label>
                  <input
                    id={`${day}-closes`}
                    type="time"
                    value={hours.closes}
                    disabled={hours.closed}
                    onChange={(event) => updateOpeningDay(day, { closes: event.target.value })}
                    className={inputClassName}
                  />
                </div>

                <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={hours.closed}
                    onChange={(event) =>
                      updateOpeningDay(day, {
                        closed: event.target.checked,
                        ...(event.target.checked ? { opens: "", closes: "" } : {}),
                      })
                    }
                    className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                  />
                  Closed
                </label>
              </div>
            );
          })}

          <TextAreaField
            label="Opening hours note"
            name="hoursNote"
            value={settings.hoursNote}
            onChange={(value) => updateField("hoursNote", value)}
            placeholder="e.g. Public holidays may affect opening hours."
            maxLength={160}
            rows={2}
          />
        </div>
      </Section>

      <Section title="Social media" description="Add links to your official social media accounts.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Facebook URL"
            name="facebookUrl"
            type="url"
            value={settings.facebookUrl}
            onChange={(value) => updateField("facebookUrl", value)}
            placeholder="https://facebook.com/..."
          />

          <Field
            label="Instagram URL"
            name="instagramUrl"
            type="url"
            value={settings.instagramUrl}
            onChange={(value) => updateField("instagramUrl", value)}
            placeholder="https://instagram.com/..."
          />

          <Field
            label="TikTok URL"
            name="tiktokUrl"
            type="url"
            value={settings.tiktokUrl}
            onChange={(value) => updateField("tiktokUrl", value)}
            placeholder="https://tiktok.com/@..."
          />
        </div>
      </Section>

      <Section
        title="Storefront messages and SEO"
        description="Control customer-facing order information and search engine metadata."
      >
        <div className="grid gap-5">
          <TextAreaField
            label="Order note"
            name="orderNote"
            value={settings.orderNote}
            onChange={(value) => updateField("orderNote", value)}
            placeholder="Explain how orders are confirmed..."
            maxLength={300}
            rows={3}
          />

          <Field
            label="SEO title"
            name="seoTitle"
            value={settings.seoTitle}
            onChange={(value) => updateField("seoTitle", value)}
            placeholder="Your business name | Your tagline"
            maxLength={70}
          />

          <TextAreaField
            label="SEO description"
            name="seoDescription"
            value={settings.seoDescription}
            onChange={(value) => updateField("seoDescription", value)}
            placeholder="A short description for search engines..."
            maxLength={160}
            rows={3}
          />
        </div>
      </Section>

      <div className="flex flex-col-reverse justify-between gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center">
        <p className="text-xs text-slate-500">
          {updatedAt
            ? `Last updated: ${new Date(updatedAt).toLocaleString()}`
            : "Settings have not yet been updated."}
        </p>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center rounded-lg bg-emerald-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving changes..." : "Save website settings"}
        </button>
      </div>
    </form>
  );
}
