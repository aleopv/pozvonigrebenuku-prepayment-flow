window.CONSENT_PAGE_CONFIG = {
  price: "10 000 ₽",

  // POST endpoint, который сохранит согласия перед переходом к оплате.
  // Оставьте пустым для демонстрационного режима.
  submitUrl: "",

  // Возвращает пользователя в бот на экран «Всё отлично! Мы готовы перейти к оплате».
  // Используется, если в URL страницы не передан параметр ?return_to=...
  defaultReturnUrl: "https://t.me/grebenyuk_call_bot?start=payment_ready",

  // Кнопка «Назад» открывает выбор: изменить номер или вернуться в бот.
  defaultBackUrl: "https://t.me/grebenyuk_call_bot?start=start",

  // Первый шаг повторного подтверждения номера.
  phonePageUrl: "../phone-verification/index.html",

  documents: {
    offer: {
      url: "#",
      version: "replace-with-current-version"
    },
    privacy: {
      url: "#",
      version: "replace-with-current-version"
    },
    personalData: {
      url: "#",
      version: "replace-with-current-version"
    },
    aiConversation: {
      url: "#",
      version: "replace-with-current-version"
    },
    subscription: {
      url: "#",
      version: "replace-with-current-version"
    }
  }
};
