/* CITIZENS ARCHIVE — local-first intelligence workspace */
const KEY='citizens_archive_v1';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const now=()=>new Date().toISOString();
let state=load();
let selectedId=null, graph={x:0,y:0,z:1}, linkMode=null;

function blank(){return{cases:[],activeCaseId:null,activity:[],version:1}}
function load(){try{const d=JSON.parse(localStorage.getItem(KEY));return d&&d.cases?d:blank()}catch{return blank()}}
function save(){localStorage.setItem(KEY,JSON.stringify(state));setStatus('SAVED '+new Date().toLocaleTimeString())}
function activeCase(){return state.cases.find(c=>c.id===state.activeCaseId)}
function setStatus(t){$('#workspaceStatus').textContent=t}
function log(text){state.activity.unshift({id:uid(),text,time:now()});state.activity=state.activity.slice(0,50);save();renderAll()}
function current(){const c=activeCase();if(!c)return null;return c}
function ensureCase(){if(!state.cases.length){createCase('Initial Research Case','Local research workspace created automatically.',false)}if(!state.activeCaseId||!activeCase())state.activeCaseId=state.cases[0].id}
function createCase(name,desc,notify=true){const c={id:uid(),name,description:desc||'',labels:[],notes:'',created:now(),updated:now(),cards:[],sources:[],events:[]};state.cases.unshift(c);state.activeCaseId=c.id;if(notify)log('Created case: '+name);save();renderAll();return c}
function findCard(id){return current()?.cards.find(x=>x.id===id)}
function findSource(id){return current()?.sources.find(x=>x.id===id)}
function findEvent(id){return current()?.events.find(x=>x.id===id)}

/* modal */
let modalSave=null;
function openModal(title,html,onSave){$('#modalTitle').textContent=title;$('#modalBody').innerHTML=html;modalSave=onSave;$('#modal').classList.remove('hidden')}
function closeModal(){$('#modal').classList.add('hidden');modalSave=null}
$('#modalClose').onclick=closeModal;$('#modalCancel').onclick=closeModal;
$('#modalSave').onclick=()=>{if(modalSave&&modalSave()!==false)closeModal()};
$('#modal').addEventListener('click',e=>{if(e.target.id==='modal')closeModal()});
function field(label,id,type='text',value='',extra=''){return `<label>${label}</label><input id="${id}" type="${type}" value="${esc(value)}" ${extra}>`}
function area(label,id,value=''){return `<label>${label}</label><textarea id="${id}" rows="5">${esc(value)}</textarea>`}
function esc(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}

/* navigation */
$$('.nav-btn').forEach(b=>b.onclick=()=>{ $$('.nav-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');$$('.view').forEach(v=>v.classList.remove('active'));$('#view-'+b.dataset.view).classList.add('active');if(innerWidth<=720)$('#sidebar').classList.remove('open');renderAll()});
$('#mobileMenu').onclick=()=>$('#sidebar').classList.toggle('open');
$('#collapseSidebar').onclick=()=>document.body.classList.toggle('compact');
$('#notificationsBtn').onclick=()=>{go('dashboard')};
function go(view){const b=$(`.nav-btn[data-view="${view}"]`);b?.click()}

/* case selector */
$('#caseSelector').onchange=e=>{state.activeCaseId=e.target.value;selectedId=null;save();renderAll()};

/* global actions */
document.addEventListener('click',e=>{const a=e.target.closest('[data-action]');if(!a)return;const action=a.dataset.action;
 if(action==='new-case')caseModal();
 if(action==='new-card')cardModal();
 if(action==='new-source')sourceModal();
 if(action==='new-event')eventModal();
 if(action==='add-node')cardModal();
 if(action==='clear-links'){if(current()){current().cards.forEach(c=>c.links=[]);save();renderAll();log('Cleared graph relationships')}}
 if(action==='export-json')download('citizens-archive.json',JSON.stringify(state,null,2),'application/json');
 if(action==='export-csv')exportCSV();
 if(action==='export-txt')exportTXT();
 if(action==='export-html')exportHTML();
 if(action==='import-json')$('#fileInput').click();
 if(action==='print-report')window.print();
});
$('#fileInput').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);if(!d.cases)throw 0;state=d;ensureCase();save();renderAll();log('Imported JSON archive')}catch{alert('Invalid CITIZENS ARCHIVE JSON file.')}};r.readAsText(f);e.target.value=''};
function download(name,content,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;a.click();URL.revokeObjectURL(a.href)}

/* cases */
function caseModal(id){const c=id?state.cases.find(x=>x.id===id):null;openModal(id?'Edit Case':'New Case',field('Case name','mName','text',c?.name||'')+area('Description','mDesc',c?.description||'')+field('Subject labels (comma separated)','mLabels','text',(c?.labels||[]).join(', '))+area('Investigation notes','mNotes',c?.notes||''),()=>{const name=$('#mName').value.trim();if(!name)return false;if(c){c.name=name;c.description=$('#mDesc').value;c.labels=$('#mLabels').value.split(',').map(x=>x.trim()).filter(Boolean);c.notes=$('#mNotes').value;c.updated=now();log('Updated case: '+name)}else createCase(name,$('#mDesc').value);return true})}
function deleteCase(id){if(!confirm('Delete this case and all its local records?'))return;state.cases=state.cases.filter(c=>c.id!==id);if(state.activeCaseId===id)state.activeCaseId=state.cases[0]?.id||null;ensureCase();save();renderAll();log('Deleted a case')}
function renderCases(){$('#caseList').innerHTML=state.cases.map(c=>`<article class="case-card ${c.id===state.activeCaseId?'active':''}" data-case="${c.id}"><h3>${esc(c.name)}</h3><p>${esc(c.description||'No description')}</p><div class="case-meta">${c.labels.map(l=>`<span class="tag">${esc(l)}</span>`).join('')}<span class="tag">${c.cards.length} cards</span><span class="tag">${c.sources.length} sources</span></div><div class="case-actions"><button data-edit-case="${c.id}">Edit</button><button data-del-case="${c.id}">Delete</button><button data-open-case="${c.id}">Open</button></div></article>`).join('')||'<p class="muted">No cases yet.</p>'}
document.addEventListener('click',e=>{const ed=e.target.closest('[data-edit-case]');const del=e.target.closest('[data-del-case]');const op=e.target.closest('[data-open-case]');if(ed)caseModal(ed.dataset.editCase);if(del)deleteCase(del.dataset.delCase);if(op){state.activeCaseId=op.dataset.openCase;save();renderAll();go('workspace')}});

/* cards */
const cardTypes={note:'NOTE',source:'PUBLIC SOURCE',organization:'ORGANIZATION',username:'USERNAME',timeline:'TIMELINE'};
function cardModal(id){const c=current();if(!c)return;const card=id?findCard(id):null;openModal(id?'Edit Information Card':'New Information Card',field('Title','cTitle','text',card?.title||'')+area('Content / notes','cBody',card?.body||'')+field('Reference or public URL','cRef','text',card?.ref||'')+field('Category','cCat','text',card?.category||'General'),()=>{const title=$('#cTitle').value.trim();if(!title)return false;const data={title,body:$('#cBody').value,ref:$('#cRef').value,category:$('#cCat').value||'General'};if(card){Object.assign(card,data);card.updated=now();log('Updated card: '+title)}else{const type=$('#cardType').value;current().cards.push({id:uid(),type,title,body:'',ref:'',category:'General',x:60+Math.random()*220,y:60+Math.random()*160,w:250,h:150,links:[],...data,created:now()});log('Added card: '+title)}save();renderAll();return true})}
function deleteCard(id){if(!confirm('Delete this card?'))return;const c=current();c.cards=c.cards.filter(x=>x.id!==id);c.cards.forEach(x=>x.links=(x.links||[]).filter(l=>l!==id));if(selectedId===id)selectedId=null;save();renderAll();log('Deleted a card')}
function renderCards(){const c=current();const canvas=$('#canvas');canvas.innerHTML='';if(!c)return;c.cards.forEach(card=>{const el=document.createElement('article');el.className='card';el.dataset.id=card.id;el.style.left=card.x+'px';el.style.top=card.y+'px';el.style.width=card.w+'px';el.style.height=card.h+'px';el.innerHTML=`<div class="card-head"><span class="card-type">${cardTypes[card.type]||'RECORD'}</span><span>⋯</span></div><h4>${esc(card.title)}</h4><p>${esc(card.body||'No content')}</p><div class="card-actions"><button data-edit-card="${card.id}">Edit</button><button data-link-card="${card.id}">Link</button><button data-del-card="${card.id}">Delete</button></div><div class="resize"></div>`;canvas.appendChild(el);makeDraggable(el,card);makeResizable(el,card);el.addEventListener('click',e=>{if(!e.target.closest('button'))selectRecord(card.id,'card')})})}
document.addEventListener('click',e=>{const ed=e.target.closest('[data-edit-card]'),lk=e.target.closest('[data-link-card]'),dl=e.target.closest('[data-del-card]');if(ed)cardModal(ed.dataset.editCard);if(dl)deleteCard(dl.dataset.delCard);if(lk){linkMode=lk.dataset.linkCard;alert('Now click another card to create a relationship.')}});
function makeDraggable(el,obj){let sx,sy,ox,oy,drag=false;el.addEventListener('pointerdown',e=>{if(e.target.closest('button,.resize'))return;drag=true;el.classList.add('dragging');sx=e.clientX;sy=e.clientY;ox=obj.x;oy=obj.y;el.setPointerCapture(e.pointerId)});el.addEventListener('pointermove',e=>{if(!drag)return;obj.x=Math.max(0,ox+e.clientX-sx);obj.y=Math.max(0,oy+e.clientY-sy);el.style.left=obj.x+'px';el.style.top=obj.y+'px'});el.addEventListener('pointerup',()=>{if(drag){drag=false;el.classList.remove('dragging');save()}})}
function makeResizable(el,obj){const h=el.querySelector('.resize');let active=false,sx,sy,ow,oh;h.addEventListener('pointerdown',e=>{e.stopPropagation();active=true;sx=e.clientX;sy=e.clientY;ow=obj.w;oh=obj.h;h.setPointerCapture(e.pointerId)});h.addEventListener('pointermove',e=>{if(!active)return;obj.w=Math.max(190,ow+e.clientX-sx);obj.h=Math.max(110,oh+e.clientY-sy);el.style.width=obj.w+'px';el.style.height=obj.h+'px'});h.addEventListener('pointerup',()=>{if(active){active=false;save()}})}

/* graph */n
function renderGraph(){const c=current();const svg=$('#graphSvg'),nodes=$('#graphNodes');svg.innerHTML='';nodes.innerHTML='';if(!c)return;const byId=Object.fromEntries(c.cards.map(x=>[x.id,x]));c.cards.forEach(a=>{(a.links||[]).forEach(b=>{const n=byId[b];if(!n)return;const line=document.createElementNS('http://www.w3.org/2000/svg','line');line.setAttribute('x1',a.x+90);line.setAttribute('y1',a.y+50);line.setAttribute('x2',n.x+90);line.setAttribute('y2',n.y+50);line.setAttribute('stroke','rgba(255,45,64,.45)');line.setAttribute('stroke-width','1.5');svg.appendChild(line)})});c.cards.forEach(card=>{const el=document.createElement('div');el.className='gnode'+(selectedId===card.id?' selected':'');el.dataset.id=card.id;el.style.left=card.x+'px';el.style.top=card.y+'px';el.innerHTML=`<strong>${esc(card.title)}</strong><small>${cardTypes[card.type]||'RECORD'}</small>`;makeDraggable(el,card);el.onclick=()=>selectRecord(card.id,'card');nodes.appendChild(el)});applyZoom()}
function applyZoom(){$('#graphNodes').style.transform=`translate(${graph.x}px,${graph.y}px) scale(${graph.z})`;$('#graphSvg').style.transform=`translate(${graph.x}px,${graph.y}px) scale(${graph.z})`}
$$('.graph-controls button').forEach(b=>b.onclick=()=>{const z=b.dataset.zoom;if(z==='in')graph.z=Math.min(2.5,graph.z+.15);if(z==='out')graph.z=Math.max(.4,graph.z-.15);if(z==='reset'){graph={x:0,y:0,z:1}}applyZoom()});
$('#graphSvg').parentElement.addEventListener('wheel',e=>{e.preventDefault();graph.x+=e.deltaX;graph.y+=e.deltaY;applyZoom()},{passive:false});

/* sources */
function sourceModal(id){const c=current();if(!c)return;const s=id?findSource(id):null;openModal(id?'Edit Source':'Add Public Source',field('Source title','sTitle','text',s?.title||'')+field('Public URL','sUrl','url',s?.url||'')+area('Description / source notes','sNotes',s?.notes||'')+field('Collection date','sDate','date',s?.date||now().slice(0,10))+`<label>Verification status</label><select id="sStatus"><option value="verified" ${s?.status==='verified'?'selected':''}>Verified</option><option value="unverified" ${!s||s.status==='unverified'?'selected':''}>Unverified</option></select>`,()=>{const title=$('#sTitle').value.trim();if(!title)return false;const data={title,url:$('#sUrl').value,notes:$('#sNotes').value,date:$('#sDate').value,status:$('#sStatus').value};if(s){Object.assign(s,data);log('Updated source: '+title)}else{c.sources.unshift({id:uid(),...data,created:now()});log('Added source: '+title)}save();renderAll();return true})}
function deleteSource(id){if(!confirm('Delete this source?'))return;const c=current();c.sources=c.sources.filter(s=>s.id!==id);if(selectedId===id)selectedId=null;save();renderAll();log('Deleted a source')}
function renderSources(){const c=current();const q=$('#sourceFilter').value.toLowerCase(),st=$('#sourceStatus').value;const list=(c?.sources||[]).filter(s=>(!q||(s.title+s.url+s.notes).toLowerCase().includes(q))&&(!st||s.status===st));$('#sourceList').innerHTML=list.map(s=>`<article class="record" data-source="${s.id}"><div class="record-head"><h3>${esc(s.title)}</h3><span class="${s.status}">${s.status.toUpperCase()}</span></div><p>${esc(s.notes||'No description')}</p><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.url||'No URL provided')}</a><div class="record-actions"><span class="muted">Collected ${esc(s.date||'—')}</span><button data-edit-source="${s.id}">Edit</button><button data-del-source="${s.id}">Delete</button></div></article>`).join('')||'<p class="muted">No matching sources.</p>'}
document.addEventListener('click',e=>{const ed=e.target.closest('[data-edit-source]'),dl=e.target.closest('[data-del-source]');if(ed)sourceModal(ed.dataset.editSource);if(dl)deleteSource(dl.dataset.delSource)});
$('#sourceFilter').oninput=renderSources;$('#sourceStatus').onchange=renderSources;

/* timeline */
function eventModal(id){const c=current();if(!c)return;const ev=id?findEvent(id):null;openModal(id?'Edit Timeline Event':'Add Timeline Event',field('Event date','eDate','date',ev?.date||now().slice(0,10))+field('Event title','eTitle','text',ev?.title||'')+area('Description','eBody',ev?.body||'')+field('Linked card ID (optional)','eLink','text',ev?.cardId||''),()=>{const title=$('#eTitle').value.trim();if(!title)return false;const data={date:$('#eDate').value,title,body:$('#eBody').value,cardId:$('#eLink').value};if(ev){Object.assign(ev,data);log('Updated timeline event')}else{c.events.push({id:uid(),...data,created:now()});log('Added timeline event: '+title)}save();renderAll();return true})}
function deleteEvent(id){if(!confirm('Delete this event?'))return;const c=current();c.events=c.events.filter(e=>e.id!==id);if(selectedId===id)selectedId=null;save();renderAll();log('Deleted timeline event')}
function renderTimeline(){const c=current();const events=[...(c?.events||[])].sort((a,b)=>(a.date||'').localeCompare(b.date||''));$('#timelineList').innerHTML=events.map(e=>`<article class="timeline-item" data-event="${e.id}"><time>${esc(e.date||'Undated')}</time><h3>${esc(e.title)}</h3><p>${esc(e.body||'')}</p>${e.cardId?`<span class="tag">Linked record: ${esc(e.cardId)}</span>`:''}<div class="record-actions"><button data-edit-event="${e.id}">Edit</button><button data-del-event="${e.id}">Delete</button></div></article>`).join('')||'<p class="muted">No timeline events yet.</p>'}
document.addEventListener('click',e=>{const ed=e.target.closest('[data-edit-event]'),dl=e.target.closest('[data-del-event]');if(ed)eventModal(ed.dataset.editEvent);if(dl)deleteEvent(dl.dataset.delEvent)});

/* details */n
function selectRecord(id,type){selectedId=id;const c=current();let item,typeLabel='RECORD';if(type==='card'){item=findCard(id);typeLabel=cardTypes[item.type]||'CARD'}if(type==='source'){item=findSource(id);typeLabel='SOURCE'}if(type==='event'){item=findEvent(id);typeLabel='TIMELINE EVENT'}if(!item)return;$('#detailsTitle').textContent=item.title||'Record Details';$('#detailsBody').innerHTML=`<div><label>TYPE</label><div>${typeLabel}</div></div><div><label>CATEGORY / STATUS</label><div>${esc(item.category||item.status||'—')}</div></div><div><label>CONTENT</label><div>${esc(item.body||item.notes||'No content')}</div></div>${item.url?`<div><label>SOURCE URL</label><a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">${esc(item.url)}</a></div>`:''}${item.ref?`<div><label>REFERENCE</label><a href="${esc(item.ref)}" target="_blank" rel="noopener noreferrer">${esc(item.ref)}</a></div>`:''}<div><label>CREATED</label><div>${esc((item.created||'').slice(0,19).replace('T',' '))}</div></div>`;$('#detailsPanel').classList.add('open');renderGraph()}
$('#closeDetails').onclick=()=>{$('#detailsPanel').classList.remove('open');selectedId=null;renderGraph()};

/* search */n
$('#globalSearch').oninput=e=>{const q=e.target.value.trim().toLowerCase();const box=$('#searchResults');if(!q){box.classList.add('hidden');return}const c=current();const results=[];(state.cases||[]).forEach(cs=>{if(cs.name.toLowerCase().includes(q))results.push({id:cs.id,type:'Case',title:cs.name,sub:cs.description||'Case'});cs.cards.forEach(x=>{if((x.title+x.body+x.category).toLowerCase().includes(q))results.push({id:x.id,type:'Card — '+cs.name,title:x.title,sub:x.body})});cs.sources.forEach(x=>{if((x.title+x.url+x.notes).toLowerCase().includes(q))results.push({id:x.id,type:'Source — '+cs.name,title:x.title,sub:x.url})});cs.events.forEach(x=>{if((x.title+x.body).toLowerCase().includes(q))results.push({id:x.id,type:'Timeline — '+cs.name,title:x.title,sub:x.body})})});box.innerHTML=results.slice(0,25).map(r=>`<div class="search-result" data-search-id="${r.id}" data-search-type="${r.type.split(' — ')[0].toLowerCase()}"><strong>${esc(r.title)}</strong><small>${esc(r.type)} · ${esc(r.sub||'')}</small></div>`).join('')||'<div class="search-result muted">No local matches.</div>';box.classList.remove('hidden')};
document.addEventListener('click',e=>{const r=e.target.closest('[data-search-id]');if(!r)return;const id=r.dataset.searchId,type=r.dataset.searchType;$('#searchResults').classList.add('hidden');$('#globalSearch').value='';if(type==='case'){state.activeCaseId=id;save();renderAll();go('cases')}else{go(type==='source'?'sources':type==='timeline'?'timeline':'workspace');selectRecord(id,type==='source'?'source':type==='timeline'?'event':'card')}});
document.addEventListener('click',e=>{if(!e.target.closest('.search-wrap'))$('#searchResults').classList.add('hidden')});

/* exports */n
function exportCSV(){const rows=[['record_type','case','title','category_status','content','reference','date']];state.cases.forEach(c=>{c.cards.forEach(x=>rows.push(['card',c.name,x.title,x.category,x.body,x.ref,'']));c.sources.forEach(x=>rows.push(['source',c.name,x.title,x.status,x.notes,x.url,x.date]));c.events.forEach(x=>rows.push(['timeline',c.name,x.title,'',x.body,'',x.date]))});download('citizens-archive.csv',rows.map(r=>r.map(v=>`"${String(v||'').replace(/"/g,'""')}"`).join(',')).join('\n'),'text/csv')}
function exportTXT(){let out='CITIZENS ARCHIVE REPORT\nGenerated: '+new Date().toLocaleString()+'\n\n';state.cases.forEach(c=>{out+=`CASE: ${c.name}\n${c.description||''}\nLabels: ${(c.labels||[]).join(', ')}\n\n`;c.cards.forEach(x=>out+=`[CARD/${x.type}] ${x.title}\n${x.body}\nRef: ${x.ref}\n\n`);c.sources.forEach(x=>out+=`[SOURCE/${x.status}] ${x.title}\n${x.url}\n${x.notes}\n\n`);c.events.forEach(x=>out+=`[EVENT ${x.date}] ${x.title}\n${x.body}\n\n`)}) ;download('citizens-archive.txt',out,'text/plain')}
function exportHTML(){const body=state.cases.map(c=>`<section><h2>${esc(c.name)}</h2><p>${esc(c.description)}</p><h3>Records</h3><ul>${c.cards.map(x=>`<li><strong>${esc(x.title)}</strong> — ${esc(x.body)}</li>`).join('')}</ul><h3>Sources</h3><ul>${c.sources.map(x=>`<li><strong>${esc(x.title)}</strong> (${esc(x.status)}) — <a href="${esc(x.url)}">${esc(x.url)}</a></li>`).join('')}</ul><h3>Timeline</h3><ul>${c.events.map(x=>`<li><strong>${esc(x.date)}</strong> — ${esc(x.title)}: ${esc(x.body)}</li>`).join('')}</ul></section>`).join('');download('citizens-archive.html',`<!doctype html><meta charset="utf-8"><title>CITIZENS ARCHIVE Report</title><style>body{font-family:system-ui;max-width:900px;margin:40px auto;color:#111}h1{color:#8d1420}</style><h1>CITIZENS ARCHIVE</h1><p>Generated ${new Date().toLocaleString()}</p>${body}`,'text/html')}

/* render */n
function renderAll(){ensureCase();const c=current();$('#caseSelector').innerHTML=state.cases.map(x=>`<option value="${x.id}" ${x.id===state.activeCaseId?'selected':''}>${esc(x.name)}</option>`).join('');$('#statCases').textContent=state.cases.length;$('#statRecords').textContent=state.cases.reduce((n,x)=>n+x.cards.length,0);$('#statSources').textContent=state.cases.reduce((n,x)=>n+x.sources.length,0);$('#statEvents').textContent=state.cases.reduce((n,x)=>n+x.events.length,0);$('#activityList').innerHTML=(state.activity||[]).map(a=>`<div class="activity-item">${esc(a.text)}<time>${esc(a.time.slice(0,19).replace('T',' '))}</time></div>`).join('')||'<p class="muted">No recorded activity yet.</p>';$('#notifCount').textContent=state.activity.length;renderCases();renderCards();renderGraph();renderSources();renderTimeline()}
ensureCase();if(!state.activity.length)log('CITIZENS ARCHIVE workspace initialized');renderAll();setStatus('READY');
