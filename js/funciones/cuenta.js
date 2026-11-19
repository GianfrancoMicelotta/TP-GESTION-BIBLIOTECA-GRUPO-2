(() => {
  "use strict";

  const app = window.LibraryHub;
  const getValidationMessage = (field) => {
    const { validity } = field;
    const label = field.labels?.[0]?.textContent.trim();
    if (validity.customError) return field.validationMessage;
    if (validity.valueMissing) {
      return field.type === "checkbox" || field.type === "radio"
        ? "Seleccioná una opción."
        : `Completá ${label ? `el campo «${label}»` : "este campo"}.`;
    }
    if (validity.typeMismatch && field.type === "email") {
      return "Ingresá un correo electrónico válido, por ejemplo nombre@dominio.com.";
    }
    if (validity.typeMismatch && field.type === "url") {
      return "Ingresá una dirección web válida.";
    }
    if (validity.patternMismatch) {
      if (field.id === "checkout-numero-tarjeta") {
        return "Ingresá entre 13 y 19 dígitos; podés separarlos con espacios.";
      }
      if (field.id === "checkout-vencimiento") {
        return "Usá el formato MM/AA, por ejemplo 08/28.";
      }
      if (field.id === "checkout-codigo-seguridad") {
        return "Ingresá un código de 3 o 4 dígitos.";
      }
      return "Revisá el formato del valor ingresado.";
    }
    if (validity.tooShort) {
      return `Ingresá al menos ${field.minLength} caracteres.`;
    }
    if (validity.tooLong) {
      return `Ingresá como máximo ${field.maxLength} caracteres.`;
    }
    if (validity.rangeUnderflow) {
      return `Ingresá un valor igual o mayor a ${field.min}.`;
    }
    if (validity.rangeOverflow) {
      return `Ingresá un valor igual o menor a ${field.max}.`;
    }
    if (validity.stepMismatch || validity.badInput) {
      return "Ingresá un valor válido.";
    }
    return "Revisá el valor ingresado.";
  };

  app.showValidationMessage = function showValidationMessage(field, message) {
    field.setCustomValidity(message);
    const errorId = `${field.id}-mensaje-validacion`;
    let error = document.getElementById(errorId);
    if (!error) {
      error = document.createElement("p");
      error.id = errorId;
      error.className = "mensaje-validacion";
      error.setAttribute("role", "alert");
      field.insertAdjacentElement("afterend", error);
    }
    error.textContent = message;
    field.setAttribute("aria-invalid", "true");
    const descriptions = new Set((field.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean));
    descriptions.add(errorId);
    field.setAttribute("aria-describedby", [...descriptions].join(" "));
  };

  const clearValidationMessage = (event) => {
    const field = event.target;
    if (typeof field.setCustomValidity !== "function") return;
    field.setCustomValidity("");
    const errorId = `${field.id}-mensaje-validacion`;
    document.getElementById(errorId)?.remove();
    field.removeAttribute("aria-invalid");
    const descriptions = (field.getAttribute("aria-describedby") || "")
      .split(/\s+/)
      .filter((description) => description && description !== errorId);
    if (descriptions.length > 0) field.setAttribute("aria-describedby", descriptions.join(" "));
    else field.removeAttribute("aria-describedby");
  };
  document.addEventListener("input", clearValidationMessage, true);
  document.addEventListener("change", clearValidationMessage, true);
  document.querySelectorAll("form").forEach((form) => {
    form.noValidate = true;
  });
  document.addEventListener("submit", (event) => {
    const form = event.target;
    const invalidField = [...form.elements].find((field) =>
      field.willValidate && field.validity && !field.validity.valid,
    );
    if (!invalidField) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    app.showValidationMessage(invalidField, getValidationMessage(invalidField));
    invalidField.focus();
  }, true);
  const defaultAdmin = {
    name: "Administrador",
    email: "admin@libraryhub.local",
    username: "admin",
    password: "grupo2",
  };
  const passwordIterations = 120000;

  const fingerprintDefaultAdmin = async () => {
    const data = new TextEncoder().encode(`${defaultAdmin.username}:${defaultAdmin.password}`);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  };

  app.hashPassword = async function hashPassword(password, salt = crypto.getRandomValues(new Uint8Array(16))) {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt, iterations: passwordIterations, hash: "SHA-256" },
      key,
      256,
    );
    return {
      salt: [...salt].map((byte) => byte.toString(16).padStart(2, "0")).join(""),
      hash: [...new Uint8Array(bits)].map((byte) => byte.toString(16).padStart(2, "0")).join(""),
    };
  };

  app.initializeAccounts = async function initializeAccounts() {
    const accounts = app.readList(app.storageKeys.accounts, []);
    let defaultAccount = accounts.find((account) => account.isDefaultAdmin);
    if (!defaultAccount && accounts.some((account) => account.role === "admin" && account.hash && account.salt)) return;

    const fingerprint = await fingerprintDefaultAdmin();
    if (defaultAccount && defaultAccount.defaultFingerprint === fingerprint) return;

    if (!defaultAccount) {
      defaultAccount = { role: "admin", isDefaultAdmin: true };
      accounts.push(defaultAccount);
    }

    const duplicate = accounts.find((account) =>
      account !== defaultAccount && account.username?.toLocaleLowerCase() === defaultAdmin.username.toLocaleLowerCase(),
    );
    if (duplicate) {
      app.notify("No se pudo crear el administrador predeterminado: el usuario admin ya está ocupado.");
      return;
    }

    const credentials = await app.hashPassword(defaultAdmin.password);
    Object.assign(defaultAccount, {
      name: defaultAdmin.name,
      email: defaultAdmin.email,
      username: defaultAdmin.username,
      role: "admin",
      isDefaultAdmin: true,
      defaultFingerprint: fingerprint,
      ...credentials,
    });
    app.saveList(app.storageKeys.accounts, accounts);
  };

  app.hasAdmin = function hasAdmin() {
    return app.readList(app.storageKeys.accounts, []).some((account) => account.role === "admin");
  };

  app.guardPage = function guardPage() {
    const file = window.location.pathname.split("/").pop().toLowerCase();
    const protectedPages = ["catalogo.html", "favoritos.html", "carrito.html", "finalizar-compra.html", "mi-cuenta.html", "admin.html"];
    if (!protectedPages.includes(file)) return true;

    const profile = JSON.parse(localStorage.getItem(app.storageKeys.profile) || "null");
    const account = profile && app.readList(app.storageKeys.accounts, []).find((item) =>
      item.username === profile.username && item.role === profile.role && item.hash && item.salt,
    );
    if (!account || (file === "admin.html" && account.role !== "admin")) {
      localStorage.removeItem(app.storageKeys.profile);
      window.location.replace("login.html");
      return false;
    }
    return true;
  };

  app.updateRoleNavigation = function updateRoleNavigation() {
    const profile = JSON.parse(localStorage.getItem(app.storageKeys.profile) || "null");
    const isAdmin = profile?.role === "admin";
    const isAdminPage = window.location.pathname.split("/").pop().toLowerCase() === "admin.html";
    document.querySelectorAll(".selector").forEach((selector) => {
      selector.hidden = !isAdmin;
      selector.querySelector('a[href="admin.html"]')?.classList.toggle("activo", isAdminPage);
      selector.querySelector('a[href="catalogo.html"]')?.classList.toggle("activo", !isAdminPage);
    });
  };

  app.updateAdminRegistration = function updateAdminRegistration() {
    const form = document.querySelector("#form-registro-admin");
    if (!form) return;
    const message = document.querySelector("#admin-ya-creado");
    const firstAdminInfo = document.querySelector("#sin-admin-info");
    const firstAdminNeeded = !app.hasAdmin();
    form.hidden = !firstAdminNeeded;
    if (message) message.hidden = firstAdminNeeded;
    if (firstAdminInfo) firstAdminInfo.hidden = !firstAdminNeeded;
  };

  app.showDefaultCredentials = function showDefaultCredentials() {
    const help = document.querySelector("#credenciales-admin");
    const seededAdmin = app.readList(app.storageKeys.accounts, []).some((account) => account.isDefaultAdmin);
    if (help && seededAdmin) {
      help.textContent = `Administrador predeterminado: usuario ${defaultAdmin.username} / contraseña ${defaultAdmin.password}.`;
    } else if (help) {
      help.hidden = true;
    }
    const firstAdminLink = document.querySelector("#enlace-primer-admin");
    if (firstAdminLink) firstAdminLink.hidden = app.hasAdmin();
    const firstAdminMessage = document.querySelector("#primer-admin-info");
    if (firstAdminMessage) firstAdminMessage.hidden = app.hasAdmin();
  };

  app.renderProfile = function renderProfile() {
    const profile = JSON.parse(localStorage.getItem(app.storageKeys.profile) || "null");
    const details = document.querySelector("#datos-usuario");
    if (!profile || !details || !document.querySelector("#eliminar-cuenta")) return;
    const [firstName = "", ...lastNameParts] = profile.name.trim().split(/\s+/);
    const values = [firstName, lastNameParts.join(" "), profile.username, profile.email, profile.role === "admin" ? "Administrador" : "Usuario"];
    details.querySelectorAll("p").forEach((paragraph, index) => {
      const label = paragraph.querySelector("strong")?.textContent || "";
      paragraph.textContent = "";
      const strong = document.createElement("strong");
      strong.textContent = label;
      paragraph.append(strong, ` ${values[index] || ""}`);
    });
  };

  app.setupForms = function setupForms() {
    document.querySelector("#form-login")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const login = async () => {
        const identifier = document.querySelector("#usuario").value.trim().toLocaleLowerCase();
        const password = document.querySelector("#clave").value;
        const accounts = app.readList(app.storageKeys.accounts, []);
        const account = accounts.find((item) =>
          item.username.toLocaleLowerCase() === identifier || item.email.toLocaleLowerCase() === identifier,
        );
        if (!account || !account.hash || !account.salt) {
          app.notify("Usuario o contraseña incorrectos.");
          return;
        }
        const salt = new Uint8Array(account.salt.match(/.{2}/g).map((byte) => Number.parseInt(byte, 16)));
        const credentials = await app.hashPassword(password, salt);
        if (credentials.hash !== account.hash) {
          app.notify("Usuario o contraseña incorrectos.");
          return;
        }
        const profile = {
          name: account.name,
          email: account.email,
          username: account.username,
          role: account.role,
        };
        localStorage.setItem(app.storageKeys.profile, JSON.stringify(profile));
        window.location.href = account.role === "admin" ? "admin.html" : "catalogo.html";
      };
      login().catch((error) => {
        console.error("No se pudo verificar el inicio de sesión.", error);
        app.notify("No se pudo verificar el inicio de sesión en este navegador.");
      });
    });

    [["#form-registro", "user"], ["#form-registro-admin", "admin"]].forEach(([selector, role]) => {
      const form = document.querySelector(selector);
      if (!form) return;
      document.querySelector("#clave2").addEventListener("input", (event) => {
        event.currentTarget.setCustomValidity("");
      });
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const register = async () => {
          if (role === "admin" && app.hasAdmin()) {
            app.updateAdminRegistration();
            return;
          }
          const name = document.querySelector("#nombre").value.trim();
          const email = document.querySelector("#correo").value.trim();
          const username = document.querySelector("#usuario").value.trim();
          const password = document.querySelector("#clave").value;
          const confirmation = document.querySelector("#clave2").value;
          if (password !== confirmation) {
            app.showValidationMessage(
              document.querySelector("#clave2"),
              "Las contraseñas no coinciden.",
            );
            return;
          }
          document.querySelector("#clave2").setCustomValidity("");

          const accounts = app.readList(app.storageKeys.accounts, []);
          const duplicate = accounts.some((account) =>
            account.username.toLocaleLowerCase() === username.toLocaleLowerCase()
            || account.email.toLocaleLowerCase() === email.toLocaleLowerCase(),
          );
          if (duplicate) {
            app.notify("Ese usuario o correo ya está registrado.");
            return;
          }
          const credentials = await app.hashPassword(password);
          const account = { name, email, username, role, ...credentials };
          accounts.push(account);
          app.saveList(app.storageKeys.accounts, accounts);
          localStorage.setItem(app.storageKeys.profile, JSON.stringify({
            name: account.name,
            email: account.email,
            username: account.username,
            role: account.role,
          }));
          app.notify("Cuenta creada. Redirigiendo...");
          window.setTimeout(() => {
            window.location.href = role === "admin" ? "admin.html" : "catalogo.html";
          }, 700);
        };
        register().catch((error) => {
          console.error("No se pudo completar el registro.", error);
          app.notify("No se pudo guardar la cuenta en este navegador.");
        });
      });
    });

    document.querySelector("#form-soporte")?.addEventListener("submit", (event) => {
      event.preventDefault();
      event.currentTarget.reset();
      app.notify("Consulta enviada. Gracias por contactarnos.");
    });

    document.querySelector("#form-libro")?.addEventListener("submit", (event) => {
      event.preventDefault();
      app.addBook(event.currentTarget);
    });

    document.querySelector("#portada")?.addEventListener("change", (event) => {
      const file = event.currentTarget.files[0];
      document.querySelector("#nombre-portada").textContent = file?.name || "No se seleccionó ningún archivo";
    });
  };

  app.updateAdminRegistration();
  app.showDefaultCredentials();
})();
