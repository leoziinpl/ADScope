const root=document.querySelector("#app");
const cfg=window.ADSCOPE_CONFIG||{};
const STORAGE="adscope_demo_v2";
const state={user:null,ads:JSON.parse(localStorage.getItem(STORAGE)||"[]"),editing:null};

const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const money=n=>Number(n||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const pct=n=>`${Number(n||0).toFixed(2)}%`;
function calc(a){
 const views=+a.views||0, likes=+a.likes||0, buys=+a.buys||0;
 const conv=views?buys/views*100:0, likeRate=views?likes/views*100:0;
 let score=100, problems=[], actions=[];
 if(conv<.5){score-=30;problems.push(["Conversão muito baixa","Muitas pessoas visualizam o produto, mas poucas compram."]);actions.push("Revisar oferta, preço promocional, foto principal e prova social.");}
 else if(conv<1){score-=15;problems.push(["Conversão abaixo do ideal","Existe tráfego, mas uma parcela pequena termina em compra."]);actions.push("Testar uma oferta mais forte e melhorar a apresentação do produto.");}
 if(likeRate<1){score-=15;problems.push(["Poucas curtidas","O anúncio está gerando pouco envolvimento proporcional às visualizações."]);actions.push("Testar nova imagem principal e destacar benefício e preço promocional.");}
 const sale=+a.sale||0,promo=+a.promo||0;
 if(sale&&promo&&promo>=sale){score-=10;problems.push(["Promoção sem vantagem aparente","O preço promocional não está abaixo do preço de venda."]);actions.push("Conferir a configuração da promoção.");}
 if(sale&&promo&&promo<sale&&(sale-promo)/sale<.05){score-=6;problems.push(["Desconto pouco perceptível","A diferença entre os preços é pequena."]);actions.push("Testar uma promoção mais competitiva sem comprometer sua margem.");}
 const days=a.created?Math.max(0,Math.floor((Date.now()-new Date(a.created+"T00:00:00"))/86400000)):null;
 if(days!==null&&days<7){score-=5;problems.push(["Anúncio recente","Ainda existe pouco histórico para uma conclusão forte."]);actions.push("Acompanhar o anúncio por mais alguns dias antes de grandes mudanças.");}
 if(!problems.length)problems.push(["Sem gargalo crítico","Os indicadores básicos não apontam um problema grave."]);
 if(!actions.length)actions.push("Faça testes controlados de capa, preço e oferta, alterando uma variável por vez.");
 return {score:Math.max(0,Math.min(100,Math.round(score))),conv,likeRate,days,problems,actions};
}
function persist(){localStorage.setItem(STORAGE,JSON.stringify(state.ads));}
function shell(){
 root.innerHTML=`<header><div class="brand">Ad<span>Scope</span></div><div class="user">${state.user?esc(state.user):""}<button id="logout" class="ghost">Sair</button></div></header>
 <main><div id="page"></div></main>`;
 document.querySelector("#logout").onclick=()=>{state.user=null;renderLogin()};
}
function renderLogin(){
 root.innerHTML=`<div class="login"><div class="login-card"><div class="brand big">Ad<span>Scope</span></div><h1>Seu painel de anúncios</h1><p>Entre para acompanhar seus anúncios, diagnósticos e histórico.</p>
 <label>E-mail</label><input id="email" type="email" placeholder="voce@email.com">
 <label>Senha</label><input id="pass" type="password" placeholder="••••••••">
 <button id="login">Entrar</button><div class="demo">Modo demonstração: qualquer e-mail e senha funcionam localmente. Para login real, conecte o Supabase no <b>config.js</b>.</div></div></div>`;
 document.querySelector("#login").onclick=()=>{const e=document.querySelector("#email").value.trim();if(!e)return alert("Informe seu e-mail.");state.user=e;renderDashboard()};
}
function renderDashboard(){
 shell();const page=document.querySelector("#page");
 const total=state.ads.length, critical=state.ads.filter(a=>calc(a).score<60).length, attention=state.ads.filter(a=>calc(a).score>=60&&calc(a).score<80).length;
 page.innerHTML=`<div class="top"><div><h1>Dashboard</h1><p>Monitore seus anúncios e descubra rapidamente onde está o gargalo.</p></div><button id="new">+ Novo anúncio</button></div>
 <div class="cards"><div><small>Anúncios</small><b>${total}</b></div><div><small>Críticos</small><b class="red">${critical}</b></div><div><small>Atenção</small><b class="yellow">${attention}</b></div><div><small>Saudáveis</small><b class="green">${total-critical-attention}</b></div></div>
 <section class="panel"><div class="panel-head"><h2>Meus anúncios</h2><span>${total} cadastrado(s)</span></div>
 ${total?`<div class="table"><div class="tr th"><span>Anúncio</span><span>Preço</span><span>Compras</span><span>Conversão</span><span>Score</span><span></span></div>${state.ads.map((a,i)=>{const c=calc(a);return `<div class="tr"><span><b>${esc(a.name||"Anúncio")}</b><small>${esc(a.url)}</small></span><span>${money(a.promo||a.sale)}</span><span>${a.buys}</span><span>${pct(c.conv)}</span><span><em class="${c.score<60?"critical":c.score<80?"attention":"good"}">${c.score}</em></span><span><button class="mini" data-i="${i}">Ver</button></span></div>`}).join("")}</div>`:`<div class="empty">Nenhum anúncio cadastrado.<br><button id="first">Cadastrar primeiro anúncio</button></div>`}</section>`;
 document.querySelector("#new").onclick=()=>form();
 const first=document.querySelector("#first");if(first)first.onclick=form;
 document.querySelectorAll(".mini").forEach(b=>b.onclick=()=>detail(+b.dataset.i));
}
function form(index=null){
 state.editing=index;
 shell();const page=document.querySelector("#page"),a=index===null?{}:state.ads[index];
 page.innerHTML=`<div class="top"><div><h1>${index===null?"Novo anúncio":"Editar anúncio"}</h1><p>Cadastre somente os dados essenciais.</p></div><button id="back" class="ghost dark">Voltar</button></div>
 <section class="panel form"><label>Nome interno do anúncio</label><input id="name" value="${esc(a.name||"")}" placeholder="Ex.: Kit 5 calcinhas algodão">
 <label>Link do anúncio</label><input id="url" value="${esc(a.url||"")}" placeholder="https://shopee.com.br/...">
 <div class="two"><div><label>Preço de venda (R$)</label><input id="sale" type="number" step=".01" value="${a.sale||""}"></div><div><label>Preço promocional (R$)</label><input id="promo" type="number" step=".01" value="${a.promo||""}"></div></div>
 <div class="two"><div><label>Visualizações</label><input id="views" type="number" value="${a.views||""}"></div><div><label>Curtidas</label><input id="likes" type="number" value="${a.likes||""}"></div></div>
 <div class="two"><div><label>Compras</label><input id="buys" type="number" value="${a.buys||""}"></div><div><label>Data do anúncio</label><input id="created" type="date" value="${a.created||""}"></div></div>
 <button id="save">Salvar anúncio</button></section>`;
 document.querySelector("#back").onclick=renderDashboard;
 document.querySelector("#save").onclick=()=>{
  const x={name:document.querySelector("#name").value.trim(),url:document.querySelector("#url").value.trim(),sale:+document.querySelector("#sale").value||0,promo:+document.querySelector("#promo").value||0,views:+document.querySelector("#views").value||0,likes:+document.querySelector("#likes").value||0,buys:+document.querySelector("#buys").value||0,created:document.querySelector("#created").value,updated:new Date().toISOString()};
  if(!x.url||!x.views||!x.buys)return alert("Preencha link, visualizações e compras.");
  if(index===null){x.id=crypto.randomUUID();x.history=[{...x,at:new Date().toISOString()}];state.ads.push(x)}else{const old=state.ads[index];x.id=old.id;x.history=[...(old.history||[]),{...x,at:new Date().toISOString()}];state.ads[index]=x}
  persist();renderDashboard();
 };
}
function detail(i){
 const a=state.ads[i],c=calc(a),history=a.history||[];
 shell();const page=document.querySelector("#page");
 page.innerHTML=`<div class="top"><div><h1>${esc(a.name||"Anúncio")}</h1><p>${esc(a.url)}</p></div><div><button id="edit">Editar</button><button id="back" class="ghost dark">Voltar</button></div></div>
 <div class="cards"><div><small>Score</small><b>${c.score}/100</b></div><div><small>Conversão</small><b>${pct(c.conv)}</b></div><div><small>Curtidas</small><b>${pct(c.likeRate)}</b></div><div><small>Histórico</small><b>${history.length}</b></div></div>
 <section class="panel"><h2>Diagnóstico atual</h2>${c.problems.map((p,n)=>`<div class="problem"><b>${n+1}. ${p[0]}</b><p>${p[1]}</p></div>`).join("")}<h2>Plano de ação</h2>${c.actions.map((x,n)=>`<div class="action"><i>${n+1}</i><span>${x}</span></div>`).join("")}</section>
 <section class="panel"><h2>Histórico do anúncio</h2>${history.length?`<div class="history">${history.slice().reverse().map(h=>{const hc=calc(h);return `<div class="hist"><b>${new Date(h.at).toLocaleString("pt-BR")}</b><span>${h.views.toLocaleString("pt-BR")} visualizações</span><span>${h.likes.toLocaleString("pt-BR")} curtidas</span><span>${h.buys.toLocaleString("pt-BR")} compras</span><span>Conversão ${pct(hc.conv)}</span><span>Preço ${money(h.promo||h.sale)}</span></div>`}).join("")}</div>`:"Nenhum snapshot ainda."}</section>`;
 document.querySelector("#back").onclick=renderDashboard;document.querySelector("#edit").onclick=()=>form(i);
}
function renderLoginOrDashboard(){state.user?renderDashboard():renderLogin()}
renderLoginOrDashboard();