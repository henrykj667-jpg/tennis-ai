import React,{useMemo,useState} from'react';import{createRoot}from'react-dom/client';import'./style.css';

const players={
"Sinner":{elo:2160,surface:2190,form:8,serve:0.67,ret:0.43},
"Alcaraz":{elo:2180,surface:2170,form:9,serve:0.66,ret:0.44},
"Zverev":{elo:2020,surface:2035,form:7,serve:0.69,ret:0.39},
"Fritz":{elo:1980,surface:2010,form:6,serve:0.68,ret:0.38},
"De Minaur":{elo:1960,surface:1975,form:7,serve:0.63,ret:0.42},
"Hurkacz":{elo:1940,surface:1985,form:6,serve:0.71,ret:0.35},
"Paul":{elo:1930,surface:1940,form:6,serve:0.64,ret:0.40},
"Rublev":{elo:1950,surface:1960,form:5,serve:0.66,ret:0.39}
};
const logistic=x=>1/(1+Math.pow(10,-x/400));
function predict(a,b){let A=players[a],B=players[b];let d=.5*(A.elo-B.elo)+.3*(A.surface-B.surface)+220*((A.serve+A.ret)-(B.serve+B.ret))+7*(A.form-B.form);let p=logistic(d);let set=logistic(d*.78);let pa=p,pb=1-p;let scores=[["2–0",pa*set],["2–1",pa*(1-set)],["1–2",pb*(1-(1-set))],["0–2",pb*(1-set))];let total=scores.reduce((s,x)=>s+x[1],0);scores=scores.map(x=>[x[0],x[1]/total]);return{p,set,games:9.4+2*(1-Math.abs(set-.5)*2),scores};}
function Bar({v}){return <div className="bar"><i style={{width:(v*100)+"%"}}/></div>}
function App(){let names=Object.keys(players);let[a,setA]=useState("Hurkacz"),[b,setB]=useState("De Minaur");let r=useMemo(()=>predict(a,b),[a,b]);return <main><header><b>TENNIS<span>AI</span></b><small>PRE-MATCH MODEL • v0.1</small></header><section className="card"><label>Matchanalys</label><div className="pick"><select value={a} onChange={e=>setA(e.target.value)}>{names.filter(x=>x!==b).map(x=><option>{x}</option>)}</select><em>VS</em><select value={b} onChange={e=>setB(e.target.value)}>{names.filter(x=>x!==a).map(x=><option>{x}</option>)}</select></div></section><section className="card hero"><h2>Vinstchans</h2><div className="prob"><strong>{a}<big>{(r.p*100).toFixed(1)}%</big></strong><strong>{b}<big>{((1-r.p)*100).toFixed(1)}%</big></strong></div><Bar v={r.p}/><p className="note">Modellprognos före matchstart</p></section><section className="grid"><div className="card"><h2>Set 1</h2><div className="stat"><span>{a}</span><b>{(r.set*100).toFixed(1)}%</b></div><div className="stat"><span>{b}</span><b>{((1-r.set)*100).toFixed(1)}%</b></div><div className="stat"><span>Förväntade games</span><b>{r.games.toFixed(1)}</b></div></div><div className="card"><h2>Matchresultat</h2>{r.scores.map(([s,p])=><div className="stat"><span>{s}</span><b>{(p*100).toFixed(1)}%</b></div>)}</div></section><section className="card"><h2>Modellfaktorer</h2><div className="chips"><span>Elo</span><span>Surface Elo</span><span>Form</span><span>Serve</span><span>Return</span></div><p className="disclaimer">Prototypdata. Nästa steg är automatisk matchdata + historisk backtesting och kalibrering.</p></section></main>}

createRoot(document.getElementById('root')).render(<App/>);