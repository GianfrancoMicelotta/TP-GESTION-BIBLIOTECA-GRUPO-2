// CARRUSEL DE LIBROS DE LA PORTADA

// Array de objetos con los libros que se muestran en el carrusel
const librosCarrusel = [
  {
    titulo: "Rayuela",
    autor: "Julio Cortázar",
    imagen: "img/rayuela.jpg",
    descripcion: "Una novela que se puede leer en distintos órdenes y que sigue a Horacio Oliveira entre París y Buenos Aires.",
  },
  {
    titulo: "El Aleph",
    autor: "Jorge Luis Borges",
    imagen: "img/elAleph.jpg",
    descripcion: "Cuentos sobre el infinito, el tiempo y los laberintos, con el famoso punto que contiene todos los puntos del universo.",
  },
  {
    titulo: "Ficciones",
    autor: "Jorge Luis Borges",
    imagen: "img/ficciones.jpg",
    descripcion: "Una colección de relatos fantásticos con bibliotecas infinitas, mundos inventados y juegos de la memoria.",
  },
  {
    titulo: "El túnel",
    autor: "Ernesto Sabato",
    imagen: "img/elTunel.jpg",
    descripcion: "La confesión del pintor Juan Pablo Castel, una historia intensa sobre la soledad y la obsesión.",
  },
];

const carrusel = document.getElementById("carrusel");
const contenedorDiapositivas = document.getElementById("carrusel-diapositivas");
const contenedorPuntos = document.getElementById("carrusel-puntos");
const botonAnterior = document.getElementById("carrusel-anterior");
const botonSiguiente = document.getElementById("carrusel-siguiente");
const botonPausa = document.getElementById("carrusel-pausa");

let posicionActual = 0;
let intervaloCarrusel;
let enPausa = false;

// Guarda a qué distancia del libro principal estaba cada libro la vez anterior
const distanciasAnteriores = [];

// Crea una diapositiva (imagen + datos del libro) para un libro del array
function crearDiapositiva(libro) {
  const diapositiva = document.createElement("article");
  diapositiva.classList.add("carrusel-diapositiva");

  const enlace = document.createElement("a");
  enlace.href = "login.html";
  const imagen = document.createElement("img");
  imagen.src = libro.imagen;
  imagen.alt = "Portada de " + libro.titulo;
  enlace.appendChild(imagen);

  const datos = document.createElement("div");
  datos.classList.add("carrusel-datos");

  const titulo = document.createElement("h3");
  titulo.appendChild(document.createTextNode(libro.titulo));

  const autor = document.createElement("p");
  autor.classList.add("carrusel-autor");
  autor.appendChild(document.createTextNode(libro.autor));

  const descripcion = document.createElement("p");
  descripcion.appendChild(document.createTextNode(libro.descripcion));

  datos.appendChild(titulo);
  datos.appendChild(autor);
  datos.appendChild(descripcion);

  diapositiva.appendChild(enlace);
  diapositiva.appendChild(datos);
  return diapositiva;
}

// Crea un punto indicador que lleva a la diapositiva indicada
function crearPunto(indice) {
  const punto = document.createElement("button");
  punto.type = "button";
  punto.classList.add("carrusel-punto");
  punto.title = "Ver " + librosCarrusel[indice].titulo;

  punto.addEventListener("click", () => {
    mostrarDiapositiva(indice);
    reiniciarIntervalo();
  });

  return punto;
}

// Pone en el centro el libro de la posición indicada.
// El anterior queda a la izquierda y el siguiente a la derecha, cortados.
function mostrarDiapositiva(posicion) {
  const diapositivas = document.querySelectorAll(".carrusel-diapositiva");
  const puntos = document.querySelectorAll(".carrusel-punto");
  const total = diapositivas.length;

  // Si se pasa del último vuelve al primero, y si va antes del primero va al último
  if (posicion >= total) {
    posicion = 0;
  }
  if (posicion < 0) {
    posicion = total - 1;
  }

  for (let i = 0; i < total; i++) {
    // Distancia de este libro al principal: 0 = principal, -1 = anterior, 1 = siguiente
    let distancia = i - posicion;
    // El carrusel es circular: el último libro también es el "anterior" del primero
    if (distancia > total / 2) {
      distancia = distancia - total;
    }
    if (distancia <= -total / 2) {
      distancia = distancia + total;
    }

    // Si el libro salta de un costado al otro, se mueve sin animación
    // para que no se lo vea cruzar por delante del libro principal
    const salto = distancia - distanciasAnteriores[i];
    if (distanciasAnteriores[i] === undefined || salto > 1 || salto < -1) {
      diapositivas[i].classList.add("sin-transicion");
    } else {
      diapositivas[i].classList.remove("sin-transicion");
    }

    // Según la distancia se le pone una clase; el CSS decide dónde se ubica cada una
    diapositivas[i].classList.remove("activo", "anterior", "siguiente", "oculto-izquierda", "oculto-derecha");
    puntos[i].classList.remove("activo");
    if (distancia === 0) {
      diapositivas[i].classList.add("activo");
      puntos[i].classList.add("activo");
    } else if (distancia === -1) {
      diapositivas[i].classList.add("anterior");
    } else if (distancia === 1) {
      diapositivas[i].classList.add("siguiente");
    } else if (distancia < 0) {
      diapositivas[i].classList.add("oculto-izquierda");
    } else {
      diapositivas[i].classList.add("oculto-derecha");
    }

    distanciasAnteriores[i] = distancia;
  }

  posicionActual = posicion;
}

// Pasa solo a la siguiente diapositiva cada 4 segundos
function iniciarIntervalo() {
  intervaloCarrusel = setInterval(function () {
    mostrarDiapositiva(posicionActual + 1);
  }, 4000);
}

// Si el usuario cambia de libro, vuelve a contar los 4 segundos desde cero
function reiniciarIntervalo() {
  clearInterval(intervaloCarrusel);
  if (!enPausa) {
    iniciarIntervalo();
  }
}

// Solo se arma el carrusel si la página tiene el contenedor
if (carrusel) {
  for (let i = 0; i < librosCarrusel.length; i++) {
    contenedorDiapositivas.appendChild(crearDiapositiva(librosCarrusel[i]));
    contenedorPuntos.appendChild(crearPunto(i));
  }

  botonAnterior.addEventListener("click", () => {
    mostrarDiapositiva(posicionActual - 1);
    reiniciarIntervalo();
  });

  botonSiguiente.addEventListener("click", () => {
    mostrarDiapositiva(posicionActual + 1);
    reiniciarIntervalo();
  });

  botonPausa.addEventListener("click", () => {
    enPausa = !enPausa;
    if (enPausa) {
      clearInterval(intervaloCarrusel);
      botonPausa.innerHTML = "Reanudar";
    } else {
      iniciarIntervalo();
      botonPausa.innerHTML = "Pausar";
    }
    botonPausa.classList.toggle("pausado");
  });

  mostrarDiapositiva(0);
  iniciarIntervalo();
}
