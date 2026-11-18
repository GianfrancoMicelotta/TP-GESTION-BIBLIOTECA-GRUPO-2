(() => {
  "use strict";

  const app = window.LibraryHub;

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[data-logout]");
    if (link) {
      localStorage.removeItem(app.storageKeys.profile);
      return;
    }

    const target = event.target.closest("button");
    if (!target) return;

    if (target.matches(".boton-tema")) {
      app.setTheme(!document.body.classList.contains("oscuro"));
      return;
    }

    const card = target.closest(".tarjeta");
    if (target.matches(".favorito") && card) {
      const title = card.querySelector("h3").textContent.trim();
      const favorites = app.readList(app.storageKeys.favorites, app.defaultFavorites);
      const isFavorite = favorites.includes(title);
      app.saveList(app.storageKeys.favorites, isFavorite
        ? favorites.filter((item) => item !== title)
        : [...favorites, title]);
      target.classList.toggle("activo", !isFavorite);
      target.textContent = isFavorite ? "♡" : "♥";
      target.setAttribute("aria-label", `${isFavorite ? "Agregar" : "Quitar"} ${title} ${isFavorite ? "a" : "de"} favoritos`);
      app.renderFavorites();
      app.updateNavigationCounts();
      return;
    }

    if (card && target.matches(".boton") && target.textContent.toLowerCase().includes("añadir")) {
      const title = card.querySelector("h3").textContent.trim();
      const cart = app.readList(app.storageKeys.cart, app.defaultCart);
      if (cart.includes(title)) {
        target.textContent = "Ya está en el carrito";
        target.disabled = true;
        return;
      }
      if (app.getAvailableCopies(title) < 1) {
        app.notify(`No hay ejemplares disponibles de "${title}".`);
        target.disabled = true;
        return;
      }
      cart.push(title);
      app.saveList(app.storageKeys.cart, cart);
      target.textContent = "Ya está en el carrito";
      target.disabled = true;
      app.updateNavigationCounts();
      app.notify(`"${title}" se agregó al carrito.`);
      return;
    }

    if (target.dataset.removeFavorite) {
      const favorites = app.readList(app.storageKeys.favorites, app.defaultFavorites)
        .filter((title) => title !== target.dataset.removeFavorite);
      app.saveList(app.storageKeys.favorites, favorites);
      app.renderFavorites();
      app.updateNavigationCounts();
      return;
    }

    if (target.dataset.removeCart) {
      const cart = app.readList(app.storageKeys.cart, app.defaultCart);
      const index = cart.indexOf(target.dataset.removeCart);
      if (index !== -1) cart.splice(index, 1);
      app.saveList(app.storageKeys.cart, cart);
      app.renderCart();
      app.updateNavigationCounts();
      return;
    }

    if (target.id === "confirmar-compra") {
      const cart = app.readList(app.storageKeys.cart, app.defaultCart);
      if (cart.length === 0) return;
      const quantities = cart.reduce((result, title) => {
        result[title] = (result[title] || 0) + 1;
        return result;
      }, {});
      const inventory = app.ensureInventory();
      const unavailable = Object.entries(quantities).find(([title, quantity]) =>
        inventory[title] < quantity,
      );
      if (unavailable) {
        app.notify(`No hay ejemplares suficientes de "${unavailable[0]}".`);
        return;
      }
      Object.entries(quantities).forEach(([title, quantity]) => {
        inventory[title] -= quantity;
      });
      app.saveInventory(inventory);
      app.saveList(app.storageKeys.cart, []);
      app.renderCart();
      app.updateNavigationCounts();
      app.notify("Préstamo confirmado. ¡Que disfrutes la lectura!");
      return;
    }

    if (target.id === "eliminar-cuenta") {
      if (!window.confirm("¿Seguro que querés eliminar la cuenta guardada en este navegador?")) return;
      const profile = JSON.parse(localStorage.getItem(app.storageKeys.profile) || "null");
      if (profile) {
        const accounts = app.readList(app.storageKeys.accounts, []);
        const account = accounts.find((item) => item.username === profile.username);
        const remainingAdmins = accounts.filter((item) => item.role === "admin" && item.username !== profile.username);
        if (account?.role === "admin" && remainingAdmins.length === 0) {
          app.notify("No se puede eliminar el último administrador.");
          return;
        }
        app.saveList(app.storageKeys.accounts, accounts
          .filter((item) => item.username !== profile.username));
        localStorage.removeItem(app.resolveStorageKey(app.storageKeys.favorites));
        localStorage.removeItem(app.resolveStorageKey(app.storageKeys.cart));
      }
      localStorage.removeItem(app.storageKeys.profile);
      window.location.href = "index.html";
    }
  });
})();
