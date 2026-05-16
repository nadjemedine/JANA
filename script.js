import { createClient } from 'https://esm.sh/@sanity/client@6.15.1';
import { toHTML } from 'https://esm.sh/@portabletext/to-html@2.0.8';

// Read-only client (no token needed for public dataset)
const client = createClient({
    projectId: '4y4ekus6',
    dataset: 'production',
    apiVersion: '2024-05-15',
    useCdn: true,
});

// Write client (with token, used only for order creation)
const writeClient = createClient({
    projectId: '4y4ekus6',
    dataset: 'production',
    apiVersion: '2024-05-15',
    useCdn: false,
    token: 'skWhsZEie49GoOYZlOijSQ50APu1zmrlhyK0GYmRf7ncIunnD0UWp48rDc1c5mWAREIsYAdYDgtSaBry4ImRC38EjaSbb0NiVj5QZi5jjm8rAY1a56jY9pLB0y4xLTSaQzgTY9PMW2xrDkAopqdrGNuHIu0raGhAhYdnluAjK9Lh0XBhBGzM',
});

// Data Store
let products = [];
const algeriaWilayas = [
    "01-أدرار", "02-الشلف", "03-الأغواط", "04-أم البواقي", "05-باتنة", "06-بجاية", "07-بسكرة", "08-بشار", "09-البليدة", "10-البويرة",
    "11-تمنراست", "12-تبسة", "13-تلمسان", "14-تيارت", "15-تيزي وزو", "16-الجزائر", "17-الجلفة", "18-جيجل", "19-سطيف", "20-سعيدة",
    "21-سكيكدة", "22-سيدي بلعباس", "23-عنابة", "24-قالمة", "25-قسنطينة", "26-المدية", "27-مستغانم", "28-المسيلة", "29-معسكر", "30-ورقلة",
    "31-وهران", "32-البيض", "33-إليزي", "34-برج بوعريريج", "35-بومرداس", "36-الطارف", "37-تندوف", "38-تيسمسيلت", "39-الوادي", "40-خنشلة",
    "41-سوق أهراس", "42-تيبازة", "43-ميلة", "44-عين الدفلى", "45-النعامة", "46-عين تموشنت", "47-غرداية", "48-غليزان", "49-تيميمون", "50-برج باجي مختار",
    "51-أولاد جلال", "52-بني عباس", "53-عين صالح", "54-عين قزام", "55-تقرت", "56-جانت", "57-المغير", "58-المنيعة"
];

let cart = [];

// UI Helpers
function showView(viewId, pageKey = '') {
    document.querySelectorAll('.view-content').forEach(el => el.classList.add('hidden-view'));
    const target = document.getElementById(`view-${viewId}`);
    if (target) target.classList.remove('hidden-view');
    window.scrollTo(0, 0);

    if (viewId === 'pages') loadStaticPage(pageKey);
    if (viewId === 'cart') renderCart();
}

function toggleMobileMenu() {
    const overlay = document.getElementById('mobile-overlay-menu');
    if (!overlay) return;
    const isHidden = overlay.classList.contains('hidden');
    
    if (isHidden) {
        overlay.classList.remove('hidden');
        overlay.classList.add('flex');
        document.body.style.overflow = 'hidden'; 
    } else {
        overlay.classList.add('hidden');
        overlay.classList.remove('flex');
        document.body.style.overflow = '';
    }
}

function toggleMobileSearch() {
    const searchBar = document.getElementById('mobile-search-bar');
    if (!searchBar) return;
    if (searchBar.classList.contains('hidden')) {
        searchBar.classList.remove('hidden');
    } else {
        searchBar.classList.add('hidden');
    }
}

async function fetchProducts() {
    console.log("Fetching products...");
    try {
        const query = `*[_type == "product"]{
            _id,
            name,
            price,
            category,
            "oldImage": image.asset->url,
            "images": images[].asset->url,
            description,
            sizes
        }`;
        products = await client.fetch(query);
        // Normalize: merge old image into images array if images is empty
        products = products.map(p => ({
            ...p,
            images: (p.images && p.images.length > 0) ? p.images : (p.oldImage ? [p.oldImage] : [])
        }));

        console.log("Products loaded successfully:", products.length);
        loadProducts();
    } catch (error) {
        console.error("Error fetching products:", error);
        const grid = document.getElementById('product-grid');
        if (grid) grid.innerHTML = `<p class="col-span-full text-center text-red-500 py-8">حدث خطأ أثناء جلب البيانات. يرجى المحاولة لاحقاً.</p>`;
    }
}

async function fetchSettings() {
    console.log("Fetching settings...");
    try {
        const query = `*[_type == "siteSettings"][0]{
            title,
            heroDesc,
            "heroImage": heroImage.asset->url,
            aboutText,
            contactPhone
        }`;
        const settings = await client.fetch(query);
        console.log("Settings fetched:", settings ? "Yes" : "No");
        if (settings) {
            if (settings.title) {
                const titleEl = document.getElementById('hero-title');
                if (titleEl) titleEl.innerText = settings.title;
            }
            if (settings.heroDesc) {
                const descEl = document.getElementById('hero-desc');
                if (descEl) descEl.innerText = settings.heroDesc;
            }
            if (settings.heroImage) {
                const heroImg = document.getElementById('hero-img');
                if (heroImg) heroImg.src = settings.heroImage;
            }
            if (settings.aboutText) {
                const aboutEl = document.getElementById('footer-about');
                if (aboutEl) aboutEl.innerText = settings.aboutText;
            }
        }
    } catch (error) {
        console.error("Error fetching settings:", error);
    }
}

function loadProducts() {
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    if (products.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center py-12 text-gray-500">لا توجد منتجات حالياً</div>`;
        return;
    }
    grid.innerHTML = products.map(p => {
        const mainImage = (p.images && p.images.length > 0) ? p.images[0] : 'placeholder.png';
        return `
        <div class="bg-white rounded-2xl shadow-sm hover:shadow-md transition group h-full flex flex-col cursor-pointer" onclick="openProduct('${p._id}')">
            <div class="relative aspect-[4/5] overflow-hidden rounded-t-2xl">
                <img src="${mainImage}" alt="${p.name}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500">
                <div class="absolute bottom-3 right-3">
                    <span class="bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-sm font-bold shadow-sm">${p.price} دج</span>
                </div>
            </div>
            <div class="p-4 flex flex-col flex-1">
                <h3 class="font-bold text-lg mb-1">${p.name}</h3>
                <p class="text-gray-500 text-sm line-clamp-1 mb-4">${p.category || 'عام'}</p>
                <div class="mt-auto">
                    <button class="w-full bg-black text-white py-2.5 rounded-xl font-bold hover:bg-brand-500 transition flex items-center justify-center space-x-reverse space-x-2">
                        <i class="fas fa-shopping-bag text-sm"></i>
                        <span>عرض التفاصيل</span>
                    </button>
                </div>
            </div>
        </div>
    `;
    }).join('');
}

function renderPortableText(blocks) {
    if (!blocks) return 'لا يوجد وصف متاح.';
    // Handle old plain text format (string with newlines)
    if (typeof blocks === 'string') {
        return blocks.split('\n').map(line => `<p>${line}</p>`).join('');
    }
    if (!Array.isArray(blocks)) return 'لا يوجد وصف متاح.';
    try {
        return toHTML(blocks);
    } catch (e) {
        // Fallback: render blocks as paragraphs
        return blocks.map(block => {
            if (block._type === 'block' && block.children) {
                const text = block.children.map(c => c.text || '').join('');
                return `<p>${text}</p>`;
            }
            return '';
        }).join('');
    }
}

function openProduct(id) {
    const p = products.find(prod => prod._id === id);
    if (!p) return;

    const container = document.getElementById('product-detail-container');
    if (!container) return;

    const images = (p.images && p.images.length > 0) ? p.images : ['placeholder.png'];
    const mainImage = images[0];
    const descriptionHtml = renderPortableText(p.description);

    const thumbnailsHtml = images.length > 1 ? `
        <div class="flex gap-3 mt-4 overflow-x-auto pb-2">
            ${images.map((img, i) => `
                <img src="${img}" onclick="switchProductImage('${img}')" 
                     class="w-20 h-24 object-cover rounded-xl cursor-pointer border-2 ${i === 0 ? 'border-brand-400' : 'border-transparent'} hover:border-brand-400 transition product-thumb"
                     alt="صورة ${i + 1}">
            `).join('')}
        </div>
    ` : '';

    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div>
                <div class="rounded-3xl overflow-hidden shadow-sm">
                    <img id="product-main-image" src="${mainImage}" class="w-full h-auto object-cover" alt="${p.name}">
                </div>
                ${thumbnailsHtml}
            </div>
            <div class="flex flex-col">
                <div class="mb-8">
                    <button onclick="showView('home')" class="text-gray-500 hover:text-brand-600 mb-6 flex items-center space-x-reverse space-x-2">
                        <i class="fas fa-arrow-right"></i>
                        <span>العودة للمتجر</span>
                    </button>
                    <h2 class="text-4xl font-bold mb-2">${p.name}</h2>
                    <p class="text-3xl font-bold text-brand-600 mb-6">${p.price} دج</p>
                    <div class="prose text-gray-600 mb-8 leading-relaxed">
                        ${descriptionHtml}
                    </div>
                </div>

                ${p.sizes ? `
                <div class="mb-8">
                    <label class="block font-bold mb-3">اختر القياس:</label>
                    <div class="flex flex-wrap gap-3">
                        ${p.sizes.map(s => `
                            <button onclick="selectSize(this, '${s}')" class="size-btn px-6 py-2 rounded-xl border-2 border-gray-100 hover:border-brand-400 transition font-bold">${s}</button>
                        `).join('')}
                    </div>
                </div>
                ` : ''}

                <div class="flex gap-4">
                    <div class="flex items-center border-2 border-gray-100 rounded-xl px-4">
                        <button onclick="changeQty(-1)" class="text-2xl hover:text-brand-500">-</button>
                        <span id="prod-qty" class="px-6 font-bold text-lg">1</span>
                        <button onclick="changeQty(1)" class="text-2xl hover:text-brand-500">+</button>
                    </div>
                    <button onclick="addToCart('${p._id}')" class="flex-1 bg-black text-white rounded-xl font-bold text-lg hover:bg-brand-500 transition py-4">أضف إلى السلة</button>
                </div>
            </div>
        </div>
    `;
    showView('product');
}

function switchProductImage(url) {
    const mainImg = document.getElementById('product-main-image');
    if (mainImg) mainImg.src = url;
    // Update thumbnail borders
    document.querySelectorAll('.product-thumb').forEach(thumb => {
        thumb.classList.toggle('border-brand-400', thumb.src === url);
        thumb.classList.toggle('border-transparent', thumb.src !== url);
    });
}

let selectedSize = '';
let currentQty = 1;

function selectSize(btn, size) {
    document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('border-brand-400', 'bg-brand-50'));
    btn.classList.add('border-brand-400', 'bg-brand-50');
    selectedSize = size;
}

function changeQty(delta) {
    currentQty = Math.max(1, currentQty + delta);
    const qtyEl = document.getElementById('prod-qty');
    if (qtyEl) qtyEl.innerText = currentQty;
}

function addToCart(id) {
    const p = products.find(prod => prod._id === id);
    if (!p) return;
    if (p.sizes && !selectedSize) {
        alert('يرجى اختيار المقاس أولاً');
        return;
    }

    const cartItem = {
        id: p._id,
        name: p.name,
        price: p.price,
        image: (p.images && p.images.length > 0) ? p.images[0] : 'placeholder.png',
        selectedSize: selectedSize,
        qty: currentQty
    };

    cart.push(cartItem);
    updateCartUI();
    showToast();
    showView('home');
    
    // Reset selection
    selectedSize = '';
    currentQty = 1;
}

function updateCartUI() {
    const count = cart.reduce((acc, item) => acc + item.qty, 0);
    const countEl = document.getElementById('cart-count');
    const countMobileEl = document.getElementById('cart-count-mobile');
    if (countEl) countEl.innerText = count;
    if (countMobileEl) countMobileEl.innerText = count;
}

function renderCart() {
    const list = document.getElementById('cart-items-list');
    const totalEl = document.getElementById('cart-total-price');
    if (!list || !totalEl) return;

    if (cart.length === 0) {
        list.innerHTML = `<div class="text-center py-12 text-gray-500">سلتك فارغة حالياً</div>`;
        totalEl.innerText = '0 دج';
        return;
    }

    list.innerHTML = cart.map((item, index) => `
        <div class="flex items-center space-x-reverse space-x-4 border-b pb-4 last:border-0 last:pb-0">
            <img src="${item.image}" class="w-20 h-24 object-cover rounded-xl">
            <div class="flex-1">
                <h4 class="font-bold">${item.name}</h4>
                <p class="text-sm text-gray-500">${item.selectedSize ? `المقاس: ${item.selectedSize} | ` : ''}الكمية: ${item.qty}</p>
                <p class="font-bold text-brand-600">${item.price * item.qty} دج</p>
            </div>
            <button onclick="removeFromCart(${index})" class="text-red-500 hover:bg-red-50 p-2 rounded-lg transition">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');

    const total = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
    totalEl.innerText = `${total} دج`;
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartUI();
    renderCart();
}

function showToast() {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.classList.remove('translate-y-20', 'opacity-0');
    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
    }, 3000);
}

function initWilayas() {
    const select = document.getElementById('wilaya-select');
    if (!select) return;
    select.innerHTML = '<option value="">اختر الولاية</option>';
    algeriaWilayas.forEach(w => {
        const opt = document.createElement('option');
        opt.value = w;
        opt.textContent = w;
        select.appendChild(opt);
    });
}

const staticPages = {
    delivery: {
        title: "معلومات التوصيل",
        content: `<h3>توصيل لكافة الولايات</h3><p>نوفر خدمة التوصيل إلى باب المنزل في 58 ولاية جزائرية. مدة التوصيل تتراوح بين 24 إلى 72 ساعة حسب الولاية.</p>`
    },
    about: {
        title: "من نحن",
        content: `<h3>Jana Elegance</h3><p>نحن وجهتكم الأولى للأناقة والجمال. ننتقي لكم أجود الموديلات بأسعار تنافسية وجودة عالية.</p>`
    },
    policy: {
        title: "سياسة الخصوصية",
        content: `<h3>حماية بياناتكم</h3><p>نحن نلتزم بحماية خصوصية عملائنا. البيانات التي تقدمها تُستخدم فقط لغرض توصيل طلباتكم.</p>`
    },
    contact: {
        title: "اتصل بنا",
        content: `<h3>تواصلوا معنا عبر:</h3><p>رقم الهاتف: 0555555555<br>إنستكرام: @jana_elegance</p>`
    }
};

function loadStaticPage(key) {
    const p = staticPages[key];
    const container = document.getElementById('page-content');
    if (p && container) {
        container.innerHTML = `<h2 class="text-3xl font-bold mb-6">${p.title}</h2>${p.content}`;
    }
}

// Order Submission
const checkoutForm = document.getElementById('checkout-form');
if (checkoutForm) {
    checkoutForm.onsubmit = async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('submit-btn');
        if (!submitBtn) return;
        submitBtn.disabled = true;
        submitBtn.innerText = "جاري إرسال الطلب...";
        submitBtn.classList.add('bg-gray-400');

        const orderData = {
            _type: 'order',
            customerName: document.getElementById('cust-name').value,
            phone: document.getElementById('cust-phone').value,
            wilaya: document.getElementById('wilaya-select').value,
            commune: document.getElementById('cust-commune').value,
            address: document.getElementById('cust-address').value,
            items: cart.map(item => ({
                _key: Math.random().toString(36).substr(2, 9),
                productName: item.name,
                size: item.selectedSize,
                qty: item.qty,
                price: item.price
            })),
            total: cart.reduce((acc, item) => acc + (item.price * item.qty), 0),
            status: 'pending'
        };

        try {
            await writeClient.create(orderData);
            
            // Build thank you page summary
            const summaryEl = document.getElementById('thankyou-order-summary');
            if (summaryEl) {
                summaryEl.innerHTML = `
                    <h4 class="font-bold text-lg mb-3"><i class="fas fa-receipt ml-2"></i>ملخص طلبك</h4>
                    <p class="text-gray-600 mb-2"><strong>الاسم:</strong> ${orderData.customerName}</p>
                    <p class="text-gray-600 mb-2"><strong>الهاتف:</strong> ${orderData.phone}</p>
                    <p class="text-gray-600 mb-4"><strong>التوصيل إلى:</strong> ${orderData.wilaya} - ${orderData.commune}</p>
                    <div class="border-t pt-3 space-y-2">
                        ${orderData.items.map(item => `
                            <div class="flex justify-between text-sm text-gray-600">
                                <span>${item.productName} ${item.size ? '(' + item.size + ')' : ''} × ${item.qty}</span>
                                <span class="font-bold">${item.price * item.qty} دج</span>
                            </div>
                        `).join('')}
                    </div>
                    <div class="border-t mt-3 pt-3 flex justify-between font-bold text-lg">
                        <span>المجموع:</span>
                        <span class="text-green-600">${orderData.total} دج</span>
                    </div>
                `;
            }

            cart = [];
            updateCartUI();
            showView('thankyou');
            e.target.reset();
        } catch (error) {
            console.error("Order error:", error);
            alert("عذراً، حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = "تأكيد الطلب الآن";
            submitBtn.classList.remove('bg-gray-400');
        }
    };
}

// Export functions to window for HTML event handlers
window.showView = showView;
window.toggleMobileMenu = toggleMobileMenu;
window.toggleMobileSearch = toggleMobileSearch;
window.openProduct = openProduct;
window.selectSize = selectSize;
window.changeQty = changeQty;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.switchProductImage = switchProductImage;
window.loadStaticPage = loadStaticPage;

// Startup
console.log("App starting as module. Initializing data...");
fetchProducts();
fetchSettings();
initWilayas();
window.addEventListener('load', () => {
    // Extra insurance for UI initialization
    updateCartUI();
});
