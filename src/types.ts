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
  descr: string;
  eligible: boolean;
  prices: Record<ClassStyle, [number, number | null]>;
  promo: Record<ClassStyle, number>;
}

export interface Book {
  id: string;
  name: string;
  english: string;
  price: [number, number | null];
  promo: [number, number | null];
  eligible: boolean;
  cover: string;
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
  telegramUsername?: string | null;
  customerPhone: string;
  createdAt: string;
  receiptFileName?: string;
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
  description: string;
  downloadCount: number;
  isSystemDoc?: boolean;
  contentPreview?: string[];
  pagesCount?: number;
}
