// ============================================================
// PLANILLA DE CONTROL SAINT GOTTARD
// Google Apps Script
// ============================================================
// CONFIGURACIÓN: completar con los datos del repositorio GitHub
// ============================================================

const CONFIG = {
  GITHUB_TOKEN:   'TU_GITHUB_TOKEN_AQUI',          // Token personal de GitHub (Settings > Developer settings > Personal access tokens)
  GITHUB_OWNER:   'TU_USUARIO_GITHUB',              // Usuario u organización de GitHub
  GITHUB_REPO:    'TU_REPO',                        // Nombre del repositorio
  GITHUB_BRANCH:  'main',
  PATH_DISTRIB:   'saint-gottard/distribucion/data.js',
  PATH_CR:        'saint-gottard/cr/data.js',
};

// ============================================================
// MENÚ PERSONALIZADO
// ============================================================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🍃 Saint Gottard')
    .addItem('Actualizar formulario Distribuidores → GitHub', 'generarDataJS_Distribuidores')
    .addItem('Actualizar formulario Canal Retail (CR) → GitHub', 'generarDataJS_CR')
    .addSeparator()
    .addItem('Actualizar AMBOS formularios', 'generarAmbasDataJS')
    .addSeparator()
    .addItem('Crear estructura de solapas (primera vez)', 'crearEstructura')
    .addToUi();
}

// ============================================================
// FUNCIÓN PRINCIPAL: genera y sube data.js para DISTRIBUIDORES
// ============================================================

function generarDataJS_Distribuidores() {
  const contenido = construirDataJS('DISTRIB');
  const fecha = obtenerFechaLista();
  const fechaLista = 'Lista Distribuidores - Vigente al ' + fecha;
  const js = contenido.replace('__FECHA_LISTA__', fechaLista).replace('__CANAL__', 'DISTRIBUIDORES');
  subirAGitHub(CONFIG.PATH_DISTRIB, js, 'Actualización precios Distribuidores: ' + new Date().toLocaleString('es-AR'));
  SpreadsheetApp.getUi().alert('✅ Formulario Distribuidores actualizado en GitHub correctamente.');
}

// ============================================================
// FUNCIÓN PRINCIPAL: genera y sube data.js para CANAL RETAIL
// ============================================================

function generarDataJS_CR() {
  const contenido = construirDataJS('CR');
  const fecha = obtenerFechaLista();
  const fechaLista = 'Lista Canal Retail (CR) - Vigente al ' + fecha;
  const js = contenido.replace('__FECHA_LISTA__', fechaLista).replace('__CANAL__', 'CANAL RETAIL (CR)');
  subirAGitHub(CONFIG.PATH_CR, js, 'Actualización precios Canal Retail: ' + new Date().toLocaleString('es-AR'));
  SpreadsheetApp.getUi().alert('✅ Formulario Canal Retail actualizado en GitHub correctamente.');
}

function generarAmbasDataJS() {
  generarDataJS_Distribuidores();
  generarDataJS_CR();
}

// ============================================================
// CONSTRUCCIÓN DEL data.js
// ============================================================

function construirDataJS(canal) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetProductos = ss.getSheetByName('Maestro Productos');
  const sheetPrecios   = ss.getSheetByName('Maestro Precios');

  if (!sheetProductos || !sheetPrecios) {
    SpreadsheetApp.getUi().alert('❌ Error: no se encontraron las solapas "Maestro Productos" o "Maestro Precios".');
    return '';
  }

  // Leer productos (Col A=Cod, B=EAN13, C=Categoria, D=Producto, E=EstxPack)
  const dataProductos = sheetProductos.getDataRange().getValues();
  // Leer precios (Col A=Cod, B=FechaLista, C=PrecioDistrib, D=PrecioCR)
  const dataPrecios = sheetPrecios.getDataRange().getValues();

  // Construir mapa de precios por código
  const mapaPrecios = {};
  for (let i = 1; i < dataPrecios.length; i++) {
    const fila = dataPrecios[i];
    const cod = String(fila[0]).trim();
    if (!cod) continue;
    mapaPrecios[cod] = {
      precioDistrib: Number(fila[2]) || 0,
      precioCR:      Number(fila[3]) || 0
    };
  }

  // Construir array de productos
  const productos = [];
  for (let i = 1; i < dataProductos.length; i++) {
    const fila = dataProductos[i];
    const cod = String(fila[0]).trim();
    if (!cod) continue;

    const ean13    = String(fila[1]).trim();
    const categoria = String(fila[2]).trim();
    const producto  = String(fila[3]).trim();
    const estxPack  = Number(fila[4]) || 1;

    const precios = mapaPrecios[cod] || { precioDistrib: 0, precioCR: 0 };
    const precio  = canal === 'DISTRIB' ? precios.precioDistrib : precios.precioCR;

    // Construir Presentacion
    let presentacion = '';
    if (categoria.indexOf('X 10') >= 0) {
      presentacion = 'Estuche x 10 saquitos | Pack de ' + estxPack + ' | EAN: ' + ean13;
    } else if (categoria.indexOf('X 20') >= 0 || categoria.indexOf('MONOHIERBAS') >= 0 || categoria.indexOf('BIENESTAR') >= 0 || categoria.indexOf('ADELGA') >= 0 || categoria.indexOf('MEZCLAS') >= 0 || categoria.indexOf('TE NEGRO') >= 0) {
      presentacion = 'Estuche x 20 saquitos | Pack de ' + estxPack + ' | EAN: ' + ean13;
    } else if (categoria.indexOf('CAJA SURTIDA') >= 0) {
      presentacion = 'Caja Surtida x 8 Variedades | Pack de ' + estxPack + ' | EAN: ' + ean13;
    } else {
      presentacion = 'Pack de ' + estxPack + ' estuches | EAN: ' + ean13;
    }

    productos.push({
      Art: cod,
      EAN13: ean13,
      Categoria: categoria,
      Producto: producto,
      Marca: 'Saint Gottard',
      Presentacion: presentacion,
      UnidxBulto: estxPack,
      PrecioLista: precio,
      Bonif: 0,
      PrecioBonificado: precio,
      PesoKg: 1
    });
  }

  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/M/yyyy, HH:mm:ss');
  const jsonProductos = JSON.stringify(productos, null, '    ');

  return `// GENERADO AUTOMATICAMENTE DESDE GOOGLE SHEETS PARA GITHUB
// Última actualización: ${timestamp}
// Canal: __CANAL__
const MASTER_PRODUCTOS = ${jsonProductos};
const MASTER_FECHA_LISTA = "__FECHA_LISTA__";
`;
}

// ============================================================
// OBTENER FECHA DE LA LISTA DESDE LA SOLAPA Maestro Precios
// ============================================================

function obtenerFechaLista() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Maestro Precios');
  if (!sheet) return new Date().toLocaleDateString('es-AR');
  // La fecha está en la fila 2, columna B (B2)
  const val = sheet.getRange('B2').getValue();
  if (val instanceof Date) return Utilities.formatDate(val, Session.getScriptTimeZone(), 'dd/MM/yyyy');
  return String(val) || new Date().toLocaleDateString('es-AR');
}

// ============================================================
// SUBIR ARCHIVO A GITHUB VÍA API
// ============================================================

function subirAGitHub(path, contenido, commitMessage) {
  const token   = CONFIG.GITHUB_TOKEN;
  const owner   = CONFIG.GITHUB_OWNER;
  const repo    = CONFIG.GITHUB_REPO;
  const branch  = CONFIG.GITHUB_BRANCH;
  const apiUrl  = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

  // Obtener SHA actual del archivo (si existe)
  let sha = null;
  try {
    const getResp = UrlFetchApp.fetch(apiUrl + '?ref=' + branch, {
      method: 'get',
      headers: { Authorization: 'token ' + token },
      muteHttpExceptions: true
    });
    if (getResp.getResponseCode() === 200) {
      sha = JSON.parse(getResp.getContentText()).sha;
    }
  } catch(e) { /* archivo nuevo */ }

  const body = { message: commitMessage, content: Utilities.base64Encode(contenido, Utilities.Charset.UTF_8), branch: branch };
  if (sha) body.sha = sha;

  const putResp = UrlFetchApp.fetch(apiUrl, {
    method: 'put',
    headers: { Authorization: 'token ' + token, 'Content-Type': 'application/json' },
    payload: JSON.stringify(body),
    muteHttpExceptions: true
  });

  if (putResp.getResponseCode() !== 200 && putResp.getResponseCode() !== 201) {
    throw new Error('Error GitHub: ' + putResp.getContentText());
  }
}

// ============================================================
// CREAR ESTRUCTURA DE SOLAPAS (ejecutar solo la primera vez)
// ============================================================

function crearEstructura() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  // ---- Maestro Productos ----
  let shMProd = ss.getSheetByName('Maestro Productos');
  if (!shMProd) {
    shMProd = ss.insertSheet('Maestro Productos');
  }
  const encProductos = [['Cod','EAN13','Categoria','Producto','EstxPack']];
  shMProd.getRange(1, 1, 1, 5).setValues(encProductos)
    .setFontWeight('bold').setBackground('#1a5c2a').setFontColor('#ffffff');
  shMProd.setFrozenRows(1);
  shMProd.setColumnWidth(1, 90);
  shMProd.setColumnWidth(2, 140);
  shMProd.setColumnWidth(3, 320);
  shMProd.setColumnWidth(4, 300);
  shMProd.setColumnWidth(5, 80);

  // ---- Maestro Precios ----
  let shMPrec = ss.getSheetByName('Maestro Precios');
  if (!shMPrec) {
    shMPrec = ss.insertSheet('Maestro Precios');
  }
  const encPrecios = [['Cod','Fecha Lista','Precio Distrib','Precio CR']];
  shMPrec.getRange(1, 1, 1, 4).setValues(encPrecios)
    .setFontWeight('bold').setBackground('#1a5c2a').setFontColor('#ffffff');
  shMPrec.setFrozenRows(1);
  shMPrec.setColumnWidth(1, 90);
  shMPrec.setColumnWidth(2, 140);
  shMPrec.setColumnWidth(3, 140);
  shMPrec.setColumnWidth(4, 140);

  // ---- Entregas Saint Gottard ----
  let shEnt = ss.getSheetByName('Entregas Saint Gottard');
  if (!shEnt) {
    shEnt = ss.insertSheet('Entregas Saint Gottard');
  }
  const encEntregas = [[
    'Timestamp','Canal','Razon Social','CUIT','Email','Telefono',
    'Direccion','Facturacion','Horario Entrega','Fecha Lista','Fecha Pedido',
    'Cod','EAN13','Producto','Categoria','Est.xPack','Packs','Precio Lista Unit','Subtotal','Total Pedido'
  ]];
  shEnt.getRange(1, 1, 1, 20).setValues(encEntregas)
    .setFontWeight('bold').setBackground('#1a5c2a').setFontColor('#ffffff');
  shEnt.setFrozenRows(1);
  [1,2,3,5,6,11,12].forEach(i => shEnt.setColumnWidth(i, 140));
  shEnt.setColumnWidth(4, 120);
  shEnt.setColumnWidth(7, 220);
  shEnt.setColumnWidth(14, 260);
  shEnt.setColumnWidth(15, 280);

  ui.alert('✅ Estructura creada correctamente.\n\nSolapas disponibles:\n• Maestro Productos\n• Maestro Precios\n• Entregas Saint Gottard');
}

// ============================================================
// WEBHOOK RECEPTOR (opcional: si n8n llama a este script como Web App)
// Para activarlo: Implementar > Nueva implementación > Aplicación web
// ============================================================

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Entregas Saint Gottard');
    if (!sheet) return ContentService.createTextOutput(JSON.stringify({status:'error',msg:'Solapa no encontrada'})).setMimeType(ContentService.MimeType.JSON);

    const timestamp = new Date().toLocaleString('es-AR');
    const canal = payload.canal || '';
    const cliente = payload.cliente || {};
    const items = payload.items || [];
    const total = payload.total_estimado_sin_iva || 0;
    const fechaLista = payload.fecha_lista || '';
    const fechaPedido = payload.fecha_pedido || '';

    items.forEach(item => {
      sheet.appendRow([
        timestamp,
        canal,
        cliente.razon_social || '',
        cliente.cuit || '',
        cliente.email || '',
        cliente.telefono || '',
        cliente.direccion || '',
        cliente.facturacion || '',
        cliente.horario_entrega || '',
        fechaLista,
        fechaPedido,
        item.cod || '',
        item.ean13 || '',
        item.producto || '',
        item.categoria || '',
        item.est_x_pack || '',
        item.packs || '',
        item.precio_lista_unit || '',
        item.subtotal || '',
        total
      ]);
    });

    return ContentService.createTextOutput(JSON.stringify({status:'ok'})).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({status:'error',msg:err.message})).setMimeType(ContentService.MimeType.JSON);
  }
}
