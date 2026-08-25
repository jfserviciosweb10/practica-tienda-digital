#!/usr/bin/env node
/* ============================================================
   build-tienda.js
   ------------------------------------------------------------
   Lee _data/productos.yml, arma las cards de producto (mismo
   HTML que genera jf-gen-v3.7.js) y las inserta en index.html,
   entre las marcas:
     <!-- PRODUCTOS-GRID-START --> ... <!-- PRODUCTOS-GRID-END -->

   Se corre automáticamente vía GitHub Actions cada vez que el
   cliente guarda cambios en Decap CMS (que hace commit directo
   a _data/productos.yml). No requiere que nadie lo corra a mano.

   Requiere: npm install js-yaml   (ya declarado en package.json
   del repo del cliente, ver nota al final de este archivo)
   ============================================================ */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const RUTA_DATOS = path.join(__dirname, '..', '..', '_data', 'productos.yml');
const RUTA_INDEX = path.join(__dirname, '..', '..', 'index.html');

const MARCA_INICIO = '<!-- PRODUCTOS-GRID-START -->';
const MARCA_FIN    = '<!-- PRODUCTOS-GRID-END -->';

// Debe ser el MISMO número de WhatsApp del negocio, tal como está
// en el resto del sitio. Se lee del propio index.html para no
// duplicar el dato en ningún lado.
function extraerWhatsapp(html) {
  const match = html.match(/wa\.me\/(\d+)\?/);
  if (!match) throw new Error('No se pudo encontrar el número de WhatsApp en index.html');
  return match[1];
}

function generarProductoHTML(p, whatsapp) {
  const mensaje = encodeURIComponent(`Hola! Quiero comprar: ${p.nombre}`);
  return `
    <div class="producto-card reveal-up">
      <div class="producto-img"><img src="${p.imagen}" alt="${p.nombre}" loading="lazy"></div>
      <div class="producto-info">
        <h3>${p.nombre}</h3>
        ${p.descripcion ? `<p class="producto-desc">${p.descripcion}</p>` : ''}
        <div class="producto-precio">${p.precio}</div>
        <!-- MP-BUTTON-PLACEHOLDER: reemplazar por el botón real de
             MercadoPago/PayPal cuando el cliente entregue sus
             credenciales de integración. -->
        <a href="https://wa.me/${whatsapp}?text=${mensaje}"
           class="btn-producto" target="_blank" rel="noopener">
          <i class="fab fa-whatsapp"></i> Consultar / Comprar
        </a>
      </div>
    </div>`;
}

function main() {
  if (!fs.existsSync(RUTA_DATOS)) {
    console.log('ℹ️  No existe _data/productos.yml — no hay Tienda Digital en este sitio, no se hace nada.');
    return;
  }

  if (!fs.existsSync(RUTA_INDEX)) {
    console.error('❌ No se encontró index.html en la raíz del repo.');
    process.exit(1);
  }

  const datos = yaml.load(fs.readFileSync(RUTA_DATOS, 'utf8'));
  const productos = (datos && Array.isArray(datos.productos)) ? datos.productos : [];

  let html = fs.readFileSync(RUTA_INDEX, 'utf8');

  const inicioIdx = html.indexOf(MARCA_INICIO);
  const finIdx = html.indexOf(MARCA_FIN);

  if (inicioIdx === -1 || finIdx === -1) {
    console.error('❌ No se encontraron las marcas PRODUCTOS-GRID-START/END en index.html.');
    console.error('   Este sitio puede no tener la sección Tienda Digital generada todavía.');
    process.exit(1);
  }

  const whatsapp = extraerWhatsapp(html);

  const nuevoBloque = productos.length > 0
    ? productos.map(p => generarProductoHTML(p, whatsapp)).join('')
    : '';

  const antes = html.slice(0, inicioIdx + MARCA_INICIO.length);
  const despues = html.slice(finIdx);

  const htmlNuevo = antes + nuevoBloque + despues;

  if (htmlNuevo === html) {
    console.log('ℹ️  Sin cambios en los productos, no se modifica index.html.');
    return;
  }

  fs.writeFileSync(RUTA_INDEX, htmlNuevo, 'utf8');
  console.log(`✅ index.html actualizado con ${productos.length} producto(s).`);
}

main();

/* ============================================================
   NOTA — package.json del repo del cliente necesita:
     { "dependencies": { "js-yaml": "^4.1.0" } }

   Y el workflow de GitHub Actions necesita, antes de correr este
   script:
     - run: npm install js-yaml
   ============================================================ */
