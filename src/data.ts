import { Course, Book, AppDocument } from './types';

export const courses: Course[] = [
  {
    id: 'speaking',
    name: 'TMM ထိုင်းစကားပြောသီးသန့်',
    english: 'Thai Speaking · Beginner',
    thai: 'TMM',
    cover: '',
    descr: 'ထိုင်းစာလုံးတွေ မသင်ဘဲ မြန်မာအသံထွက်ကို ကိုးကားပြီး လက်တွေ့ပြောတတ်ဖို့ သင်ယူပါ။',
    eligible: false,
    prices: {
      zoom: [300000, null],
      video: [150000, null],
      yangon: [400000, null],
      mandalay: [400000, null],
    },
    promo: {
      zoom: 250000,
      video: 70000,
      yangon: 350000,
      mandalay: 350000,
    },
  },
  {
    id: 'skills',
    name: 'Thai Language Special (TLS)',
    english: 'Thai Language Special · Reading • Writing • Speaking • Listening · Grammar',
    thai: 'TLS',
    cover: 'orange',
    descr: 'ထိုင်းစာအခြေခံကနေ စနစ်တကျ ရေး၊ ဖတ်၊ ပြော၊ နားထောင်ပြီး လက်တွေ့သုံး Grammar လေ့လာပါ။',
    eligible: false,
    prices: {
      zoom: [400000, null],
      video: [200000, null],
      yangon: [600000, null],
      mandalay: [600000, null],
    },
    promo: {
      zoom: 350000,
      video: 100000,
      yangon: 500000,
      mandalay: 500000,
    },
  },
];

export const books: Book[] = [
  {
    id: 'practical-thai',
    name: 'လက်တွေ့အသုံးချ ထိုင်းဘာသာစကားစာအုပ်',
    english: 'Practical Thai Language — Self Study',
    price: [150000, null],
    promo: [75000, null],
    eligible: false,
    cover: 'assets/practical-thai-book.webp',
    summary: 'ထိုင်းဘာသာစကားကို ကိုယ်တိုင်လေ့လာလိုသူများအတွက် လက်တွေ့အသုံးချနိုင်သော စာအုပ်ဖြစ်ပါတယ်။',
    shortDescription: 'Self-study · သင်ခန်းစာ ၁၁ ခန်း · Telegram Video + Web App',
    features: [
      'ထိုင်းဘာသာစကားကို Self-study အဖြစ် လေ့လာသူများအတွက် အထူးသင့်တော်ပါတယ်။',
      'ထိုင်းအက္ခရာ၊ Phonetic၊ မြန်မာလိုအသံထွက်၊ မြန်မာအဓိပ္ပာယ်တို့နဲ့ ရေးသားထားပါတယ်။',
      'ထိုင်းဆရာများ အသံထွက်ပေးထားတဲ့ Video များကို Telegram မှတစ်ဆင့် လေ့လာနိုင်ပါတယ်။',
      'Web App မှာ သင်ခန်းစာလေ့လာခြင်း၊ လေ့ကျင့်ခန်းလုပ်ခြင်းနဲ့ ကိုယ်တိုင်စစ်ဆေးခြင်းတို့ ပြုလုပ်နိုင်ပါတယ်။',
    ],
    chapters: [
      'မိတ်ဆက်ခြင်း',
      'နှုတ်ဆက်ခြင်း',
      'ကိန်းဂဏန်းနှင့် ဘဏ်ကိစ္စ',
      'ဈေးဝယ်ခြင်း',
      'အစားအသောက်',
      'အချိန်',
      'ရက်စွဲ',
      'လမ်းမေးခြင်း',
      'ကျန်းမာရေး',
      'မိုးလေဝသ',
      'အသက်မွေးဝမ်းကြောင်း',
    ],
  },
];

export const tmmTopics: Record<string, string[]> = {
  'Level 1': [
    'မိတ်ဆက်ခြင်း',
    'နှုတ်ဆက်ခြင်း',
    'ကိန်းဂဏန်းနှင့် ဘဏ်ကိစ္စ',
    'ဈေးဝယ်ခြင်း',
    'အစားအသောက်',
  ],
  'Level 2': [
    'အချိန်',
    'ရက်စွဲ',
    'လမ်းမေးခြင်း',
    'ကျန်းမာရေး',
  ],
};

export const tmmBenefits = [
  'အတန်းချိန်အတွင်း သင်တန်းသားအားလုံး ထိုင်းစကား ပါဝင်ပြောဆိုရခြင်း',
  'သင်ခန်းစာနှင့်သင့်တော်သော ထပ်ဆောင်းလေ့ကျင့်ခန်းများ',
  'အတန်း Video Recording ပေးခြင်း',
  'အိမ်စာပေးခြင်းနှင့် အိမ်စာစစ်ဆေးပေးခြင်း',
  'အတန်းချိန်ပြင်ပ Telegram Group တွင် မေးမြန်းနိုင်ခြင်း',
];

export const tlsChapters = [
  'မိတ်ဆက်ခြင်း',
  'နှုတ်ဆက်ခြင်း',
  'ကိန်းဂဏန်းများ',
  'ဈေးဝယ်ခြင်း',
  'အစားအသောက်',
  'အချိန်',
  'ရက်စွဲ',
  'လမ်းမေးခြင်း',
  'ကျန်းမာရေး',
];

export const tlsFundamentals = [
  'ထိုင်းဗျည်း၊ သရနှင့် အသံ Tone များ',
  'ဗျည်းတွဲ၊ သရတွဲနှင့် အသတ်သံများ',
  'အခြေခံမှ စနစ်တကျ ဖတ်၊ ရေး၊ ပြော၊ နားထောင်ခြင်း',
  'ပထမ ရက် ၂၀ အတွင်း ထိုင်းစာလုံးများ ရေးသားတတ်ရန် လေ့ကျင့်သင်ကြားခြင်း',
  'လက်တွေ့ဝါကျဖွဲ့စည်းမှု Grammar — မေးခွန်း၊ အငြင်း၊ ဘယ်မှာ၊ ဘယ်အချိန်၊ ဘယ်လို၊ ဘယ်လောက်၊ ဘာ စသည်',
];

export const phrases = [
  { th: 'สวัสดี', phon: 'sa-wat-dii', my: 'မင်္ဂလာပါ' },
  { th: 'ขอบคุณ', phon: 'khɔ̀ɔp-khun', my: 'ကျေးဇူးတင်ပါတယ်' },
  { th: 'คุณชื่ออะไร', phon: 'khun chʉ̂ʉ à-rai', my: 'သင့်နာမည် ဘယ်လိုခေါ်လဲ' },
  { th: 'ไม่เป็นไร', phon: 'mâi pen rai', my: 'ကိစ္စမရှိပါဘူး' },
  { th: 'ยินดีที่ได้รู้จัก', phon: 'yin-dii thîi dâi rúu-jàk', my: 'တွေ့ရတာ ဝမ်းသာပါတယ်' },
];

export const styleNames: Record<string, string> = {
  zoom: 'Zoom Face-to-Face',
  video: 'Recorded Video Class',
  yangon: 'ရန်ကုန် အပြင်သင်တန်း',
  mandalay: 'မန္တလေး အပြင်သင်တန်း',
};

export const tiers = [
  { name: 'Member', rate: 0, icon: '●' },
  { name: 'Silver', rate: 3, icon: '🥈' },
  { name: 'Gold', rate: 5, icon: '🥇' },
  { name: 'Diamond', rate: 8, icon: '💎' },
];

export const initialDocuments: AppDocument[] = [
  {
    id: 'DOC-TMM-01',
    title: 'TMM ထိုင်းစကားပြော အခြေခံ သင်ရိုးညွှန်းတမ်း',
    englishTitle: 'TMM Thai Speaking Beginner Syllabus (Level 1 + 2)',
    category: 'course_materials',
    fileType: 'PDF',
    fileSize: '2.4 MB',
    updatedAt: '2026-10-10',
    courseId: 'speaking',
    pagesCount: 14,
    description: 'Level 1 & 2 သင်ရိုးအပြည့်အစုံ၊ ဝေါဟာရနှင့် နေ့စဉ်သုံးဝါကျတည်ဆောက်ပုံ လမ်းညွှန် PDF ဖိုင်။',
    downloadCount: 384,
    isSystemDoc: true,
    contentPreview: [
      'အခန်း (၁) - မိတ်ဆက်ခြင်းနှင့် နှုတ်ဆက်ခြင်း အသုံးအနှုန်းများ',
      'အခန်း (၂) - ကိန်းဂဏန်း၊ ငွေကြေးနှင့် ဈေးဝယ်စကားပြောများ',
      'အခန်း (၃) - အစားအသောက် မှာယူခြင်းနှင့် စားသောက်ဆိုင်သုံး စကားများ',
      'အခန်း (၄) - အချိန်၊ ရက်စွဲ၊ လမ်းမေးခြင်းနှင့် လမ်းညွှန်ပြသခြင်း',
      'အသံထွက် ကူညီအထောက်အကူပြု မြန်မာအသံထွက် ဇယားများ ပါဝင်သည်။',
    ],
  },
  {
    id: 'DOC-TLS-02',
    title: 'TLS ထိုင်းစာ 4 Skills & Grammar လေ့ကျင့်ခန်းစာရွက်',
    englishTitle: 'TLS 4 Skills Essential Grammar Practice Worksheet 01',
    category: 'worksheets',
    fileType: 'PDF',
    fileSize: '1.8 MB',
    updatedAt: '2026-10-08',
    courseId: 'skills',
    pagesCount: 18,
    description: 'ဗျည်း၊ သရ၊ Tone စနစ်နှင့် လက်တွေ့ဝါကျဖွဲ့စည်းပုံ အိမ်စာ Worksheet ဖိုင်။',
    downloadCount: 512,
    isSystemDoc: true,
    contentPreview: [
      'ထိုင်းအလယ်ဗျည်း၊ အမြင့်ဗျည်း၊ အနိမ့်ဗျည်း ခွဲခြားနည်း လေ့ကျင့်ခန်း',
      'သရတို၊ သရရှည်နှင့် အသတ် ၈ မျိုး ပေါင်းစပ်ရေးသားနည်း',
      'အမေးဝါကျပုံစံများ (မိုင်း၊ အရိုင်၊ ထီနိုင်၊ မဟိုရိုင်)',
      'အိမ်စာပေးပို့ရန် Format နှင့် ဖြေဆိုနည်း လမ်းညွှန်ချက်များ',
    ],
  },
  {
    id: 'DOC-BOOK-03',
    title: 'လက်တွေ့အသုံးချ ထိုင်းဘာသာစကားစာအုပ် (နမူနာဖတ်ရှုရန်)',
    englishTitle: 'Practical Thai Language Sample Chapters (Ch 1 - 2)',
    category: 'course_materials',
    fileType: 'PDF',
    fileSize: '3.6 MB',
    updatedAt: '2026-10-05',
    courseId: 'book',
    pagesCount: 22,
    description: 'မိတ်ဆက်ခြင်းနှင့် နှုတ်ဆက်ခြင်း နမူနာ အခန်း ၂ ခန်းပါဝင်သော Sample E-book ဖိုင်။',
    downloadCount: 790,
    isSystemDoc: true,
    contentPreview: [
      'ထိုင်းအက္ခရာ အခြေခံနှင့် Phonetics အသံထွက် စနစ်',
      'နေ့စဉ်သုံး နှုတ်ဆက်စကားနှင့် ကိုယ်တိုင်မိတ်ဆက်နည်း ဝါကျများ',
      'Telegram အသံဖိုင်နှင့် ချိတ်ဆက်လေ့လာနည်း လမ်းညွှန်',
    ],
  },
  {
    id: 'DOC-FORM-04',
    title: 'THAISAR ကျောင်းသားမှတ်ပုံတင် လျှောက်လွှာဖောင်',
    englishTitle: 'Official Student Registration & Enrollment Form',
    category: 'student_records',
    fileType: 'PDF',
    fileSize: '620 KB',
    updatedAt: '2026-09-28',
    courseId: 'general',
    pagesCount: 2,
    description: 'ကျောင်းသားမှတ်ပုံတင်ခြင်း၊ အတန်းချိန်ရွေးချယ်ခြင်းနှင့် အချက်အလက်ဖြည့်စွက်ဖောင်။',
    downloadCount: 230,
    isSystemDoc: true,
    contentPreview: [
      'ကျောင်းသား ကိုယ်ရေးအချက်အလက် (အမည်၊ ဖုန်း၊ Telegram ID)',
      'တက်ရောက်မည့် သင်တန်းပုံစံ (Zoom / Yangon / Mandalay / Video)',
      'စည်းမျဉ်းစည်းကမ်းများနှင့် အတန်းတက်ရောက်မှု သဘောတူညီချက်',
    ],
  },
  {
    id: 'DOC-CHART-05',
    title: 'ထိုင်းဗျည်း (၄၄) လုံးနှင့် သရ (၃၂) လုံး အမြန်ကြည့်ဇယား',
    englishTitle: 'Thai Consonants & Vowels Master Pronunciation Chart',
    category: 'course_materials',
    fileType: 'PDF',
    fileSize: '1.2 MB',
    updatedAt: '2026-09-20',
    courseId: 'skills',
    pagesCount: 4,
    description: 'အရောင်ခွဲခြားထားသော ဗျည်း ၄၄ လုံးနှင့် သရ ၃၂ လုံး အသံထွက် ဇယားချပ်။',
    downloadCount: 1120,
    isSystemDoc: true,
    contentPreview: [
      'အလယ်ဗျည်း ၉ လုံး၊ အမြင့်ဗျည်း ၁၁ လုံး၊ အနိမ့်ဗျည်း ၂၄ လုံး',
      'သရတို ၁၆ လုံးနှင့် သရရှည် ၁၆ လုံး တွဲဖက်ဇယား',
      'အသံအနိမ့်အမြင့် Tone ၅ မျိုး စည်းမျဉ်း ဇယားကွက်',
    ],
  },
  {
    id: 'DOC-INV-06',
    title: 'THAISAR ငွေလွှဲပြေစာနှင့် ဘောက်ချာ နမူနာ',
    englishTitle: 'THAISAR Official Payment Voucher & Invoice Template',
    category: 'receipts',
    fileType: 'PDF',
    fileSize: '410 KB',
    updatedAt: '2026-10-12',
    courseId: 'general',
    pagesCount: 1,
    description: 'KPay / WavePay နှင့် ဘဏ်လွှဲငွေများအတွက် အတည်ပြုချက် ဘောက်ချာ ပုံစံ။',
    downloadCount: 195,
    isSystemDoc: true,
    contentPreview: [
      'ငွေသွင်းသူ အချက်အလက်နှင့် သွင်းသည့်ရက်စွဲ',
      'သင်တန်းကြေး / စာအုပ်ဖိုး ငွေပမာဏ (MMK)',
      'ငွေလက်ခံသူ THAISAR Official Seal နှင့် အတည်ပြုလက်မှတ်',
    ],
  },
];
