window.PHONE_VERIFICATION_CONFIG = {
  // Backend endpoints. Оставьте пустыми для демонстрационного режима.
  checkPhoneUrl: "",
  requestCodeUrl: "",
  verifyCodeUrl: "",

  // Страница согласий, которая открывается после успешного подтверждения.
  consentPageUrl: "../consent-landing/index.html",

  // «Назад» на первом шаге возвращает в Telegram на экран стоимости подписки.
  defaultBackUrl: "https://t.me/grebenyuk_call_bot?start=subscription_price",

  // Ссылка на службу заботы.
  supportUrl: "https://t.me/grebenyuk_help_bot",

  // Только для локальной демонстрации без backend.
  demoCode: "1234",
  demoCodesByPhone: {
    "+34624494031": "4031"
  },
  demoOccupiedPhone: "+79990000000",
  resendDelaySeconds: 30
};
