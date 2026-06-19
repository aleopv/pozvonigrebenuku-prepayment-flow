# Pre-payment flow «Позвони Гребенюку»

Самостоятельный web-flow перед оплатой подписки:

1. ввод и проверка международного номера;
2. отправка и проверка четырёхзначного кода;
3. подтверждение привязки номера;
4. юридические документы и обязательные согласия;
5. возврат в `@grebenyuk_call_bot` к оплате.

## Демо

- Полный flow: <https://aleopv.github.io/pozvonigrebenuku-prepayment-flow/>
- Подтверждение номера: <https://aleopv.github.io/pozvonigrebenuku-prepayment-flow/phone-verification/>
- Согласия: <https://aleopv.github.io/pozvonigrebenuku-prepayment-flow/consent-landing/?phone=%2B34624494031&phone_verified=1>

Тестовый номер: `+34624494031`.

Тестовый код: `4031`.

## Интеграция

Конфигурация подтверждения номера находится в
`phone-verification/config.js`:

- `checkPhoneUrl` — проверка доступности номера;
- `requestCodeUrl` — отправка SMS или запуск проверочного звонка;
- `verifyCodeUrl` — серверная проверка кода;
- `consentPageUrl` — следующий шаг;
- `defaultBackUrl` — возврат в основной Telegram-бот;
- `supportUrl` — переход в `@grebenyuk_help_bot`.

Конфигурация согласий находится в `consent-landing/config.js`:

- `submitUrl` — сохранение согласий в БД;
- `defaultReturnUrl` — возврат к экрану оплаты в Telegram;
- `defaultBackUrl` — возврат в основной бот;
- `documents` — URL и версии юридических документов.

Подробные payload и query-параметры описаны в README внутри каждой папки.

## Важно для production

- Проверенный номер и согласия должны фиксироваться на backend.
- Доступ к следующему шагу нельзя подтверждать только клиентскими параметрами.
- Тестовые коды из `phone-verification/config.js` нужно удалить после подключения API.
- Backend должен связывать номер и согласия с Telegram user/session ID.
