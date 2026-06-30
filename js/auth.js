/* ═══════════════════════════════════════════════════
   PDC Hub — Módulo de autenticación local
   Selector de usuario sin contraseña (MVP)
   Se reemplaza con MSAL.js cuando IT apruebe Azure AD
   ═══════════════════════════════════════════════════ */

const Auth = {

  /* ─── Usuarios predefinidos del piloto ────────── */
  USUARIOS: [
    // Planners
    { id: 'denis',   nombre: 'Denis Martínez',  rol: 'PLANNER', marcaId: null,  iniciales: 'DM', color: '#1A2B4A' },
    // Gerentes de Marca
    { id: 'ana',     nombre: 'Ana García',       rol: 'GM',      marcaId: 'MB',  iniciales: 'AG', color: '#0D8A7A' },
    { id: 'roberto', nombre: 'Roberto Soto',     rol: 'GM',      marcaId: 'AU',  iniciales: 'RS', color: '#2E5FA3' },
    { id: 'maria',   nombre: 'María López',      rol: 'GM',      marcaId: 'DC',  iniciales: 'ML', color: '#C47A1E' },
    { id: 'carlos',  nombre: 'Carlos Paz',       rol: 'GM',      marcaId: 'AY',  iniciales: 'CP', color: '#27774A' },
    { id: 'laura',   nombre: 'Laura Méndez',     rol: 'GM',      marcaId: 'DK',  iniciales: 'LM', color: '#B83232' },
  ],

  /* ─── Usuario activo ──────────────────────────── */
  getActivo() {
    return PDC.getUsuario();
  },

  setActivo(usuarioId) {
    const u = this.USUARIOS.find(x => x.id === usuarioId);
    if (u) PDC.setUsuario(u);
    return u || null;
  },

  cerrarSesion() {
    PDC.eliminar('usuario_activo');
  },

  /* ─── Renderizar selector de usuario ──────────── */
  renderSelector(onLogin) {
    const overlay = document.createElement('div');
    overlay.id = 'auth-overlay';
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 9999;
      background: linear-gradient(135deg, #1A2B4A 0%, #243860 60%, #0D8A7A 100%);
      display: flex; align-items: center; justify-content: center;
      font-family: 'Segoe UI', system-ui, sans-serif;
    `;

    overlay.innerHTML = `
      <div style="background:#fff;border-radius:12px;width:100%;max-width:480px;padding:32px;box-shadow:0 24px 64px rgba(0,0,0,.3);margin:16px">
        <div style="text-align:center;margin-bottom:28px">
          <div style="font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#718096;margin-bottom:6px">GRUPO PDC</div>
          <div style="font-size:22px;font-weight:700;color:#1A2B4A;margin-bottom:4px">Hub de Pronóstico</div>
          <div style="font-size:13px;color:#718096">Selecciona tu perfil para continuar</div>
        </div>

        <div style="margin-bottom:20px">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#718096;margin-bottom:10px;padding-left:2px">Planeación de Demanda</div>
          <div id="auth-planners" style="display:flex;flex-direction:column;gap:6px"></div>
        </div>

        <div>
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#718096;margin-bottom:10px;padding-left:2px">Gerentes de Marca</div>
          <div id="auth-gms" style="display:grid;grid-template-columns:1fr 1fr;gap:6px"></div>
        </div>

        <div style="margin-top:20px;padding-top:16px;border-top:1px solid #EEF1F7;font-size:10px;color:#A0AEC0;text-align:center">
          Piloto Guatemala · Ciclo Julio 2026 · Sin contraseña (MVP)
        </div>
      </div>
    `;

    // Renderizar botones de planners
    const planners = this.USUARIOS.filter(u => u.rol === 'PLANNER');
    const gms = this.USUARIOS.filter(u => u.rol === 'GM');

    planners.forEach(u => {
      const btn = this._crearBtnUsuario(u, true);
      btn.onclick = () => this._login(u.id, overlay, onLogin);
      overlay.querySelector('#auth-planners').appendChild(btn);
    });

    gms.forEach(u => {
      const btn = this._crearBtnUsuario(u, false);
      btn.onclick = () => this._login(u.id, overlay, onLogin);
      overlay.querySelector('#auth-gms').appendChild(btn);
    });

    document.body.appendChild(overlay);
  },

  _crearBtnUsuario(u, full) {
    const marcaNombre = u.marcaId
      ? (PDC.MARCAS.find(m => m.id === u.marcaId)?.nombre || '')
      : 'Planner de Demanda';

    const btn = document.createElement('button');
    btn.style.cssText = `
      display:flex;align-items:center;gap:10px;
      padding:10px 14px;
      background:#F8FAFC;border:1px solid #D1D9E6;border-radius:8px;
      cursor:pointer;font-family:inherit;
      transition:all .15s;text-align:left;width:100%;
    `;
    btn.onmouseenter = () => { btn.style.background = '#EBF2FC'; btn.style.borderColor = '#2E5FA3'; };
    btn.onmouseleave = () => { btn.style.background = '#F8FAFC'; btn.style.borderColor = '#D1D9E6'; };

    btn.innerHTML = `
      <div style="width:34px;height:34px;border-radius:50%;background:${u.color};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0">${u.iniciales}</div>
      <div>
        <div style="font-size:13px;font-weight:600;color:#1A2B4A">${u.nombre}</div>
        <div style="font-size:11px;color:#718096">${marcaNombre}</div>
      </div>
    `;
    return btn;
  },

  _login(usuarioId, overlay, onLogin) {
    const u = this.setActivo(usuarioId);
    if (u) {
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity .2s';
      setTimeout(() => {
        overlay.remove();
        if (onLogin) onLogin(u);
      }, 200);
    }
  },

  /* ─── Inicializar Auth en una página ──────────── */
  init(onLogin) {
    // Si el admin guardó usuarios personalizados, usarlos
    const guardados = localStorage.getItem('pdc_hub_admin_usuarios');
    if (guardados) {
      try { this.USUARIOS = JSON.parse(guardados); } catch(e) {}
    }
    const activo = this.getActivo();
    if (activo) {
      if (onLogin) onLogin(activo);
    } else {
      this.renderSelector(onLogin);
    }
  },

  /* ─── Botón de cambiar usuario (para topbar) ─── */
  renderBtnCambiar(container) {
    const u = this.getActivo();
    if (!u) return;
    container.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px">
        <div style="width:28px;height:28px;border-radius:50%;background:${u.color};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff">${u.iniciales}</div>
        <div>
          <div style="font-size:12px;font-weight:600;color:#fff">${u.nombre}</div>
          <div style="font-size:10px;opacity:.5;color:#fff">${PDC.ROLES[u.rol] || u.rol}</div>
        </div>
        <button onclick="Auth.cambiarUsuario()" style="font-family:inherit;font-size:10px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);border-radius:4px;padding:3px 8px;color:#fff;cursor:pointer;margin-left:4px">Cambiar</button>
      </div>
    `;
  },

  cambiarUsuario() {
    this.cerrarSesion();
    location.reload();
  },
};

window.Auth = Auth;
