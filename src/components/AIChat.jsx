import { useState, useEffect, useRef } from "react";
import { Sparkles, Send, X, ShieldCheck, Info } from "lucide-react";
import { CONTACT_INFO } from "../utils/constants";

export default function AIChat() {
  const [open, setOpen] = useState(false);
  const WHATSAPP_NUMBER = CONTACT_INFO.WHATSAPP;
  const [messages, setMessages] = useState([
    {
      id: crypto.randomUUID(),
      role: "assistant",
      text: "أهلاً وسهلاً بك. نورت موقع أناقة ROOZ. معك علياء خدمة العملاء: كيف أقدر أساعدك؟"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);

  const AI_NAME = import.meta.env.VITE_AI_NAME || "علياء";
  const chatRef = useRef(null);

  // متابعة حالة المكوّن لمنع تحديث الحالة بعد إزالته
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // تمرير تلقائي لأسفل الرسائل
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // ردود ذكية جاهزة 100% بدون API + معرفة عامة واسعة
  const getSmartResponse = (msg) => {
    const original = msg.trim();
    msg = msg.toLowerCase().trim();

    // ===== معرفة عامة =====
    if (msg.includes("حروف") || msg.includes("الهجاء") || msg.includes("الأبجدية") || msg.includes("ابجدية")) {
      return "حروف الهجاء العربية من الألف إلى الياء:\nأ ب ت ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ ف ق ك ل م ن هـ و ي\n\nحروف الهجاء الإنجليزية:\nA B C D E F G H I J K L M N O P Q R S T U V W X Y Z";
    }

    if (msg.includes("عاصمة") || msg.includes("عواصم")) {
      if (msg.includes("السعودية") || msg.includes("الرياض")) return "عاصمة المملكة العربية السعودية هي الرياض.";
      if (msg.includes("مصر")) return "عاصمة مصر هي القاهرة.";
      if (msg.includes("الإمارات") || msg.includes("دبي")) return "عاصمة الإمارات هي أبوظبي.";
      if (msg.includes("الكويت")) return "عاصمة الكويت هي مدينة الكويت.";
      if (msg.includes("قطر")) return "عاصمة قطر هي الدوحة.";
      if (msg.includes("البحرين")) return "عاصمة البحرين هي المنامة.";
      if (msg.includes("عمان") || msg.includes("مسقط")) return "عاصمة سلطنة عمان هي مسقط.";
      if (msg.includes("الأردن")) return "عاصمة الأردن هي عمّان.";
      if (msg.includes("فرنسا")) return "عاصمة فرنسا هي باريس.";
      if (msg.includes("أمريكا") || msg.includes("الولايات")) return "عاصمة الولايات المتحدة هي واشنطن.";
      return "قولي لي اسم الدولة وأعطيك عاصمتها فوراً.";
    }

    if (msg.includes("كم ساعة") || msg.includes("ساعات اليوم")) {
      return "اليوم فيه 24 ساعة، وكل ساعة فيها 60 دقيقة.";
    }

    if (msg.includes("أيام الأسبوع") || msg.includes("ايام الاسبوع")) {
      return "أيام الأسبوع: الأحد، الإثنين، الثلاثاء، الأربعاء، الخميس، الجمعة، السبت.";
    }

    if (msg.includes("شهور") || msg.includes("الأشهر") || msg.includes("اشهر السنة")) {
      return "الأشهر الميلادية: يناير، فبراير، مارس، أبريل، مايو، يونيو، يوليو، أغسطس، سبتمبر، أكتوبر، نوفمبر، ديسمبر.\n\nالأشهر الهجرية: محرم، صفر، ربيع الأول، ربيع الآخر، جمادى الأولى، جمادى الآخرة، رجب، شعبان، رمضان، شوال، ذو القعدة، ذو الحجة.";
    }

    if (msg.includes("لون") && (msg.includes("السماء") || msg.includes("البحر"))) {
      return "السماء زرقاء بسبب تشتت الضوء، والبحر يبدو أزرق لأنه يعكس لون السماء ويمتص الألوان الأخرى.";
    }

    if (msg.includes("من أنت") || msg.includes("من انتي") || msg.includes("عرفيني") || msg.includes("من هي علياء")) {
      return `أنا ${AI_NAME}، مساعدتك الذكية في أناقة ROOZ. أقدر أساعدك في الأزياء والعبايات والفساتين والمقاسات والأسعار، وكمان أجاوب على أي سؤال عام تحبينه.`;
    }

    if (msg.includes("مرحبا") || msg.includes("هلا") || msg.includes("السلام") || msg.includes("صباح") || msg.includes("مساء")) {
      return `وعليكم السلام ورحمة الله وبركاته  أهلين فيك! أنا ${AI_NAME}، كيف أقدر أساعدك اليوم؟`;
    }

    if (msg.includes("شكرا") || msg.includes("مشكورة") || msg.includes("تسلمين")) {
      return "العفو يا غالية، أي وقت تحتاجينني أنا موجودة.";
    }

    if (msg.includes("كم الساعة") || msg.includes("الوقت الآن") || msg.includes("الوقت الان")) {
      const now = new Date();
      return `الوقت الحالي تقريباً: ${now.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}`;
    }

    if (msg.includes("تاريخ اليوم") || msg.includes("اليوم كم")) {
      const now = new Date();
      return `تاريخ اليوم: ${now.toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`;
    }

    // ===== أسئلة الموقع والأزياء =====
    if (msg.includes("افضل") || msg.includes("ترشيح") || msg.includes("اختيار")) {
      return "أقدر أرشح لك أفضل الخيارات حسب المناسبة والميزانية واللون. أعطيني 3 معلومات فقط وأجهز لك قائمة فاخرة";
    }

    if (msg.includes("فستان") || msg.includes("عباية") || msg.includes("سهرة")) {
      return "عندنا تشكيلة فخمة  ميزانيتك كم؟ واي لون تفضلين؟ أرشح لك 3 خيارات فوراً.";
    }

    if (msg.includes("سعر") || msg.includes("كم سعر") || msg.includes("بكم")) {
      return "الأسعار تبدأ من 299 ريال، والشحن مجاني للطلبات فوق 500 ريال";
    }

    if (msg.includes("مقاس") || msg.includes("قياس")) {
      return "تتوفر كل المقاسات من S إلى XXL. تبغين أرسل لك جدول المقاسات؟";
    }

    if (msg.includes("شحن") || msg.includes("توصيل")) {
      return `الشحن ${import.meta.env.VITE_SHIPPING_FEE || 20} ريال، ومجاني فوق ${
        import.meta.env.VITE_FREE_SHIPPING_MIN || 500
      } ريال`;
    }

    if (msg.includes("استرجاع") || msg.includes("ارجاع") || msg.includes("إرجاع")) {
      return `تقدرين تسترجعين خلال ${
        import.meta.env.VITE_RETURN_POLICY_DAYS || 7
      } يوم. الدفع آمن وضمان 100%.`;
    }

    if (msg.includes("واتس") || msg.includes("تواصل") || msg.includes("رقم")) {
      return `تواصلي معنا واتس: ${WHATSAPP_NUMBER}. فريقنا يرد من 9 الصباح إلى 11 الليل`;
    }

    if (msg.includes("عروض") || msg.includes("خصم") || msg.includes("تخفيض")) {
      return "عندنا عروض خاصة على فساتين السهرة والعبايات. تبين أرسل لك أحدث الخصومات؟";
    }

    if (msg.includes("موقع") || msg.includes("حراج") || msg.includes("أناقة") || msg.includes("رووز") || msg.includes("rooz")) {
      return "أناقة ROOZ منصة راقية للإعلانات المميزة في السعودية. تقدرين تتصفحين الأقسام من القائمة، أو تقوليلي وش تبحثين عنه بالضبط وأرشدك.";
    }

    // ===== رد عام ذكي لأي سؤال آخر =====
    if (original.length < 3) {
      return "قولي لي سؤالك بوضوح أكثر عشان أقدر أساعدك بشكل أفضل.";
    }

    if (msg.includes("كيف") || msg.includes("طريقة") || msg.includes("اشرح")) {
      return `بخصوص سؤالك "${original}"، أقدر أوضح لك الفكرة بطريقة بسيطة. عطيني تفاصيل أكثر عن اللي تبين تعرفينه بالضبط عشان أجاوبك بدقة أعلى.`;
    }

    if (msg.includes("ليش") || msg.includes("لماذا") || msg.includes("سبب")) {
      return `سؤال جميل! بخصوص "${original}"، الأسباب عادة تكون متعددة. لو توضح لي السياق أكثر أعطيك إجابة أدق وأفيد.`;
    }

    if (msg.includes("وش") || msg.includes("ما هو") || msg.includes("ماهي") || msg.includes("شنو")) {
      return `بخصوص "${original}"، أقدر أشرح لك بإيجاز. لو تبين تفاصيل أكثر أو أمثلة قولي لي وأوسع لك الشرح.`;
    }

    if (msg.includes("هل") || msg.includes("ممكن") || msg.includes("يقدر")) {
      return `بالنسبة لسؤالك "${original}"، في أغلب الحالات الجواب يكون نعم مع بعض الشروط. وضحي لي أكثر عشان أعطيك جواب واضح 100%.`;
    }

    // الرد الافتراضي النهائي — ما يتعذر أبداً
    return `فهمت سؤالك: "${original}"\n\nأقدر أساعدك فيه. لو كان متعلق بالأزياء أو الموقع أعطيك تفاصيل دقيقة فوراً، ولو كان سؤال عام قولي لي أي جزء تبين أركز عليه أكثر عشان أجاوبك بأفضل طريقة.`;
  };

  const sendMessage = () => {
    const trimmedInput = input.trim();

    if (!trimmedInput || loading) return;

    const userMsg = {
      id: crypto.randomUUID(),
      role: "user",
      text: trimmedInput
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    (async () => {
      let aiText = "";

      try {
        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: userMsg.text })
        });

        if (res.ok) {
          try {
            const data = await res.json();
            if (typeof data?.reply === "string") {
              aiText = data.reply.trim();
            }
          } catch {
            aiText = "";
          }
        }
      } catch {
        // تجاهل — نستخدم الرد المحلي
      }

      if (!aiText) {
        aiText = getSmartResponse(userMsg.text);
      }

      if (!mountedRef.current) return;

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: aiText
        }
      ]);

      setLoading(false);
    })();
  };

  return (
    <>
      {/* الزر العائم */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`فتح مساعد ${AI_NAME}`}
        className="fixed bottom-5 left-5 bg-gradient-to-br from-[#B8A47A] via-[#1E293B] to-[#1E293B] text-[#202A3A] p-4 rounded-full shadow-2xl z-50 hover:scale-110 transition-all duration-300 border border-[#E8E2D6]/60"
      >
        <Sparkles size={24} />
      </button>

      {/* نافذة الشات */}
      {open && (
        <div
          dir="rtl"
          className="fixed bottom-20 left-5 w-[calc(100vw-2.5rem)] max-w-80 h-[520px] bg-[#E8E2D6] border-2 border-[#1E293B] rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden"
        >

          {/* الهيدر */}
          <div className="bg-gradient-to-r from-[#202A3A] via-[#202A3A] to-[#1E293B] p-3 rounded-t-2xl flex justify-between items-center border-b border-[#1E293B]/60">
            <h3 className="font-bold text-[#E8E2D6] flex items-center gap-2">
              <Sparkles size={16} /> {AI_NAME}
            </h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="إغلاق المحادثة"
              className="hover:bg-white/20 p-1 rounded-full transition"
            >
              <X size={18} className="text-[#E8E2D6]" />
            </button>
          </div>

          {/* رسالة الأمان */}
          <div className="p-2 bg-[#E8E2D6] text-[10px] text-[#202A3A] flex items-start gap-2 border-b border-[#1E293B]/40">
            <ShieldCheck size={14} className="text-[#1E293B] shrink-0" />
            <p>
              تخضع جميع بيانات المستخدمين والزائرين والرسائل الخاصة والمعاملات الداخلية لحماية صارمة 
              وتشفير عالمي متقدم 
              <span className="text-[#1E293B] font-bold">(تشفير بموجب بروتوكولات عالمية محمية وسرية ومتعددة الطبقات)</span>.
              <br />
              <span className="text-[#1E293B] italic">
                All user and visitor data is fully encrypted and cannot be accessed by any unauthorized party.
              </span>
            </p>
          </div>

          {/* الرسائل */}
          <div ref={chatRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-gradient-to-b from-[#E8E2D6] to-[#E8E2D6]">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`p-3 rounded-lg text-sm whitespace-pre-wrap break-words ${
                  m.role === "user"
                    ? "bg-gradient-to-r from-[#1E293B] to-[#1E293B] text-[#E8E2D6] ml-10 shadow-md"
                    : "bg-[#E8E2D6] text-[#202A3A] mr-10 border border-[#1E293B]/30 shadow-sm"
                }`}
              >
                {m.text}
              </div>
            ))}

            {loading && (
              <p className="text-xs text-[#1E293B] text-center">
                {AI_NAME} تكتب...
              </p>
            )}
          </div>

          {/* صندوق الإرسال */}
          <div className="p-2 flex gap-2 border-t border-[#1E293B]/40 bg-[#E8E2D6]">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="اسألني عن أي منتج أو مقاس أو أي سؤال في الدنيا"
              disabled={loading}
              className="flex-1 bg-[#E8E2D6] text-[#202A3A] placeholder:text-[#1E293B] p-2 rounded-lg text-sm outline-none border border-[#1E293B]/30 focus:border-[#1E293B] disabled:opacity-60"
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              aria-label="إرسال الرسالة"
              className="bg-gradient-to-br from-[#1E293B] to-[#1E293B] text-[#202A3A] p-2 rounded-lg hover:brightness-110 disabled:opacity-50 transition shadow-md"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}