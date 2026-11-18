(() => {
  "use strict";

  const app = window.LibraryHub;

  app.getPageBooks = function getPageBooks() {
    const cards = [...document.querySelectorAll(".tarjeta")].map((card) => {
      const title = card.querySelector("h3")?.textContent.trim();
      const details = card.querySelector(".datos > p")?.textContent.trim() || "";
      const [author = "", genre = ""] = details.split(" - ");
      const cover = card.querySelector(".portada");
      return {
        title,
        author,
        genre,
        coverClass: [...(cover?.classList || [])].find((name) =>
          ["azul", "verde", "violeta", "dorado"].includes(name),
        ) || "azul",
        available: card.querySelector(".estado")?.textContent.trim() !== "No disponible",
      };
    }).filter((book) => book.title);

    const customBooks = app.readList(app.storageKeys.books, []);
    return [...cards, ...customBooks];
  };

  app.createBookRow = function createBookRow(book, actionLabel, actionName) {
    const row = document.createElement("div");
    row.className = "fila";
    const cover = document.createElement("div");
    cover.className = `portada ${book.coverClass || "azul"}`;
    cover.textContent = book.title.charAt(0).toUpperCase();
    cover.setAttribute("aria-hidden", "true");

    const details = document.createElement("div");
    details.className = "datos";
    const title = document.createElement("h3");
    title.textContent = book.title;
    const author = document.createElement("p");
    author.textContent = [book.author, book.genre].filter(Boolean).join(" - ");
    details.append(title, author);

    const button = document.createElement("button");
    button.className = "boton boton-claro";
    button.type = "button";
    button.textContent = actionLabel;
    button.dataset[actionName] = book.title;
    row.append(cover, details, button);
    return row;
  };

  app.renderFavorites = function renderFavorites() {
    const lists = document.querySelectorAll("#lista-favoritos");
    if (lists.length === 0) return;
    const favorites = app.readList(app.storageKeys.favorites, app.defaultFavorites);
    const books = app.getPageBooks();
    lists.forEach((list) => {
      list.replaceChildren();
      favorites.forEach((title) => {
        const book = books.find((item) => item.title === title) || {
          title,
          author: "",
          genre: "",
          coverClass: "azul",
        };
        list.append(app.createBookRow(book, "Quitar", "removeFavorite"));
      });
      if (favorites.length === 0) {
        const empty = document.createElement("p");
        empty.textContent = "Todavía no agregaste libros a tus favoritos.";
        list.append(empty);
      }
    });
  };

  app.renderCart = function renderCart() {
    const list = document.querySelector("#lista-carrito");
    if (!list) return;

    app.ensureInventory();
    const cart = app.readList(app.storageKeys.cart, app.defaultCart);
    const books = app.getPageBooks();
    list.replaceChildren();
    cart.forEach((title) => {
      const book = books.find((item) => item.title === title) || {
        title,
        author: "",
        coverClass: "azul",
      };
      list.append(app.createBookRow(book, "Quitar", "removeCart"));
    });

    const confirmButton = document.createElement("button");
    confirmButton.className = "boton";
    confirmButton.id = "confirmar-compra";
    confirmButton.type = "button";
    confirmButton.textContent = `Confirmar compra (${cart.length} ${cart.length === 1 ? "libro" : "libros"})`;
    confirmButton.disabled = cart.length === 0;
    list.append(confirmButton);
  };

  app.bookCard = function bookCard(book) {
    const card = document.createElement("article");
    card.className = "tarjeta";
    const cover = book.coverData ? document.createElement("img") : document.createElement("div");
    cover.className = `portada ${book.coverClass || "azul"}`;
    if (book.coverData) {
      cover.src = book.coverData;
      cover.alt = `Portada de ${book.title}`;
    } else {
      cover.textContent = book.title.charAt(0).toUpperCase();
      cover.setAttribute("aria-hidden", "true");
    }

    const details = document.createElement("div");
    details.className = "datos";
    const title = document.createElement("h3");
    title.textContent = book.title;
    const author = document.createElement("p");
    author.textContent = `${book.author} - ${book.genre}`;
    const state = document.createElement("span");
    state.className = "estado";
    state.textContent = Number(book.copies) > 0 ? "Disponible" : "No disponible";
    if (book.synopsis) {
      const synopsis = document.createElement("p");
      synopsis.textContent = book.synopsis;
      details.append(title, author, state, synopsis);
    } else {
      details.append(title, author, state);
    }

    const actions = document.createElement("p");
    const favorite = document.createElement("button");
    favorite.className = "favorito";
    favorite.type = "button";
    favorite.textContent = "♡";
    favorite.setAttribute("aria-label", `Agregar ${book.title} a favoritos`);
    const addToCart = document.createElement("button");
    addToCart.className = "boton";
    addToCart.type = "button";
    addToCart.textContent = "Añadir al carrito";
    addToCart.disabled = Number(book.copies) === 0;
    actions.append(favorite, document.createTextNode(" "), addToCart);
    details.append(actions);
    card.append(cover, details);
    return card;
  };

  app.addCustomBooksToCatalog = function addCustomBooksToCatalog() {
    if (!document.querySelector(".tarjeta")) return;
    const sections = [...document.querySelectorAll("main > section[aria-labelledby]")];
    app.readList(app.storageKeys.books, []).forEach((book) => {
      const section = sections.find((item) =>
        item.querySelector("h2")?.textContent.trim().toLocaleLowerCase() === book.genre.toLocaleLowerCase(),
      );
      if (section) {
        section.querySelector(".items").append(app.bookCard(book));
        return;
      }

      const newSection = document.createElement("section");
      const heading = document.createElement("h2");
      heading.textContent = book.genre;
      const items = document.createElement("div");
      items.className = "items";
      items.append(app.bookCard(book));
      newSection.append(heading, items);
      document.querySelector("main").append(newSection);
    });
  };

  app.initializeCatalog = function initializeCatalog() {
    if (!document.querySelector(".tarjeta")) return;
    app.addCustomBooksToCatalog();
    app.ensureInventory();
    const favorites = app.readList(
      app.storageKeys.favorites,
      [...document.querySelectorAll(".tarjeta .favorito.activo")]
        .map((button) => button.closest(".tarjeta")?.querySelector("h3")?.textContent.trim())
        .filter(Boolean),
    );
    const cart = app.readList(app.storageKeys.cart, app.defaultCart);

    document.querySelectorAll(".tarjeta").forEach((card) => {
      const title = card.querySelector("h3")?.textContent.trim();
      const state = card.querySelector(".estado");
      const addButton = [...card.querySelectorAll("button.boton")].find((button) =>
        button.textContent.trim().toLowerCase().includes("añadir"),
      );
      const availableCopies = app.getAvailableCopies(title);

      // cuento cuantas veces esta este libro en el carrito
      let enCarrito = 0;
      for (let i = 0; i < cart.length; i++) {
        if (cart[i] === title) {
          enCarrito++;
        }
      }

      // los que quedan son los disponibles menos los que ya estan en el carrito
      const quedan = availableCopies - enCarrito;
      if (state) {
        if (quedan > 0) {
          state.innerHTML = "Disponible (" + quedan + ")";
        } else {
          state.innerHTML = "No disponible";
        }
      }

      // si no quedan ejemplares se desactiva el boton
      if (addButton) {
        addButton.disabled = quedan <= 0;
      }
      const favorite = card.querySelector(".favorito");
      if (!title || !favorite) return;
      const isFavorite = favorites.includes(title);
      favorite.classList.toggle("activo", isFavorite);
      favorite.textContent = isFavorite ? "♥" : "♡";
      favorite.setAttribute("aria-label", `${isFavorite ? "Quitar" : "Agregar"} ${title} ${isFavorite ? "de" : "a"} favoritos`);
    });

    app.setCatalogView(localStorage.getItem(app.storageKeys.catalogView) || "tarjetas");
    document.querySelector("#vista-tarjetas")?.addEventListener("click", () => app.setCatalogView("tarjetas"));
    document.querySelector("#vista-lista")?.addEventListener("click", () => app.setCatalogView("lista"));

    const search = document.querySelector("#busqueda-catalogo");
    if (search) {
      search.addEventListener("input", () => {
        const query = search.value.trim().toLocaleLowerCase();
        document.querySelectorAll(".tarjeta").forEach((card) => {
          card.hidden = !card.textContent.toLocaleLowerCase().includes(query);
        });
        document.querySelectorAll("main > section[aria-labelledby]").forEach((section) => {
          section.hidden = ![...section.querySelectorAll(".tarjeta")].some((card) => !card.hidden);
        });
      });
    }
  };

  app.setCatalogView = function setCatalogView(view) {
    const catalog = document.querySelector("#catalogo");
    if (!catalog) return;
    const isList = view === "lista";
    catalog.classList.toggle("catalogo-lista", isList);
    localStorage.setItem(app.storageKeys.catalogView, isList ? "lista" : "tarjetas");
    document.querySelector("#vista-lista")?.setAttribute("aria-pressed", String(isList));
    document.querySelector("#vista-tarjetas")?.setAttribute("aria-pressed", String(!isList));
  };

  const defaultInventory = {
    "El Hobbit": 1,
    "Harry Potter y la piedra filosofal": 1,
    "La historia interminable": 1,
    "El nombre del viento": 1,
    "Asesinato en el Orient Express": 1,
    "El sabueso de los Baskerville": 1,
    "La chica del tren": 1,
    "Los hombres que no amaban a las mujeres": 1,
    "Fahrenheit 451": 1,
    Dune: 1,
    "El fin de la eternidad": 1,
    "La máquina del tiempo": 1,
    "Orgullo y prejuicio": 1,
    "Como agua para chocolate": 1,
    "Yo antes de ti": 1,
    "Bajo la misma estrella": 1,
    Rayuela: 3,
    "El Aleph": 2,
    Ficciones: 0,
    "El túnel": 1,
  };

  app.ensureInventory = function ensureInventory() {
    const stored = localStorage.getItem(app.storageKeys.inventory);
    const inventory = stored === null ? { ...defaultInventory } : JSON.parse(stored);
    if (typeof inventory !== "object" || inventory === null || Array.isArray(inventory)) {
      throw new TypeError("El inventario guardado no tiene un formato válido.");
    }
    app.readList(app.storageKeys.books, []).forEach((book) => {
      if (!Number.isInteger(inventory[book.title])) inventory[book.title] = Number(book.copies);
    });
    app.saveInventory(inventory);
    return inventory;
  };

  app.saveInventory = function saveInventory(inventory) {
    localStorage.setItem(app.storageKeys.inventory, JSON.stringify(inventory));
  };

  app.getAvailableCopies = function getAvailableCopies(title) {
    const inventory = JSON.parse(localStorage.getItem(app.storageKeys.inventory) || "{}");
    return Number.isInteger(inventory[title]) ? inventory[title] : 0;
  };
})();
