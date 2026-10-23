"use client";

import { useEffect, useMemo, useState } from "react";

type Machine = { id: number; name: string; spec: string; status: string };
type Booking = { id: number; machineId: number; isMine?: boolean; userName: string; usageType: "GPU" | "CPU" | "DEVICE"; title: string; startAt: string; endAt: string; note?: string };

const fallbackMachines: Machine[] = [
  { id: 1, name: "750MHz EPR装置", spec: "EPR分光装置", status: "available" },
  { id: 2, name: "M3", spec: "実験装置", status: "available" },
  { id: 3, name: "X-band", spec: "X-band EPR装置", status: "available" },
  { id: 4, name: "1.5T-MRI", spec: "1.5テスラ MRI装置", status: "available" },
  { id: 5, name: "GPU-01", spec: "GPUサーバー · GPU 1枚", status: "available" },
];

const pad = (n: number) => String(n).padStart(2, "0");
const isoLocal = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
const dateKey = (d: Date) => isoLocal(d).slice(0, 10);
const today = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };
const mondayOf = (d: Date) => { const x = new Date(d); const day = x.getDay() || 7; x.setDate(x.getDate()-day+1); x.setHours(0,0,0,0); return x; };
const fmtDate = (d: Date) => new Intl.DateTimeFormat("ja-JP", { month:"long", day:"numeric", weekday:"short" }).format(d);
const usageLabel = (type: Booking["usageType"]) => type==="DEVICE" ? "装置利用" : type;
const apiErrorMessage = (code?: string) => ({
  conflict: "この時間帯には既に予約があります。",
  machine_unavailable: "この機器は現在予約を受け付けていません。",
  profile_required: "先に表示名を登録してください。",
  forbidden: "この操作を行う権限がありません。",
  invalid_booking: "入力内容を確認してください。予約は最長31日です。",
  invalid_usage_type: "利用区分を確認してください。",
}[code || ""] || "保存できませんでした。通信状態を確認して、もう一度お試しください。");

export default function Home() {
  const [screen, setScreen] = useState<"calendar"|"mine"|"machines">("calendar");
  const [currentName, setCurrentName] = useState("");
  const [profileGroup, setProfileGroup] = useState<"EPR"|"MRI">("EPR");
  const [profileCode, setProfileCode] = useState("");
  const [profileModal, setProfileModal] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [admin, setAdmin] = useState(true);
  const [view, setView] = useState<"day"|"week">("day");
  const [selectedDate, setSelectedDate] = useState(today);
  const [machines, setMachines] = useState(fallbackMachines);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Booking|null>(null);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [machineModal, setMachineModal] = useState(false);
  const [machineEditing, setMachineEditing] = useState<Machine|null>(null);
  const [machineForm, setMachineForm] = useState({name:"",spec:"",status:"available"});
  const [form, setForm] = useState(() => { const start=today(); start.setHours(9); const end=new Date(start); end.setHours(10); return { machineId: 1, title:"", usageType:"DEVICE" as "GPU"|"CPU"|"DEVICE", startAt:isoLocal(start), endAt:isoLocal(end), note:"" }; });

  useEffect(() => {
    fetch("/api/bookings").then(async r => r.ok ? r.json() : Promise.reject(await r.json().catch(()=>({})))).then(data => {
      if (data.machines?.length) setMachines(data.machines);
      if (data.bookings) setBookings(data.bookings);
      if (data.currentName) { const [group, code] = String(data.currentName).split("-"); setCurrentName(data.currentName); setProfileGroup(group==="MRI"?"MRI":"EPR"); setProfileCode(code||""); }
      else setProfileModal(true);
      setAdmin(!!data.isAdmin);
    }).catch(() => setLoadError("予約情報を読み込めませんでした。ページを再読み込みしてください。"));
  }, []);

  const weekStart = useMemo(() => mondayOf(selectedDate), [selectedDate]);
  const days = useMemo(() => Array.from({length:7},(_,i)=>addDays(weekStart,i)),[weekStart]);
  const hours = Array.from({length:14},(_,i)=>i+7);
  const openNew = (machineId=1, hour=9, day=selectedDate) => {
    const start = new Date(day); start.setHours(hour,0,0,0); const end = new Date(start); end.setHours(hour+1);
    const isGpu = machines.find(m=>m.id===machineId)?.name==="GPU-01";
    setEditing(null); setError(""); setForm({machineId,title:"",usageType:isGpu?"GPU":"DEVICE",startAt:isoLocal(start),endAt:isoLocal(end),note:""}); setModal(true);
  };
  const openEdit = (b: Booking) => { if(!admin&&!b.isMine)return; setEditing(b); setError(""); setForm({machineId:b.machineId,title:b.title,usageType:b.usageType,startAt:b.startAt.slice(0,16),endAt:b.endAt.slice(0,16),note:b.note||""}); setModal(true); };
  const save = async () => {
    if (!form.title.trim() || new Date(form.endAt) <= new Date(form.startAt)) return setError("用途と正しい終了日時を入力してください。");
    const overlap = bookings.some(b => b.machineId===form.machineId && b.id!==editing?.id && new Date(form.startAt)<new Date(b.endAt) && new Date(form.endAt)>new Date(b.startAt));
    if (overlap) return setError("この時間帯には既に予約があります。");
    const payload = {...form};
    try {
      const res = await fetch(editing ? `/api/bookings/${editing.id}` : "/api/bookings", {method: editing?"PUT":"POST", headers:{"content-type":"application/json"}, body:JSON.stringify(payload)});
      const data = await res.json().catch(()=>({}));
      if (!res.ok) return setError(apiErrorMessage(data.error));
      const saved = data as Booking;
      setBookings(x => editing ? x.map(b=>b.id===editing.id?saved:b) : [...x,saved]);
    } catch { return setError(apiErrorMessage()); }
    setModal(false);
  };
  const remove = async () => { if(!editing) return; setError(""); try{const r=await fetch(`/api/bookings/${editing.id}`,{method:"DELETE"});if(!r.ok){const data=await r.json().catch(()=>({}));return setError(apiErrorMessage(data.error))}setBookings(x=>x.filter(b=>b.id!==editing.id));setModal(false)}catch{return setError(apiErrorMessage())} };
  const openMachine = (m?:Machine) => { setMachineEditing(m||null); setMachineForm(m?{name:m.name,spec:m.spec,status:m.status}:{name:"",spec:"",status:"available"}); setMachineModal(true); };
  const saveMachine = async () => { if(!machineForm.name.trim()) return; setError(""); try{const r=await fetch(machineEditing?`/api/machines/${machineEditing.id}`:"/api/machines",{method:machineEditing?"PUT":"POST",headers:{"content-type":"application/json"},body:JSON.stringify(machineForm)});const data=await r.json().catch(()=>({}));if(!r.ok)return setError(apiErrorMessage(data.error));const saved=data as Machine;setMachines(x=>machineEditing?x.map(m=>m.id===machineEditing.id?saved:m):[...x,saved]);setMachineModal(false)}catch{return setError(apiErrorMessage())} };
  const openProfile = () => { const [group,code] = currentName.split("-"); setProfileGroup(group==="MRI"?"MRI":"EPR"); setProfileCode(code||""); setProfileError(""); setProfileModal(true); };
  const saveProfile = async () => { const code=profileCode.trim().toLowerCase(); if(!/^[a-z0-9]{2,8}$/.test(code))return setProfileError("識別子は半角英数字2〜8文字で入力してください。"); const displayName=`${profileGroup}-${code}`; setProfileError(""); try{const r=await fetch("/api/profile",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({displayName})});if(!r.ok)throw new Error();const data=await r.json();setCurrentName(data.displayName);setProfileModal(false)}catch{setProfileError("保存できませんでした。もう一度お試しください。")} };

  return <main className="app-shell">
    <header className="topbar">
      <div><div className="brand-mark">LT</div><div><h1>LabTime</h1><p>マシンタイム予約</p></div></div>
      <nav><button className={screen==="calendar"?"nav-active":""} onClick={()=>setScreen("calendar")}>予約カレンダー</button><button className={screen==="mine"?"nav-active":""} onClick={()=>setScreen("mine")}>自分の予約</button>{admin&&<button className={screen==="machines"?"nav-active":""} onClick={()=>setScreen("machines")}>機器管理</button>}</nav>
      <button className="user" style={{border:0,background:"none",cursor:"pointer"}} onClick={openProfile} aria-label="表示名を変更"><span>{currentName||"表示名未登録"}</span><small>ログイン中</small><div className="avatar">{(currentName||"未").slice(0,1)}</div></button>
      <a href="/cdn-cgi/access/logout" style={{color:"#68778a",fontSize:12,textDecoration:"none",padding:"8px 10px",border:"1px solid #d8e0e8",borderRadius:6}}>ログアウト</a>
    </header>
    {loadError&&<div className="app-error" role="alert">{loadError}</div>}
    {screen==="calendar"&&<><section className="toolbar">
      <div className="view-switch"><button className={view==="day"?"active":""} onClick={()=>setView("day")}>日</button><button className={view==="week"?"active":""} onClick={()=>setView("week")}>週</button></div>
      <div className="date-nav"><button onClick={()=>setSelectedDate(addDays(selectedDate,view==="day"?-1:-7))}>‹</button><button className="today" onClick={()=>setSelectedDate(today())}>今日</button><button onClick={()=>setSelectedDate(addDays(selectedDate,view==="day"?1:7))}>›</button><strong>{view==="day"?fmtDate(selectedDate):`${fmtDate(weekStart)} — ${fmtDate(addDays(weekStart,6))}`}</strong></div>
      <div className="legend"><span><i className="dot device"/>装置利用</span><span><i className="dot gpu"/>GPU</span><span><i className="dot cpu"/>CPUのみ</span><span><i className="dot maintenance"/>メンテナンス</span></div>
      <button className="primary" onClick={()=>openNew()}>＋ 新しい予約</button>
    </section>
    <div className="notice"><strong>運用メモ：</strong>終了が早まった場合は予約を短縮してください。細かな調整は各自で相談してください。</div>

    {view==="day" ? <section className="day-grid" style={{gridTemplateColumns:`90px repeat(${machines.length}, minmax(190px,1fr))`}}>
      <div className="corner">時刻<br/><small>JST</small></div>
      {machines.map(m=><div className="machine-head" key={m.id}><div><strong>{m.name}</strong><span className={`status ${m.status}`}/></div><small>{m.spec}</small></div>)}
      {hours.map(h=><div className="grid-row" style={{display:"contents"}} key={h}>
        <div className="time-cell">{pad(h)}:00</div>
        {machines.map(m=>{ const slotStart=new Date(selectedDate);slotStart.setHours(h,0,0,0); const slotEnd=new Date(slotStart);slotEnd.setHours(h+1); const found=bookings.find(b=>b.machineId===m.id && new Date(b.startAt)<slotEnd && new Date(b.endAt)>slotStart); const dayStart=new Date(selectedDate);dayStart.setHours(7,0,0,0);const dayEnd=new Date(selectedDate);dayEnd.setHours(21,0,0,0);const visibleStart=found?new Date(Math.max(new Date(found.startAt).getTime(),dayStart.getTime())):null;const visibleEnd=found?new Date(Math.min(new Date(found.endAt).getTime(),dayEnd.getTime())):null;const begins=!!found&&!!visibleStart&&visibleStart>=slotStart&&visibleStart<slotEnd;const height=visibleStart&&visibleEnd?Math.max(62,((visibleEnd.getTime()-visibleStart.getTime())/3600000)*72-10):62;
          return <button className="slot" key={m.id} onClick={()=>found?openEdit(found):openNew(m.id,h)}>{begins&&<div className={`booking ${found.usageType.toLowerCase()}`} style={{height}}><strong>{found.title}</strong><span>{found.userName} · {usageLabel(found.usageType)}</span><small>{found.startAt.slice(11,16)}–{found.endAt.slice(0,10)===found.startAt.slice(0,10)?found.endAt.slice(11,16):"翌日以降"}</small></div>}</button>})}
      </div>)}
    </section> : <section className="week-grid" style={{gridTemplateColumns:"190px repeat(7,minmax(135px,1fr))"}}>
      <div className="week-corner">マシン</div>{days.map(d=><button className={`day-head ${dateKey(d)===dateKey(selectedDate)?"selected":""}`} onClick={()=>{setSelectedDate(d);setView("day")}} key={dateKey(d)}><strong>{d.getDate()}</strong><span>{new Intl.DateTimeFormat("ja-JP",{weekday:"short"}).format(d)}</span></button>)}
      {machines.map(m=><div className="week-row" style={{display:"contents"}} key={m.id}><div className="week-machine"><strong>{m.name}</strong><small>{m.spec}</small></div>{days.map(d=>{const list=bookings.filter(b=>b.machineId===m.id && b.startAt.slice(0,10)<=dateKey(d) && b.endAt.slice(0,10)>=dateKey(d));return <button className="week-day" key={dateKey(d)} onClick={()=>list[0]?openEdit(list[0]):openNew(m.id,9,d)}>{list.map(b=><div className={`week-booking ${b.usageType.toLowerCase()}`} key={b.id}><strong>{b.title}</strong><small>{usageLabel(b.usageType)} · {b.userName}</small></div>)}</button>})}</div>)}
    </section>}</>}

    {screen==="mine"&&<section className="content-page"><div className="page-heading"><div><p>MY BOOKINGS</p><h2>自分の予約</h2><span>これからの予約を変更・キャンセルできます。</span></div><button className="primary" onClick={()=>{setScreen("calendar");openNew()}}>＋ 新しい予約</button></div><div className="booking-list">{bookings.filter(b=>b.isMine).length===0?<div className="empty"><strong>予約はまだありません</strong><span>カレンダーから空いている時間を選んでください。</span></div>:bookings.filter(b=>b.isMine).map(b=><button className="booking-row" key={b.id} onClick={()=>openEdit(b)}><div className={`type-badge ${b.usageType.toLowerCase()}`}>{usageLabel(b.usageType)}</div><div><strong>{b.title}</strong><span>{machines.find(m=>m.id===b.machineId)?.name}</span></div><div className="booking-date"><strong>{b.startAt.replace("T"," ")}</strong><span>〜 {b.endAt.replace("T"," ")}</span></div><span className="chevron">›</span></button>)}</div></section>}
    {screen==="machines"&&<section className="content-page"><div className="page-heading"><div><p>ADMIN</p><h2>機器管理</h2><span>装置情報と予約受付状態を管理します。</span></div><button className="primary" onClick={()=>openMachine()}>＋ 機器を追加</button></div><div className="machine-list">{machines.map(m=><button className="machine-row" key={m.id} onClick={()=>openMachine(m)}><span className={`machine-icon ${m.status}`}>{m.name.slice(0,2)}</span><div><strong>{m.name}</strong><span>{m.spec}</span></div><span className={`state-pill ${m.status}`}>{m.status==="available"?"予約受付中":"利用停止中"}</span><span className="chevron">›</span></button>)}</div><div className="admin-note"><strong>管理者のみ</strong><span>機器の追加・編集・利用停止は管理者権限が必要です。</span></div></section>}

    {modal&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(false)}}><section className="modal"><div className="modal-title"><div><p>{editing?"予約を変更":"新しい予約"}</p><h2>{machines.find(m=>m.id===form.machineId)?.name}</h2></div><button onClick={()=>setModal(false)}>×</button></div>
      <label>マシン<select value={form.machineId} onChange={e=>{const id=Number(e.target.value);setForm({...form,machineId:id,usageType:machines.find(m=>m.id===id)?.name==="GPU-01"?"GPU":"DEVICE"})}}>{machines.map(m=><option value={m.id} key={m.id}>{m.name} — {m.spec}</option>)}</select></label>
      <div className="two"><label>開始<input type="datetime-local" step="3600" value={form.startAt} onChange={e=>setForm({...form,startAt:e.target.value})}/></label><label>終了<input type="datetime-local" step="3600" value={form.endAt} onChange={e=>setForm({...form,endAt:e.target.value})}/></label></div>
      {machines.find(m=>m.id===form.machineId)?.name==="GPU-01"&&<label>利用区分<div className="radio-row"><button className={form.usageType==="GPU"?"chosen":""} onClick={()=>setForm({...form,usageType:"GPU"})}>GPUを使用</button><button className={form.usageType==="CPU"?"chosen":""} onClick={()=>setForm({...form,usageType:"CPU"})}>CPUのみ</button></div></label>}
      <label>用途<input placeholder="例：画像分類モデルの学習" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
      <label>備考（任意）<textarea placeholder="必要メモリ、長時間ジョブなど" value={form.note} onChange={e=>setForm({...form,note:e.target.value})}/></label>
      {error&&<p className="error">{error}</p>}<div className="modal-actions">{editing&&<button className="danger" onClick={remove}>予約を削除</button>}<span/><button onClick={()=>setModal(false)}>キャンセル</button><button className="primary" onClick={save}>{editing?"変更を保存":"予約を確定"}</button></div>
    </section></div>}
    {machineModal&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setMachineModal(false)}}><section className="modal"><div className="modal-title"><div><p>機器管理</p><h2>{machineEditing?"機器を編集":"機器を追加"}</h2></div><button onClick={()=>setMachineModal(false)}>×</button></div><label>表示名<input value={machineForm.name} onChange={e=>setMachineForm({...machineForm,name:e.target.value})} placeholder="例：750MHz EPR装置"/></label><label>スペック・説明<input value={machineForm.spec} onChange={e=>setMachineForm({...machineForm,spec:e.target.value})} placeholder="例：EPR分光装置"/></label><label>予約受付状態<select value={machineForm.status} onChange={e=>setMachineForm({...machineForm,status:e.target.value})}><option value="available">予約受付中</option><option value="maintenance">利用停止・メンテナンス</option></select></label>{error&&<p className="error">{error}</p>}<div className="modal-actions"><span/><button onClick={()=>setMachineModal(false)}>キャンセル</button><button className="primary" onClick={saveMachine}>保存</button></div></section></div>}
    {profileModal&&<div className="modal-backdrop"><section className="modal profile-modal"><div className="modal-title"><div><p>{currentName?"プロフィール":"初回設定"}</p><h2>{currentName?"表示名を変更":"表示名を登録してください"}</h2></div>{currentName&&<button onClick={()=>setProfileModal(false)}>×</button>}</div><p className="profile-copy">本名ではなく、研究室内で本人を識別できる表示名を登録します。メールアドレスは認証と匿名IDの生成にだけ使い、予約データベースには保存しません。</p><label>所属区分<select value={profileGroup} onChange={e=>setProfileGroup(e.target.value as "EPR"|"MRI")}><option value="EPR">EPR</option><option value="MRI">MRI</option></select></label><label>識別子<input autoFocus maxLength={8} value={profileCode} onChange={e=>setProfileCode(e.target.value.toLowerCase().replace(/[^a-z0-9]/g,""))} onKeyDown={e=>{if(e.key==="Enter")saveProfile()}} placeholder="半角英数字2〜8文字"/></label><p className="profile-copy">表示名：<strong>{profileGroup}-{profileCode||"xx"}</strong>（予約者間で共有されます）</p>{profileError&&<p className="error">{profileError}</p>}<div className="modal-actions"><span/>{currentName&&<button onClick={()=>setProfileModal(false)}>キャンセル</button>}<button className="primary" onClick={saveProfile}>{currentName?"変更を保存":"登録して始める"}</button></div></section></div>}
  </main>;
}
