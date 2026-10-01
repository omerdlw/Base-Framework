import raw from "../../project.config.json";

export const project = Object.freeze({
  name: raw.name,
  slug: raw.slug,
  domain: raw.domain,
  description:
    (raw as { description?: string }).description?.trim() || raw.name,
});
