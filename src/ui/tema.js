/**
 * Tema claro/oscuro.
 *
 * Hay exactamente dos paletas, ambas definidas en css/style.css dentro de
 * bloques delimitados y ambas auditadas por scripts/check-contrast.mjs. No se
 * duplican colores en media queries: la preferencia del sistema se resuelve
 * en JavaScript y se aplica como data-tema, asi cualquier color nuevo pasa
 * por el auditor.
 */

import { leer, escribir } from '../state/almacenamiento.js';

const CLAVE = 'javalearn.tema';
const MEDIA = '(prefers-color-scheme: light)';

export const TEMAS = ['claro', 'oscuro'];

export function temaGuardado() {
  const valor = leer(CLAVE, null);
  return TEMAS.includes(valor) ? valor : null;
}

export function aplicarTema(tema) {
  const raiz = document.documentElement;
  if (tema === null) raiz.removeAttribute('data-tema');
  else raiz.dataset.tema = tema;
}

export function temaEfectivo() {
  return document.documentElement.dataset.tema ?? 'oscuro';
}

/** Tema que el sistema pide, para cuando el alumno no ha elegido nada. */
export function temaDelSistema() {
  return window.matchMedia?.(MEDIA)?.matches ? 'claro' : 'oscuro';
}

export function guardarTema(tema) {
  if (tema === null) {
    aplicarTema(temaDelSistema());
    return null;
  }
  escribir(CLAVE, tema);
  aplicarTema(tema);
  return tema;
}

export function alternarTema() {
  const siguiente = temaEfectivo() === 'oscuro' ? 'claro' : 'oscuro';
  return guardarTema(siguiente);
}

function etiqueta(tema) {
  return tema === 'oscuro' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro';
}

function refrescarBoton(boton) {
  const texto = boton.querySelector('[data-texto-tema]');
  if (texto) texto.textContent = etiqueta(temaEfectivo());
  boton.setAttribute('aria-label', etiqueta(temaEfectivo()));
}

/**
 * Conecta el boton de tema y, si el alumno no ha elegido, mantiene el tema
 * sincronizado con el sistema en vivo. Escuchar 'change' es lo que hace que
 * cambie al pasar de claro a oscuro del sistema operativo sin recargar.
 */
export function iniciarTema(boton) {
  if (!boton) return;

  refrescarBoton(boton);
  boton.addEventListener('click', () => {
    alternarTema();
    refrescarBoton(boton);
  });

  const consulta = window.matchMedia?.(MEDIA);
  if (consulta) {
    const alCambiar = () => {
      if (temaGuardado() === null) {
        aplicarTema(temaDelSistema());
        refrescarBoton(boton);
      }
    };
    if (consulta.addEventListener) consulta.addEventListener('change', alCambiar);
    else consulta.addListener(alCambiar);
  }
}
