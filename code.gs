const SHEET_CONFIG = 'Config';
const SHEET_USERS = 'Usuarios';
const SHEET_ASSIST = 'Asistencias';

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Asistencia QR Pro')
    .setFaviconUrl('https://i.imgur.com/1Nn6m3l.png');
}

// API para frontend
function api(action, payload) {
  try {
    switch (action) {
      case 'login':
        return login(payload);
      case 'getConfig':
        return getConfig();
      case 'getUser':
        return getUser(payload);
      case 'getQRToken':
        return getQRToken(payload);
      case 'registerQR':
        return registerQR(payload);
      case 'registerCampo':
        return registerCampo(payload);
      case 'getAsistencias':
        return getAsistencias(payload);
      case 'getUsers':
        return getUsers();
      case 'updateConfig':
        return updateConfig(payload);
      case 'updateUserPermiteCampo':
        return updateUserPermiteCampo(payload);
      case 'getAsistenciasCSV':
        return getAsistenciasCSV();
      default:
        throw new Error('Acción no soportada');
    }
  } catch (err) {
    return { error: err.message || String(err) };
  }
}

function login({ correo, password }) {
  const users = getSheetData(SHEET_USERS);
  const user = users.find(u => u.correo === correo && u.activo === 'Sí');
  if (!user) throw new Error('Usuario no encontrado o inactivo');
  if (!password || user.contraseña !== password) throw new Error('Contraseña incorrecta');
  return user;
}

function getConfig() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_CONFIG);
  const rows = sheet.getDataRange().getValues();
  const modo = rows.find(r => r[0] === 'modo');
  return { modo: modo ? modo[1] : 'QR' };
}

function getUser({ id }) {
  const users = getSheetData(SHEET_USERS);
  return users.find(u => String(u.id) === String(id));
}

function getUsers() {
  return getSheetData(SHEET_USERS);
}

function getQRToken({ id }) {
  const token = Utilities.base64EncodeWebSafe(`${id}-${Date.now()}`);
  return { token };
}

function registerQR({ token }) {
  const decoded = Utilities.base64DecodeWebSafe(token);
  const [id, stamp] = String(decoded).split('-');
  const user = getUser({ id });
  if (!user) throw new Error('Usuario inválido');
  const now = new Date();
  saveAsistencia({
    idUsuario: id,
    nombre: user.nombre,
    fecha: formatDate(now),
    hora: formatTime(now),
    tipo: 'QR',
    ubicacion: '',
    ip: '',
    userAgent: '',
    estado: 'válido'
  });
  return { ok: true, mensaje: 'Asistencia registrada por QR.' };
}

function registerCampo({ id, ubicacion, ip, userAgent }) {
  const user = getUser({ id });
  if (!user) throw new Error('Usuario inválido');
  const now = new Date();
  saveAsistencia({
    idUsuario: id,
    nombre: user.nombre,
    fecha: formatDate(now),
    hora: formatTime(now),
    tipo: 'Campo',
    ubicacion: ubicacion || '',
    ip: ip || '',
    userAgent: userAgent || '',
    estado: 'válido'
  });
  return { ok: true, mensaje: 'Asistencia registrada en campo.' };
}

function getAsistencias({ idUsuario }) {
  const asist = getSheetData(SHEET_ASSIST);
  return idUsuario
    ? asist.filter(a => String(a.idUsuario) === String(idUsuario))
    : asist;
}

function updateConfig({ modo }) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_CONFIG);
  const rows = sheet.getDataRange().getValues();
  const idx = rows.findIndex(r => r[0] === 'modo');
  if (idx >= 0) {
    sheet.getRange(idx + 1, 2).setValue(modo);
  }
  return getConfig();
}

function updateUserPermiteCampo({ id, permiteCampo }) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_USERS);
  const users = sheet.getDataRange().getValues();
  const idx = users.findIndex(u => String(u[0]) === String(id));
  if (idx >= 0) {
    sheet.getRange(idx + 1, 6).setValue(permiteCampo ? 'Sí' : 'No');
  }
  return getUser({ id });
}

// Utilidades
function getSheetData(sheetName) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  const [headers, ...rows] = sheet.getDataRange().getValues();
  return rows.map(row => Object.fromEntries(headers.map((h, i) => [h, row[i]])));
}

function saveAsistencia(reg) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_ASSIST);
  const nextId = sheet.getLastRow();
  sheet.appendRow([
    nextId,
    reg.idUsuario,
    reg.nombre,
    reg.fecha,
    reg.hora,
    reg.tipo,
    reg.ubicacion,
    reg.ip,
    reg.userAgent,
    reg.estado
  ]);
}

function formatDate(d) {
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function formatTime(d) {
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'HH:mm:ss');
}

// Descargar CSV para admin
function getAsistenciasCSV() {
  const asist = getSheetData(SHEET_ASSIST);
  if (!asist.length) return { csv: "" };
  const headers = Object.keys(asist[0]);
  const rows = asist.map(row => headers.map(h => `"${(row[h]||"").toString().replace(/"/g, '""')}"`).join(","));
  return { csv: [headers.join(","), ...rows].join("\n") };
}
