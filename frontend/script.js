// ══ CITIES ══════════════════════════════════════════════════════════════════
const CITIES = [
  {name:"New Delhi",state:"Delhi",icon:"🏛️"},{name:"Mumbai",state:"Maharashtra",icon:"🌆"},
  {name:"Kolkata",state:"West Bengal",icon:"🌉"},{name:"Chennai",state:"Tamil Nadu",icon:"🏖️"},
  {name:"Bengaluru",state:"Karnataka",icon:"🌿"},{name:"Hyderabad",state:"Telangana",icon:"🕌"},
  {name:"Ahmedabad",state:"Gujarat",icon:"🏺"},{name:"Pune",state:"Maharashtra",icon:"🎓"},
  {name:"Lucknow",state:"Uttar Pradesh",icon:"🕌"},{name:"Kanpur",state:"Uttar Pradesh",icon:"🏭"},
  {name:"Varanasi",state:"Uttar Pradesh",icon:"🙏"},{name:"Agra",state:"Uttar Pradesh",icon:"🕌"},
  {name:"Prayagraj",state:"Uttar Pradesh",icon:"🌊"},{name:"Meerut",state:"Uttar Pradesh",icon:"🏙️"},
  {name:"Jaipur",state:"Rajasthan",icon:"🏰"},{name:"Jodhpur",state:"Rajasthan",icon:"🏯"},
  {name:"Udaipur",state:"Rajasthan",icon:"🏞️"},{name:"Amritsar",state:"Punjab",icon:"🌟"},
  {name:"Ludhiana",state:"Punjab",icon:"🏗️"},{name:"Chandigarh",state:"Punjab/Haryana",icon:"🌳"},
  {name:"Shimla",state:"Himachal Pradesh",icon:"⛰️"},{name:"Dehradun",state:"Uttarakhand",icon:"🌲"},
  {name:"Haridwar",state:"Uttarakhand",icon:"🙏"},{name:"Patna",state:"Bihar",icon:"🌾"},
  {name:"Guwahati",state:"Assam",icon:"🍵"},{name:"Bhubaneswar",state:"Odisha",icon:"🛕"},
  {name:"Ranchi",state:"Jharkhand",icon:"🌿"},{name:"Coimbatore",state:"Tamil Nadu",icon:"🏭"},
  {name:"Madurai",state:"Tamil Nadu",icon:"🛕"},{name:"Trichy",state:"Tamil Nadu",icon:"🛕"},
  {name:"Mysuru",state:"Karnataka",icon:"🏰"},{name:"Mangaluru",state:"Karnataka",icon:"🌴"},
  {name:"Thiruvananthapuram",state:"Kerala",icon:"🌴"},{name:"Kochi",state:"Kerala",icon:"🚢"},
  {name:"Kozhikode",state:"Kerala",icon:"🌿"},{name:"Visakhapatnam",state:"Andhra Pradesh",icon:"⚓"},
  {name:"Vijayawada",state:"Andhra Pradesh",icon:"🌊"},{name:"Surat",state:"Gujarat",icon:"💎"},
  {name:"Vadodara",state:"Gujarat",icon:"🏛️"},{name:"Rajkot",state:"Gujarat",icon:"🌾"},
  {name:"Indore",state:"Madhya Pradesh",icon:"🏙️"},{name:"Bhopal",state:"Madhya Pradesh",icon:"🌊"},
  {name:"Jabalpur",state:"Madhya Pradesh",icon:"🌳"},{name:"Gwalior",state:"Madhya Pradesh",icon:"🏰"},
  {name:"Nagpur",state:"Maharashtra",icon:"🍊"},{name:"Nashik",state:"Maharashtra",icon:"🍇"},
  {name:"Aurangabad",state:"Maharashtra",icon:"🛕"},{name:"Raipur",state:"Chhattisgarh",icon:"🌾"},
  {name:"Jammu",state:"J&K",icon:"⛰️"},{name:"Srinagar",state:"J&K",icon:"🌷"},
];

const TODAY = new Date().toISOString().split('T')[0];

function initDates() {
  ['s-date','bk-date'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.min = TODAY; el.value = TODAY; }
  });
}

// ══ AUTOCOMPLETE ═══════════════════════════════════════════════════════════
let acIndex = -1;
function cityAC(inputEl, ddId) {
  const q = inputEl.value.trim().toLowerCase();
  const dd = document.getElementById(ddId);
  acIndex = -1;
  if (!q) { dd.innerHTML=''; dd.classList.remove('open'); return; }
  const matches = CITIES.filter(c => c.name.toLowerCase().includes(q) || c.state.toLowerCase().includes(q)).slice(0,8);
  if (!matches.length) {
    dd.innerHTML = `<div class="city-no-results">No cities found for "${inputEl.value}"</div>`;
    dd.classList.add('open'); return;
  }
  dd.innerHTML = matches.map((c,i) =>
    `<div class="city-item" data-index="${i}" data-name="${c.name}"
          onmousedown="pickCity('${c.name}','${inputEl.id}','${ddId}')">
       <span class="city-item-icon">${c.icon}</span>
       <span class="city-item-name">${hl(c.name,q)}</span>
       <span class="city-item-state">${c.state}</span>
     </div>`
  ).join('');
  dd.classList.add('open');
}
function hl(text, q) {
  const i = text.toLowerCase().indexOf(q);
  if (i<0) return text;
  return text.slice(0,i)+`<strong style="color:#38bdf8">${text.slice(i,i+q.length)}</strong>`+text.slice(i+q.length);
}
function pickCity(name, inputId, ddId) {
  document.getElementById(inputId).value = name;
  const dd = document.getElementById(ddId);
  dd.classList.remove('open'); dd.innerHTML='';
  loadHeroCalendar();
}
function cityKey(e, ddId, inputId) {
  const dd = document.getElementById(ddId);
  const items = dd.querySelectorAll('.city-item');
  if (!items.length) return;
  if (e.key==='ArrowDown'){e.preventDefault();acIndex=Math.min(acIndex+1,items.length-1);items.forEach((el,i)=>el.classList.toggle('active',i===acIndex));items[acIndex]?.scrollIntoView({block:'nearest'});}
  else if (e.key==='ArrowUp'){e.preventDefault();acIndex=Math.max(acIndex-1,0);items.forEach((el,i)=>el.classList.toggle('active',i===acIndex));items[acIndex]?.scrollIntoView({block:'nearest'});}
  else if (e.key==='Enter'&&acIndex>=0){e.preventDefault();pickCity(items[acIndex].dataset.name,inputId,ddId);}
  else if (e.key==='Escape'){dd.classList.remove('open');dd.innerHTML='';acIndex=-1;}
}
document.addEventListener('click', e => {
  if (!e.target.closest('.sf')) {
    document.querySelectorAll('.city-dropdown').forEach(d=>{d.classList.remove('open');d.innerHTML='';});
    acIndex=-1;
  }
});

// ══ STATE ═══════════════════════════════════════════════════════════════════
const API = (window.location.protocol === 'file:' || !window.location.hostname) ? 'http://localhost:8000' : '';
let token = localStorage.getItem('re_tok');
let uName = localStorage.getItem('re_name');
let uRole = localStorage.getItem('re_role');
let selTrain = null, pendingTk = null;
let allMyTickets = [];
let heroSearchDate = null;

async function req(method, path, body) {
  const h = {'Content-Type':'application/json'};
  if (token) h['Authorization'] = 'Bearer '+token;
  const r = await fetch(API+path,{method,headers:h,body:body?JSON.stringify(body):undefined});
  const d = await r.json();
  if (!r.ok) throw new Error(d.error||'Request failed');
  return d;
}

function toast(msg, type='info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`; el.textContent = msg;
  document.getElementById('toast').appendChild(el);
  setTimeout(()=>el.remove(), 3400);
}

function go(page) {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('show'));
  document.getElementById('page-'+page).classList.add('show');
  if (page==='home') { loadTrains(); loadRacGroupCards(); }
  if (page==='tickets') loadMyTickets();
  if (page==='admin') loadAdmin();
  if (page==='profile') loadProfile();
}

function setUser(data) {
  token=data.token; uName=data.name; uRole=data.role;
  localStorage.setItem('re_tok',token);
  localStorage.setItem('re_name',uName);
  localStorage.setItem('re_role',uRole);
  if (data.gender) {
    localStorage.setItem('re_gender', data.gender);
  }
  updateNav();
}

function updateNav() {
  const in_=!!token;
  document.getElementById('nav-auth').style.display    = in_?'none':'flex';
  document.getElementById('user-info').style.display   = in_?'flex':'none';
  document.getElementById('nav-tickets').style.display = in_?'inline':'none';
  const navProf = document.getElementById('nav-profile');
  if (navProf) navProf.style.display = in_?'inline':'none';
  document.getElementById('nav-admin').style.display   = (in_&&uRole==='admin')?'inline':'none';
  if (in_) {
    document.getElementById('nav-name').textContent = uName;
    document.getElementById('nav-avatar').textContent = (uName||'U')[0].toUpperCase();
  }
}

async function loadProfile() {
  const el = document.getElementById('profile-content');
  el.innerHTML = `<div class="empty"><div class="spin" style="border-color:#e2e8f0;border-top-color:#2563eb;width:28px;height:28px"></div></div>`;
  try {
    const p = await req('GET', '/profile');
    el.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:12px">
        <div class="tf"><label>Name</label><span style="font-size:16px;font-weight:600">${p.name}</span></div>
        <div class="tf"><label>Email</label><span style="font-size:16px">${p.email}</span></div>
        <div class="tf"><label>Age</label><span style="font-size:16px">${p.age}</span></div>
        <div class="tf"><label>Gender</label><span style="font-size:16px;text-transform:capitalize">${p.gender}</span></div>
        <div class="tf"><label>Phone</label><span style="font-size:16px">${p.phone || '—'}</span></div>
        <div class="tf"><label>Role</label><span style="font-size:16px;text-transform:capitalize;color:#7c3aed;font-weight:700">${p.role}</span></div>
      </div>
    `;
  } catch(e) {
    el.innerHTML = `<div class="empty"><div class="icon">⚠️</div><h3>Could not load profile</h3></div>`;
    toast(e.message, 'err');
  }
}

function logout() {
  token=uName=uRole=null; localStorage.clear(); updateNav(); go('home'); toast('Logged out','info');
}
function openOv(id) { document.getElementById(id).classList.add('open'); }
function closeOv(id) { document.getElementById(id).classList.remove('open'); }

// ══ RAC GROUP CARDS (homepage recommendation) ════════════════════════════
async function loadRacGroupCards() {
  const section = document.getElementById('rac-group-section');
  const container = document.getElementById('rac-group-cards');
  container.innerHTML = '';
  try {
    // Fetch only active RAC trains directly from backend
    const racTrains = await req('GET', '/trains?has_rac=1');
    if (!racTrains.length) { section.style.display='none'; return; }
    section.style.display='block';
    container.innerHTML = racTrains.map(t => buildRacGroupCard(t)).join('');
  } catch(e) {
    section.style.display='none';
  }
}

function buildRacGroupCard(t) {
  const filledBerths = t.rac_slots - t.available_rac;
  // Simulate 2 passengers on first berth for visual demo
  const genderColors = {male:'occupied-male', female:'occupied-female', other:'occupied-male'};
  const genderIcons  = {male:'👨', female:'👩', other:'👤'};

  const slot1 = `<div class="rg-slot occupied-male"><span class="slot-icon">👨</span><span class="slot-name">Passenger</span><span class="slot-gender">Male</span></div>`;
  const slot2 = filledBerths >= 1
    ? `<div class="rg-slot occupied-male"><span class="slot-icon">👨</span><span class="slot-name">Passenger</span><span class="slot-gender">Male</span></div>`
    : `<div class="rg-slot empty"><span class="slot-icon">➕</span><span class="slot-name">Open</span><span class="slot-gender">Same gender</span></div>`;

  return `
  <div class="rac-group-card" onclick='openBooking(${JSON.stringify(t).replace(/'/g,"&#39;")})'>
    <div class="rg-header">
      <div class="rg-train-num">${t.number}</div>
      <div class="rg-train-name">${t.name}</div>
      <div class="rg-route">📍 ${t.from_city} → ${t.to_city}</div>
      <div class="rg-badge">RAC ${t.available_rac} left</div>
    </div>
    <div class="rg-berths">
      <div class="rg-berth-label">🛏️ Berth #1 — Side Lower (${t.departure} – ${t.arrival})</div>
      <div class="rg-berth-row">
        ${slot1}
        <div class="rg-divider">⟷</div>
        ${slot2}
      </div>
      <div style="font-size:11px;color:#7c3aed;margin-top:4px;padding:6px 8px;background:#faf5ff;border-radius:7px">
        ✅ Gender-matched · ⬆️ Auto-upgrades if confirmed passenger cancels
      </div>
    </div>
    <div class="rg-footer">
      <div class="rg-footer-info">🗓 ${t.departure} → ${t.arrival}</div>
      <div class="rg-footer-fare">₹${t.fare.toLocaleString('en-IN')}</div>
    </div>
  </div>`;
}

// ══ TRAINS ═══════════════════════════════════════════════════════════════
function seatInfo(t) {
  if (t.available_seats>0) return {cls:'b-green',text:`✓ ${t.available_seats} Confirmed`};
  if (t.available_rac>0)  return {cls:'b-purple',text:`RAC ${t.available_rac} slots`};
  if (t.waitlist_count<t.waitlist_limit) return {cls:'b-orange',text:`WL ${t.waitlist_count}/${t.waitlist_limit}`};
  return {cls:'b-red',text:'No seats'};
}

function trainCard(t) {
  const s = seatInfo(t);
  const racTag = (t.available_seats===0&&t.available_rac>0)
    ? `<span class="rac-gender-tag">🟣 RAC · Same-gender pairing</span>` : '';
  return `
  <div class="card train-card" onclick='openBooking(${JSON.stringify(t).replace(/'/g,"&#39;")})'>
    <div class="tc-head">
      <span class="tc-num">${t.number}</span>
      <span class="tc-name">${t.name}</span>${racTag}
    </div>
    <div class="tc-route">
      <div class="rp"><div class="time">${t.departure}</div><div class="city">${t.from_city}</div></div>
      <div class="rl"><div class="rl-bar"></div><div class="rl-label" style="font-weight:600; color:#3b82f6;">${t.duration ? `⏱ ${t.duration} · 📏 ${t.distance} km` : 'DIRECT'}</div></div>
      <div class="rp end"><div class="time">${t.arrival}</div><div class="city">${t.to_city}</div></div>
    </div>
    <div class="tc-foot">
      <span class="badge ${s.cls}">${s.text}</span>
      <div class="fare">₹${t.fare.toLocaleString('en-IN')} <small>/ seat</small></div>
    </div>
  </div>`;
}

let currentTrainsList = [];
let isFeatured = false;

function applySort() {
  const mode = document.getElementById('sort-filter').value;
  let list = [...currentTrainsList];
  
  if (mode === 'price_asc') {
    list.sort((a,b) => a.fare - b.fare);
  } else if (mode === 'price_desc') {
    list.sort((a,b) => b.fare - a.fare);
  } else if (mode === 'fastest') {
    const getMin = t => {
      const [h,m] = t.split(':').map(Number);
      return h*60 + m;
    };
    list.sort((a,b) => {
      let da = getMin(a.arrival) - getMin(a.departure);
      if (da < 0) da += 24*60;
      let db = getMin(b.arrival) - getMin(b.departure);
      if (db < 0) db += 24*60;
      return da - db;
    });
  }

  const totalCount = list.length;
  if (list.length > 100) {
    list = list.slice(0, 100);
  }

  if (isFeatured) {
    document.getElementById('res-sub').textContent = `Showing first ${list.length} of ${totalCount} available trains. Use search to filter.`;
  } else {
    const from = document.getElementById('s-from').value.trim();
    const to = document.getElementById('s-to').value.trim();
    const date = document.getElementById('s-date').value;
    document.getElementById('res-sub').textContent = `Showing first ${list.length} of ${totalCount} trains found${date ? ' on ' + date : ''}`;
  }

  const el = document.getElementById('trains-list');
  el.innerHTML = list.length ? list.map(trainCard).join('') :
    `<div class="empty"><div class="icon">🔍</div><h3>No trains found</h3></div>`;
}

async function loadTrains() {
  const el = document.getElementById('trains-list');
  el.innerHTML=`<div class="empty"><div class="spin"></div></div>`;
  try {
    currentTrainsList = await req('GET','/trains');
    isFeatured = true;
    document.getElementById('sort-filter').value = 'default';
    document.getElementById('res-title').textContent='Featured Routes';
    applySort();
  } catch(e) {
    el.innerHTML=`<div class="empty"><div class="icon">⚠️</div><h3>Could not load trains</h3></div>`;
  }
}

async function searchTrains() {
  const from=document.getElementById('s-from').value.trim();
  const to=document.getElementById('s-to').value.trim();
  const date=document.getElementById('s-date').value;
  let url='/trains?';
  if (from) url+=`from=${encodeURIComponent(from)}&`;
  if (to)   url+=`to=${encodeURIComponent(to)}&`;
  try {
    currentTrainsList = await req('GET',url);
    isFeatured = false;
    document.getElementById('sort-filter').value = 'default';
    document.getElementById('res-title').textContent = from||to?`${from||'Any'} → ${to||'Any'}`:'All Trains';
    applySort();
  } catch(e) { toast(e.message,'err'); }
}

// ══ BOOKING ═══════════════════════════════════════════════════════════════
let selectedDate = null;

async function loadCalendar() {
  const scroller = document.getElementById('bk-date-scroller');
  const btn = document.getElementById('bk-btn');
  const notice = document.getElementById('bk-rac-notice');
  
  scroller.innerHTML = `<div style="padding:20px;text-align:center;width:100%;color:#64748b;font-size:13px"><span class="spin" style="width:14px;height:14px;border-width:2px;border-color:#3b82f6;border-top-color:transparent;display:inline-block;vertical-align:middle;margin-right:6px"></span> Loading calendar...</div>`;
  btn.disabled = true;
  notice.innerHTML = '';
  selectedDate = null;
  
  try {
    const days = await req('GET', `/availability-range?train_id=${selTrain.id}&days=14`);
    scroller.innerHTML = '';
    
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    
    days.forEach(d => {
      const dt = new Date(d.date);
      const dayStr = dayNames[dt.getDay()];
      const dateNum = dt.getDate();
      const monthStr = monthNames[dt.getMonth()];
      
      let statusClass = '', statusHtml = '', isBookable = false;
      if (d.available_seats > 0) {
        statusClass = 'avail'; statusHtml = `AVAL ${d.available_seats}`; isBookable = true;
      } else if (d.available_rac > 0) {
        statusClass = 'rac'; statusHtml = `RAC ${d.available_rac}`; isBookable = true;
      } else if (d.waitlist_count < d.waitlist_limit) {
        statusClass = 'wl'; statusHtml = `WL ${d.waitlist_count}`; isBookable = true;
      } else {
        statusClass = 'booked'; statusHtml = `BOOKED`; isBookable = false;
      }
      
      const card = document.createElement('div');
      card.className = `date-card ${statusClass}`;
      
      // Auto-select heroSearchDate if available
      if (heroSearchDate === d.date && isBookable) {
        card.classList.add('selected');
        selectedDate = d.date;
        btn.disabled = false;
        if (statusClass === 'rac') notice.innerHTML=`<div class="rac-notice"><strong>ℹ️ RAC Berth — Gender-Matched Pairing</strong>No confirmed seats. You'll receive a RAC berth shared with a same-gender passenger.</div>`;
        else if (statusClass === 'wl') notice.innerHTML=`<div class="rac-notice" style="background:#fffbeb;border-color:#fde68a;color:#92400e"><strong>⚠️ Waiting List</strong> You'll be added to the waitlist.</div>`;
      }

      card.innerHTML = `
        <div class="dc-day">${dayStr}</div>
        <div class="dc-date">${dateNum}</div>
        <div class="dc-month">${monthStr}</div>
        <div class="dc-status">${statusHtml}</div>
      `;
      
      if (isBookable) {
        card.onclick = () => selectDateCard(card, d, statusClass);
      }
      scroller.appendChild(card);
    });
  } catch (e) {
    scroller.innerHTML = `<div style="padding:20px;text-align:center;width:100%;color:#dc2626;font-size:13px">Failed to load calendar</div>`;
  }
}

function selectDateCard(cardEl, data, statusClass) {
  document.querySelectorAll('.date-card').forEach(c => c.classList.remove('selected'));
  cardEl.classList.add('selected');
  selectedDate = data.date;
  
  const notice = document.getElementById('bk-rac-notice');
  const btn = document.getElementById('bk-btn');
  
  if (statusClass === 'rac') {
    notice.innerHTML=`<div class="rac-notice"><strong>ℹ️ RAC Berth — Gender-Matched Pairing</strong>No confirmed seats. You'll receive a RAC berth shared with a same-gender passenger.</div>`;
  } else if (statusClass === 'wl') {
    notice.innerHTML=`<div class="rac-notice" style="background:#fffbeb;border-color:#fde68a;color:#92400e"><strong>⚠️ Waiting List</strong> You'll be added to the waitlist.</div>`;
  } else {
    notice.innerHTML='';
  }
  btn.disabled = false;
}

function openBooking(train) {
  if (!token) { go('login'); toast('Please login to book','info'); return; }
  selTrain = train;
  document.getElementById('bk-subtitle').textContent = `${train.name} · ${train.from_city} → ${train.to_city}`;
  
  const total = train.fare+40;
  document.getElementById('bk-summary').innerHTML=`
    <div class="sum-row"><span>Base Fare</span><span>₹${train.fare.toLocaleString('en-IN')}</span></div>
    <div class="sum-row"><span>Reservation Charge</span><span>₹40</span></div>
    <div class="sum-row total"><span>Total</span><span>₹${total.toLocaleString('en-IN')}</span></div>`;
  document.getElementById('bk-btn').textContent=`Confirm & Pay ₹${total.toLocaleString('en-IN')}`;
  
  loadCalendar();
  openOv('ov-book');
}

async function confirmBook() {
  if (!selectedDate){toast('Pick a journey date','err');return;}
  const btn=document.getElementById('bk-btn');
  btn.innerHTML='<span class="spin"></span> Booking...'; btn.disabled=true;
  try {
    const tk = await req('POST','/book',{train_id:selTrain.id,journey_date:selectedDate});
    pendingTk=tk; closeOv('ov-book'); openPayModal(tk);
    toast(tk.status==='rac'?`RAC booked! Berth: ${tk.seat_number}`:`Booked! PNR: ${tk.pnr}`,'ok');
  } catch(e){toast(e.message,'err');}
  finally{btn.textContent=`Confirm & Pay ₹${(selTrain.fare+40).toLocaleString('en-IN')}`;btn.disabled=false;}
}

function openPayModal(tk) {
  document.getElementById('pay-pnr').textContent = tk.pnr;
  const labels={confirmed:'✅ Confirmed Seat',rac:'🟣 RAC Berth (shared)',waiting:'🟡 Waiting List'};
  document.getElementById('pay-summary').innerHTML=`
    <div class="sum-row"><span>Status</span><span>${labels[tk.status]||tk.status}${tk.seat_number?' · '+tk.seat_number:''}</span></div>
    <div class="sum-row"><span>Journey Date</span><span>${tk.journey_date}</span></div>
    <div class="sum-row total"><span>Amount</span><span>₹${(tk.fare+40).toLocaleString('en-IN')}</span></div>`;
  // update QR amount
  document.getElementById('qr-amount').textContent = `₹${(tk.fare+40).toLocaleString('en-IN')}`;
  drawQR(tk.pnr, tk.fare+40);
  switchPayTab('card');
  openOv('ov-pay');
}

// ══ PAYMENT TABS ═════════════════════════════════════════════════════════
function switchPayTab(tab) {
  ['card','upi','bank'].forEach(t=>{
    document.getElementById('ptab-'+t).classList.toggle('active',t===tab);
    document.getElementById('pf-'+t).classList.toggle('show',t===tab);
  });
}

// Card formatting
function fmtCard(el) {
  let v = el.value.replace(/\D/g,'').slice(0,16);
  el.value = v.replace(/(\d{4})(?=\d)/g,'$1 ');
  const disp = v.padEnd(16,'•').replace(/(.{4})/g,'$1 ').trim();
  document.getElementById('prev-number').textContent = disp;
}
function fmtExpiry(el) {
  let v=el.value.replace(/\D/g,'').slice(0,4);
  if (v.length>2) v=v.slice(0,2)+'/'+v.slice(2);
  el.value=v;
  document.getElementById('prev-expiry').textContent=v||'MM/YY';
}

// QR Code generator (pure canvas — no external lib)
function drawQR(pnr, amount) {
  const canvas = document.getElementById('qr-canvas');
  const ctx = canvas.getContext('2d');
  const size = 180;
  // Draw a deterministic pattern based on PNR
  ctx.fillStyle='#fff';ctx.fillRect(0,0,size,size);
  const data = pnr+amount;
  const cells = 21; const cellSize = Math.floor(size/cells);
  ctx.fillStyle='#0f172a';
  // Finder patterns
  function finder(x,y){
    ctx.fillStyle='#0f172a';ctx.fillRect(x,y,7*cellSize,7*cellSize);
    ctx.fillStyle='#fff';ctx.fillRect(x+cellSize,y+cellSize,5*cellSize,5*cellSize);
    ctx.fillStyle='#0f172a';ctx.fillRect(x+2*cellSize,y+2*cellSize,3*cellSize,3*cellSize);
  }
  finder(0,0);finder((cells-7)*cellSize,0);finder(0,(cells-7)*cellSize);
  // Data cells (deterministic hash-based)
  let hash=0;for(let i=0;i<data.length;i++){hash=((hash<<5)-hash)+data.charCodeAt(i);hash|=0;}
  for(let r=0;r<cells;r++){for(let c=0;c<cells;c++){
    if((r<8&&c<8)||(r<8&&c>cells-9)||(r>cells-9&&c<8))continue;
    const bit=(hash^(r*cells+c)*0x9e3779b9)&1;
    if(bit){ctx.fillStyle='#0f172a';ctx.fillRect(c*cellSize,r*cellSize,cellSize,cellSize);}
  }}
  // RailEase center logo
  const cx=size/2,cy=size/2,cr=18;
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(cx,cy,cr+2,0,2*Math.PI);ctx.fill();
  ctx.fillStyle='#7c3aed';ctx.beginPath();ctx.arc(cx,cy,cr,0,2*Math.PI);ctx.fill();
  ctx.fillStyle='#fff';ctx.font='bold 14px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('🚂',cx,cy);
}

function selectUpiApp(name) {
  document.getElementById('upi-id').placeholder=`yourname@${name.toLowerCase()}`;
  document.querySelectorAll('.upi-app').forEach(a=>a.style.borderColor='#e2e8f0');
  event.currentTarget.style.borderColor='#7c3aed';
}

function selBank(el) {
  document.querySelectorAll('.bank-opt').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');
}

async function doPay(method) {
  if (!pendingTk) return;
  // Basic validation
  if (method==='card') {
    const num=document.getElementById('c-number').value.replace(/\s/g,'');
    const nm=document.getElementById('c-name').value;
    const exp=document.getElementById('c-expiry').value;
    const cvv=document.getElementById('c-cvv').value;
    if (num.length<16||!nm||exp.length<5||cvv.length<3){toast('Please fill all card details','err');return;}
  }
  if (method==='upi') {
    const uid=document.getElementById('upi-id').value;
    if (!uid&&!document.querySelector('.upi-app[style*="7c3aed"]')){
      toast('Enter UPI ID or select an app','err');return;
    }
  }
  try {
    await req('POST','/pay',{ticket_id:pendingTk.id});
    closeOv('ov-pay');
    toast('Payment successful! 🎉','ok');
    loadRacGroupCards();
    go('tickets');
  } catch(e){toast(e.message,'err');}
}

// ══ MY TICKETS ════════════════════════════════════════════════════════════
function racPairBox(t) {
  const gi = t.passenger_gender==='female'?'👩':'👨';
  const gc = t.passenger_gender==='female'?'#be185d':'#1e40af';
  const gb = t.passenger_gender==='female'?'#fdf2f8':'#eff6ff';
  const gbc= t.passenger_gender==='female'?'#fbcfe8':'#bfdbfe';
  return `
  <div style="background:#faf5ff;border:1.5px solid #e9d5ff;border-radius:10px;padding:14px 18px;margin:10px 18px">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#7c3aed;margin-bottom:10px">🛏️ ${t.seat_number} — Shared Side-Lower Berth</div>
    <div style="display:grid;grid-template-columns:1fr 28px 1fr;gap:8px;align-items:center">
      <div style="background:${gb};border:1.5px solid ${gbc};border-radius:10px;padding:12px;text-align:center">
        <div style="font-size:22px;margin-bottom:4px">${gi}</div>
        <div style="font-size:11px;font-weight:700;color:${gc}">You</div>
      </div>
      <div style="text-align:center;color:#c4b5fd;font-size:20px">⟷</div>
      <div style="background:#f8fafc;border:1.5px dashed #e9d5ff;border-radius:10px;padding:12px;text-align:center">
        <div style="font-size:22px;margin-bottom:4px">${gi}</div>
        <div style="font-size:11px;font-weight:700;color:#7c3aed">Co-passenger</div>
        <div style="font-size:10px;color:#94a3b8">Same gender</div>
      </div>
    </div>
    <div style="font-size:10px;color:#7c3aed;text-align:center;margin-top:8px;padding-top:8px;border-top:1px dashed #e9d5ff">
      ✅ Gender-matched · 🔑 Same-account share supported · ⬆️ Auto-upgrades on cancellation
    </div>
  </div>`;
}

let currentFilter = 'all';
function filterTickets(status, btn) {
  currentFilter=status;
  document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  renderTickets(allMyTickets);
}

function renderTickets(list) {
  const el=document.getElementById('my-tickets');
  const filtered=currentFilter==='all'?list:list.filter(t=>t.status===currentFilter);
  if (!filtered.length) {
    el.innerHTML=`<div class="empty"><div class="icon">🎫</div><h3>No ${currentFilter!=='all'?currentFilter:''} tickets</h3></div>`;
    return;
  }
  const sc={confirmed:'s-confirmed',rac:'s-rac',waiting:'s-waiting',cancelled:'s-cancelled'};
  el.innerHTML=filtered.map(t=>{
    const isRac=t.status==='rac';
    return `
    <div class="card" style="${isRac?'border-color:#e9d5ff':''};overflow:hidden;margin-bottom:14px">
      <div class="ticket-head" style="${isRac?'background:linear-gradient(135deg,#3b0764,#6d28d9)':''}">
        <div>
          <span class="ticket-pnr">PNR: ${t.pnr}</span>
          ${isRac?`<span style="margin-left:10px;font-size:10px;color:#e9d5ff;font-weight:700">🛏️ SHARED · SAME-GENDER</span>`:''}
        </div>
        <span class="status-badge ${sc[t.status]||''}">${t.status.toUpperCase()}${t.waitlist_pos?' WL-'+t.waitlist_pos:''}</span>
      </div>
      ${isRac?racPairBox(t):''}
      <div class="ticket-body">
        <div class="tf"><label>Train</label><span>${t.train_name}</span></div>
        <div class="tf"><label>Route</label><span>${t.from_city} → ${t.to_city}</span></div>
        <div class="tf"><label>Date</label><span>${t.journey_date}</span></div>
        <div class="tf"><label>Seat / Berth</label><span>${t.seat_number||'—'}</span></div>
        <div class="tf"><label>Departure</label><span>${t.departure}</span></div>
        <div class="tf"><label>Payment</label><span>${t.payment_done?'✅ Paid':'⏳ Pending'}</span></div>
        ${t.status==='cancelled'&&t.refund_amount>0?`<div class="tf"><label style="color:#059669">Refund</label><span style="color:#059669;font-weight:700">₹${t.refund_amount}</span></div>`:''}
        ${t.status==='cancelled'&&t.cancellation_charge>0?`<div class="tf"><label style="color:#dc2626">Cancel Fee</label><span style="color:#dc2626">₹${t.cancellation_charge}</span></div>`:''}
      </div>
      ${t.status!=='cancelled'?`<div class="ticket-foot">
        ${!t.payment_done?`<button class="btn sm green" onclick='pendingTk=${JSON.stringify(t).replace(/'/g,"&#39;")};openPayModal(${JSON.stringify(t).replace(/'/g,"&#39;")})'>Pay Now</button>`:''}
        <button class="btn sm" style="background:#475569" onclick='printTicket(${JSON.stringify(t).replace(/'/g,"&#39;")})'>🖨️ Print</button>
        <button class="btn sm red" onclick="cancelTk(${t.id})">Cancel</button>
      </div>`:''}
    </div>`;
  }).join('');
}

function printTicket(t) {
  const isRac = t.status === 'rac';
  const printWindow = window.open('', '', 'width=600,height=800');
  printWindow.document.write(`
    <html>
      <head>
        <title>Ticket - PNR: ${t.pnr}</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #1e293b; }
          .t-card { border: 2px dashed #cbd5e1; border-radius: 12px; padding: 24px; max-width: 500px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #f1f5f9; padding-bottom: 16px; }
          h1 { margin: 0; color: #2563eb; font-size: 28px; }
          .pnr { font-family: monospace; font-size: 18px; font-weight: bold; background: #f1f5f9; padding: 4px 12px; border-radius: 6px; }
          .row { display: flex; justify-content: space-between; margin-bottom: 16px; border-bottom: 1px solid #f8fafc; padding-bottom: 8px;}
          .label { font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: bold; }
          .val { font-size: 16px; font-weight: 600; }
          .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; border: 1px solid #000;}
          .rac-note { margin-top: 16px; padding: 12px; background: #f3e8ff; border-radius: 8px; text-align: center; font-size: 12px; color: #7c3aed; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="t-card">
          <div class="header">
            <h1>RailEase Ticket</h1>
            <p>Happy Journey!</p>
            <span class="pnr">PNR: ${t.pnr}</span>
          </div>
          <div style="text-align:right; margin-bottom:16px;">
            <span class="status">${t.status} ${t.waitlist_pos ? 'WL-'+t.waitlist_pos : ''}</span>
          </div>
          <div class="row"><div><div class="label">Train</div><div class="val">${t.train_name}</div></div></div>
          <div class="row">
            <div><div class="label">From</div><div class="val">${t.from_city} <span style="font-size:12px;color:#64748b">(${t.departure})</span></div></div>
            <div style="text-align:right"><div class="label">To</div><div class="val">${t.to_city} <span style="font-size:12px;color:#64748b">(${t.arrival || ''})</span></div></div>
          </div>
          <div class="row">
            <div><div class="label">Date</div><div class="val">${t.journey_date}</div></div>
            <div style="text-align:right"><div class="label">Seat/Berth</div><div class="val">${t.seat_number || 'TBD'}</div></div>
          </div>
          <div class="row">
            <div><div class="label">Payment Status</div><div class="val">${t.payment_done ? 'Paid (₹' + (t.fare + 40) + ')' : 'Pending'}</div></div>
          </div>
          ${isRac ? `<div class="rac-note">🛏️ RAC Status: This berth is shared with a co-passenger of the same gender (${t.passenger_gender}).</div>` : ''}
        </div>
        <script>
          setTimeout(() => { window.print(); window.close(); }, 500);
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

async function loadMyTickets() {
  const el=document.getElementById('my-tickets');
  el.innerHTML=`<div class="empty"><div class="spin" style="border-color:#e2e8f0;border-top-color:#2563eb;width:28px;height:28px"></div></div>`;
  try {
    const list=await req('GET','/my-tickets');
    if (!list.length) {
      el.innerHTML=`<div class="empty"><div class="icon">🎫</div><h3>No tickets yet</h3><p>Search trains and book!</p><button class="btn sm" style="margin-top:14px" onclick="go('home')">Find Trains</button></div>`;
      return;
    }
    const ug=localStorage.getItem('re_gender')||'male';
    list.forEach(t=>{if(!t.passenger_gender)t.passenger_gender=ug;});
    allMyTickets=list;
    const rc=list.filter(t=>t.status==='rac').length;
    document.querySelectorAll('.filter-btn').forEach(b=>{if(b.textContent.startsWith('🟣'))b.textContent=rc>0?`🟣 RAC (${rc})`:'🟣 RAC';});
    renderTickets(list);
  } catch(e) {
    el.innerHTML=`<div class="empty"><div class="icon">⚠️</div><h3>Could not load tickets</h3></div>`;
  }
}

async function cancelTk(id) {
  const t = allMyTickets.find(x => x.id === id);
  const charge = t.status === 'confirmed' ? Math.round(t.fare * 0.20) : 60;
  const refund = t.payment_done ? Math.max(t.fare + 40 - charge, 0) : 0;
  const msg = t.payment_done 
    ? `Cancellation charge: ₹${charge}\nRefund amount: ₹${refund}\n\nAre you sure you want to cancel this ticket?` 
    : `Cancel this unpaid ticket? Seat will be released.`;
  
  if (!confirm(msg)) return;
  try {
    const r=await req('DELETE',`/cancel/${id}`);
    toast(r.message,'ok'); loadMyTickets(); loadRacGroupCards();
  } catch(e){toast(e.message,'err');}
}

// ══ AUTH ══════════════════════════════════════════════════════════════════
async function doLogin() {
  try {
    const d=await req('POST','/login',{email:document.getElementById('l-email').value,password:document.getElementById('l-pass').value});
    setUser(d); fetchAndStoreGender();
    toast(`Welcome, ${d.name}! 👋`,'ok');
    go(d.role==='admin'?'admin':'home');
  } catch(e){toast(e.message,'err');}
}

async function doRegister() {
  try {
    const gender=document.getElementById('r-gender').value;
    const d=await req('POST','/register',{name:document.getElementById('r-name').value,email:document.getElementById('r-email').value,password:document.getElementById('r-pass').value,age:parseInt(document.getElementById('r-age').value)||18,gender,phone:document.getElementById('r-phone').value});
    setUser(d); localStorage.setItem('re_gender',gender);
    toast(`Welcome, ${d.name}! 🚂`,'ok'); go('home');
  } catch(e){toast(e.message,'err');}
}

async function fetchAndStoreGender() {
  try {
    const tickets=await req('GET','/my-tickets');
    if(tickets.length&&tickets[0].passenger_gender)localStorage.setItem('re_gender',tickets[0].passenger_gender);
  } catch(_){}
}

// ══ ADMIN ════════════════════════════════════════════════════════════════
async function loadAdmin() {
  try {
    const s=await req('GET','/admin/stats');
    document.getElementById('admin-stats').innerHTML=`
      <div class="stat"><div class="stat-label">Passengers</div><div class="stat-val blue">${s.passengers}</div></div>
      <div class="stat"><div class="stat-label">Active Trains</div><div class="stat-val blue">${s.trains}</div></div>
      <div class="stat"><div class="stat-label">Total Bookings</div><div class="stat-val">${s.bookings}</div></div>
      <div class="stat"><div class="stat-label">Revenue</div><div class="stat-val green">₹${Math.round(s.revenue).toLocaleString('en-IN')}</div></div>
      <div class="stat"><div class="stat-label">Confirmed</div><div class="stat-val green">${s.confirmed}</div></div>
      <div class="stat"><div class="stat-label">RAC</div><div class="stat-val purple">${s.rac}</div></div>
      <div class="stat"><div class="stat-label">Waiting</div><div class="stat-val" style="color:#d97706">${s.waiting}</div></div>
      <div class="stat"><div class="stat-label">Cancelled</div><div class="stat-val red">${s.cancelled}</div></div>`;
    adminTab('bookings',document.querySelector('.tab.active'));
  } catch(e){toast('Could not load admin data','err');}
}

async function adminTab(tab, el) {
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  if(el)el.classList.add('active');
  const c=document.getElementById('admin-content');
  c.innerHTML=`<div class="empty"><div class="spin" style="border-color:#e2e8f0;border-top-color:#2563eb;width:28px;height:28px"></div></div>`;
  try {
    if (tab==='bookings') {
      const bk=await req('GET','/admin/bookings');
      const sc={confirmed:'s-confirmed',rac:'s-rac',waiting:'s-waiting',cancelled:'s-cancelled'};
      c.innerHTML=bk.length?`<div class="table-wrap"><table>
        <thead><tr><th>PNR</th><th>Passenger</th><th>Gender</th><th>Train</th><th>Route</th><th>Date</th><th>Status</th><th>Seat</th></tr></thead>
        <tbody>${bk.map(b=>`<tr>
          <td><strong style="font-family:'JetBrains Mono',monospace">${b.pnr}</strong></td>
          <td>${b.passenger_name||'—'}</td>
          <td>${b.passenger_gender==='female'?'👩 Female':'👨 Male'}</td>
          <td>${b.train_name}</td>
          <td>${b.from_city} → ${b.to_city}</td>
          <td>${b.journey_date}</td>
          <td><span class="status-badge ${sc[b.status]||''}">${b.status.toUpperCase()}</span></td>
          <td>${b.seat_number||'—'}${b.status==='rac'?' <span style="font-size:10px;color:#7c3aed">(shared)</span>':''}</td>
        </tr>`).join('')}</tbody>
      </table></div>`:`<div class="empty"><div class="icon">📋</div><h3>No bookings yet</h3></div>`;
    } else if (tab==='trains') {
      const tr=await req('GET','/admin/trains');
      c.innerHTML=`<div class="table-wrap"><table>
        <thead><tr><th>No.</th><th>Name</th><th>Route</th><th>Times</th><th>Seats</th><th>RAC</th><th>WL</th><th>Fare</th></tr></thead>
        <tbody>${tr.map(t=>`<tr>
          <td><strong style="font-family:'JetBrains Mono',monospace">${t.number}</strong></td>
          <td>${t.name}</td>
          <td>${t.from_city} → ${t.to_city}</td>
          <td>${t.departure} – ${t.arrival}</td>
          <td>${t.available_seats}/${t.total_seats}</td>
          <td><span style="color:#7c3aed;font-weight:700">${t.available_rac}/${t.rac_slots}</span></td>
          <td>${t.waitlist_count}/${t.waitlist_limit}</td>
          <td>₹${t.fare.toLocaleString('en-IN')}</td>
        </tr>`).join('')}</tbody>
      </table></div>`;
    } else if (tab==='add') {
      c.innerHTML=`
        <div class="card" style="padding:26px;max-width:520px">
          <h3 style="font-size:18px;font-weight:800;margin-bottom:16px;letter-spacing:-.3px">Add New Train</h3>
          <div class="fg-row">
            <div class="fg"><label>Train Number</label><input id="nt-no" placeholder="12345"/></div>
            <div class="fg"><label>Train Name</label><input id="nt-nm" placeholder="Express Name"/></div>
          </div>
          <div class="fg-row">
            <div class="fg"><label>From City</label><input id="nt-from" placeholder="New Delhi"/></div>
            <div class="fg"><label>To City</label><input id="nt-to" placeholder="Mumbai"/></div>
          </div>
          <div class="fg-row">
            <div class="fg"><label>Departure</label><input id="nt-dep" placeholder="06:30"/></div>
            <div class="fg"><label>Arrival</label><input id="nt-arr" placeholder="14:45"/></div>
          </div>
          <div class="fg-row">
            <div class="fg"><label>Total Seats</label><input id="nt-seats" type="number" value="100"/></div>
            <div class="fg"><label>RAC Slots</label><input id="nt-rac" type="number" value="10"/></div>
          </div>
          <div class="fg"><label>Fare (₹)</label><input id="nt-fare" type="number" value="600"/></div>
          <button class="btn" onclick="addTrain()">Add Train</button>
        </div>`;
    }
  } catch(e){c.innerHTML=`<div class="empty"><div class="icon">⚠️</div><h3>${e.message}</h3></div>`;}
}

async function addTrain() {
  try {
    await req('POST','/admin/add-train',{
      number:document.getElementById('nt-no').value,name:document.getElementById('nt-nm').value,
      from_city:document.getElementById('nt-from').value,to_city:document.getElementById('nt-to').value,
      departure:document.getElementById('nt-dep').value,arrival:document.getElementById('nt-arr').value,
      total_seats:parseInt(document.getElementById('nt-seats').value),rac_slots:parseInt(document.getElementById('nt-rac').value),
      fare:parseFloat(document.getElementById('nt-fare').value),
    });
    toast('Train added!','ok'); adminTab('trains',null);
  } catch(e){toast(e.message,'err');}
}

// ══ INIT ══════════════════════════════════════════════════════════════════
initDates();
updateNav();
loadTrains();
loadRacGroupCards();
