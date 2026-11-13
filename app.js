/* HAIDER — نقطة الدخول. تهيّئ الوحدات بترتيب ثابت، وكل قسم معزول: فشل واحد لا يوقف الباقي.
 *
 * الهيكل (التفاصيل في README.md):
 *   js/config.js · js/local-mods.js · js/state.js · js/routes.js
 *   js/lib/       أدوات صغيرة (dom, text, url, bus, scroll, section)
 *   js/data/      supabase.js (العميل) · catalog.js (البيانات)
 *   js/ui/        القائمة، التفاصيل، البحث، المعرض، الحالات، الهيدر
 *   js/features/  بوابة يوتيوب، الجسيمات، الصوت، الثيم، التأثيرات، الإدارة (تُحمَّل عند الحاجة)، وسوم الصفحة
 *
 * التواصل بين الوحدات: import مباشر + ناقل الأحداث js/lib/bus.js.
 * الواجهة العامة الوحيدة المكشوفة للخارج: window.HAIDER (getMods · reload · setCategory · getLogs) للتصحيح/الأدوات الخارجية.
 * window.HAIDER تُعرَّف في آخر الملف عمدًا: boot.js يعدّها علامة على نجاح الإقلاع. */
import { installGlobalErrorHandlers } from './js/lib/global-errors.js';
import { getLogs } from './js/lib/log.js';
import { runSection } from './js/lib/section.js';
import { startSupabase } from './js/data/supabase.js';
import { getMods, reloadMods } from './js/data/catalog.js';
import { setCategory } from './js/state.js';
import { initYoutubeGate } from './js/features/youtube-gate.js';
import { initNavigation } from './js/ui/navigation.js';
import { initDetail } from './js/ui/detail.js';
import { initBrowse } from './js/ui/browse.js';
import { initSearch } from './js/ui/search.js';
import { initStatus } from './js/ui/status.js';
import { initChrome } from './js/ui/chrome.js';
import { initGallery } from './js/ui/gallery.js';
import { initImageFallback } from './js/ui/image-fallback.js';
import { initParticles } from './js/features/particles.js';
import { initAudio } from './js/features/audio.js';
import { initAdminLoader } from './js/features/admin-loader.js';
import { initTheme } from './js/features/theme.js';
import { initCardEffects } from './js/features/card-effects.js';
import { initPageEffects } from './js/features/page-effects.js';
import { initDetailTransition } from './js/features/detail-transition.js';
import { initPageMeta } from './js/features/page-meta.js';

/* أول شيء: شبكة الأمان العامة (أي خطأ غير ملتقط يُسجَّل ويُبلَّغ الزائر بهدوء). */
installGlobalErrorHandlers();

runSection('youtube-gate', initYoutubeGate);
runSection('supabase-bootstrap', startSupabase);

/* أقسام النواة منفصلة: فشل أحدها (مثلًا القائمة) لا يمنع البحث أو التنقل أو التفاصيل من العمل. */
runSection('image-fallback', initImageFallback);
runSection('navigation', initNavigation);
runSection('detail', initDetail);
runSection('browse', initBrowse);
runSection('search', initSearch);

runSection('particles', initParticles);
runSection('loading-status', initStatus);
runSection('audio', initAudio);
runSection('admin', initAdminLoader); /* لوحة الإدارة تُحمَّل عند الحاجة فقط (admin-loader.js) */
runSection('theme', initTheme);
runSection('card-effects', initCardEffects);
runSection('page-effects', initPageEffects);
runSection('detail-transition', initDetailTransition);
runSection('page-chrome', initChrome);
runSection('page-meta', initPageMeta);
runSection('gallery', initGallery);

window.HAIDER = Object.freeze({ getMods, reload: reloadMods, setCategory, getLogs });
