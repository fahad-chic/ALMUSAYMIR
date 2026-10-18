import React, { useEffect, useMemo, useRef, useState } from "react";
import OwnerTextEdit from "../OwnerTextEdit";
import useSiteTexts from "../../store/useSiteTexts";
import { Megaphone, ChevronLeft, Sparkles } from "lucide-react";

// الشريط العام (التنبيهات والعروض) — نسخة مدمجة وأنيقة.
// كل شريط يعرض رسالة واحدة فقط، مع المحافظة على جميع الـ props والربط وOwnerTextEdit.
// الألوان: كحلي زمردي للشريط الأول، وبنفسجي مخملي للشريط الثاني.

const MarqueeBanner = ({
  banners = [],
  sticky = false,
  editableKeys = [],
  label = "جديد ROOZ",
  barBg = null,
}) => {
  const siteTexts = useSiteTexts((s) => s.texts);
  const messageWindowRef = useRef(null);
  const messageTextRef = useRef(null);
  const [scrollDistance, setScrollDistance] = useState(0);

  const validBanners = useMemo(() => {
    if (!Array.isArray(banners)) {
      return [];
    }

    return banners
      .map((banner, i) => {
        const key = editableKeys[i];
        const override = key && siteTexts[key];
        return override ? { ...banner, text: override } : banner;
      })
      .filter(
        (banner) =>
          banner &&
          typeof banner.text === "string" &&
          banner.text.trim().length > 0,
      );
  }, [banners, editableKeys, siteTexts]);

  // رسالة واحدة فقط لكل شريط.
  const banner = validBanners[0];

  // يقيس المسافة الفعلية للنص، لذلك لا تتحرك الرسالة القصيرة بلا حاجة.
  // يبقى هذا الـ hook قبل أي return، التزاماً بقواعد React حتى عند تبدل الرسائل.
  useEffect(() => {
    const updateScrollDistance = () => {
      const windowWidth = messageWindowRef.current?.clientWidth || 0;
      const messageWidth = messageTextRef.current?.scrollWidth || 0;
      const nextDistance = Math.max(0, messageWidth - windowWidth);

      setScrollDistance((currentDistance) =>
        Math.abs(currentDistance - nextDistance) > 1
          ? nextDistance
          : currentDistance,
      );
    };

    updateScrollDistance();

    let resizeObserver;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(updateScrollDistance);
      if (messageWindowRef.current) {
        resizeObserver.observe(messageWindowRef.current);
      }
      if (messageTextRef.current) {
        resizeObserver.observe(messageTextRef.current);
      }
    }

    window.addEventListener("resize", updateScrollDistance);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateScrollDistance);
    };
  }, [banner?.text]);

  if (!banner) {
    return null;
  }

  // يظل منطق التمييز الحالي قائماً، لكن بلونين فاخرين بدلاً من الذهبي.
  const isFirstStyle =
    barBg === null || (banner.bgColor && banner.bgColor.includes("a4163f"));

  const palette = isFirstStyle
    ? {
        background:
          "linear-gradient(118deg, var(--rz-ink) 0%, var(--rz-ink) 48%, var(--rz-ink) 100%)",
        border: "rgba(var(--rz-primary-rgb), 0.42)",
        text: "var(--rz-ivory)",
        textShadow: "0 1px 8px rgba(var(--rz-ink-rgb), 0.42)",
        label: "var(--rz-gold)",
        icon: "var(--rz-gold)",
        arrow: "rgba(var(--rz-ivory-rgb), 0.82)",
        separator: "rgba(var(--rz-gold-rgb), 0.30)",
        iconBackground: "rgba(var(--rz-primary-rgb), 0.13)",
        iconBorder: "rgba(var(--rz-cream-4-rgb), 0.26)",
        glow: "rgba(var(--rz-primary-rgb), 0.34)",
      }
    : {
        background:
          "linear-gradient(118deg, var(--rz-ink) 0%, var(--rz-primary) 50%, var(--rz-ink) 100%)",
        border: "rgba(var(--rz-gold-rgb), 0.40)",
        text: "var(--rz-white)",
        textShadow: "0 1px 8px rgba(var(--rz-ink-rgb), 0.44)",
        label: "var(--rz-ivory)",
        icon: "var(--rz-ivory)",
        arrow: "rgba(var(--rz-cream-4-rgb), 0.84)",
        separator: "rgba(var(--rz-cream-4-rgb), 0.30)",
        iconBackground: "rgba(var(--rz-cream-4-rgb), 0.13)",
        iconBorder: "rgba(var(--rz-cream-4-rgb), 0.28)",
        glow: "rgba(var(--rz-primary-rgb), 0.36)",
      };

  const shouldScroll = scrollDistance > 2;

  return (
    <section
      dir="rtl"
      aria-label="آخر التنبيهات والعروض"
      className={`marquee-banner${sticky ? " marquee-banner--sticky" : ""}`}
      style={{
        width: "100%",
        position: sticky ? "sticky" : "relative",
        // مرفوع قليلاً فوق الشريطين الثابتين دون تغطيتهما
        top: sticky ? "calc(var(--rooz-top-offset, 0px) + 48px)" : "auto",
        zIndex: sticky ? 40 : 30,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: "4px",
        padding: "0 12px",
        margin: "0",
        transform: "translateY(-6px)",
        boxSizing: "border-box",
      }}
    >
      <style>{`
        /* === حركة دخول هادئة ولمعة فاخرة === */
        @keyframes roozBadgeEnter {
          0% {
            transform: translateX(18px) translateY(-5px) scale(0.97);
            opacity: 0;
          }
          100% {
            transform: translateX(0) translateY(0) scale(1);
            opacity: 1;
          }
        }

        @keyframes roozBadgePulse {
          0%, 100% {
            box-shadow:
              0 7px 18px rgba(var(--rz-ink-rgb), 0.27),
              0 0 0 1px rgba(var(--rz-white-rgb), 0.035) inset,
              0 0 15px var(--rooz-glow);
          }
          50% {
            box-shadow:
              0 10px 23px rgba(var(--rz-ink-rgb), 0.34),
              0 0 0 1px rgba(var(--rz-white-rgb), 0.055) inset,
              0 0 24px var(--rooz-glow);
          }
        }

        /* الحركة معاكسة للنسخة السابقة: تبدأ من أول الرسالة في اليمين، ثم تتحرك يميناً لإظهار نهايتها. */
        @keyframes roozTextScrollReverse {
          0%, 24% {
            transform: translateX(0);
          }
          68%, 82% {
            transform: translateX(var(--rooz-scroll-distance));
          }
          100% {
            transform: translateX(0);
          }
        }

        @keyframes roozBadgeShine {
          0% {
            transform: translateX(-130%) skewX(-18deg);
          }
          48%, 100% {
            transform: translateX(215%) skewX(-18deg);
          }
        }

        @keyframes roozGradientFlow {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        @keyframes roozIconSparkle {
          0%, 100% {
            transform: scale(0.82) rotate(-8deg);
            opacity: 0.52;
          }
          50% {
            transform: scale(1.12) rotate(8deg);
            opacity: 1;
          }
        }

        .marquee-banner {
          isolation: isolate;
        }

        .rooz-badge {
          animation:
            roozBadgeEnter 0.56s cubic-bezier(0.22, 1, 0.36, 1),
            roozBadgePulse 3.4s ease-in-out infinite 0.56s;
        }

        .rooz-badge-shine {
          animation: roozBadgeShine 4.8s ease-in-out infinite 0.9s;
        }

        .rooz-badge-gradient {
          background-size: 220% 220%;
          animation: roozGradientFlow 10s ease-in-out infinite;
        }

        .rooz-badge-icon-sparkle {
          animation: roozIconSparkle 2.6s ease-in-out infinite;
        }

        .rooz-badge-text-scroll {
          display: inline-block;
          width: max-content;
          will-change: transform;
        }

        .rooz-badge-text-scroll--active {
          animation: roozTextScrollReverse 15s cubic-bezier(0.42, 0, 0.18, 1) infinite;
        }

        /* الشريط أعلى قليلاً مع بقاء عناصر الهيدر الأعلى منه. */
        .marquee-banner--sticky {
          top: calc(var(--rooz-top-offset, 0px) + 51px);
          z-index: 45;
        }

        /* احترام تفضيل تقليل الحركة، مع إبقاء بداية الرسالة ظاهرة. */
        @media (prefers-reduced-motion: reduce) {
          .rooz-badge,
          .rooz-badge-shine,
          .rooz-badge-gradient,
          .rooz-badge-icon-sparkle,
          .rooz-badge-text-scroll--active {
            animation: none !important;
          }
        }

        @media (max-width: 900px) {
          .marquee-banner--sticky {
            top: calc(var(--rooz-top-offset, 0px) + 43px);
          }
        }

        @media (max-width: 640px) {
          .marquee-banner {
            padding: 0 10px !important;
            margin-top: -6px !important;
            transform: translateY(-14px) !important;
          }
          .rooz-badge {
            max-width: 94vw !important;
            padding: 8px 11px !important;
            gap: 7px !important;
            border-radius: 13px !important;
          }
          .rooz-badge-text-scroll {
            font-size: 0.84rem !important;
            font-weight: 950 !important;
          }
          .rooz-badge-label {
            font-size: 0.58rem !important;
          }
        }

        @media (max-width: 380px) {
          .rooz-badge {
            max-width: 96vw !important;
            padding: 7px 9px !important;
            gap: 5px !important;
          }
          .rooz-badge-label,
          .rooz-badge-divider {
            display: none !important;
          }
        }
      `}</style>

      {/* الأيقونة المدمجة — مكبّر حديث مع لمعة فنية، مع الحفاظ على شكل المكبّر نفسه. */}
      <div
        className="rooz-badge"
        style={{
          "--rooz-glow": palette.glow,
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          maxWidth: "min(500px, 100%)",
          width: "min(500px, 100%)",
          padding: "9px 14px",
          borderRadius: "16px",
          background: palette.background,
          border: `1px solid ${palette.border}`,
          overflow: "hidden",
          position: "relative",
          backdropFilter: "blur(10px)",
        }}
      >
        {/* لمعان ناعم داخل الحافة */}
        <div
          aria-hidden="true"
          className="rooz-badge-shine"
          style={{
            position: "absolute",
            top: "-35%",
            bottom: "-35%",
            width: "28%",
            background:
              "linear-gradient(90deg, transparent, rgba(var(--rz-white-rgb), 0.16), transparent)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        {/* طبقة تدرج متحرك بطيء تضيف عمقاً بصرياً دون التأثير على وضوح المحتوى. */}
        <div
          aria-hidden="true"
          className="rooz-badge-gradient"
          style={{
            position: "absolute",
            inset: 0,
            background: isFirstStyle
              ? "linear-gradient(115deg, rgba(var(--rz-ink-rgb), 0.96), rgba(var(--rz-ink-rgb), 0.94), rgba(var(--rz-ink-rgb), 0.97), rgba(var(--rz-ink-rgb), 0.94))"
              : "linear-gradient(115deg, rgba(var(--rz-ink-rgb), 0.97), rgba(var(--rz-ink-rgb), 0.94), rgba(var(--rz-ink-rgb), 0.97), rgba(var(--rz-primary-rgb), 0.92))",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        {/* أيقونة المكبّر المطوّرة */}
        <span
          aria-hidden="true"
          style={{
            width: 29,
            height: 29,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            position: "relative",
            color: palette.icon,
            background: palette.iconBackground,
            border: `1px solid ${palette.iconBorder}`,
            borderRadius: "10px",
            boxShadow: `0 4px 12px ${palette.glow}`,
            zIndex: 2,
          }}
        >
          <Megaphone size={16} strokeWidth={2.35} />
          <Sparkles
            className="rooz-badge-icon-sparkle"
            size={8}
            strokeWidth={2.5}
            style={{
              position: "absolute",
              top: -4,
              left: -4,
              color: "var(--rz-white)",
              filter: "drop-shadow(0 1px 3px rgba(var(--rz-ink-rgb), 0.35))",
            }}
          />
        </span>

        {/* شارة التصنيف */}
        <span
          className="rooz-badge-label"
          style={{
            fontFamily: "Tajawal, Tajawal, Arial, sans-serif",
            fontSize: "0.62rem",
            fontWeight: 800,
            color: palette.label,
            whiteSpace: "nowrap",
            letterSpacing: "0.15px",
            flexShrink: 0,
            zIndex: 2,
            position: "relative",
          }}
        >
          {label}
        </span>

        {/* فاصل */}
        <span
          aria-hidden="true"
          className="rooz-badge-divider"
          style={{
            width: "1px",
            height: "18px",
            background: palette.separator,
            flexShrink: 0,
            zIndex: 2,
            position: "relative",
          }}
        />

        {/* النص يبدأ من بدايته ويظل ثابتاً إن كان قصيراً، أو يتحرك بالاتجاه المعاكس إن كان طويلاً. */}
        <div
          ref={messageWindowRef}
          title={banner.text.trim()}
          aria-label={banner.text.trim()}
          style={{
            overflow: "hidden",
            whiteSpace: "nowrap",
            minWidth: 0,
            flex: 1,
            direction: "rtl",
            textAlign: "right",
            zIndex: 2,
            position: "relative",
          }}
        >
          <span
            ref={messageTextRef}
            className={`rooz-badge-text-scroll${
              shouldScroll ? " rooz-badge-text-scroll--active" : ""
            }`}
            style={{
              "--rooz-scroll-distance": `${scrollDistance}px`,
              fontFamily: "Tajawal, Tajawal, Arial, sans-serif",
              fontSize: "0.93rem",
              fontWeight: 950,
              color: palette.text,
              textShadow: palette.textShadow,
              whiteSpace: "nowrap",
              letterSpacing: "0.15px",
            }}
          >
            {banner.text.trim()}
          </span>
        </div>

        {/* سهم صغير ينسجم مع اتجاه القراءة */}
        <ChevronLeft
          size={14}
          strokeWidth={2.7}
          aria-hidden="true"
          style={{
            opacity: 0.9,
            flexShrink: 0,
            color: palette.arrow,
            zIndex: 2,
            position: "relative",
          }}
        />

        {/* قلم تعديل المالك — خارج منطقة النص المتحرك كما كان. */}
        {editableKeys[0] && (
          <div
            className="marquee-banner-edit"
            style={{
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              marginLeft: 1,
              zIndex: 3,
              position: "relative",
            }}
          >
            <OwnerTextEdit
              textKey={editableKeys[0]}
              defaultValue={banners[0]?.text || ""}
            />
          </div>
        )}
      </div>
    </section>
  );
};

export default MarqueeBanner;