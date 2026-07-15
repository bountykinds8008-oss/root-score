
const DEFAULT_PLAYERS = ["Aさん","Bさん","Cさん","Dさん"];
const state = {
  players: JSON.parse(localStorage.getItem("rootPlayers") || "null") || DEFAULT_PLAYERS,
  games: JSON.parse(localStorage.getItem("rootGames") || "[]"),
  mode: 3
};

const yen = n => `${n >= 0 ? "+" : ""}${Math.round(n).toLocaleString()}円`;
const save = () => {
  localStorage.setItem("rootPlayers", JSON.stringify(state.players));
  localStorage.setItem("rootGames", JSON.stringify(state.games));
};

function show(id){
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  if(id==="players") renderPlayers();
  if(id==="history") renderHistory();
  if(id==="ranking") renderRanking();
  if(id==="stats") renderStats();
  window.scrollTo({top:0,behavior:"smooth"});
}

document.querySelectorAll("[data-nav]").forEach(b=>b.onclick=()=>show(b.dataset.nav));
document.querySelectorAll(".back").forEach(b=>b.onclick=()=>show("home"));
document.querySelectorAll(".mode-card").forEach(b=>b.onclick=()=>{
  state.mode=Number(b.dataset.mode); startGame();
});

function startGame(){
  document.getElementById("gameTitle").textContent=`対局入力（${state.mode}人麻雀）`;
  document.getElementById("gameDate").value=new Date().toISOString().slice(0,10);
  const wrap=document.getElementById("playerInputs");
  wrap.innerHTML="";
  for(let i=0;i<state.mode;i++){
    const card=document.createElement("div");
    card.className="card player-row";
    card.innerHTML=`
      <label>プレイヤー
        <select class="pname">${state.players.map(p=>`<option>${p}</option>`).join("")}</select>
      </label>
      <label>最終持ち点
        <input class="points" type="number" step="100" value="${25000}">
      </label>
      <label>チップ枚数
        <input class="chips" type="number" step="1" value="0">
      </label>`;
    wrap.appendChild(card);
  }
  show("game");
}

function calcResults(){
  const rows=[...document.querySelectorAll("#playerInputs .player-row")];
  const names=rows.map(r=>r.querySelector(".pname").value);
  if(new Set(names).size!==names.length){alert("同じプレイヤーが重複しています");return;}
  const items=rows.map(r=>({
    name:r.querySelector(".pname").value,
    points:Number(r.querySelector(".points").value||0),
    chips:Number(r.querySelector(".chips").value||0)
  }));
  if(document.getElementById("openReachTsumo").checked) items[0].chips += 1;

  items.sort((a,b)=>b.points-a.points);
  const uma = state.mode===3 ? [30,0,-30] : [30,0,0,-30];
  const okaTop = state.mode===3 ? 15 : 20;

  items.forEach((x,i)=>{
    const pointScore=(x.points-40000)/1000;
    const score=pointScore+uma[i]+(i===0?okaTop:0);
    x.rank=i+1;
    x.score=score;
    x.pointYen=score*50;
    x.chipYen=x.chips*300;
    x.totalYen=x.pointYen+x.chipYen;
  });

  const game={
    id:Date.now(),
    date:document.getElementById("gameDate").value,
    mode:state.mode,
    items
  };
  state.games.unshift(game); save();
  renderResult(game);
}

function renderResult(game){
  const box=document.getElementById("resultBox");
  box.classList.remove("hidden");
  box.innerHTML=`<h3>精算結果</h3>`+game.items.map(x=>`
    <div class="result-card">
      <div class="list-row">
        <div><span class="rank">${x.rank}位</span> ${x.name}</div>
        <strong>${x.points.toLocaleString()}点</strong>
      </div>
      <div class="muted">点数精算 ${yen(x.pointYen)} / チップ ${yen(x.chipYen)}</div>
      <div class="money ${x.totalYen>=0?"plus":"minus"}"><strong>合計 ${yen(x.totalYen)}</strong></div>
    </div>`).join("")+`<button class="primary" onclick="show('home')">保存してホームへ</button>`;
}
document.getElementById("calcBtn").onclick=calcResults;

function renderPlayers(){
  const el=document.getElementById("playerList");
  el.innerHTML=state.players.map((p,i)=>`
    <div class="list-item list-row"><strong>${p}</strong>
      <button class="delete-btn" onclick="deletePlayer(${i})">削除</button>
    </div>`).join("");
}
window.deletePlayer=i=>{
  if(state.players.length<=4){alert("最低4名は残してください");return;}
  state.players.splice(i,1);save();renderPlayers();
};
document.getElementById("addPlayerBtn").onclick=()=>{
  const input=document.getElementById("newPlayerName");
  const name=input.value.trim();
  if(!name)return;
  if(state.players.includes(name)){alert("同じ名前があります");return;}
  state.players.push(name);input.value="";save();renderPlayers();
};

function renderHistory(){
  const el=document.getElementById("historyList");
  if(!state.games.length){el.innerHTML=`<div class="card">まだ対局履歴がありません。</div>`;return;}
  el.innerHTML=state.games.map(g=>`
    <div class="list-item">
      <div class="list-row"><strong>${g.date}・${g.mode}人麻雀</strong>
      <button class="delete-btn" onclick="deleteGame(${g.id})">削除</button></div>
      ${g.items.map(x=>`<div class="list-row muted"><span>${x.rank}位 ${x.name}</span><span>${yen(x.totalYen)}</span></div>`).join("")}
    </div>`).join("");
}
window.deleteGame=id=>{
  state.games=state.games.filter(g=>g.id!==id);save();renderHistory();
};

function aggregate(){
  const map={};
  state.games.forEach(g=>g.items.forEach(x=>{
    map[x.name] ||= {name:x.name,games:0,wins:0,lasts:0,total:0,rankSum:0};
    const s=map[x.name];s.games++;s.total+=x.totalYen;s.rankSum+=x.rank;
    if(x.rank===1)s.wins++;
    if(x.rank===g.mode)s.lasts++;
  }));
  return Object.values(map);
}

function renderRanking(){
  const data=aggregate().sort((a,b)=>b.total-a.total);
  const el=document.getElementById("rankingList");
  if(!data.length){el.innerHTML=`<div class="card">まだランキングデータがありません。</div>`;return;}
  el.innerHTML=data.map((x,i)=>`
    <div class="list-item list-row">
      <div><strong>${i+1}位 ${x.name}</strong><div class="muted">${x.games}戦</div></div>
      <div class="money ${x.total>=0?"plus":"minus"}"><strong>${yen(x.total)}</strong></div>
    </div>`).join("");
}

function renderStats(){
  const data=aggregate().sort((a,b)=>b.games-a.games);
  const el=document.getElementById("statsList");
  if(!data.length){el.innerHTML=`<div class="card">まだ成績データがありません。</div>`;return;}
  el.innerHTML=data.map(x=>`
    <div class="list-item">
      <div class="list-row"><strong>${x.name}</strong><strong>${yen(x.total)}</strong></div>
      <div class="muted">対局 ${x.games}回 / 1着率 ${(x.wins/x.games*100).toFixed(1)}% / 平均順位 ${(x.rankSum/x.games).toFixed(2)}</div>
      <div class="muted">ラス回数 ${x.lasts}回</div>
    </div>`).join("");
}

let deferredPrompt;
window.addEventListener("beforeinstallprompt",e=>{
  e.preventDefault();deferredPrompt=e;
  const btn=document.getElementById("installBtn");btn.hidden=false;
  btn.onclick=async()=>{deferredPrompt.prompt();await deferredPrompt.userChoice;btn.hidden=true;};
});
if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
