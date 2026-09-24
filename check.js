

const KEY='chez_jalel_pos_v4';
const blank={settings:{name:'Chez Jalel',subtitle:'Restaurant POS',brand:'#c4142c',maxTicket:50,logo:''},security:{ownerPin:'',staffPin:'',setup:false},categories:[],products:[],orders:[],stock:[],expenses:[],employees:[],salaryPayments:[],audit:[],caisseSession:null,caisseSessions:[]};
let s=JSON.parse(localStorage.getItem(KEY)||'null')||structuredClone(blank);
s.security.serverPin=s.security.serverPin||s.security.staffPin||'';s.employees=s.employees||[];s.salaryPayments=s.salaryPayments||[];s.expenses=s.expenses||[];s.audit=s.audit||[];
// Robust data migration for older local saves.
s.security=s.security||{};s.settings=s.settings||{};s.settings.printer=s.settings.printer||{id:'mpt-ii',name:'MPT-II',paper:'58mm',connection:'Bluetooth',cut:'auto'};s.caisseSession=s.caisseSession||null;s.caisseSessions=Array.isArray(s.caisseSessions)?s.caisseSessions:[];if(s.caisseSession&&!s.caisseSessions.some(x=>x.date===s.caisseSession.date)){s.caisseSessions.push(s.caisseSession);}s.orders=Array.isArray(s.orders)?s.orders:[];s.products=Array.isArray(s.products)?s.products:[];s.categories=Array.isArray(s.categories)?s.categories:[];s.stock=Array.isArray(s.stock)?s.stock:[];s.expenses=Array.isArray(s.expenses)?s.expenses:[];s.employees=Array.isArray(s.employees)?s.employees:[];s.salaryPayments=Array.isArray(s.salaryPayments)?s.salaryPayments:[];s.audit=Array.isArray(s.audit)?s.audit:[];
s.orders.forEach(o=>{o.lines=Array.isArray(o.lines)?o.lines:[];o.total=Number(o.total||0);o.customers=Math.max(1,Number(o.customers||1));o.date=o.date||new Date().toISOString()});

// Chez Jalel starter menu — editable later from Owner > Plus > Menu.
function svgImg(kind){
  const map={
    plate:'🍽️',kaft:'🥘',sandwich:'🥪',tuna:'🐟',drink:'🥤',water:'💧',lemon:'🍋',strawberry:'🍓',merguez:'🌭',chab:'🍢',bones:'🍖',tajine:'🍳',pack:'📦',platepack:'🍱'
  };
  const e=map[kind]||'🍽️';
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420"><rect width="640" height="420" rx="42" fill="#f6f1eb"/><circle cx="320" cy="205" r="145" fill="#fff" stroke="#c4142c" stroke-width="8"/><text x="320" y="240" text-anchor="middle" font-size="132">${e}</text><path d="M150 345h340" stroke="#c4142c" stroke-width="8" stroke-linecap="round" opacity=".7"/></svg>`;
  return 'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg);
}
function seedChezJalelMenu(){
  const defs=[
    {name:'Kafteji',icon:'plate',products:[['كفتاجي عادي',3,'kaft'],['كفتاجي دوبل عظام',3.5,'bones'],['خبزة كفتاجي',5,'sandwich'],['صحن عادي',5,'plate'],['صحن دوبل عظام',6,'bones']]},
    {name:'Thon',icon:'tuna',products:[['كسكروت تن',3.5,'tuna'],['خبزة تن',6.5,'sandwich'],['صحن تونسي',7,'plate']]},
    {name:'Soda',icon:'drink',products:[['Gazouz Bellar 30CL',1.5,'drink'],['Canette',2,'drink'],['Citron',1.5,'lemon'],['Fraise',2.5,'strawberry'],['Eau 1.5L',1.5,'water'],['Eau 0.5L',1,'water']]},
    {name:'Extra',icon:'extra',products:[['مرقاز',1,'merguez'],['كعبة شبتية',0.5,'chab'],['كعبة عظام',0.5,'bones'],['برج طاجين',2,'tajine']]},
    {name:'Gros/Emballage',icon:'pack',products:[['كيلو كفتاجي تعليب',10,'pack'],['Plat Emballage',2,'platepack']]}
  ];
  const iconSvg=(kind)=>{const em={plate:'🍽️',tuna:'🐟',drink:'🥤',extra:'➕',pack:'📦'}[kind]||'•';return `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" stroke-width="2.5"/><text x="24" y="32" text-anchor="middle" font-size="22">${em}</text></svg>`};
  defs.forEach((d,ci)=>{
    let c=s.categories.find(x=>String(x.name).trim().toLowerCase()===d.name.toLowerCase());
    if(!c){c={id:'cat-'+Date.now()+'-'+ci,name:d.name,icon:iconSvg(d.icon)};s.categories.push(c)} else if(!c.icon){c.icon=iconSvg(d.icon)}
    d.products.forEach(([name,price,img],pi)=>{
      let p=s.products.find(x=>String(x.name).trim()===name);
      if(!p){p={id:'prod-'+Date.now()+'-'+ci+'-'+pi,name,price,cat:c.id,image:svgImg(img),stockControl:false};s.products.push(p)}
      else {p.cat=p.cat||c.id;if(!p.image)p.image=svgImg(img)}
    });
  });
  localStorage.setItem(KEY,JSON.stringify(s));
}
seedChezJalelMenu();
let page='dashboard',cart={},customers=1,filterCat='all',loginRole='owner',currentRole=null,serverTable='',dashboardDate=today();
let cloudClient=null,cloudChannel=null,cloudBusy=false,cloudTimer=null,cloudPollTimer=null,cloudPushQueued=false;
function cloudCfg(){return JSON.parse(localStorage.getItem('chezJalelCloudConfig')||'null')}
function cloudStatus(){return localStorage.getItem('chezJalelCloudStatus')||'offline'}
function setCloudStatus(v){localStorage.setItem('chezJalelCloudStatus',v);const el=document.getElementById('cloudStatus');if(el)el.textContent=v==='online'?'🟢 متصل':v==='connecting'?'🟡 جاري الاتصال':'⚪ غير متصل'}
function save(){localStorage.setItem(KEY,JSON.stringify(s));render();scheduleCloudPush()}
function scheduleCloudPush(){const c=cloudCfg();if(!c?.enabled||!navigator.onLine)return;cloudPushQueued=true;clearTimeout(cloudTimer);cloudTimer=setTimeout(()=>cloudPush(),450)}
function updateOfflineUI(){const el=document.getElementById('cjOffline');if(!el)return;el.classList.toggle('show',!navigator.onLine)}
window.addEventListener('online',()=>{updateOfflineUI();showToast('🟢 Internet رجع — synchronisation...');const c=cloudCfg();if(c?.enabled){setTimeout(()=>cloudPull().then(()=>cloudPush()),500)}});
window.addEventListener('offline',updateOfflineUI);

function makeCloudClient(c){if(!window.supabase)return null;return window.supabase.createClient(c.url,c.key,{global:{headers:{'x-chez-key':c.accessKey,'x-chez-device':c.device||'device'}}})}
function stateHasMenu(x){return !!(x&&((x.categories||[]).length||(x.products||[]).length))}
async function cloudPull(opts={}){const c=cloudCfg();if(!c?.enabled)return false;try{cloudBusy=true;setCloudStatus('connecting');if(!cloudClient)cloudClient=makeCloudClient(c);const {data,error}=await cloudClient.from('cloud_state').select('state,updated_at,updated_by').eq('restaurant_id',c.restaurantId).maybeSingle();if(error)throw error;const remoteState=data?.state||null;const localHas=stateHasMenu(s);const remoteHas=stateHasMenu(remoteState);
if(remoteHas && (!localHas || opts.forcePull)){s=Object.assign(structuredClone(blank),remoteState);localStorage.setItem(KEY,JSON.stringify(s));if(data?.updated_at)localStorage.setItem('chezJalelLastCloudSync',data.updated_at);}
else if(localHas && !remoteHas){const now=new Date().toISOString();const up=await cloudClient.from('cloud_state').upsert({restaurant_id:c.restaurantId,access_key:c.accessKey,state:s,updated_at:now,updated_by:c.device||'device'},{onConflict:'restaurant_id'});if(up.error)throw up.error;localStorage.setItem('chezJalelLastCloudSync',now);}
else if(!remoteState){const now=new Date().toISOString();const up=await cloudClient.from('cloud_state').upsert({restaurant_id:c.restaurantId,access_key:c.accessKey,state:s,updated_at:now,updated_by:c.device||'device'},{onConflict:'restaurant_id'});if(up.error)throw up.error;localStorage.setItem('chezJalelLastCloudSync',now);}
setCloudStatus('online');cloudSubscribe();render();return true}catch(e){console.error(e);setCloudStatus('offline');return false}finally{cloudBusy=false}}
async function mirrorStructuredCloud(){
  const c=cloudCfg(); if(!c?.enabled||!cloudClient) return;
  const rid=c.restaurantId;
  const up=(table,rows)=>rows?.length?cloudClient.from(table).upsert(rows,{onConflict:'id'}):Promise.resolve({error:null});
  const categories=(s.categories||s.sections||[]).map((x,i)=>({id:String(x.id||('cat-'+i)),restaurant_id:rid,name:String(x.name||x.title||''),sort_order:i,data:x,updated_at:new Date().toISOString()}));
  const products=(s.products||[]).map((x,i)=>({id:String(x.id||('prod-'+i)),restaurant_id:rid,category_id:x.categoryId||x.category_id||null,name:String(x.name||''),price:Number(x.price||0),stock:x.stock==null?null:Number(x.stock),data:x,updated_at:new Date().toISOString()}));
  const orders=(s.orders||[]).map((x,i)=>({id:String(x.id||('ord-'+i)),restaurant_id:rid,ticket_no:Number(x.ticket||x.ticketNo||x.number||0),source:x.source||null,status:x.status||null,total:Number(x.total||0),order_time:x.date||x.createdAt||null,data:x,updated_at:new Date().toISOString()}));
  const lines=[]; (s.orders||[]).forEach((o,oi)=>{(o.items||o.lines||[]).forEach((x,i)=>lines.push({id:String(x.id||((o.id||('ord-'+oi))+'-'+i)),restaurant_id:rid,order_id:String(o.id||('ord-'+oi)),product_id:x.productId||x.product_id||null,quantity:Number(x.qty||x.quantity||1),data:x,updated_at:new Date().toISOString()}));});
  const expenses=(s.expenses||[]).map((x,i)=>({id:String(x.id||('exp-'+i)),restaurant_id:rid,amount:Number(x.amount||0),expense_date:x.date||null,data:x,updated_at:new Date().toISOString()}));
  const employees=(s.employees||[]).map((x,i)=>({id:String(x.id||('emp-'+i)),restaurant_id:rid,name:String(x.name||''),data:x,updated_at:new Date().toISOString()}));
  const payments=[]; employees.forEach(()=>{}); (s.salaryPayments||s.salary_payments||[]).forEach((x,i)=>payments.push({id:String(x.id||('pay-'+i)),restaurant_id:rid,employee_id:x.employeeId||x.employee_id||null,amount:Number(x.amount||0),payment_date:x.date||null,data:x,updated_at:new Date().toISOString()}));
  const sessions=(s.cashOpenings||s.caisseSessions||[]).map((x,i)=>({id:String(x.id||x.date||('cash-'+i)),restaurant_id:rid,session_date:x.date||null,opening_amount:Number(x.amount||x.opening||0),data:x,updated_at:new Date().toISOString()}));
  const audit=(s.audit||[]).map((x,i)=>({id:String(x.id||('audit-'+i)),restaurant_id:rid,action:x.action||'',role:x.role||'',event_time:x.date||null,data:x,updated_at:new Date().toISOString()}));
  for(const [t,rows] of [['categories',categories],['products',products],['orders',orders],['order_lines',lines],['expenses',expenses],['employees',employees],['salary_payments',payments],['caisse_sessions',sessions],['audit_logs',audit]]){const r=await up(t,rows);if(r.error)throw r.error;}
}

async function cloudPush(){const c=cloudCfg();if(!c?.enabled||!cloudClient||!navigator.onLine)return;if(cloudBusy){cloudPushQueued=true;return}try{cloudBusy=true;cloudPushQueued=false;setCloudStatus('connecting');const remote=await cloudClient.from('cloud_state').select('updated_at,updated_by').eq('restaurant_id',c.restaurantId).maybeSingle();if(remote.error)throw remote.error;const last=localStorage.getItem('chezJalelLastCloudSync')||'';if(remote.data?.updated_at&&last&&remote.data.updated_at>last&&remote.data.updated_by!==(c.device||'device')){await cloudPull();return}const now=new Date().toISOString();const {error}=await cloudClient.from('cloud_state').upsert({restaurant_id:c.restaurantId,access_key:c.accessKey,state:s,updated_at:now,updated_by:c.device||'device'},{onConflict:'restaurant_id'});if(error)throw error;localStorage.setItem('chezJalelLastCloudSync',now);try{await mirrorStructuredCloud()}catch(e){console.warn('Structured mirror skipped',e)}setCloudStatus('online')}catch(e){console.error(e);setCloudStatus('offline')}finally{cloudBusy=false;if(cloudPushQueued){clearTimeout(cloudTimer);cloudTimer=setTimeout(()=>cloudPush(),250)}}}
function applyIncomingState(incoming,updatedAt,updatedBy){if(!incoming)return false;if(updatedBy===(cloudCfg()?.device||'device'))return false;const previousIds=new Set((s.orders||[]).map(o=>o.id));const newServerOrders=(incoming.orders||[]).filter(o=>o.source==='server'&&!previousIds.has(o.id));s=Object.assign(structuredClone(blank),incoming);localStorage.setItem(KEY,JSON.stringify(s));if(updatedAt)localStorage.setItem('chezJalelLastCloudSync',updatedAt);setCloudStatus('online');render();if(currentRole==='staff'&&newServerOrders.length){newServerOrders.slice(-3).forEach(notifyNewServerOrder)}else showToast('☁️ Mise à jour reçue');return true}
function cloudSubscribe(){const c=cloudCfg();if(!c?.enabled||!cloudClient)return;if(cloudChannel)cloudClient.removeChannel(cloudChannel);cloudChannel=cloudClient.channel('chezjalel-'+c.restaurantId).on('postgres_changes',{event:'*',schema:'public',table:'cloud_state',filter:'restaurant_id=eq.'+c.restaurantId},payload=>{if(payload.eventType==='DELETE')return;applyIncomingState(payload.new?.state,payload.new?.updated_at,payload.new?.updated_by)}).subscribe(status=>{if(status==='SUBSCRIBED')setCloudStatus('online');if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')setCloudStatus('online')});
  // Realtime is supplemented by polling so it keeps working even when a Supabase Realtime/RLS setup does not deliver postgres_changes to the browser.
  clearInterval(cloudPollTimer);
  cloudPollTimer=setInterval(()=>cloudCheckRemote(),1000);
}
async function cloudCheckRemote(){const c=cloudCfg();if(!c?.enabled||!cloudClient||!navigator.onLine)return;try{const {data,error}=await cloudClient.from('cloud_state').select('state,updated_at,updated_by').eq('restaurant_id',c.restaurantId).maybeSingle();if(error)throw error;const remote=data?.state;if(!remote)return;const localIds=new Set((s.orders||[]).map(o=>String(o.id)));const incomingOrders=Array.isArray(remote.orders)?remote.orders:[];const newServerOrders=incomingOrders.filter(o=>o&&o.source==='server'&&o.status==='pending'&&!localIds.has(String(o.id)));if(newServerOrders.length){const merged=Object.assign(structuredClone(blank),s);const existing=new Set((merged.orders||[]).map(o=>String(o.id)));merged.orders=[...newServerOrders.filter(o=>!existing.has(String(o.id))),...(merged.orders||[])];s=merged;localStorage.setItem(KEY,JSON.stringify(s));newServerOrders.slice(-5).forEach(notifyNewServerOrder);render();}else if((data.updated_at||'')>(localStorage.getItem('chezJalelLastCloudSync')||'')&&data.updated_by!==(c.device||'device')){applyIncomingState(remote,data.updated_at,data.updated_by)}if(data.updated_at)localStorage.setItem('chezJalelLastCloudSync',data.updated_at);setCloudStatus('online')}catch(e){console.warn('Cloud polling',e)}}
function showToast(msg){let t=document.getElementById('toast');if(!t){t=document.createElement('div');t.id='toast';t.style.cssText='position:fixed;top:90px;left:50%;transform:translateX(-50%);z-index:200;background:#111;color:#fff;padding:10px 14px;border-radius:999px;font-weight:800;box-shadow:0 8px 25px #0005';document.body.appendChild(t)}t.textContent=msg;t.style.display='block';clearTimeout(t._tm);t._tm=setTimeout(()=>t.style.display='none',1800)}
function beepNewOrder(){try{const C=window.AudioContext||window.webkitAudioContext;if(C){const ctx=new C();const now=ctx.currentTime;[0,.16,.32].forEach((d,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=i===1?880:660;g.gain.setValueAtTime(.0001,now+d);g.gain.exponentialRampToValueAtTime(.22,now+d+.02);g.gain.exponentialRampToValueAtTime(.0001,now+d+.13);o.connect(g);g.connect(ctx.destination);o.start(now+d);o.stop(now+d+.14)})}}catch(e){}try{navigator.vibrate?.([180,80,180])}catch(e){}}
function notifyNewServerOrder(o){beepNewOrder();updateServerBadge();const el=document.getElementById('newOrderAlert');const sub=document.getElementById('newOrderAlertSub');if(sub)sub.textContent=`Table ${o.table||'—'} • Ticket #${o.ticket} • ${money(o.total)}`;if(el){el.classList.add('show');clearTimeout(window._orderAlertTimer);window._orderAlertTimer=setTimeout(()=>el.classList.remove('show'),7000)}showToast(`🔔 Nouvelle commande • Table ${o.table||'—'}`);try{printTickets(o);setTimeout(()=>window.print(),450)}catch(e){}}
function hideOrderAlert(){document.getElementById('newOrderAlert')?.classList.remove('show')}

async function connectCloud(){const url=document.getElementById('cloudUrl').value.trim().replace(/\/$/,''),key=document.getElementById('cloudKey').value.trim(),rid=document.getElementById('cloudRid').value.trim()||'chezjalel',access=document.getElementById('cloudAccess').value.trim(),device=document.getElementById('cloudDevice').value.trim()||('device-'+Math.random().toString(36).slice(2,7));if(!url||!key||!rid||!access){alert('كمّل URL + Publishable key + Restaurant ID + Access key');return}localStorage.setItem('chezJalelCloudConfig',JSON.stringify({enabled:true,url,key,restaurantId:rid,accessKey:access,device}));cloudClient=makeCloudClient({url,key,restaurantId:rid,accessKey:access,device});const ok=await cloudPull();if(ok){closeModal();showToast('☁️ Realtime connecté — البيانات المحلية محفوظة في Cloud إذا كان Cloud فارغ');more()}else alert('ما نجّمش نتصل. تأكد من Supabase و SQL والـ keys.')} 
function disconnectCloud(){if(cloudClient&&cloudChannel)cloudClient.removeChannel(cloudChannel);clearInterval(cloudPollTimer);cloudClient=null;cloudChannel=null;localStorage.removeItem('chezJalelCloudConfig');setCloudStatus('offline');closeModal();showToast('Cloud déconnecté');more()}
function cloudManager(){if(!canEdit())return;const c=cloudCfg()||{};document.getElementById('sheet').innerHTML=`<div class="modalhead"><h2>☁️ Cloud & Realtime</h2><button class="btn light" onclick="closeModal()">✕ Fermer</button></div><div class="card"><div class="row"><b>État</b><b id="cloudStatus">${cloudStatus()==='online'?'🟢 متصل':cloudStatus()==='connecting'?'🟡 جاري الاتصال':'⚪ غير متصل'}</b></div><p class="muted">نفس المعلومات تتحط في تليفون الـ Caisse والـ Serveur باش يتزامنوا مع بعضهم.</p></div><label class="small">Supabase Project URL</label><input class="input" id="cloudUrl" value="${esc(c.url||'')}" placeholder="https://xxxx.supabase.co"><br><br><label class="small">Publishable key</label><input class="input" id="cloudKey" value="${esc(c.key||'')}" placeholder="sb_publishable_..."><br><br><label class="small">Restaurant ID</label><input class="input" id="cloudRid" value="${esc(c.restaurantId||'chezjalel')}"><br><br><label class="small">Access key</label><input class="input" id="cloudAccess" type="password" value="${esc(c.accessKey||'')}" placeholder="Code commun للمطعم"><br><br><label class="small">Nom الجهاز</label><input class="input" id="cloudDevice" value="${esc(c.device||'')}" placeholder="Caisse / Serveur 1 / Owner"><button class="btn gold" style="width:100%;margin-top:14px" onclick="connectCloud()">🔗 Connecter & synchroniser</button>${c.enabled?'<button class="btn danger" style="width:100%;margin-top:8px" onclick="disconnectCloud()">Déconnecter Cloud</button>':''}<p class="small muted" style="margin-top:12px">ملاحظة: الـ Publishable key ينجم يكون في التطبيق؛ ممنوع تحط Service Role/Secret key هنا.</p>`;document.getElementById('modal').classList.add('show')}

function printerConfig(){
  s.settings=s.settings||{};
  s.settings.printer=s.settings.printer||{id:'mpt-ii',name:'MPT-II',paper:'58mm',connection:'Bluetooth',cut:'auto'};
  return s.settings.printer;
}
function printerManager(){
  if(!canEdit())return;
  const p=printerConfig();
  const opts=[
    {id:'mpt-ii',name:'MPT-II',desc:'Thermique 58mm • Bluetooth / USB',paper:'58mm',connection:'Bluetooth',icon:'🖨️'},
    {id:'thermal-58-usb',name:'Imprimante thermique 58mm USB',desc:'Thermique 58mm • USB / pilote Windows',paper:'58mm',connection:'USB',icon:'🔌'},
    {id:'thermal-80',name:'Imprimante thermique 80mm',desc:'Thermique 80mm • USB / réseau',paper:'80mm',connection:'USB / Réseau',icon:'🧾'},
    {id:'system',name:'Imprimante système',desc:'Utiliser l’imprimante choisie dans Windows / navigateur',paper:'80mm',connection:'Système',icon:'💻'},
  ];
  document.getElementById('sheet').innerHTML=`<div class="modalhead"><div><h2>🖨️ Imprimantes tickets</h2><p class="muted">اختار الطابعة اللي باش تستعملها للتذاكر.</p></div><button class="btn light" onclick="closeModal()">✕ Fermer</button></div>
  <div class="printer-note"><b>الطابعة الحالية:</b> ${esc(p.name)} • ${esc(p.paper)} • ${esc(p.connection)}</div>
  <div class="printer-list">${opts.map(x=>`<button class="printer-option ${p.id===x.id?'selected':''}" onclick="selectPrinter('${x.id}')"><span class="printer-icon">${x.icon}</span><span class="printer-copy"><b>${esc(x.name)}</b><small>${esc(x.desc)}</small></span><span class="printer-check">${p.id===x.id?'✓':''}</span></button>`).join('')}</div>
  <div class="printer-details"><b>MPT-II</b><br>Model: MPT-II • Papier: 58mm • Bluetooth: <b>MPT-II</b> • Code: <b>0000</b><br><small>La sélection règle le format du ticket. La connexion Bluetooth/USB directe dépend du système ou d’un pilote/app d’impression.</small></div>
  <button class="btn gold" style="width:100%;margin-top:12px" onclick="printerTestPage()">🧪 Tester l’impression</button>`;
  document.getElementById('modal').classList.add('show');
}
function selectPrinter(id){
  const map={
    'mpt-ii':{id:'mpt-ii',name:'MPT-II',paper:'58mm',connection:'Bluetooth',cut:'auto'},
    'thermal-58-usb':{id:'thermal-58-usb',name:'Imprimante thermique 58mm USB',paper:'58mm',connection:'USB',cut:'auto'},
    'thermal-80':{id:'thermal-80',name:'Imprimante thermique 80mm',paper:'80mm',connection:'USB / Réseau',cut:'auto'},
    'system':{id:'system',name:'Imprimante système',paper:'80mm',connection:'Système',cut:'auto'}
  };
  const next=map[id]||map['mpt-ii'];
  s.settings.printer=next; audit('Imprimante',`Sélection: ${next.name} • ${next.paper} • ${next.connection}`); save(); printerManager(); showToast(`🖨️ ${next.name} sélectionnée`);
}
function printerTestPage(){
  const fake={id:'printer-test',ticket:999,customers:1,date:new Date().toISOString(),lines:[{id:'test',name:'Test impression',price:1,qty:1,note:'Ticket test'}],total:1,status:'pending'};
  closeModal(); printTickets(fake); setTimeout(()=>window.print(),250);
}
function money(n){return Number(n||0).toFixed(3)+' DT'}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function esc(x){return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function today(){return new Date().toISOString().slice(0,10)}
function ordersToday(){return ordersForDate(today())}
function ordersForDate(d){return s.orders.filter(o=>String(o.date||'').slice(0,10)===d)}
function expensesForDate(d){return s.expenses.filter(x=>x.date===d).reduce((a,x)=>a+Number(x.amount||0),0)}
function waitingClients(excludeId=''){return ordersToday().filter(o=>o.status!=='cancelled'&&o.status!=='served'&&o.id!==excludeId).reduce((a,o)=>a+Number(o.customers||0),0)}
function revenueToday(){return revenueForDate(today())}
function revenueForDate(d){return ordersForDate(d).filter(o=>o.status!=='cancelled').reduce((a,o)=>a+Number(o.total||0),0)}
function expensesToday(){return expensesForDate(today())}
function fondCaisseForDate(d){return (s.caisseSessions||[]).find(x=>x.date===d)||((s.caisseSession&&s.caisseSession.date===d)?s.caisseSession:null)}
function setDashboardDate(d){const v=String(d||'').slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(v))return;if(v>today())return;dashboardDate=v;render()}
function monthKey(d=new Date()){return d.toISOString().slice(0,7)}
function salaryPaidThisMonth(empId){return (s.salaryPayments||[]).filter(x=>x.employeeId===empId&&x.date.slice(0,7)===monthKey()).reduce((a,x)=>a+Number(x.amount||0),0)}
function salariesPaidThisMonth(){return (s.salaryPayments||[]).filter(x=>x.date.slice(0,7)===monthKey()).reduce((a,x)=>a+Number(x.amount||0),0)}
function salariesDueThisMonth(){return (s.employees||[]).filter(e=>e.active!==false).reduce((a,e)=>a+Math.max(0,Number(e.salary||0)-salaryPaidThisMonth(e.id)),0)}
function canEdit(){return currentRole==='owner'}
function applyTheme(){let t=localStorage.getItem('chezJalelTheme')||'light';document.documentElement.setAttribute('data-theme',t);document.getElementById('themeLight')?.classList.toggle('active',t==='light');document.getElementById('themeDark')?.classList.toggle('active',t==='dark');const icon=document.getElementById('topThemeIcon');const label=document.querySelector('#topThemeToggle .theme-label');if(icon)icon.textContent=t==='dark'?'☀️':'🌙';if(label)label.textContent=t==='dark'?'Clair':'Sombre';const b=document.getElementById('topThemeToggle');if(b)b.setAttribute('aria-label',t==='dark'?'Passer au mode clair':'Passer au mode sombre')}
function setTheme(t){localStorage.setItem('chezJalelTheme',t);document.documentElement.setAttribute('data-theme',t);applyTheme();}
function toggleTheme(){setTheme(document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark')}
function closeModal(){const modal=document.getElementById('modal');const sheet=document.getElementById('sheet');if(!modal)return;modal.classList.remove('show','fond-modal');if(sheet)sheet.innerHTML='';document.body.classList.remove('modal-open')}
document.addEventListener('DOMContentLoaded',()=>{const modal=document.getElementById('modal');if(modal){modal.addEventListener('click',e=>{if(e.target===modal)closeModal()})}document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()})})

function audit(action,details=''){s.audit.unshift({id:uid(),date:new Date().toISOString(),role:currentRole||'system',action,details});s.audit=s.audit.slice(0,200)}
function nextTicket(){let max=Number(s.settings.maxTicket||50),all=ordersToday();if(!all.length)return 1;let used=new Set(all.map(o=>Number(o.ticket)));for(let i=1;i<=max;i++)if(!used.has(i))return i;return 1}
function openOwnerDrawer(){if(currentRole!=='owner')return;document.getElementById('ownerDrawer')?.classList.add('show');document.getElementById('ownerDrawer')?.setAttribute('aria-hidden','false')}
function closeOwnerDrawer(){document.getElementById('ownerDrawer')?.classList.remove('show');document.getElementById('ownerDrawer')?.setAttribute('aria-hidden','true')}
function ownerDrawerGo(p){closeOwnerDrawer();go(p)}
function ownerDrawerAction(a){closeOwnerDrawer();if(a==='menu')menuManager();else if(a==='payroll')payrollManager();else if(a==='security')securityManager();else if(a==='brand')brandManager();else if(a==='tickets')ticketManager();else if(a==='printers')printerManager();else if(a==='cloud')cloudManager();else if(a==='audit')auditManager()}
function go(p){if(currentRole==='staff' && !['pos','orders'].includes(p))return;if(currentRole==='server' && p!=='pos')return;page=p;render()}
function openHeaderNav(){if(currentRole==='owner')openOwnerDrawer();else go('pos')}
function render(){applyTheme();document.body.classList.toggle('staff-mode',currentRole==='staff');document.body.classList.toggle('serveur-mode',currentRole==='server');document.documentElement.style.setProperty('--brand',s.settings.brand||'#c4142c');document.getElementById('brandName').textContent=s.settings.name||'Chez Jalel';document.getElementById('ticketBadge').textContent='Ticket #'+nextTicket();document.getElementById('roleBadge').textContent=currentRole==='owner'?'👑 Aziz':currentRole==='staff'?'🧾 Gérant':'🧑‍🍳 Serveur';const serverPending=(currentRole==='staff'||currentRole==='owner')?s.orders.filter(o=>o.source==='server'&&o.status==='pending').length:0;const sb=document.getElementById('serverHeaderBtn'),bell=document.getElementById('serverBellBtn'),sc=document.getElementById('serverCount');if(sb)sb.classList.toggle('show',currentRole==='staff'||currentRole==='owner');if(bell)bell.style.display=(currentRole==='staff'||currentRole==='owner')?'inline-block':'none';if(sc){sc.textContent=serverPending;sc.classList.toggle('show',serverPending>0)}document.getElementById('headerContext').textContent=(page==='pos'?'CAISSE • VENTE':page==='orders'?'TICKETS • SUIVI':page==='stock'?'STOCK • INVENTAIRE':page==='reports'?'RECETTE • RAPPORTS':page==='more'?'PARAMÈTRES • PLUS':'TABLEAU DE BORD');const ts=document.getElementById('topCloudStatus');if(ts){const cs=cloudStatus();ts.innerHTML=`<span class="status-dot" style="background:${cs==='online'?'#39c96e':cs==='connecting'?'#e0b52e':'#8b8f94'};box-shadow:0 0 9px ${cs==='online'?'rgba(57,201,110,.7)':cs==='connecting'?'rgba(224,181,46,.55)':'transparent'}"></span><span class="status-label">${cs==='online'?'Connecté':cs==='connecting'?'Connexion…':'Hors ligne'}</span>`}const tm=document.getElementById('topMenuBtn');if(tm)tm.style.display=currentRole?'flex':'none';// Bottom navigation was removed; Owner navigation lives in the header drawer.
const view={dashboard,pos,orders,serverOrders,stock,reports,more}[page]||dashboard;try{view()}catch(err){console.error('chezJalel render error',err);const app=document.getElementById('app');if(app)app.innerHTML='<div class="card"><h2>Tableau de bord</h2><p class="muted">صار خطأ في البيانات المحلية.</p><button class="btn primary" onclick="location.reload()">إعادة تحميل</button></div>';}}
function dashboardDetail(type,d){
  const selected=String(d||dashboardDate||today()).slice(0,10), od=ordersForDate(selected), exList=s.expenses.filter(x=>x.date===selected), rev=revenueForDate(selected), ex=exList.reduce((a,x)=>a+Number(x.amount||0),0), clients=od.filter(o=>o.status!=='cancelled').reduce((a,o)=>a+Number(o.customers||0),0), f=fondCaisseForDate(selected), theoretical=f?Number(f.amount||0)+rev-ex:rev-ex;
  const label=new Date(selected+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
  const back='<button class="btn light" onclick="dashboard()">← Tableau de bord</button>';
  const head=(title,sub)=>`<div class="page-head"><div>${back}<h2 style="margin-top:10px">${title}</h2><p>${sub}</p></div><div class="page-meta"><b>${esc(label)}</b></div></div>`;
  if(type==='clients'){
    const active=od.filter(o=>o.status!=='cancelled');
    const clientRows=active.flatMap(o=>Array.from({length:Math.max(0,Number(o.customers||0))},(_,i)=>({o,i})))
      .map(({o,i})=>`<div class="listrow"><div class="row"><div><b>Client ${i+1}</b><div class="muted">Ticket #${o.ticket}${o.table?' • Table '+esc(o.table):''} • ${new Date(o.date).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</div></div><span class="badge">${o.source==='server'?'Serveur':'Caisse'}</span></div></div>`).join('');
    const ticketSummary=active.map(o=>`<div class="card"><div class="row"><div><b>Ticket #${o.ticket}</b><div class="muted">${new Date(o.date).toLocaleString('fr-FR')}${o.table?' • Table '+esc(o.table):''}</div></div><div style="text-align:right"><b>${Number(o.customers||0)} client(s)</b><div class="muted">${money(o.total)}</div></div></div></div>`).join('');
    document.getElementById('app').innerHTML=head('Clients — '+clients,`Liste détaillée des clients enregistrés pour ${label}.`)+`<div class="grid4"><div class="card stat"><span class="muted">Total clients</span><b>${clients}</b></div><div class="card stat"><span class="muted">Tickets concernés</span><b>${active.length}</b></div><div class="card stat"><span class="muted">Moyenne / ticket</span><b>${active.length?(clients/active.length).toFixed(1):'0.0'}</b></div><div class="card stat"><span class="muted">Recette</span><b>${money(rev)}</b></div></div><div class="card"><h3>👥 Liste des clients</h3><p class="muted">Chaque ligne représente un client enregistré dans une commande. Les noms ne sont pas demandés par le système.</p>${clientRows||'<div class="empty">Aucun client enregistré.</div>'}</div><div class="card"><h3>🧾 Répartition par ticket</h3>${ticketSummary||'<div class="empty">Aucune commande pour cette journée.</div>'}</div>`;
    return;
  }
  if(type==='sales'){
    document.getElementById('app').innerHTML=head('Ventes & Tickets',`${od.length} ticket(s) • détail complet des ventes.`)+`<div class="grid4"><div class="card stat"><span class="muted">Recette</span><b>${money(rev)}</b></div><div class="card stat"><span class="muted">Tickets</span><b>${od.length}</b></div><div class="card stat"><span class="muted">Clients</span><b>${clients}</b></div><div class="card stat"><span class="muted">Panier moyen</span><b>${money(od.length?rev/od.length:0)}</b></div></div>${od.map(o=>`<div class="card"><div class="row"><div><b>Ticket #${o.ticket}</b><div class="muted">${new Date(o.date).toLocaleString('fr-FR')}${o.table?' • Table '+esc(o.table):''}${o.source==='server'?' • 🧑‍🍳 Serveur':''}</div></div><b>${money(o.total)}</b></div>${o.lines.map(l=>`<div class="listrow"><div class="row"><span>${l.qty} × ${esc(l.name)}</span><b>${money(Number(l.price||0)*Number(l.qty||0))}</b></div>${l.note?`<div class="muted">Note: ${esc(l.note)}</div>`:''}</div>`).join('')}<div class="row" style="margin-top:10px"><span class="muted">Paiement</span><b>${esc(o.payment||'cash')}</b></div></div>`).join('')||'<div class="empty">Aucune vente pour cette journée.</div>'}`;
    return;
  }
  if(type==='revenue'){
    const pay={cash:0,card:0,other:0};od.filter(o=>o.status!=='cancelled').forEach(o=>pay[o.payment||'cash']=(pay[o.payment||'cash']||0)+Number(o.total||0));
    document.getElementById('app').innerHTML=head('Recette',`Détail de la recette du ${label}.`)+`<div class="grid4"><div class="card stat"><span class="muted">Recette totale</span><b>${money(rev)}</b></div><div class="card stat"><span class="muted">Espèces</span><b>${money(pay.cash)}</b></div><div class="card stat"><span class="muted">Carte</span><b>${money(pay.card)}</b></div><div class="card stat"><span class="muted">Autre</span><b>${money(pay.other)}</b></div></div><div class="card"><h3>Détail par ticket</h3>${od.filter(o=>o.status!=='cancelled').map(o=>`<div class="listrow"><div class="row"><span>Ticket #${o.ticket}<span class="muted"> • ${new Date(o.date).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</span></span><b>${money(o.total)}</b></div></div>`).join('')||'<div class="empty">Aucune recette.</div>'}</div>`;return;
  }
  if(type==='expenses'){
    document.getElementById('app').innerHTML=head('Dépenses',`Toutes les dépenses enregistrées le ${label}.`)+`<div class="card stat"><span class="muted">Total dépenses</span><b>${money(ex)}</b></div><div class="card"><h3>Détail</h3>${exList.map(x=>`<div class="listrow"><div class="row"><div><b>${esc(x.name)}</b><div class="muted">${esc(x.date)}</div></div><b>${money(x.amount)}</b></div></div>`).join('')||'<div class="empty">Aucune dépense pour cette journée.</div>'}</div>`;return;
  }
  if(type==='net'){
    document.getElementById('app').innerHTML=head('Net',`Calcul détaillé du résultat du ${label}.`)+`<div class="card"><div class="row"><span>Recette</span><b>${money(rev)}</b></div><div class="row"><span>Dépenses</span><b>− ${money(ex)}</b></div><hr><div class="row"><strong>Net</strong><strong>${money(rev-ex)}</strong></div></div><div class="card"><h3>Explication</h3><p class="muted">Net = Recette − Dépenses. Le Fond de Caisse initial n'est pas une recette.</p></div>`;return;
  }
  if(type==='caisse'){
    document.getElementById('app').innerHTML=head('Contrôle de Caisse',`Situation théorique du ${label}.`)+`<div class="card"><div class="row"><span>Fond de Caisse</span><b>${f?money(f.amount):'—'}</b></div><div class="row"><span>Recette</span><b>+ ${money(rev)}</b></div><div class="row"><span>Dépenses</span><b>− ${money(ex)}</b></div><hr><div class="row"><strong>Caisse théorique</strong><strong>${money(theoretical)}</strong></div>${f?`<p class="muted" style="margin-top:10px">Ouverte le ${new Date(f.openedAt).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})} par ${f.openedBy==='owner'?'Aziz':f.openedBy==='staff'?'Gérant':'Serveur'}.</p>`:'<p class="muted">Aucun Fond de Caisse enregistré pour cette journée.</p>'}</div>`;return;
  }
  if(type==='top'){
    let top={};od.filter(o=>o.status!=='cancelled').forEach(o=>o.lines.forEach(l=>top[l.name]=(top[l.name]||0)+Number(l.qty||0)));let rows=Object.entries(top).sort((a,b)=>b[1]-a[1]);
    document.getElementById('app').innerHTML=head('Produits les plus vendus',`Classement détaillé du ${label}.`)+`<div class="card">${rows.map((x,i)=>`<div class="listrow"><div class="row"><span><b>#${i+1}</b> ${esc(x[0])}</span><b>${x[1]} unité(s)</b></div><div class="mini-bar"><i style="width:${Math.max(6,Math.round(x[1]/Math.max(1,rows[0][1])*100))}%"></i></div></div>`).join('')||'<div class="empty">Pas encore de ventes.</div>'}</div>`;return;
  }
  if(type==='nosales'){
    let sold={};od.filter(o=>o.status!=='cancelled').forEach(o=>o.lines.forEach(l=>sold[l.name]=(sold[l.name]||0)+Number(l.qty||0)));let rows=s.products.filter(p=>!sold[p.name]);
    document.getElementById('app').innerHTML=head('Ce qui ne sort pas',`Produits sans vente le ${label}.`)+`<div class="card"><div class="row"><b>Produits sans vente</b><b>${rows.length}</b></div>${rows.map(p=>`<div class="listrow"><div class="row"><span>${esc(p.name)}</span><span class="muted">0 vente</span></div></div>`).join('')||'<div class="empty">Tous les produits ont été vendus.</div>'}</div>`;return;
  }
}
function dashboard(){
  const selected=dashboardDate>today()?today():dashboardDate;
  const od=Array.isArray(s.orders)?ordersForDate(selected):[],rev=Number(revenueForDate(selected)||0),ex=Number(expensesForDate(selected)||0),net=rev-ex,top={};
  od.forEach(o=>(Array.isArray(o.lines)?o.lines:[]).forEach(l=>{const k=l.name||'Produit';top[k]=(top[k]||0)+Number(l.qty||0)}));
  const tops=Object.entries(top).sort((a,b)=>b[1]-a[1]).slice(0,5),f=fondCaisseForDate(selected),theoretical=f?Number(f.amount||0)+rev-ex:null,app=document.getElementById('app');if(!app)return;
  const label=selected===today()?'Aujourd’hui':new Date(selected+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
  app.innerHTML=`<div class="dashboard-wrap"><div class="page-head"><div><h2>Tableau de bord</h2><p>Vue d'ensemble de votre activité.</p></div><div class="page-meta"><label class="dash-date-label">Journée<br><input class="dash-date-input" type="date" value="${selected}" max="${today()}" onchange="setDashboardDate(this.value)"></label><div class="dash-date-caption">${label}</div></div></div>${caisseControlCardForDate(selected)}<div class="dashboardAccounts"><button class="dashCard dashCardBtn" onclick="dashboardDetail('revenue','${selected}')"><div class="l">RECETTE</div><div class="v">${money(rev)}</div><span class="dash-more">Voir le détail →</span></button><button class="dashCard dashCardBtn" onclick="dashboardDetail('sales','${selected}')"><div class="l">VENTES / TICKETS</div><div class="v">${od.length}</div><span class="dash-more">Voir les tickets →</span></button><button class="dashCard dashCardBtn" onclick="dashboardDetail('clients','${selected}')"><div class="l">CLIENTS</div><div class="v">${od.filter(o=>o.status!=='cancelled').reduce((a,o)=>a+Number(o.customers||0),0)}</div><span class="dash-more">Voir les clients →</span></button><button class="dashCard dashCardBtn" onclick="dashboardDetail('expenses','${selected}')"><div class="l">DÉPENSES</div><div class="v">${money(ex)}</div><span class="dash-more">Voir les dépenses →</span></button><button class="dashCard dashCardBtn" onclick="dashboardDetail('net','${selected}')"><div class="l">NET</div><div class="v">${money(net)}</div><span class="dash-more">Voir le calcul →</span></button>${f?`<button class="dashCard dashCardBtn" onclick="dashboardDetail('caisse','${selected}')"><div class="l">CAISSE THÉORIQUE</div><div class="v">${money(theoretical)}</div><span class="dash-more">Contrôler la caisse →</span></button>`:''}</div><div class="dashCharts"><div class="dashChart card dashChartBtn" onclick="dashboardDetail('top','${selected}')"><div class="row"><h3>Produits les plus vendus</h3><span class="badge">${esc(selected===today()?'Aujourd’hui':label)}</span></div>${tops.length?tops.map(x=>`<div class="listrow"><div class="row"><span>${esc(x[0])}</span><b>${x[1]}</b></div><div class="mini-bar"><i style="width:${Math.max(6,Math.round(x[1]/Math.max(1,tops[0][1])*100))}%"></i></div></div>`).join(''):'<div class="empty">Pas encore de ventes.</div>'}</div><div class="dashChart card dashChartBtn" onclick="dashboardDetail('nosales','${selected}')"><div class="row"><h3>Ce qui ne sort pas</h3><span class="badge">À surveiller</span></div><p class="muted">Produits sans vente pour cette journée.</p>${s.products.filter(p=>!top[p.name]).slice(0,8).map(p=>`<div class="listrow"><div class="row"><span>${esc(p.name)}</span><span class="muted">0 vente</span></div></div>`).join('')||'<div class="empty">Tous les produits ont été vendus.</div>'}</div></div></div>`
}

function catIcon(name){const c=s.categories.find(x=>String(x.name).trim().toLowerCase()===String(name).trim().toLowerCase());if(c&&c.icon)return c.icon;const n=(name||'').toLowerCase();if(/boisson|drink|jus|soda|eau|café|cafe/.test(n))return '🥤';if(/sandwich|burger|tacos|panini/.test(n))return '🥪';if(/plat|repas|keftaji|cuisine/.test(n))return '🍽️';if(/brik|salade|entrée|entree/.test(n))return '🥗';if(/dessert|sucré|sucre|gateau|gâteau/.test(n))return '🍰';if(/extra|ajout|supp/.test(n))return '➕';return '•'}
function startStaffOrder(){cart={};customers=1;filterCat='all';page='pos';render()}
function pos(){
  if(currentRole==='server'){return serverHome()}
  let cats=s.categories;
  let products=s.products.filter(p=>filterCat==='all'||p.cat===filterCat);
  let serverPending=(currentRole==='staff'||currentRole==='owner')?s.orders.filter(o=>o.source==='server'&&o.status==='pending').length:0;
  let total=Object.values(cart).reduce((a,x)=>a+x.price*x.qty,0);
  document.getElementById('app').innerHTML=`
  <div class="pos-shell">
    <div class="staff-hero"><div class="row"><div><h2>Bonjour 👋</h2><div class="muted">Caisse • Ticket #${nextTicket()}</div></div><div style="display:flex;flex-direction:column;align-items:flex-end;gap:0"><span class="badge" style="background:#fff;color:#8e0d20;font-weight:900">${waitingClients()} en attente</span>${serverPending>0?`<button class="server-hero-alert pulse" onclick="openServerOrders()">🔔 ${serverPending} serveur${serverPending>1?'s':''} en attente</button>`:''}</div></div></div>
    ${currentRole==='staff'?`<div class="staff-command-access"><div class="staff-command-title"><span>Gestion des commandes</span><small>Accès rapide</small></div><div class="staff-command-buttons"><button class="staff-command-btn create" onclick="startStaffOrder()"><span class="scb-icon">＋</span><span><b>Créer commande</b><small>Nouvelle vente</small></span><span class="scb-arrow">›</span></button><button class="staff-command-btn edit" onclick="go('orders')"><span class="scb-icon">✎</span><span><b>Modifier commande</b><small>Modifier • Annuler • Réimprimer</small></span><span class="scb-arrow">›</span></button></div></div>`:''}
    <div class="category-header">
      <div class="category-top"><span class="category-title">Catégories du menu</span><span class="category-count">${cats.length} catégories</span></div>
      <div class="category-scroll">
        <button class="cat-btn ${filterCat==='all'?'on':''}" onclick="filterCat='all';pos()"><span class="cat-icon">▦</span>Tout</button>
        ${cats.map(c=>`<button class="cat-btn ${filterCat===c.id?'on':''}" onclick="filterCat='${c.id}';pos()"><span class="cat-icon">${catIcon(c.name)}</span>${esc(c.name)}</button>`).join('')}
      </div>
      <input class="category-search" id="productSearch" placeholder="Rechercher un produit..." oninput="renderProductSearch(this.value)">
    </div>
    <div class="row"><div><h2>Caisse</h2><span class="muted">Choisis une catégorie puis un produit</span></div></div>
    <div class="products" id="productGrid">${products.map(p=>`<button class="product" data-name="${esc(p.name).toLowerCase()}" onclick="addToCart('${p.id}')"><div class="pic">${p.image?`<img src="${p.image}">`:'<div class="placeholder">🍽️</div>'}</div><div class="pbody"><b>${esc(p.name)}</b><span>${money(p.price)}</span></div></button>`).join('')||'<div class="empty">Ajoute tes produits dans Plus → Menu.</div>'}</div>
    <div class="card" style="margin-top:12px"><div class="row"><b>Nombre de clients</b><div class="qty"><button onclick="customers=Math.max(1,customers-1);pos()">−</button><b>${customers}</b><button onclick="customers++;pos()">＋</button></div></div></div>
    ${Object.keys(cart).length?`<div class="card cart"><div class="row"><h3>Commande</h3><b>${money(total)}</b></div>${Object.values(cart).map(x=>`<div class="line"><div style="flex:1"><b>${esc(x.name)}</b><div class="muted">${money(x.price)}</div><input class="note-input" value="${esc(x.note||'')}" placeholder="Note: sans harissa, bien cuite..." onchange="setLineNote('${x.id}',this.value)"></div><div class="qty"><button onclick="changeQty('${x.id}',-1)">−</button><b>${x.qty}</b><button onclick="changeQty('${x.id}',1)">＋</button></div><b>${money(x.price*x.qty)}</b></div>`).join('')}<div style="margin-top:10px" class="muted">La note sera imprimée sur le ticket cuisine.</div><button class="btn primary" style="width:100%;margin-top:12px" onclick="finishOrder()">Valider la commande • ${money(total)}</button></div>`:''}
  </div>`;
}
function serverHome(){
  const pending=s.orders.filter(o=>o.source==='server'&&o.status==='pending').length;
  document.getElementById('app').innerHTML=`<div class="server-home">
    <div class="serveur-hero"><h2>Serveur</h2><div>Prends une commande en quelques secondes.</div><div class="serveur-sync">☁️ La commande sera envoyée à la caisse dès que le Cloud est connecté.</div></div>
    <button class="server-add" onclick="serverStartOrder()">＋ Ajouter commande<small>Choisir la table puis les articles</small></button>
    <div class="server-card"><div class="row"><div><b>Commandes envoyées</b><div class="muted">Aujourd'hui</div></div><span class="badge">${pending} en attente</span></div></div>
  </div>`;
}
function serverStartOrder(){cart={};customers=1;serverTable='';filterCat='all';page='serverOrder';renderServerOrder()}
function renderServerOrder(){
  const cats=s.categories, products=s.products.filter(p=>filterCat==='all'||p.cat===filterCat), total=Object.values(cart).reduce((a,x)=>a+x.price*x.qty,0);
  document.getElementById('app').innerHTML=`<div class="server-home">
    <div class="server-card"><div class="row"><div><b>Nouvelle commande</b><div class="muted">Choisir la table</div></div><button class="btn light" onclick="cart={};serverTable='';pos()">✕</button></div><div class="server-tables">${Array.from({length:20},(_,i)=>i+1).map(n=>`<button class="server-table-btn ${String(serverTable)===String(n)?'on':''}" onclick="serverTable='${n}';renderServerOrder()">${n}</button>`).join('')}</div></div>
    ${serverTable?`<div class="server-card"><div class="row"><div><b>Table ${serverTable}</b><div class="muted">اختار طلب الحريف</div></div><button class="btn light" onclick="serverTable='';cart={};renderServerOrder()">تبديل الطاولة</button></div><div class="category-scroll" style="margin:0"><button class="cat-btn ${filterCat==='all'?'on':''}" onclick="filterCat='all';renderServerOrder()">Tout</button>${cats.map(c=>`<button class="cat-btn ${filterCat===c.id?'on':''}" onclick="filterCat='${c.id}';renderServerOrder()">${esc(c.name)}</button>`).join('')}</div><div class="server-menu">${products.map(p=>`<button class="server-product" onclick="serverAddProduct('${p.id}')"><b>${esc(p.name)}</b><span>${money(p.price)} • ＋</span></button>`).join('')||'<div class="empty">Aucun produit.</div>'}</div></div>`:''}
    ${Object.keys(cart).length?`<div class="server-card"><div class="row"><b>Table ${serverTable||'—'}</b><b>${money(total)}</b></div>${Object.values(cart).map(x=>`<div class="server-cart-line"><div><b>${esc(x.name)}</b><div class="muted">${money(x.price)}</div><input class="note-input" value="${esc(x.note||'')}" placeholder="Note cuisine" onchange="setLineNote('${x.id}',this.value)"></div><div class="qty"><button onclick="serverQty('${x.id}',-1)">−</button><b>${x.qty}</b><button onclick="serverQty('${x.id}',1)">＋</button></div></div>`).join('')}<button class="btn primary server-accept" onclick="acceptServerOrder()">✓ Accepter commande • ${money(total)}</button></div>`:''}
  </div>`;
}
function serverAddProduct(id){let p=s.products.find(x=>x.id===id);if(!p)return;cart[id]=cart[id]?{...cart[id],qty:cart[id].qty+1}:{id:p.id,name:p.name,price:p.price,qty:1,note:''};renderServerOrder()}
function serverQty(id,d){if(!cart[id])return;cart[id].qty+=d;if(cart[id].qty<=0)delete cart[id];renderServerOrder()}
async function pushServerOrderNow(order){const c=cloudCfg();if(!c?.enabled||!cloudClient||!navigator.onLine)return;try{const {data,error}=await cloudClient.from('cloud_state').select('state').eq('restaurant_id',c.restaurantId).maybeSingle();if(error)throw error;const remote=Object.assign(structuredClone(blank),data?.state||{});const byId=new Map((remote.orders||[]).map(x=>[String(x.id),x]));byId.set(String(order.id),order);remote.orders=Array.from(byId.values()).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));remote.settings=s.settings;remote.security=s.security;remote.categories=s.categories;remote.products=s.products;remote.stock=s.stock;remote.expenses=s.expenses;remote.employees=s.employees;remote.salaryPayments=s.salaryPayments;remote.caisseSession=s.caisseSession;remote.caisseSessions=s.caisseSessions;remote.audit=s.audit;const now=new Date().toISOString();const up=await cloudClient.from('cloud_state').upsert({restaurant_id:c.restaurantId,access_key:c.accessKey,state:remote,updated_at:now,updated_by:c.device||'serveur'},{onConflict:'restaurant_id'});if(up.error)throw up.error;localStorage.setItem('chezJalelLastCloudSync',now);setCloudStatus('online')}catch(e){console.warn('Server order push',e);scheduleCloudPush()}}
async function acceptServerOrder(){if(!serverTable){alert('اختار رقم الطاولة أولاً');return}let lines=Object.values(cart).map(x=>({...x}));if(!lines.length){alert('اختار الطلبية أولاً');return}let total=lines.reduce((a,x)=>a+x.price*x.qty,0),o={id:uid(),ticket:nextTicket(),customers:customers||1,date:new Date().toISOString(),lines,total,payment:'cash',status:'pending',source:'server',table:String(serverTable)};s.orders.unshift(o);lines.forEach(l=>{let st=s.stock.find(x=>x.productId===l.id);if(st&&st.control)st.qty=Math.max(0,Number(st.qty)-l.qty)});audit('Commande serveur',`Table ${o.table} • Ticket #${o.ticket} • ${money(o.total)}`);cart={};customers=1;serverTable='';page='pos';save();showToast(`✓ Commande table ${o.table} envoyée à la caisse`);if(cloudCfg()?.enabled&&navigator.onLine){setTimeout(()=>pushServerOrderNow(o),80)}pos()}
function renderProductSearch(q){
  q=(q||'').trim().toLowerCase();
  document.querySelectorAll('#productGrid .product').forEach(el=>el.style.display=(!q||el.dataset.name.includes(q))?'':'none');
}
function addToCart(id){let p=s.products.find(x=>x.id===id);if(!p)return;cart[id]=cart[id]?{...cart[id],qty:cart[id].qty+1}:{id:p.id,name:p.name,price:p.price,qty:1,note:''};pos()}
function setLineNote(id,note){if(cart[id]){cart[id].note=note;}}

function changeQty(id,d){if(!cart[id])return;cart[id].qty+=d;if(cart[id].qty<=0)delete cart[id];pos()}
function finishOrder(){let lines=Object.values(cart).map(x=>({...x}));if(!lines.length)return;let total=lines.reduce((a,x)=>a+x.price*x.qty,0),o={id:uid(),ticket:nextTicket(),customers,date:new Date().toISOString(),lines,total,payment:'cash',status:'pending',source:currentRole||'staff',table:serverTable||''};s.orders.unshift(o);lines.forEach(l=>{let st=s.stock.find(x=>x.productId===l.id);if(st&&st.control)st.qty=Math.max(0,Number(st.qty)-l.qty)});audit('Vente',`Ticket #${o.ticket} • ${money(o.total)}`);cart={};customers=1;save();printTickets(o)}

function printOnly(type){let all=document.querySelectorAll('.ticket-print');all.forEach((el,i)=>el.classList.toggle('print-hide',type==='client'?i!==0:i!==1));window.print();setTimeout(()=>all.forEach(el=>el.classList.remove('print-hide')),500)}
function printTickets(o){let dt=new Date(o.date),date=dt.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'}),time=dt.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}),wait=waitingClients(o.id),items=o.lines.reduce((a,x)=>a+Number(x.qty||0),0),pc=printerConfig(),paperClass=pc.paper==='58mm'?'paper-58':'paper-80';document.getElementById('sheet').innerHTML=`<div class="no-print"><h2>Tickets #${o.ticket}</h2><p class="muted">Ticket client + ticket cuisine • ${date} ${time}</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><button class="btn gold" onclick="window.print()">🖨 Imprimer les 2</button><button class="btn light" onclick="printOnly('client')">Ticket client</button></div><button class="btn light" style="width:100%;margin-top:8px" onclick="printOnly('cuisine')">👨‍🍳 Ticket cuisine فقط</button><button class="btn light" style="width:100%;margin-top:8px" onclick="closeModal()">Fermer</button></div><div class="print-area ${paperClass}>
<div class="ticket-print">
<img class="ticket-logo" src="logo.jpg"><div class="ticket-brand">${esc(s.settings.name)}</div><div class="ticket-sub">RESTAURANT</div><div class="ticket-auth">GOÛT AUTHENTIQUE</div>
<div class="ticket-rule"></div><div class="ticket-meta"><span>Date : ${date}</span><span>Heure : ${time}</span></div>
<div class="ticket-client-grid">
<div class="ticket-client-left"><div class="ticket-label">NUMÉRO CLIENT</div><div class="ticket-big">${o.ticket}</div><div class="ticket-rule"></div><div class="ticket-wait">CLIENT(S) EN ATTENTE</div><div class="ticket-big" style="font-size:10mm">${wait}</div></div>
<div class="ticket-client-right"><div class="ticket-label">COMMANDE :</div><div class="ticket-lines">${o.lines.map(x=>`<div class="trow"><b>${x.qty}</b><span>${esc(x.name)}${x.note?`<br><small>Note : ${esc(x.note)}</small>`:''}</span><b>${money(x.price*x.qty)}</b></div>`).join('')}</div><div class="ticket-total"><span>PRIX :</span><span>${money(o.total)}</span></div></div>
</div>
<div class="ticket-phone">☎ 48048118</div><div class="ticket-thanks">شكراً على ثقتكم</div><div class="ticket-ar">نتمنى لكم وجبة شهية</div><div class="ticket-heart">♥</div><div class="ticket-footer">— &nbsp; À TRÈS BIENTÔT &nbsp; —</div>
</div>
<div class="ticket-print">
<div class="cuisine-head"><div class="cuisine-brand"><img class="ticket-logo" src="logo.jpg"><div class="ticket-brand">${esc(s.settings.name)}</div><div class="ticket-sub">RESTAURANT</div><div class="ticket-auth">GOÛT AUTHENTIQUE</div></div><div class="cuisine-title"><strong>CUISINE</strong><small>TICKET DE COMMANDE</small><div class="cuisine-date">▣ &nbsp; Date : ${date}<br>◷ &nbsp; Heure : ${time}</div></div></div>
<div class="ticket-rule"></div><div class="cuisine-info"><div class="cuisine-box"><div class="ticket-label">N° COMMANDE</div><div class="num">${o.ticket}</div></div><div class="cuisine-box"><div class="ticket-label">N° CLIENT</div><div class="num">${o.ticket}</div><div class="serve">À SERVIR : ${wait}</div></div></div>
<div class="cuisine-items"><div class="cuisine-table-head"><div>QTÉ</div><div>PLAT / ARTICLE</div><div>NOTES</div></div>${o.lines.map(x=>`<div class="cuisine-item"><div class="qty">${x.qty}</div><div class="name">${esc(x.name)}</div><div class="note">${x.note?esc(x.note):'—'}</div></div>`).join('')}</div>
<div class="cuisine-total">TOTAL ARTICLES : ${items}</div><div class="cuisine-footer">— &nbsp; BON APPÉTIT ! &nbsp; —</div>
</div></div>`;document.getElementById('modal').classList.add('show')}
function openServerOrders(){if(currentRole!=='staff'&&currentRole!=='owner')return;page='serverOrders';render()}
function serverOrders(){const pending=s.orders.filter(o=>o.source==='server'&&o.status==='pending');document.getElementById('app').innerHTML=`<div class="page-head"><div><h2>Serveur — Commandes</h2><p>الطلبات المبعوثة من السيرفور.</p></div><div class="page-meta">${pending.length} en attente</div></div><div class="server-orders-list">${pending.map(o=>`<div class="server-order-item new"><div class="row"><div><b>Ticket #${o.ticket}</b><div class="muted">Table ${esc(o.table||'—')} • ${new Date(o.date).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</div></div><b>${money(o.total)}</b></div><div class="so-lines">${o.lines.map(l=>`<div class="so-line"><span><b>${l.qty}×</b> ${esc(l.name)}</span><span>${money(l.price*l.qty)}</span></div>${l.note?`<div class="muted">Note: ${esc(l.note)}</div>`:''}`).join('')}</div><div class="server-order-actions"><button class="btn gold" onclick='printTickets(${JSON.stringify(o).replace(/'/g,"&#39;")})'>🖨 Tickets</button><button class="btn success" onclick="markServed('${o.id}')">✓ Prise en charge</button></div></div>`).join('')||'<div class="card server-order-empty">🔔 ما فما حتى طلبية Serveur تستنى.</div>'}</div>`;updateServerBadge()}
function updateServerBadge(){const n=(currentRole==='staff'||currentRole==='owner')?s.orders.filter(o=>o.source==='server'&&o.status==='pending').length:0;const sc=document.getElementById('serverCount');if(sc){sc.textContent=n;sc.classList.toggle('show',n>0)}}
function orders(){let od=ordersToday();document.getElementById('app').innerHTML=`<div class="page-head"><div><button class="btn light" onclick="go('pos')">← Accueil</button><h2 style="margin-top:10px">Tickets</h2><p>Suivi des commandes, modifications et service.</p></div><div class="page-meta">${waitingClients()} clients en attente</div></div><div class="card"><div class="row"><b>Recette</b><b>${money(revenueToday())}</b></div><p class="muted">Le gérant peut modifier une commande, l'annuler ou la marquer comme servie.</p></div>${s.orders.slice(0,60).map(o=>{let cancelled=o.status==='cancelled',served=o.status==='served';return `<div class="card" style="${cancelled?'opacity:.65':''}"><div class="row rowtop"><div><b>Ticket #${o.ticket}</b> ${cancelled?'<span class="badge">ANNULÉ</span>':''}${served?'<span class="badge">SERVI</span>':''}<div class="muted">${new Date(o.date).toLocaleString('fr-FR')} • ${o.customers} client(s)${o.table?` • Table ${esc(o.table)}`:''}${o.source==='server'?' • 🧑‍🍳 Serveur':''}</div></div><b>${money(o.total)}</b></div><details style="margin-top:9px"><summary>Détails</summary>${o.lines.map(l=>`<div class="listrow"><div class="row"><span>${l.qty} × ${esc(l.name)}</span><span>${money(l.price*l.qty)}</span></div>${l.note?`<div class="muted">Note cuisine: ${esc(l.note)}</div>`:''}</div>`).join('')}<div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap"><button class="btn light" onclick='printTickets(${JSON.stringify(o).replace(/'/g,"&#39;")})'>Réimprimer</button>${!cancelled&&!served?`<button class="btn light" onclick="editOrder('${o.id}')">✎ Modifier</button><button class="btn success" onclick="markServed('${o.id}')">✓ Servi</button><button class="btn danger" onclick="cancelOrder('${o.id}')">↩ Annuler</button>`:''}</div></details></div>`}).join('')||'<div class="empty">Aucun ticket.</div>'}`}
function markServed(id){let o=s.orders.find(x=>x.id===id);if(!o||o.status==='cancelled')return;o.status='served';o.servedAt=new Date().toISOString();audit('Commande servie',`Ticket #${o.ticket}`);save()}

function reverseStock(lines,sign){lines.forEach(l=>{let st=s.stock.find(x=>x.productId===l.id);if(st&&st.control)st.qty=Math.max(0,Number(st.qty)+(sign*l.qty))})}
function cancelOrder(id){let o=s.orders.find(x=>x.id===id);if(!o||o.status==='cancelled')return;if(!confirm(`Annuler le ticket #${o.ticket} ?`))return;reverseStock(o.lines,+1);o.status='cancelled';o.cancelledAt=new Date().toISOString();audit('Annulation ticket',`Ticket #${o.ticket} • ${money(o.total)}`);save()}
function editOrder(id){let o=s.orders.find(x=>x.id===id);if(!o||o.status==='cancelled')return;let draft=o.lines.map(x=>({...x}));document.getElementById('sheet').innerHTML=`<div class="modalhead"><div><button class="btn light" onclick="closeModal();go('orders')">← Tickets</button><h2 style="margin-top:10px">Modifier ticket #${o.ticket}</h2></div><button class="btn light" onclick="closeModal()">✕ Fermer</button></div><div class="card"><div class="row"><b>Clients</b><div class="qty"><button onclick="orderEditCustomers=Math.max(1,orderEditCustomers-1);renderOrderEdit()">−</button><b id="oec">${o.customers}</b><button onclick="orderEditCustomers++;renderOrderEdit()">＋</button></div></div></div><div id="orderEditLines"></div><div class="card"><select class="select" id="editAddProduct"><option value="">＋ Ajouter un produit</option>${s.products.map(p=>`<option value="${p.id}">${esc(p.name)} • ${money(p.price)}</option>`).join('')}</select><button class="btn gold" style="width:100%;margin-top:8px" onclick="addEditedLine()">Ajouter</button></div><button class="btn primary" style="width:100%;margin-top:10px" onclick="saveOrderEdit('${o.id}')">Enregistrer les changements</button>`;window._editingOrderLines=draft;window.orderEditCustomers=o.customers;renderOrderEdit();document.getElementById('modal').classList.add('show')}
function renderOrderEdit(){let box=document.getElementById('orderEditLines');if(!box)return;let total=window._editingOrderLines.reduce((a,x)=>a+x.price*x.qty,0);box.innerHTML=`<div class="card"><div class="row"><h3>Commande</h3><b>${money(total)}</b></div>${window._editingOrderLines.map((x,i)=>`<div class="line"><div style="flex:1"><b>${esc(x.name)}</b><div class="muted">${money(x.price)}</div><input class="note-input" value="${esc(x.note||'')}" placeholder="Note cuisine" onchange="window._editingOrderLines[${i}].note=this.value"></div><div class="qty"><button onclick="changeEditedLine(${i},-1)">−</button><b>${x.qty}</b><button onclick="changeEditedLine(${i},1)">＋</button></div><button class="btn danger" onclick="removeEditedLine(${i})">×</button></div>`).join('')||'<div class="empty">Commande vide. Tu peux ajouter un produit ou annuler.</div>'}</div>`;let c=document.getElementById('oec');if(c)c.textContent=window.orderEditCustomers}

function changeEditedLine(i,d){let a=window._editingOrderLines;if(!a[i])return;a[i].qty+=d;if(a[i].qty<=0)a.splice(i,1);renderOrderEdit()}
function removeEditedLine(i){window._editingOrderLines.splice(i,1);renderOrderEdit()}
function addEditedLine(){let id=document.getElementById('editAddProduct').value;if(!id)return;let p=s.products.find(x=>x.id===id);if(!p)return;let x=window._editingOrderLines.find(x=>x.id===id);if(x)x.qty++;else window._editingOrderLines.push({id:p.id,name:p.name,price:p.price,qty:1,note:''});document.getElementById('editAddProduct').value='';renderOrderEdit()}

function saveOrderEdit(id){let o=s.orders.find(x=>x.id===id);if(!o)return;if(!window._editingOrderLines.length){if(confirm('La commande est vide. Voulez-vous annuler le ticket ?')){closeModal();cancelOrder(id)}return}reverseStock(o.lines,+1);o.lines=window._editingOrderLines.map(x=>({...x}));o.customers=Math.max(1,Number(window.orderEditCustomers||1));o.total=o.lines.reduce((a,x)=>a+x.price*x.qty,0);reverseStock(o.lines,-1);o.editedAt=new Date().toISOString();audit('Modification ticket',`Ticket #${o.ticket} • ${money(o.total)}`);window._editingOrderLines=null;closeModal();save()}

function stock(){if(!canEdit()){document.getElementById('app').innerHTML='<div class="card"><h2>Accès limité</h2><p>Le stock est réservé au propriétaire.</p></div>';return}document.getElementById('app').innerHTML=`<div class="row"><h2>Stock</h2><button class="btn gold" onclick="openStockForm()">＋ Ajouter</button></div>${s.stock.map(x=>`<div class="card"><div class="row"><div><b>${esc(x.name)}</b><div class="muted">${esc(x.unit||'unité')} • minimum ${x.min||0}</div></div><b class="${Number(x.qty)<=Number(x.min||0)?'stocklow':'stockok'}">${x.qty}</b></div><div class="bar" style="margin:9px 0"><i style="width:${Math.min(100,Number(x.qty)/Math.max(1,Number(x.min||1)*3)*100)}%"></i></div><div class="row"><button class="btn light" onclick="adjustStock('${x.id}',-1)">−</button><button class="btn light" onclick="adjustStock('${x.id}',1)">＋</button><button class="btn danger" onclick="delStock('${x.id}')">Supprimer</button></div></div>`).join('')||'<div class="empty">Aucun stock.</div>'}`}
function adjustStock(id,d){let x=s.stock.find(x=>x.id===id);if(x){x.qty=Math.max(0,Number(x.qty)+d);audit('Stock',`${x.name}: ${d>0?'+':''}${d}`);save()}}
function delStock(id){if(!canEdit())return;let x=s.stock.find(x=>x.id===id);if(confirm('Supprimer ce stock ?')){s.stock=s.stock.filter(x=>x.id!==id);audit('Suppression stock',x?.name||id);save()}}
function openStockForm(){document.getElementById('sheet').innerHTML=`<div class="modalhead"><h2>Ajouter au stock</h2><button class="btn light" onclick="closeModal()">✕ Fermer</button></div><div class="formgrid"><div class="full"><select class="select" id="stp"><option value="">Choisir un produit</option>${s.products.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></div><input class="input" id="stq" type="number" value="0" placeholder="Quantité"><input class="input" id="stu" placeholder="Unité (kg, L, pièce...)"/><input class="input" id="stm" type="number" value="0" placeholder="Stock minimum"><div class="full"><button class="btn gold" style="width:100%" onclick="addStock()">Enregistrer</button></div></div>`;document.getElementById('modal').classList.add('show')}
function addStock(){let pid=document.getElementById('stp').value,q=Number(document.getElementById('stq').value||0),u=document.getElementById('stu').value.trim(),m=Number(document.getElementById('stm').value||0),p=s.products.find(x=>x.id===pid);if(!p)return;let old=s.stock.find(x=>x.productId===pid);if(old){old.qty=q;old.unit=u;old.min=m;old.control=true}else s.stock.push({id:uid(),productId:pid,name:p.name,qty:q,unit:u,min:m,control:true});audit('Ajout/modification stock',p.name);closeModal();save()}
function reports(){if(!canEdit()){document.getElementById('app').innerHTML='<div class="card"><h2>Accès limité</h2><p>Les recettes et rapports sont visibles uniquement par le propriétaire.</p></div>';return}let od=ordersToday(),rev=revenueToday(),ex=expensesToday(),net=rev-ex,pay={cash:0,card:0,other:0};od.forEach(o=>pay[o.payment||'cash']=(pay[o.payment||'cash']||0)+o.total);let top={};od.forEach(o=>o.lines.forEach(l=>top[l.name]=(top[l.name]||0)+l.qty));let topRows=Object.entries(top).sort((a,b)=>b[1]-a[1]);document.getElementById('app').innerHTML=`<h2>Recette</h2><div class="grid4"><div class="card stat"><span class="muted">Recette</span><b>${money(rev)}</b></div><div class="card stat"><span class="muted">Tickets</span><b>${od.length}</b></div><div class="card stat"><span class="muted">Dépenses</span><b>${money(ex)}</b></div><div class="card stat"><span class="muted">Net</span><b>${money(net)}</b></div></div><div class="card"><h3>👷 Salaires — ${monthKey()}</h3><div class="grid4"><div class="stat"><span class="muted">Salaires payés</span><b>${money(salariesPaidThisMonth())}</b></div><div class="stat"><span class="muted">Reste à payer</span><b>${money(salariesDueThisMonth())}</b></div></div><button class="btn light" style="width:100%;margin-top:10px" onclick="payrollManager()">Gérer les salaires</button></div><div class="card"><h3>Articles vendus</h3>${topRows.map(x=>`<div class="row listrow"><span>${esc(x[0])}</span><b>${x[1]}</b></div>`).join('')||'<div class="empty">Pas encore de ventes.</div>'}</div><div class="card"><button class="btn light" style="width:100%" onclick="addExpense()">＋ Ajouter une dépense</button></div><div class="card"><h3>Dépenses du jour</h3>${s.expenses.filter(x=>x.date===today()).map(x=>`<div class="row listrow"><span>${esc(x.name)}</span><b>${money(x.amount)}</b></div>`).join('')||'<div class="empty">Aucune dépense.</div>'}</div>`}
function addExpense(){document.getElementById('sheet').innerHTML=`<div class="modalhead"><h2>Dépense</h2><button class="btn light" onclick="closeModal()">✕ Fermer</button></div><input class="input" id="exn" placeholder="Ex: achat pain"><br><br><input class="input" id="exa" type="number" step="0.001" placeholder="Montant DT"><br><br><button class="btn gold" style="width:100%" onclick="saveExpense()">Enregistrer</button>`;document.getElementById('modal').classList.add('show')}
function saveExpense(){let n=document.getElementById('exn').value.trim(),a=Number(document.getElementById('exa').value);if(!n||!a)return;s.expenses.push({id:uid(),name:n,amount:a,date:today()});audit('Dépense',`${n} • ${money(a)}`);closeModal();save()}
function exportBackup(){const payload={app:'ChezJalelPOS',version:46,exportedAt:new Date().toISOString(),data:s};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`ChezJalelPOS-backup-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);showToast('💾 Backup محفوظ');}
function importBackup(input){const file=input.files?.[0];if(!file)return;const r=new FileReader();r.onload=()=>{try{const payload=JSON.parse(r.result);if(!payload?.data?.orders||!payload?.data?.security){throw new Error('invalid backup')}if(!confirm('باش يتم تعويض البيانات الحالية بالـ backup. متأكد؟'))return;s=Object.assign(structuredClone(blank),payload.data);s.security.serverPin=s.security.serverPin||s.security.staffPin||'';localStorage.setItem(KEY,JSON.stringify(s));render();scheduleCloudPush();showToast('✅ Backup تم استرجاعه')}catch(e){alert('الـ backup غير صالح أو تالف.')}};r.readAsText(file);input.value=''}
function more(){if(!canEdit()){document.getElementById('app').innerHTML='<div class="card"><h2>Accès propriétaire</h2><p>Le gérant/caisse ne peut ni ajouter, ni supprimer, ni modifier le menu ou le stock.</p><button class="btn primary" style="width:100%" onclick="lockApp()">Changer de compte</button></div>';return}document.getElementById('app').innerHTML=`<h2>Plus</h2><div class="card"><h3>Menu & sections</h3><p class="muted">Ajoute tes produits, prix, sections et photos.</p><button class="btn primary" onclick="menuManager()">Ouvrir le menu</button></div><div class="card"><h3>💵 Salaires des employés</h3><p class="muted">سجّل الخلاصات، التسبيقات والمدفوعات باش حساباتك تخرج واضحة.</p><div class="row"><span><b>${(s.employees||[]).filter(e=>e.active!==false).length}</b> employés • <b>${money(salariesPaidThisMonth())}</b> payés ce mois</span><button class="btn gold" onclick="payrollManager()">Gérer</button></div></div><div class="card"><h3>🔐 Accès employés</h3><p class="muted">Le gérant/caisse peut vendre et modifier ou annuler les tickets. Le serveur peut prendre les commandes par table. Ils ne peuvent pas modifier le menu, les prix, le stock, les recettes ou les réglages.</p><button class="btn light" onclick="securityManager()">Gérer les PIN</button></div><div class="card"><h3>🎨 Identité</h3><button class="btn light" onclick="brandManager()">Personnaliser</button></div><div class="card"><h3>🎫 Numérotation</h3><button class="btn light" onclick="ticketManager()">1 → ${s.settings.maxTicket} → 1</button></div><div class="card"><h3>💾 Backup & restauration</h3><p class="muted">نسخة احتياطية محلية لكل بيانات المطعم. تنجم ترجعها على جهاز آخر.</p><div class="row"><button class="btn light" onclick="exportBackup()">⬇️ Export Backup</button><button class="btn light" onclick="document.getElementById('backupFile').click()">⬆️ Import Backup</button></div><input id="backupFile" type="file" accept="application/json" style="display:none" onchange="importBackup(this)"></div><div class="card"><h3>☁️ Cloud & Realtime</h3><div class="row"><div><b id="cloudStatus">${cloudStatus()==='online'?'🟢 متصل':cloudStatus()==='connecting'?'🟡 جاري الاتصال':'⚪ غير متصل'} </b><p class="muted">Caisse ↔ Serveur ↔ Owner en temps réel.</p></div><button class="btn light" onclick="cloudManager()">Configurer</button></div></div><div class="card"><h3>Journal des actions</h3>${s.audit.slice(0,20).map(a=>`<div class="audit"><b>${esc(a.action)}</b> • ${esc(a.role)}<br>${new Date(a.date).toLocaleString('fr-FR')}<br>${esc(a.details)}</div>`).join('')||'<div class="empty">Aucune action.</div>'}</div>`}
function payrollManager(){
  const emps=s.employees||[], pays=s.salaryPayments||[];
  document.getElementById('sheet').innerHTML=`<div class="modalhead"><h2>💵 Salaires des employés</h2><button class="btn light" onclick="closeModal()">✕ Fermer</button></div>
  <div class="card"><div class="grid4"><div class="stat"><span class="muted">Employés</span><b>${emps.filter(e=>e.active!==false).length}</b></div><div class="stat"><span class="muted">Salaires du mois</span><b>${money(salariesPaidThisMonth())}</b></div><div class="stat"><span class="muted">Reste à payer</span><b>${money(salariesDueThisMonth())}</b></div></div></div>
  <div class="card"><h3>Ajouter un employé</h3><div class="formgrid"><input class="input" id="en" placeholder="Nom du salarié"><input class="input" id="es" type="number" step="0.001" placeholder="Salaire mensuel DT"><div class="full"><button class="btn gold" style="width:100%" onclick="addEmployee()">＋ Ajouter</button></div></div></div>
  <div class="card"><h3>Employés</h3>${emps.map(e=>`<div class="listrow" style="padding:12px 0;border-bottom:1px solid var(--line)"><div><b>${esc(e.name)}</b><br><small class="muted">Salaire: ${money(e.salary)} • Payé: ${money(salaryPaidThisMonth(e.id))} • Reste: ${money(Math.max(0,Number(e.salary)-salaryPaidThisMonth(e.id)))}</small></div><div class="row"><button class="btn gold" onclick="paySalary('${e.id}')">💵 Payer</button><button class="btn danger" onclick="removeEmployee('${e.id}')">×</button></div></div>`).join('')||'<div class="empty">Aucun employé enregistré.</div>'}</div>
  <div class="card"><h3>Historique des paiements</h3>${pays.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,30).map(x=>`<div class="row listrow"><span><b>${esc(x.employeeName)}</b><br><small class="muted">${x.date}${x.note?' • '+esc(x.note):''}</small></span><b>${money(x.amount)}</b></div>`).join('')||'<div class="empty">Aucun paiement.</div>'}</div>`;
  document.getElementById('modal').classList.add('show');
}
function addEmployee(){let name=document.getElementById('en').value.trim(),salary=Number(document.getElementById('es').value||0);if(!name||salary<=0){alert('دخل اسم الموظف والراتب الشهري');return}s.employees=s.employees||[];s.employees.push({id:uid(),name,salary,active:true});audit('Ajout employé',`${name} • ${money(salary)}/mois`);save();payrollManager()}
function removeEmployee(id){let e=(s.employees||[]).find(x=>x.id===id);if(!e)return;if(confirm(`Supprimer ${e.name} de la liste des employés ?`)){e.active=false;audit('Désactivation employé',e.name);save();payrollManager()}}
function paySalary(id){let e=(s.employees||[]).find(x=>x.id===id);if(!e)return;let due=Math.max(0,Number(e.salary||0)-salaryPaidThisMonth(id));document.getElementById('sheet').innerHTML=`<div class="modalhead"><h2>💵 Paiement — ${esc(e.name)}</h2><button class="btn light" onclick="payrollManager()">← Retour</button></div><p class="muted">Salaire mensuel: <b>${money(e.salary)}</b> • Déjà payé ce mois: <b>${money(salaryPaidThisMonth(id))}</b> • Reste: <b>${money(due)}</b></p><input class="input" id="spa" type="number" step="0.001" value="${due.toFixed(3)}" placeholder="Montant payé DT"><br><br><input class="input" id="spn" placeholder="Note — ex: acompte, salaire septembre"><button class="btn gold" style="width:100%;margin-top:14px" onclick="saveSalaryPayment('${e.id}')">Enregistrer le paiement</button>`}
function saveSalaryPayment(id){let e=(s.employees||[]).find(x=>x.id===id),amount=Number(document.getElementById('spa').value||0),note=document.getElementById('spn').value.trim();if(!e||amount<=0)return;let payment={id:uid(),employeeId:id,employeeName:e.name,amount,date:today(),note};s.salaryPayments=s.salaryPayments||[];s.salaryPayments.push(payment);s.expenses=s.expenses||[];s.expenses.push({id:uid(),name:`Salaire — ${e.name}${note?' • '+note:''}`,amount,date:today(),type:'salary',employeeId:id,salaryPaymentId:payment.id});audit('Paiement salaire',`${e.name} • ${money(amount)}`);save();payrollManager()}

function menuManager(){document.getElementById('sheet').innerHTML=`<div class="modalhead"><h2>Menu</h2><button class="btn light" onclick="closeModal()">✕ Fermer</button></div><p class="muted">Les changements sont enregistrés automatiquement.</p><div class="formgrid"><input class="input" id="pn" placeholder="Nom produit"><input class="input" id="pp" type="number" step="0.001" placeholder="Prix DT"><select class="select" id="pc"><option value="">Sans section</option>${s.categories.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select><input class="input" id="pi" type="file" accept="image/*"><div class="full"><button class="btn gold" style="width:100%" onclick="addProduct()">＋ Produit</button></div></div><hr><h3>Sections</h3><div class="row"><input class="input" id="cn" placeholder="Nouvelle section"><button class="btn light" onclick="addCategory()">＋</button></div>${s.categories.map(c=>`<div class="listrow row"><span>${esc(c.name)}</span><button class="btn danger" onclick="delCategory('${c.id}')">×</button></div>`).join('')}<h3>Produits</h3>${s.products.map(p=>`<div class="listrow row"><div class="row" style="justify-content:flex-start"><img class="image-preview" src="${p.image||'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='}"><span><b>${esc(p.name)}</b><br><small class="muted">${money(p.price)}</small></span></div><div><button class="btn light" onclick="editProduct('${p.id}')">✎</button><button class="btn danger" onclick="delProduct('${p.id}')">×</button></div></div>`).join('')||'<div class="empty">Aucun produit.</div>'}<button class="btn primary" style="width:100%;margin-top:14px" onclick="closeModal();go('dashboard')">✓ Enregistrer & retourner à l'accueil</button>`;document.getElementById('modal').classList.add('show')}
function addCategory(){let n=document.getElementById('cn').value.trim();if(n){s.categories.push({id:uid(),name:n});audit('Ajout section',n);save();menuManager()}}
function delCategory(id){let c=s.categories.find(x=>x.id===id);if(confirm('Supprimer cette section ?')){s.categories=s.categories.filter(x=>x.id!==id);s.products.forEach(p=>{if(p.cat===id)p.cat=''});audit('Suppression section',c?.name||id);save();menuManager()}}
function compressImage(file,cb){let r=new FileReader();r.onload=()=>{let im=new Image();im.onload=()=>{let max=900,scale=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*scale);c.height=Math.round(im.height*scale);c.getContext('2d').drawImage(im,0,0,c.width,c.height);cb(c.toDataURL('image/jpeg',.78))};im.src=r.result};r.readAsDataURL(file)}
function addProduct(){let n=document.getElementById('pn').value.trim(),p=Number(document.getElementById('pp').value),cat=document.getElementById('pc').value,file=document.getElementById('pi')?.files?.[0];if(!n||!p)return;let finish=image=>{s.products.push({id:uid(),name:n,price:p,cat,image:image||'',stockControl:false});audit('Ajout produit',n);save();menuManager()};file?compressImage(file,finish):finish('')}
function editProduct(id){let p=s.products.find(x=>x.id===id);if(!p)return;document.getElementById('sheet').innerHTML=`<div class="modalhead"><h2>Modifier produit</h2><button class="btn light" onclick="closeModal()">✕ Fermer</button></div><input class="input" id="epn" value="${esc(p.name)}"><br><br><input class="input" id="epp" type="number" step="0.001" value="${p.price}"><br><br><select class="select" id="epc"><option value="">Sans section</option>${s.categories.map(c=>`<option value="${c.id}" ${p.cat===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select><br><br><input class="input" id="epi" type="file" accept="image/*"><br><br>${p.image?`<img class="image-preview" src="${p.image}">`:''}<button class="btn gold" style="width:100%;margin-top:14px" onclick="saveProductEdit('${p.id}')">Enregistrer</button>`}
function saveProductEdit(id){let p=s.products.find(x=>x.id===id);if(!p)return;let file=document.getElementById('epi').files[0];let finish=image=>{p.name=document.getElementById('epn').value.trim()||p.name;p.price=Number(document.getElementById('epp').value)||p.price;p.cat=document.getElementById('epc').value;p.image=image||p.image;audit('Modification produit',p.name);closeModal();save()};file?compressImage(file,finish):finish('')}
function delProduct(id){let p=s.products.find(x=>x.id===id);if(confirm('Supprimer ce produit ?')){s.products=s.products.filter(x=>x.id!==id);s.stock=s.stock.filter(x=>x.productId!==id);audit('Suppression produit',p?.name||id);save();menuManager()}}
function brandManager(){document.getElementById('sheet').innerHTML=`<div class="modalhead"><h2>Identité</h2><button class="btn light" onclick="closeModal()">✕ Fermer</button></div><p class="muted">ألوان اللوغو الأصلية مستعملة في الواجهة: أحمر + كريمي + بني + ذهبي.</p><input class="input" id="bn" value="${esc(s.settings.name)}" placeholder="Nom du restaurant"><br><br><input class="input" id="bc" value="${esc(s.settings.brand)}" placeholder="#c4142c"><br><br><button class="btn gold" style="width:100%" onclick="saveBrand()">Enregistrer</button>`;document.getElementById('modal').classList.add('show')}
function saveBrand(){s.settings.name=document.getElementById('bn').value.trim()||'Restaurant';s.settings.brand=document.getElementById('bc').value.trim()||'#c4142c';audit('Réglages identité',s.settings.name);closeModal();save()}
function ticketManager(){document.getElementById('sheet').innerHTML=`<div class="modalhead"><h2>Numérotation</h2><button class="btn light" onclick="closeModal()">✕ Fermer</button></div><input class="input" id="tm" type="number" min="1" value="${s.settings.maxTicket}"><p class="muted">Exemple : 50 signifie 1 → 50 puis 1.</p><button class="btn gold" style="width:100%" onclick="s.settings.maxTicket=Math.max(1,Number(document.getElementById('tm').value));audit('Numérotation','max '+s.settings.maxTicket);closeModal();save()">Enregistrer</button>`;document.getElementById('modal').classList.add('show')}
function securityManager(){document.getElementById('sheet').innerHTML=`<div class="modalhead"><h2>🔐 Sécurité</h2><button class="btn light" onclick="closeModal()">✕ Fermer</button></div><p class="muted">Le PIN propriétaire donne accès à tout. Le PIN caisse يسمح بالبيع فقط.</p><label class="small">PIN propriétaire</label><input class="input" id="op" type="password" inputmode="numeric" value="${esc(s.security.ownerPin)}"><br><br><label class="small">PIN caisse / gérant</label><input class="input" id="sp" type="password" inputmode="numeric" value="${esc(s.security.staffPin)}"><br><br><label class="small">PIN serveur</label><input class="input" id="svp" type="password" inputmode="numeric" value="${esc(s.security.serverPin||'')}"><br><br><button class="btn gold" style="width:100%" onclick="saveSecurity()">Enregistrer les PIN</button>`;document.getElementById('modal').classList.add('show')}
function saveSecurity(){let op=document.getElementById('op').value.trim(),sp=document.getElementById('sp').value.trim(),svp=document.getElementById('svp').value.trim();if(op.length<4||sp.length<4||svp.length<4){alert('PIN لازم يكون 4 أرقام على الأقل');return}s.security.ownerPin=op;s.security.staffPin=sp;s.security.serverPin=svp;s.security.setup=true;audit('Sécurité','PIN modifiés');closeModal();save();lockApp()}
function fondCaisseToday(){return fondCaisseForDate(today())}
function needsFondCaisse(){return !fondCaisseToday()}
function openFondCaisse(){
  if(!currentRole||!needsFondCaisse())return;
  const roleName=currentRole==='owner'?'Aziz':currentRole==='staff'?'Gérant':'Serveur';
  document.getElementById('sheet').innerHTML=`<div class="fond-caisse-modal">
    <img class="fond-brand-logo" src="logo_header_pro.png" alt="Chez Jalel">
    <div class="fond-kicker">OUVERTURE DE CAISSE</div>
    <h2>Fond de Caisse</h2>
    <p class="muted">Bonjour ${roleName}. Avant de commencer, indique le montant qui se trouve déjà dans la caisse.</p>
    <div class="fond-explain"><b>Ce montant ne sera pas compté comme une vente.</b><span>Il servira de base pour le contrôle de caisse.</span></div>
    <label class="login-label" style="color:inherit;margin-top:18px">Montant au départ</label>
    <div class="fond-input-wrap"><input id="fondAmount" class="input" type="number" inputmode="decimal" min="0" step="0.001" placeholder="0.000"><span>DT</span></div>
    <button class="btn primary fond-submit" onclick="saveFondCaisse()">Ouvrir la caisse →</button>
    <div class="fond-date">${new Date().toLocaleDateString('fr-FR')} • ${new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</div>
  </div>`;
  const modal=document.getElementById('modal');modal.classList.add('show','fond-modal');
  const input=document.getElementById('fondAmount');if(input){setTimeout(()=>input.focus(),80);input.addEventListener('keydown',e=>{if(e.key==='Enter')saveFondCaisse()})}
}
function saveFondCaisse(){
  const input=document.getElementById('fondAmount');const amount=Number(input?.value);
  if(!Number.isFinite(amount)||amount<0){alert('حط مبلغ Fond de Caisse صحيح.');input?.focus();return}
  s.caisseSession={date:today(),amount,openedAt:new Date().toISOString(),openedBy:currentRole};s.caisseSessions=Array.isArray(s.caisseSessions)?s.caisseSessions:[];s.caisseSessions=s.caisseSessions.filter(x=>x.date!==today());s.caisseSessions.push(s.caisseSession);
  audit('Ouverture caisse',`Fond de Caisse: ${money(amount)} • ${new Date().toLocaleDateString('fr-FR')}`);
  closeModal();save();render();
}
function caisseControlCard(){return caisseControlCardForDate(today())}
function caisseControlCardForDate(d){const f=fondCaisseForDate(d);if(!f)return `<div class="card fond-dashboard"><div class="row"><div><span class="muted">FOND DE CAISSE</span><h3 style="margin:4px 0 0">Aucune ouverture</h3><div class="muted">Aucune caisse enregistrée pour cette journée.</div></div><div class="fond-mini" style="background:#2a2d31;color:#c8cbd0">—</div></div></div>`;const rev=revenueForDate(d),ex=expensesForDate(d),theoretical=Number(f.amount||0)+rev-ex;return `<div class="card fond-dashboard"><div class="row"><div><span class="muted">FOND DE CAISSE • ${d===today()?'AUJOURD’HUI':new Date(d+'T12:00:00').toLocaleDateString('fr-FR')}</span><h3 style="margin:4px 0 0">${money(f.amount)}</h3><div class="muted">Ouverte le ${new Date(f.openedAt).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})} • ${f.openedBy==='owner'?'Aziz':f.openedBy==='staff'?'Gérant':'Serveur'}</div></div><div class="fond-mini">✓ Ouverte</div></div><div class="fond-control-row"><span>Caisse théorique</span><b>${money(theoretical)}</b></div></div>`}
function setLoginRole(r){loginRole=r;document.getElementById('ownerTab')?.classList.toggle('on',r==='owner');document.getElementById('staffTab')?.classList.toggle('on',r==='staff');document.getElementById('serverTab')?.classList.toggle('on',r==='server');const roleEl=document.getElementById('lockRole');if(roleEl)roleEl.textContent=r==='owner'?'👑 Aziz':r==='staff'?'🧾 Gérant':'🧑‍🍳 Serveur'}
function unlockApp(){let pin=document.getElementById('pinInput').value.trim();if(!s.security.setup){if(pin.length<4){alert('أول مرة: اختار PIN من 4 أرقام على الأقل');return}s.security.ownerPin=pin;s.security.staffPin=pin;s.security.serverPin=pin;s.security.setup=true;save()}let ok=(loginRole==='owner'&&pin===s.security.ownerPin)||(loginRole==='staff'&&pin===s.security.staffPin)||(loginRole==='server'&&pin===s.security.serverPin);if(!ok){alert('PIN غالط');return}currentRole=loginRole;document.getElementById('lock').classList.remove('show');page=(currentRole==='staff'||currentRole==='server')?'pos':'dashboard';serverTable='';document.getElementById('pinInput').value='';render();setTimeout(()=>openFondCaisse(),80)}
function lockApp(){currentRole=null;document.getElementById('pinInput').value='';document.getElementById('lock').classList.add('show')}
const CJ_PUSH_VAPID_PUBLIC='BE0VrdcimqmAtxkNn9Rt-tUHbj4Qj4rEhKqqMXPt-pZfcWyRYcPRFr9hD-EjJDyMs9vmEcrIiBy6ZCOFr9q2WSk';
function cjPushStatus(t){const el=document.getElementById('cjPushStatus');if(el)el.textContent=t||''}
function urlBase64ToUint8Array(base64String){const padding='='.repeat((4-base64String.length%4)%4);const base64=(base64String+padding).replace(/-/g,'+').replace(/_/g,'/');const raw=atob(base64);return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)))}
async function enableUpdatePush(){
  const btn=document.getElementById('cjPushBtn');
  try{
    if(!('serviceWorker' in navigator)||!('PushManager' in window)){cjPushStatus('⚠️ هذا المتصفح ما يدعمش Web Push.');return}
    if(location.protocol!=='https:'){cjPushStatus('⚠️ يلزم HTTPS.');return}
    if(Notification.permission==='denied'){cjPushStatus('⚠️ الإشعارات مرفوضة من إعدادات المتصفح.');return}
    if(btn)btn.disabled=true; cjPushStatus('جاري تفعيل الإشعارات...');
    const reg=await navigator.serviceWorker.ready;
    let sub=await reg.pushManager.getSubscription();
    if(!sub) sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array(CJ_PUSH_VAPID_PUBLIC)});
    localStorage.setItem('chezJalelPushSubscription',JSON.stringify(sub.toJSON?sub.toJSON():sub));
    const c=cloudCfg();
    if(c?.enabled&&cloudClient){
      const row={id:btoa(unescape(encodeURIComponent(sub.endpoint))).replace(/[^a-zA-Z0-9]/g,'').slice(0,80),restaurant_id:c.restaurantId,device:c.device||'device',access_key:c.accessKey,subscription:sub.toJSON?sub.toJSON():sub,updated_at:new Date().toISOString()};
      const r=await cloudClient.from('push_subscriptions').upsert(row,{onConflict:'id'});
      if(r.error) throw r.error;
    }
    cjPushStatus('✅ إشعارات التحديث مفعّلة على هذا الجهاز');
  }catch(e){console.error('Push setup',e);cjPushStatus('❌ ما تمش تفعيل الإشعارات: '+(e?.message||e));}
  finally{if(btn)btn.disabled=false}
}
function refreshPushButton(){
  const btn=document.getElementById('cjPushBtn'); if(!btn)return;
  if(!('Notification' in window)||!('PushManager' in window)){btn.style.display='none';return}
  const sub=localStorage.getItem('chezJalelPushSubscription');
  if(sub&&Notification.permission==='granted'){btn.textContent='🔔 إشعارات التحديث مفعّلة';cjPushStatus('جاهز لاستقبال تحديثات التطبيق');}
}

async function boot(){
  updateOfflineUI();
  setTimeout(refreshPushButton,250);
  if('serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js?version=64',{updateViaCache:'none'}).then(reg=>reg.update()).catch(e=>console.warn('SW',e));}
  // Splash first, then always start locked on the login screen.
  currentRole=null;
  const splash=document.getElementById('cjSplash');
  setTimeout(()=>splash?.classList.add('hide'),1700);
  const lock=document.getElementById('lock');
  if(lock) lock.classList.add('show');
  setLoginRole('owner');
  const c=cloudCfg();
  if(c?.enabled){try{await cloudPull(); if(cloudClient) cloudSubscribe()}catch(e){console.error('Cloud boot error',e)}}
  if(!s.security.setup){document.getElementById('firstSetup').textContent='أول دخول: حط PIN المالك. بعد ذلك اعمل PIN للـ Caisse وPIN للـ Serveur من Sécurité.'}
  else document.getElementById('firstSetup').textContent='';
  if(lock) lock.classList.add('show');
}
/* V54 — automatic app-update notice across installed/open devices */
const CJ_APP_VERSION='65';
let cjUpdateTimer=null;
function showAppUpdateNotice(remoteVersion){
  if(document.getElementById('cjUpdateNotice')) return;
  const n=document.createElement('div'); n.id='cjUpdateNotice'; n.dataset.version=String(remoteVersion||'');
  n.innerHTML=`<div class="cj-update-icon">↻</div><div class="cj-update-copy"><b>تحديث جديد لـ ChezJalelPOS</b><span>نسخة جديدة متوفرة. اعمل تحديث باش تستعمل آخر نسخة.</span></div><button onclick="applyAppUpdate()">تحديث الآن</button>`;
  document.body.appendChild(n);
}
async function checkAppUpdate(){
  try{
    const r=await fetch('./app-version.json?ts='+Date.now(),{cache:'no-store',headers:{'Cache-Control':'no-cache'}});
    if(!r.ok)return;
    const v=await r.json();
    const remote=String(v.version||'').trim();
    const dismissed=localStorage.getItem('cjUpdateDismissedVersion')||'';
    if(remote && remote!==CJ_APP_VERSION && Number(remote)>Number(CJ_APP_VERSION) && dismissed!==remote) showAppUpdateNotice(remote);
  }catch(e){/* offline or version file unavailable */}
}
async function applyAppUpdate(){
  const n=document.getElementById('cjUpdateNotice'); const remoteVersionForUpdate=n?.dataset?.version||''; if(n)n.remove();
  try{localStorage.removeItem('cjUpdateDismissedVersion')}catch(e){}
  try{
    if('serviceWorker' in navigator){
      const reg=await navigator.serviceWorker.register('./sw.js?version=65&ts='+Date.now(),{updateViaCache:'none'});
      await reg.update();
    }
  }catch(e){console.warn('SW update',e)}
  const u=new URL(location.href); u.searchParams.set('update',Date.now()); u.searchParams.set('v',remoteVersionForUpdate||'64'); u.searchParams.set('fresh','1'); location.replace(u.toString());
}
function startAppUpdateChecker(){
  checkAppUpdate();
  clearInterval(cjUpdateTimer);
  cjUpdateTimer=setInterval(checkAppUpdate,5000);
  window.addEventListener('focus',checkAppUpdate);
  window.addEventListener('pageshow',checkAppUpdate);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkAppUpdate();});
}

applyTheme();document.getElementById('modal').addEventListener('click',e=>{if(e.target.id==='modal')closeModal()});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});
boot().catch(err=>{
  console.error('chezJalel boot error',err);
  currentRole=null;
  setLoginRole('owner');
  const lock=document.getElementById('lock');
  if(lock) lock.classList.add('show');
  setTimeout(()=>document.getElementById('cjSplash')?.classList.add('hide'),1700);
});
startAppUpdateChecker();


(function(){
 const b=document.getElementById('upBtn');
 function sc(){b.classList.toggle('show',window.scrollY>420)}
 window.addEventListener('scroll',sc,{passive:true}); b.onclick=()=>window.scrollTo({top:0,behavior:'smooth'}); sc();

})();
