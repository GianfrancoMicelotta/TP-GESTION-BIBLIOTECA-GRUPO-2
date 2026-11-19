(() => {
  "use strict";

  const app = window.LibraryHub || (window.LibraryHub = {});

  app.storageKeys = {
    theme: "libraryhub_theme",
    favorites: "libraryhub_favorites",
    cart: "libraryhub_cart",
    books: "libraryhub_books",
    inventory: "libraryhub_inventory",
    inventoryVersion: "libraryhub_inventory_version",
    accounts: "libraryhub_accounts",
    profile: "libraryhub_profile",
    catalogView: "libraryhub_catalog_view",
    checkout: "libraryhub_checkout",
  };
  app.defaultFavorites = ["Rayuela", "Ficciones"];
  app.defaultCart = ["Rayuela", "El túnel"];

  app.resolveStorageKey = function resolveStorageKey(key) {
    if (![app.storageKeys.favorites, app.storageKeys.cart, app.storageKeys.checkout].includes(key)) return key;
    const profile = JSON.parse(localStorage.getItem(app.storageKeys.profile) || "null");
    return profile?.username ? `${key}_${profile.username}` : key;
  };

  app.readList = function readList(key, fallback) {
    const resolvedKey = app.resolveStorageKey(key);
    let stored = localStorage.getItem(resolvedKey);
    if (stored === null && resolvedKey !== key) {
      stored = localStorage.getItem(key);
      if (stored !== null) {
        localStorage.setItem(resolvedKey, stored);
        localStorage.removeItem(key);
      }
    }
    if (stored === null) {
      const isUserData = key === app.storageKeys.favorites || key === app.storageKeys.cart;
      const initialValue = isUserData ? [] : fallback;
      localStorage.setItem(resolvedKey, JSON.stringify(initialValue));
      return [...initialValue];
    }

    const value = JSON.parse(stored);
    if (!Array.isArray(value)) {
      throw new TypeError(`El dato guardado en ${resolvedKey} no tiene un formato válido.`);
    }
    return value;
  };

  app.saveList = function saveList(key, value) {
    localStorage.setItem(app.resolveStorageKey(key), JSON.stringify(value));
  };

  app.notify = function notify(message) {
    let status = document.querySelector(".notificacion");
    if (!status) {
      status = document.createElement("div");
      status.className = "notificacion";
      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");
      document.body.append(status);
    }
    status.textContent = message;
    status.classList.add("visible");
    window.clearTimeout(status.timeoutId);
    status.timeoutId = window.setTimeout(() => status.classList.remove("visible"), 3000);
  };

  app.setTheme = function setTheme(isDark) {
    document.body.classList.toggle("oscuro", isDark);
    localStorage.setItem(app.storageKeys.theme, isDark ? "oscuro" : "claro");
    document.querySelectorAll(".boton-tema").forEach((button) => {
      button.setAttribute("aria-pressed", String(isDark));
      button.title = isDark ? "Cambiar a tema claro" : "Cambiar a tema oscuro";
      button.setAttribute("aria-label", button.title);
    });
  };

  app.updateNavigationCounts = function updateNavigationCounts() {
    const favorites = app.readList(app.storageKeys.favorites, app.defaultFavorites);
    const cart = app.readList(app.storageKeys.cart, app.defaultCart);
    document.querySelectorAll('a[href="favoritos.html"]').forEach((link) => {
      link.textContent = `Favoritos (${favorites.length})`;
    });
    document.querySelectorAll('a[href="carrito.html"]').forEach((link) => {
      link.textContent = `Mi carrito (${cart.length})`;
    });
  };
})();
