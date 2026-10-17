/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Page,
  Currency,
  ClassStyle,
  PaymentMethod,
  Course,
  Book,
  Order,
  UserProfile,
  DocumentCategory,
  AppDocument,
} from './types';
import {
  courses,
  books,
  tmmTopics,
  tmmBenefits,
  tlsChapters,
  tlsFundamentals,
  schoolGuarantee,
  phrases,
  styleNames,
  tiers,
  initialDocuments,
} from './data';
import {
  supabase,
  isSupabaseConfigured,
  getOrCreateClientId,
  SUPABASE_STORAGE_BUCKET,
} from './supabaseClient';

const STORE_KEY = 'thaisar-mobile-demo-v11-docs';

const ENV_DRIVE_UPLOAD_URL =
  (import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL as string) ||
  (import.meta.env.VITE_GOOGLE_DRIVE_UPLOAD_URL as string) ||
  '';
const ENV_DRIVE_FOLDER_ID = (import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID as string) || '';

interface PersistData {
  orders: Order[];
  displayName: string;
  profile: UserProfile;
  documents: AppDocument[];
  driveUploadUrl?: string;
  driveFolderId?: string;
}

export default function App() {
  // Navigation & View state
  const [page, setPage] = useState<Page>('home');
  const [currency, setCurrency] = useState<Currency>('MMK');
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState<'all' | 'speaking' | 'skills'>('all');
  const [selectedBookId, setSelectedBookId] = useState('practical-thai');
  const [freeMode, setFreeMode] = useState<'video' | 'app'>('video');
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [showTrans, setShowTrans] = useState(true);

  // Document Management state
  const [docCategory, setDocCategory] = useState<DocumentCategory>('all');
  const [docSearch, setDocSearch] = useState('');
  const [previewDoc, setPreviewDoc] = useState<AppDocument | null>(null);
  const [showUploadSheet, setShowUploadSheet] = useState(false);

  // New Document form state
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocEnTitle, setNewDocEnTitle] = useState('');
  const [newDocCategory, setNewDocCategory] = useState<Exclude<DocumentCategory, 'all'>>('course_materials');
  const [newDocCourse, setNewDocCourse] = useState<'speaking' | 'skills' | 'book' | 'general'>('speaking');
  const [newDocDesc, setNewDocDesc] = useState('');
  const [newDocFileName, setNewDocFileName] = useState('');

  // Persistent storage state
  const [persist, setPersist] = useState<PersistData>(() => {
    try {
      const stored = localStorage.getItem(STORE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          orders: Array.isArray(parsed.orders) ? parsed.orders : [],
          displayName: parsed.displayName || 'THAISAR Member',
          profile: parsed.profile && typeof parsed.profile === 'object' ? parsed.profile : {
            phone: '',
            viberPhone: '',
            telegramPhone: '',
            gmail: '',
            address: '',
          },
          documents: Array.isArray(parsed.documents) ? parsed.documents : initialDocuments,
          driveUploadUrl: parsed.driveUploadUrl || '',
          driveFolderId: parsed.driveFolderId || '',
        };
      }
    } catch {
      // fallback
    }
    return {
      orders: [],
      displayName: 'THAISAR Member',
      profile: {
        phone: '',
        viberPhone: '',
        telegramPhone: '',
        gmail: '',
        address: '',
      },
      documents: initialDocuments,
      driveUploadUrl: '',
      driveFolderId: '',
    };
  });

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(persist));
    } catch {
      // ignore
    }
  }, [persist]);

  // Dynamic SEO document titles based on active page
  useEffect(() => {
    const titles: Record<Page, string> = {
      home: 'THAISAR — Thai Language School & Learning Hub',
      courses: 'သင်တန်းများ | THAISAR',
      tmm: 'TMM ထိုင်းစကားပြောသီးသန့် | THAISAR',
      tls: 'TLS 4 Skills သင်တန်း | THAISAR',
      books: 'ထိုင်းစာဖတ်စာအုပ်များ | THAISAR',
      bookDetail: 'စာအုပ်အသေးစိတ် | THAISAR',
      free: 'အခမဲ့ လေ့လာရန် | THAISAR',
      account: 'ကျွန်ုပ်၏ အကောင့် | THAISAR',
      orders: 'အော်ဒါမှတ်တမ်းများ | THAISAR',
      documents: 'စာရွက်စာတမ်းများ | THAISAR',
    };
    document.title = titles[page] || 'THAISAR — Thai Language School';
  }, [page]);

  // Initial load: Fetch from Supabase tables (orders, documents, profiles) if configured
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const clientId = getOrCreateClientId();

    const client = supabase;
    if (!client) return;

    const fetchSupabaseData = async () => {
      try {
        // 1. Fetch user profile for this clientId
        const { data: profileRow, error: profileErr } = await client
          .from('profiles')
          .select('*')
          .eq('client_id', clientId)
          .maybeSingle();

        if (!profileErr && profileRow) {
          setPersist((prev) => ({
            ...prev,
            displayName: profileRow.display_name || profileRow.displayName || prev.displayName,
            profile: {
              phone: profileRow.phone ?? prev.profile.phone,
              viberPhone: profileRow.viber_phone ?? profileRow.viberPhone ?? prev.profile.viberPhone,
              telegramPhone:
                profileRow.telegram_phone ?? profileRow.telegramPhone ?? prev.profile.telegramPhone,
              gmail: profileRow.gmail ?? prev.profile.gmail,
              address: profileRow.address ?? prev.profile.address,
            },
          }));
        }

        // 2. Fetch orders for this client
        const { data: ordersRows, error: ordersErr } = await client
          .from('orders')
          .select('*')
          .or(`client_id.eq.${clientId},client_id.is.null`)
          .order('created_at', { ascending: false });

        if (!ordersErr && Array.isArray(ordersRows) && ordersRows.length > 0) {
          const fetchedOrders: Order[] = ordersRows.map((row: any) => ({
            id: row.id,
            kind: row.kind || 'course',
            itemId: row.item_id || row.itemId || '',
            label: row.label || '',
            status: row.status || 'pending',
            currency: row.currency || 'MMK',
            total: Number(row.total) || 0,
            bookIncluded: Boolean(row.book_included ?? row.bookIncluded),
            bookPrice: Number(row.book_price ?? row.bookPrice) || 0,
            delivery: row.delivery || null,
            payment: row.payment || 'KBZPay',
            studentName: row.student_name ?? row.studentName ?? null,
            telegramUsername: row.telegram_username ?? row.telegramUsername ?? null,
            customerPhone: row.customer_phone ?? row.customerPhone ?? '',
            createdAt: row.created_at
              ? new Date(row.created_at).toLocaleDateString('en-GB')
              : row.createdAt || '',
            receiptFileName: row.receipt_file_name ?? row.receiptFileName ?? '',
            driveFileUrl: row.drive_file_url ?? row.driveFileUrl ?? undefined,
            driveFileId: row.drive_file_id ?? row.driveFileId ?? undefined,
            documentId: row.document_id ?? row.documentId ?? undefined,
          }));

          setPersist((prev) => {
            const fetchedIds = new Set(fetchedOrders.map((o) => o.id));
            const retainedLocal = prev.orders.filter((o) => !fetchedIds.has(o.id));
            return {
              ...prev,
              orders: [...fetchedOrders, ...retainedLocal],
            };
          });
        }

        // 3. Fetch documents (and seed initialDocuments if empty)
        const { data: docsRows, error: docsErr } = await client
          .from('documents')
          .select('*')
          .order('updated_at', { ascending: false });

        if (!docsErr) {
          if (Array.isArray(docsRows) && docsRows.length > 0) {
            const fetchedDocs: AppDocument[] = docsRows.map((d: any) => ({
              id: d.id,
              title: d.title,
              englishTitle: d.english_title || d.englishTitle || d.title,
              category: d.category || 'course_materials',
              fileType: d.file_type || d.fileType || 'PDF',
              fileSize: d.file_size || d.fileSize || '1 MB',
              updatedAt: d.updated_at
                ? typeof d.updated_at === 'string' && d.updated_at.includes('T')
                  ? d.updated_at.split('T')[0]
                  : d.updated_at
                : new Date().toISOString().split('T')[0],
              courseId: d.course_id || d.courseId || undefined,
              orderId: d.order_id || d.orderId || undefined,
              driveFileUrl: d.drive_file_url || d.driveFileUrl || undefined,
              description: d.description || '',
              downloadCount: Number(d.download_count ?? d.downloadCount) || 0,
              isSystemDoc: Boolean(d.is_system_doc ?? d.isSystemDoc),
              pagesCount: Number(d.pages_count ?? d.pagesCount) || 1,
              contentPreview: Array.isArray(d.content_preview)
                ? d.content_preview
                : Array.isArray(d.contentPreview)
                ? d.contentPreview
                : undefined,
            }));

            setPersist((prev) => ({
              ...prev,
              documents: fetchedDocs,
            }));
          } else if (Array.isArray(docsRows) && docsRows.length === 0) {
            // Seed initialDocuments into Supabase documents table
            const seedPayload = initialDocuments.map((doc) => ({
              id: doc.id,
              title: doc.title,
              english_title: doc.englishTitle,
              category: doc.category,
              file_type: doc.fileType,
              file_size: doc.fileSize,
              updated_at: doc.updatedAt,
              course_id: doc.courseId || null,
              description: doc.description,
              download_count: doc.downloadCount,
              is_system_doc: doc.isSystemDoc ?? true,
              pages_count: doc.pagesCount ?? 1,
              content_preview: doc.contentPreview || [],
            }));
            await client.from('documents').insert(seedPayload);
          }
        }
      } catch (err) {
        console.warn('Supabase initial fetch warning:', err);
      }
    };

    fetchSupabaseData();
  }, []);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const notify = (msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3400);
  };

  // Modals & Bottom Sheets
  const [activeSheet, setActiveSheet] = useState<
    | 'none'
    | 'enroll'
    | 'bookBuy'
    | 'profile'
    | 'portal'
    | 'memberRules'
    | 'reset'
    | 'docPreview'
    | 'docUpload'
    | 'orderSuccess'
    | 'driveConfig'
  >('none');

  // Accessibility: Close any open bottom sheet modal on Escape key press
  useEffect(() => {
    if (activeSheet === 'none') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveSheet('none');
        setPreviewDoc(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSheet]);

  // Checkout State
  const [checkoutKind, setCheckoutKind] = useState<'course' | 'book'>('course');
  const [checkoutCourseId, setCheckoutCourseId] = useState<'speaking' | 'skills'>('speaking');
  const [checkoutStyle, setCheckoutStyle] = useState<ClassStyle>('zoom');
  const [checkoutLevel, setCheckoutLevel] = useState<string>('Level 1 + 2');
  const [enrollName, setEnrollName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [phoneSaved, setPhoneSaved] = useState(false);
  const [telegramUsername, setTelegramUsername] = useState('');
  const [addBook, setAddBook] = useState(false);
  const [delivery, setDelivery] = useState<'Myanmar' | 'Thailand'>('Myanmar');
  const [payment, setPayment] = useState<PaymentMethod>('KBZPay');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptName, setReceiptName] = useState('');
  const [receiptBase64, setReceiptBase64] = useState<string>('');
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadStatusText, setUploadStatusText] = useState<string>('');
  const [lastSubmittedOrder, setLastSubmittedOrder] = useState<{
    order: Order;
    driveFileUrl?: string;
    docId?: string;
  } | null>(null);

  // Google Drive configuration modal state
  const [driveSettingUrl, setDriveSettingUrl] = useState('');
  const [driveSettingFolder, setDriveSettingFolder] = useState('');

  // Handle receipt selection and base64 conversion
  const handleReceiptFileChange = (file: File | undefined) => {
    if (!file) {
      setReceiptFile(null);
      setReceiptName('');
      setReceiptBase64('');
      setReceiptPreviewUrl('');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      notify('Screenshot ဖိုင်အရွယ်အစား 8 MB အောက်သာ ရွေးချယ်ပေးပါ။');
      return;
    }
    setReceiptFile(file);
    setReceiptName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setReceiptBase64(result);
      setReceiptPreviewUrl(result);
    };
    reader.onerror = () => {
      notify('ဖိုင်ဖတ်ရာတွင် အမှားဖြစ်ပေါ်ပါသည်။ ပြန်လည်ရွေးချယ်ပါ။');
    };
    reader.readAsDataURL(file);
  };

  // Profile Editor state
  const [tempProfileName, setTempProfileName] = useState('');
  const [tempProfilePhone, setTempProfilePhone] = useState('');
  const [tempProfileViber, setTempProfileViber] = useState('');
  const [tempProfileTelegram, setTempProfileTelegram] = useState('');
  const [tempProfileGmail, setTempProfileGmail] = useState('');
  const [tempProfileAddress, setTempProfileAddress] = useState('');

  // Membership Tier calculation
  const approvedCount = useMemo(() => {
    return persist.orders.filter((o) => o.status === 'approved').length;
  }, [persist.orders]);

  const userRank = useMemo(() => {
    if (approvedCount >= 5) return 3;
    if (approvedCount >= 3) return 2;
    if (approvedCount >= 1) return 1;
    return 0;
  }, [approvedCount]);

  const currentTier = tiers[userRank];

  const currIndex = currency === 'MMK' ? 0 : 1;
  const money = (n: number) => `${Number(n).toLocaleString('en-US')} ${currency}`;
  const mmk = (n: number) => `${Number(n).toLocaleString('en-US')} ကျပ်`;

  const selectedCourse = courses.find((c) => c.id === checkoutCourseId) || courses[0];
  const selectedBook = books.find((b) => b.id === selectedBookId) || books[0];

  // Helper checks
  const isCash = payment === 'Cash on Delivery';
  const isWallet = payment === 'KBZPay' || payment === 'WavePay';

  const validCustomerPhone = useMemo(() => {
    const raw = customerPhone.trim();
    const digits = raw.replace(/\D/g, '');
    return /^\+?[0-9() .-]+$/.test(raw) && digits.length >= 8 && digits.length <= 15;
  }, [customerPhone]);

  const validEnrollName = checkoutKind !== 'course' || enrollName.trim().length >= 2;

  const canSubmitOrder =
    validEnrollName && phoneSaved && validCustomerPhone && (isCash || !!receiptFile || !!receiptBase64);

  // Price calculations
  const calculateCoursePrice = (c: Course, sty: ClassStyle) => {
    return c.promo[sty] ?? c.prices[sty][0];
  };

  const calculateTotals = () => {
    if (checkoutKind === 'course') {
      const price = calculateCoursePrice(selectedCourse, checkoutStyle);
      const bookAddPrice = addBook ? books[0].promo[0] ?? books[0].price[0] : 0;
      const discount = selectedCourse.eligible ? Math.round((price * currentTier.rate) / 100) : 0;
      const total = price + bookAddPrice - discount;
      return { price, bookAddPrice, discount, total };
    } else {
      const price = selectedBook.promo[currIndex] ?? selectedBook.price[currIndex] ?? 0;
      const discount = selectedBook.eligible ? Math.round((price * currentTier.rate) / 100) : 0;
      const total = price - discount;
      return { price, bookAddPrice: 0, discount, total };
    }
  };

  // Open Checkout for TMM
  const handleOpenTmmCheckout = (style: ClassStyle) => {
    setCheckoutKind('course');
    setCheckoutCourseId('speaking');
    setCheckoutStyle(style);
    setCheckoutLevel('Level 1 + 2');
    setEnrollName('');
    setCustomerPhone(persist.profile.phone || '');
    setPhoneSaved(!!persist.profile.phone);
    setTelegramUsername(persist.profile.telegramPhone ? `@${persist.profile.telegramPhone}` : '');
    setAddBook(false);
    setPayment('KBZPay');
    setReceiptFile(null);
    setReceiptName('');
    setReceiptBase64('');
    setReceiptPreviewUrl('');
    setActiveSheet('enroll');
  };

  // Open Checkout for TLS
  const handleOpenTlsCheckout = (style: ClassStyle) => {
    setCheckoutKind('course');
    setCheckoutCourseId('skills');
    setCheckoutStyle(style);
    setCheckoutLevel(style === 'video' ? 'Level 1' : 'Level 1 + 2');
    setEnrollName('');
    setCustomerPhone(persist.profile.phone || '');
    setPhoneSaved(!!persist.profile.phone);
    setTelegramUsername(persist.profile.telegramPhone ? `@${persist.profile.telegramPhone}` : '');
    setAddBook(false);
    setPayment('KBZPay');
    setReceiptFile(null);
    setReceiptName('');
    setReceiptBase64('');
    setReceiptPreviewUrl('');
    setActiveSheet('enroll');
  };

  // Navigate to course with auto-scroll to enrollment box
  const navigateToCourse = (courseId: 'speaking' | 'skills') => {
    setPage(courseId === 'speaking' ? 'tmm' : 'tls');
    setTimeout(() => {
      const el = document.getElementById('enrollment-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 60);
  };

  // Open Checkout for Book
  const handleOpenBookCheckout = (bookId: string) => {
    setSelectedBookId(bookId);
    setCheckoutKind('book');
    setDelivery('Myanmar');
    setCustomerPhone(persist.profile.phone || '');
    setPhoneSaved(!!persist.profile.phone);
    setPayment('KBZPay');
    setReceiptFile(null);
    setReceiptName('');
    setReceiptBase64('');
    setReceiptPreviewUrl('');
    setActiveSheet('bookBuy');
  };

  // Submit Order with Google Drive Screenshot Upload
  const handleSubmitOrder = async () => {
    if (!validEnrollName) {
      notify('ကျောင်းသား/သူ အမည်အပြည့်အစုံ ထည့်ပေးပါ။');
      return;
    }
    if (!validCustomerPhone || !phoneSaved) {
      notify('Customer ဖုန်းနံပါတ် မှန်ကန်စွာထည့်ပြီး အတည်ပြုပါ။');
      return;
    }
    if (!isCash && !receiptFile && !receiptBase64) {
      notify('Payment Screenshot (ငွေလွှဲစလစ်ပုံ) ထည့်ပေးပါ။');
      return;
    }

    const { total, bookAddPrice } = calculateTotals();
    const orderId = `THS-${Date.now().toString(36).toUpperCase()}`;

    let label = '';
    if (checkoutKind === 'course') {
      label = `${selectedCourse.name} · ${checkoutLevel} · ${styleNames[checkoutStyle]} · Promotion${
        addBook ? ' · စာအုပ်ပါ' : ''
      }`;
    } else {
      label = selectedBook.name;
    }

    let uploadedDriveUrl = '';
    let uploadedDriveId = '';

    const effectiveUploadUrl = (persist.driveUploadUrl || ENV_DRIVE_UPLOAD_URL).trim();
    const effectiveFolderId = (persist.driveFolderId || ENV_DRIVE_FOLDER_ID).trim();

    let supabaseSlipUrl = '';

    if (!isCash) {
      setIsUploading(true);

      // 1. Upload receipt to Supabase Storage bucket 'thaisar-uploads'
      if (isSupabaseConfigured && supabase && receiptFile) {
        try {
          setUploadStatusText('စလစ်ပုံ Supabase Cloud သို့ သိမ်းဆည်းနေပါသည်... / Uploading to Supabase Storage...');
          const cleanName = receiptFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const storagePath = `slips/${orderId}-${cleanName}`;
          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from(SUPABASE_STORAGE_BUCKET)
            .upload(storagePath, receiptFile, {
              cacheControl: '3600',
              upsert: true,
            });

          if (!uploadErr && uploadData) {
            const { data: publicUrlData } = supabase.storage
              .from(SUPABASE_STORAGE_BUCKET)
              .getPublicUrl(storagePath);
            supabaseSlipUrl = publicUrlData?.publicUrl || '';
          } else if (uploadErr) {
            console.warn('Supabase Storage notice:', uploadErr.message);
          }
        } catch (storageErr) {
          console.warn('Supabase storage exception:', storageErr);
        }
      }

      // Ensure base64 representation is ready for Google Drive / Google Apps Script
      let base64Data = receiptBase64;
      if (!base64Data && receiptFile) {
        try {
          base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(receiptFile);
          });
          setReceiptBase64(base64Data);
        } catch {
          notify('Screenshot ဖိုင်ဖတ်မရပါ။ ပြန်လည်ရွေးချယ်ပေးပါ။');
          setIsUploading(false);
          return;
        }
      }

      if (!base64Data && !supabaseSlipUrl) {
        notify('Payment Screenshot (ငွေလွှဲစလစ်ပုံ) ရွေးချယ်ပေးပါ။');
        setIsUploading(false);
        return;
      }

      setUploadStatusText('အော်ဒါနှင့် ငွေလွှဲစလစ် ပေးပို့နေပါသည်... / Submitting order & slip...');

      // 2. Google Apps Script / Drive upload (optional secondary backup or main storage)
      if (effectiveUploadUrl && base64Data) {
        try {
          const payload = {
            timestamp: new Date().toISOString(),
            customerName: checkoutKind === 'course' ? enrollName.trim() : persist.displayName,
            phone: customerPhone.trim(),
            courseOrProduct: label,
            paymentMethod: payment,
            amount: `${total.toLocaleString('en-US')} ကျပ်`,
            fileName: receiptName || `slip-${orderId}.jpg`,
            fileMimeType: receiptFile?.type || 'image/jpeg',
            fileBase64: base64Data,
            orderId: orderId,
            base64: base64Data,
            mimeType: receiptFile?.type || 'image/jpeg',
            customerPhone: customerPhone.trim(),
            folderId: effectiveFolderId || undefined,
            supabaseSlipUrl: supabaseSlipUrl || undefined,
          };

          const response = await fetch(effectiveUploadUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            throw new Error(`Google Apps Script HTTP Error: ${response.status}`);
          }

          const resData = await response.json();
          if (resData.status === 'error') {
            throw new Error(resData.message || 'Google Apps Script error');
          }

          uploadedDriveUrl = resData.fileUrl || resData.downloadUrl || '';
          uploadedDriveId = resData.fileId || '';
        } catch (uploadErr: any) {
          if (!supabaseSlipUrl) {
            setIsUploading(false);
            const errDetail = uploadErr?.message || 'Network / Apps Script Error';
            notify(`အော်ဒါနှင့် စလစ်ပုံ ပေးပို့၍ မရပါ (${errDetail})။ ကျေးဇူးပြု၍ ပြန်လည်စမ်းသပ်ပါ။`);
            return;
          }
        }
      }

      if (!uploadedDriveUrl) {
        if (supabaseSlipUrl) {
          uploadedDriveUrl = supabaseSlipUrl;
          uploadedDriveId = `supa-${orderId}`;
        } else {
          // Fallback demo link when neither external upload endpoint is connected
          await new Promise((resolve) => setTimeout(resolve, 800));
          uploadedDriveUrl = `https://drive.google.com/file/d/demo-slip-${orderId}/view?usp=sharing`;
          uploadedDriveId = `demo-slip-${orderId}`;
        }
      }
      setIsUploading(false);
    }

    // Automatically create a linked document for this order
    const newDocId = `DOC-ORD-${Date.now().toString(36).toUpperCase()}`;
    const generatedDoc: AppDocument = {
      id: newDocId,
      title: `${label} ငွေလွှဲပြေစာနှင့် မှတ်ပုံတင်မှတ်တမ်း`,
      englishTitle: `Payment Voucher & Registration Receipt (${orderId})`,
      category: 'receipts',
      fileType: 'PDF',
      fileSize: '380 KB',
      updatedAt: new Date().toISOString().split('T')[0],
      courseId: checkoutKind === 'course' ? checkoutCourseId : 'book',
      orderId: orderId,
      driveFileUrl: uploadedDriveUrl || supabaseSlipUrl || undefined,
      description: `Order ${orderId} အတွက် THAISAR တရားဝင် ငွေလွှဲပြေစာနှင့် သင်တန်းအပ်နှံမှု အတည်ပြုလွှာ။`,
      downloadCount: 1,
      isSystemDoc: false,
      pagesCount: 1,
      contentPreview: [
        `ကျောင်းသားအမည်: ${enrollName || persist.displayName}`,
        `အော်ဒါအမှတ်: ${orderId}`,
        `သင်တန်း/စာအုပ်: ${label}`,
        `ပေးချေမှုပုံစံ: ${payment} (${isCash ? 'Admin ဆက်သွယ်မည်' : 'ငွေလွှဲပြီး'})`,
        `စုစုပေါင်း ကျသင့်ငွေ: ${total.toLocaleString('en-US')} MMK`,
        `ဆက်သွယ်ရန်ဖုန်း: ${customerPhone}`,
        uploadedDriveUrl ? `ငွေလွှဲစလစ်လင့်ခ်: ${uploadedDriveUrl}` : '',
        `မှတ်ချက်: Admin စစ်ဆေးအတည်ပြုပြီးပါက တရားဝင် ပြေစာအဖြစ် အကျုံးဝင်ပါသည်။`,
      ].filter(Boolean),
    };

    const newOrder: Order = {
      id: orderId,
      kind: checkoutKind,
      itemId: checkoutKind === 'course' ? selectedCourse.id : selectedBook.id,
      label,
      status: 'pending',
      currency: 'MMK',
      total,
      bookIncluded: checkoutKind === 'course' && addBook,
      bookPrice: bookAddPrice,
      delivery: checkoutKind === 'book' || addBook ? delivery : null,
      payment,
      studentName: checkoutKind === 'course' ? enrollName.trim() : null,
      telegramUsername: checkoutKind === 'course' ? telegramUsername.trim() : null,
      customerPhone: customerPhone.trim(),
      createdAt: new Date().toLocaleDateString('en-GB'),
      receiptFileName: isCash ? '' : (receiptName || (receiptFile ? receiptFile.name : '')),
      driveFileUrl: uploadedDriveUrl || supabaseSlipUrl || undefined,
      driveFileId: uploadedDriveId || undefined,
      documentId: newDocId,
    };

    // Sync to Supabase tables if configured
    if (isSupabaseConfigured && supabase) {
      try {
        const clientId = getOrCreateClientId();

        // b) Insert new order into public.orders
        await supabase.from('orders').insert({
          id: orderId,
          client_id: clientId,
          kind: checkoutKind,
          item_id: checkoutKind === 'course' ? selectedCourse.id : selectedBook.id,
          label,
          status: 'pending',
          currency: 'MMK',
          total,
          book_included: checkoutKind === 'course' && addBook,
          book_price: bookAddPrice,
          delivery: checkoutKind === 'book' || addBook ? delivery : null,
          payment,
          student_name: checkoutKind === 'course' ? enrollName.trim() : null,
          telegram_username: checkoutKind === 'course' ? telegramUsername.trim() : null,
          customer_phone: customerPhone.trim(),
          created_at: new Date().toISOString(),
          receipt_file_name: isCash ? '' : (receiptName || (receiptFile ? receiptFile.name : '')),
          drive_file_url: uploadedDriveUrl || supabaseSlipUrl || null,
          drive_file_id: uploadedDriveId || null,
          document_id: newDocId,
          slip_url: supabaseSlipUrl || null,
        });

        // Insert generated receipt voucher into public.documents
        await supabase.from('documents').insert({
          id: newDocId,
          client_id: clientId,
          title: generatedDoc.title,
          english_title: generatedDoc.englishTitle,
          category: generatedDoc.category,
          file_type: generatedDoc.fileType,
          file_size: generatedDoc.fileSize,
          updated_at: generatedDoc.updatedAt,
          course_id: generatedDoc.courseId || null,
          order_id: generatedDoc.orderId || null,
          drive_file_url: generatedDoc.driveFileUrl || supabaseSlipUrl || null,
          description: generatedDoc.description,
          download_count: 1,
          is_system_doc: false,
          pages_count: 1,
          content_preview: generatedDoc.contentPreview || [],
        });
      } catch (dbInsertErr) {
        console.warn('Supabase insert notice:', dbInsertErr);
      }
    }

    setPersist((prev) => ({
      ...prev,
      orders: [...prev.orders, newOrder],
      documents: [generatedDoc, ...prev.documents],
    }));

    setLastSubmittedOrder({
      order: newOrder,
      driveFileUrl: uploadedDriveUrl || supabaseSlipUrl || undefined,
      docId: newDocId,
    });

    // Reset receipt file inputs
    setReceiptFile(null);
    setReceiptName('');
    setReceiptBase64('');
    setReceiptPreviewUrl('');

    // Open confirmation modal
    setActiveSheet('orderSuccess');

    notify(
      isCash
        ? 'Admin ဆက်သွယ်ရန် Order တင်ပြီးပါပြီ။'
        : isSupabaseConfigured
        ? 'အော်ဒါတင်ခြင်း အောင်မြင်ပါသည်! Supabase Cloud သို့ သိမ်းဆည်းပြီးပါပြီ။'
        : 'အော်ဒါတင်ခြင်း အောင်မြင်ပါသည်! Google Sheet နှင့် Google Drive သို့ မှတ်တမ်းတင်ပြီးပါပြီ။'
    );
  };

  // Simulate Admin Approval
  const handleApproveOrder = (orderId: string) => {
    setPersist((prev) => {
      const updated = prev.orders.map((o) => {
        if (o.id === orderId) {
          return { ...o, status: 'approved' as const };
        }
        return o;
      });
      return { ...prev, orders: updated };
    });
    notify(`Demo: Order approved! Membership status updated.`);
  };

  // Handle Edit Profile
  const handleOpenProfile = () => {
    setTempProfileName(persist.displayName === 'THAISAR Member' ? '' : persist.displayName);
    setTempProfilePhone(persist.profile.phone || '');
    setTempProfileViber(persist.profile.viberPhone || '');
    setTempProfileTelegram(persist.profile.telegramPhone || '');
    setTempProfileGmail(persist.profile.gmail || '');
    setTempProfileAddress(persist.profile.address || '');
    setActiveSheet('profile');
  };

  const handleSaveProfile = () => {
    if (tempProfileGmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(tempProfileGmail.trim())) {
        notify('Gmail လိပ်စာကို မှန်ကန်သော Email ပုံစံဖြင့် ဖြည့်ပေးပါ။');
        return;
      }
    }
    const newDisplayName = tempProfileName.trim() || 'THAISAR Member';
    const newProfile: UserProfile = {
      phone: tempProfilePhone.trim(),
      viberPhone: tempProfileViber.trim(),
      telegramPhone: tempProfileTelegram.trim(),
      gmail: tempProfileGmail.trim(),
      address: tempProfileAddress.trim(),
    };

    setPersist((prev) => ({
      ...prev,
      displayName: newDisplayName,
      profile: newProfile,
    }));

    if (isSupabaseConfigured && supabase) {
      const clientId = getOrCreateClientId();
      supabase
        .from('profiles')
        .upsert(
          {
            client_id: clientId,
            display_name: newDisplayName,
            phone: newProfile.phone,
            viber_phone: newProfile.viberPhone,
            telegram_phone: newProfile.telegramPhone,
            gmail: newProfile.gmail,
            address: newProfile.address,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'client_id' }
        )
        .then(({ error }) => {
          if (error) console.warn('Supabase profile sync warning:', error.message);
        });
    }

    setActiveSheet('none');
    notify(
      isSupabaseConfigured
        ? 'ကိုယ်ရေးအချက်အလက် Supabase Cloud တွင် သိမ်းဆည်းပြီးပါပြီ။'
        : 'ကိုယ်ရေးအချက်အလက် သိမ်းဆည်းပြီးပါပြီ (Demo)။'
    );
  };

  // Handle Reset Demo
  const handleResetData = () => {
    setPersist({
      orders: [],
      displayName: 'THAISAR Member',
      profile: {
        phone: '',
        viberPhone: '',
        telegramPhone: '',
        gmail: '',
        address: '',
      },
      documents: initialDocuments,
    });
    setActiveSheet('none');
    setPage('home');
    notify('Demo Data ပြန်စပြီးပါပြီ။');
  };

  // Handle Document Download
  const handleDownloadDoc = (doc: AppDocument) => {
    const nextDownloadCount = (doc.downloadCount || 0) + 1;
    setPersist((prev) => ({
      ...prev,
      documents: prev.documents.map((d) =>
        d.id === doc.id ? { ...d, downloadCount: nextDownloadCount } : d
      ),
    }));

    if (isSupabaseConfigured && supabase) {
      supabase
        .from('documents')
        .update({ download_count: nextDownloadCount })
        .eq('id', doc.id)
        .then(({ error }) => {
          if (error) console.warn('Supabase download count warning:', error.message);
        });
    }

    // Generate real downloadable text/PDF file simulation
    const content = `THAISAR THAI LANGUAGE SCHOOL\nOfficial Document: ${doc.title} (${doc.englishTitle})\nCategory: ${doc.category}\nUpdated: ${doc.updatedAt}\nFile Type: ${doc.fileType}\n\nOVERVIEW & CONTENT:\n${(doc.contentPreview || []).join('\n')}\n\nDescription:\n${doc.description}\n\nOfficial Verification: THAISAR Educational Management System (Demo)`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${doc.id}-${doc.englishTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    notify(`"${doc.title}" ကို ဒေါင်းလုဒ် ပြုလုပ်ပြီးပါပြီ။`);
  };

  // Handle Document Delete
  const handleDeleteDoc = (docId: string) => {
    setPersist((prev) => ({
      ...prev,
      documents: prev.documents.filter((d) => d.id !== docId),
    }));
    if (previewDoc?.id === docId) {
      setPreviewDoc(null);
      setActiveSheet('none');
    }

    if (isSupabaseConfigured && supabase) {
      supabase
        .from('documents')
        .delete()
        .eq('id', docId)
        .then(({ error }) => {
          if (error) console.warn('Supabase delete document warning:', error.message);
        });
    }

    notify('စာရွက်စာတမ်း ဖျက်သိမ်းပြီးပါပြီ။');
  };

  // Handle Document Upload Submit
  const handleUploadNewDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim()) {
      notify('စာရွက်စာတမ်း အမည် ထည့်ပေးပါ။');
      return;
    }

    const docId = `DOC-UPL-${Date.now().toString(36).toUpperCase()}`;
    const newDoc: AppDocument = {
      id: docId,
      title: newDocTitle.trim(),
      englishTitle: newDocEnTitle.trim() || newDocTitle.trim(),
      category: newDocCategory,
      fileType: 'PDF',
      fileSize: '1.5 MB',
      updatedAt: new Date().toISOString().split('T')[0],
      courseId: newDocCourse,
      description: newDocDesc.trim() || 'အသုံးပြုသူမှ ကိုယ်တိုင်ထည့်သွင်းထားသော စာရွက်စာတမ်းဖိုင်။',
      downloadCount: 0,
      isSystemDoc: false,
      pagesCount: 5,
      contentPreview: [
        `ခေါင်းစဉ်: ${newDocTitle.trim()}`,
        `အမျိုးအစား: ${newDocCategory}`,
        `ဆက်စပ်သင်တန်း: ${newDocCourse === 'speaking' ? 'TMM' : newDocCourse === 'skills' ? 'TLS' : 'General'}`,
        `တင်သွင်းသူ: ${persist.displayName}`,
        `ဖိုင်မှတ်တမ်း: ${newDocFileName || 'Document-File.pdf'}`,
      ],
    };

    setPersist((prev) => ({
      ...prev,
      documents: [newDoc, ...prev.documents],
    }));

    if (isSupabaseConfigured && supabase) {
      const clientId = getOrCreateClientId();
      supabase
        .from('documents')
        .insert({
          id: docId,
          client_id: clientId,
          title: newDoc.title,
          english_title: newDoc.englishTitle,
          category: newDoc.category,
          file_type: newDoc.fileType,
          file_size: newDoc.fileSize,
          updated_at: newDoc.updatedAt,
          course_id: newDoc.courseId || null,
          description: newDoc.description,
          download_count: 0,
          is_system_doc: false,
          pages_count: 5,
          content_preview: newDoc.contentPreview || [],
        })
        .then(({ error }) => {
          if (error) console.warn('Supabase document insert warning:', error.message);
        });
    }

    setNewDocTitle('');
    setNewDocEnTitle('');
    setNewDocDesc('');
    setNewDocFileName('');
    setActiveSheet('none');
    notify('စာရွက်စာတမ်း အသစ် တင်သွင်းပြီးပါပြီ။');
  };

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    const q = docSearch.toLowerCase().trim();
    return persist.documents.filter((doc) => {
      const matchCat = docCategory === 'all' || doc.category === docCategory;
      const matchSearch =
        !q ||
        doc.title.toLowerCase().includes(q) ||
        doc.englishTitle.toLowerCase().includes(q) ||
        doc.description.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [persist.documents, docCategory, docSearch]);

  // Document category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: persist.documents.length };
    persist.documents.forEach((d) => {
      counts[d.category] = (counts[d.category] || 0) + 1;
    });
    return counts;
  }, [persist.documents]);

  return (
    <div className="shell">
      {/* HEADER */}
      <header className="header">
        <button
          className="brand"
          type="button"
          onClick={() => {
            setPage('home');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          aria-label="THAISAR Home"
        >
          <span className="brand-icon" style={{ overflow: 'hidden', padding: 0 }}>
            <img
              src="https://lh3.googleusercontent.com/pw/AP1GczMFMASbiKtCOQX2oLMQ0r80AUQBTISjeYJp1r6goIb7YGa7a0p6MiZ2inIVYpUd5QNkDEDtT-zq5sikNOeXaZ9lR-XooKbjkKHQTXARimeevLOitPs=w128-h128-c"
              alt="THAISAR Logo"
              width="39"
              height="39"
              fetchPriority="high"
              decoding="async"
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '13px' }}
            />
          </span>
          <span className="brand-text">
            <strong>THAISAR</strong>
            <small>THAI LANGUAGE SCHOOL</small>
          </span>
        </button>

        <div className="right-head">
          <div className="currency" aria-label="Currency Switcher">
            <button
              type="button"
              className={currency === 'MMK' ? 'active' : ''}
              onClick={() => setCurrency('MMK')}
            >
              MMK
            </button>
            <button
              type="button"
              className={currency === 'THB' ? 'active' : ''}
              onClick={() => {
                notify(
                  'TMM / TLS သင်တန်းနှင့် စာအုပ်အတွက် THB ဈေးနှုန်း မသတ်မှတ်ရသေးပါ။ လက်ရှိ MMK ဈေးနှုန်းသာ ပြသထားပါတယ်။'
                );
              }}
            >
              THB
            </button>
          </div>

          {/* Orders button */}
          <button
            type="button"
            className="round"
            onClick={() => setPage('orders')}
            aria-label="My orders"
            title="အော်ဒါများ"
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="4" y="5" width="16" height="17" rx="2" />
              <path d="M8 3v4m8-4v4M4 11h16" />
            </svg>
            {persist.orders.length > 0 && (
              <span className="round-badge">{persist.orders.length}</span>
            )}
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="content" aria-live="polite">
        {/* PAGE 1: HOME */}
        {page === 'home' && (
          <div>
            <section className="hero">
              <span className="smalltag">✨ Learn Thai, Grow Together</span>
              <h1>ထိုင်းစကားကို လက်တွေ့ပြောတတ်ဖို့ TMM သင်တန်း</h1>
              <p>Beginner စကားပြောသီးသန့် · မြန်မာအသံထွက်အကူအညီ · Zoom / ရန်ကုန် / မန္တလေး / Video</p>
              <button
                className="hero-btn"
                type="button"
                onClick={() => navigateToCourse('speaking')}
              >
                TMM သင်တန်းကြည့်ရန် ↗
              </button>
              <div className="hero-graphic">
                <span>TMM</span>
                <b>SPEAK THAI</b>
                <small>BEGINNER · LEVEL 1 + 2</small>
              </div>
            </section>

            {/* Quick action grid */}
            <div className="quick">
              <button type="button" onClick={() => setPage('courses')}>
                <span className="quick-icon p">🎓</span>
                <span>သင်တန်းများ</span>
              </button>
              <button type="button" onClick={() => setPage('books')}>
                <span className="quick-icon o">📚</span>
                <span>စာအုပ်</span>
              </button>
              <button type="button" onClick={() => setPage('documents')}>
                <span className="quick-icon m">📁</span>
                <span>စာရွက်စာတမ်း</span>
              </button>
              <button type="button" onClick={() => setPage('free')}>
                <span className="quick-icon b">▶️</span>
                <span>အခမဲ့လေ့လာရန်</span>
              </button>
              <button type="button" onClick={() => setPage('account')}>
                <span className="quick-icon g">💎</span>
                <span>Member</span>
              </button>
            </div>

            {/* Popular Courses */}
            <div className="section">
              <h2>✨ Popular Courses</h2>
              <button className="see" type="button" onClick={() => setPage('courses')}>
                See All →
              </button>
            </div>

            <div className="hscroll">
              {courses.map((c) => (
                <article key={c.id} className="course-mini">
                  <div className={`cover ${c.cover}`}>
                    <div className="ring" />
                    <span className="thai" style={{ fontFamily: 'system-ui, sans-serif' }}>
                      {c.id === 'speaking' ? 'TMM' : 'TLS'}
                    </span>
                    <small>{c.id === 'speaking' ? 'TMM · SPEAKING' : 'TLS · 4 SKILLS'}</small>
                  </div>
                  <div className="item-body">
                    <strong>{c.name}</strong>
                    <div className="meta">{c.english}</div>
                    <div className="item-row">
                      <div>
                        <div className="price">
                          <span>{mmk(Math.min(...Object.values(c.promo)))}</span>
                        </div>
                        <div className="price-muted">Promotion Price မှ စတင်</div>
                      </div>
                      <button
                        type="button"
                        className="buy-sm"
                        onClick={() => navigateToCourse(c.id)}
                      >
                        အသေးစိတ် →
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>





            <div className="book-list">
              {books.map((b) => (
                <article key={b.id} className="book-card featured">
                  <div className="book-pic">
                    <div className="book-art no-photo">
                      <div className="book-photo-hint">
                        <span>📚</span>
                        <strong>စာအုပ်မျက်နှာဖုံးပုံ ထည့်ရန်</strong>
                        <small>practical-thai-book.webp</small>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3>{b.name}</h3>
                    <div className="subtitle">{b.shortDescription}</div>
                    <div className="book-price-bar">
                      <span className="strike">{mmk(b.price[0])}</span>
                      <strong className="price">{mmk(b.promo[0]!)}</strong>
                      <span className="pill orange">အထူး Promotion</span>
                    </div>
                    <div className="book-card-actions">
                      <button
                        type="button"
                        className="main-btn"
                        onClick={() => handleOpenBookCheckout(b.id)}
                      >
                        ဝယ်ယူမည်
                      </button>
                      <button
                        type="button"
                        className="outline-btn"
                        onClick={() => {
                          setSelectedBookId(b.id);
                          setPage('bookDetail');
                        }}
                      >
                        စာအုပ်အကြောင်း
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <p className="smallprint">
              TMM နှင့် TLS သင်တန်းသင်ရိုး၊ MMK ဈေးနှုန်းတွေကို ကျောင်းမှပေးထားတဲ့အချက်အလက်အတိုင်း
              ဖော်ပြထားပါတယ်။ Promotion သက်တမ်း၊ THB ဈေးနှုန်း၊ အာမခံချက်အသေးစိတ်၊ စာအုပ် Promotion
              သက်တမ်းကို Live မတင်ခင် အတည်ပြုရန် လိုအပ်ပါတယ်။
            </p>
          </div>
        )}

        {/* PAGE 2: COURSES LIST */}
        {page === 'courses' && (
          <div>
            <div className="page-heading">
              <div className="eyebrow">EXPLORE OUR COURSES</div>
              <h1 className="title">ထိုင်းစာသင်တန်းများ</h1>
              <div className="subtitle">သင်ယူချင်တဲ့အတန်းကို ရွေးချယ်ပါ။</div>
            </div>

            <div className="searchbar">
              <svg className="s-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                placeholder="သင်တန်းရှာရန်..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search courses"
              />
            </div>

            <div className="chips">
              <button
                type="button"
                className={courseFilter === 'all' ? 'active' : ''}
                onClick={() => setCourseFilter('all')}
              >
                အားလုံး
              </button>
              <button
                type="button"
                className={courseFilter === 'speaking' ? 'active' : ''}
                onClick={() => setCourseFilter('speaking')}
              >
                စကားပြောသီးသန့်
              </button>
              <button
                type="button"
                className={courseFilter === 'skills' ? 'active' : ''}
                onClick={() => setCourseFilter('skills')}
              >
                အရေး / အဖတ် / အပြော
              </button>
            </div>

            {courses
              .filter(
                (c) =>
                  (courseFilter === 'all' || courseFilter === c.id) &&
                  `${c.name} ${c.english}`.toLowerCase().includes(search.toLowerCase())
              )
              .map((c) => (
                <article key={c.id} className="full-card">
                  <div className={`cover ${c.cover}`}>
                    <div className="ring" />
                    <span className="thai" style={{ fontFamily: 'system-ui, sans-serif' }}>
                      {c.id === 'speaking' ? 'TMM' : 'TLS'}
                    </span>
                    <small>{c.id === 'speaking' ? 'TMM · SPEAKING' : 'TLS · 4 SKILLS'}</small>
                  </div>
                  <div className="item-body">
                    <span className="pill">4 Class Styles</span>
                    <h3 style={{ fontSize: '15px', margin: '9px 0 4px' }}>{c.name}</h3>
                    <p className="subtitle">{c.descr}</p>
                    {c.id === 'speaking' ? (
                      <div className="pill orange">Level 1 + 2 တွဲလျက် · Beginner</div>
                    ) : (
                      <div className="pill orange">Live: Level 1+2 တွဲလျက် · Video: ခွဲထားမယ်</div>
                    )}
                    <div className="tags">
                      <span className="tag">Zoom</span>
                      <span className="tag">Video Class</span>
                      <span className="tag">Yangon</span>
                      <span className="tag">Mandalay</span>
                    </div>
                    <div className="item-row" style={{ marginTop: '13px' }}>
                      <div>
                        <div className="price">
                          <span>{mmk(Math.min(...Object.values(c.promo)))}</span>
                        </div>
                        <div className="price-muted">Promotion Price မှ စတင်</div>
                      </div>
                      <button
                        className="main-btn"
                        type="button"
                        onClick={() => navigateToCourse(c.id)}
                      >
                        သင်တန်းရွေးရန် →
                      </button>
                    </div>
                  </div>
                </article>
              ))}
          </div>
        )}

        {/* PAGE 3: TMM DETAILS */}
        {page === 'tmm' && (
          <div>
            <div className="page-heading">
              <button className="ghost-btn" type="button" onClick={() => setPage('courses')}>
                ← သင်တန်းများ
              </button>
              <div className="eyebrow" style={{ marginTop: '12px' }}>
                TMM · THAI SPEAKING
              </div>
              <h1 className="title">ထိုင်းစကားပြောသီးသန့်</h1>
              <p className="subtitle">Thai Speaking Only · Beginner · Level 1 + 2 တွဲလျက်</p>
            </div>

            {/* ENROLLMENT & REGISTRATION BOX (AT THE VERY TOP) */}
            <div id="enrollment-section" className="enroll-box">
              <div className="section" style={{ marginTop: '8px' }}>
                <h2>📝 သင်တန်းအပ်နှံရန် (Registration)</h2>
                <span className="pill orange">4 Class Styles</span>
              </div>
              <p className="subtitle" style={{ marginBottom: '12px' }}>
                Zoom / ရန်ကုန် / မန္တလေး / Video အတန်းများထဲမှ မိမိတက်ရောက်လိုသောပုံစံကို ရွေးချယ်ပြီး အပ်နှံနိုင်ပါတယ်။ (Level 1 + 2 တွဲလျက်)
              </p>

              <div className="tmm-pricing">
                {(
                  [
                    ['zoom', 'Zoom TMM', '📹', '၂၀ ရက်'],
                    ['yangon', 'ရန်ကုန် TMM', '📍', '၂၀ ရက်'],
                    ['mandalay', 'မန္တလေး TMM', '🏫', '၂၀ ရက်'],
                    ['video', 'Video TMM', '▶', 'ကြာချိန် မသတ်မှတ်ရသေး'],
                  ] as const
                ).map(([sty, title, emoji, duration]) => {
                  const c = courses[0];
                  return (
                    <article key={sty} className="tmm-price-card">
                      <div className="class-photo no-photo" data-style-photo={sty}>
                        <div className="class-photo-placeholder" aria-hidden="true">
                          <span className="placeholder-symbol">{emoji}</span>
                          <strong>{title} ပုံထည့်ရန်</strong>
                          <small>1200 × 675 px</small>
                        </div>
                      </div>
                      <div className="tmm-price-head">
                        <span className="style-emoji">{emoji}</span>
                        <div>
                          <strong>{title}</strong>
                          <small>{duration} · Level 1 + 2 တွဲလျက်</small>
                        </div>
                      </div>
                      <div className="tmm-price-lines">
                        <span className="regular">{mmk(c.prices[sty][0])}</span>
                        <span className="promo">{mmk(c.promo[sty])}</span>
                      </div>
                      <div className="tmm-price-footer">
                        <span className="pill orange">
                          {sty === 'video' ? 'Promotion Price' : 'Early Bird Price'}
                        </span>
                        <button
                          type="button"
                          className="buy-sm"
                          onClick={() => handleOpenTmmCheckout(sty)}
                        >
                          သင်တန်းအပ်နှံရန် →
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="notice" style={{ marginTop: '14px', marginBottom: '18px' }}>
                ✓ TMM ရဲ့ Zoom၊ ရန်ကုန်၊ မန္တလေးနဲ့ Video Class အားလုံးမှာ{' '}
                <strong>Level 1 + Level 2 နှစ်ခုလုံး တွဲလျက် ပါဝင်ပါတယ်။</strong> Promotion ကာလနဲ့ THB
                ဈေးနှုန်းကို ကျောင်းဘက်မှ အတည်ပြုရန် လိုအပ်ပါတယ်။
              </div>
            </div>

            {/* COURSE DETAILS & CURRICULUM */}
            <section className="tmm-intro">
              <span className="pill" style={{ background: '#ffffff2a', color: '#fff' }}>
                ထိုင်းစာလုံး မသင်ရ
              </span>
              <h2>
                စာလုံးမရေး၊ မဖတ်ဘဲ
                <br />
                စကားပြောကိုပဲ အဓိကလေ့လာမယ်
              </h2>
              <p>
                အနီးစပ်ဆုံး မြန်မာလိုအသံထွက်ကို ကိုးကားပြီး ဆရာမက အသံထွက်အမှန် သင်ပြ၊ ကျောင်းသားက
                လိုက်ပြောပြီး မှတ်သားလေ့ကျင့်မယ့် အတန်းဖြစ်ပါတယ်။
              </p>
            </section>

            <div className="section">
              <h2>ဘာတွေထူးခြားသလဲ?</h2>
            </div>
            <section className="tmm-panel">
              {tmmBenefits.map((b, i) => (
                <div key={i} className="tmm-benefit">
                  <span className="check-round">✓</span>
                  <span>{b}</span>
                </div>
              ))}
              <p className="smallprint">
                Live အတန်းသင်ကြားရေးဝန်ဆောင်မှုများကို ဖော်ပြထားခြင်းဖြစ်ပြီး Video Class အတွက်
                ဝန်ဆောင်မှုအကျုံးဝင်မှုကို Admin ထံ အတည်ပြုပါ။
              </p>
            </section>

            <div className="section">
              <h2>Level အလိုက် သင်ရိုး</h2>
              <span className="pill">Beginner</span>
            </div>
            <p className="subtitle">
              Level 1 နဲ့ Level 2 သင်ရိုးနှစ်ခုလုံးကို တစ်တန်းတည်းမှာ တွဲလျက် သင်ကြားပေးပါတယ်။
              နှစ်ခုလုံးက Beginner စကားပြောအဆင့် ဖြစ်ပါတယ်။
            </p>

            {Object.entries(tmmTopics).map(([level, chapters], idx) => (
              <details key={level} className="tmm-level" open={idx === 0}>
                <summary>
                  <span>
                    <strong>{level}</strong>
                    <small>အခန်း {chapters.length} ခန်း</small>
                  </span>
                  <span className="chevron">⌄</span>
                </summary>
                <ol>
                  {chapters.map((ch, i) => (
                    <li key={i}>{ch}</li>
                  ))}
                </ol>
              </details>
            ))}

            <div className="tmm-note">
              💡 သင်ခန်းစာဝေါဟာရ၊ ပြောပုံပြောနည်းအပြင် နမူနာဝါကျတွေကနေ ကိုယ်လိုချင်တဲ့ စကားအဖြစ်
              ပြောင်းလဲပြောဆိုနိုင်အောင် လိုအပ်တဲ့ ဝါကျဖွဲ့စည်းပုံ Grammar ကိုလည်း ရိုးရှင်းလွယ်ကူစွာ
              ရှင်းပြသင်ကြားပေးပါတယ်။
            </div>

            <div className="section">
              <h2>ဘယ်သူတွေအတွက် သင့်တော်သလဲ?</h2>
            </div>
            <div className="tmm-panel">
              <p style={{ margin: 0, lineHeight: 2 }}>
                ထိုင်းစာလုံးတွေ မလေ့လာဘဲ နေ့စဉ်သုံးထိုင်းစကားကို{' '}
                <b>အလွယ်ကူဆုံး၊ အရိုးရှင်းဆုံးနည်းနဲ့ မြန်မြန်ဆန်ဆန် နားလည်ပြောဆိုချင်တဲ့ Beginner</b>{' '}
                တွေအတွက် ရည်ရွယ်ပါတယ်။
              </p>
            </div>

            <div className="section">
              <h2>ကျောင်း၏ အာမခံချက်</h2>
            </div>
            <section className="tls-guarantee">
              <div className="tls-guarantee-title">{schoolGuarantee.title}</div>
              <ol>
                {schoolGuarantee.rules.map((rule, idx) => (
                  <li key={idx}>
                    <strong>{rule.title}</strong> — {rule.desc}
                  </li>
                ))}
              </ol>
              <p>
                အထက်ပါ (၃) ချက်လုံး ပြည့်မီပြီးမှ သတ်မှတ်ထားတဲ့ Level အလိုက် ပြော/ရေးတတ်မြောက်မှု
                မရရှိခဲ့ပါက <strong>သင်တန်းကြေး အပြည့်ပြန်အမ်းမည်</strong> ဟု ကျောင်းက အာမခံဖော်ပြထားပါတယ်။
              </p>
            </section>

            <div className="notice" style={{ marginTop: '13px' }}>
              🛈 {schoolGuarantee.disclaimer}
            </div>

            <p className="smallprint">
              DEMO ONLY — ဒီစာမျက်နှာက အသုံးပြုသူ ပေးထားတဲ့ TMM သင်ရိုးနဲ့ MMK ဈေးနှုန်းတွေကို
              အခြေခံထားတဲ့ Frontend နမူနာပါ။
            </p>
          </div>
        )}

        {/* PAGE 4: TLS DETAILS */}
        {page === 'tls' && (
          <div>
            <div className="page-heading">
              <button className="ghost-btn" type="button" onClick={() => setPage('courses')}>
                ← သင်တန်းများ
              </button>
              <div className="eyebrow" style={{ marginTop: '12px' }}>
                THAI LANGUAGE SPECIAL · TLS
              </div>
              <h1 className="title">Thai Language Special (TLS)</h1>
              <p className="subtitle">အရေး၊ အဖတ်၊ အပြော၊ နားထောင် (4 Skills) + Grammar</p>
            </div>

            {/* ENROLLMENT & REGISTRATION BOX (AT THE VERY TOP) */}
            <div id="enrollment-section" className="enroll-box">
              <div className="section" style={{ marginTop: '8px' }}>
                <h2>📝 သင်တန်းအပ်နှံရန် (Registration)</h2>
                <span className="pill orange">4 Class Styles</span>
              </div>
              <p className="subtitle" style={{ marginBottom: '12px' }}>
                Zoom၊ ရန်ကုန်၊ မန္တလေး = Level 1 + 2 တွဲလျက် (ရက် ၅၀)။ Video TLS = Level 1 / Level 2 ကို သီးခြားရွေးနိုင်ပါတယ်။
              </p>

              <div className="tmm-pricing">
                {(
                  [
                    ['zoom', 'Zoom TLS', '📹', '၅၀ ရက်'],
                    ['yangon', 'ရန်ကုန် TLS', '📍', '၅၀ ရက်'],
                    ['mandalay', 'မန္တလေး TLS', '🏫', '၅၀ ရက်'],
                    ['video', 'Video TLS', '▶', 'ကြာချိန် မသတ်မှတ်ရသေး'],
                  ] as const
                ).map(([sty, name, emoji, duration]) => {
                  const c = courses[1];
                  return (
                    <article key={sty} className="tmm-price-card">
                      <div className="class-photo no-photo" data-style-photo={sty}>
                        <div className="class-photo-placeholder" aria-hidden="true">
                          <span className="placeholder-symbol">{emoji}</span>
                          <strong>{name} ပုံထည့်ရန်</strong>
                          <small>1200 × 675 px</small>
                        </div>
                      </div>
                      <div className="tmm-price-head">
                        <span className="style-emoji">{emoji}</span>
                        <div>
                          <strong>{name}</strong>
                          <small>
                            {duration} · {sty === 'video' ? 'Level 1 / Level 2 သီးသန့်' : 'Level 1 + 2 တွဲလျက်'}
                          </small>
                        </div>
                      </div>
                      <div className="tmm-price-lines">
                        <span className="regular">{mmk(c.prices[sty][0])}</span>
                        <span className="promo">{mmk(c.promo[sty])}</span>
                      </div>
                      <div className="tmm-price-footer">
                        <span className="pill orange">
                          {sty === 'video' ? 'Promotion' : 'Early Bird'} Price
                        </span>
                        <button
                          type="button"
                          className="buy-sm"
                          onClick={() => handleOpenTlsCheckout(sty)}
                        >
                          သင်တန်းအပ်နှံရန် →
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="notice" style={{ marginTop: '14px', marginBottom: '18px' }}>
                🛈 Video TLS အတွက် ဖော်ပြထားသော ၂၀၀,၀၀၀ / ၁၀၀,၀၀၀ ကျပ်သည် Level 1 နှင့် Level 2
                တစ်ခုချင်းစီ၏ဈေးနှုန်းဟုတ်/မဟုတ်ကို အတည်မပြုရသေးပါ။ Checkout တွင် Demo ဈေးအဖြစ်သာ
                ပြထားပါတယ်။
              </div>
            </div>

            {/* COURSE DETAILS & CURRICULUM */}
            <div className="tmm-note" style={{ margin: '0 0 13px' }}>
              📌 <strong>Live Class:</strong> Level 1+2 တွဲလျက် · <strong>Video TLS:</strong> Level 1
              သို့မဟုတ် Level 2 သီးသန့် ရွေးနိုင်ပါတယ်။
            </div>

            <section className="tls-intro">
              <span className="pill" style={{ background: '#ffffff2a', color: '#fff' }}>
                ထိုင်းစာကို အခြေခံမှ စနစ်တကျ
              </span>
              <h2>
                ထိုင်းစာလုံးဖတ်ရေးနိုင်ဖို့မှစ၍
                <br />
                လက်တွေ့ပြောဆိုနိုင်သည်အထိ
              </h2>
              <p>
                ထိုင်းစာအခြေခံမှစပြီး လုပ်ငန်းခွင်တွင် စနစ်တကျ ဆက်သွယ်ပြောဆိုလိုသူများအတွက် 4 Skills +
                Grammar အတန်း ဖြစ်ပါတယ်။
              </p>
            </section>

            <div className="section">
              <h2>သင်ကြားပေးမည့် အခြေခံများ</h2>
            </div>
            <section className="tmm-panel">
              {tlsFundamentals.map((item, i) => (
                <div key={i} className="tmm-benefit">
                  <span className="check-round">✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </section>

            <div className="section">
              <h2>လက်တွေ့သုံး သင်ခန်းစာများ</h2>
              <span className="pill">၉ ခေါင်းစဉ်</span>
            </div>
            <details className="tmm-level" open>
              <summary>
                <span>
                  <strong>သင်ရိုးအကြောင်းအရာ</strong>
                  <small>အခြေခံစကားပြောနှင့် နေ့စဉ်သုံးအကြောင်းအရာများ</small>
                </span>
                <span className="chevron">⌄</span>
              </summary>
              <ol>
                {tlsChapters.map((ch, i) => (
                  <li key={i}>{ch}</li>
                ))}
              </ol>
            </details>

            <div className="tmm-note">
              💡 သင်ရိုးမှာ ထိုင်းစာလုံးတွေကို ရေး၊ ဖတ်တတ်စေဖို့အပြင် နမူနာဝါကျကို မိမိပြောချင်တဲ့စကားအဖြစ်
              ပြောင်းလဲအသုံးပြုနိုင်အောင် မေးခွန်းပုံစံ၊ အငြင်းပုံစံနဲ့ လက်တွေ့သုံး Grammar ကို ရိုးရှင်းစွာ
              သင်ကြားပေးပါတယ်။
            </div>

            <div className="section">
              <h2>ကျောင်း၏ အာမခံချက်</h2>
            </div>
            <section className="tls-guarantee">
              <div className="tls-guarantee-title">{schoolGuarantee.title}</div>
              <ol>
                {schoolGuarantee.rules.map((rule, idx) => (
                  <li key={idx}>
                    <strong>{rule.title}</strong> — {rule.desc}
                  </li>
                ))}
              </ol>
              <p>
                အထက်ပါ (၃) ချက်လုံး ပြည့်မီပြီးမှ သတ်မှတ်ထားတဲ့ Level အလိုက် ပြော/ရေးတတ်မြောက်မှု
                မရရှိခဲ့ပါက <strong>သင်တန်းကြေး အပြည့်ပြန်အမ်းမည်</strong> ဟု ကျောင်းက အာမခံဖော်ပြထားပါတယ်။
              </p>
            </section>

            <div className="notice" style={{ marginTop: '13px' }}>
              🛈 {schoolGuarantee.disclaimer}
            </div>

            <p className="smallprint">
              Thai Language Special (TLS) — Zoom၊ ရန်ကုန်၊ မန္တလေး နှင့် Video အတန်းအားလုံးမှာ တူညီတဲ့
              သင်တန်းအမည်ကို အသုံးပြုပါတယ်။ THB ဈေးနှုန်းနှင့် Video သင်တန်းကြာချိန်ကို မပေးထားသေးပါ။
            </p>
            <p className="smallprint">
              DEMO ONLY — ဒီစာမျက်နှာဟာ ကျောင်းကပေးထားတဲ့ TLS သင်ရိုး၊ ဈေးနှုန်းနဲ့ အာမခံချက်ကို
              အခြေခံထားတဲ့ Frontend နမူနာဖြစ်ပါတယ်။
            </p>
          </div>
        )}

        {/* PAGE 5: BOOKS CATALOG */}
        {page === 'books' && (
          <div>
            <div className="page-heading">
              <div className="eyebrow">THAISAR BOOKSTORE</div>
              <h1 className="title">ထိုင်းဘာသာစကားစာအုပ်များ</h1>
              <div className="subtitle">
                မိမိနှစ်သက်တဲ့ စာအုပ်ကို ရွေးပြီး ဝယ်ယူနိုင်သလို “စာအုပ်အကြောင်း” မှာ အချက်အလက်အသေးစိတ်
                ဖတ်နိုင်ပါတယ်။
              </div>
            </div>

            <div className="book-list">
              {books.map((b) => (
                <article key={b.id} className="book-card featured">
                  <div className="book-pic">
                    <div className="book-art no-photo">
                      <div className="book-photo-hint">
                        <span>📚</span>
                        <strong>စာအုပ်မျက်နှာဖုံးပုံ ထည့်ရန်</strong>
                        <small>practical-thai-book.webp</small>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3>{b.name}</h3>
                    <div className="subtitle">{b.shortDescription}</div>
                    <div className="book-price-bar">
                      <span className="strike">{mmk(b.price[0])}</span>
                      <strong className="price">{mmk(b.promo[0]!)}</strong>
                      <span className="pill orange">အထူး Promotion</span>
                    </div>
                    <div className="book-card-actions">
                      <button
                        type="button"
                        className="main-btn"
                        onClick={() => handleOpenBookCheckout(b.id)}
                      >
                        ဝယ်ယူမည်
                      </button>
                      <button
                        type="button"
                        className="outline-btn"
                        onClick={() => {
                          setSelectedBookId(b.id);
                          setPage('bookDetail');
                        }}
                      >
                        စာအုပ်အကြောင်း
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="notice" style={{ marginTop: '16px' }}>
              📦 စာအုပ်ဖိုးကို အရင်ပေးချေပြီး ပို့ဆောင်ခကို Admin က နောက်မှ သီးခြားတွက်ချက်ပေးပါမယ်။
            </div>
          </div>
        )}

        {/* PAGE 6: BOOK DETAIL */}
        {page === 'bookDetail' && (
          <div>
            <div className="book-detail-back">
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setPage('books')}
              >
                ← စာအုပ်များသို့ ပြန်သွားရန်
              </button>
            </div>
            <div className="page-heading">
              <div className="eyebrow">စာအုပ်အကြောင်း · BOOK DETAILS</div>
              <h1 className="title">{selectedBook.name}</h1>
              <p className="subtitle">{selectedBook.english}</p>
            </div>

            <section className="book-detail-hero">
              <div className="book-pic">
                <div className="book-art no-photo">
                  <div className="book-photo-hint">
                    <span>📚</span>
                    <strong>စာအုပ်မျက်နှာဖုံးပုံ ထည့်ရန်</strong>
                    <small>practical-thai-book.webp</small>
                  </div>
                </div>
              </div>
              <h2>{selectedBook.name}</h2>
              <div className="subtitle" style={{ margin: '0 2px' }}>
                {selectedBook.summary}
              </div>
              <div className="book-price-bar">
                <span className="strike">{mmk(selectedBook.price[0])}</span>
                <strong className="price">{mmk(selectedBook.promo[0]!)}</strong>
                <span className="pill orange">အထူး Promotion</span>
              </div>
              <button
                className="main-btn"
                type="button"
                style={{ width: '100%', minHeight: '44px' }}
                onClick={() => handleOpenBookCheckout(selectedBook.id)}
              >
                ဝယ်ယူမည် →
              </button>
            </section>

            <div className="section">
              <h2>ဒီစာအုပ်အကြောင်း</h2>
            </div>
            <div className="tmm-panel book-detail-points">
              {selectedBook.features.map((feature, i) => (
                <div key={i} className="point">
                  <span>✓</span>
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <div className="section">
              <h2>သင်ခန်းစာ ({selectedBook.chapters.length}) ခန်း</h2>
            </div>
            <div className="book-lesson-grid">
              {selectedBook.chapters.map((ch, i) => (
                <span key={i}>
                  <b>{String(i + 1).padStart(2, '0')}.</b> {ch}
                </span>
              ))}
            </div>

            <div className="notice" style={{ marginTop: '15px' }}>
              📦 စာအုပ်ဖိုးကို အရင်ပေးချေပြီး Delivery Fee ကို Admin တွက်ချက်ပြီးနောက် သီးခြားပေးချေရပါမယ်။
              Promotion သက်တမ်းကို Admin ထံ အတည်ပြုရန် လိုအပ်ပါတယ်။
            </div>

            <button
              className="main-btn"
              type="button"
              style={{ width: '100%', marginTop: '16px' }}
              onClick={() => handleOpenBookCheckout(selectedBook.id)}
            >
              ဝယ်ယူမည် — {mmk(selectedBook.promo[0]!)}
            </button>
          </div>
        )}

        {/* PAGE 7: FREE LEARNING */}
        {page === 'free' && (
          <div>
            <div className="page-heading">
              <div className="eyebrow">FREE THAI LEARNING</div>
              <h1 className="title">အခမဲ့ ထိုင်းစာလေ့လာရန်</h1>
              <div className="subtitle">
                Account ဖွင့်ရန် မလိုပါ။ Video သင်ခန်းစာနဲ့ Free Web App ဆိုပြီး နည်းလမ်း ၂ မျိုး
                ရွေးနိုင်ပါတယ်။
              </div>
            </div>

            <div className="free-options">
              <button
                className={`free-option ${freeMode === 'video' ? 'active' : ''}`}
                type="button"
                onClick={() => setFreeMode('video')}
                aria-pressed={freeMode === 'video'}
              >
                <span className="free-icon">🎥</span>
                <strong>Free Learning (Video)</strong>
                <small>အခမဲ့ Video သင်ခန်းစာ</small>
              </button>
              <button
                className={`free-option ${freeMode === 'app' ? 'active' : ''}`}
                type="button"
                onClick={() => setFreeMode('app')}
                aria-pressed={freeMode === 'app'}
              >
                <span className="free-icon">📱</span>
                <strong>Free Learning (App)</strong>
                <small>အခမဲ့ ထိုင်းစာ Web App</small>
              </button>
            </div>

            {freeMode === 'video' ? (
              <div className="free-demo-block">
                <h3 style={{ margin: '0 0 7px', fontSize: '14px' }}>🎬 Free Learning (Video)</h3>
                <p className="subtitle">သင်တန်းမအပ်မီ အခမဲ့ Video သင်ခန်းစာများကို လေ့လာကြည့်ရှုနိုင်မယ်။</p>
                <div className="notice" style={{ marginTop: '12px' }}>
                  Video Link / Playlist ကို ကျောင်းဘက်မှ မပေးရသေးလို့ ယခု Demo မှာ Video အစစ်
                  မဖွင့်နိုင်သေးပါ။ Admin Portal မှာ နောက်မှ ချိတ်ဆက်နိုင်ပါတယ်။
                </div>
              </div>
            ) : (
              <div className="free-demo-block">
                <h3 style={{ margin: '0 0 7px', fontSize: '14px' }}>📱 Free Learning (App)</h3>
                <p className="subtitle">
                  Free Thai Learning Web App ထဲက စကားလုံးလေ့ကျင့်ခန်း နမူနာတစ်ခုကို အောက်မှာ
                  စမ်းသုံးကြည့်နိုင်ပါတယ်။
                </p>
                <div className="thai-practice">
                  <div className="eyebrow">
                    CARD {phraseIdx + 1} / {phrases.length}
                  </div>
                  <div className="phrase">{phrases[phraseIdx].th}</div>
                  <div className="trans">{phrases[phraseIdx].phon}</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, minHeight: '27px' }}>
                    {showTrans ? phrases[phraseIdx].my : '••••••••'}
                  </div>
                  <div className="practice-actions">
                    <button
                      className="outline-btn"
                      type="button"
                      onClick={() => setShowTrans(!showTrans)}
                    >
                      {showTrans ? 'အဓိပ္ပာယ်ဖျောက်' : 'အဓိပ္ပာယ်ပြ'}
                    </button>
                    <button
                      className="main-btn"
                      type="button"
                      onClick={() => {
                        setPhraseIdx((prev) => (prev + 1) % phrases.length);
                        setShowTrans(true);
                      }}
                    >
                      နောက်တစ်ခု →
                    </button>
                  </div>
                </div>
                <div className="notice" style={{ marginTop: '12px' }}>
                  Full Free Learning App ကို နောက်မှ ချိတ်ဆက်ပါမယ်။ ယခု Flashcards က Demo
                  နမူနာသာဖြစ်ပါတယ်။
                </div>
              </div>
            )}
          </div>
        )}

        {/* PAGE 8: ACCOUNT */}
        {page === 'account' && (
          <div>
            <div className="account-head">
              <div className="account-name">
                <div className="avatar">👤</div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <strong>{persist.displayName}</strong>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '999px',
                        backgroundColor: isSupabaseConfigured
                          ? 'rgba(16, 185, 129, 0.12)'
                          : 'rgba(100, 116, 139, 0.12)',
                        color: isSupabaseConfigured ? '#047857' : '#64748b',
                        border: `1px solid ${
                          isSupabaseConfigured
                            ? 'rgba(16, 185, 129, 0.3)'
                            : 'rgba(100, 116, 139, 0.25)'
                        }`,
                      }}
                      title={
                        isSupabaseConfigured
                          ? 'Synced with Supabase Cloud DB & Storage'
                          : 'Running in Local Storage demo mode'
                      }
                    >
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: isSupabaseConfigured ? '#10b981' : '#94a3b8',
                        }}
                      />
                      {isSupabaseConfigured ? 'Supabase Cloud Connected' : 'Local Demo Mode'}
                    </span>
                  </div>
                  <div className="tiny">Member ID: THM-DEMO-0001</div>
                  <div className="tiny">Demo Account — No Login Required</div>
                </div>
              </div>
              <div className="tier-line">
                <div>
                  <div className="tiny">YOUR MEMBERSHIP</div>
                  <div style={{ fontSize: '18px', fontWeight: 900, marginTop: '5px' }}>
                    {currentTier.icon} {currentTier.name} Member
                  </div>
                </div>
                <span className="tier-badge">{currentTier.rate}% OFF</span>
              </div>
            </div>

            <div className="section">
              <h2>Membership Rewards</h2>
              <span className="pill">Demo: 1 / 3 / 5 orders</span>
            </div>
            <div className="member-grid">
              {tiers.map((t, idx) => (
                <div
                  key={t.name}
                  className={`member-tile ${userRank === idx ? 'current' : ''}`}
                >
                  <div style={{ fontSize: '21px' }}>{t.icon}</div>
                  <strong>{t.name}</strong>
                  <span>{t.rate}%</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '17px' }}>
              <div className="split">
                <b style={{ fontSize: '12px' }}>
                  {approvedCount >= 5 ? '💎 Diamond Level ရပါပြီ' : 'Next Member Tier'}
                </b>
                <span className="subtitle">
                  {approvedCount >= 5
                    ? 'Max Tier'
                    : `${approvedCount} / ${
                        approvedCount < 1 ? 1 : approvedCount < 3 ? 3 : 5
                      } Approved Orders`}
                </span>
              </div>
              <div className="progress-bg" style={{ marginTop: '10px' }}>
                <div
                  className="progress-fill"
                  style={{
                    width: `${
                      approvedCount >= 5
                        ? 100
                        : Math.min(
                            100,
                            Math.round(
                              ((approvedCount -
                                (approvedCount < 1 ? 0 : approvedCount < 3 ? 1 : 3)) /
                                ((approvedCount < 1 ? 1 : approvedCount < 3 ? 3 : 5) -
                                  (approvedCount < 1 ? 0 : approvedCount < 3 ? 1 : 3))) *
                                100
                            )
                          )}%`,
                  }}
                />
              </div>
              <p className="smallprint">
                Demo Rule: Approved Purchase 1 ကြိမ် = Silver၊ 3 ကြိမ် = Gold၊ 5 ကြိမ် = Diamond။
                ဒီ Threshold တွေကို နမူနာအဖြစ်သာ ထည့်ထားပါတယ်။
              </p>
            </div>

            <div className="section">
              <h2>My Account</h2>
            </div>
            <div className="account-menu">
              <button type="button" onClick={() => setPage('orders')}>
                <svg className="s-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="m12 2 9 5-9 5-9-5zM3 7v10l9 5 9-5V7m-9 5v10" />
                </svg>
                <span>My Orders & Order Status ({persist.orders.length})</span>
                <span className="arrow">›</span>
              </button>

              <button type="button" onClick={() => setPage('documents')}>
                <svg className="s-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                <span>စာရွက်စာတမ်း စီမံခန့်ခွဲမှု ({persist.documents.length})</span>
                <span className="arrow">›</span>
              </button>

              <button type="button" onClick={handleOpenProfile}>
                <svg className="s-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 20h9M4 16l12-12 4 4-12 12H4z" />
                </svg>
                <span>ကိုယ်ရေးအချက်အလက် ပြင်ရန်</span>
                <span className="arrow">›</span>
              </button>

              <button type="button" onClick={() => setActiveSheet('portal')}>
                <svg className="s-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M3 5.5a2.5 2.5 0 0 1 2.5-2.5H12v18H5.5A2.5 2.5 0 0 0 3 23z" />
                  <path d="M21 5.5A2.5 2.5 0 0 0 18.5 3H12v18h6.5A2.5 2.5 0 0 1 21 23z" />
                </svg>
                <span>Student Learning Portal</span>
                <span className="arrow">›</span>
              </button>

              <button type="button" onClick={() => setActiveSheet('memberRules')}>
                <svg className="s-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="m12 2 3 6.5 7 .9-5.2 5 1.3 7L12 18l-6.1 3.4 1.3-7L2 9.4l7-.9z" />
                </svg>
                <span>Membership Benefits</span>
                <span className="arrow">›</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDriveSettingUrl(persist.driveUploadUrl || ENV_DRIVE_UPLOAD_URL);
                  setDriveSettingFolder(persist.driveFolderId || ENV_DRIVE_FOLDER_ID);
                  setActiveSheet('driveConfig');
                }}
              >
                <svg className="s-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span>Google Drive ဆက်တင် (Slip Upload)</span>
                <span className="arrow">›</span>
              </button>

              <button type="button" onClick={() => setActiveSheet('reset')}>
                <svg className="s-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M10 3H4v18h6m4-4 5-5-5-5m5 5H9" />
                </svg>
                <span>Reset Demo Data</span>
                <span className="arrow">›</span>
              </button>
            </div>

            <p className="smallprint">
              အမှန်တကယ် Member Login၊ Order Tracking၊ Student Portal Access တွေကို Production Backend
              နဲ့ ချိတ်ဆက်ရပါမယ်။
            </p>
          </div>
        )}

        {/* PAGE 9: ORDERS */}
        {page === 'orders' && (
          <div>
            <div className="page-heading">
              <button className="ghost-btn" type="button" onClick={() => setPage('account')}>
                ← My Account
              </button>
              <h1 className="title" style={{ marginTop: '10px' }}>
                My Orders
              </h1>
              <div className="subtitle">Demo Order Status နဲ့ Membership Upgrade စမ်းသပ်နိုင်ပါတယ်။</div>
            </div>

            {persist.orders.length === 0 ? (
              <div className="empty">
                <div className="emoji">🛍️</div>
                Order မရှိသေးပါ။
                <div>
                  <button
                    className="main-btn"
                    type="button"
                    style={{ marginTop: '12px' }}
                    onClick={() => setPage('courses')}
                  >
                    Course ဝယ်ယူရန်
                  </button>
                </div>
              </div>
            ) : (
              [...persist.orders].reverse().map((o) => (
                <div key={o.id} className="order">
                  <div className="split">
                    <h3>{o.label}</h3>
                    <span className={`status ${o.status === 'approved' ? 'approved' : ''}`}>
                      {o.status === 'approved'
                        ? 'Approved'
                        : o.payment === 'Cash on Delivery'
                        ? 'Admin Contact Pending'
                        : 'Pending Payment Review'}
                    </span>
                  </div>
                  <div className="details">
                    Order: {o.id}
                    {o.studentName && (
                      <>
                        <br />
                        ကျောင်းသား/သူ: {o.studentName}
                      </>
                    )}
                    {o.telegramUsername && (
                      <>
                        <br />
                        Telegram: {o.telegramUsername}
                      </>
                    )}
                    <br />
                    Price: {Number(o.total).toLocaleString('en-US')} {o.currency}
                    {o.bookIncluded && (
                      <>
                        <br />
                        စာအုပ်ပါဝင်သည် · ပို့ခ သီးခြား
                      </>
                    )}
                    <br />
                    Payment: {o.payment} · {o.createdAt}
                    <br />
                    Contact: {o.customerPhone || 'Not provided'}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '11px', flexWrap: 'wrap' }}>
                    {/* Direct link to Google Drive screenshot */}
                    {o.driveFileUrl && (
                      <a
                        href={o.driveFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="drive-btn"
                        style={{ fontSize: '11.5px', padding: '6px 10px' }}
                      >
                        📁 Google Drive စလစ် ↗
                      </a>
                    )}

                    {/* Direct link to view the generated receipt document */}
                    {o.documentId && (
                      <button
                        type="button"
                        className="buy-sm"
                        style={{ background: '#f2edff', color: '#5b32cb' }}
                        onClick={() => {
                          const doc = persist.documents.find((d) => d.id === o.documentId);
                          if (doc) {
                            setPreviewDoc(doc);
                            setActiveSheet('docPreview');
                          } else {
                            notify('ငွေလွှဲပြေစာ စာရွက်စာတမ်းကို Documents ထဲတွင် ကြည့်ရှုနိုင်ပါသည်။');
                          }
                        }}
                      >
                        📄 ပြေစာ စာရွက်စာတမ်း ကြည့်ရန်
                      </button>
                    )}

                    {o.status === 'pending' && (
                      <button
                        className="outline-btn"
                        type="button"
                        style={{ flex: 1, minWidth: '160px' }}
                        onClick={() => handleApproveOrder(o.id)}
                      >
                        ✓ Simulate ADMIN Approval (Demo Only)
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}

            <div className="notice" style={{ marginTop: '14px' }}>
              🔒 ဒီ Approval ခလုတ်က UI Demo စမ်းသပ်ဖို့သာ ဖြစ်ပါတယ်။ တကယ့် Website မှာ Admin Portal
              ထဲမှာသာ Payment Approval လုပ်ခွင့်ရှိပါမယ်။
            </div>
          </div>
        )}

        {/* PAGE 10: DOCUMENT MANAGEMENT (Full Feature Screen) */}
        {page === 'documents' && (
          <div>
            <div className="page-heading">
              <div className="eyebrow">DOCUMENT MANAGEMENT</div>
              <h1 className="title">စာရွက်စာတမ်း စီမံခန့်ခွဲမှု</h1>
              <div className="subtitle">
                သင်ရိုးညွှန်းတမ်း၊ လေ့ကျင့်ခန်းစာရွက်၊ ပြေစာများနှင့် ကျောင်းသားမှတ်တမ်းများကို စီမံခန့်ခွဲပါ။
              </div>
            </div>

            {/* Document Statistics Tiles */}
            <div className="doc-stat-grid">
              <div className="doc-stat-tile">
                <strong>{persist.documents.length}</strong>
                <small>စုစုပေါင်း ဖိုင်များ</small>
              </div>
              <div className="doc-stat-tile">
                <strong>
                  {
                    persist.documents.filter(
                      (d) => d.category === 'course_materials' || d.category === 'worksheets'
                    ).length
                  }
                </strong>
                <small>သင်ရိုး & Worksheet</small>
              </div>
              <div className="doc-stat-tile">
                <strong>
                  {persist.documents.filter((d) => d.category === 'receipts').length}
                </strong>
                <small>ပြေစာ & ဘောက်ချာ</small>
              </div>
            </div>

            {/* Document Search & Upload Action */}
            <div className="searchbar">
              <svg className="s-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                placeholder="စာရွက်စာတမ်း ရှာဖွေရန်..."
                value={docSearch}
                onChange={(e) => setDocSearch(e.target.value)}
                aria-label="Search documents"
              />
            </div>

            {/* Upload Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0 14px' }}>
              <span className="subtitle">ဖိုင် {filteredDocuments.length} ခု တွေ့ရှိသည်</span>
              <button
                type="button"
                className="main-btn"
                style={{ minHeight: '38px', padding: '8px 14px', fontSize: '11px' }}
                onClick={() => setActiveSheet('docUpload')}
              >
                + စာရွက်စာတမ်း အသစ်တင်ရန်
              </button>
            </div>

            {/* Category Filter Chips */}
            <div className="chips">
              {(
                [
                  ['all', 'အားလုံး'],
                  ['course_materials', 'သင်ရိုးညွှန်းတမ်း'],
                  ['worksheets', 'လေ့ကျင့်ခန်းစာရွက်'],
                  ['receipts', 'ငွေလွှဲပြေစာများ'],
                  ['student_records', 'ကျောင်းသားမှတ်တမ်း'],
                  ['certificates', 'လက်မှတ်များ'],
                ] as const
              ).map(([cat, label]) => (
                <button
                  key={cat}
                  type="button"
                  className={docCategory === cat ? 'active' : ''}
                  onClick={() => setDocCategory(cat)}
                >
                  {label} ({categoryCounts[cat] || 0})
                </button>
              ))}
            </div>

            {/* Document Cards List */}
            {filteredDocuments.length === 0 ? (
              <div className="empty">
                <div className="emoji">📁</div>
                စာရွက်စာတမ်း ရှာမတွေ့ပါ။
                <div style={{ marginTop: '10px' }}>
                  <button
                    type="button"
                    className="outline-btn"
                    onClick={() => {
                      setDocCategory('all');
                      setDocSearch('');
                    }}
                  >
                    ရှာဖွေမှု ပြန်လည်ရှင်းလင်းရန်
                  </button>
                </div>
              </div>
            ) : (
              filteredDocuments.map((doc) => {
                const isPdf = doc.fileType === 'PDF';
                const isDoc = doc.fileType === 'DOC';
                const typeClass = isPdf ? 'pdf' : isDoc ? 'doc' : 'img';

                return (
                  <article key={doc.id} className="doc-card">
                    <div className="doc-top">
                      <div className={`doc-icon-box ${typeClass}`}>
                        {doc.fileType}
                      </div>

                      <div className="doc-info">
                        <div className="doc-title">{doc.title}</div>
                        <div style={{ fontSize: '10px', color: '#7a738c', marginBottom: '3px' }}>
                          {doc.englishTitle}
                        </div>

                        <div className="doc-meta-row">
                          <span className="pill" style={{ padding: '3px 7px', fontSize: '8px' }}>
                            {doc.category === 'course_materials'
                              ? 'သင်ရိုးဖိုင်'
                              : doc.category === 'worksheets'
                              ? 'Worksheet'
                              : doc.category === 'receipts'
                              ? 'ငွေလွှဲပြေစာ'
                              : doc.category === 'student_records'
                              ? 'ကျောင်းသားဖောင်'
                              : 'သင်တန်းဆင်းလက်မှတ်'}
                          </span>
                          <span className="doc-meta-dot">•</span>
                          <span>{doc.fileSize}</span>
                          <span className="doc-meta-dot">•</span>
                          <span>{doc.updatedAt}</span>
                          <span className="doc-meta-dot">•</span>
                          <span>⬇ {doc.downloadCount}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: '11px', color: '#574d6e', marginTop: '10px', lineHeight: '1.7' }}>
                      {doc.description}
                    </div>

                    <div className="doc-actions-row">
                      <button
                        type="button"
                        className="buy-sm"
                        onClick={() => {
                          setPreviewDoc(doc);
                          setActiveSheet('docPreview');
                        }}
                      >
                        အစမ်းဖတ်ရှု / အသေးစိတ်
                      </button>

                      <button
                        type="button"
                        className="buy-sm"
                        style={{ background: '#eaf6ec', color: '#137333' }}
                        onClick={() => handleDownloadDoc(doc)}
                      >
                        ဒေါင်းလုဒ်ရယူရန်
                      </button>

                      {!doc.isSystemDoc && (
                        <button
                          type="button"
                          className="ghost-btn"
                          style={{ marginLeft: 'auto', color: '#a83232', fontSize: '10px' }}
                          onClick={() => handleDeleteDoc(doc.id)}
                        >
                          ဖျက်ရန်
                        </button>
                      )}
                    </div>
                  </article>
                );
              })
            )}

            <div className="notice" style={{ marginTop: '16px' }}>
              💡 စာရွက်စာတမ်းအားလုံးကို လုံခြုံစွာ သိမ်းဆည်းထားပြီး ကျောင်းသားနှင့် Admin အကြား
              အပြန်အလှန် လေ့လာဖတ်ရှု၊ အတည်ပြုနိုင်ပါတယ်။
            </div>
          </div>
        )}
      </main>

      {/* BOTTOM NAVIGATION BAR */}
      <nav className="bottom" aria-label="Main navigation">
        <button
          className={`nav-item ${page === 'home' ? 'active' : ''}`}
          type="button"
          onClick={() => setPage('home')}
          aria-label="ပင်မ"
        >
          <svg className="s-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" />
          </svg>
          <span>ပင်မ</span>
        </button>

        <button
          className={`nav-item ${
            page === 'courses' || page === 'tmm' || page === 'tls' ? 'active' : ''
          }`}
          type="button"
          onClick={() => setPage('courses')}
          aria-label="သင်တန်း"
        >
          <svg className="s-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M3 5.5a2.5 2.5 0 0 1 2.5-2.5H12v18H5.5A2.5 2.5 0 0 0 3 23z" />
            <path d="M21 5.5A2.5 2.5 0 0 0 18.5 3H12v18h6.5A2.5 2.5 0 0 1 21 23z" />
          </svg>
          <span>သင်တန်း</span>
        </button>

        <button
          className={`nav-item ${page === 'books' || page === 'bookDetail' ? 'active' : ''}`}
          type="button"
          onClick={() => setPage('books')}
          aria-label="စာအုပ်"
        >
          <svg className="s-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 8h16l-1 13H5L4 8zM9 8V6a3 3 0 0 1 6 0v2" />
          </svg>
          <span>စာအုပ်</span>
        </button>

        <button
          className={`nav-item ${page === 'free' ? 'active' : ''}`}
          type="button"
          onClick={() => setPage('free')}
          aria-label="အခမဲ့"
        >
          <svg className="s-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="9" />
            <path d="m10 8 6 4-6 4z" />
          </svg>
          <span>အခမဲ့</span>
        </button>

        <button
          className={`nav-item ${
            page === 'account' || page === 'orders' || page === 'documents' ? 'active' : ''
          }`}
          type="button"
          onClick={() => setPage('account')}
          aria-label="အကောင့်"
        >
          <svg className="s-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21a8 8 0 0 1 16 0" />
          </svg>
          <span>အကောင့်</span>
        </button>
      </nav>

      {/* BOTTOM SHEET MODAL BACKDROP */}
      {activeSheet !== 'none' && (
        <div
          className="sheet-back"
          onClick={() => {
            setActiveSheet('none');
            setPreviewDoc(null);
          }}
          role="presentation"
        >
          <div
            className="sheet"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={
              activeSheet === 'enroll'
                ? 'သင်တန်းအပ်နှံရန် Dialog'
                : activeSheet === 'bookBuy'
                ? 'စာအုပ်ဝယ်ယူရန် Dialog'
                : activeSheet === 'profile'
                ? 'ကိုယ်ရေးအချက်အလက် ပြင်ရန် Dialog'
                : activeSheet === 'docPreview'
                ? previewDoc?.title || 'စာရွက်စာတမ်း ကြည့်ရှုခြင်း'
                : activeSheet === 'docUpload'
                ? 'စာရွက်စာတမ်း အသစ်တင်ရန် Dialog'
                : activeSheet === 'orderSuccess'
                ? 'Order အတည်ပြုချက် Dialog'
                : activeSheet === 'driveConfig'
                ? 'Google Drive ဆက်တင် Dialog'
                : 'Modal dialog'
            }
          >
            <div className="handle" />

            {/* SHEET: COURSE ENROLLMENT */}
            {activeSheet === 'enroll' && (
              <div>
                <div className="sheet-head">
                  <h2>သင်တန်းအပ်နှံရန်</h2>
                  <button
                    type="button"
                    className="sheet-x"
                    onClick={() => setActiveSheet('none')}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
                <p className="subtitle">အတန်းရွေးပြီးပါပြီ။ အောက်မှာ အပ်နှံရန် အချက်အလက်တွေ ဖြည့်ပေးပါ။</p>

                <div className="enroll-intro">
                  <div className="enroll-selected-tag">✓ သင်ရွေးထားသော အတန်း</div>
                  <strong>
                    {selectedCourse.name} · {styleNames[checkoutStyle]}
                  </strong>
                  <small>
                    {selectedCourse.id === 'skills' && checkoutStyle === 'video'
                      ? 'Level 1 သို့မဟုတ် Level 2 ကို အောက်မှာ ရွေးပါ။'
                      : 'Level 1 + Level 2 တွဲလျက် ပါဝင်ပါတယ်။'}
                  </small>
                </div>

                {selectedCourse.id === 'skills' && checkoutStyle === 'video' && (
                  <div className="field">
                    <label>
                      သင်တန်း Level ရွေးချယ်ရန် <span className="required-star">*</span>
                    </label>
                    <div className="choice-row">
                      {['Level 1', 'Level 2'].map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          className={checkoutLevel === lvl ? 'selected' : ''}
                          onClick={() => setCheckoutLevel(lvl)}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                    <small>
                      Video TLS တစ်ခုတည်းမှာ Level 1 သို့မဟုတ် Level 2 ကို သီးခြားရွေးချယ်ရပါမယ်။ Level
                      တစ်ခုချင်းစီအတွက် ဈေးနှုန်းကို Admin ထံ အတည်ပြုရန် လိုအပ်ပါတယ်။
                    </small>
                  </div>
                )}

                <div className="enroll-form">
                  <div className="enroll-form-title">📝 သင်တန်းအပ်နှံရန် အချက်အလက်များ</div>

                  <div className="field">
                    <label htmlFor="enrollName">
                      ကျောင်းသား/သူ အမည် <span className="required-star">*</span>
                    </label>
                    <input
                      type="text"
                      id="enrollName"
                      required
                      placeholder="အမည်အပြည့်အစုံ ထည့်ရန်"
                      value={enrollName}
                      onChange={(e) => setEnrollName(e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="customerPhone">
                      ဆက်သွယ်ရန် ဖုန်းနံပါတ် <span className="required-star">*</span>
                    </label>
                    <div className="phone-control">
                      <input
                        type="tel"
                        inputMode="tel"
                        id="customerPhone"
                        placeholder="09xxxxxxxxx / +66..."
                        value={customerPhone}
                        onChange={(e) => {
                          setCustomerPhone(e.target.value);
                          setPhoneSaved(false);
                        }}
                      />
                      <button
                        className="outline-btn"
                        type="button"
                        onClick={() => {
                          if (!validCustomerPhone) {
                            notify('ဆက်သွယ်ရန်ဖုန်းနံပါတ် ၈ လုံးမှ ၁၅ လုံးအတွင်း မှန်ကန်စွာ ထည့်ပါ။');
                            return;
                          }
                          setPhoneSaved(true);
                          notify('ဖုန်းနံပါတ် အတည်ပြုပြီးပါပြီ။');
                        }}
                      >
                        အတည်ပြုရန်
                      </button>
                    </div>
                    <small>သင်တန်း Admin ဘက်မှ ဒီဖုန်းနံပါတ်ကို ပြန်လည်ဆက်သွယ်ပေးပါမယ်။</small>
                    {phoneSaved && <span className="pill green">✓ ဖုန်းနံပါတ် အတည်ပြုပြီး</span>}
                  </div>

                  <div className="field">
                    <label htmlFor="telegramUsername">Telegram Username (ရှိပါက)</label>
                    <input
                      type="text"
                      id="telegramUsername"
                      placeholder="ဥပမာ @username"
                      value={telegramUsername}
                      onChange={(e) => setTelegramUsername(e.target.value)}
                    />
                    <small>မရှိသေးရင် မဖြည့်ဘဲ ဆက်လုပ်နိုင်ပါတယ်။</small>
                  </div>
                </div>

                <div className="enroll-price-strip">
                  <span>သင်တန်းကြေး</span>
                  <span>
                    <s>{mmk(selectedCourse.prices[checkoutStyle][0])}</s>{' '}
                    <strong>{mmk(selectedCourse.promo[checkoutStyle])}</strong>
                  </span>
                </div>

                {/* Optional book add-on */}
                <div className="book-addon">
                  <div className="book-addon-title">📚 သင်တန်းအပ်ရင်း စာအုပ်ပါ ဝယ်မလား?</div>
                  <p className="hint" style={{ margin: '4px 0 0' }}>
                    လက်တွေ့အသုံးချ ထိုင်းဘာသာစကားစာအုပ် · <s>{mmk(books[0].price[0])}</s>{' '}
                    <strong className="book-addon-price">{mmk(books[0].promo[0]!)}</strong>
                  </p>
                  <div className="choice-row">
                    <button
                      type="button"
                      className={!addBook ? 'selected' : ''}
                      onClick={() => setAddBook(false)}
                    >
                      မဝယ်ပါ
                    </button>
                    <button
                      type="button"
                      className={addBook ? 'selected' : ''}
                      onClick={() => setAddBook(true)}
                    >
                      ✓ စာအုပ်ပါ ဝယ်မည်
                    </button>
                  </div>

                  {addBook && (
                    <div className="field">
                      <label>စာအုပ်ပို့ရန် နိုင်ငံ</label>
                      <div className="choice-row">
                        <button
                          type="button"
                          className={delivery === 'Myanmar' ? 'selected' : ''}
                          onClick={() => setDelivery('Myanmar')}
                        >
                          🇲🇲 မြန်မာ
                        </button>
                        <button
                          type="button"
                          className={delivery === 'Thailand' ? 'selected' : ''}
                          onClick={() => setDelivery('Thailand')}
                        >
                          🇹🇭 ထိုင်း
                        </button>
                      </div>
                      <div className="notice" style={{ marginTop: '8px' }}>
                        📦 စာအုပ်ကို သင်တန်းနဲ့ တစ်ကြိမ်တည်း Order တင်နိုင်ပါတယ်။ ပို့ခကို နောက်မှ Admin
                        တွက်ပြီး သီးခြားတောင်းခံပါမယ်။
                      </div>
                    </div>
                  )}
                </div>

                {/* Order Summary */}
                {(() => {
                  const { price, bookAddPrice, discount, total } = calculateTotals();
                  return (
                    <div className="sum">
                      <div>
                        <span>သင်တန်းကြေး</span>
                        <strong>{mmk(price)}</strong>
                      </div>
                      {bookAddPrice > 0 && (
                        <div>
                          <span>စာအုပ် (Promotion)</span>
                          <strong>+ {mmk(bookAddPrice)}</strong>
                        </div>
                      )}
                      <div>
                        <span>Member Discount {currentTier.rate}%</span>
                        <strong>- {money(discount)}</strong>
                      </div>
                      <div className="total">
                        <span>{isCash ? 'Admin ဆက်သွယ်ပြီး သွင်းရန်' : 'ကျသင့်ငွေ'}</span>
                        <span>{mmk(total)}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Payment Selection */}
                <div className="field">
                  <label>Payment Method</label>
                  <div className="choice-row">
                    {(['KBZPay', 'WavePay', 'Cash on Delivery'] as PaymentMethod[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        className={payment === m ? 'selected' : ''}
                        onClick={() => {
                          setPayment(m);
                          if (m === 'Cash on Delivery') {
                            setReceiptFile(null);
                            setReceiptName('');
                          }
                        }}
                      >
                        {m === 'Cash on Delivery' ? 'Cash on Delivery (Admin ဆက်သွယ်မည်)' : m}
                      </button>
                    ))}
                  </div>
                </div>

                {isWallet && (
                  <div className="payment-account">
                    <div>{payment} ငွေလက်ခံဖုန်းနံပါတ်</div>
                    <strong>09-971806681</strong>
                    <div className="only-number">ဒီဖုန်းနံပါတ်တစ်ခုတည်းနှင့်သာ ငွေလက်ခံပါသည်။</div>
                    <div>ငွေလွှဲနံပါတ်ကို Admin က တိုက်ဆိုင်စစ်ဆေးပါမယ်။</div>
                  </div>
                )}

                {isCash ? (
                  <div className="callout-cash">
                    📞 <strong>Cash on Delivery / Admin Contact</strong>
                    <div>
                      သင်တန်းကြေးသွင်းရန် Admin ဘက်မှ သင်ထည့်ထားသောဖုန်းနံပါတ်ကို ဆက်သွယ်ပေးပါမယ်ရှင့်။
                    </div>
                    <div>ဒီနည်းလမ်းရွေးရင် Screenshot မလိုပါ။</div>
                  </div>
                ) : (
                  <div className="field">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label htmlFor="receiptFile" style={{ marginBottom: 0 }}>
                        Payment Screenshot <span style={{ color: '#bd3b45' }}>*</span>
                      </label>
                      <button
                        type="button"
                        className="ghost-btn"
                        style={{ fontSize: '11px', padding: '2px 7px', color: '#6336d4' }}
                        onClick={() => {
                          setDriveSettingUrl(persist.driveUploadUrl || ENV_DRIVE_UPLOAD_URL);
                          setDriveSettingFolder(persist.driveFolderId || ENV_DRIVE_FOLDER_ID);
                          setActiveSheet('driveConfig');
                        }}
                      >
                        ⚙️ Drive Setup
                      </button>
                    </div>
                    <input
                      type="file"
                      id="receiptFile"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        handleReceiptFileChange(file);
                      }}
                    />
                    <small>
                      KPay / Wave ဖြင့် ငွေလွှဲပြီးပါက Screenshot ထည့်ပါ။ (Google Drive သို့ တိုက်ရိုက် Upload လုပ်ပါမည်)
                    </small>

                    {receiptPreviewUrl && (
                      <div className="receipt-preview-box">
                        <img
                          src={receiptPreviewUrl}
                          alt="Slip Preview"
                          className="receipt-preview-img"
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <strong style={{ fontSize: '12px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {receiptName}
                          </strong>
                          <span className="pill green" style={{ marginTop: '2px', display: 'inline-block' }}>
                            ✓ အဆင်သင့်ဖြစ်ပါပြီ
                          </span>
                        </div>
                        <button
                          type="button"
                          className="ghost-btn"
                          style={{ fontSize: '11.5px', color: '#bd3b45', padding: '3px 6px' }}
                          onClick={() => {
                            setReceiptFile(null);
                            setReceiptName('');
                            setReceiptBase64('');
                            setReceiptPreviewUrl('');
                          }}
                        >
                          ✕ ပြောင်းမည်
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="demo-guard">
                  🧪 <strong>Order &amp; Drive Upload</strong> — အတည်ပြုခလုတ်နှိပ်ပါက စလစ်ပုံကို Google Drive သို့
                  ပေးပို့ပြီး Order Voucher နှင့် စာရွက်စာတမ်းကို အလိုအလျောက် ထုတ်ပေးပါမည်။
                </div>

                <button
                  type="button"
                  className="main-btn"
                  style={{ width: '100%', marginTop: '14px' }}
                  disabled={!canSubmitOrder || isUploading}
                  onClick={handleSubmitOrder}
                >
                  {isUploading ? (
                    <>
                      <span className="spinner"></span>
                      {uploadStatusText || 'စလစ်ပုံ Google Drive သို့ ပို့နေပါသည်...'}
                    </>
                  ) : isCash ? (
                    'Admin ဆက်သွယ်ရန် Order တင်မည် · ' + mmk(calculateTotals().total)
                  ) : (
                    'Order အတည်ပြုမည် · ' + mmk(calculateTotals().total)
                  )}
                </button>
              </div>
            )}

            {/* SHEET: BOOK BUY */}
            {activeSheet === 'bookBuy' && (
              <div>
                <div className="sheet-head">
                  <h2>စာအုပ်ဝယ်ယူရန်</h2>
                  <button
                    type="button"
                    className="sheet-x"
                    onClick={() => setActiveSheet('none')}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
                <p className="subtitle">{selectedBook.name} · Buy Now Checkout</p>

                <div className="field">
                  <label>စာအုပ်ပို့ရန် နိုင်ငံ</label>
                  <div className="choice-row">
                    <button
                      type="button"
                      className={delivery === 'Myanmar' ? 'selected' : ''}
                      onClick={() => setDelivery('Myanmar')}
                    >
                      🇲🇲 Myanmar
                    </button>
                    <button
                      type="button"
                      className={delivery === 'Thailand' ? 'selected' : ''}
                      onClick={() => setDelivery('Thailand')}
                    >
                      🇹🇭 Thailand
                    </button>
                  </div>
                  <small>Delivery Fee ကို Admin က နောက်မှတွက်ပြီး သီးခြားတောင်းခံပါမယ်။</small>
                </div>

                <div className="field">
                  <label htmlFor="customerPhoneBook">
                    📞 Customer ဆက်သွယ်ရန် ဖုန်းနံပါတ် <span style={{ color: '#bd3b45' }}>*</span>
                  </label>
                  <div className="phone-control">
                    <input
                      type="tel"
                      inputMode="tel"
                      id="customerPhoneBook"
                      placeholder="ဥပမာ 09xxxxxxxxx / +66..."
                      value={customerPhone}
                      onChange={(e) => {
                        setCustomerPhone(e.target.value);
                        setPhoneSaved(false);
                      }}
                    />
                    <button
                      className="outline-btn"
                      type="button"
                      onClick={() => {
                        if (!validCustomerPhone) {
                          notify('ဆက်သွယ်ရန်ဖုန်းနံပါတ် ၈ လုံးမှ ၁၅ လုံးအတွင်း မှန်ကန်စွာ ထည့်ပါ။');
                          return;
                        }
                        setPhoneSaved(true);
                        notify('ဖုန်းနံပါတ် အတည်ပြုပြီးပါပြီ။');
                      }}
                    >
                      အတည်ပြုရန်
                    </button>
                  </div>
                  <small>Admin ဘက်မှ ဒီဖုန်းနံပါတ်ကို ပြန်လည်ဆက်သွယ်ပေးပါမယ်။</small>
                  {phoneSaved && <span className="pill green">✓ ဖုန်းနံပါတ် ထည့်ပြီးပါပြီ</span>}
                </div>

                <div className="sum">
                  <div>
                    <span>စာအုပ်ဖိုး (Promotion)</span>
                    <strong>{mmk(selectedBook.promo[0]!)}</strong>
                  </div>
                  <div className="total">
                    <span>{isCash ? 'Admin ဆက်သွယ်ပြီး သွင်းရန်' : 'ကျသင့်ငွေ'}</span>
                    <span>{mmk(selectedBook.promo[0]!)}</span>
                  </div>
                </div>

                <div className="field">
                  <label>Payment Method</label>
                  <div className="choice-row">
                    {(['KBZPay', 'WavePay', 'Cash on Delivery'] as PaymentMethod[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        className={payment === m ? 'selected' : ''}
                        onClick={() => {
                          setPayment(m);
                          if (m === 'Cash on Delivery') {
                            setReceiptFile(null);
                            setReceiptName('');
                          }
                        }}
                      >
                        {m === 'Cash on Delivery' ? 'Cash on Delivery (Admin ဆက်သွယ်မည်)' : m}
                      </button>
                    ))}
                  </div>
                </div>

                {isWallet && (
                  <div className="payment-account">
                    <div>{payment} ငွေလက်ခံဖုန်းနံပါတ်</div>
                    <strong>09-971806681</strong>
                    <div className="only-number">ဒီဖုန်းနံပါတ်တစ်ခုတည်းနှင့်သာ ငွေလက်ခံပါသည်။</div>
                  </div>
                )}

                {isCash ? (
                  <div className="callout-cash">
                    📞 စာအုပ်ဖိုး ပေးချေခြင်းနှင့် ပို့ဆောင်မှုအစီအစဉ်ကို Admin က ဆက်သွယ်အတည်ပြုပါမယ်။
                  </div>
                ) : (
                  <div className="field">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label htmlFor="receiptFileBook" style={{ marginBottom: 0 }}>
                        Payment Screenshot <span style={{ color: '#bd3b45' }}>*</span>
                      </label>
                      <button
                        type="button"
                        className="ghost-btn"
                        style={{ fontSize: '11px', padding: '2px 7px', color: '#6336d4' }}
                        onClick={() => {
                          setDriveSettingUrl(persist.driveUploadUrl || ENV_DRIVE_UPLOAD_URL);
                          setDriveSettingFolder(persist.driveFolderId || ENV_DRIVE_FOLDER_ID);
                          setActiveSheet('driveConfig');
                        }}
                      >
                        ⚙️ Drive Setup
                      </button>
                    </div>
                    <input
                      type="file"
                      id="receiptFileBook"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        handleReceiptFileChange(file);
                      }}
                    />
                    <small>
                      KPay / Wave ဖြင့် ငွေလွှဲပြီးပါက Screenshot ထည့်ပါ။ (Google Drive သို့ တိုက်ရိုက် Upload လုပ်ပါမည်)
                    </small>

                    {receiptPreviewUrl && (
                      <div className="receipt-preview-box">
                        <img
                          src={receiptPreviewUrl}
                          alt="Slip Preview"
                          className="receipt-preview-img"
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <strong style={{ fontSize: '12px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {receiptName}
                          </strong>
                          <span className="pill green" style={{ marginTop: '2px', display: 'inline-block' }}>
                            ✓ အဆင်သင့်ဖြစ်ပါပြီ
                          </span>
                        </div>
                        <button
                          type="button"
                          className="ghost-btn"
                          style={{ fontSize: '11.5px', color: '#bd3b45', padding: '3px 6px' }}
                          onClick={() => {
                            setReceiptFile(null);
                            setReceiptName('');
                            setReceiptBase64('');
                            setReceiptPreviewUrl('');
                          }}
                        >
                          ✕ ပြောင်းမည်
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="demo-guard">
                  🧪 <strong>Order &amp; Drive Upload</strong> — အတည်ပြုခလုတ်နှိပ်ပါက စလစ်ပုံကို Google Drive သို့
                  ပေးပို့ပြီး Order Voucher နှင့် စာရွက်စာတမ်းကို အလိုအလျောက် ထုတ်ပေးပါမည်။
                </div>

                <button
                  type="button"
                  className="main-btn"
                  style={{ width: '100%', marginTop: '14px' }}
                  disabled={!phoneSaved || !validCustomerPhone || (!isCash && !receiptFile && !receiptBase64) || isUploading}
                  onClick={handleSubmitOrder}
                >
                  {isUploading ? (
                    <>
                      <span className="spinner"></span>
                      {uploadStatusText || 'စလစ်ပုံ Google Drive သို့ ပို့နေပါသည်...'}
                    </>
                  ) : isCash ? (
                    'Admin ဆက်သွယ်ရန် Order တင်မည် · ' + mmk(selectedBook.promo[0]!)
                  ) : (
                    'Order အတည်ပြုမည် · ' + mmk(selectedBook.promo[0]!)
                  )}
                </button>
              </div>
            )}

            {/* SHEET: EDIT PROFILE */}
            {activeSheet === 'profile' && (
              <div>
                <div className="sheet-head">
                  <h2>ကိုယ်ရေးအချက်အလက် ပြင်ရန်</h2>
                  <button
                    type="button"
                    className="sheet-x"
                    onClick={() => setActiveSheet('none')}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
                <div className="profile-help">
                  အမည်၊ ဖုန်း၊ Viber၊ Telegram၊ Gmail နဲ့ လိပ်စာတွေကို လိုအပ်သလို ဖြည့်နိုင်ပါတယ်။{' '}
                  <strong>မဖြစ်မနေဖြည့်ရမယ့် အကွက်မရှိပါ။</strong>
                </div>

                <div className="profile-form">
                  <div className="field">
                    <label htmlFor="tempProfileName">
                      <span>အမည်</span>
                      <span className="optional-label">မဖြည့်လည်းရသည်</span>
                    </label>
                    <input
                      id="tempProfileName"
                      type="text"
                      maxLength={70}
                      placeholder="အမည် (ရှိပါက)"
                      value={tempProfileName}
                      onChange={(e) => setTempProfileName(e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="tempProfilePhone">
                      <span>ဖုန်းနံပါတ်</span>
                      <span className="optional-label">မဖြည့်လည်းရသည်</span>
                    </label>
                    <input
                      id="tempProfilePhone"
                      type="tel"
                      inputMode="tel"
                      placeholder="09... သို့မဟုတ် +95..."
                      value={tempProfilePhone}
                      onChange={(e) => setTempProfilePhone(e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="tempProfileViber">
                      <span>Viber ဖုန်းနံပါတ်</span>
                      <span className="optional-label">မဖြည့်လည်းရသည်</span>
                    </label>
                    <input
                      id="tempProfileViber"
                      type="tel"
                      inputMode="tel"
                      placeholder="Viber ဖုန်းနံပါတ်"
                      value={tempProfileViber}
                      onChange={(e) => setTempProfileViber(e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="tempProfileTelegram">
                      <span>Telegram ဖုန်းနံပါတ်</span>
                      <span className="optional-label">မဖြည့်လည်းရသည်</span>
                    </label>
                    <input
                      id="tempProfileTelegram"
                      type="tel"
                      inputMode="tel"
                      placeholder="Telegram ဖုန်းနံပါတ်"
                      value={tempProfileTelegram}
                      onChange={(e) => setTempProfileTelegram(e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="tempProfileGmail">
                      <span>Gmail Account</span>
                      <span className="optional-label">မဖြည့်လည်းရသည်</span>
                    </label>
                    <input
                      id="tempProfileGmail"
                      type="email"
                      inputMode="email"
                      placeholder="example@gmail.com"
                      value={tempProfileGmail}
                      onChange={(e) => setTempProfileGmail(e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="tempProfileAddress">
                      <span>လိပ်စာ</span>
                      <span className="optional-label">မဖြည့်လည်းရသည်</span>
                    </label>
                    <textarea
                      id="tempProfileAddress"
                      rows={3}
                      placeholder="အိမ်အမှတ်၊ လမ်း၊ မြို့နယ်၊ မြို့ (ရှိပါက)"
                      value={tempProfileAddress}
                      onChange={(e) => setTempProfileAddress(e.target.value)}
                    />
                  </div>

                  <p className="profile-privacy">
                    🔒 ဒီ Demo မှာ ဖြည့်ထားတာတွေကို ဒီ Browser ထဲမှာပဲ သိမ်းထားပါတယ်။ Admin ထံ မပို့ပါ။
                    တကယ့် Website မှာ Login နဲ့ လုံခြုံတဲ့ Database ချိတ်ဆက်ရန် လိုအပ်ပါတယ်။
                  </p>

                  <div className="profile-actions">
                    <button
                      type="button"
                      className="outline-btn"
                      onClick={() => setActiveSheet('none')}
                    >
                      မလုပ်တော့ပါ
                    </button>
                    <button
                      type="button"
                      className="main-btn"
                      onClick={handleSaveProfile}
                    >
                      သိမ်းဆည်းမည်
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SHEET: DOCUMENT PREVIEW */}
            {activeSheet === 'docPreview' && previewDoc && (
              <div>
                <div className="sheet-head">
                  <h2>{previewDoc.title}</h2>
                  <button
                    type="button"
                    className="sheet-x"
                    onClick={() => {
                      setActiveSheet('none');
                      setPreviewDoc(null);
                    }}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>

                <div style={{ fontSize: '11px', color: '#7a738c', marginBottom: '8px' }}>
                  {previewDoc.englishTitle}
                </div>

                <div className="doc-meta-row" style={{ marginBottom: '14px' }}>
                  <span className="pill green">✓ တရားဝင်ဖိုင်</span>
                  <span className="pill">{previewDoc.fileType} Document</span>
                  <span className="doc-meta-dot">•</span>
                  <span>{previewDoc.fileSize}</span>
                  {previewDoc.pagesCount && (
                    <>
                      <span className="doc-meta-dot">•</span>
                      <span>{previewDoc.pagesCount} မျက်နှာ</span>
                    </>
                  )}
                  <span className="doc-meta-dot">•</span>
                  <span>ရက်စွဲ: {previewDoc.updatedAt}</span>
                </div>

                <div style={{ fontSize: '12px', lineHeight: '1.8', color: '#312948', margin: '10px 0' }}>
                  {previewDoc.description}
                </div>

                {/* Excerpt preview box */}
                <div className="doc-preview-content">
                  <div style={{ fontWeight: 850, marginBottom: '8px', color: '#5b32cb' }}>
                    📑 စာရွက်စာတမ်း အနှစ်ချုပ်နှင့် အခန်းများ:
                  </div>
                  {(previewDoc.contentPreview || []).map((line, i) => (
                    <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <span style={{ color: '#5b32cb', fontWeight: 900 }}>•</span>
                      <span>{line}</span>
                    </div>
                  ))}
                </div>

                <div className="split" style={{ marginTop: '16px' }}>
                  <button
                    type="button"
                    className="outline-btn"
                    onClick={() => {
                      notify('ပုံနှိပ်ရန် / Print ပရီဗျူး ဖွင့်လှစ်ပြီးပါပြီ (Demo)။');
                    }}
                  >
                    🖨️ ပုံနှိပ်မည် / Print
                  </button>
                  <button
                    type="button"
                    className="main-btn"
                    onClick={() => handleDownloadDoc(previewDoc)}
                  >
                    ⬇ ဒေါင်းလုဒ် ရယူမည် ({previewDoc.fileSize})
                  </button>
                </div>
              </div>
            )}

            {/* SHEET: DOCUMENT UPLOAD */}
            {activeSheet === 'docUpload' && (
              <div>
                <div className="sheet-head">
                  <h2>+ စာရွက်စာတမ်း အသစ်တင်ရန်</h2>
                  <button
                    type="button"
                    className="sheet-x"
                    onClick={() => setActiveSheet('none')}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>

                <p className="subtitle">
                  သင်ရိုးညွှန်းတမ်း၊ လေ့ကျင့်ခန်းဖိုင် သို့မဟုတ် ပြေစာစာရွက်စာတမ်း အသစ် ထည့်သွင်းပါ။
                </p>

                <form onSubmit={handleUploadNewDoc}>
                  <div className="field">
                    <label>
                      စာရွက်စာတမ်း အမည် (မြန်မာလို) <span className="required-star">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="ဥပမာ - TMM အခန်း ၃ လေ့ကျင့်ခန်း စာရွက်"
                      value={newDocTitle}
                      onChange={(e) => setNewDocTitle(e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label>Document Title (English / Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. TMM Chapter 3 Practice Worksheet"
                      value={newDocEnTitle}
                      onChange={(e) => setNewDocEnTitle(e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label>အမျိုးအစား ရွေးချယ်ရန်</label>
                    <select
                      value={newDocCategory}
                      onChange={(e) =>
                        setNewDocCategory(e.target.value as Exclude<DocumentCategory, 'all'>)
                      }
                    >
                      <option value="course_materials">သင်ရိုးညွှန်းတမ်း (Course Materials)</option>
                      <option value="worksheets">လေ့ကျင့်ခန်းစာရွက် (Worksheets)</option>
                      <option value="receipts">ငွေလွှဲပြေစာ & ဘောက်ချာ (Receipts)</option>
                      <option value="student_records">ကျောင်းသားမှတ်တမ်း (Student Records)</option>
                      <option value="certificates">လက်မှတ်များ (Certificates)</option>
                    </select>
                  </div>

                  <div className="field">
                    <label>ဆက်စပ်သင်တန်း</label>
                    <select
                      value={newDocCourse}
                      onChange={(e) =>
                        setNewDocCourse(
                          e.target.value as 'speaking' | 'skills' | 'book' | 'general'
                        )
                      }
                    >
                      <option value="speaking">TMM ထိုင်းစကားပြောသီးသန့်</option>
                      <option value="skills">Thai Language Special (TLS)</option>
                      <option value="book">လက်တွေ့အသုံးချ ထိုင်းဘာသာစကားစာအုပ်</option>
                      <option value="general">အထွေထွေ (General School Docs)</option>
                    </select>
                  </div>

                  <div className="field">
                    <label>ဖိုင်ရွေးချယ်ရန် (PDF / Word / Image)</label>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setNewDocFileName(file.name);
                          if (!newDocTitle) {
                            setNewDocTitle(file.name.replace(/\.[^/.]+$/, ''));
                          }
                        }
                      }}
                    />
                    {newDocFileName && (
                      <span className="pill green" style={{ marginTop: '4px' }}>
                        ✓ {newDocFileName}
                      </span>
                    )}
                  </div>

                  <div className="field">
                    <label>ဖော်ပြချက် / မှတ်ချက်</label>
                    <textarea
                      rows={2}
                      placeholder="ဖိုင်အကြောင်း အကျဉ်းချုပ် ဖြည့်သွင်းရန်..."
                      value={newDocDesc}
                      onChange={(e) => setNewDocDesc(e.target.value)}
                    />
                  </div>

                  <div className="split" style={{ marginTop: '16px' }}>
                    <button
                      type="button"
                      className="outline-btn"
                      onClick={() => setActiveSheet('none')}
                    >
                      မလုပ်တော့ပါ
                    </button>
                    <button type="submit" className="main-btn">
                      စာရွက်စာတမ်း သိမ်းဆည်းမည်
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* SHEET: STUDENT PORTAL INFO */}
            {activeSheet === 'portal' && (
              <div>
                <div className="sheet-head">
                  <h2>Student Portal</h2>
                  <button
                    type="button"
                    className="sheet-x"
                    onClick={() => setActiveSheet('none')}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
                <div className="empty">
                  <div className="emoji">🎓</div>
                  <b>student.thaisar.org</b>
                  <p>
                    Student Learning Portal ကို သီးခြား Website အဖြစ် တည်ဆောက်ဖို့ စီစဉ်ထားပါတယ်။ ဒီ
                    E-commerce Demo ထဲမှာ Attendance, Homework, Exam, Video Lessons မပါဝင်ပါ။
                  </p>
                </div>
              </div>
            )}

            {/* SHEET: MEMBER BENEFITS */}
            {activeSheet === 'memberRules' && (
              <div>
                <div className="sheet-head">
                  <h2>Member Benefits</h2>
                  <button
                    type="button"
                    className="sheet-x"
                    onClick={() => setActiveSheet('none')}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
                <div className="member-grid">
                  {tiers.map((t, idx) => (
                    <div
                      key={t.name}
                      className={`member-tile ${userRank === idx ? 'current' : ''}`}
                    >
                      <div style={{ fontSize: '19px' }}>{t.icon}</div>
                      <strong>{t.name}</strong>
                      {t.rate}%
                    </div>
                  ))}
                </div>
                <p className="hint">
                  Membership Discount ကို Admin ရွေးထားတဲ့ Eligible Courses / Books တွေမှာသာတွက်ပေးမယ်။
                </p>
                <div className="notice">
                  Demo Only — 1 approved order = Silver, 3 = Gold, 5 = Diamond. အမှန်တကယ် Upgrade Rules
                  ကို Admin Portal မှာ နောက်ပိုင်းသတ်မှတ်နိုင်ပါတယ်။
                </div>
              </div>
            )}

            {/* SHEET: RESET CONFIRMATION */}
            {activeSheet === 'reset' && (
              <div>
                <div className="sheet-head">
                  <h2>Reset Demo Data</h2>
                  <button
                    type="button"
                    className="sheet-x"
                    onClick={() => setActiveSheet('none')}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
                <p className="subtitle">
                  Demo Orders၊ Member Tier Progress၊ Document မှတ်တမ်းများနှင့် Profile
                  အချက်အလက်အားလုံး Reset လုပ်မှာ သေချာပါသလား?
                </p>
                <div className="split" style={{ marginTop: '20px' }}>
                  <button
                    className="outline-btn"
                    type="button"
                    onClick={() => setActiveSheet('none')}
                  >
                    Cancel
                  </button>
                  <button
                    className="main-btn"
                    type="button"
                    onClick={handleResetData}
                  >
                    Reset Demo
                  </button>
                </div>
              </div>
            )}

            {/* SHEET: ORDER SUCCESS & GOOGLE DRIVE CONFIRMATION */}
            {activeSheet === 'orderSuccess' && lastSubmittedOrder && (
              <div>
                <div className="sheet-head">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '22px' }}>🎉</span>
                    <h2 style={{ margin: 0 }}>Order အောင်မြင်စွာ တင်ပြီးပါပြီ</h2>
                  </div>
                  <button
                    type="button"
                    className="sheet-x"
                    onClick={() => setActiveSheet('none')}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>

                <div style={{ background: '#f4fbf5', border: '1px solid #c8e6c9', borderRadius: '16px', padding: '16px 14px', margin: '14px 0', textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', marginBottom: '4px' }}>✅</div>
                  <strong style={{ fontSize: '15.5px', color: '#1b5e20', display: 'block' }}>
                    သင့် Order အချက်အလက်ကို လက်ခံရရှိပါပြီ
                  </strong>
                  <div style={{ fontSize: '13px', color: '#2e7d32', marginTop: '4px' }}>
                    Order No: <strong>{lastSubmittedOrder.order.id}</strong>
                  </div>
                </div>

                <div className="order" style={{ margin: '12px 0' }}>
                  <div className="split">
                    <strong style={{ fontSize: '14px' }}>{lastSubmittedOrder.order.label}</strong>
                    <span className="status">Pending Review</span>
                  </div>
                  <div className="details" style={{ marginTop: '8px' }}>
                    {lastSubmittedOrder.order.studentName && (
                      <div>ကျောင်းသား/သူ: <strong>{lastSubmittedOrder.order.studentName}</strong></div>
                    )}
                    <div>ဆက်သွယ်ရန်ဖုန်း: <strong>{lastSubmittedOrder.order.customerPhone}</strong></div>
                    <div>ပေးချေမှုစနစ်: <strong>{lastSubmittedOrder.order.payment}</strong></div>
                    <div>ကျသင့်ငွေ: <strong>{Number(lastSubmittedOrder.order.total).toLocaleString('en-US')} MMK</strong></div>
                  </div>
                </div>

                {lastSubmittedOrder.driveFileUrl ? (
                  <div style={{ background: '#f1f8e9', border: '1px solid #dcedc8', borderRadius: '14px', padding: '13px', margin: '14px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2e7d32', fontWeight: 700, fontSize: '13px' }}>
                      <span>📁</span>
                      <span>Google Drive သို့ စလစ်ပုံ တင်ပြီးပါပြီ</span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#446e22', margin: '6px 0 10px 0', lineHeight: 1.5 }}>
                      ငွေလွှဲစလစ်ပုံကို Google Drive Folder သို့ အောင်မြင်စွာ တိုက်ရိုက် Upload ပြုလုပ်သိမ်းဆည်းထားပြီးဖြစ်ပါသည်။
                    </p>
                    <a
                      href={lastSubmittedOrder.driveFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="drive-btn"
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      📂 Google Drive တွင် စလစ်ဖွင့်ကြည့်ရန် ↗
                    </a>
                  </div>
                ) : (
                  <div className="callout-cash" style={{ margin: '12px 0' }}>
                    📞 Admin ဘက်မှ သင်ထည့်ထားသောဖုန်းနံပါတ်သို့ အမြန်ဆုံး ဆက်သွယ်အတည်ပြုပေးပါမည်။
                  </div>
                )}

                <div className="notice" style={{ marginTop: '10px' }}>
                  📄 အော်ဒါငွေလွှဲပြေစာ (Voucher Document) ကို <strong>Documents</strong> စာမျက်နှာတွင်လည်း အလိုအလျောက် ထည့်သွင်းပေးထားပါသည်။
                </div>

                <div className="split" style={{ marginTop: '16px' }}>
                  <button
                    type="button"
                    className="outline-btn"
                    onClick={() => {
                      setActiveSheet('none');
                      setPage('orders');
                    }}
                  >
                    My Orders သို့ သွားမည်
                  </button>
                  <button
                    type="button"
                    className="main-btn"
                    onClick={() => setActiveSheet('none')}
                  >
                    ပြီးပါပြီ (ပိတ်မည်)
                  </button>
                </div>
              </div>
            )}

            {/* SHEET: GOOGLE DRIVE CONFIGURATION */}
            {activeSheet === 'driveConfig' && (
              <div>
                <div className="sheet-head">
                  <h2>Google Drive Upload ဆက်တင်</h2>
                  <button
                    type="button"
                    className="sheet-x"
                    onClick={() => setActiveSheet('none')}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
                <p className="subtitle">
                  Customer Payment Screenshot များကို သင်၏ Google Drive Folder သို့ တိုက်ရိုက်သိမ်းဆည်းနိုင်ရန် Google Apps Script Web App URL ကို သတ်မှတ်နိုင်ပါသည်။
                </p>

                <div className="field" style={{ marginTop: '14px' }}>
                  <label htmlFor="driveSettingUrlInput">
                    Google Apps Script Web App URL
                  </label>
                  <input
                    type="url"
                    id="driveSettingUrlInput"
                    placeholder="https://script.google.com/macros/s/.../exec"
                    value={driveSettingUrl}
                    onChange={(e) => setDriveSettingUrl(e.target.value)}
                  />
                  <small>
                    .env ထဲတွင် <code>VITE_GOOGLE_DRIVE_UPLOAD_URL</code> အဖြစ် ထည့်ထားလျှင်လည်း အလိုအလျောက် သုံးပါမည်။
                  </small>
                </div>

                <div className="field" style={{ marginTop: '12px' }}>
                  <label htmlFor="driveSettingFolderInput">
                    Target Google Drive Folder ID (Optional)
                  </label>
                  <input
                    type="text"
                    id="driveSettingFolderInput"
                    placeholder="1abcXYZ_EXAMPLE_FOLDER_ID"
                    value={driveSettingFolder}
                    onChange={(e) => setDriveSettingFolder(e.target.value)}
                  />
                  <small>
                    Google Drive Folder ၏ URL ထဲမှ Folder ID ဖြစ်ပါသည်။ မထည့်ပါက Apps Script ထဲမှ Default Folder သို့ သိမ်းပါမည်။
                  </small>
                </div>

                <div className="notice" style={{ marginTop: '12px' }}>
                  💡 Google Apps Script ကုဒ်ကို ပရောဂျက် root ထဲရှိ <code>GoogleAppsScript_Code.gs</code> တွင် အသင့်ရယူ အသုံးပြုနိုင်ပါသည်။
                </div>

                <div className="split" style={{ marginTop: '18px' }}>
                  <button
                    type="button"
                    className="outline-btn"
                    onClick={() => setActiveSheet('none')}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="main-btn"
                    onClick={() => {
                      setPersist((prev) => ({
                        ...prev,
                        driveUploadUrl: driveSettingUrl.trim(),
                        driveFolderId: driveSettingFolder.trim(),
                      }));
                      setActiveSheet('none');
                      notify('Google Drive ဆက်တင်ကို သိမ်းဆည်းပြီးပါပြီ။');
                    }}
                  >
                    သိမ်းဆည်းမည်
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TOAST FEEDBACK */}
      {toastMessage && (
        <div className="toast" role="status" aria-live="polite">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
