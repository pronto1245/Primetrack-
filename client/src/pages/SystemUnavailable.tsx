import { useEffect, useState } from "react";

const translations: Record<string, { title: string; message: string }> = {
  en: {
    title: "Page Unavailable",
    message: "This page is temporarily unavailable. Please try again later."
  },
  es: {
    title: "Página no disponible",
    message: "Este sitio no está disponible en este momento. Por favor, inténtelo más tarde."
  },
  pt: {
    title: "Página indisponível", 
    message: "Este site não está disponível no momento. Por favor, tente novamente mais tarde."
  },
  de: {
    title: "Seite nicht verfügbar",
    message: "Diese Seite ist vorübergehend nicht verfügbar. Bitte versuchen Sie es später erneut."
  },
  ru: {
    title: "Страница недоступна",
    message: "Эта страница временно недоступна. Пожалуйста, попробуйте позже."
  },
  fr: {
    title: "Page indisponible",
    message: "Cette page est temporairement indisponible. Veuillez réessayer plus tard."
  },
  it: {
    title: "Pagina non disponibile",
    message: "Questa pagina è temporaneamente non disponibile. Si prega di riprovare più tardi."
  },
  pl: {
    title: "Strona niedostępna",
    message: "Ta strona jest tymczasowo niedostępna. Proszę spróbować ponownie później."
  },
  tr: {
    title: "Sayfa Kullanılamıyor",
    message: "Bu sayfa geçici olarak kullanılamıyor. Lütfen daha sonra tekrar deneyin."
  },
  ja: {
    title: "ページは利用できません",
    message: "このページは一時的に利用できません。後でもう一度お試しください。"
  },
  ko: {
    title: "페이지를 사용할 수 없습니다",
    message: "이 페이지는 일시적으로 사용할 수 없습니다. 나중에 다시 시도해 주세요."
  },
  zh: {
    title: "页面不可用",
    message: "此页面暂时不可用。请稍后再试。"
  },
  ar: {
    title: "الصفحة غير متاحة",
    message: "هذه الصفحة غير متاحة مؤقتاً. يرجى المحاولة مرة أخرى لاحقاً."
  },
  hi: {
    title: "पृष्ठ उपलब्ध नहीं है",
    message: "यह पृष्ठ अस्थायी रूप से अनुपलब्ध है। कृपया बाद में पुनः प्रयास करें।"
  },
  th: {
    title: "หน้าไม่พร้อมใช้งาน",
    message: "หน้านี้ไม่สามารถใช้งานได้ชั่วคราว โปรดลองอีกครั้งในภายหลัง"
  },
  vi: {
    title: "Trang không khả dụng",
    message: "Trang này tạm thời không khả dụng. Vui lòng thử lại sau."
  },
  id: {
    title: "Halaman Tidak Tersedia",
    message: "Halaman ini sementara tidak tersedia. Silakan coba lagi nanti."
  },
  nl: {
    title: "Pagina niet beschikbaar",
    message: "Deze pagina is tijdelijk niet beschikbaar. Probeer het later opnieuw."
  },
  sv: {
    title: "Sidan är inte tillgänglig",
    message: "Denna sida är tillfälligt otillgänglig. Försök igen senare."
  },
  uk: {
    title: "Сторінка недоступна",
    message: "Ця сторінка тимчасово недоступна. Будь ласка, спробуйте пізніше."
  }
};

export default function SystemUnavailable() {
  const [content, setContent] = useState(translations.en);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const lang = params.get("lang")?.toLowerCase() || "en";
    setContent(translations[lang] || translations.en);
  }, []);

  return (
    <div 
      data-testid="system-unavailable-page"
      className="min-h-screen bg-white flex items-center justify-center"
      style={{ fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif" }}
    >
      <div className="text-center px-6 max-w-md">
        <h1 
          data-testid="system-unavailable-title"
          className="text-xl font-medium text-gray-700 mb-4"
        >
          {content.title}
        </h1>
        <p 
          data-testid="system-unavailable-message"
          className="text-gray-500 text-base leading-relaxed"
        >
          {content.message}
        </p>
      </div>
    </div>
  );
}
