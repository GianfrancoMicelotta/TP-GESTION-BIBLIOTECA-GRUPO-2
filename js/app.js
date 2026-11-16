(() => {
  "use strict";

  const app = window.LibraryHub;

  const initialize = async () => {
    await app.initializeAccounts();
    app.updateAdminRegistration();
    app.showDefaultCredentials();
    if (!app.guardPage()) return;

    const savedTheme = localStorage.getItem(app.storageKeys.theme) === "oscuro";
    app.setTheme(savedTheme);
    app.initializeCatalog();
    app.renderFavorites();
    app.renderCart();
    app.renderAdminBooks();
    app.updateNavigationCounts();
    app.updateRoleNavigation();
    app.setupForms();
    app.renderProfile();
    app.updateRoleNavigation();
  };

  initialize().catch((error) => {
    console.error("No se pudo inicializar LibraryHub.", error);
    const form = document.querySelector("main");
    if (form) {
      const message = document.createElement("p");
      message.setAttribute("role", "alert");
      message.textContent = "No se pudo iniciar la aplicación. Revisá que el navegador permita guardar datos locales.";
      form.prepend(message);
    }
  });
})();
