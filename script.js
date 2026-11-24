// Estado central del temporizador
const estado = {
  modoActual: "trabajo", // 'trabajo' | 'corto' | 'largo'
  duraciones: {
    trabajo: 25,
    corto: 5,
    largo: 15,
  },
  segundosRestantes: 25 * 60,
  enEjecucion: false,
  seInicioAlgunaVez: false,
  sesionesCompletadas: 0,
  idIntervalo: null,
};

// Referencias del DOM
const pantallaTiempo = document.getElementById("pantalla-tiempo");
const etiquetaSesionActual = document.getElementById("etiqueta-sesion-actual");
const estadoAviso = document.getElementById("estado-aviso");
const contadorSesionesEl = document.getElementById("sesiones-completadas");

const botonIniciarPausar = document.getElementById("boton-iniciar-pausar");
const botonReiniciar = document.getElementById("boton-reiniciar");
const botonProbarSonido = document.getElementById("boton-probar-sonido");

const botonesModo = document.querySelectorAll(".boton-modo");
const formularioConfig = document.getElementById("formulario-config");
const inputTrabajo = document.getElementById("duracion-trabajo");
const inputCorto = document.getElementById("duracion-corto");
const inputLargo = document.getElementById("duracion-largo");

const nombresModo = {
  trabajo: "Trabajo",
  corto: "Descanso corto",
  largo: "Descanso largo",
};

// Reproduce un tono suave con Web Audio API al terminar una sesión
function reproducirSonidoFinSesion() {
  try {
    const AudioContexto = window.AudioContext || window.webkitAudioContext;
    if (!AudioContexto) return;

    const contexto = new AudioContexto();
    const notas = [523.25, 659.25, 783.99]; // Do5, Mi5, Sol5

    notas.forEach((frecuencia, indice) => {
      const oscilador = contexto.createOscillator();
      const ganancia = contexto.createGain();

      oscilador.type = "sine";
      oscilador.frequency.setValueAtTime(
        frecuencia,
        contexto.currentTime + indice * 0.18,
      );

      ganancia.gain.setValueAtTime(0.001, contexto.currentTime + indice * 0.18);
      ganancia.gain.exponentialRampToValueAtTime(
        0.15,
        contexto.currentTime + indice * 0.18 + 0.03,
      );
      ganancia.gain.exponentialRampToValueAtTime(
        0.0001,
        contexto.currentTime + indice * 0.18 + 0.35,
      );

      oscilador.connect(ganancia);
      ganancia.connect(contexto.destination);

      oscilador.start(contexto.currentTime + indice * 0.18);
      oscilador.stop(contexto.currentTime + indice * 0.18 + 0.36);
    });
  } catch (error) {
    console.warn("No se pudo reproducir el sonido:", error);
  }
}

// Formatea segundos totales en MM:SS
function formatearTiempo(totalSegundos) {
  const minutos = Math.floor(totalSegundos / 60);
  const segundos = totalSegundos % 60;
  return `${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`;
}

// Actualiza la vista del reloj, pestañas ARIA y título de la pestaña del navegador
function actualizarInterfaz() {
  const tiempoTexto = formatearTiempo(estado.segundosRestantes);
  pantallaTiempo.textContent = tiempoTexto;
  etiquetaSesionActual.textContent = `Sesión actual: ${nombresModo[estado.modoActual]}`;
  contadorSesionesEl.textContent = estado.sesionesCompletadas;
  document.title = `${tiempoTexto} - ${nombresModo[estado.modoActual]}`;

  if (estado.enEjecucion) {
    botonIniciarPausar.textContent = "Pausar";
  } else if (estado.seInicioAlgunaVez) {
    botonIniciarPausar.textContent = "Reanudar";
  } else {
    botonIniciarPausar.textContent = "Iniciar";
  }

  botonesModo.forEach((boton) => {
    const esActivo = boton.dataset.modo === estado.modoActual;
    boton.classList.toggle("activo", esActivo);
    boton.setAttribute("aria-selected", esActivo ? "true" : "false");
  });
}

// Detiene el intervalo activo si existe
function detenerIntervalo() {
  if (estado.idIntervalo !== null) {
    clearInterval(estado.idIntervalo);
    estado.idIntervalo = null;
  }
  estado.enEjecucion = false;
}

// Cambia de modo y reinicia el tiempo según la duración configurada
function cambiarModo(nuevoModo, autoIniciar = false) {
  detenerIntervalo();
  estado.modoActual = nuevoModo;
  estado.segundosRestantes = estado.duraciones[nuevoModo] * 60;
  estado.seInicioAlgunaVez = false;
  estadoAviso.textContent = "";
  actualizarInterfaz();

  if (autoIniciar) {
    iniciarOReanudar();
  }
}

// Maneja lo que ocurre cuando llega a 00:00
function finalizarSesion() {
  detenerIntervalo();
  reproducirSonidoFinSesion();

  if (estado.modoActual === "trabajo") {
    estado.sesionesCompletadas += 1;

    // Cada 4 sesiones de trabajo completadas corresponde descanso largo
    if (estado.sesionesCompletadas % 4 === 0) {
      estadoAviso.textContent =
        "¡Completaste 4 sesiones de trabajo! Toca un descanso largo.";
      cambiarModo("largo", false);
    } else {
      estadoAviso.textContent =
        "¡Sesión de trabajo finalizada! Toca un descanso corto.";
      cambiarModo("corto", false);
    }
  } else {
    estadoAviso.textContent =
      "¡Descanso terminado! Lista para una nueva sesión de trabajo.";
    cambiarModo("trabajo", false);
  }
}

// Inicia o reanuda el conteo segundo a segundo
function iniciarOReanudar() {
  if (estado.enEjecucion) {
    detenerIntervalo();
    estadoAviso.textContent = "Temporizador en pausa.";
    actualizarInterfaz();
    return;
  }

  estado.enEjecucion = true;
  estado.seInicioAlgunaVez = true;
  estadoAviso.textContent = "";
  actualizarInterfaz();

  estado.idIntervalo = setInterval(() => {
    if (estado.segundosRestantes > 0) {
      estado.segundosRestantes -= 1;
      actualizarInterfaz();
    } else {
      finalizarSesion();
    }
  }, 1000);
}

// Reinicia la sesión actual a su duración configurada
function reiniciarSesionActual() {
  detenerIntervalo();
  estado.segundosRestantes = estado.duraciones[estado.modoActual] * 60;
  estado.seInicioAlgunaVez = false;
  estadoAviso.textContent = "Sesión reiniciada.";
  actualizarInterfaz();
}

// Eventos de botones principales
botonIniciarPausar.addEventListener("click", iniciarOReanudar);
botonReiniciar.addEventListener("click", reiniciarSesionActual);
botonProbarSonido.addEventListener("click", () => {
  reproducirSonidoFinSesion();
  estadoAviso.textContent = "Sonido de notificación reproducido.";
});

// Selección de modo con clic o flechas del teclado (accesibilidad)
botonesModo.forEach((boton, indice) => {
  boton.addEventListener("click", () => {
    cambiarModo(boton.dataset.modo, false);
  });

  boton.addEventListener("keydown", (evento) => {
    if (evento.key === "ArrowRight" || evento.key === "ArrowLeft") {
      evento.preventDefault();
      const direccion = evento.key === "ArrowRight" ? 1 : -1;
      const siguienteIndice =
        (indice + direccion + botonesModo.length) % botonesModo.length;
      const siguienteBoton = botonesModo[siguienteIndice];
      siguienteBoton.focus();
      cambiarModo(siguienteBoton.dataset.modo, false);
    }
  });
});

// Guardar y aplicar nuevas duraciones configuradas por el usuario
formularioConfig.addEventListener("submit", (evento) => {
  evento.preventDefault();

  const minsTrabajo = parseInt(inputTrabajo.value, 10);
  const minsCorto = parseInt(inputCorto.value, 10);
  const minsLargo = parseInt(inputLargo.value, 10);

  if (
    Number.isNaN(minsTrabajo) ||
    minsTrabajo < 1 ||
    Number.isNaN(minsCorto) ||
    minsCorto < 1 ||
    Number.isNaN(minsLargo) ||
    minsLargo < 1
  ) {
    estadoAviso.textContent =
      "Ingresa números válidos mayores o iguales a 1 minuto.";
    return;
  }

  estado.duraciones.trabajo = minsTrabajo;
  estado.duraciones.corto = minsCorto;
  estado.duraciones.largo = minsLargo;

  detenerIntervalo();
  estado.segundosRestantes = estado.duraciones[estado.modoActual] * 60;
  estado.seInicioAlgunaVez = false;
  estadoAviso.textContent = "Tiempos actualizados correctamente.";
  actualizarInterfaz();
});

// Renderizado inicial
actualizarInterfaz();
