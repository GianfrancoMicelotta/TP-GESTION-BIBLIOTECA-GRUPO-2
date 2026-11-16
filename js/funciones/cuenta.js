(() => {
  "use strict";

  const app = window.LibraryHub;
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
    const protectedPages = ["catalogo.html", "favoritos.html", "carrito.html", "mi-cuenta.html", "admin.html"];
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
    document.querySelectorAll('a[href="admin.html"]').forEach((link) => {
      link.hidden = profile?.role !== "admin";
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
    app.renderFavorites();
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
            document.querySelector("#clave2").setCustomValidity("Las contraseñas no coinciden.");
            document.querySelector("#clave2").reportValidity();
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
  };

  app.updateAdminRegistration();
  app.showDefaultCredentials();
})();
