(() => {
  "use strict";

  const app = window.LibraryHub;

  const createInventoryControls = (row, title, copies) => {
    let actionsCell = row.querySelector(".acciones-inventario");
    if (!actionsCell) {
      actionsCell = document.createElement("td");
      actionsCell.className = "acciones-inventario";
      row.append(actionsCell);
    }

    actionsCell.replaceChildren();
    [
      { change: -1, label: `Bajar un ejemplar de ${title}`, text: "−" },
      { change: 1, label: `Sumar un ejemplar de ${title}`, text: "+" },
    ].forEach(({ change, label, text }) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "boton boton-cantidad";
      button.dataset.inventoryChange = String(change);
      button.setAttribute("aria-label", label);
      button.textContent = text;
      button.disabled = change < 0 ? copies === 0 : copies === Number.MAX_SAFE_INTEGER;
      actionsCell.append(button);
    });
  };

  const createBookRow = (book, copies) => {
    const row = document.createElement("tr");
    [book.title, book.author, book.genre, copies].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = String(value);
      row.append(cell);
    });
    createInventoryControls(row, book.title, copies);
    return row;
  };

  app.renderAdminBooks = function renderAdminBooks() {
    const table = document.querySelector(".tabla table");
    if (!table) return;
    const books = app.readList(app.storageKeys.books, []);
    const inventory = app.ensureInventory();
    table.querySelectorAll("tr:not(:first-child)").forEach((row) => {
      const title = row.querySelector("td")?.textContent.trim();
      const copiesCell = row.querySelectorAll("td")[3];
      if (title && copiesCell && Number.isInteger(inventory[title])) {
        copiesCell.textContent = String(inventory[title]);
        createInventoryControls(row, title, inventory[title]);
      }
    });
    books.forEach((book) => {
      table.append(createBookRow(book, inventory[book.title]));
    });
  };

  document.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-inventory-change]");
    if (!button) return;

    const row = button.closest("tr");
    const title = row?.querySelector("td")?.textContent.trim();
    const change = Number(button.dataset.inventoryChange);
    if (!title || ![-1, 1].includes(change)) return;

    const inventory = app.ensureInventory();
    const currentCopies = inventory[title];
    if (!Number.isInteger(currentCopies)) {
      throw new TypeError(`La cantidad guardada para "${title}" no es válida.`);
    }
    if (change < 0 && currentCopies === 0) return;
    if (change > 0 && currentCopies === Number.MAX_SAFE_INTEGER) return;

    const copies = currentCopies + change;
    inventory[title] = copies;
    app.saveInventory(inventory);
    row.querySelectorAll("td")[3].textContent = String(copies);
    createInventoryControls(row, title, copies);
  });

  app.addBook = function addBook(form) {
    const title = document.querySelector("#titulo").value.trim();
    const author = document.querySelector("#autor").value.trim();
    const genre = document.querySelector("#genero").value;
    const copies = Number(document.querySelector("#ejemplares").value);
    const isbn = document.querySelector("#isbn").value.trim();
    const synopsis = document.querySelector("#sinopsis").value.trim();
    const books = app.readList(app.storageKeys.books, []);
    const exists = books.some((book) => book.title.toLocaleLowerCase() === title.toLocaleLowerCase())
      || [...document.querySelectorAll(".tabla table tr:not(:first-child) td:first-child")]
        .some((cell) => cell.textContent.trim().toLocaleLowerCase() === title.toLocaleLowerCase());
    if (exists) {
      app.notify("Ya existe un libro con ese título.");
      return;
    }

    const file = document.querySelector("#portada").files[0];
    const save = (coverData = "") => {
      const book = { title, author, genre, copies, isbn, synopsis, coverData, coverClass: "azul" };
      books.push(book);
      app.saveList(app.storageKeys.books, books);
      const inventory = app.ensureInventory();
      inventory[title] = copies;
      app.saveInventory(inventory);
      document.querySelector(".tabla table").append(createBookRow(book, copies));
      form.reset();
      document.querySelector("#ejemplares").value = "1";
      app.notify("Libro guardado. Ya aparece en el catálogo.");
    };

    if (!file) {
      save();
      return;
    }
    if (file.size > 1024 * 1024) {
      app.notify("La portada debe pesar menos de 1 MB.");
      return;
    }
    const reader = new FileReader();
    reader.addEventListener("load", () => save(String(reader.result)));
    reader.addEventListener("error", () => app.notify("No se pudo leer la imagen de portada."));
    reader.readAsDataURL(file);
  };
})();
