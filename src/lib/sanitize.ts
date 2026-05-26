export function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, "");
}

export function stripControl(str: string): string {
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

export function sanitizeName(str: string): string {
  return stripControl(stripHtml(str)).replace(/[^a-zA-Z0-9\s\-'.]/g, "").trim().slice(0, 30);
}

export function sanitizeTitle(str: string): string {
  return stripControl(stripHtml(str)).replace(/[^a-zA-Z0-9\s\-'.,!?"':;()]/g, "").trim().slice(0, 30);
}

export function sanitizeBody(str: string): string {
  return stripControl(stripHtml(str)).replace(/[^a-zA-Z0-9\s\-'.,!?"':;()@#&*%+=/\n]/g, "").trim().slice(0, 100);
}
