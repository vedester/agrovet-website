// Resolves backend media paths and approved public Supabase image URLs.
const RESOLVE_BASE = "file:///";

const SUPABASE_ORIGIN = "https://nxmruecdnsgwobsjnybf.supabase.co";
const SUPABASE_MEDIA_PREFIX = "/storage/v1/object/public/media/";

export function toMediaPath(raw: string): string | null {
  let url: URL;

  try {
    url = new URL(raw, RESOLVE_BASE);
  } catch {
    return null;
  }

  // Continue supporting images served through Django's /media/ route.
  if (url.pathname.startsWith("/media/")) {
    return url.pathname;
  }

  // Accept only public images from our specific Supabase media bucket.
  if (
    url.protocol === "https:" &&
    url.origin === SUPABASE_ORIGIN &&
    url.pathname.startsWith(SUPABASE_MEDIA_PREFIX)
  ) {
    return url.toString();
  }

  return null;
}
