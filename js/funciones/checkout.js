(() => {
  "use strict";

  const app = window.LibraryHub;
  const formatPrice = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });

  app.setupCheckout = function setupCheckout() {
    const form = document.querySelector("#form-finalizar-compra");
    if (!form) return;

    const emptyMessage = document.querySelector("#checkout-vacio");
    const summary = document.querySelector("#checkout-resumen");
    const detailsSection = document.querySelector("#checkout-datos");
    const successMessage = document.querySelector("#checkout-confirmado");
    const errorMessage = document.querySelector("#checkout-error");
    const bookList = document.querySelector("#checkout-libros");
    const cart = app.readList(app.storageKeys.cart, app.defaultCart);

    if (cart.length === 0) {
      emptyMessage.hidden = false;
      summary.hidden = true;
      detailsSection.hidden = true;
      return;
    }

    const profile = JSON.parse(localStorage.getItem(app.storageKeys.profile) || "null");
    const savedData = localStorage.getItem(app.resolveStorageKey(app.storageKeys.checkout));
    const savedDetails = savedData === null ? {} : JSON.parse(savedData);
    if (typeof savedDetails !== "object" || savedDetails === null || Array.isArray(savedDetails)) {
      throw new TypeError("Los datos guardados para finalizar la compra no tienen un formato válido.");
    }

    const fieldIds = {
      name: "#checkout-nombre",
      email: "#checkout-correo",
      phone: "#checkout-telefono",
      delivery: "#checkout-entrega",
      street: "#checkout-calle",
      city: "#checkout-ciudad",
      postalCode: "#checkout-codigo-postal",
      payment: "#checkout-pago",
      notes: "#checkout-notas",
    };

    Object.entries(fieldIds).forEach(([key, selector]) => {
      const field = form.querySelector(selector);
      const defaultValue = key === "name" ? profile?.name
        : key === "email" ? profile?.email
          : key === "delivery" ? "retiro"
            : key === "payment" ? "tarjeta"
              : "";
      field.value = savedDetails[key] || defaultValue || "";
    });

    const getFormDetails = () => Object.fromEntries(
      Object.entries(fieldIds).map(([key, selector]) => [key, form.querySelector(selector).value.trim()]),
    );
    const saveFormDetails = () => {
      localStorage.setItem(
        app.resolveStorageKey(app.storageKeys.checkout),
        JSON.stringify(getFormDetails()),
      );
    };

    const deliverySelect = form.querySelector("#checkout-entrega");
    const addressFieldset = form.querySelector("#checkout-direccion");
    const paymentSelect = form.querySelector("#checkout-pago");
    const cardFieldset = form.querySelector("#checkout-tarjeta");
    const addressFields = ["#checkout-calle", "#checkout-ciudad", "#checkout-codigo-postal"]
      .map((selector) => form.querySelector(selector));
    const cardFields = [
      "#checkout-titular",
      "#checkout-numero-tarjeta",
      "#checkout-vencimiento",
      "#checkout-codigo-seguridad",
    ].map((selector) => form.querySelector(selector));
    const cardNumber = form.querySelector("#checkout-numero-tarjeta");
    const expiration = form.querySelector("#checkout-vencimiento");
    const updateAddressFields = () => {
      const needsAddress = deliverySelect.value === "domicilio";
      addressFieldset.hidden = !needsAddress;
      addressFields.forEach((field) => {
        field.required = needsAddress;
      });
    };
    const updateCardFields = () => {
      const needsCard = paymentSelect.value === "tarjeta";
      cardFieldset.hidden = !needsCard;
      cardFields.forEach((field) => {
        field.required = needsCard;
        field.disabled = !needsCard;
      });
    };
    updateAddressFields();
    updateCardFields();

    const quantities = new Map();
    cart.forEach((title) => {
      quantities.set(title, (quantities.get(title) || 0) + 1);
    });
    const books = app.getPageBooks();
    let total = 0;
    const booksWithoutPrice = [];
    quantities.forEach((quantity, title) => {
      const item = document.createElement("li");
      const customBook = books.find((book) => book.title === title);
      const unitPrice = app.getBookPrice(title)
        ?? (Number.isSafeInteger(customBook?.price) ? customBook.price : null);
      if (unitPrice === null) {
        item.textContent = `${title} × ${quantity} — Precio no disponible`;
        booksWithoutPrice.push(title);
      } else {
        const subtotal = unitPrice * quantity;
        item.textContent = `${title} × ${quantity} — ${formatPrice.format(subtotal)}`;
        total += subtotal;
      }
      bookList.append(item);
    });
    document.querySelector("#checkout-cantidad").textContent =
      `${cart.length} ${cart.length === 1 ? "libro" : "libros"}`;
    document.querySelector("#checkout-total").textContent = booksWithoutPrice.length
      ? `Total no disponible: falta asignar precio a ${booksWithoutPrice.join(", ")}.`
      : `Total: ${formatPrice.format(total)}`;

    form.addEventListener("input", (event) => {
      if (event.target === cardNumber || event.target === expiration) {
        event.target.setCustomValidity("");
      }
      saveFormDetails();
    });
    form.addEventListener("change", () => {
      updateAddressFields();
      updateCardFields();
      saveFormDetails();
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      errorMessage.hidden = true;
      saveFormDetails();

      if (paymentSelect.value === "tarjeta") {
        const digitsOnly = cardNumber.value.replace(/\s/g, "");
        if (!/^\d{13,19}$/.test(digitsOnly)) {
          app.showValidationMessage(cardNumber, "Ingresá entre 13 y 19 dígitos.");
          return;
        }
        cardNumber.setCustomValidity("");

        const [monthText, yearText] = expiration.value.split("/");
        const month = Number(monthText);
        const year = 2000 + Number(yearText);
        const now = new Date();
        if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) {
          app.showValidationMessage(expiration, "La tarjeta está vencida.");
          return;
        }
        expiration.setCustomValidity("");
      }

      const currentCart = app.readList(app.storageKeys.cart, app.defaultCart);
      if (currentCart.length === 0) {
        emptyMessage.hidden = false;
        summary.hidden = true;
        detailsSection.hidden = true;
        return;
      }

      const currentQuantities = new Map();
      currentCart.forEach((title) => {
        currentQuantities.set(title, (currentQuantities.get(title) || 0) + 1);
      });
      const inventory = app.ensureInventory();
      const unavailable = [...currentQuantities.entries()].find(([title, quantity]) =>
        !Number.isInteger(inventory[title]) || inventory[title] < quantity,
      );
      if (unavailable) {
        errorMessage.textContent = `No hay ejemplares suficientes de "${unavailable[0]}". Volvé al carrito para revisarlo.`;
        errorMessage.hidden = false;
        return;
      }

      currentQuantities.forEach((quantity, title) => {
        inventory[title] -= quantity;
      });
      app.saveInventory(inventory);
      app.saveList(app.storageKeys.cart, []);
      app.updateNavigationCounts();
      cardFields.forEach((field) => {
        field.value = "";
      });
      summary.hidden = true;
      detailsSection.hidden = true;
      successMessage.hidden = false;
    });
  };
})();
