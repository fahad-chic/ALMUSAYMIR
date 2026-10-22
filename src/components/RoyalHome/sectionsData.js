// src/components/RoyalHome/sectionsData.js
// بيانات الأقسام والفروع — متجر المسيمير | ALMUSAYMIR
// متجر شامل: كل قسم له فروع، وكل فرع مرتبط بـ catalogId.
// لإضافة قسم/فرع جديد: أضف عنصراً هنا فقط — صفحة /catalog/:catalogId ديناميكية
// وتعمل فوراً، ويظهر الاسم تلقائياً في القوائم وفي عناوين الصفحات.

export const ROYAL_SECTIONS = [
  {
    id: 'electronics',
    title: 'إلكترونيات',
    icon: 'electronics',
    color: 'var(--rz-primary)',
    branches: [
      { id: 'electronics-tv', name: 'شاشات وتلفزيونات', catalogId: 'tv-screens' },
      { id: 'electronics-audio', name: 'سماعات وصوتيات', catalogId: 'audio' },
      { id: 'electronics-computers', name: 'كمبيوتر ولابتوب', catalogId: 'computers' },
      { id: 'electronics-tablets', name: 'أجهزة لوحية', catalogId: 'tablets' },
      { id: 'electronics-cameras', name: 'كاميرات وتصوير', catalogId: 'cameras' },
      { id: 'electronics-gaming', name: 'ألعاب ومنصات', catalogId: 'gaming' },
    ],
  },
  {
    id: 'mobiles',
    title: 'جوالات وإكسسوارات',
    icon: 'mobiles',
    color: 'var(--rz-primary)',
    branches: [
      { id: 'mobiles-phones', name: 'جوالات', catalogId: 'smartphones' },
      { id: 'mobiles-covers', name: 'أغطية وحمايات', catalogId: 'phone-covers' },
      { id: 'mobiles-chargers', name: 'شواحن وكابلات', catalogId: 'chargers' },
      { id: 'mobiles-powerbanks', name: 'بطاريات متنقلة', catalogId: 'powerbanks' },
      { id: 'mobiles-wearables', name: 'ساعات ذكية', catalogId: 'smartwatches' },
      { id: 'mobiles-accessories', name: 'إكسسوارات متنوعة', catalogId: 'phone-accessories' },
    ],
  },
  {
    id: 'home-appliances',
    title: 'أجهزة منزلية',
    icon: 'appliances',
    color: 'var(--rz-primary)',
    branches: [
      { id: 'appliances-kitchen', name: 'أجهزة مطبخ', catalogId: 'kitchen-appliances' },
      { id: 'appliances-cooling', name: 'ثلاجات ومكيفات', catalogId: 'cooling' },
      { id: 'appliances-laundry', name: 'غسالات ونشافات', catalogId: 'laundry' },
      { id: 'appliances-small', name: 'أجهزة صغيرة', catalogId: 'small-appliances' },
    ],
  },
  {
    id: 'fashion',
    title: 'أزياء وموضة',
    icon: 'fashion',
    color: 'var(--rz-primary)',
    branches: [
      { id: 'fashion-women', name: 'أزياء نسائية', catalogId: 'women-fashion' },
      { id: 'fashion-men', name: 'أزياء رجالية', catalogId: 'men-fashion' },
      { id: 'fashion-abayas', name: 'عبايات', catalogId: 'abayas' },
      { id: 'fashion-bags', name: 'حقائب وشنط', catalogId: 'bags' },
      { id: 'fashion-shoes', name: 'أحذية', catalogId: 'shoes' },
      { id: 'fashion-watches', name: 'ساعات وإكسسوارات', catalogId: 'watches' },
    ],
  },
  {
    id: 'kids',
    title: 'أطفال',
    icon: 'kids',
    color: 'var(--rz-primary)',
    branches: [
      { id: 'kids-clothing', name: 'ملابس أطفال', catalogId: 'kids-clothing' },
      { id: 'kids-toys', name: 'ألعاب', catalogId: 'toys' },
      { id: 'kids-strollers', name: 'عربات ومقاعد', catalogId: 'strollers' },
      { id: 'kids-school', name: 'مستلزمات مدرسية', catalogId: 'school-supplies' },
      { id: 'kids-care', name: 'عناية بالطفل', catalogId: 'baby-care' },
    ],
  },
  {
    id: 'beauty',
    title: 'جمال وعناية',
    icon: 'beauty',
    color: 'var(--rz-primary)',
    branches: [
      { id: 'beauty-perfumes', name: 'عطور وبخور', catalogId: 'perfumes' },
      { id: 'beauty-makeup', name: 'مكياج', catalogId: 'makeup' },
      { id: 'beauty-skincare', name: 'عناية بالبشرة', catalogId: 'skincare' },
      { id: 'beauty-haircare', name: 'عناية بالشعر', catalogId: 'haircare' },
      { id: 'beauty-tools', name: 'أدوات تجميل', catalogId: 'beauty-tools' },
    ],
  },
  {
    id: 'sports',
    title: 'رياضة',
    icon: 'sports',
    color: 'var(--rz-primary)',
    branches: [
      { id: 'sports-fitness', name: 'أجهزة لياقة', catalogId: 'fitness' },
      { id: 'sports-outdoor', name: 'رحلات وتخييم', catalogId: 'outdoor' },
      { id: 'sports-clothing', name: 'ملابس رياضية', catalogId: 'sportswear' },
      { id: 'sports-ball', name: 'كرات وأدوات', catalogId: 'ball-sports' },
      { id: 'sports-bikes', name: 'دراجات وسكوتر', catalogId: 'bikes' },
    ],
  },
  {
    id: 'cars',
    title: 'سيارات وإكسسوارات',
    icon: 'cars',
    color: 'var(--rz-primary)',
    branches: [
      { id: 'cars-accessories', name: 'إكسسوارات سيارات', catalogId: 'car-accessories' },
      { id: 'cars-audio', name: 'صوتيات وملاحة', catalogId: 'car-audio' },
      { id: 'cars-care', name: 'عناية وتلميع', catalogId: 'car-care' },
      { id: 'cars-tools', name: 'عدد وأدوات', catalogId: 'car-tools' },
      { id: 'cars-tires', name: 'إطارات وبطاريات', catalogId: 'tires-batteries' },
    ],
  },
  {
    id: 'home-supplies',
    title: 'مستلزمات منزلية',
    icon: 'home-supplies',
    color: 'var(--rz-primary)',
    branches: [
      { id: 'home-furniture', name: 'أثاث', catalogId: 'furniture' },
      { id: 'home-decor', name: 'ديكور ومفروشات', catalogId: 'home-decor' },
      { id: 'home-kitchenware', name: 'أدوات مطبخ', catalogId: 'kitchenware' },
      { id: 'home-cleaning', name: 'تنظيف وترتيب', catalogId: 'cleaning' },
      { id: 'home-garden', name: 'حدائق وزراعة', catalogId: 'garden' },
    ],
  },
  {
    id: 'services',
    title: 'خدمات',
    icon: 'services',
    color: 'var(--rz-primary)',
    branches: [
      { id: 'services-maintenance', name: 'صيانة وإصلاح', catalogId: 'maintenance' },
      { id: 'services-design', name: 'تصميم وتطوير', catalogId: 'design-services' },
      { id: 'services-delivery', name: 'توصيل ونقل', catalogId: 'delivery' },
      { id: 'services-events', name: 'مناسبات وضيافة', catalogId: 'events' },
      { id: 'services-education', name: 'تعليم وتدريب', catalogId: 'education' },
    ],
  },
  {
    id: 'others',
    title: 'متنوعات',
    icon: 'others',
    color: 'var(--rz-primary)',
    branches: [
      { id: 'others-books', name: 'كتب وقرطاسية', catalogId: 'books' },
      { id: 'others-pets', name: 'مستلزمات الحيوانات', catalogId: 'pets' },
      { id: 'others-tools', name: 'عدد ومعدات', catalogId: 'tools' },
      { id: 'others-gifts', name: 'هدايا وتحف', catalogId: 'gifts' },
      { id: 'others-misc', name: 'أخرى', catalogId: 'misc' },
    ],
  },
  {
    id: 'haraj',
    title: 'موقع حراج',
    icon: 'store',
    color: 'var(--rz-primary)',
    isAction: true,
    actionPath: '/haraj',
  },
];

export const MARQUEE_BANNERS = [
  {
    id: 1,
    text: 'أهلاً بكم في متجر المسيمير | ALMUSAYMIR — كل ما تحتاجه في مكان واحد، جودة وثقة وأسعار منافسة',
    bgColor: 'linear-gradient(135deg, var(--rz-primary), var(--rz-primary))',
  },
];

export const MARQUEE_BANNERS_2 = [
  {
    id: 1,
    text: 'سوق حراج المسيمير — انشر إعلانك مجاناً ووصّل بضاعتك لآلاف الزوار يومياً',
    bgColor: 'linear-gradient(135deg, var(--rz-primary), var(--rz-ink))',
  },
];

export const HARAJ_BANNERS = [
  {
    id: 1,
    text: 'سوق حراج المسيمير — بضاعتك تصل لآلاف الزوار يومياً، انشر إعلانك الآن',
    bgColor: 'linear-gradient(135deg, var(--rz-primary), var(--rz-primary))',
  },
  {
    id: 2,
    text: 'نسبة الموقع موثقة وواضحة: 2% للجديد و1% للمستعمل — لا رسوم خفية',
    bgColor: 'linear-gradient(135deg, var(--rz-ink), var(--rz-ink))',
  },
];

export const ROYAL_KINGS = [
  {
    name: 'الملك عبدالعزيز',
    title: 'رحمه الله',
    image: 'royal-founder',
    description: 'المؤسس الأول للمملكة العربية السعودية',
  },
  {
    name: 'الملك سلمان',
    title: 'حفظه الله',
    image: 'royal-king',
    description: 'خادم الحرمين الشريفين',
  },
  {
    name: 'ولي العهد',
    title: 'محمد بن سلمان',
    image: 'royal-crown-prince',
    description: 'رؤية 2030 — نحو مستقبل مشرق',
  },
];

export const PREDEFINED_COMMENTS = [
  'المسيمير | ALMUSAYMIR أفضل متجر إلكتروني!',
  'خدمة ممتازة وتوصيل سريع',
  'منتجات أصلية وجودة رائعة',
  'أسعار تنافسية وجودة عالية',
  'تجربة تسوق ممتعة جداً',
  'أسعار منافسة وخدمة سريعة',
  'تنوع كبير في الأقسام',
  'الذكاء الاصطناعي مفيد جداً',
  'تنوع رائع في المنتجات',
  'تغليف راقي وتوصيل آمن',
  'فريق عمل محترف ومتعاون',
  'أحجام دقيقة ومقاسات صحيحة',
  'ألوان ثابتة حتى بعد الغسيل',
  'تصاميم عصرية تناسب جميع الأذواق',
  'أسرع متجر أتسوق منه',
  'خصومات مميزة في المناسبات',
  'مساعدة في اختيار المقاس ممتازة',
  'إرجاع سهل بدون تعقيد',
  'أقارن الأسعار دائماً وأنتم الأرخص',
  'تحديثات الطلب دقيقة ومفصلة',
  'هديتي وصلت في وقتها',
  'ورقيات عالية الجودة',
  'خدمة VIP للعملاء المميزين',
  'تسوق آمن ومعلومات محمية',
  'أنصح الجميع بالتسوق من هنا',
  'منتجات أصلية بأسعار ممتازة',
  'دائماً أجد ما أبحث عنه',
  'تجربة ملكية راقية ومميزة',
  'شكراً على حسن الاستقبال',
  'متجر يستحق الثقة 100%',
];

export const CATALOG_ITEMS = {};