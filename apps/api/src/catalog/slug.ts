export function createSlug(value: string): string {
  const normalizedSlug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const slug = normalizedSlug.slice(0, 160).replace(/-+$/g, "");

  if (slug.length < 2) {
    throw new Error("Could not create a valid slug.");
  }

  return slug;
}
