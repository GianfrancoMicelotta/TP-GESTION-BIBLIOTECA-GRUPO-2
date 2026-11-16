(() => {
  "use strict";

  const app = window.LibraryHub;

  app.renderAdminBooks = function renderAdminBooks() {
    const table = document.querySelector(".tabla table");
    if (!table) return;
    const books = app.readList(app.storageKeys.books, []);
    const inventory = app.ensureInventory();
    table.querySelectorAll("tr:not(:first-child)").forEach((row) => {
      const title = row.querySelector("td")?.textContent.trim();
      const copiesCell = row.querySelector("td:last-child");
      if (title && copiesCell && Number.isInteger(inventory[title])) {
        copiesCell.textContent = String(inventory[title]);
      }
    });
    books.forEach((book) => {
      const row = document.createElement("tr");
      [book.title, book.author, book.genre, inventory[book.title]].forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = String(value);
        row.append(cell);
      });
      table.append(row);
    });
  };

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
      const row = document.createElement("tr");
      [title, author, genre, copies].forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = String(value);
        row.append(cell);
      });
      document.querySelector(".tabla table").append(row);
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
