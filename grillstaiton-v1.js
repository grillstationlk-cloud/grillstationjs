let SHOP_WHATSAPP = "";

(function(){
  const d = document, gSel = id => d.getElementById(id);
  const menuSection = gSel('menu'), offersMenu = gSel('offers-menu'), areaSelect = gSel('area-select');
  let products = [], cart = [], areaCharges = {};
  let whatsappNumber = '94702222903'; // fallback number

  // ---------------- Page Options ----------------
  const pageOptionsURL = "https://script.google.com/macros/s/AKfycbyaciMM7ENpY5mfT4jffIffmraAq7Dt7lEVuEBgNwNJnX9I66cLWUMKXP-iu1OjQ50upA/exec";
  fetch(pageOptionsURL)
    .then(res => res.json())
    .then(data => {
      if(data.WhatsAppNumber){ 
        SHOP_WHATSAPP = data.WhatsAppNumber;
        whatsappNumber = SHOP_WHATSAPP;
        document.body.dataset.whatsapp = SHOP_WHATSAPP;
      }
      // Update footer
      const footer = d.querySelector('footer');
      if(footer){
        footer.innerHTML = `
          <p>📍${data.ShopAddress || ''}</p>
          <p>📞 ${data.FooterNumber || ''} | 🕒 Open: ${data.OpeningHours || ''}</p>
          <p>© 2025 Grill Station</p>
        `;
      }
      // Update About Us
      const about = d.querySelector('#about p');
      if(about && data.AboutUs) about.textContent = data.AboutUs;
      // Update logo
      const logo = d.querySelector('header img');
      if(logo && data.LogoImageURL) logo.src = data.LogoImageURL;
    })
    .catch(console.error);

  // ---------------- Load saved cart ----------------
  const savedCart = localStorage.getItem('grillCart');
  if(savedCart) cart = JSON.parse(savedCart);

  // ---------------- Mobile nav toggle ----------------
  const navToggle = d.querySelector('.nav-toggle');
  const nav = d.querySelector('nav');
  navToggle.addEventListener('click', ()=> nav.classList.toggle('active'));
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', ()=> nav.classList.remove('active')));

  // ---------------- Fetch products ----------------
  fetch("https://script.google.com/macros/s/AKfycbyvNHP2s0XIKNa5ZrqhBUinMOxygowcfqRhJ0X0gkMTVZjjWTFvn3c6qZ5R0cNPKcjvBA/exec")
    .then(r=>r.json()).then(dta=>{
      products = dta.map(p=>({
        name: p.name,
        category: p.category,
        image: p.image,
        prices: JSON.parse(p.prices),
        stock: JSON.parse(p.stock),
        section: p.section,
        desc: p.desc
      }));
      generateProducts();
      generateCategories();
      updateCart();
    }).catch(e=>console.error('Products fetch failed', e));

  // ---------------- Fetch areas ----------------
  fetch("https://script.google.com/macros/s/AKfycbxBHA1PJYrwNBtv3SmSGOW7tHZtWnbdv3MzZ6j5KuEJ3XoGXjjEuDd9djUygHicThvKpQ/exec")
    .then(r=>r.json()).then(dt=>{
      dt.forEach(it=>{ if(it.Area) areaCharges[it.Area] = parseFloat(it.Charge||0); });
      Object.keys(areaCharges).forEach(a=>{
        let o = d.createElement('option'); o.value=a; o.textContent=a; areaSelect.appendChild(o);
      });
      updateCart();
    }).catch(e=>console.error('Area fetch failed', e));

  areaSelect.addEventListener('change', ()=>{
    updateCart();
    const v = areaSelect.value;
    if(v.startsWith('http')) window.location.href = v;
  });

  // ---------------- Generate Categories ----------------
  function generateCategories(){
    const categoryList = d.querySelector('.category-list');
    const categories = ['all', ...new Set(products.map(p=>p.category).filter(c=>c))];
    categoryList.innerHTML='';
    categories.forEach(cat=>{
      const btn = d.createElement('button');
      btn.className='cat-btn'; if(cat==='all') btn.classList.add('active');
      btn.dataset.cat = cat; btn.textContent = cat==='all'?'All':cat;
      btn.addEventListener('click', ()=> filter(cat));
      categoryList.appendChild(btn);
    });
  }

  function filter(cat){
    d.querySelectorAll('.cat-btn').forEach(b=>b.classList.remove('active'));
    const btn=d.querySelector(`.cat-btn[data-cat="${cat}"]`); if(btn) btn.classList.add('active');
    menuSection.querySelectorAll('.item').forEach(it=>it.style.display=(cat==='all'||it.dataset.category===cat)?'':'none');
  }

  // ---------------- Generate Products ----------------
  function generateProducts(){
    products.forEach(p=>{
      const parent = p.section==='menu'?menuSection:offersMenu;
      const div=d.createElement('div'); div.className='item';
      if(p.section==='menu' && p.category) div.dataset.category=p.category;

      div.innerHTML = `
        <img src="${p.image}" alt="${p.name}">
        <h2>${p.name}</h2>
        <h3>Price: <span class="live-price"></span></h3>
        ${p.desc?`<p>${p.desc}</p>`:''}
        <select class="size"></select>
        <select class="qty"><option>1</option><option>2</option><option>3</option><option>4</option></select><br>
        ${p.name.toLowerCase().includes("pizza")?'<label><input type="checkbox" class="extra-cheese"> Extra Cheese + LKR 400</label><br>':''}
        <button class="add-cart">Add to Cart</button>
        <span class="out-of-stock">Out of Stock</span>
      `;
      parent.appendChild(div);

      const sizeSel=div.querySelector('.size'), qtySel=div.querySelector('.qty'),
            extra=div.querySelector('.extra-cheese'), live=div.querySelector('.live-price'),
            oos=div.querySelector('.out-of-stock');

      let allZero=true;
      Object.keys(p.prices).forEach(sz=>{
        let opt=d.createElement('option'); opt.value=sz; opt.dataset.price=p.prices[sz]; 
        if((p.stock[sz]||0)<=0) opt.disabled=true; else allZero=false; 
        opt.textContent=sz; sizeSel.appendChild(opt);
      });

      if(allZero){ sizeSel.style.display='none'; qtySel.style.display='none'; if(extra) extra.style.display='none'; div.querySelector('.add-cart').style.display='none'; oos.style.display='block'; live.textContent=''; return; }

      const updPrice=()=>{
        const base=parseFloat(sizeSel.selectedOptions[0].dataset.price||0);
        const q=parseInt(qtySel.value||1); const ch=(extra&&extra.checked)?400:0;
        live.textContent='LKR '+((base+ch)*q).toFixed(2);
      };
      sizeSel.addEventListener('change',updPrice); qtySel.addEventListener('change',updPrice);
      if(extra) extra.addEventListener('change',updPrice); updPrice();

      div.querySelector('.add-cart').addEventListener('click',()=>{
        if(!areaSelect.value){ alert('Please select delivery area first!'); areaSelect.focus(); return; }
        const sz=sizeSel.value, q=parseInt(qtySel.value||1), stk=p.stock[sz]||0;
        if(q>stk){ alert('Only '+stk+' left!'); return; }
        let pr=parseFloat(p.prices[sz]||0), ad=(extra&&extra.checked)?' + Extra Cheese':'';
        if(extra&&extra.checked) pr+=400;
        let ex = cart.find(i=>i.name===p.name&&i.size===sz&&i.addons===ad);
        if(ex){ if(ex.qty+q>stk){ alert('Only '+stk+' left!'); return; } ex.qty+=q; } 
        else { cart.push({name:p.name,size:sz,qty:q,price:pr,addons:ad}); }
        updateCart(); showToast(p.name+" added to cart ✅");
      });
    });
  }

  // ---------------- Cart Functions ----------------
  function saveCart(){ localStorage.setItem('grillCart', JSON.stringify(cart)); }

  function updateCart(){
    const cb=gSel('cart-body'); cb.innerHTML='';
    let cnt=0, sub=0, addTot=0;
    cart.forEach((it,i)=>{
      let addonP = it.addons.includes('Extra Cheese')?400*it.qty:0;
      let itTot = it.price*it.qty + addonP;
      const row=d.createElement('div'); row.className='cart-item';
      row.innerHTML=`<span>${it.name} (${it.size}${it.addons? ' + Extra Cheese':''}) x ${it.qty} = LKR ${itTot.toFixed(2)}</span>`;
      const rm=d.createElement('button'); rm.textContent='X'; rm.onclick=()=>{ cart.splice(i,1); updateCart(); };
      row.appendChild(rm); cb.appendChild(row);
      cnt+=it.qty; sub+=it.price*it.qty; addTot+=addonP;
    });

    gSel('cart-count').textContent=cnt;
    gSel('cart-subtotal').textContent='Items: LKR '+sub.toFixed(2);
    gSel('cart-addons').textContent='Add-ons: LKR '+addTot.toFixed(2);

    const area=areaSelect.value; const del=areaCharges[area]||0;
    gSel('cart-delivery').textContent='Delivery: LKR '+del.toFixed(2);

    const total=sub+addTot+del;
    gSel('cart-total').innerHTML='<strong>Total: LKR '+total.toFixed(2)+'</strong>';

    saveCart();
  }

  gSel('cart-header').addEventListener('click', ()=> gSel('cartoggle').classList.toggle('show'));

  // ---------------- WhatsApp Order ----------------
  function sendCart(area){
    const charge = areaCharges[area]||0;
    let sub=0, addTot=0, itemsText='';

    cart.forEach(it=>{
      const ap = it.addons.includes('Extra Cheese')?400*it.qty:0;
      const itTotal = it.price*it.qty + ap;
      itemsText += `${it.name} (${it.size}${it.addons? ' + Extra Cheese':''}) x ${it.qty} = LKR ${itTotal.toFixed(2)}\n`;
      sub += it.price*it.qty; addTot += ap;
    });

    const total = sub + addTot + charge;

    fetch('https://script.google.com/macros/s/AKfycbx0s1WLhpNyyp_eYj5V-VFogEPft3Swuadq6fhKcMRIMevCpXKyKCNWOfvD1ze-vncS/exec',{
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({items:itemsText, area:area, delivery:charge, total:total, cart:cart})
    }).catch(console.error);

    const msg=encodeURIComponent(`Hello Grill Station, I'd like to place this order:\n\nORDER DETAILS\n${itemsText}\nSubtotal: LKR ${sub.toFixed(2)}\nDelivery (${area}): LKR ${charge.toFixed(2)}\nGrand Total: LKR ${total.toFixed(2)}\n\nPlease confirm the order!`);
    window.open('https://wa.me/'+whatsappNumber+'?text='+msg);

    cart=[]; localStorage.removeItem('grillCart'); updateCart();
  }

gSel('cart-whatsapp').addEventListener('click', ()=>{
  if(cart.length===0){ 
    alert('Cart empty!'); 
    return; 
  }
  if(!areaSelect.value){ 
    alert('Select delivery area first!'); 
    // Scroll to the delivery area dropdown
    areaSelect.scrollIntoView({behavior: 'smooth', block: 'center'});
    areaSelect.focus();
    return; 
  }
  sendCart(areaSelect.value);
});

  // ---------------- Toast ----------------
  function showToast(msg){
    const t = gSel('toast'); t.textContent=msg; t.classList.add('show');
    setTimeout(()=>t.classList.remove('show'),2000);
  }

  // ---------------- Hero Banners ----------------
  (function(){
    const hero = d.querySelector('.hero'); let heroImages=[], heroIndex=0;
    const sheetURL="https://script.google.com/macros/s/AKfycbyRjtsKTaYx6tmv2ta5Sn9ZKVfYKckNoG8P-TKgqg6nN5hPLmKtvWWiX-KpbM8Xtmppnw/exec";
    fetch(sheetURL).then(r=>r.json()).then(data=>{
      heroImages = data.map(i=>i["Image link "]||i["Image link"]||"").filter(l=>l.trim());
      if(heroImages.length) hero.style.backgroundImage=`url('${heroImages[0]}')`;
      setInterval(()=>{ heroIndex=(heroIndex+1)%heroImages.length; hero.style.backgroundImage=`url('${heroImages[heroIndex]}')`; },5000);
    }).catch(console.error);
  })();

})();

// ========================= REVIEWS =========================
const reviews = [
  {stars:5,text:"Delicious food and quick delivery!",author:"– Ramesh"},
  {stars:4,text:"BBQ chicken was perfect, will order again.",author:"– Priya"},
  {stars:5,text:"An up-and-coming food joint with promising potential. The food is really tasty. We tried their BBQ chicken combo, and the chicken, roti, and sauces were all amazing! Wera level!.",author:"– Manas Najmuddeen"},
  {stars:4,text:"Had a dinner with friends food was good 😊 and price also very reasonable..",author:"– Mohamed Munsih Ameenudeen (Munsih)"},
  {stars:5,text:"Best burgers in Gampola!",author:"– Sanjay"}
];

const reviewSlider = document.getElementById('review-slider');
const sliderDots = document.querySelector('.slider-dots');
let currentSlide = 0;

// Generate review slides and dots
reviews.forEach((r,i)=>{
  const div = document.createElement('div'); 
  div.className = 'review-slide'; 
  if(i===0) div.classList.add('active');
  div.innerHTML = `<div class="stars">${'★'.repeat(r.stars)}</div><p>${r.text}</p><span>${r.author}</span>`;
  reviewSlider.appendChild(div);

  const dot = document.createElement('span'); 
  if(i===0) dot.classList.add('active');
  dot.addEventListener('click',()=>{ showSlide(i); });
  sliderDots.appendChild(dot);
});

// Show slide by index
function showSlide(index){
  document.querySelectorAll('.review-slide').forEach((slide,i)=>slide.classList.toggle('active',i===index));
  document.querySelectorAll('.slider-dots span').forEach((dot,i)=>dot.classList.toggle('active',i===index));
  currentSlide = index;
}

// Auto slide every 5 seconds
setInterval(()=>{ showSlide((currentSlide+1)%reviews.length); },5000);

// ========================= GOOGLE REVIEW POPUP =========================
const reviewBtn = document.getElementById('google-review-btn');
const popup = document.getElementById('rating-popup');
const ratingStars = document.getElementById('rating-stars');
const ratingText = document.getElementById('rating-text');
let rating = 0;

// Show popup
reviewBtn.addEventListener('click', () => {
  popup.style.display = 'flex';
  updateStars(0);
  ratingText.textContent = "Tap stars to rate";
});

// Close popup when clicking outside
popup.addEventListener('click', e => { if (e.target === popup) popup.style.display = 'none'; });

// Create star elements
for (let i = 1; i <= 5; i++) {
  const span = document.createElement('span');
  span.innerHTML = '★';
  span.dataset.value = i;

  span.addEventListener('mouseover', () => updateStars(i));
  span.addEventListener('click', () => {
    rating = i;
    ratingText.textContent = `You selected ${i} star(s)`;
  });

  ratingStars.appendChild(span);
}

// Update star colors
function updateStars(val) {
  ratingStars.querySelectorAll('span').forEach(s => s.classList.toggle('active', s.dataset.value <= val));
}

// Submit rating
document.getElementById('submit-rating').addEventListener('click', () => {
  if (rating === 0) { alert("Select a rating first"); return; }
  popup.style.display = 'none';

  if (rating <= 3) {
    alert("Thank you for your feedback! We’ll use it to improve our service.");
  } else {
    const googleReviewUrl = "https://search.google.com/local/writereview?placeid=ChIJTZcnnwtv4zoRZSlSgdPm2nw";
    alert("Thanks for your rating! Please leave a Google review to support us.");
    window.open(googleReviewUrl, "_blank");
  }
});
  
