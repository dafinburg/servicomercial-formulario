// ===== CONFIGURACIÓN =====
const N8N_WEBHOOK_URL = 'https://n8n.mtrpymes.com.ar/webhook/c6bf2c68-75bf-418d-b86f-3992fe58f5f6';

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
    'QUESOS BLANDOS AZULES': 'fa-cheese',
    'QUESOS BLANDOS': 'fa-cheese',
    'QUESOS DUROS': 'fa-cube',
    'QUESOS SEMI-DUROS C/OJOS': 'fa-circle-dot',
    'RALLADOS': 'fa-jar',
    'QUESOS PROCESADOS': 'fa-blender',
    'QUESOS PROCESADOS UNTABLES': 'fa-bowl-food',
    'MANTECAS': 'fa-butter'
};
const categoryColors = {
    'QUESOS BLANDOS AZULES': 'bg-blue-50 text-blue-700 border-blue-200',
    'QUESOS BLANDOS': 'bg-amber-50 text-amber-700 border-amber-200',
    'QUESOS DUROS': 'bg-stone-100 text-stone-700 border-stone-200',
    'QUESOS SEMI-DUROS C/OJOS': 'bg-yellow-50 text-yellow-700 border-yellow-200',
    'RALLADOS': 'bg-orange-50 text-orange-700 border-orange-200',
    'QUESOS PROCESADOS': 'bg-rose-50 text-rose-700 border-rose-200',
    'QUESOS PROCESADOS UNTABLES': 'bg-purple-50 text-purple-700 border-purple-200',
    'MANTECAS': 'bg-emerald-50 text-emerald-700 border-emerald-200'
};

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    // Carga de datos dinámica para evitar caché
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
        const text = `${p.Art} ${p.Producto} ${p.Marca} ${p.Categoria} ${p.Presentacion}`.toLowerCase();
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
                <div class="w-12">Art.</div><div class="flex-1">Producto</div><div class="w-20 text-right">$/Kg</div><div class="w-16 text-center">Bonif</div><div class="w-24 text-right">Bonificado</div><div class="w-28 text-center ml-3">Bultos</div>
            </div>`;

        let rows = '';
        items.forEach(p => {
            const art = String(p.Art);
            const precio = Number(p.PrecioLista) || 0;
            const bonif = Number(p.Bonif) || 0;
            const precioBonif = Number(p.PrecioBonificado) || 0;
            const qty = cart[art] ? cart[art].qty : 0;
            const marcaLabel = p.Marca !== 'La Quesera' ? `<span class="ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-stone-100 text-stone-500">${p.Marca}</span>` : '';

            rows += `
                <div class="product-row border-b border-stone-50 last:border-0" data-art="${art}">
                    <div class="w-12 text-xs font-bold text-gray-400">${art}</div>
                    <div class="flex-1 product-info min-w-0">
                        <div class="flex items-center gap-1 flex-wrap">
                            <span class="font-semibold text-sm text-gray-900 truncate">${p.Producto}</span>${marcaLabel}
                        </div>
                        <div class="text-xs text-gray-400 truncate">${p.Presentacion}</div>
                    </div>
                    <div class="w-20 text-right text-xs text-gray-400 line-through hidden sm:block">$${precio.toLocaleString('es-AR')}</div>
                    <div class="w-16 text-center"><span class="text-[10px] font-bold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">${bonif}%</span></div>
                    <div class="w-24 text-right font-bold text-sm text-gray-900 hidden sm:block">$${precioBonif.toLocaleString('es-AR',{minimumFractionDigits:2})}</div>
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
    const price = Number(p.PrecioBonificado) || 0;
    if (!cart[art]) cart[art] = { qty: 0, price, item: p };
    let q = cart[art].qty + delta;
    if (q < 0) q = 0;
    setCartItem(art, q, price, p);
}
function setCart(art, q) {
    const p = products.find(x => String(x.Art) === art);
    if (!p) return;
    if (q < 0) q = 0;
    setCartItem(art, q, Number(p.PrecioBonificado)||0, p);
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
        const w = Number(cart[art].item.PesoKg) || 1;
        const u = Number(cart[art].item.UnidxBulto) || 1;
        total += cart[art].qty * cart[art].price * w * u;
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
        empresa: 'La Quesera', vendedor: 'SERVICOMERCIAL',
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
            const w = Number(c.item.PesoKg)||1, u = Number(c.item.UnidxBulto)||1;
            return { art: c.item.Art, producto: c.item.Producto, marca: c.item.Marca,
                categoria: c.item.Categoria, presentacion: c.item.Presentacion,
                bultos: c.qty, precio_bonificado_xkg: c.price, peso_kg: w, unidxbulto: u,
                subtotal: c.qty * c.price * w * u };
        }),
        total_estimado_sin_iva: Object.values(cart).reduce((s,c) => {
            const w = Number(c.item.PesoKg)||1, u = Number(c.item.UnidxBulto)||1;
            return s + c.qty * c.price * w * u;
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
