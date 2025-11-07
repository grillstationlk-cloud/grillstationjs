(function(){
  const d=document, w=window;
  const gSel=id=>d.getElementById(id);
  const menuSection=gSel('menu'), offersMenu=gSel('offers-menu'), areaSelect=gSel('area-select');
  const whatsapp=d.body.dataset.whatsapp || '94702222903';
  let products=[], cart=[], areaCharges={};

  // --- Mobile nav toggle ---
  const navToggle=d.querySelector('.nav-toggle');
  const nav=d.querySelector('nav');
  navToggle.addEventListener('click',()=>nav.classList.toggle('active'));
  nav.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>nav.classList.remove('active')));

  // --- Fetch products ---
  fetch("https://script.google.com/macros/s/AKfycbyvNHP2s0XIKNa5ZrqhBUinMOxygowcfqRhJ0X0gkMTVZjjWTFvn3c6qZ5R0cNPKcjvBA/exec")
  .then(r=>r.json()).then(dta=>{
    products=dta.map(p=>({name:p.name,category:p.category,image:p.image,prices:JSON.parse(p.prices),stock:JSON.parse(p.stock),section:p.section,desc:p.desc}));
    gen();
  }).catch(e=>console.error('prod fail',e));

  // --- Fetch areas ---
  fetch("https://script.google.com/macros/s/AKfycbxBHA1PJYrwNBtv3SmSGOW7tHZtWnbdv3MzZ6j5KuEJ3XoGXjjEuDd9djUygHicThvKpQ/exec")
  .then(r=>r.json()).then(dt=>{
    dt.forEach(it=>{ if(it.Area) areaCharges[it.Area]=parseFloat(it.Charge||0); });
    Object.keys(areaCharges).forEach(a=>{let o=d.createElement('option'); o.value=a; o.textContent=a; areaSelect.appendChild(o);});
    updCart();
  }).catch(e=>console.error('area fail',e));
  areaSelect.addEventListener('change',updCart);

  // --- Categories ---
  d.querySelectorAll('.cat-btn').forEach(btn=>btn.addEventListener('click',function(){ filter(this.dataset.cat); }));
  function filter(cat){
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`.cat-btn[data-cat="${cat}"]`);
    if(btn) btn.classList.add('active');

    menuSection.querySelectorAll('.item').forEach(it => {
      if(cat === 'all' || it.dataset.category === cat){
        it.style.display = '';
      } else {
        it.style.display = 'none';
      }
    });
  }

  // --- Generate products ---
  function gen(){
    products.forEach(p=>{
      const parent=p.section==='menu'?menuSection:offersMenu;
      const div=d.createElement('div'); div.className='item';
      if(p.section==='menu'&&p.category) div.dataset.category=p.category;
      let html='<img src="'+p.image+'" alt="'+p.name+'"><h2>'+p.name+'</h2><h3>Price: <span class="live-price"></span></h3>'+(p.desc?'<p>'+p.desc+'</p>':'')+'<select class="size"></select><select class="qty"><option>1</option><option>2</option><option>3</option><option>4</option></select><br>'+(p.name.toLowerCase().includes("pizza")?'<label><input type="checkbox" class="extra-cheese"> Extra Cheese + LKR 400</label><br>':'')+'<button class="add-cart">Add to Cart</button><span class="out-of-stock">Out of Stock</span>';
      div.innerHTML=html; parent.appendChild(div);

      const sizeSel=div.querySelector('.size'), qtySel=div.querySelector('.qty'), extra=div.querySelector('.extra-cheese'), live=div.querySelector('.live-price'), oos=div.querySelector('.out-of-stock');
      let allZero=true;
      Object.keys(p.prices).forEach(sz=>{ 
        let opt=d.createElement('option'); opt.value=sz; opt.dataset.price=p.prices[sz]; 
        if((p.stock[sz]||0)<=0) opt.disabled=true; else allZero=false; 
        opt.textContent=sz; sizeSel.appendChild(opt); 
      });
      if(allZero){ sizeSel.style.display='none'; qtySel.style.display='none'; if(extra) extra.style.display='none'; div.querySelector('.add-cart').style.display='none'; oos.style.display='block'; live.textContent=''; return; }

      const upd=()=>{ 
        const base=parseFloat(sizeSel.selectedOptions[0].dataset.price||0);
        const q=parseInt(qtySel.value||1);
        const ch=(extra&&extra.checked)?400:0; 
        live.textContent='LKR '+((base+ch)*q).toFixed(2); 
      };
      sizeSel.addEventListener('change',upd); qtySel.addEventListener('change',upd); if(extra) extra.addEventListener('change',upd); upd();

      div.querySelector('.add-cart').addEventListener('click',()=>{
        if(!areaSelect.value){
          alert('Please select a delivery area first!');
          areaSelect.focus();
          return;
        }

        const sz=sizeSel.value, q=parseInt(qtySel.value||1), stk=p.stock[sz]||0;
        if(q>stk){ alert('Only '+stk+' left!'); return; }

        let pr=parseFloat(p.prices[sz]||0), ad=(extra&&extra.checked)?' + Extra Cheese':''; 
        if(extra&&extra.checked) pr+=400;

        let ex=cart.find(i=>i.name===p.name&&i.size===sz&&i.addons===ad);
        if(ex){ 
          if(ex.qty+q>stk){ alert('Only '+stk+' left!'); return; }
          ex.qty+=q; 
        } else {
          cart.push({name:p.name,size:sz,qty:q,price:pr,addons:ad});
        }

        updCart();
        showToast(p.name + " added to cart ✅");
      });
    });
  }

  // --- Cart update ---
  function updCart(){
    const cb=gSel('cart-body'); cb.innerHTML=''; 
    let cnt=0, sub=0, addTot=0;
    cart.forEach((it,i)=>{
      let addonP = it.addons.includes('Extra Cheese') ? 400*it.qty : 0;
      let itTot = it.price*it.qty + addonP;
      const row=d.createElement('div'); row.className='cart-item';
      row.innerHTML='<span>'+it.name+' ('+it.size+(it.addons? ' + Extra Cheese':'')+') x '+it.qty+' = LKR '+itTot.toFixed(2)+'</span>';
      const rm=d.createElement('button'); rm.textContent='X'; rm.onclick=()=>{ cart.splice(i,1); updCart(); };
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
  }

  // --- Cart toggle ---
  gSel('cart-header').addEventListener('click',()=>gSel('cartoggle').classList.toggle('show'));

  gSel('cart-whatsapp').addEventListener('click',()=>{
    if(cart.length===0){ alert('Cart empty!'); return; }
    const area=areaSelect.value; if(!area){ alert('Select area first!'); return; }
    send(area);
  });

  function send(area){
    const charge=areaCharges[area]||0; let sub=0, addTot=0, itemsText='';
    cart.forEach(it=>{
      const ap = it.addons.includes('Extra Cheese')?400*it.qty:0;
      const itTotal = it.price*it.qty + ap;
      itemsText+=it.name+' ('+it.size+(it.addons? ' + Extra Cheese':'')+') x '+it.qty+' = LKR '+itTotal.toFixed(2)+'\n';
      sub+=it.price*it.qty; addTot+=ap;
    });
    const total=sub+addTot+charge;

    try{
      fetch('https://script.google.com/macros/s/AKfycbx0s1WLhpNyyp_eYj5V-VFogEPft3Swuadq6fhKcMRIMevCpXKyKCNWOfvD1ze-vncS/exec',{
        method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({items:itemsText, area:area, delivery:charge, total:total, cart:cart})
      });
    }catch(e){ console.error(e); }

    const msg=encodeURIComponent(`Hello Grill Station, I'd like to place this order:\n\nORDER DETAILS\n${itemsText}\nSubtotal: LKR ${sub.toFixed(2)}\nDelivery (${area}): LKR ${charge.toFixed(2)}\nGrand Total: LKR ${total.toFixed(2)}\n\nPlease confirm the order and total!`);
    window.open('https://wa.me/'+whatsapp+'?text='+msg);
  }

})();

function showToast(msg){
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(()=> toast.classList.remove('show'), 2200);
}
