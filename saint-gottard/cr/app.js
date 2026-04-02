// ===== CONFIGURACIÓN =====
const N8N_WEBHOOK_URL = 'https://n8n.mtrpymes.com.ar/webhook/c6bf2c68-75bf-418d-b86f-3992fe58f5f6';
const CANAL = 'CR';

// ===== ESTADO =====
let products = [];
let fechaLista = '';
let cart = {};

// ===== DOM =====
const productsContainer = document.getElementById('products-container');
const totalAmountEl = document.getElementById('total-amount');
const totalItemsEl = document.getElementById('total-items');
const searchInput = document.getElementById('search-products');
const orderForm = document.getElementById('order-form');
const notification = document.getElementById('notification');
const btnCloseNotification = document.getElementById('btn-close-notification');
const fechaListaEl = document.getElementById('fecha-lista');

const categoryIcons = {
    'VARIEDADES DE TE VERDE Y ROJO':                'fa-mug-hot',
    'INFUSIONES EN ESTUCHES X 10 SAQUITOS':         'fa-bag-shopping',
    'ICE TEA X 10 SAQUITOS':                        'fa-glass-water',
    'INFUSIONES FRUTALES SIN CAFEINA X 20 SAQUITOS':'fa-apple-whole',
    'CAJA SURTIDA X 8 VARIEDADES':                  'fa-box-open',
    'MEZCLAS DE HIERBAS X 20 SAQUITOS':             'fa-seedling',
    'MONOHIERBAS X 20 SAQUITOS':                    'fa-leaf',
    'LINEA BIENESTAR X 20 SAQUITOS':                'fa-heart-pulse',
    'TE NEGRO X 20 SAQUITOS':                       'fa-mug-hot',
    'ADELGAFRUTA X 20 SAQUITOS':                    'fa-weight-scale'
};
const categoryColors = {
    'VARIEDADES DE TE VERDE Y ROJO':                'bg-green-50 text-green-700 border-green-200',
    'INFUSIONES EN ESTUCHES X 10 SAQUITOS':         'bg-violet-50 text-violet-700 border-violet-200',
    'ICE TEA X 10 SAQUITOS':                        'bg-sky-50 text-sky-700 border-sky-200',
    'INFUSIONES FRUTALES SIN CAFEINA X 20 SAQUITOS':'bg-orange-50 text-orange-700 border-orange-200',
    'CAJA SURTIDA X 8 VARIEDADES':                  'bg-amber-50 text-amber-700 border-amber-200',
    'MEZCLAS DE HIERBAS X 20 SAQUITOS':             'bg-lime-50 text-lime-700 border-lime-200',
    'MONOHIERBAS X 20 SAQUITOS':                    'bg-emerald-50 text-emerald-700 border-emerald-200',
    'LINEA BIENESTAR X 20 SAQUITOS':                'bg-rose-50 text-rose-700 border-rose-200',
    'TE NEGRO X 20 SAQUITOS':                       'bg-stone-100 text-stone-700 border-stone-200',
    'ADELGAFRUTA X 20 SAQUITOS':                    'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200'
};

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    const script = document.createElement('script');
    script.src = 'data.js?v=' + new Date().getTime();
    script.onload = () => {
        if (typeof MASTER_PRODUCTOS !== 'undefined') products = MASTER_PRODUCTOS;
        if (typeof MASTER_FECHA_LISTA !== 'undefined') fechaLista = MASTER_FECHA_LISTA;
        fechaListaEl.textContent = fechaLista;
        renderProducts();
    };
    script.onerror = () => {
        productsContainer.innerHTML = '<div class="text-center py-12 text-red-500"><i class="fa-solid fa-triangle-exclamation text-3xl mb-3"></i><p>Error al cargar la lista de precios.</p></div>';
    };
    document.head.appendChild(script);
});
searchInput.addEventListener('input', (e) => renderProducts(e.target.value));

// ===== RENDER =====
function renderProducts(filterText = '') {
    productsContainer.innerHTML = '';
    const filtered = products.filter(p => {
        const text = `${p.Art} ${p.Producto} ${p.Categoria} ${p.Presentacion} ${p.EAN13}`.toLowerCase();
        return text.includes((filterText || '').toLowerCase());
    });

    if (filtered.length === 0) {
        productsContainer.innerHTML = '<div class="text-center py-12 text-gray-400"><i class="fa-solid fa-search text-3xl mb-3"></i><p>No se encontraron productos.</p></div>';
        return;
    }

    const groups = {};
    filtered.forEach(p => { const cat = p.Categoria || 'OTROS'; if (!groups[cat]) groups[cat] = []; groups[cat].push(p); });

    for (const [category, items] of Object.entries(groups)) {
        const section = document.createElement('section');
        section.className = 'bg-white rounded-2xl shadow-sm border border-stone-200/60 overflow-hidden mb-6';
        const icon = categoryIcons[category] || 'fa-tag';
        const colorClass = categoryColors[category] || 'bg-gray-50 text-gray-700 border-gray-200';

        let html = `
            <div class="px-5 py-3 border-b border-stone-100 flex items-center justify-between">
                <span class="category-badge ${colorClass}"><i class="fa-solid ${icon}"></i> ${category}</span>
                <span class="text-xs text-gray-400 font-medium">${items.length} producto${items.length>1?'s':''}</span>
            </div>
            <div class="hidden sm:flex items-center px-5 py-2 bg-stone-50/50 text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-stone-100">
                <div class="w-20">Cód.</div><div class="flex-1">Producto</div><div class="w-20 text-right hidden md:block">EAN</div><div class="w-16 text-center">Est./Pack</div><div class="w-28 text-right">Precio Lista</div><div class="w-28 text-center ml-3">Packs</div>
            </div>`;

        let rows = '';
        items.forEach(p => {
            const art = String(p.Art);
            const precio = Number(p.PrecioLista) || 0;
            const unid = Number(p.UnidxBulto) || 1;
            const qty = cart[art] ? cart[art].qty : 0;

            rows += `
                <div class="product-row border-b border-stone-50 last:border-0" data-art="${art}">
                    <div class="w-20 text-xs font-bold text-gray-500">${art}</div>
                    <div class="flex-1 product-info min-w-0">
                        <div class="font-semibold text-sm text-gray-900 truncate">${p.Producto}</div>
                        <div class="text-xs text-gray-400 truncate">${p.Presentacion}</div>
                    </div>
                    <div class="w-20 text-right text-xs text-gray-300 hidden md:block">${p.EAN13}</div>
                    <div class="w-16 text-center"><span class="text-[10px] font-bold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">${unid} u.</span></div>
                    <div class="w-28 text-right font-bold text-sm text-gray-900">$${precio.toLocaleString('es-AR',{minimumFractionDigits:2})}</div>
                    <div class="w-28 ml-3">
                        <div class="qty-group">
                            <button type="button" class="qty-btn btn-minus" data-art="${art}"><i class="fa-solid fa-minus"></i></button>
                            <input type="number" class="qty-input" value="${qty}" min="0" data-art="${art}">
                            <button type="button" class="qty-btn btn-plus" data-art="${art}"><i class="fa-solid fa-plus"></i></button>
                        </div>
                    </div>
                </div>`;
        });

        section.innerHTML = html + '<div class="divide-y divide-stone-50">' + rows + '</div>';
        productsContainer.appendChild(section);
    }

    document.querySelectorAll('.btn-minus').forEach(b => b.addEventListener('click', () => updateCart(b.dataset.art, -1)));
    document.querySelectorAll('.btn-plus').forEach(b => b.addEventListener('click', () => updateCart(b.dataset.art, 1)));
    document.querySelectorAll('.qty-input').forEach(i => i.addEventListener('change', () => setCart(i.dataset.art, parseInt(i.value)||0)));
}

// ===== CART =====
function updateCart(art, delta) {
    const p = products.find(x => String(x.Art) === art);
    if (!p) return;
    const price = Number(p.PrecioLista) || 0;
    if (!cart[art]) cart[art] = { qty: 0, price, item: p };
    let q = cart[art].qty + delta;
    if (q < 0) q = 0;
    setCartItem(art, q, price, p);
}
function setCart(art, q) {
    const p = products.find(x => String(x.Art) === art);
    if (!p) return;
    if (q < 0) q = 0;
    setCartItem(art, q, Number(p.PrecioLista)||0, p);
}
function setCartItem(art, q, price, p) {
    if (q === 0) delete cart[art]; else cart[art] = { qty: q, price, item: p };
    const input = document.querySelector(`input.qty-input[data-art="${art}"]`);
    if (input) {
        input.value = q;
        const row = input.closest('.product-row');
        if (row) { row.classList.remove('item-flash'); void row.offsetWidth; row.classList.add('item-flash'); }
    }
    calculateTotal();
}
function calculateTotal() {
    let total = 0, items = 0;
    for (const art in cart) {
        const u = Number(cart[art].item.UnidxBulto) || 1;
        total += cart[art].qty * cart[art].price * u;
        items += cart[art].qty;
    }
    totalAmountEl.innerText = '$ ' + total.toLocaleString('es-AR', {minimumFractionDigits:2});
    totalItemsEl.innerText = items;
}

// ===== SUBMIT =====
orderForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (Object.keys(cart).length === 0) { alert('Agregue al menos un producto.'); return; }
    const btn = document.getElementById('btn-submit');
    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';
    btn.disabled = true;

    const payload = {
        empresa: 'Saint Gottard', canal: CANAL, vendedor: 'SERVICOMERCIAL',
        fecha_lista: fechaLista, fecha_pedido: new Date().toISOString(),
        cliente: {
            razon_social: document.getElementById('cliente-nombre').value,
            cuit: document.getElementById('cliente-cuit').value,
            email: document.getElementById('cliente-email').value,
            telefono: document.getElementById('cliente-telefono').value,
            direccion: document.getElementById('cliente-direccion').value,
            facturacion: document.getElementById('cliente-facturacion').value,
            horario_entrega: document.getElementById('cliente-horario').value
        },
        items: Object.values(cart).map(c => {
            const u = Number(c.item.UnidxBulto)||1;
            return {
                cod: c.item.Art, ean13: c.item.EAN13,
                producto: c.item.Producto, categoria: c.item.Categoria,
                presentacion: c.item.Presentacion, est_x_pack: u,
                packs: c.qty, precio_lista_unit: c.price,
                subtotal: c.qty * c.price * u
            };
        }),
        total_estimado_sin_iva: Object.values(cart).reduce((s,c) => {
            const u = Number(c.item.UnidxBulto)||1;
            return s + c.qty * c.price * u;
        }, 0)
    };

    try {
        await fetch(N8N_WEBHOOK_URL, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
        showNotification();
        orderForm.reset(); cart = {}; calculateTotal(); renderProducts(searchInput.value);
    } catch(err) { console.error(err); showNotification(); }
    finally { btn.innerHTML = orig; btn.disabled = false; }
});

function showNotification() {
    notification.classList.remove('hidden'); notification.classList.add('flex');
    setTimeout(() => { notification.classList.remove('opacity-0'); notification.querySelector('div').classList.remove('scale-95'); }, 10);
}
btnCloseNotification.addEventListener('click', () => {
    notification.classList.add('opacity-0'); notification.querySelector('div').classList.add('scale-95');
    setTimeout(() => { notification.classList.add('hidden'); notification.classList.remove('flex'); }, 300);
});
