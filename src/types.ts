export type Page =
  | 'home'
  | 'courses'
  | 'tmm'
  | 'tls'
  | 'books'
  | 'bookDetail'
  | 'free'
  | 'account'
  | 'orders'
  | 'documents';

export type Currency = 'MMK' | 'THB';

export type ClassStyle = 'zoom' | 'video' | 'yangon' | 'mandalay';

/** Per-level price key: L1 = Level 1 only, L2 = Level 2 only, L12 = Level 1 + 2 together. */
export type LevelKey = 'L1' | 'L2' | 'L12';

export interface LevelPrice {
  original: number;
  promo: number;
}

export type PaymentMethod =
  | 'KBZPay'
  | 'WavePay'
  | 'Cash on Delivery'
  | 'Thai Bank Transfer';

export interface Course {
  id: 'speaking' | 'skills';
  name: string;
  english: string;
  thai: string;
  cover: string;
  /** Admin-set course cover image URL from Supabase (null = gradient fallback). */
  imageUrl?: string;
  descr: string;
  eligible: boolean;
  prices: Record<ClassStyle, [number, number | null]>;
  promo: Record<ClassStyle, number>;
  /**
   * Per-level prices (Level 1 / Level 2 only) for live modes (zoom/yangon/mandalay).
   * `prices` / `promo` above are the Level 1 + 2 combined price. Video has no
   * per-level prices — its price is the same however the level is chosen.
   * Admin-set from Supabase `courses.prices[mode].levels` (see catalog.ts);
   * absent = fall back to the Level 1 + 2 price.
   */
  levelPrices?: Partial<Record<ClassStyle, Partial<Record<'L1' | 'L2', LevelPrice>>>>;
}

export interface Book {
  id: string;
  name: string;
  english: string;
  price: [number, number | null];
  promo: [number, number | null];
  eligible: boolean;
  cover: string;
  /** Admin-set book cover image URL from Supabase (null = placeholder). */
  imageUrl?: string;
  summary: string;
  shortDescription: string;
  features: string[];
  chapters: string[];
}

export interface Order {
  id: string;
  kind: 'course' | 'book';
  itemId: string;
  label: string;
  status: 'pending' | 'approved';
  currency: Currency;
  total: number;
  bookIncluded?: boolean;
  bookPrice?: number;
  delivery?: 'Myanmar' | 'Thailand' | null;
  payment: PaymentMethod;
  studentName?: string | null;
  enrollerName?: string | null;
  telegramUsername?: string | null;
  customerPhone: string;
  createdAt: string;
  receiptFileName?: string;
  driveFileUrl?: string;
  driveFileId?: string;
  documentId?: string;
}

export interface UserProfile {
  phone: string;
  viberPhone: string;
  telegramPhone: string;
  gmail: string;
  address: string;
}

export type DocumentCategory =
  | 'all'
  | 'course_materials'
  | 'worksheets'
  | 'receipts'
  | 'student_records'
  | 'certificates';

export interface AppDocument {
  id: string;
  title: string;
  englishTitle: string;
  category: Exclude<DocumentCategory, 'all'>;
  fileType: 'PDF' | 'DOC' | 'IMG';
  fileSize: string;
  updatedAt: string;
  courseId?: 'speaking' | 'skills' | 'book' | 'general';
  orderId?: string;
  driveFileUrl?: string;
  description: string;
  downloadCount: number;
  isSystemDoc?: boolean;
  contentPreview?: string[];
  pagesCount?: number;
}
