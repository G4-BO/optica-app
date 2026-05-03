import { useState } from "react";
import emailjs from '@emailjs/browser';

// ─── SEDES ─────────────────────────────────────────────────────────
const SUCURSALES = ["Óptica La Huayrona", "Óptica El Muro"];
const MASTER_PASSWORD = "OPTI2005";

const ESTADOS = {
  PEDIDO: { label: "Pedido", color: "#F59E0B", bg: "#FEF3C7" },
  EN_LABORATORIO: { label: "En Laboratorio", color: "#3B82F6", bg: "#DBEAFE" },
  LISTO: { label: "Listo para Entregar", color: "#10B981", bg: "#D1FAE5" },
  RECOGIDO: { label: "Recogido", color: "#6B7280", bg: "#F3F4F6" },
};

const TIPOS_LENTE = ["Monofocal", "Bifocal", "Multifuncional"];
const TIPOS_TRATAMIENTO = ["Rx Blancas","Rx Antirreflex","Blue Protec","Fotomático","Fotoblue","Digital"];
const METODOS_PAGO = ["Efectivo", "Yape", "Plin", "POS", "Transferencia"];
const MATERIALES_LUNA = ["Resinas", "Cristal", "Policarbonato", "Resinas NK"];

const initialPacientes = [
  {
    id: 1, nombre: "María García", dni: "12345678", telefono: "987654321",
    sucursal: "Óptica La Huayrona", fecha: "2025-04-20", fechaEntrega: "2025-04-27",
    tipoLente: "Multifuncional", tratamiento: "Blue Protec", detalleTratamiento: "",
    montura: "MON-001", observaciones: "",
    total: 350, abonos: [{ monto: 150, fecha: "2025-04-20", nota: "Adelanto", metodo: "Efectivo" }],
    estado: "EN_LABORATORIO",
    graduacion: { odEsfera: "-2.00", odCilindro: "-0.50", odEje: "180", odAdicion: "", odDp: "32",
                  oiEsfera: "-1.75", oiCilindro: "-0.25", oiEje: "175", oiAdicion: "", oiDp: "31" },
  },
  {
    id: 2, nombre: "Carlos Mendoza", dni: "87654321", telefono: "912345678",
    sucursal: "Óptica El Muro", fecha: "2024-07-10", fechaEntrega: "2024-07-17",
    tipoLente: "Monofocal", tratamiento: "Rx Antirreflex", detalleTratamiento: "",
    montura: "MON-042", observaciones: "",
    total: 180, abonos: [{ monto: 100, fecha: "2024-07-10", nota: "Adelanto", metodo: "Yape" }],
    estado: "RECOGIDO",
    graduacion: { odEsfera: "-1.50", odCilindro: "0.00", odEje: "0", odAdicion: "", odDp: "33",
                  oiEsfera: "-1.50", oiCilindro: "0.00", oiEje: "0", oiAdicion: "", oiDp: "32" },
  },
  {
    id: 3, nombre: "Ana Torres", dni: "45678901", telefono: "976543210",
    sucursal: "Óptica La Huayrona", fecha: "2025-04-22", fechaEntrega: "2025-04-30",
    tipoLente: "Bifocal", tratamiento: "Digital", detalleTratamiento: "Digital HD Plus",
    montura: "MON-117", observaciones: "Cliente prefiere armazón oscuro",
    total: 520, abonos: [
      { monto: 200, fecha: "2025-04-22", nota: "Adelanto", metodo: "POS" },
      { monto: 50, fecha: "2025-04-23", nota: "Abono", metodo: "Efectivo" }
    ],
    estado: "PEDIDO",
    graduacion: { odEsfera: "-3.25", odCilindro: "-0.75", odEje: "90", odAdicion: "+1.50", odDp: "34",
                  oiEsfera: "-3.00", oiCilindro: "-0.50", oiEje: "85", oiAdicion: "+1.50", oiDp: "33" },
  },
];

// ─── HELPERS ───────────────────────────────────────────────────────
const totalAbonado = (p) => p.abonos.reduce((s, a) => s + a.monto, 0);
const saldoPendiente = (p) => p.total - totalAbonado(p);
const fmt = (n) => `S/ ${Number(n).toFixed(2)}`;
const today = () => new Date().toISOString().split("T")[0];

const graduacionVacia = () => ({
  odEsfera: "", odCilindro: "", odEje: "", odAdicion: "", odDp: "",
  oiEsfera: "", oiCilindro: "", oiEje: "", oiAdicion: "", oiDp: "",
});

// ─── NOTIFICACIONES: detectar pacientes a 10 meses ─────────────────
const detectarRenovaciones = (pacientes) => {
  const ahora = new Date();
  return pacientes.filter(p => {
    if (p.estado !== "RECOGIDO") return false;
    const fechaCompra = new Date(p.fecha);
    const mesesTranscurridos = (ahora.getFullYear() - fechaCompra.getFullYear()) * 12
      + (ahora.getMonth() - fechaCompra.getMonth());
    return mesesTranscurridos >= 9 && mesesTranscurridos <= 11;
  });
};

// ─── WHATSAPP ──────────────────────────────────────────────────────
const generarMensajeWhatsApp = (paciente) => {
  const saldo = saldoPendiente(paciente);
  let msg = `Hola ${paciente.nombre} 😊, le informamos que sus lentes están *listos para recoger* en *${paciente.sucursal}*.`;
  if (saldo > 0) msg += ` Su saldo pendiente es de *${fmt(saldo)}*.`;
  else msg += ` Su pedido está completamente pagado ✅.`;
  msg += ` ¡Le esperamos! - OPTIMANAGER`;
  return msg;
};

const generarMensajeRenovacion = (paciente) => {
  const fechaCompra = new Date(paciente.fecha);
  const nombreMes = fechaCompra.toLocaleString("es-PE", { month: "long" });
  return `Hola ${paciente.nombre} 😊, le recordamos que hace aproximadamente 10 meses (${nombreMes}) adquirió sus lentes en *${paciente.sucursal}*. 👓 Es un buen momento para hacerse una revisión y renovar su prescripción. ¡Le esperamos! - OPTIMANAGER`;
};

const abrirWhatsApp = (paciente, mensaje = null) => {
  const msg = encodeURIComponent(mensaje || generarMensajeWhatsApp(paciente));
  const tel = paciente.telefono.replace(/\D/g, "");
  window.open(`https://wa.me/51${tel}?text=${msg}`, "_blank");
};

// ─── EMAILJS (verificación de cuenta) ─────────────────────────────
// ─── EMAILJS (verificación de cuenta) ─────────────────────────────
const enviarCodigoEmailJS = async (email, codigo, nombre) => {
  const SERVICE_ID = "service_2a0y4qv";
  const TEMPLATE_ID = "ajguq8z";
  const PUBLIC_KEY = "7eQFw8xx2YpkMUULH";
  try {
    emailjs.init(PUBLIC_KEY);
    await emailjs.send(SERVICE_ID, TEMPLATE_ID, {
      to_email: email,
      to_name: nombre,
      verification_code: codigo,
      message: `Tu código de verificación para OPTIMANAGER es: ${codigo}. Válido por 10 minutos.`,
    });
    return true;
  } catch (error) {
    console.error("EmailJS error:", error);
    return false;
  }
};

// ─── COMPONENTES BASE ──────────────────────────────────────────────
function Badge({ estado }) {
  const e = ESTADOS[estado];
  return (
    <span style={{
      background: e.bg, color: e.color, border: `1px solid ${e.color}40`,
      borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700,
      letterSpacing: 0.3, whiteSpace: "nowrap"
    }}>{e.label}</span>
  );
}

function Card({ children, style = {}, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: "#fff", borderRadius: 16, padding: 24,
      boxShadow: "0 1px 4px rgba(0,0,0,0.07), 0 4px 20px rgba(0,0,0,0.04)",
      border: "1px solid #E8EEF4", ...style
    }}>{children}</div>
  );
}

function StatCard({ label, value, sub, color = "#1D4ED8", icon }) {
  return (
    <Card style={{ flex: 1, minWidth: 160 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 12, color: "#6B7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
          <div style={{ fontSize: 26, fontWeight: 800, color, marginTop: 6 }}>{value}</div>
          {sub && <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{sub}</div>}
        </div>
        <div style={{ fontSize: 24, opacity: 0.15 }}>{icon}</div>
      </div>
    </Card>
  );
}

function Input({ label, ...props }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{label}</label>}
      <input {...props} style={{
        border: "1.5px solid #D1D5DB", borderRadius: 10, padding: "9px 13px",
        fontSize: 14, outline: "none", fontFamily: "inherit",
        transition: "border 0.2s", background: "#FAFAFA", ...props.style
      }}
        onFocus={e => e.target.style.borderColor = "#1D4ED8"}
        onBlur={e => e.target.style.borderColor = "#D1D5DB"}
      />
    </div>
  );
}

function Select({ label, options, ...props }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{label}</label>}
      <select {...props} style={{
        border: "1.5px solid #D1D5DB", borderRadius: 10, padding: "9px 13px",
        fontSize: 14, outline: "none", fontFamily: "inherit", background: "#FAFAFA",
        cursor: "pointer", ...props.style
      }}
        onFocus={e => e.target.style.borderColor = "#1D4ED8"}
        onBlur={e => e.target.style.borderColor = "#D1D5DB"}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Btn({ children, variant = "primary", onClick, style = {}, disabled }) {
  const styles = {
    primary: { background: "#1D4ED8", color: "#fff" },
    success: { background: "#10B981", color: "#fff" },
    danger: { background: "#EF4444", color: "#fff" },
    ghost: { background: "#F3F4F6", color: "#374151" },
    whatsapp: { background: "#25D366", color: "#fff" },
    warning: { background: "#F59E0B", color: "#fff" },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...styles[variant], border: "none", borderRadius: 10, padding: "9px 18px",
      fontWeight: 700, fontSize: 13, cursor: disabled ? "not-allowed" : "pointer",
      fontFamily: "inherit", transition: "opacity 0.2s", opacity: disabled ? 0.5 : 1,
      ...style
    }}>{children}</button>
  );
}

// ─── CUADRO GRADUACIÓN ─────────────────────────────────────────────
function CuadroGraduacion({ graduacion, onChange, readOnly = false }) {
  const g = graduacion || graduacionVacia();
  const set = (k, v) => onChange && onChange({ ...g, [k]: v });

  const cellStyle = {
    border: "1.5px solid #D1D5DB", borderRadius: 8, padding: "7px 8px",
    fontSize: 13, outline: "none", fontFamily: "inherit", background: readOnly ? "#F9FAFB" : "#FAFAFA",
    textAlign: "center", width: "100%", boxSizing: "border-box",
  };
  const headerStyle = { fontSize: 11, fontWeight: 700, color: "#6B7280", textAlign: "center", padding: "6px 4px", textTransform: "uppercase", letterSpacing: 0.4 };
  const labelStyle = { fontSize: 12, fontWeight: 700, color: "#374151", padding: "8px 10px", background: "#F3F4F6", borderRadius: 8, whiteSpace: "nowrap" };

  const cols = ["Esfera", "Cilindro", "Eje", "Adición", "DP"];
  const keysOD = ["odEsfera", "odCilindro", "odEje", "odAdicion", "odDp"];
  const keysOI = ["oiEsfera", "oiCilindro", "oiEje", "oiAdicion", "oiDp"];

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "4px" }}>
        <thead>
          <tr>
            <th style={{ ...headerStyle, width: 60 }}></th>
            {cols.map(c => <th key={c} style={headerStyle}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {[{ label: "OD 👁", keys: keysOD }, { label: "OI 👁", keys: keysOI }].map(({ label, keys }) => (
            <tr key={label}>
              <td style={labelStyle}>{label}</td>
              {keys.map(k => (
                <td key={k}>
                  {readOnly
                    ? <div style={{ ...cellStyle, background: "#F9FAFB" }}>{g[k] || "—"}</div>
                    : <input style={cellStyle} value={g[k]} onChange={e => set(k, e.target.value)}
                        placeholder={k.includes("Adicion") ? "+0.00" : k.includes("Eje") ? "0°" : "0.00"}
                        onFocus={e => e.target.style.borderColor = "#1D4ED8"}
                        onBlur={e => e.target.style.borderColor = "#D1D5DB"}
                      />
                  }
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── SECCIÓN COMPRA ────────────────────────────────────────────────
function SeccionCompra({ form, set }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ background: "#EFF6FF", borderRadius: 12, padding: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1D4ED8", marginBottom: 12 }}>🛍 Detalle del Pedido</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Select label="Tipo de Lente" value={form.tipoLente} onChange={e => set("tipoLente", e.target.value)}
            options={[{ value: "", label: "Seleccionar..." }, ...TIPOS_LENTE.map(t => ({ value: t, label: t }))]} />
          <Select label="Tratamiento" value={form.tratamiento}
            onChange={e => { set("tratamiento", e.target.value); if (e.target.value !== "Digital") set("detalleTratamiento", ""); }}
            options={[{ value: "", label: "Seleccionar..." }, ...TIPOS_TRATAMIENTO.map(t => ({ value: t, label: t }))]} />
        </div>
        {form.tratamiento === "Digital" && (
          <div style={{ marginTop: 12 }}>
            <Input label="Especificar tipo Digital *" value={form.detalleTratamiento}
              onChange={e => set("detalleTratamiento", e.target.value)} placeholder="Ej: Digital HD Plus..." />
          </div>
        )}
        <div style={{ marginTop: 12 }}>
          <Select label="Material de Luna" value={form.materialLuna || ""} onChange={e => set("materialLuna", e.target.value)}
            options={[{ value: "", label: "Seleccionar..." }, ...MATERIALES_LUNA.map(m => ({ value: m, label: m }))]} />
        </div>
        <div style={{ marginTop: 12 }}>
          <Input label="Código de Montura" value={form.montura} onChange={e => set("montura", e.target.value)} placeholder="Ej: MON-001" />
        </div>
      </div>
    </div>
  );
}

// ─── MODAL WHATSAPP RENOVACIÓN ────────────────────────────────────
function ModalWhatsAppRenovacion({ paciente, onClose }) {
  const mensaje = generarMensajeRenovacion(paciente);
  const fechaCompra = new Date(paciente.fecha);
  const meses = (new Date().getFullYear() - fechaCompra.getFullYear()) * 12
    + (new Date().getMonth() - fechaCompra.getMonth());

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <Card style={{ width: "100%", maxWidth: 480 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#111827" }}>📱 Enviar Recordatorio</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#9CA3AF" }}>✕</button>
        </div>
        <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#92400E", marginBottom: 6 }}>⏰ {paciente.nombre}</div>
          <div style={{ fontSize: 12, color: "#78350F" }}>Compró sus lentes hace <strong>{meses} meses</strong> ({paciente.fecha})</div>
          <div style={{ fontSize: 12, color: "#78350F" }}>Sede: {paciente.sucursal}</div>
        </div>
        <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10, padding: 12, marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#166534", marginBottom: 6 }}>MENSAJE A ENVIAR:</div>
          <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.6 }}>{mensaje}</div>
        </div>
        {paciente.telefono ? (
          <div style={{ display: "flex", gap: 10 }}>
            <Btn variant="ghost" onClick={onClose} style={{ flex: 1 }}>Cancelar</Btn>
            <Btn variant="whatsapp" onClick={() => { abrirWhatsApp(paciente, mensaje); onClose(); }} style={{ flex: 1 }}>
              📱 Enviar por WhatsApp
            </Btn>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 12, color: "#DC2626", marginBottom: 12, background: "#FEF2F2", padding: "8px 12px", borderRadius: 8 }}>
              ⚠️ Este paciente no tiene teléfono registrado
            </div>
            <Btn variant="ghost" onClick={onClose} style={{ width: "100%" }}>Cerrar</Btn>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── CAMPANA DE NOTIFICACIONES ─────────────────────────────────────
function CampanaNotificaciones({ pacientes }) {
  const [abierto, setAbierto] = useState(false);
  const [modalWA, setModalWA] = useState(null);
  const renovaciones = detectarRenovaciones(pacientes);

  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setAbierto(!abierto)} style={{
        background: abierto ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.12)",
        border: "none", borderRadius: 10, padding: "8px 12px", cursor: "pointer",
        color: "#fff", fontSize: 18, position: "relative", fontFamily: "inherit",
        transition: "background 0.2s"
      }}>
        🔔
        {renovaciones.length > 0 && (
          <span style={{
            position: "absolute", top: 2, right: 2, background: "#EF4444", color: "#fff",
            borderRadius: "50%", width: 18, height: 18, fontSize: 11, fontWeight: 800,
            display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1
          }}>{renovaciones.length}</span>
        )}
      </button>

      {abierto && (
        <div style={{
          position: "absolute", top: "calc(100% + 10px)", right: 0, width: 340,
          background: "#fff", borderRadius: 16, boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
          border: "1px solid #E8EEF4", zIndex: 500, overflow: "hidden"
        }}>
          <div style={{ background: "#1D4ED8", padding: "14px 16px" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>🔔 Notificaciones de Renovación</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>Pacientes próximos a renovar sus lentes</div>
          </div>
          {renovaciones.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
              ✅ No hay renovaciones pendientes
            </div>
          ) : (
            <div style={{ maxHeight: 300, overflowY: "auto" }}>
              {renovaciones.map(p => {
                const meses = (new Date().getFullYear() - new Date(p.fecha).getFullYear()) * 12
                  + (new Date().getMonth() - new Date(p.fecha).getMonth());
                return (
                  <div key={p.id} style={{ padding: "12px 16px", borderBottom: "1px solid #F3F4F6", cursor: "pointer" }}
                    onClick={() => { setModalWA(p); setAbierto(false); }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{p.nombre}</div>
                        <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>{p.sucursal}</div>
                        <div style={{ fontSize: 11, color: "#F59E0B", fontWeight: 600, marginTop: 2 }}>
                          ⏰ {meses} meses desde su compra
                        </div>
                      </div>
                      <div style={{ background: "#FEF3C7", color: "#92400E", borderRadius: 8, padding: "4px 8px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", marginLeft: 8 }}>
                        Ver →
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ padding: "10px 16px", background: "#F9FAFB", borderTop: "1px solid #F3F4F6" }}>
            <div style={{ fontSize: 11, color: "#9CA3AF", textAlign: "center" }}>
              Haz clic en un paciente para enviarle un recordatorio por WhatsApp
            </div>
          </div>
        </div>
      )}

      {modalWA && <ModalWhatsAppRenovacion paciente={modalWA} onClose={() => setModalWA(null)} />}
    </div>
  );
}

// ─── PANTALLA LOGIN ────────────────────────────────────────────────
function PantallaLogin({ usuarios, onLogin, onIrRegistro }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [sede, setSede] = useState(SUCURSALES[0]);
  const [error, setError] = useState("");

  const handleLogin = () => {
    const u = usuarios.find(u => u.username === username && u.password === password && u.verificado);
    if (!u) {
      setError("Usuario o contraseña incorrectos, o cuenta no verificada.");
      return;
    }
    onLogin(u, sede);
  };

  return (
    <div style={{
      minHeight: "100vh", background: "linear-gradient(135deg, #1D4ED8 0%, #1e3a8a 100%)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20
    }}>
      <div style={{
        background: "#fff", borderRadius: 24, padding: 40, width: "100%", maxWidth: 420,
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ background: "#EFF6FF", borderRadius: 16, width: 64, height: 64, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, margin: "0 auto 16px" }}>👁</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#111827", letterSpacing: 1 }}>OPTIMANAGER</div>
          <div style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>Sistema de Gestión Óptica</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Input label="Usuario" value={username} onChange={e => setUsername(e.target.value)} placeholder="Tu nombre de usuario" />
          <Input label="Contraseña" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
          <Select label="Sede de trabajo" value={sede} onChange={e => setSede(e.target.value)}
            options={SUCURSALES.map(s => ({ value: s, label: s }))} />

          {error && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#DC2626" }}>
              ⚠️ {error}
            </div>
          )}

          <Btn onClick={handleLogin} style={{ padding: "12px 0", fontSize: 15 }}>
            Ingresar al Sistema
          </Btn>

          <button onClick={onIrRegistro} style={{
            background: "none", border: "none", color: "#1D4ED8", fontSize: 13, cursor: "pointer",
            fontFamily: "inherit", textDecoration: "underline", marginTop: 4
          }}>
            ¿No tienes cuenta? Regístrate aquí
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PANTALLA REGISTRO ─────────────────────────────────────────────
function PantallaRegistro({ usuarios, onRegistroExitoso, onVolver }) {
  const [paso, setPaso] = useState(1); // 1=formulario, 2=verificar email
  const [form, setForm] = useState({ nombre: "", email: "", celular: "", username: "", password: "", confirmar: "", rol: "trabajador", claveJefe: "" });
  const [codigoGenerado, setCodigoGenerado] = useState("");
  const [codigoIngresado, setCodigoIngresado] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validarFormulario = () => {
    if (!form.nombre.trim()) return "Ingresa tu nombre completo.";
    if (!form.email.includes("@")) return "Ingresa un correo válido.";
    if (form.celular.length < 9) return "Ingresa un número de celular válido.";
    if (!form.username.trim()) return "Elige un nombre de usuario.";
    if (form.password.length < 6) return "La contraseña debe tener al menos 6 caracteres.";
    if (form.password !== form.confirmar) return "Las contraseñas no coinciden.";
    if (usuarios.find(u => u.username === form.username)) return "Ese nombre de usuario ya existe.";
    if (usuarios.find(u => u.email === form.email)) return "Ese correo ya está registrado.";
    if (form.rol === "jefe" && form.claveJefe !== MASTER_PASSWORD) return "Contraseña maestra incorrecta para crear cuenta de Jefe.";
    return null;
  };

  const enviarCodigo = async () => {
    const err = validarFormulario();
    if (err) { setError(err); return; }
    setError("");
    setEnviando(true);
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    setCodigoGenerado(codigo);
    try {
      const ok = await enviarCodigoEmailJS(form.email, codigo, form.nombre);
      if (ok) {
        setPaso(2);
      } else {
        // Si EmailJS no está configurado, mostrar el código en pantalla para desarrollo
        setError(`EmailJS no configurado. Código de prueba: ${codigo} (solo para desarrollo)`);
        setCodigoGenerado(codigo);
        setPaso(2);
      }
    } catch {
      setError(`Código de verificación (modo offline): ${codigo}`);
      setCodigoGenerado(codigo);
      setPaso(2);
    }
    setEnviando(false);
  };

  const verificarCodigo = () => {
    if (codigoIngresado !== codigoGenerado) { setError("Código incorrecto. Inténtalo de nuevo."); return; }
    onRegistroExitoso({
      id: Date.now(),
      nombre: form.nombre,
      email: form.email,
      celular: form.celular,
      username: form.username,
      password: form.password,
      rol: form.rol,
      verificado: true,
    });
  };

  return (
    <div style={{
      minHeight: "100vh", background: "linear-gradient(135deg, #059669 0%, #065f46 100%)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20
    }}>
      <div style={{ background: "#fff", borderRadius: 24, padding: 40, width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
          <button onClick={onVolver} style={{ background: "#F3F4F6", border: "none", borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700 }}>← Volver</button>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>{paso === 1 ? "Crear Cuenta" : "Verificar Email"}</div>
            <div style={{ fontSize: 12, color: "#6B7280" }}>{paso === 1 ? "Paso 1 de 2" : "Paso 2 de 2"}</div>
          </div>
        </div>

        {paso === 1 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Input label="Nombre completo *" value={form.nombre} onChange={e => set("nombre", e.target.value)} placeholder="Tu nombre" />
              <Input label="Celular *" value={form.celular} onChange={e => set("celular", e.target.value)} placeholder="9XXXXXXXX" />
            </div>
            <Input label="Correo electrónico *" type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="correo@ejemplo.com" />
            <Input label="Nombre de usuario *" value={form.username} onChange={e => set("username", e.target.value)} placeholder="usuario123" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Input label="Contraseña *" type="password" value={form.password} onChange={e => set("password", e.target.value)} placeholder="Mín. 6 caracteres" />
              <Input label="Confirmar contraseña *" type="password" value={form.confirmar} onChange={e => set("confirmar", e.target.value)} placeholder="Repetir contraseña" />
            </div>

            {/* Selector de rol */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Tipo de cuenta *</div>
              <div style={{ display: "flex", gap: 10 }}>
                {[{ key: "trabajador", label: "👤 Trabajador", desc: "Acceso estándar" }, { key: "jefe", label: "👑 Jefe", desc: "Acceso completo" }].map(r => (
                  <button key={r.key} onClick={() => set("rol", r.key)} style={{
                    flex: 1, padding: "12px 8px", borderRadius: 12, cursor: "pointer",
                    border: `2px solid ${form.rol === r.key ? (r.key === "jefe" ? "#F59E0B" : "#1D4ED8") : "#E5E7EB"}`,
                    background: form.rol === r.key ? (r.key === "jefe" ? "#FFFBEB" : "#EFF6FF") : "#fff",
                    fontFamily: "inherit", textAlign: "center"
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: form.rol === r.key ? (r.key === "jefe" ? "#92400E" : "#1D4ED8") : "#374151" }}>{r.label}</div>
                    <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{r.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {form.rol === "jefe" && (
              <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#92400E", marginBottom: 8 }}>🔐 Contraseña Maestra Requerida</div>
                <Input label="Contraseña del Jefe" type="password" value={form.claveJefe} onChange={e => set("claveJefe", e.target.value)} placeholder="Solo el jefe la conoce" />
                <div style={{ fontSize: 11, color: "#92400E", marginTop: 6 }}>Las cuentas de Jefe requieren autorización especial.</div>
              </div>
            )}

            {error && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#DC2626" }}>⚠️ {error}</div>}

            <Btn onClick={enviarCodigo} disabled={enviando} variant="success" style={{ padding: "12px 0", fontSize: 15 }}>
              {enviando ? "⏳ Enviando código..." : "Continuar → Verificar Email"}
            </Btn>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "#ECFDF5", border: "1px solid #6EE7B7", borderRadius: 12, padding: 16, textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📧</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#065f46" }}>Código enviado a:</div>
              <div style={{ fontSize: 14, color: "#374151", marginTop: 4 }}>{form.email}</div>
              <div style={{ fontSize: 12, color: "#6B7280", marginTop: 6 }}>Ingresa el código de 6 dígitos que recibiste</div>
            </div>
            <Input label="Código de verificación" value={codigoIngresado} onChange={e => setCodigoIngresado(e.target.value)}
              placeholder="000000" style={{ textAlign: "center", fontSize: 24, letterSpacing: 8, fontWeight: 800 }} />
            {error && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#DC2626" }}>⚠️ {error}</div>}
            <Btn variant="success" onClick={verificarCodigo} style={{ padding: "12px 0", fontSize: 15 }}>✅ Verificar y Crear Cuenta</Btn>
            <button onClick={() => setPaso(1)} style={{ background: "none", border: "none", color: "#6B7280", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>← Volver a editar datos</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MODAL NUEVO PACIENTE ──────────────────────────────────────────
function ModalNuevoPaciente({ onClose, onSave, sucursalActual }) {
  const [form, setForm] = useState({
    dni: "", nombre: "", apellidos: "", telefono: "",
    sucursal: sucursalActual,
    tipoLente: "", tratamiento: "", detalleTratamiento: "", montura: "", materialLuna: "",
    total: "", adelanto: "", metodoPago: "Efectivo",
    graduacion: graduacionVacia(), fecha: today(), fechaEntrega: "", observaciones: "",
  });
  const [buscandoDni, setBuscandoDni] = useState(false);
  const [dniError, setDniError] = useState("");
  const [dniExito, setDniExito] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const buscarDni = async () => {
    if (form.dni.length !== 8) return setDniError("El DNI debe tener 8 dígitos");
    setBuscandoDni(true); setDniError(""); setDniExito(false);
    try {
      const res = await fetch(`https://api.apis.net.pe/v2/reniec/dni?numero=${form.dni}`, {
        headers: { Authorization: "Bearer apis-token-13017.GbHs7CwRCPnWtMIRqkl0oTieSWByK6Bz", Accept: "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.nombres) {
          set("nombre", data.nombres);
          set("apellidos", `${data.apellidoPaterno || ""} ${data.apellidoMaterno || ""}`.trim());
          setDniExito(true); setBuscandoDni(false); return;
        }
      }
    } catch (_) {}
    try {
      const res2 = await fetch(`https://apiperu.dev/api/dni/${form.dni}`, { headers: { Accept: "application/json" } });
      if (res2.ok) {
        const data2 = await res2.json();
        if (data2.data?.nombre_completo) {
          const partes = data2.data.nombre_completo.split(" ");
          set("apellidos", `${partes[0] || ""} ${partes[1] || ""}`.trim());
          set("nombre", partes.slice(2).join(" "));
          setDniExito(true); setBuscandoDni(false); return;
        }
      }
    } catch (_) {}
    setDniError("No se pudo consultar el DNI. Ingresa el nombre manualmente.");
    setBuscandoDni(false);
  };

  const guardar = () => {
    const nombreCompleto = `${form.nombre} ${form.apellidos}`.trim();
    if (!nombreCompleto || !form.total || !form.adelanto) return alert("Completa nombre, total y adelanto.");
    const nuevo = {
      id: Date.now(), dni: form.dni,
      nombre: nombreCompleto, telefono: form.telefono, sucursal: form.sucursal,
      fecha: form.fecha, fechaEntrega: form.fechaEntrega,
      tipoLente: form.tipoLente, tratamiento: form.tratamiento,
      detalleTratamiento: form.detalleTratamiento, montura: form.montura, materialLuna: form.materialLuna,
      observaciones: form.observaciones, total: parseFloat(form.total),
      graduacion: form.graduacion,
      abonos: [{ monto: parseFloat(form.adelanto), fecha: form.fecha, nota: "Adelanto inicial", metodo: form.metodoPago }],
      estado: "PEDIDO",
    };
    onSave(nuevo);
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <Card style={{ width: "100%", maxWidth: 620, maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#111827" }}>Nuevo Paciente</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#9CA3AF" }}>✕</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "#F0F9FF", borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0369A1", marginBottom: 10 }}>🪪 Datos del Paciente</div>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <Input label="DNI" value={form.dni} onChange={e => { set("dni", e.target.value); setDniError(""); setDniExito(false); }} placeholder="8 dígitos" maxLength={8} />
              </div>
              <Btn onClick={buscarDni} disabled={buscandoDni || form.dni.length !== 8} style={{ height: 40, whiteSpace: "nowrap" }}>
                {buscandoDni ? "⏳..." : "🔍 Buscar DNI"}
              </Btn>
            </div>
            {dniExito && <div style={{ fontSize: 12, color: "#059669", marginBottom: 8, background: "#ECFDF5", padding: "6px 10px", borderRadius: 8 }}>✅ DNI encontrado</div>}
            {dniError && <div style={{ fontSize: 12, color: "#DC2626", marginBottom: 8, background: "#FEF2F2", padding: "6px 10px", borderRadius: 8 }}>⚠️ {dniError}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Input label="Nombres *" value={form.nombre} onChange={e => set("nombre", e.target.value)} />
              <Input label="Apellidos *" value={form.apellidos} onChange={e => set("apellidos", e.target.value)} />
            </div>
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Input label="Teléfono WhatsApp" value={form.telefono} onChange={e => set("telefono", e.target.value)} placeholder="9XXXXXXXX" />
              <Select label="Sucursal" value={form.sucursal} onChange={e => set("sucursal", e.target.value)}
                options={SUCURSALES.map(s => ({ value: s, label: s }))} />
            </div>
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Input label="Fecha de compra" type="date" value={form.fecha} onChange={e => set("fecha", e.target.value)} />
              <Input label="Fecha estimada de entrega" type="date" value={form.fechaEntrega} onChange={e => set("fechaEntrega", e.target.value)} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>👁 Graduación</div>
            <CuadroGraduacion graduacion={form.graduacion} onChange={g => set("graduacion", g)} />
          </div>
          <SeccionCompra form={form} set={set} />
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Observaciones</label>
            <textarea value={form.observaciones} onChange={e => set("observaciones", e.target.value)}
              placeholder="Notas adicionales..." style={{ width: "100%", marginTop: 5, border: "1.5px solid #D1D5DB", borderRadius: 10, padding: "9px 13px", fontSize: 14, fontFamily: "inherit", background: "#FAFAFA", resize: "vertical", minHeight: 60, outline: "none", boxSizing: "border-box" }}
              onFocus={e => e.target.style.borderColor = "#1D4ED8"} onBlur={e => e.target.style.borderColor = "#D1D5DB"} />
          </div>
          <div style={{ background: "#F0FDF4", borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#059669", marginBottom: 10 }}>💰 Pago Inicial</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <Input label="Precio total (S/) *" type="number" value={form.total} onChange={e => set("total", e.target.value)} placeholder="0.00" />
              <Input label="Adelanto (S/) *" type="number" value={form.adelanto} onChange={e => set("adelanto", e.target.value)} placeholder="0.00" />
              <Select label="Método de pago" value={form.metodoPago} onChange={e => set("metodoPago", e.target.value)} options={METODOS_PAGO.map(m => ({ value: m, label: m }))} />
            </div>
            {form.total && form.adelanto && (
              <div style={{ background: "#ECFDF5", borderRadius: 10, padding: 10, marginTop: 10, fontSize: 13 }}>
                💰 Saldo pendiente: <strong style={{ color: "#1D4ED8" }}>{fmt(parseFloat(form.total || 0) - parseFloat(form.adelanto || 0))}</strong>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
            <Btn onClick={guardar}>Guardar Paciente</Btn>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── MODAL DETALLE PACIENTE ────────────────────────────────────────
function ModalDetalle({ paciente, onClose, onUpdate, onEliminar, esJefe }) {
  const [p, setP] = useState({ ...paciente, graduacion: paciente.graduacion || graduacionVacia() });
  const [nuevoAbono, setNuevoAbono] = useState("");
  const [notaAbono, setNotaAbono] = useState("Abono");
  const [metodoAbono, setMetodoAbono] = useState("Efectivo");
  const [whatsappSent, setWhatsappSent] = useState(false);
  const [modoEditar, setModoEditar] = useState(false);
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);

  const saldo = saldoPendiente(p);
  const abonado = totalAbonado(p);
  const setField = (k, v) => setP(prev => ({ ...prev, [k]: v }));
  const cambiarEstado = (nuevoEstado) => { setP({ ...p, estado: nuevoEstado }); if (nuevoEstado === "LISTO") setWhatsappSent(false); };
  const guardarEdicion = () => { onUpdate(p); setModoEditar(false); };
  const agregarAbono = () => {
    const monto = parseFloat(nuevoAbono);
    if (!monto || monto <= 0) return alert("Ingresa un monto válido");
    if (monto > saldo) return alert(`El abono (${fmt(monto)}) supera el saldo (${fmt(saldo)})`);
    const updated = { ...p, abonos: [...p.abonos, { monto, fecha: today(), nota: notaAbono, metodo: metodoAbono }], estado: monto >= saldo ? "RECOGIDO" : p.estado };
    setP(updated); onUpdate(updated); setNuevoAbono(""); setNotaAbono("Abono");
  };
  const enviarWhatsApp = () => { abrirWhatsApp(p); setWhatsappSent(true); };
  const porcentaje = Math.min((abonado / p.total) * 100, 100);
  const estadoCambiado = p.estado !== paciente.estado;
  const descripcionCompra = [p.tipoLente, p.tratamiento === "Digital" ? `Digital - ${p.detalleTratamiento}` : p.tratamiento, p.materialLuna && `Luna: ${p.materialLuna}`, p.montura && `Montura: ${p.montura}`].filter(Boolean).join(" · ");

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <Card style={{ width: "100%", maxWidth: 600, maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#111827" }}>{p.nombre}</h2>
            <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
              {p.dni && `DNI: ${p.dni} · `}{p.sucursal} · {p.fecha}{p.fechaEntrega && ` · Entrega: ${p.fechaEntrega}`}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {esJefe && !modoEditar && (
              <Btn variant="danger" onClick={() => setConfirmarEliminar(true)} style={{ fontSize: 12, padding: "7px 12px" }}>🗑 Eliminar</Btn>
            )}
            <Btn variant={modoEditar ? "warning" : "ghost"} onClick={() => setModoEditar(!modoEditar)} style={{ fontSize: 12, padding: "7px 14px" }}>
              {modoEditar ? "✕ Cancelar" : "✏️ Editar"}
            </Btn>
            <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#9CA3AF" }}>✕</button>
          </div>
        </div>

        {confirmarEliminar && (
          <div style={{ background: "#FEF2F2", border: "2px solid #FECACA", borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#DC2626", marginBottom: 10 }}>⚠️ ¿Eliminar a {p.nombre}?</div>
            <div style={{ fontSize: 13, color: "#374151", marginBottom: 12 }}>Esta acción no se puede deshacer.</div>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn variant="ghost" onClick={() => setConfirmarEliminar(false)} style={{ flex: 1 }}>Cancelar</Btn>
              <Btn variant="danger" onClick={() => { onEliminar(p.id); onClose(); }} style={{ flex: 1 }}>Sí, eliminar</Btn>
            </div>
          </div>
        )}

        {modoEditar ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Input label="Nombre" value={p.nombre} onChange={e => setField("nombre", e.target.value)} />
              <Input label="Teléfono" value={p.telefono} onChange={e => setField("telefono", e.target.value)} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Input label="Fecha pedido" type="date" value={p.fecha} onChange={e => setField("fecha", e.target.value)} />
              <Input label="Fecha entrega" type="date" value={p.fechaEntrega || ""} onChange={e => setField("fechaEntrega", e.target.value)} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 8 }}>👁 Graduación</div>
              <CuadroGraduacion graduacion={p.graduacion} onChange={g => setField("graduacion", g)} />
            </div>
            <SeccionCompra form={p} set={setField} />
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Observaciones</label>
              <textarea value={p.observaciones || ""} onChange={e => setField("observaciones", e.target.value)}
                style={{ width: "100%", marginTop: 5, border: "1.5px solid #D1D5DB", borderRadius: 10, padding: "9px 13px", fontSize: 14, fontFamily: "inherit", background: "#FAFAFA", resize: "vertical", minHeight: 60, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Btn variant="ghost" onClick={() => { setP({ ...paciente, graduacion: paciente.graduacion || graduacionVacia() }); setModoEditar(false); }}>Cancelar</Btn>
              <Btn variant="success" onClick={guardarEdicion}>✓ Guardar Cambios</Btn>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div style={{ background: "#F9FAFB", borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, marginBottom: 4 }}>PEDIDO</div>
                <div style={{ fontSize: 13, color: "#111827" }}>{descripcionCompra || "—"}</div>
              </div>
              {p.observaciones && (
                <div style={{ background: "#FFFBEB", borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: 11, color: "#92400E", fontWeight: 600, marginBottom: 4 }}>OBSERVACIONES</div>
                  <div style={{ fontSize: 13, color: "#374151" }}>{p.observaciones}</div>
                </div>
              )}
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>GRADUACIÓN</div>
              <CuadroGraduacion graduacion={p.graduacion} readOnly />
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>ESTADO DEL PEDIDO</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {Object.keys(ESTADOS).map(k => (
                  <button key={k} onClick={() => cambiarEstado(k)} style={{
                    padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                    border: `2px solid ${p.estado === k ? ESTADOS[k].color : "#E5E7EB"}`,
                    background: p.estado === k ? ESTADOS[k].bg : "#fff",
                    color: p.estado === k ? ESTADOS[k].color : "#6B7280", cursor: "pointer", fontFamily: "inherit"
                  }}>{ESTADOS[k].label}</button>
                ))}
              </div>
              {p.estado === "LISTO" && estadoCambiado && (
                <div style={{ marginTop: 10, background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 10, padding: 10, fontSize: 12, color: "#92400E" }}>
                  📱 Al presionar <strong>Guardar</strong>, se abrirá WhatsApp automáticamente.
                </div>
              )}
              {estadoCambiado && (
                <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Btn variant="success" onClick={() => onUpdate(p)}>💾 Guardar Estado</Btn>
                  {p.estado === "LISTO" && p.telefono && (
                    <Btn variant="whatsapp" onClick={() => { onUpdate(p); abrirWhatsApp(p); setWhatsappSent(true); }}>📱 Guardar + WhatsApp</Btn>
                  )}
                </div>
              )}
            </div>
            {p.estado === "LISTO" && !estadoCambiado && (
              <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 12, padding: 14, marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: "#166534", fontWeight: 600, marginBottom: 8 }}>🎉 ¡El trabajo está listo! Notifica al paciente</div>
                {p.telefono ? (
                  <Btn variant="whatsapp" onClick={enviarWhatsApp}>{whatsappSent ? "✓ WhatsApp enviado" : "📱 Enviar WhatsApp"}</Btn>
                ) : (
                  <div style={{ fontSize: 12, color: "#6B7280" }}>⚠️ No hay teléfono registrado</div>
                )}
              </div>
            )}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 10 }}>PAGOS</div>
              <div style={{ background: "#E5E7EB", borderRadius: 99, height: 8, marginBottom: 10 }}>
                <div style={{ width: `${porcentaje}%`, background: porcentaje === 100 ? "#10B981" : "#1D4ED8", borderRadius: 99, height: "100%", transition: "width 0.4s" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
                {[{ label: "TOTAL", val: fmt(p.total), color: "#111827", bg: "#F9FAFB" },
                  { label: "ABONADO", val: fmt(abonado), color: "#059669", bg: "#ECFDF5" },
                  { label: "SALDO", val: fmt(saldo), color: saldo > 0 ? "#DC2626" : "#059669", bg: saldo > 0 ? "#FEF2F2" : "#F0FDF4" }
                ].map(item => (
                  <div key={item.label} style={{ textAlign: "center", background: item.bg, borderRadius: 10, padding: 10 }}>
                    <div style={{ fontSize: 11, color: item.color }}>{item.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: item.color }}>{item.val}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 6, fontWeight: 600 }}>HISTORIAL DE ABONOS</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                {p.abonos.map((a, i) => {
                  const mc = { "Efectivo": "#16A34A", "Yape": "#7C3AED", "Plin": "#0284C7", "POS": "#1D4ED8", "Transferencia": "#1D4ED8" }[a.metodo] || "#6B7280";
                  return (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F9FAFB", borderRadius: 8, padding: "8px 12px", fontSize: 13 }}>
                      <span style={{ color: "#374151" }}>
                        {a.nota}
                        {a.metodo && <span style={{ marginLeft: 8, fontSize: 11, background: `${mc}18`, color: mc, borderRadius: 6, padding: "2px 7px", fontWeight: 700, border: `1px solid ${mc}40` }}>{a.metodo}</span>}
                        <span style={{ color: "#9CA3AF", fontSize: 11, marginLeft: 6 }}>{a.fecha}</span>
                      </span>
                      <span style={{ fontWeight: 700, color: "#059669" }}>+{fmt(a.monto)}</span>
                    </div>
                  );
                })}
              </div>
              {saldo > 0 && p.estado !== "RECOGIDO" && (
                <div style={{ background: "#EFF6FF", borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#1D4ED8", marginBottom: 10 }}>Registrar nuevo abono</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 10, alignItems: "flex-end" }}>
                    <Input label="Monto (S/)" type="number" value={nuevoAbono} onChange={e => setNuevoAbono(e.target.value)} placeholder="0.00" />
                    <Input label="Nota" value={notaAbono} onChange={e => setNotaAbono(e.target.value)} />
                    <Select label="Método" value={metodoAbono} onChange={e => setMetodoAbono(e.target.value)} options={METODOS_PAGO.map(m => ({ value: m, label: m }))} />
                    <Btn variant="success" onClick={agregarAbono} style={{ height: 40 }}>+ Agregar</Btn>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
        {!modoEditar && (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={onClose}>Cerrar</Btn>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── DASHBOARD ─────────────────────────────────────────────────────
function Dashboard({ pacientes }) {
  const hoy = today();
  const ingresosHoy = pacientes.flatMap(p => p.abonos.filter(a => a.fecha === hoy)).reduce((s, a) => s + a.monto, 0);
  const pendientes = pacientes.filter(p => saldoPendiente(p) > 0 && p.estado !== "RECOGIDO");
  const totalPendiente = pendientes.reduce((s, p) => s + saldoPendiente(p), 0);
  const listos = pacientes.filter(p => p.estado === "LISTO");
  const enLab = pacientes.filter(p => p.estado === "EN_LABORATORIO");
  const porSucursal = SUCURSALES.map(s => ({
    nombre: s,
    total: pacientes.filter(p => p.sucursal === s).flatMap(p => p.abonos).reduce((s, a) => s + a.monto, 0),
    pacientes: pacientes.filter(p => p.sucursal === s).length,
  }));
  const ingresosPorMetodo = METODOS_PAGO.map(m => ({
    metodo: m,
    total: pacientes.flatMap(p => p.abonos.filter(a => a.fecha === hoy && a.metodo === m)).reduce((s, a) => s + a.monto, 0),
  })).filter(m => m.total > 0);
  const coloresPago = {
    "Efectivo": { bg: "#F0FDF4", label: "#166534", value: "#16A34A" },
    "Yape": { bg: "#F5F3FF", label: "#6B21A8", value: "#7C3AED" },
    "Plin": { bg: "#E0F2FE", label: "#0369A1", value: "#0284C7" },
    "POS": { bg: "#EFF6FF", label: "#1E40AF", value: "#1D4ED8" },
    "Transferencia": { bg: "#EFF6FF", label: "#1E40AF", value: "#1D4ED8" },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
        <StatCard label="Ingresos Hoy" value={fmt(ingresosHoy)} sub="todos los abonos de hoy" color="#1D4ED8" icon="💰" />
        <StatCard label="Por Cobrar" value={fmt(totalPendiente)} sub={`${pendientes.length} pacientes`} color="#DC2626" icon="📋" />
        <StatCard label="Listos p/ Entregar" value={listos.length} sub="notificar pacientes" color="#10B981" icon="✅" />
        <StatCard label="En Laboratorio" value={enLab.length} sub="en proceso" color="#F59E0B" icon="🔬" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {porSucursal.map(s => (
          <Card key={s.nombre}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 14 }}>{s.nombre}</div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div><div style={{ fontSize: 11, color: "#6B7280" }}>TOTAL RECAUDADO</div><div style={{ fontSize: 22, fontWeight: 800, color: "#1D4ED8" }}>{fmt(s.total)}</div></div>
              <div style={{ textAlign: "right" }}><div style={{ fontSize: 11, color: "#6B7280" }}>PACIENTES</div><div style={{ fontSize: 22, fontWeight: 800, color: "#374151" }}>{s.pacientes}</div></div>
            </div>
          </Card>
        ))}
      </div>
      {ingresosPorMetodo.length > 0 && (
        <Card>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 14 }}>💳 Ingresos de Hoy por Método de Pago</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {ingresosPorMetodo.map(m => {
              const c = coloresPago[m.metodo] || { bg: "#F3F4F6", label: "#374151", value: "#111827" };
              return <div key={m.metodo} style={{ background: c.bg, borderRadius: 10, padding: "10px 16px", textAlign: "center", minWidth: 110, border: `1.5px solid ${c.value}30` }}>
                <div style={{ fontSize: 11, color: c.label, fontWeight: 700 }}>{m.metodo.toUpperCase()}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: c.value }}>{fmt(m.total)}</div>
              </div>;
            })}
          </div>
        </Card>
      )}
      {listos.length > 0 && (
        <Card>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#10B981", marginBottom: 14 }}>🔔 Pacientes listos para entregar</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {listos.map(p => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F0FDF4", borderRadius: 10, padding: "10px 14px" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{p.nombre}</div>
                  <div style={{ fontSize: 12, color: "#6B7280" }}>{p.sucursal} · Saldo: {fmt(saldoPendiente(p))}</div>
                </div>
                {p.telefono && (
                  <button onClick={() => abrirWhatsApp(p)} style={{ background: "#25D366", color: "#fff", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer" }}>
                    📱 WhatsApp
                  </button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── VISTA PACIENTES ───────────────────────────────────────────────
function Pacientes({ pacientes, onUpdate, onEliminar, sucursalFiltro, esJefe }) {
  const [buscar, setBuscar] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("TODOS");
  const [detalle, setDetalle] = useState(null);

  const filtrados = pacientes.filter(p => {
    const matchSucursal = sucursalFiltro === "Todas" || p.sucursal === sucursalFiltro;
    const matchEstado = estadoFiltro === "TODOS" || p.estado === estadoFiltro;
    const matchBuscar = p.nombre.toLowerCase().includes(buscar.toLowerCase()) || p.telefono?.includes(buscar) || p.dni?.includes(buscar);
    return matchSucursal && matchEstado && matchBuscar;
  });

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="🔍 Buscar por nombre, DNI o teléfono..."
          style={{ flex: 1, minWidth: 200, border: "1.5px solid #D1D5DB", borderRadius: 10, padding: "9px 13px", fontSize: 14, fontFamily: "inherit", background: "#fff" }} />
        <select value={estadoFiltro} onChange={e => setEstadoFiltro(e.target.value)}
          style={{ border: "1.5px solid #D1D5DB", borderRadius: 10, padding: "9px 13px", fontSize: 14, fontFamily: "inherit", background: "#fff", cursor: "pointer" }}>
          <option value="TODOS">Todos los estados</option>
          {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtrados.length === 0 && <Card><div style={{ textAlign: "center", color: "#9CA3AF", padding: 30 }}>No se encontraron pacientes</div></Card>}
        {filtrados.map(p => {
          const saldo = saldoPendiente(p);
          const abonado = totalAbonado(p);
          const pct = Math.min((abonado / p.total) * 100, 100);
          const desc = [p.tipoLente, p.tratamiento === "Digital" ? `Digital - ${p.detalleTratamiento}` : p.tratamiento, p.materialLuna && `Luna: ${p.materialLuna}`, p.montura && `Montura: ${p.montura}`].filter(Boolean).join(" · ");
          return (
            <Card key={p.id} style={{ cursor: "pointer" }} onClick={() => setDetalle(p)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <span style={{ fontWeight: 800, fontSize: 15, color: "#111827" }}>{p.nombre}</span>
                    <Badge estado={p.estado} />
                    {p.fechaEntrega && <span style={{ fontSize: 11, color: "#6B7280", background: "#F3F4F6", borderRadius: 6, padding: "2px 7px" }}>📅 Entrega: {p.fechaEntrega}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 6 }}>{p.sucursal} · {p.fecha} {p.dni && `· DNI: ${p.dni}`} {p.telefono && `· 📱 ${p.telefono}`}</div>
                  {desc && <div style={{ fontSize: 13, color: "#374151", marginBottom: 8 }}>{desc}</div>}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1, background: "#E5E7EB", borderRadius: 99, height: 6 }}>
                      <div style={{ width: `${pct}%`, background: pct === 100 ? "#10B981" : "#1D4ED8", borderRadius: 99, height: "100%" }} />
                    </div>
                    <span style={{ fontSize: 11, color: "#6B7280", whiteSpace: "nowrap" }}>{fmt(abonado)} / {fmt(p.total)}</span>
                  </div>
                </div>
                <div style={{ textAlign: "right", minWidth: 80 }}>
                  {saldo > 0 ? <><div style={{ fontSize: 11, color: "#DC2626", fontWeight: 600 }}>SALDO</div><div style={{ fontSize: 18, fontWeight: 800, color: "#DC2626" }}>{fmt(saldo)}</div></> : <div style={{ fontSize: 12, fontWeight: 700, color: "#10B981" }}>✓ Pagado</div>}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      {detalle && <ModalDetalle paciente={detalle} onClose={() => setDetalle(null)} onUpdate={p => { onUpdate(p); setDetalle(p); }} onEliminar={onEliminar} esJefe={esJefe} />}
    </div>
  );
}

// ─── VISTA CUENTAS ─────────────────────────────────────────────────
function Cuentas({ pacientes, sucursalFiltro }) {
  const pendientes = pacientes.filter(p => saldoPendiente(p) > 0 && p.estado !== "RECOGIDO" && (sucursalFiltro === "Todas" || p.sucursal === sucursalFiltro));
  const totalPend = pendientes.reduce((s, p) => s + saldoPendiente(p), 0);
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 20 }}>
        <StatCard label="Total por cobrar" value={fmt(totalPend)} sub={`${pendientes.length} cuentas abiertas`} color="#DC2626" icon="📋" />
      </div>
      <Card>
        <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 14 }}>Cuentas por cobrar</div>
        {pendientes.length === 0 ? <div style={{ textAlign: "center", color: "#10B981", padding: 30, fontWeight: 600 }}>🎉 No hay cuentas pendientes</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ borderBottom: "2px solid #E5E7EB" }}>
              {["Paciente","Sucursal","Pedido","Total","Abonado","Saldo","Estado"].map(h => <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontSize: 11, color: "#6B7280", fontWeight: 700, textTransform: "uppercase" }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {pendientes.map(p => (
                <tr key={p.id} style={{ borderBottom: "1px solid #F3F4F6" }}>
                  <td style={{ padding: "10px 12px", fontWeight: 600, color: "#111827" }}>{p.nombre}</td>
                  <td style={{ padding: "10px 12px", color: "#6B7280" }}>{p.sucursal}</td>
                  <td style={{ padding: "10px 12px", color: "#374151", fontSize: 12 }}>{[p.tipoLente, p.tratamiento].filter(Boolean).join(" · ") || "—"}</td>
                  <td style={{ padding: "10px 12px" }}>{fmt(p.total)}</td>
                  <td style={{ padding: "10px 12px", color: "#059669" }}>{fmt(totalAbonado(p))}</td>
                  <td style={{ padding: "10px 12px", color: "#DC2626", fontWeight: 700 }}>{fmt(saldoPendiente(p))}</td>
                  <td style={{ padding: "10px 12px" }}><Badge estado={p.estado} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

// ─── VISTA DIRECTORIO ──────────────────────────────────────────────
function Directorio({ pacientes, onUpdate, onEliminar, esJefe }) {
  const [buscar, setBuscar] = useState("");
  const [detalle, setDetalle] = useState(null);
  const termino = buscar.trim().toLowerCase();
  const soloAlfanumerico = termino.replace(/[^a-z0-9áéíóúüñ]/gi, "").toLowerCase();
  const terminoValido = soloAlfanumerico.length >= 2;
  const filtrados = !terminoValido ? [] : pacientes.filter(p => {
    const nombreNorm = p.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const terminoNorm = soloAlfanumerico.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const telLimpio = (p.telefono || "").replace(/\D/g, "");
    const terminoNum = soloAlfanumerico.replace(/\D/g, "");
    return nombreNorm.includes(terminoNorm) || (p.dni && p.dni.includes(soloAlfanumerico)) || (telLimpio && terminoNum.length >= 2 && telLimpio.includes(terminoNum));
  });
  const ordenados = [...filtrados].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 20 }}>
        <StatCard label="Total Pacientes" value={pacientes.length} sub="histórico completo" color="#1D4ED8" icon="🗂️" />
        <StatCard label="Atendidos" value={pacientes.filter(p => p.estado === "RECOGIDO").length} sub="pedidos recogidos" color="#10B981" icon="✅" />
        <StatCard label="En proceso" value={pacientes.filter(p => p.estado !== "RECOGIDO").length} sub="pedidos activos" color="#F59E0B" icon="🔬" />
      </div>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 12 }}>🗂️ Directorio de Pacientes</div>
        <input value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="🔍 Buscar por nombre, DNI o celular..." autoFocus
          style={{ width: "100%", boxSizing: "border-box", border: "2px solid #1D4ED8", borderRadius: 12, padding: "11px 16px", fontSize: 15, fontFamily: "inherit", background: "#F0F9FF", outline: "none" }} />
        {buscar && <div style={{ marginTop: 8, fontSize: 13, color: terminoValido ? "#6B7280" : "#F59E0B" }}>
          {!terminoValido ? "✏️ Escribe al menos 2 letras..." : filtrados.length === 0 ? "❌ No se encontraron pacientes." : `✅ ${filtrados.length} resultado(s)`}
        </div>}
      </Card>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {(!buscar || !terminoValido) && (
          <Card style={{ background: "#F8FAFF", border: "1.5px dashed #BFDBFE" }}>
            <div style={{ textAlign: "center", padding: 24, color: "#6B7280" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>👆</div>
              <div style={{ fontWeight: 600, color: "#374151" }}>Escribe en el buscador para encontrar un paciente</div>
            </div>
          </Card>
        )}
        {ordenados.map(p => {
          const saldo = saldoPendiente(p); const abonado = totalAbonado(p); const pct = Math.min((abonado / p.total) * 100, 100);
          return (
            <Card key={p.id} style={{ cursor: "pointer" }} onClick={() => setDetalle(p)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 800, fontSize: 15, color: "#111827" }}>{p.nombre}</span><Badge estado={p.estado} />
                  </div>
                  <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 6 }}>
                    {p.dni && <span style={{ marginRight: 10 }}>🪪 {p.dni}</span>}
                    {p.telefono && <span style={{ marginRight: 10 }}>📱 {p.telefono}</span>}
                    <span style={{ background: "#EFF6FF", color: "#1D4ED8", borderRadius: 6, padding: "2px 8px", fontWeight: 700, fontSize: 11, marginRight: 8, border: "1px solid #BFDBFE" }}>🏪 {p.sucursal}</span>
                    <span>{p.fecha}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#374151" }}>{[p.tipoLente, p.tratamiento].filter(Boolean).join(" · ")}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                    <div style={{ flex: 1, background: "#E5E7EB", borderRadius: 99, height: 5 }}>
                      <div style={{ width: `${pct}%`, background: pct === 100 ? "#10B981" : "#1D4ED8", borderRadius: 99, height: "100%" }} />
                    </div>
                    <span style={{ fontSize: 11, color: "#6B7280" }}>{fmt(abonado)} / {fmt(p.total)}</span>
                  </div>
                </div>
                <div style={{ textAlign: "right", minWidth: 80 }}>
                  {saldo > 0 ? <><div style={{ fontSize: 11, color: "#DC2626", fontWeight: 600 }}>SALDO</div><div style={{ fontSize: 16, fontWeight: 800, color: "#DC2626" }}>{fmt(saldo)}</div></> : <div style={{ fontSize: 12, fontWeight: 700, color: "#10B981" }}>✓ Pagado</div>}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      {detalle && <ModalDetalle paciente={detalle} onClose={() => setDetalle(null)} onUpdate={p => { onUpdate(p); setDetalle(p); }} onEliminar={onEliminar} esJefe={esJefe} />}
    </div>
  );
}

// ─── VISTA MOVIMIENTOS ─────────────────────────────────────────────
const CATEGORIAS_GASTO = ["Pago personal","Desayuno","Almuerzo","Cena","Transporte","Materiales","Servicios","Limpieza","Alquiler","Otros"];

function Movimientos({ movimientos, onAdd, sucursalFiltro }) {
  const hoy = today();
  const [form, setForm] = useState({ tipo: "ingreso", monto: "", metodo: "Efectivo", descripcion: "", categoria: "Otros", fecha: hoy, sucursal: sucursalFiltro !== "Todas" ? sucursalFiltro : SUCURSALES[0] });
  const [filtroFecha, setFiltroFecha] = useState(hoy);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const guardar = () => {
    if (!form.monto || parseFloat(form.monto) <= 0) return alert("Ingresa un monto válido");
    if (form.tipo === "gasto" && !form.descripcion.trim()) return alert("Ingresa una descripción del gasto");
    onAdd({ tipo: form.tipo, monto: parseFloat(form.monto), metodo: form.metodo, descripcion: form.descripcion, categoria: form.tipo === "gasto" ? form.categoria : null, fecha: form.fecha, sucursal: form.sucursal });
    setForm(f => ({ ...f, monto: "", descripcion: "", categoria: "Otros" }));
  };

  const filtrados = movimientos.filter(m => {
    const matchFecha = !filtroFecha || m.fecha === filtroFecha;
    const matchTipo = filtroTipo === "todos" || m.tipo === filtroTipo;
    const matchSucursal = sucursalFiltro === "Todas" || m.sucursal === sucursalFiltro;
    return matchFecha && matchTipo && matchSucursal;
  });
  const totalIngresos = filtrados.filter(m => m.tipo === "ingreso").reduce((s, m) => s + m.monto, 0);
  const totalGastos = filtrados.filter(m => m.tipo === "gasto").reduce((s, m) => s + m.monto, 0);
  const coloresMetodo = { "Efectivo": { bg: "#F0FDF4", color: "#16A34A", border: "#86EFAC" }, "Yape": { bg: "#F5F3FF", color: "#7C3AED", border: "#C4B5FD" }, "Plin": { bg: "#E0F2FE", color: "#0284C7", border: "#7DD3FC" }, "POS": { bg: "#EFF6FF", color: "#1D4ED8", border: "#93C5FD" }, "Transferencia": { bg: "#EFF6FF", color: "#1D4ED8", border: "#93C5FD" } };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
        <StatCard label="Ingresos" value={fmt(totalIngresos)} sub={`del ${filtroFecha || "período"}`} color="#059669" icon="📈" />
        <StatCard label="Gastos" value={fmt(totalGastos)} sub={`del ${filtroFecha || "período"}`} color="#DC2626" icon="📉" />
        <StatCard label="Balance" value={fmt(totalIngresos - totalGastos)} sub="neto del período" color={(totalIngresos - totalGastos) >= 0 ? "#1D4ED8" : "#DC2626"} icon="⚖️" />
      </div>
      <Card>
        <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 16 }}>➕ Registrar Movimiento</div>
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          {[{ key: "ingreso", label: "📈 Ingreso", color: "#059669", bg: "#F0FDF4", border: "#86EFAC" }, { key: "gasto", label: "📉 Gasto", color: "#DC2626", bg: "#FEF2F2", border: "#FCA5A5" }].map(t => (
            <button key={t.key} onClick={() => set("tipo", t.key)} style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: `2px solid ${form.tipo === t.key ? t.border : "#E5E7EB"}`, background: form.tipo === t.key ? t.bg : "#fff", color: form.tipo === t.key ? t.color : "#6B7280", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>{t.label}</button>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
          <Input label="Monto (S/) *" type="number" value={form.monto} onChange={e => set("monto", e.target.value)} placeholder="0.00" />
          <Select label="Método" value={form.metodo} onChange={e => set("metodo", e.target.value)} options={["Efectivo","Yape"].map(m => ({ value: m, label: m }))} />
          <Input label="Fecha" type="date" value={form.fecha} onChange={e => set("fecha", e.target.value)} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: form.tipo === "gasto" ? "1fr 1fr 1fr" : "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <Select label="Sucursal" value={form.sucursal} onChange={e => set("sucursal", e.target.value)} options={SUCURSALES.map(s => ({ value: s, label: s }))} />
          {form.tipo === "gasto" && <Select label="Categoría" value={form.categoria} onChange={e => set("categoria", e.target.value)} options={CATEGORIAS_GASTO.map(c => ({ value: c, label: c }))} />}
          <Input label={form.tipo === "gasto" ? "Descripción *" : "Descripción (opcional)"} value={form.descripcion} onChange={e => set("descripcion", e.target.value)} placeholder={form.tipo === "gasto" ? "Ej: Pago personal..." : "Ej: Ingreso extra..."} />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Btn variant={form.tipo === "ingreso" ? "success" : "danger"} onClick={guardar}>{form.tipo === "ingreso" ? "💰 Registrar Ingreso" : "💸 Registrar Gasto"}</Btn>
        </div>
      </Card>
      <Card>
        <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 14 }}>📋 Historial de Movimientos</div>
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <Input label="Filtrar por fecha" type="date" value={filtroFecha} onChange={e => setFiltroFecha(e.target.value)} style={{ maxWidth: 180 }} />
          <Select label="Tipo" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} options={[{ value: "todos", label: "Todos" }, { value: "ingreso", label: "Ingresos" }, { value: "gasto", label: "Gastos" }]} />
          {filtroFecha && <div style={{ alignSelf: "flex-end" }}><Btn variant="ghost" onClick={() => setFiltroFecha("")}>✕ Quitar filtro</Btn></div>}
        </div>
        {filtrados.length === 0 ? <div style={{ textAlign: "center", color: "#9CA3AF", padding: 30 }}><div style={{ fontSize: 28, marginBottom: 8 }}>📭</div><div style={{ fontWeight: 600 }}>Sin movimientos</div></div> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtrados.map(m => {
              const mc = coloresMetodo[m.metodo] || { bg: "#F3F4F6", color: "#374151", border: "#D1D5DB" };
              const esIngreso = m.tipo === "ingreso";
              return (
                <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: esIngreso ? "#F0FDF4" : "#FEF2F2", border: `1px solid ${esIngreso ? "#BBF7D0" : "#FECACA"}`, borderRadius: 10, padding: "12px 16px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{esIngreso ? "📈" : "📉"} {m.descripcion || (esIngreso ? "Ingreso" : "Gasto")}</span>
                      {m.categoria && <span style={{ fontSize: 11, background: "#FEF3C7", color: "#92400E", borderRadius: 6, padding: "2px 8px", fontWeight: 600, border: "1px solid #FDE68A" }}>{m.categoria}</span>}
                      <span style={{ fontSize: 11, background: mc.bg, color: mc.color, borderRadius: 6, padding: "2px 8px", fontWeight: 700, border: `1px solid ${mc.border}` }}>{m.metodo}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#6B7280" }}>{m.sucursal} · {m.fecha}</div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: esIngreso ? "#059669" : "#DC2626" }}>{esIngreso ? "+" : "-"}{fmt(m.monto)}</div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── VISTA REPORTE (con recuadro efectivo en caja) ─────────────────
function Reporte({ pacientes, movimientos, sucursalFiltro, esJefe, onAnularVenta }) {
  const [fechaReporte, setFechaReporte] = useState(today());
  const [sucursalReporte, setSucursalReporte] = useState(sucursalFiltro !== "Todas" ? sucursalFiltro : SUCURSALES[0]);
  const [anularId, setAnularId] = useState(null);

  const pacientesSucursal = pacientes.filter(p => p.sucursal === sucursalReporte);
  const ventasDia = pacientesSucursal.filter(p => p.fecha === fechaReporte);
  const abonosDia = pacientesSucursal.flatMap(p => p.abonos.filter(a => a.fecha === fechaReporte).map(a => ({ ...a, paciente: p.nombre })));
  const movDia = movimientos.filter(m => m.fecha === fechaReporte && m.sucursal === sucursalReporte);
  const ingresosMov = movDia.filter(m => m.tipo === "ingreso");
  const gastosDia = movDia.filter(m => m.tipo === "gasto");

  const totalVentas = ventasDia.reduce((s, p) => s + p.total, 0);
  const totalAbonosDia = abonosDia.reduce((s, a) => s + a.monto, 0);
  const totalGastos = gastosDia.reduce((s, m) => s + m.monto, 0);
  const totalIngresosExtra = ingresosMov.reduce((s, m) => s + m.monto, 0);
  const totalNeto = totalAbonosDia + totalIngresosExtra - totalGastos;

  // ── Cálculo de efectivo en caja ────────────────────────────────
  const abonosEfectivo = abonosDia.filter(a => a.metodo === "Efectivo").reduce((s, a) => s + a.monto, 0);
  const ingresosExtraEfectivo = ingresosMov.filter(m => m.metodo === "Efectivo").reduce((s, m) => s + m.monto, 0);
  const gastosEfectivo = gastosDia.filter(m => m.metodo === "Efectivo").reduce((s, m) => s + m.monto, 0);
  const efectivoEnCaja = abonosEfectivo + ingresosExtraEfectivo - gastosEfectivo;

  const metodoConfig = {
    "Efectivo": { icon: "💵", bg: "#F0FDF4", border: "#86EFAC", color: "#166534", valColor: "#16A34A", totalColor: "#16A34A" },
    "Yape": { icon: "📱", bg: "#F5F3FF", border: "#C4B5FD", color: "#6B21A8", valColor: "#7C3AED", totalColor: "#7C3AED" },
    "Plin": { icon: "💙", bg: "#E0F2FE", border: "#7DD3FC", color: "#0369A1", valColor: "#0284C7", totalColor: "#0284C7" },
    "POS": { icon: "💳", bg: "#EFF6FF", border: "#93C5FD", color: "#1E40AF", valColor: "#1D4ED8", totalColor: "#1D4ED8" },
    "Transferencia": { icon: "🏦", bg: "#F0F9FF", border: "#BAE6FD", color: "#075985", valColor: "#0369A1", totalColor: "#0369A1" },
  };
  const cuadrePorMetodo = METODOS_PAGO.map(m => {
    const abonos = abonosDia.filter(a => a.metodo === m).reduce((s, a) => s + a.monto, 0);
    const extras = ingresosMov.filter(x => x.metodo === m).reduce((s, x) => s + x.monto, 0);
    const gastos = gastosDia.filter(x => x.metodo === m).reduce((s, x) => s + x.monto, 0);
    return { metodo: m, abonos, extras, gastos, total: abonos + extras - gastos };
  }).filter(x => x.abonos > 0 || x.extras > 0 || x.gastos > 0);

  const metodoColor = { "Efectivo": { bg: "#F0FDF4", color: "#16A34A", border: "#86EFAC" }, "Yape": { bg: "#F5F3FF", color: "#7C3AED", border: "#C4B5FD" }, "Plin": { bg: "#E0F2FE", color: "#0284C7", border: "#7DD3FC" }, "POS": { bg: "#EFF6FF", color: "#1D4ED8", border: "#93C5FD" }, "Transferencia": { bg: "#EFF6FF", color: "#1D4ED8", border: "#93C5FD" } };
  const rowStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, padding: "2px 0" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Selector */}
      <Card style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 800, fontSize: 15, color: "#111827" }}>📑 Reporte</span>
          <div style={{ display: "flex", gap: 6 }}>
            {SUCURSALES.map(s => (
              <button key={s} onClick={() => setSucursalReporte(s)} style={{ padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, border: `2px solid ${sucursalReporte === s ? "#1D4ED8" : "#E5E7EB"}`, background: sucursalReporte === s ? "#EFF6FF" : "#fff", color: sucursalReporte === s ? "#1D4ED8" : "#6B7280", cursor: "pointer", fontFamily: "inherit" }}>🏪 {s.replace("Óptica ", "")}</button>
            ))}
          </div>
          <input type="date" value={fechaReporte} onChange={e => setFechaReporte(e.target.value)}
            style={{ border: "1.5px solid #D1D5DB", borderRadius: 8, padding: "6px 10px", fontSize: 12, fontFamily: "inherit", background: "#FAFAFA", outline: "none" }} />
          <button onClick={() => setFechaReporte(today())} style={{ background: "#F3F4F6", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, color: "#374151", cursor: "pointer", fontFamily: "inherit" }}>Hoy</button>
        </div>
      </Card>

      {/* Resumen rápido */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
        {[
          { label: "Ventas", val: fmt(totalVentas), sub: `${ventasDia.length} pedidos`, color: "#1D4ED8", icon: "🛍" },
          { label: "Cobrado", val: fmt(totalAbonosDia), sub: "abonos del día", color: "#059669", icon: "💰" },
          { label: "Gastos", val: fmt(totalGastos), sub: `${gastosDia.length} movs`, color: "#DC2626", icon: "📉" },
          { label: "Neto", val: fmt(totalNeto), sub: "cobrado − gastos", color: totalNeto >= 0 ? "#1D4ED8" : "#DC2626", icon: "⚖️" },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff", borderRadius: 12, padding: "12px 14px", border: "1px solid #E8EEF4", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize: 10, color: "#6B7280", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>{s.icon} {s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.color, marginTop: 3 }}>{s.val}</div>
            <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 1 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* 💵 RECUADRO EFECTIVO EN CAJA */}
      <div style={{ background: "linear-gradient(135deg, #065f46 0%, #059669 100%)", borderRadius: 16, padding: 20, boxShadow: "0 4px 20px rgba(5,150,105,0.3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>💵 EFECTIVO EN CAJA</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>Lo que debe haber físicamente en efectivo</div>
            <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)" }}>
                <span>Cobros efectivo: </span><span style={{ fontWeight: 700, color: "#fff" }}>+{fmt(abonosEfectivo)}</span>
              </div>
              {ingresosExtraEfectivo > 0 && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)" }}>
                <span>Ingresos extra: </span><span style={{ fontWeight: 700, color: "#fff" }}>+{fmt(ingresosExtraEfectivo)}</span>
              </div>}
              {gastosEfectivo > 0 && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)" }}>
                <span>Gastos efectivo: </span><span style={{ fontWeight: 700, color: "#fca5a5" }}>-{fmt(gastosEfectivo)}</span>
              </div>}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 36, fontWeight: 900, color: "#fff" }}>{fmt(efectivoEnCaja)}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 4 }}>al cerrar caja hoy</div>
          </div>
        </div>
      </div>

      {/* Ventas del día */}
      <Card style={{ padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: "#1D4ED8" }}>🛍 Ventas Nuevas ({ventasDia.length})</div>
        </div>
        {ventasDia.length === 0 ? <div style={{ textAlign: "center", color: "#9CA3AF", fontSize: 12, padding: 10 }}>Sin ventas nuevas este día</div> : (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 0.8fr 0.8fr 0.8fr 0.5fr", gap: 4, padding: "4px 8px", background: "#F3F4F6", borderRadius: 6, marginBottom: 4 }}>
              {["Paciente","Pedido","Total","Abono","Saldo", esJefe ? "⚙️" : ""].map(h => <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" }}>{h}</div>)}
            </div>
            {ventasDia.map(p => {
              const abonoHoy = p.abonos.filter(a => a.fecha === fechaReporte).reduce((s, a) => s + a.monto, 0);
              const saldo = saldoPendiente(p);
              const desc = [p.tipoLente, p.tratamiento].filter(Boolean).join(" · ");
              return (
                <div key={p.id} style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 0.8fr 0.8fr 0.8fr 0.5fr", gap: 4, padding: "5px 8px", borderBottom: "1px solid #F3F4F6", alignItems: "center" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nombre}</div>
                  <div style={{ fontSize: 11, color: "#6B7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{desc || "—"}</div>
                  <div style={{ fontSize: 12, color: "#374151", fontWeight: 600 }}>{fmt(p.total)}</div>
                  <div style={{ fontSize: 12, color: "#059669", fontWeight: 700 }}>{fmt(abonoHoy)}</div>
                  <div style={{ fontSize: 12, color: saldo > 0 ? "#DC2626" : "#059669", fontWeight: 700 }}>{saldo > 0 ? fmt(saldo) : "✓"}</div>
                  {esJefe && (
                    <button onClick={() => setAnularId(p.id)} style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, padding: "2px 6px", fontSize: 10, color: "#DC2626", cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>Anular</button>
                  )}
                </div>
              );
            })}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 8px", marginTop: 4, background: "#EFF6FF", borderRadius: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#1D4ED8" }}>TOTAL VENTAS</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#1D4ED8" }}>{fmt(totalVentas)}</span>
            </div>
          </div>
        )}
      </Card>

      {/* Modal de confirmación de anulación */}
      {anularId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <Card style={{ width: "100%", maxWidth: 380 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#DC2626", marginBottom: 12 }}>⚠️ Anular Venta</div>
            <div style={{ fontSize: 14, color: "#374151", marginBottom: 20 }}>¿Confirmas la anulación de la venta de <strong>{pacientes.find(p => p.id === anularId)?.nombre}</strong>? Esta acción no se puede deshacer.</div>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn variant="ghost" onClick={() => setAnularId(null)} style={{ flex: 1 }}>Cancelar</Btn>
              <Btn variant="danger" onClick={() => { onAnularVenta(anularId); setAnularId(null); }} style={{ flex: 1 }}>Sí, Anular</Btn>
            </div>
          </Card>
        </div>
      )}

      {/* Abonos del día */}
      <Card style={{ padding: 14 }}>
        <div style={{ fontWeight: 800, fontSize: 13, color: "#059669", marginBottom: 8 }}>💳 Cobros del Día ({abonosDia.length})</div>
        {abonosDia.length === 0 ? <div style={{ textAlign: "center", color: "#9CA3AF", fontSize: 12, padding: 10 }}>Sin abonos este día</div> : (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 0.8fr", gap: 4, padding: "4px 8px", background: "#F3F4F6", borderRadius: 6, marginBottom: 4 }}>
              {["Paciente","Método","Monto"].map(h => <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" }}>{h}</div>)}
            </div>
            {abonosDia.map((a, i) => {
              const mc = metodoColor[a.metodo] || { bg: "#F3F4F6", color: "#374151", border: "#D1D5DB" };
              return (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 0.8fr", gap: 4, padding: "5px 8px", borderBottom: "1px solid #F3F4F6", alignItems: "center" }}>
                  <div style={{ fontSize: 12, color: "#374151" }}>{a.paciente}</div>
                  <span style={{ background: mc.bg, color: mc.color, border: `1px solid ${mc.border}`, borderRadius: 5, padding: "1px 6px", fontSize: 10, fontWeight: 700, display: "inline-block" }}>{a.metodo}</span>
                  <div style={{ fontSize: 12, color: "#059669", fontWeight: 700 }}>{fmt(a.monto)}</div>
                </div>
              );
            })}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 8px", marginTop: 4, background: "#F0FDF4", borderRadius: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#059669" }}>TOTAL COBRADO</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#059669" }}>{fmt(totalAbonosDia)}</span>
            </div>
          </div>
        )}
      </Card>

      {/* Gastos */}
      {gastosDia.length > 0 && (
        <Card style={{ padding: 14 }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: "#DC2626", marginBottom: 8 }}>📉 Gastos ({gastosDia.length})</div>
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 0.8fr 0.8fr", gap: 4, padding: "4px 8px", background: "#F3F4F6", borderRadius: 6, marginBottom: 4 }}>
              {["Descripción","Categoría","Método","Monto"].map(h => <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" }}>{h}</div>)}
            </div>
            {gastosDia.map(m => {
              const mc = metodoColor[m.metodo] || { bg: "#F3F4F6", color: "#374151", border: "#D1D5DB" };
              return (
                <div key={m.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 0.8fr 0.8fr", gap: 4, padding: "5px 8px", borderBottom: "1px solid #F3F4F6", alignItems: "center" }}>
                  <div style={{ fontSize: 12, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.descripcion || "—"}</div>
                  <div style={{ fontSize: 11, color: "#6B7280" }}>{m.categoria || "—"}</div>
                  <span style={{ background: mc.bg, color: mc.color, border: `1px solid ${mc.border}`, borderRadius: 5, padding: "1px 6px", fontSize: 10, fontWeight: 700, display: "inline-block" }}>{m.metodo}</span>
                  <div style={{ fontSize: 12, color: "#DC2626", fontWeight: 700 }}>-{fmt(m.monto)}</div>
                </div>
              );
            })}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 8px", marginTop: 4, background: "#FEF2F2", borderRadius: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#DC2626" }}>TOTAL GASTOS</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#DC2626" }}>{fmt(totalGastos)}</span>
            </div>
          </div>
        </Card>
      )}

      {/* Cuadre de Caja */}
      <Card style={{ padding: 14 }}>
        <div style={{ fontWeight: 800, fontSize: 13, color: "#374151", marginBottom: 10 }}>🏦 Cuadre de Caja</div>
        <div style={{ display: "grid", gridTemplateColumns: cuadrePorMetodo.length >= 3 ? "repeat(3,1fr)" : `repeat(${Math.max(cuadrePorMetodo.length, 1)},1fr)`, gap: 8 }}>
          {cuadrePorMetodo.length === 0 ? (
            <div style={{ gridColumn: "1/-1", textAlign: "center", color: "#9CA3AF", fontSize: 12, padding: 12 }}>Sin movimientos registrados este día</div>
          ) : cuadrePorMetodo.map(({ metodo, abonos, extras, gastos, total }) => {
            const cfg = metodoConfig[metodo] || { icon: "💲", bg: "#F3F4F6", border: "#D1D5DB", color: "#374151", valColor: "#374151", totalColor: "#374151" };
            return (
              <div key={metodo} style={{ background: cfg.bg, border: `1.5px solid ${cfg.border}`, borderRadius: 10, padding: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: cfg.color, marginBottom: 6 }}>{cfg.icon} {metodo.toUpperCase()}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {abonos > 0 && <div style={rowStyle}><span style={{ color: "#6B7280" }}>Abonos:</span><span style={{ fontWeight: 700, color: cfg.valColor, fontSize: 12 }}>+{fmt(abonos)}</span></div>}
                  {extras > 0 && <div style={rowStyle}><span style={{ color: "#6B7280" }}>Extras:</span><span style={{ fontWeight: 700, color: cfg.valColor, fontSize: 12 }}>+{fmt(extras)}</span></div>}
                  {gastos > 0 && <div style={rowStyle}><span style={{ color: "#6B7280" }}>Gastos:</span><span style={{ fontWeight: 700, color: "#DC2626", fontSize: 12 }}>-{fmt(gastos)}</span></div>}
                  <div style={{ borderTop: `1px solid ${cfg.border}`, paddingTop: 5, marginTop: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color }}>Total:</span>
                    <span style={{ fontSize: 15, fontWeight: 900, color: total >= 0 ? cfg.totalColor : "#DC2626" }}>{fmt(total)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ background: "#1D4ED8", borderRadius: 10, padding: "12px 16px", marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: 700 }}>INGRESO NETO DEL DÍA</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 1 }}>Cobrado + Extras − Gastos</div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#fff" }}>{fmt(totalNeto)}</div>
        </div>
      </Card>
    </div>
  );
}

// ─── APP PRINCIPAL ─────────────────────────────────────────────────
export default function OptiManager() {
  const [pantalla, setPantalla] = useState("login"); // login | registro | app
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [sedeActual, setSedeActual] = useState(SUCURSALES[0]);
  const [usuarios, setUsuarios] = useState([
    { id: 1, nombre: "Administrador", email: "admin@optica.com", celular: "999999999", username: "admin", password: "admin123", rol: "jefe", verificado: true },
  ]);

  const [vista, setVista] = useState("dashboard");
  const [pacientes, setPacientes] = useState(initialPacientes);
  const [sucursalFiltro, setSucursalFiltro] = useState("Todas");
  const [modalNuevo, setModalNuevo] = useState(false);
  const [movimientos, setMovimientos] = useState([]);

  const esJefe = usuarioActual?.rol === "jefe";

  const handleLogin = (usuario, sede) => { setUsuarioActual(usuario); setSedeActual(sede); setPantalla("app"); };
  const handleLogout = () => { setUsuarioActual(null); setPantalla("login"); setVista("dashboard"); };
  const handleRegistro = (nuevoUsuario) => { setUsuarios(us => [...us, nuevoUsuario]); setPantalla("login"); alert("¡Cuenta creada exitosamente! Ya puedes iniciar sesión."); };

  const updatePaciente = (updated) => setPacientes(ps => ps.map(p => p.id === updated.id ? updated : p));
  const addPaciente = (nuevo) => { setPacientes(ps => [nuevo, ...ps]); setVista("pacientes"); };
  const eliminarPaciente = (id) => setPacientes(ps => ps.filter(p => p.id !== id));
  const anularVenta = (id) => setPacientes(ps => ps.filter(p => p.id !== id));
  const addMovimiento = (mov) => setMovimientos(ms => [{ ...mov, id: Date.now() }, ...ms]);

  if (pantalla === "login") return <PantallaLogin usuarios={usuarios} onLogin={handleLogin} onIrRegistro={() => setPantalla("registro")} />;
  if (pantalla === "registro") return <PantallaRegistro usuarios={usuarios} onRegistroExitoso={handleRegistro} onVolver={() => setPantalla("login")} />;

  const navItems = [
    { key: "dashboard", label: "Dashboard", icon: "📊" },
    { key: "pacientes", label: "Pacientes", icon: "👥" },
    { key: "directorio", label: "Directorio", icon: "🗂️" },
    { key: "cuentas", label: "Cuentas", icon: "💳" },
    { key: "movimientos", label: "Movimientos", icon: "💸" },
    { key: "reporte", label: "Reporte", icon: "📑" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9", fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
      <div style={{ background: "#1D4ED8", padding: "0 24px", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 12px rgba(29,78,216,0.3)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 0" }}>
            <div style={{ background: "#fff", borderRadius: 10, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>👁</div>
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 18, letterSpacing: 1 }}>OPTIMANAGER</span>
          </div>
          <nav style={{ display: "flex", gap: 2, flex: 1 }}>
            {navItems.map(n => (
              <button key={n.key} onClick={() => setVista(n.key)} style={{
                background: vista === n.key ? "rgba(255,255,255,0.2)" : "transparent",
                color: "#fff", border: "none", borderRadius: 8, padding: "7px 12px",
                fontWeight: vista === n.key ? 700 : 500, fontSize: 13, cursor: "pointer",
                fontFamily: "inherit", transition: "background 0.2s"
              }}>{n.icon} {n.label}</button>
            ))}
          </nav>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Sede actual */}
            <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 8, padding: "5px 10px", fontSize: 12, color: "#fff", fontWeight: 600 }}>
              🏪 {sedeActual.replace("Óptica ", "")}
            </div>
            <select value={sucursalFiltro} onChange={e => setSucursalFiltro(e.target.value)}
              style={{ background: "#fff", color: "#111827", border: "1px solid rgba(255,255,255,0.5)", borderRadius: 8, padding: "6px 10px", fontSize: 12, fontFamily: "inherit", cursor: "pointer" }}>
              <option value="Todas">Todas las sedes</option>
              {SUCURSALES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {/* Campana de notificaciones */}
            <CampanaNotificaciones pacientes={pacientes} />
            {/* Usuario */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: 8, padding: "5px 10px", fontSize: 12, color: "#fff" }}>
                {esJefe ? "👑" : "👤"} {usuarioActual?.username}
              </div>
              <button onClick={handleLogout} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, padding: "6px 10px", color: "#fff", fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
                Salir
              </button>
            </div>
            <Btn onClick={() => setModalNuevo(true)} style={{ background: "#fff", color: "#1D4ED8", fontWeight: 800, fontSize: 12, padding: "7px 14px" }}>+ Nuevo</Btn>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 20px" }}>
        {vista === "dashboard" && <Dashboard pacientes={pacientes.filter(p => sucursalFiltro === "Todas" || p.sucursal === sucursalFiltro)} />}
        {vista === "pacientes" && <Pacientes pacientes={pacientes} onUpdate={updatePaciente} onEliminar={eliminarPaciente} sucursalFiltro={sucursalFiltro} esJefe={esJefe} />}
        {vista === "directorio" && <Directorio pacientes={pacientes} onUpdate={updatePaciente} onEliminar={eliminarPaciente} esJefe={esJefe} />}
        {vista === "cuentas" && <Cuentas pacientes={pacientes} sucursalFiltro={sucursalFiltro} />}
        {vista === "movimientos" && <Movimientos movimientos={movimientos} onAdd={addMovimiento} sucursalFiltro={sucursalFiltro} />}
        {vista === "reporte" && <Reporte pacientes={pacientes.filter(p => sucursalFiltro === "Todas" || p.sucursal === sucursalFiltro)} movimientos={movimientos} sucursalFiltro={sucursalFiltro} esJefe={esJefe} onAnularVenta={anularVenta} />}
      </div>

      {modalNuevo && <ModalNuevoPaciente onClose={() => setModalNuevo(false)} onSave={addPaciente} sucursalActual={sedeActual} />}
    </div>
  );
}