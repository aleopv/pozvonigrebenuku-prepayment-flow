(() => {
  "use strict";

  const config = window.PHONE_VERIFICATION_CONFIG || {};
  const params = new URLSearchParams(window.location.search);
  const screens = Array.from(document.querySelectorAll("[data-screen]"));
  const indicators = Array.from(document.querySelectorAll("[data-step-indicator]"));
  const phoneForm = document.querySelector("#phone-form");
  const codeForm = document.querySelector("#code-form");
  const phoneInput = document.querySelector("#phone-input");
  const codeInput = document.querySelector("#code-input");
  const phoneSubmitButton = phoneForm?.querySelector('[type="submit"]');
  const codeSubmitButton = codeForm?.querySelector('[type="submit"]');
  const sendCodeButton = document.querySelector("[data-send-code]");
  const phoneError = document.querySelector("#phone-error");
  const codeError = document.querySelector("#code-error");
  const resendButtons = Array.from(document.querySelectorAll("[data-resend-code]"));
  const resendLabels = Array.from(document.querySelectorAll("[data-resend-label]"));
  const errorDialog = document.querySelector("#error-dialog");
  const errorTitle = document.querySelector("[data-error-title]");
  const errorMessage = document.querySelector("[data-error-message]");
  const errorExamples = document.querySelector("[data-error-examples]");
  const errorPrimary = document.querySelector("[data-error-primary]");
  const errorSecondary = document.querySelector("[data-error-secondary]");
  const consentLink = document.querySelector("[data-continue-to-consent]");
  const stepOrder = ["phone", "review", "code", "success"];
  const screenOrder = ["phone", "review", "code", "success"];
  const MAX_PHONE_DIGITS = 15;

  const state = {
    step: "phone",
    phone: "",
    verificationId: "",
    resendTimer: null,
    errorType: "",
    requestingCode: false,
    verifyingCode: false,
    flowVersion: 0
  };

  const safeUrl = (value) => {
    if (!value) return "";

    try {
      const url = new URL(value, window.location.href);
      return ["https:", "http:", "tg:"].includes(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  };

  const backUrl = safeUrl(params.get("back_to"))
    || safeUrl(config.defaultBackUrl)
    || "https://t.me/";

  const supportUrl = safeUrl(config.supportUrl) || "https://t.me/";
  const phoneLibrary = window.libphonenumber;

  const normalizePhone = (value) => {
    const trimmed = value.trim().replace(/^00/, "+");
    const digits = trimmed.replace(/\D/g, "").slice(0, MAX_PHONE_DIGITS);
    return digits ? `+${digits}` : "";
  };

  const parsePhone = (value) => {
    if (!phoneLibrary?.parsePhoneNumberFromString) return null;

    try {
      return phoneLibrary.parsePhoneNumberFromString(value);
    } catch {
      return null;
    }
  };

  const isValidPhone = (value) => {
    if (!/^\+[1-9]\d{6,14}$/.test(value)) return false;
    const parsed = parsePhone(value);
    return parsed?.isValid() === true;
  };

  const formatPhone = (value) => {
    const normalized = normalizePhone(value);
    if (!normalized) return "";

    if (normalized.startsWith("+34")) {
      const national = normalized.slice(3);
      const groups = national.match(/.{1,3}/g) || [];
      return `+34${groups.length ? ` ${groups.join(" ")}` : ""}`;
    }

    const parsed = parsePhone(normalized);
    if (parsed?.isValid()) return parsed.formatInternational();

    if (phoneLibrary?.AsYouType) {
      return new phoneLibrary.AsYouType().input(normalized);
    }

    return normalized;
  };

  const setStep = (step) => {
    if (!screenOrder.includes(step)) return;
    state.step = step;

    screens.forEach((screen) => {
      screen.classList.toggle("is-active", screen.dataset.screen === step);
    });

    const activeIndex = stepOrder.indexOf(step);
    indicators.forEach((indicator, index) => {
      indicator.classList.toggle("is-current", index === activeIndex);
      indicator.classList.toggle("is-complete", index < activeIndex);
    });

    if (step === "phone" && phoneSubmitButton) phoneSubmitButton.disabled = false;
    if (step === "review" && sendCodeButton && !state.requestingCode) sendCodeButton.disabled = false;
    if (step === "code" && codeSubmitButton && !state.verifyingCode) codeSubmitButton.disabled = false;

    window.scrollTo({ top: 0, behavior: "smooth" });
    history.replaceState(null, "", `#${step}`);

    window.setTimeout(() => {
      if (step === "phone") phoneInput?.focus();
      if (step === "code") codeInput?.focus();
    }, 80);
  };

  const updatePhoneOutputs = () => {
    const formatted = formatPhone(state.phone);
    document.querySelectorAll("[data-phone-output]").forEach((element) => {
      element.textContent = formatted;
    });
  };

  const closeError = () => {
    if (errorDialog?.open) errorDialog.close();
    state.errorType = "";
  };

  const showError = (type) => {
    const content = {
      phone_format: {
        title: "Ошибка формата номера",
        message: [
          "Кажется, номер указан в неправильном формате.",
          "Введи, пожалуйста, номер ещё раз в международном формате, начиная с плюса и кода страны."
        ],
        primary: "Ввести номер заново",
        secondary: "",
        examples: true
      },
      phone_in_use: {
        title: "Номер уже используется",
        message: [
          "Этот номер уже есть в системе, поэтому мы не можем привязать его повторно.",
          "Если это твой номер, напиши в службу заботы. Или укажи другой номер."
        ],
        primary: "Ввести другой номер",
        secondary: "",
        examples: false
      },
      code_invalid: {
        title: "Неверный код",
        message: [
          "Код не подошёл. Проверь, пожалуйста, SMS и попробуй ещё раз.",
          "Если сообщение не пришло, запроси новый код или измени номер."
        ],
        primary: "Отправить код заново",
        secondary: "Изменить номер",
        examples: false
      },
      service_error: {
        title: "Не удалось продолжить",
        message: [
          "Сервис подтверждения временно недоступен.",
          "Попробуй ещё раз или напиши в службу заботы."
        ],
        primary: "Попробовать снова",
        secondary: "",
        examples: false
      }
    }[type];

    if (!content || !errorDialog) return;
    state.errorType = type;
    errorTitle.textContent = content.title;
    errorMessage.innerHTML = content.message.map((paragraph) => `<p>${paragraph}</p>`).join("");
    errorPrimary.textContent = content.primary;
    errorSecondary.textContent = content.secondary;
    errorSecondary.hidden = !content.secondary;
    errorExamples.hidden = !content.examples;
    errorDialog.showModal();
    errorPrimary.focus();
  };

  const checkPhoneAvailability = async (phone) => {
    if (!config.checkPhoneUrl) {
      return phone !== normalizePhone(String(config.demoOccupiedPhone || ""));
    }

    const response = await fetch(config.checkPhoneUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone,
        sessionId: params.get("session_id") || "",
        userId: params.get("user_id") || ""
      })
    });

    if (response.status === 409) return false;
    if (!response.ok) {
      throw new Error(`Check phone endpoint returned ${response.status}`);
    }

    const result = await response.json();
    return result.available !== false;
  };

  const requestCode = async () => {
    if (!config.requestCodeUrl) {
      state.verificationId = `demo-${Date.now()}`;
      return;
    }

    const response = await fetch(config.requestCodeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: state.phone,
        sessionId: params.get("session_id") || "",
        userId: params.get("user_id") || ""
      })
    });

    if (!response.ok) {
      const error = new Error(`Request code endpoint returned ${response.status}`);
      error.code = response.status === 409 ? "phone_in_use" : "service_error";
      throw error;
    }

    const result = await response.json();
    state.verificationId = result.verificationId || "";
  };

  const verifyCode = async (code) => {
    if (!config.verifyCodeUrl) {
      const expected = String(
        config.demoCodesByPhone?.[state.phone]
        || config.demoCode
        || "1234"
      );
      return code === expected;
    }

    const response = await fetch(config.verifyCodeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: state.phone,
        code,
        verificationId: state.verificationId,
        sessionId: params.get("session_id") || "",
        userId: params.get("user_id") || ""
      })
    });

    if (!response.ok) {
      return false;
    }

    const result = await response.json();
    return result.verified === true;
  };

  const startResendTimer = () => {
    window.clearInterval(state.resendTimer);
    let seconds = Number(config.resendDelaySeconds || 30);
    resendButtons.forEach((button) => {
      button.disabled = true;
    });
    resendLabels.forEach((label) => {
      label.textContent = `Повторно через ${seconds} сек.`;
    });

    state.resendTimer = window.setInterval(() => {
      seconds -= 1;
      resendLabels.forEach((label) => {
        label.textContent = seconds > 0
          ? `Повторно через ${seconds} сек.`
          : "Отправить код заново";
      });

      if (seconds <= 0) {
        window.clearInterval(state.resendTimer);
        resendButtons.forEach((button) => {
          button.disabled = false;
        });
      }
    }, 1000);
  };

  const unlockResend = () => {
    window.clearInterval(state.resendTimer);
    resendButtons.forEach((button) => {
      button.disabled = false;
    });
    resendLabels.forEach((label) => {
      label.textContent = "Отправить код заново";
    });
  };

  const buildConsentUrl = () => {
    const target = safeUrl(params.get("consent_to"))
      || safeUrl(config.consentPageUrl)
      || new URL("../consent-landing/index.html", window.location.href).href;
    const url = new URL(target, window.location.href);

    ["session_id", "user_id", "return_to"].forEach((key) => {
      const value = params.get(key);
      if (value) url.searchParams.set(key, value);
    });

    url.searchParams.set("phone", state.phone);
    url.searchParams.set("phone_verified", "1");

    const consentBackUrl = params.get("consent_back_to");
    if (consentBackUrl) url.searchParams.set("back_to", consentBackUrl);

    return url.href;
  };

  const updateConsentLink = () => {
    if (consentLink) consentLink.href = buildConsentUrl();
  };

  phoneForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const rawPhone = phoneInput.value.trim();
    const normalized = normalizePhone(rawPhone);

    if (!(rawPhone.startsWith("+") || rawPhone.startsWith("00")) || !isValidPhone(normalized)) {
      phoneInput.setAttribute("aria-invalid", "true");
      showError("phone_format");
      return;
    }

    phoneError.textContent = "";
    phoneInput.removeAttribute("aria-invalid");
    phoneInput.value = formatPhone(normalized);
    phoneSubmitButton.disabled = true;

    try {
      const available = await checkPhoneAvailability(normalized);
      if (!available) {
        showError("phone_in_use");
        return;
      }

      state.phone = normalized;
      updatePhoneOutputs();
      updateConsentLink();
      setStep("review");
    } catch (error) {
      console.error(error);
      showError("service_error");
    } finally {
      phoneSubmitButton.disabled = false;
    }
  });

  phoneInput?.addEventListener("input", () => {
    const rawValue = phoneInput.value.replace(/[^\d+\s()-]/g, "");
    const wasTruncated = rawValue.replace(/\D/g, "").length > MAX_PHONE_DIGITS;
    const normalized = normalizePhone(rawValue);
    phoneInput.value = normalized && (rawValue.trim().startsWith("+") || rawValue.trim().startsWith("00"))
      ? formatPhone(normalized)
      : "+";
    phoneError.textContent = wasTruncated
      ? "В международном номере может быть не больше 15 цифр."
      : "";
    phoneInput.removeAttribute("aria-invalid");
  });

  phoneInput?.addEventListener("focus", () => {
    if (!phoneInput.value.trim()) phoneInput.value = "+";
  });

  phoneInput?.addEventListener("keydown", (event) => {
    const selectionAtStart = phoneInput.selectionStart === 0 && phoneInput.selectionEnd === 0;
    if ((event.key === "Backspace" || event.key === "Delete") && phoneInput.value === "+") {
      event.preventDefault();
    } else if (selectionAtStart && event.key.length === 1) {
      window.setTimeout(() => {
        if (!phoneInput.value.startsWith("+")) phoneInput.value = `+${phoneInput.value.replace(/\D/g, "")}`;
      });
    }
  });

  phoneInput?.addEventListener("blur", () => {
    const normalized = normalizePhone(phoneInput.value);
    phoneInput.value = isValidPhone(normalized) ? formatPhone(normalized) : (normalized ? formatPhone(normalized) : "+");
  });

  document.querySelectorAll("[data-phone-example]").forEach((button) => {
    button.addEventListener("click", () => {
      phoneInput.value = button.dataset.phoneExample;
      phoneInput.focus();
    });
  });

  sendCodeButton?.addEventListener("click", async () => {
    if (state.requestingCode) return;
    const flowVersion = state.flowVersion;
    state.requestingCode = true;
    sendCodeButton.disabled = true;

    try {
      await requestCode();
      if (flowVersion !== state.flowVersion || state.step !== "review") return;
      codeError.textContent = "";
      codeInput.value = "";
      setStep("code");
      startResendTimer();
    } catch (error) {
      console.error(error);
      if (flowVersion !== state.flowVersion) return;
      setStep(error.code === "phone_in_use" ? "phone" : "review");
      showError(error.code === "phone_in_use" ? "phone_in_use" : "service_error");
    } finally {
      state.requestingCode = false;
      sendCodeButton.disabled = false;
    }
  });

  codeInput?.addEventListener("input", () => {
    codeInput.value = codeInput.value.replace(/\D/g, "").slice(0, 4);
    codeError.textContent = "";
    codeInput.removeAttribute("aria-invalid");
  });

  codeForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const code = codeInput.value.trim();

    if (!/^\d{4}$/.test(code)) {
      codeInput.setAttribute("aria-invalid", "true");
      showError("code_invalid");
      return;
    }

    if (state.verifyingCode) return;
    const flowVersion = state.flowVersion;
    state.verifyingCode = true;
    codeSubmitButton.disabled = true;

    try {
      const verified = await verifyCode(code);
      if (flowVersion !== state.flowVersion || state.step !== "code") return;
      if (!verified) {
        unlockResend();
        showError("code_invalid");
        return;
      }

      localStorage.setItem("pg:verified-phone", JSON.stringify({
        phone: state.phone,
        verifiedAt: new Date().toISOString(),
        sessionId: params.get("session_id") || ""
      }));
      updateConsentLink();
      setStep("success");
    } catch (error) {
      console.error(error);
      if (flowVersion !== state.flowVersion) return;
      showError("service_error");
    } finally {
      state.verifyingCode = false;
      codeSubmitButton.disabled = false;
    }
  });

  resendButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      if (button.disabled) return;
      resendButtons.forEach((item) => {
        item.disabled = true;
      });

      try {
        await requestCode();
        codeInput.value = "";
        codeError.textContent = "Новый код отправлен.";
        setStep("code");
        startResendTimer();
      } catch (error) {
        console.error(error);
        codeError.textContent = "Не удалось отправить код повторно.";
        resendButtons.forEach((item) => {
          item.disabled = false;
        });
      }
    });
  });

  document.querySelectorAll("[data-edit-phone]").forEach((button) => {
    button.addEventListener("click", () => {
      state.flowVersion += 1;
      state.requestingCode = false;
      state.verifyingCode = false;
      state.verificationId = "";
      codeInput.value = "";
      codeInput.removeAttribute("aria-invalid");
      codeError.textContent = "";
      unlockResend();
      if (sendCodeButton) sendCodeButton.disabled = false;
      if (codeSubmitButton) codeSubmitButton.disabled = false;
      closeError();
      setStep("phone");
    });
  });

  document.querySelectorAll("[data-error-close]").forEach((button) => {
    button.addEventListener("click", closeError);
  });

  errorDialog?.addEventListener("click", (event) => {
    if (event.target === errorDialog) closeError();
  });

  errorPrimary?.addEventListener("click", async () => {
    const type = state.errorType;
    closeError();

    if (type === "phone_format" || type === "phone_in_use") {
      setStep("phone");
      window.setTimeout(() => {
        phoneInput.focus();
        phoneInput.select();
      }, 100);
      return;
    }

    if (type === "code_invalid") {
      resendButtons.forEach((button) => {
        button.disabled = true;
      });

      try {
        await requestCode();
        codeInput.value = "";
        codeInput.removeAttribute("aria-invalid");
        setStep("code");
        startResendTimer();
      } catch (error) {
        console.error(error);
        unlockResend();
        showError(error.code === "phone_in_use" ? "phone_in_use" : "service_error");
      }
      return;
    }

    if (state.step === "phone") {
      phoneForm.requestSubmit();
    } else if (state.step === "review") {
      document.querySelector("[data-send-code]")?.click();
    } else {
      codeInput.focus();
    }
  });

  errorSecondary?.addEventListener("click", () => {
    closeError();
    state.flowVersion += 1;
    state.requestingCode = false;
    state.verifyingCode = false;
    state.verificationId = "";
    unlockResend();
    if (sendCodeButton) sendCodeButton.disabled = false;
    if (codeSubmitButton) codeSubmitButton.disabled = false;
    setStep("phone");
  });

  document.querySelectorAll("[data-bot-back]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      window.location.assign(backUrl);
    });
  });

  document.querySelectorAll("[data-support-link]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      window.location.assign(supportUrl);
    });
  });

  if (consentLink) {
    updateConsentLink();
    consentLink.addEventListener("click", () => {
      updateConsentLink();
    });
  }

  sessionStorage.removeItem("pg:phone-verification");
  state.phone = "";
  state.verificationId = "";
  codeInput.value = "";
  phoneInput.value = "+";
  updateConsentLink();
  setStep("phone");
})();
