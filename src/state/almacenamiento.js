/**
 * Acceso a localStorage sin que una excepcion tumbe la app.
 *
 * En modo privado, con cookies bloqueadas o cuando la cuota esta llena,
 * localStorage lanza. Un juego educativo que pierde el progreso del alumno
 * por un StorageUnavailableError seria un fallo grave, asi que aqui hay un
 * respaldo en memoria: la sesion sigue funcionando, solo no se conserva al
 * recargar.
 */

const memoria = new Map();
let disponible = null;

function probarAlmacenamiento() {
  if (disponible !== null) return disponible;
  try {
    const clave = '__javalearn_prueba__';
    window.localStorage.setItem(clave, '1');
    window.localStorage.removeItem(clave);
    disponible = true;
  } catch {
    disponible = false;
  }
  return disponible;
}

export function almacenamientoDisponible() {
  return probarAlmacenamiento();
}

export function leer(clave, porDefecto = null) {
  try {
    if (probarAlmacenamiento()) {
      const bruto = window.localStorage.getItem(clave);
      if (bruto === null) return porDefecto;
      try {
        return JSON.parse(bruto);
      } catch {
        return bruto;
      }
    }
  } catch {
    /* cae al respaldo en memoria */
  }
  return memoria.has(clave) ? memoria.get(clave) : porDefecto;
}

export function escribir(clave, valor) {
  memoria.set(clave, valor);
  try {
    if (probarAlmacenamiento()) {
      window.localStorage.setItem(clave, JSON.stringify(valor));
      return true;
    }
  } catch {
    /* cuota llena o almacenamiento bloqueado: nos quedamos con la memoria */
  }
  return false;
}

export function borrar(clave) {
  memoria.delete(clave);
  try {
    if (probarAlmacenamiento()) window.localStorage.removeItem(clave);
  } catch {
    /* nada que hacer */
  }
}

export function limpiarTodo() {
  memoria.clear();
  try {
    if (probarAlmacenamiento()) window.localStorage.clear();
  } catch {
    /* nada que hacer */
  }
}
