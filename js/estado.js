/* ═══════════════════════════════════════════════════
   PDC Hub — Estado del ciclo
   Maneja el estado compartido entre todos los módulos
   Usa localStorage como base de datos local
   ═══════════════════════════════════════════════════ */

const PDC = {

  // ── Configuración del ciclo actual ──────────────────
  CICLO_ACTUAL: {
    id: 'GT-2026-07',
    nombre: 'Ciclo Julio 2026',
    mes: '2026-jul',
    estado: 'activo', // activo | cerrado | preparacion
    semanas: {
      S1: { inicio: '2026-06-30', fin: '2026-07-04', label: 'S1 — Preparación interna' },
      S2: { inicio: '2026-07-07', fin: '2026-07-11', label: 'S2 — Estadístico V1' },
      S3: { inicio: '2026-07-14', fin: '2026-07-18', label: 'S3 — Sesiones colaborativas' },
      S4: { inicio: '2026-07-21', fin: '2026-07-25', label: 'S4 — Consolidación · cierre mié S4' },
    },
    fechaLimiteBB: '2026-07-16', // 48h antes de S3
    fechaCierre:   '2026-07-23', // Miércoles S4
  },

  // ── Marcas PDC Guatemala ──────────────────────────
  MARCAS: [
    { id: 'MB', nombre: 'Magia Blanca',  color: '#1A2B4A', gerente: 'Ana García' },
    { id: 'AU', nombre: 'Australian',    color: '#0D8A7A', gerente: 'Roberto Soto' },
    { id: 'DC', nombre: 'Del Carmen',    color: '#C47A1E', gerente: 'María López' },
    { id: 'AY', nombre: 'Ayudín',        color: '#2E5FA3', gerente: 'Carlos Paz' },
    { id: 'DK', nombre: 'DKasa',         color: '#27774A', gerente: 'Laura Méndez' },
  ],

  // ── Roles ──────────────────────────────────────────
  ROLES: {
    GM: 'Gerente de Marca',
    PLANNER: 'Planner de Demanda',
  },

  // ── Llave base para localStorage ──────────────────
  LS_PREFIX: 'pdc_hub_',

  /* ─── Guardar en localStorage ─────────────────── */
  guardar(clave, valor) {
    try {
      localStorage.setItem(this.LS_PREFIX + clave, JSON.stringify(valor));
      return true;
    } catch (e) {
      console.error('Error guardando en localStorage:', e);
      return false;
    }
  },

  /* ─── Leer de localStorage ────────────────────── */
  leer(clave, defecto = null) {
    try {
      const raw = localStorage.getItem(this.LS_PREFIX + clave);
      return raw ? JSON.parse(raw) : defecto;
    } catch (e) {
      return defecto;
    }
  },

  /* ─── Eliminar de localStorage ────────────────── */
  eliminar(clave) {
    localStorage.removeItem(this.LS_PREFIX + clave);
  },

  /* ─── Estado del ciclo por gerente ────────────── */
  getEstadoGM(marcaId) {
    const estados = this.leer('estados_gm', {});
    return estados[marcaId] || {
      marcaId,
      bbEntregado:       false,
      bbFecha:           null,
      forecastAprobado:  false,
      forecastFecha:     null,
      sesionEstado:      'pendiente', // pendiente | programada | realizada
      comentario:        '',
    };
  },

  actualizarEstadoGM(marcaId, cambios) {
    const estados = this.leer('estados_gm', {});
    estados[marcaId] = { ...this.getEstadoGM(marcaId), ...cambios };
    this.guardar('estados_gm', estados);
  },

  /* ─── Usuario activo ──────────────────────────── */
  getUsuario() {
    return this.leer('usuario_activo', null);
  },

  setUsuario(usuario) {
    this.guardar('usuario_activo', usuario);
  },

  /* ─── Semana actual del ciclo ─────────────────── */
  getSemanaActual() {
    const hoy = new Date().toISOString().slice(0, 10);
    const s = this.CICLO_ACTUAL.semanas;
    for (const [k, v] of Object.entries(s)) {
      if (hoy >= v.inicio && hoy <= v.fin) return k;
    }
    if (hoy < s.S1.inicio) return 'pre-ciclo';
    return 'post-ciclo';
  },

  /* ─── Días para el cierre ─────────────────────── */
  diasParaCierre() {
    const hoy  = new Date();
    const cierre = new Date(this.CICLO_ACTUAL.fechaCierre);
    const diff = Math.ceil((cierre - hoy) / (1000 * 60 * 60 * 24));
    return diff;
  },

  /* ─── Tarea pendiente del GM ──────────────────── */
  tareaPendiente(marcaId) {
    const est = this.getEstadoGM(marcaId);
    const semana = this.getSemanaActual();
    if (!est.bbEntregado && (semana === 'S2' || semana === 'S3')) {
      return {
        tipo: 'bb',
        urgente: semana === 'S3',
        texto: semana === 'S3'
          ? '⚠️ Tu sesión colaborativa es pronto — entrega tus Building Blocks'
          : 'Tu sesión colaborativa se acerca — prepara tus Building Blocks',
      };
    }
    if (est.bbEntregado && !est.forecastAprobado && semana === 'S4') {
      return {
        tipo: 'forecast',
        urgente: true,
        texto: '📋 El forecast del ciclo está listo — revisa y aprueba',
      };
    }
    return null;
  },

  /* ─── FVA de un GM (histórico) ────────────────── */
  getFVA(marcaId) {
    return this.leer('fva_' + marcaId, [
      // Datos de ejemplo para demostración
      { ciclo: 'Mar 2026', valor:  8.2, positivo: true },
      { ciclo: 'Abr 2026', valor: -3.1, positivo: false },
      { ciclo: 'May 2026', valor: 12.4, positivo: true },
      { ciclo: 'Jun 2026', valor:  5.7, positivo: true },
      { ciclo: 'Jul 2026', valor:  null, positivo: null }, // ciclo activo
    ]);
  },

  /* ─── Guardar sesión BB ───────────────────────── */
  guardarSesionBB(marcaId, sesion) {
    const clave = `bb_sesion_${marcaId}_${this.CICLO_ACTUAL.id}`;
    this.guardar(clave, { ...sesion, guardadoEn: new Date().toISOString() });
  },

  leerSesionBB(marcaId) {
    const clave = `bb_sesion_${marcaId}_${this.CICLO_ACTUAL.id}`;
    return this.leer(clave, null);
  },

  /* ─── Log de building blocks ──────────────────── */
  agregarLogBB(entrada) {
    const log = this.leer('log_bb', []);
    log.push({
      ...entrada,
      timestamp: new Date().toISOString(),
      ciclo: this.CICLO_ACTUAL.id,
    });
    this.guardar('log_bb', log);
  },

  getLogBB(marcaId = null) {
    const log = this.leer('log_bb', []);
    return marcaId ? log.filter(e => e.marcaId === marcaId) : log;
  },

  /* ─── Configuración de validaciones ──────────── */
  getConfig() {
    return this.leer('config_validaciones', {
      umbralAdvertencia: 50,   // % ajuste que activa advertencia amarilla
      umbralAlerta:      200,  // % ajuste que activa alerta roja
      limiteCajasNuevo:  10000, // cajas máx para SKU nuevo sin confirmar
    });
  },

  setConfig(config) {
    this.guardar('config_validaciones', config);
  },

  /* ─── Dinámicas comerciales ───────────────────── */
  guardarDinamica(dinamica) {
    const lista = this.leer('dinamicas', []);
    const idx = lista.findIndex(d => d.id === dinamica.id);
    if (idx >= 0) lista[idx] = dinamica;
    else lista.push({ ...dinamica, id: dinamica.id || Date.now().toString() });
    this.guardar('dinamicas', lista);
  },

  getDinamicas(marcaId = null) {
    const lista = this.leer('dinamicas', []);
    return marcaId ? lista.filter(d => d.marcaId === marcaId) : lista;
  },

  /* ─── Formateadores ───────────────────────────── */
  formatNum(n) {
    return Math.round(n).toLocaleString('es-GT');
  },

  formatFecha(iso) {
    if (!iso) return '—';
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' });
  },

  formatFechaCorta(iso) {
    if (!iso) return '—';
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('es-GT', { day: '2-digit', month: 'short' });
  },
};

// Exponer globalmente
window.PDC = PDC;
