import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const players = {
  Sinner:{elo:2160,surface:2190,form:8,serve:.67,ret:.43},
  Alcaraz:{elo:2180,surface:2170,form:9,serve:.66,ret:.44},
  Zverev:{elo:2020,surface:2035,form:7,serve:.69,ret:.39},
  Fritz:{elo:1980,surface:2010,form:6,serve:.68,ret:.38},
  "De Minaur":{elo:1960,surface:1975,form:7,serve:.63,ret:.42},
  Hurkacz:{elo:1940,surface:1985,form:6,serve:.71,ret:.35},
  Paul:{elo:1930,surface:1940,form:6,serve:.64,ret:.40},
  Rublev:{elo:1950,surface:1960,form:5,serve:.66,ret:.39}
};
const logistic = x => 1/(1+Math.pow(10,-x/400));
function factors(a,b){
  const A=players[a],B=players[b];
  return [
    ["Overall Elo", .5*(A.elo-B.elo)],
    ["Surface Elo", .3*(A.surface-B.surface)],
    ["Serve + Return", 220*((A.serve+A.ret)-(B.serve+B.ret))],
    ["Recent form", 7*(A.form-B.form)]
  ];
}
function predict(a,b){
  const A=players[a], B=players[b];
  const d=factors(a,b).reduce((sum,item)=>sum+item[1],0);
  const p=logistic(d), set=logistic(d*.78), pa=p, pb=1-p;
  let scores=[["2–0",pa*set],["2–1",pa*(1-set)],["1–2",pb*set],["0–2",pb*(1-set)]];
  const total=scores.reduce((sum,item)=>sum+item[1],0);
  scores=scores.map(item=>[item[0],item[1]/total]);
  return {p,set,games:9.4+2*(1-Math.abs(set-.5)*2),scores};
}
function Bar({v}){ return <div className="bar"><i style={{width:(v*100)+"%"}} /></div>; }
function App(){
  const names=Object.keys(players);
  const [fixtures,setFixtures]=useState([]);
  const [dataStatus,setDataStatus]=useState("Laddar riktiga matcher…");
  const [selectedFixture,setSelectedFixture]=useState(null);
  const [history,setHistory]=useState({});
  useEffect(()=>{fetch("/api/fixtures").then(async r=>{const j=await r.json(); if(!r.ok) throw new Error(j.error||"API error"); const rows=Array.isArray(j.data)?j.data:[]; setFixtures(rows.slice(0,12)); setDataStatus(rows.length?`${rows.length} singelmatcher hittade`:"Inga singelmatcher hittades");}).catch(()=>setDataStatus("Kunde inte läsa matchdata"));},[]);
  useEffect(()=>{if(!selectedFixture)return; const ids=[selectedFixture.player1_id,selectedFixture.player2_id]; Promise.all(ids.map(id=>fetch("/api/player-history?id="+id).then(r=>r.json()))).then(([x,y])=>setHistory({p1:x.data||[],p2:y.data||[]})).catch(()=>setHistory({p1:[],p2:[]}));},[selectedFixture]);
  const [a,setA]=useState("Hurkacz");
  const [b,setB]=useState("De Minaur");
  const r=useMemo(()=>predict(a,b),[a,b]);
  const why=useMemo(()=>factors(a,b),[a,b]);
  const spread=Math.max(...why.map(x=>Math.abs(x[1])));
  const confidence=spread>55?"HÖG":spread>25?"MEDEL":"LÅG";
  return (
    <main>
      <header><b>TENNIS<span>AI</span></b><small>PRE-MATCH MODEL • v0.1</small></header>
      <section className="card"><h2>Live datakoppling</h2><div className="stat"><span>Live Tennis API</span><b>{dataStatus}</b></div>{fixtures.map((m,i)=>{const p1=m.player1_name||m.players?.p1?.name||m.player1?.name||"Spelare 1";const p2=m.player2_name||m.players?.p2?.name||m.player2?.name||"Spelare 2";return <button type="button" className="stat fixture" key={m.id||i} onClick={()=>setSelectedFixture(m)}><span>{p1} vs {p2}<small>{m.tournament||m.round||""} • {m.status==="scheduled"?"KOMMANDE":m.status==="live"?"LIVE":m.status==="finished"?"AVSLUTAD":m.status||""}</small></span><b>{m.surface||m.tour||"Tennis"}</b></button>})}</section>
      {selectedFixture&&<section className="card hero"><h2>Vald riktig match</h2><div className="prob"><strong>{selectedFixture.player1_name}</strong><em>VS</em><strong>{selectedFixture.player2_name}</strong></div><p className="note">{selectedFixture.tournament} • {selectedFixture.round} • {selectedFixture.surface} • {selectedFixture.start_time?new Date(selectedFixture.start_time).toLocaleString("sv-SE",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}):""}</p><div className="stat"><span>Historik laddad</span><b>{(history.p1?.length||0)} / {(history.p2?.length||0)} matcher</b></div><p className="disclaimer">Historiken hämtas server-side och blir underlag för Elo, underlagsstyrka och form. Vi visar inga riktiga modellprocent förrän beräkningen är validerad.</p></section>}
      <section className="card">
        <label>Matchanalys</label>
        <div className="pick">
          <select value={a} onChange={e=>setA(e.target.value)}>{names.filter(x=>x!==b).map(x=><option key={x} value={x}>{x}</option>)}</select>
          <em>VS</em>
          <select value={b} onChange={e=>setB(e.target.value)}>{names.filter(x=>x!==a).map(x=><option key={x} value={x}>{x}</option>)}</select>
        </div>
      </section>
      <section className="card hero">
        <h2>Vinstchans</h2>
        <div className="prob"><strong>{a}<big>{(r.p*100).toFixed(1)}%</big></strong><strong>{b}<big>{((1-r.p)*100).toFixed(1)}%</big></strong></div>
        <Bar v={r.p}/><p className="note">Modellprognos före matchstart</p>
      </section>
      <section className="grid">
        <div className="card"><h2>Set 1</h2><div className="stat"><span>{a}</span><b>{(r.set*100).toFixed(1)}%</b></div><div className="stat"><span>{b}</span><b>{((1-r.set)*100).toFixed(1)}%</b></div><div className="stat"><span>Förväntade games</span><b>{r.games.toFixed(1)}</b></div></div>
        <div className="card"><h2>Matchresultat</h2>{r.scores.map(([score,p])=><div key={score} className="stat"><span>{score}</span><b>{(p*100).toFixed(1)}%</b></div>)}</div>
      </section>
      <section className="card"><h2>Varför säger modellen så?</h2>{why.map(([name,value])=><div key={name} className="stat"><span>{name}</span><b>{value===0?"0":(value>0?"+":"")+value.toFixed(1)} {value>0?a:value<0?b:""}</b></div>)}<div className="stat"><span>Model confidence</span><b>{confidence}</b></div><p className="disclaimer">Positivt värde gynnar {a}, negativt värde gynnar {b}. Confidence beskriver hur tydliga modellens signaler är – inte vinstchansen.</p></section><section className="card"><h2>Modellfaktorer</h2><div className="chips"><span>Elo</span><span>Surface Elo</span><span>Form</span><span>Serve</span><span>Return</span></div><p className="disclaimer">Prototypdata. Nästa steg är automatisk matchdata + historisk backtesting och kalibrering.</p></section>
    </main>
  );
}
createRoot(document.getElementById("root")).render(<App />);
