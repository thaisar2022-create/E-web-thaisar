/**
 * Live course catalog from Supabase (admin-controlled).
 *
 * The admin portal (THAISAR Admin Portal) stores course prices and images in
 * Supabase tables `courses`, `course_catalog` and `course_images`. This module
 * merges those rows onto the hardcoded `data.ts` fallback so the customer site
 * keeps exactly the same layout, course names, descriptions and order — only
 * prices and images come from Supabase.
 *
 * - Prices: per course + mode, Original + Promotion (MMK) — Level 1 + 2
 *   combined. Single-level prices (Level 1 / Level 2 only, live modes only)
 *   come from `courses.prices[mode].levels` in the same jsonb;
 *   `course_catalog` stays Level 1 + 2 only (one row per mode, as the admin reads it).
 * - Book add-on prices: per course + level, from
 *   `courses.prices.book_prices` (`{L1, L2}`); Level 1 + 2 = both books.
 *   The standalone Practical Thai book (150,000 / 75,000) is priced
 *   separately from `course_catalog` mode 'delivery' and is untouched.
 * - Images: per-mode posters from `course_images` / `course_catalog`
 *   (`<COURSE_CODE>:<mode>`, e.g. `TLS:yangon`), and course-level covers
 *   from `courses.image_url`.
 * - Only public http(s) URLs are used. Admin-artifact local `./blobs/...`
 *   URLs are ignored (the customer site cannot load them) so the site falls
 *   back to its gradient / placeholder instead of a broken image.
 * - No class-time, teacher-name or start-date fields are read or stored here:
 *   those live only inside the poster images themselves.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Book, ClassStyle, Course } from './types';
import { books as fallbackBooks, courses as fallbackCourses } from './data';

export interface CatalogResult {
  courses: Course[];
  books: Book[];
  /** key `${'TMM' | 'TLS'}:${ClassStyle}` -> public image URL */
  modeImages: Record<string, string>;
}

const MODES: ClassStyle[] = ['zoom', 'video', 'yangon', 'mandalay'];

function isHttpUrl(v: unknown): v is string {
  return typeof v === 'string' && /^https?:\/\//.test(v);
}

function toNumber(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export async function fetchCatalog(client: SupabaseClient): Promise<CatalogResult | null> {
  const [coursesRes, catalogRes, imagesRes] = await Promise.all([
    client.from('courses').select('id,name,image_url,prices'),
    client
      .from('course_catalog')
      .select('course_id,course_code,mode,original_price_kyat,promo_price_kyat,image_url'),
    client.from('course_images').select('course_code,mode,image_url'),
  ]);

  if (coursesRes.error || catalogRes.error || imagesRes.error) {
    return null;
  }

  const courseRows: any[] = Array.isArray(coursesRes.data) ? coursesRes.data : [];
  const catalogRows: any[] = Array.isArray(catalogRes.data) ? catalogRes.data : [];
  const imageRows: any[] = Array.isArray(imagesRes.data) ? imagesRes.data : [];

  if (courseRows.length === 0 && catalogRows.length === 0 && imageRows.length === 0) {
    return null;
  }

  // Per-mode poster images, keyed `<CODE>:<mode>`.
  // course_images stores the combined key in course_code ('TMM:zoom');
  // course_catalog stores code and mode separately.
  const modeImages: Record<string, string> = {};
  for (const row of [...catalogRows, ...imageRows]) {
    // course_images stores the combined key in course_code ('TMM:zoom');
    // course_catalog stores code and mode separately.
    const rawCode = String(row.course_code || '');
    const parts = rawCode.split(':');
    const code = parts[0].toUpperCase();
    const mode = parts.length > 1 ? parts[1] : String(row.mode || '');
    const url = row.image_url as string | null;
    if (!code || !mode || !isHttpUrl(url)) continue;
    modeImages[`${code}:${mode}`] = url;
  }

  // Per-course, per-mode prices from course_catalog (authoritative when present).
  const catalogPrices: Record<string, Partial<Record<ClassStyle, { original: number; promo: number }>>> = {};
  for (const row of catalogRows) {
    const courseId = String(row.course_id || '');
    const mode = String(row.mode || '') as ClassStyle;
    if (!courseId || !MODES.includes(mode)) continue;
    const original = Number(row.original_price_kyat);
    const promo = Number(row.promo_price_kyat);
    if (!Number.isFinite(original) || !Number.isFinite(promo)) continue;
    if (!catalogPrices[courseId]) catalogPrices[courseId] = {};
    catalogPrices[courseId][mode] = { original, promo };
  }

  const courses: Course[] = fallbackCourses.map((base) => {
    const row = courseRows.find((r) => r.id === base.id);
    const merged: Course = { ...base, prices: { ...base.prices }, promo: { ...base.promo } };
    if (row && isHttpUrl(row.image_url)) {
      merged.imageUrl = row.image_url;
    }
    // Prices from course_catalog rows first, then the courses.prices jsonb.
    for (const mode of MODES) {
      const fromCatalog = catalogPrices[base.id]?.[mode];
      if (fromCatalog) {
        merged.prices[mode] = [fromCatalog.original, null];
        merged.promo[mode] = fromCatalog.promo;
        continue;
      }
      const fromJson = row?.prices?.[mode];
      if (fromJson && Number.isFinite(Number(fromJson.original)) && Number.isFinite(Number(fromJson.promo))) {
        merged.prices[mode] = [Number(fromJson.original), null];
        merged.promo[mode] = Number(fromJson.promo);
      }
    }
    // Per-level prices (Level 1 / Level 2 only) from courses.prices[mode].levels.
    // course_catalog stays Level 1 + 2 only (the admin reads one row per mode),
    // so single-level prices live only in this jsonb. Absent = L1+2 price.
    const levelPrices: Course['levelPrices'] = { ...(base.levelPrices ?? {}) };
    for (const mode of MODES) {
      const levels = row?.prices?.[mode]?.levels;
      if (levels && typeof levels === 'object') {
        const parsed: Partial<Record<'L1' | 'L2', { original: number; promo: number }>> = {};
        for (const key of ['L1', 'L2'] as const) {
          const lv = levels[key];
          if (lv && Number.isFinite(Number(lv.original)) && Number.isFinite(Number(lv.promo))) {
            parsed[key] = { original: Number(lv.original), promo: Number(lv.promo) };
          }
        }
        if (parsed.L1 || parsed.L2) levelPrices[mode] = parsed;
      }
    }
    if (Object.keys(levelPrices).length > 0) merged.levelPrices = levelPrices;
    // Per-level book add-on prices from courses.prices.book_prices
    // (top-level key in the same jsonb, next to the mode keys). Level 1 + 2
    // = both books together. Absent = keep the data.ts fallback.
    const bookPrices = row?.prices?.book_prices;
    if (bookPrices && typeof bookPrices === 'object') {
      const parsed: Partial<Record<'L1' | 'L2', number>> = {};
      for (const key of ['L1', 'L2'] as const) {
        const v = Number(bookPrices[key]);
        if (Number.isFinite(v) && v > 0) parsed[key] = v;
      }
      if (parsed.L1 || parsed.L2) merged.bookPrices = parsed;
    }
    return merged;
  });

  const books: Book[] = fallbackBooks.map((base) => {
    const row = courseRows.find((r) => r.id === base.id);
    const merged: Book = { ...base };
    if (row && isHttpUrl(row.image_url)) {
      merged.imageUrl = row.image_url;
    }
    // The book row in course_catalog uses mode 'delivery' (not a class mode),
    // so read it directly here.
    const bookCatalog = catalogRows.find(
      (r) => String(r.course_id || '') === base.id && String(r.mode || '') === 'delivery',
    );
    if (bookCatalog) {
      merged.price = [toNumber(bookCatalog.original_price_kyat, base.price[0]), null];
      merged.promo = [toNumber(bookCatalog.promo_price_kyat, base.promo[0] ?? base.price[0]), null];
    } else {
      const fromJson = row?.prices?.delivery;
      if (fromJson && Number.isFinite(Number(fromJson.original)) && Number.isFinite(Number(fromJson.promo))) {
        merged.price = [Number(fromJson.original), null];
        merged.promo = [Number(fromJson.promo), null];
      }
    }
    return merged;
  });

  return { courses, books, modeImages };
}
