# Страница документов и согласий

Самостоятельная статическая страница для шага перед оплатой в Telegram-боте.

Основной Telegram-бот: `@grebenyuk_call_bot`. Бот поддержки: `@grebenyuk_help_bot`.

## Локальный запуск

Из корня проекта:

```powershell
npx --yes http-server -p 4173 -a 127.0.0.1 -c-1 .
```

Открыть:

```text
http://localhost:4173/consent-landing/
```

## Настройка

Все переменные находятся в `config.js`:

- `price` — цена и период подписки в интерфейсе;
- `submitUrl` — backend endpoint для фиксации согласий;
- `defaultReturnUrl` — deep link возврата в Telegram-бот на состояние `payment_ready`;
- `defaultBackUrl` — deep link кнопки «Назад» на стартовый экран Telegram-бота;
- `documents` — ссылки и версии юридических документов.

Страница также принимает query-параметры:

- `session_id` — идентификатор сессии оформления;
- `user_id` — внутренний идентификатор пользователя;
- `return_to` — ссылка возврата после успешной фиксации согласий;
- `back_to` — ссылка возврата по кнопке «Назад»; обычно ведёт на стартовый экран бота;
- `telegram_webapp=1` — отправить результат через Telegram WebApp `sendData` и закрыть окно.

Пример:

```text
https://consent.example.ru/?session_id=abc123&return_to=https%3A%2F%2Ft.me%2Fyour_bot%3Fstart%3Dpayment_ready
```

## Контракт backend

При заполненном `submitUrl` страница отправляет `POST application/json`:

```json
{
  "type": "consent_accepted",
  "nextStep": "payment_ready",
  "sessionId": "abc123",
  "userId": "42",
  "phone": "+79991234567",
  "phoneVerified": true,
  "acceptedAt": "2026-06-18T12:00:00.000Z",
  "documents": {
    "offer": "2026-06-18"
  },
  "consents": {
    "offer": true,
    "personalData": true,
    "recording": true,
    "aiProcessing": true,
    "recurringPayment": true,
    "marketing": false
  }
}
```

Endpoint может вернуть JSON с полем `returnUrl`. Оно имеет приоритет над `return_to`.

До подключения backend страница работает в демонстрационном режиме: сохраняет результат в `localStorage` и возвращает пользователя в бот.

## Следующий экран в Telegram-боте

После события `consent_accepted` с `nextStep: "payment_ready"` бот должен показать:

```text
Всё отлично! Мы готовы перейти к оплате.
```

И inline-кнопку:

```text
Перейти к оплате
```

Кнопка запускает следующий, уже платёжный шаг. Для production предпочтительно, чтобы backend возвращал подписанный `returnUrl` с идентификатором сессии, а бот перед показом кнопки дополнительно проверял сохранённые обязательные согласия.

## Вынос в отдельный репозиторий

Папка полностью автономна. Для отдельного репозитория достаточно перенести её содержимое в корень нового репозитория и задеплоить как обычный static site (Cloudflare Pages, Netlify, Vercel, GitHub Pages или собственный сервер).
