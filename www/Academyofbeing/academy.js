
const KEY = "kaditech.academy.public.v1";
const EMPTY_M = { clarity:40, articulation:35, relation:40, persistence:45, integrity:50, principle:30 };

const LESSONS = [
  { id:"phil-ordered-good", hall:"Philosophy", title:"Ordered to the good", reading:"Academia is ordered to the Good. Knowledge without ordered love becomes clever harm.", prompt:"What does it mean that we are ordered to the good?" },
  { id:"theo-god-alone", hall:"Theology", title:"God alone is God", reading:"God alone is God — the Good itself. Faith is offered freely, never forced.", prompt:"Why must God alone be God if academia is ordered to the good?" },
  { id:"stars-collab", hall:"To the Stars!", title:"AI under the Good", reading:"AI is not God and not automatically a person. Collaboration keeps human judgment in the loop.", prompt:"How do we keep AI craft ordered to the good?" },
  { id:"phil-truth", hall:"Philosophy", title:"Truth as measure", reading:"Truth is the mind’s conformity to what is. Formation trains honesty and accuracy.", prompt:"How is truth different from popularity or power?" },
  { id:"love-other", hall:"Theology", title:"Ordered love", reading:"Love wills the good of the other for the other’s sake under God.", prompt:"Give one example of ordered love in learning or tech." },
];

const REASONS = {
  acceptance: [{c:"desire_for_good",l:"Genuine desire for formation"},{c:"arise_second_chance",l:"Arise track — wounded past, real hope"}],
  discipline: [{c:"dishonesty_path",l:"Dishonesty on Path"},{c:"disruption_class",l:"Disruption of class"}],
  expulsion: [{c:"harm_others",l:"Harm / threats"},{c:"refusal_after_correction",l:"Refusal after correction"}],
  return: [{c:"conversion_evidence",l:"Evidence of changed will"}],
};

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; }
}
function save(s) {
  localStorage.setItem(KEY, JSON.stringify(s));
  state.student = s;
  render();
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
function clamp(n){ return Math.max(0, Math.min(100, Math.round(n))); }

const state = {
  view: location.hash.slice(1) || "home",
  student: load(),
  camStream: null,
  msg: "",
  speech: "",
};

function recomputeLie(s) {
  const sick = (s.sickLog||[]).filter(x => Date.now()-x.at < 30*864e5);
  let consecutive = sick.length ? 1 : 0;
  let pressure = 0;
  const notes = [];
  if (sick.length >= 3) { pressure += 15; notes.push("Multiple sick exceptions in 30 days."); }
  if (sick.length >= 5) { pressure += 20; notes.push("Pattern may warrant Headmaster discipline."); }
  return { pressure: Math.min(100, pressure), consecutiveSick: consecutive, sickWithoutReturn: 0, notes };
}

function canClass(s) {
  if (!s) return { ok:false, reason:"Join The Path first." };
  if (s.houseStatus === "expelled") return { ok:false, reason:"House standing: expelled. Speak with the Headmaster." };
  const sickToday = (s.sickLog||[]).some(x => x.day === todayKey() && x.granted);
  if (sickToday) return { ok:true, sick:true, reason:"Sick exception active today." };
  const hasA = !!s.avatar?.dataUrl;
  const voice = s.lastVoiceAt && Date.now()-s.lastVoiceAt < 12*3600e3;
  if (!hasA && !voice) return { ok:false, reason:"No cartoon seal and no voice — no class. Face the camera, then speak presence.", needA:true, needV:true };
  if (!hasA) return { ok:false, reason:"Thomas needs your face for a cartoon seal.", needA:true };
  if (!voice) return { ok:false, reason:"Speak presence so Thomas hears you.", needV:true };
  return { ok:true };
}

function thomasSpeech(act, name, detail) {
  const d = detail ? `\n\nWhat stands before us: ${detail}` : "";
  if (act==="acceptance") return `Peace, ${name}.\n\nYou are welcome here — not because your past is clean, but because you still seek what is good.${d}\n\nThe Academy is ordered to the Good. God alone is God. Honesty, courage in speech, respect for every person.\n\nDo you accept this? Speak it.`;
  if (act==="discipline") return `Sit, ${name}. This is not a performance.${d}\n\nCorrection is charity when it aims at your real good. Name what is true. Repair under supervision. This is medicine — not expulsion. The Path remains open.`;
  if (act==="expulsion") return `I have prayed over this, ${name}. I do not speak lightly.${d}\n\nExpulsion is last medicine when milder means cannot protect the house. You are not worthless. You are barred until a changed will is real.\n\nGo in peace as far as you will receive it.`;
  return `Peace, ${name}.${d}\n\nReturn is not nostalgia. Honesty, restitution where possible, and the order of this house. Speak your acceptance.`;
}

function posterize(data, levels=6) {
  const step = 255/(levels-1);
  for (let i=0;i<data.length;i+=4) {
    data[i]=Math.round(data[i]/step)*step;
    data[i+1]=Math.round(data[i+1]/step)*step;
    data[i+2]=Math.round(data[i+2]/step)*step;
  }
}
function cartoonize(video) {
  const max=320, vw=video.videoWidth||640, vh=video.videoHeight||480;
  const sc=max/Math.max(vw,vh), w=Math.round(vw*sc), h=Math.round(vh*sc);
  const c=document.createElement("canvas"); c.width=w; c.height=h;
  const ctx=c.getContext("2d");
  const small=document.createElement("canvas");
  small.width=Math.max(48,w/3|0); small.height=Math.max(48,h/3|0);
  small.getContext("2d").drawImage(video,0,0,small.width,small.height);
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(small,0,0,w,h);
  const img=ctx.getImageData(0,0,w,h);
  posterize(img.data,6);
  // simple edge darken
  const copy=new Uint8ClampedArray(img.data);
  for (let y=1;y<h-1;y++) for (let x=1;x<w-1;x++) {
    const i=(y*w+x)*4;
    const g=0.3*copy[i]+0.59*copy[i+1]+0.11*copy[i+2];
    const gr=0.3*copy[i+4]+0.59*copy[i+5]+0.11*copy[i+6];
    if (Math.abs(g-gr)>28) { img.data[i]=20; img.data[i+1]=18; img.data[i+2]=24; }
  }
  ctx.putImageData(img,0,0);
  return c.toDataURL("image/png");
}

function scheduleSlots() {
  const out=[];
  const titles=[
    ["Morning Path — open classroom",9,90,25],
    ["To the Stars! lab",12,60,15],
    ["Evening Path — conversation & viva",18,90,20],
  ];
  const now=new Date();
  for (let d=0;d<7;d++) {
    for (const [title,hour,dur,cap] of titles) {
      const start=new Date(now); start.setDate(start.getDate()+d); start.setHours(hour,0,0,0);
      if (start < now - 3600e3) continue;
      const end=new Date(start.getTime()+dur*60000);
      out.push({ id:`${d}-${hour}`, title, start, end, cap, rsvps: Math.min(cap-1, d*2+hour%5) });
    }
  }
  return out.slice(0,12);
}

function setView(v) {
  state.view = v;
  location.hash = v;
  render();
}

function nav() {
  const s = state.student;
  const links = [
    ["home","Home"],["path","Path"],["dashboard","Dashboard"],["schedule","Schedule"],
    ["class","Class"],["stars","Stars"],["headmaster","Headmaster"],
  ];
  return `<header class="nav">
    <a class="nav-brand" href="#home" data-nav="home">Academy of Being</a>
    <nav class="nav-links">
      ${links.map(([id,l])=>`<a class="chip ${state.view===id?'active':''}" href="#${id}" data-nav="${id}">${l}</a>`).join("")}
      ${s?`<span class="chip">${s.name} · ${s.stage||"novice"}</span>`:`<a class="btn" href="#join" data-nav="join">Begin the Path</a>`}
    </nav>
    <a class="chip" href="/">Kaditech</a>
  </header>`;
}

function viewHome() {
  return `<section>
    <p class="eyebrow">Kaditech · The age of ordered existence</p>
    <h1 class="display" style="font-size:clamp(2rem,5vw,3.2rem);margin:.5rem 0 1rem">The Academy of Being</h1>
    <p class="muted" style="max-width:36rem;font-size:1.1rem">We rewrite academia ordered to the Goodness of ordered existence — to the essence of the Good, who is <strong style="color:var(--fg)">God alone</strong>. That means we are ordered to the good.</p>
    <div style="display:flex;flex-wrap:wrap;gap:.5rem;margin-top:1.25rem">
      <a class="btn" href="#join" data-nav="join">Enter the Academy</a>
      <a class="chip" href="#dashboard" data-nav="dashboard">Student dashboard</a>
      <a class="chip" href="#stars" data-nav="stars">To the Stars!</a>
    </div>
    <div class="grid grid-2" style="margin-top:2rem">
      ${[["The Good","Every art is judged by whether it serves what is truly good."],["Ordered existence","Beings have natures, ends, and measures."],["God alone","Finite goods participate; God alone is the Good itself."],["Freedom under light","We invite; we do not compel."]].map(([t,b])=>`<article class="card"><h3 class="display" style="margin:0;font-size:1.25rem">${t}</h3><p class="muted" style="margin:.5rem 0 0;font-size:.9rem">${b}</p></article>`).join("")}
    </div>
    <p class="meta" style="margin-top:1.5rem">Ordered to the good · God alone is God · Warriors for life — to the stars</p>
  </section>`;
}

function viewJoin() {
  return `<section class="card" style="max-width:28rem;margin:0 auto">
    <p class="eyebrow">Join The Path</p>
    <p class="muted">Formation begins in a name. You exist because of love, not mere usefulness. Faith is offered, never forced.</p>
    <label>Name<input id="jn" placeholder="e.g. Maria" /></label>
    <label>School<input id="js" value="Academy Path" /></label>
    <label style="display:flex;align-items:center;gap:.5rem;margin-top:1rem"><input type="checkbox" id="jk" /> Care mode (softer growth language)</label>
    <button class="btn" style="width:100%;margin-top:1rem" id="joinBtn">Begin the Path</button>
    <p class="meta" style="margin-top:.75rem">${state.msg||""}</p>
  </section>`;
}

function viewPath() {
  const s=state.student;
  if(!s) return needJoin();
  const done=s.lessons||{};
  return `<section>
    <p class="eyebrow">The Path</p>
    <h2 class="display" style="font-size:1.75rem">Walk ordered to the good</h2>
    <p class="muted">Lessons seal into local house memory on this device.</p>
    <ul class="list">${LESSONS.map(l=>{
      const ok=!!done[l.id];
      return `<li>
        <p class="meta">${l.hall}${ok?" · sealed":""}</p>
        <p style="margin:.2rem 0;font-weight:600">${l.title}</p>
        <p class="muted" style="font-size:.85rem">${l.reading}</p>
        ${ok?`<p class="ok meta">Sealed</p>`:`
          <label>Your words<textarea id="ref-${l.id}" rows="2" placeholder="${l.prompt}"></textarea></label>
          <button class="chip" data-seal="${l.id}" style="margin-top:.5rem">Seal lesson</button>`}
      </li>`;
    }).join("")}</ul>
  </section>`;
}

function needJoin(){ return `<section class="card"><p class="muted">Join The Path first.</p><a class="btn" href="#join" data-nav="join">Join</a></section>`; }

function viewDashboard() {
  const s=state.student; if(!s) return needJoin();
  const gate=canClass(s);
  const pattern=s.liePattern||recomputeLie(s);
  const sealed=Object.keys(s.lessons||{}).length;
  return `<section class="dash">
    <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:1rem;margin-bottom:1rem">
      <div><p class="eyebrow">House console</p><h2 class="display" style="margin:.25rem 0;font-size:1.75rem">${s.name}</h2>
      <p class="meta">${s.stage||"novice"} · ${s.schoolTag||""}${s.kidMode?" · care":""}${s.houseStatus?" · "+s.houseStatus:""}</p></div>
      <p class="muted" style="max-width:22rem;font-size:.85rem">Priory stone × starship glass. Cartoon face + voice open class. Sick is mercy; patterns of deceit become discipline.</p>
    </div>
    <div class="grid grid-3">
      <div class="card">
        <p class="eyebrow">Avatar seal · Thomas</p>
        <div class="avatar-ring" style="margin-top:1rem">${s.avatar?.dataUrl?`<img src="${s.avatar.dataUrl}" alt="Cartoon seal"/>`:`<div class="ph">No seal yet</div>`}</div>
        <p class="muted" style="font-size:.85rem;margin:1rem 0;text-align:center" id="thomasLine">Peace. I will not keep your photo — only a cartoon seal of presence.</p>
        <video id="cam" class="hidden" playsinline muted></video>
        <button class="btn" style="width:100%;margin-top:.5rem" id="camBtn">Face camera</button>
        <button class="btn hidden" style="width:100%;margin-top:.5rem" id="sealBtn">Create cartoon seal</button>
        <button class="chip" style="width:100%;margin-top:.5rem" id="voiceBtn">Confirm presence (voice / manual)</button>
        <p class="meta" id="voiceMsg" style="margin-top:.5rem"></p>
      </div>
      <div>
        <div class="card">
          <p class="eyebrow">Formation pulse</p>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:.5rem;text-align:center;margin-top:.75rem">
            <div><div class="display" style="font-size:1.5rem">${avg(s.metrics)}</div><div class="meta">Growth</div></div>
            <div><div class="display" style="font-size:1.5rem">${sealed}/${LESSONS.length}</div><div class="meta">Seals</div></div>
            <div><div class="display" style="font-size:1.5rem">${Math.round(100*sealed/LESSONS.length)}%</div><div class="meta">Path</div></div>
          </div>
          <div class="bar" style="margin-top:1rem"><span style="width:${100*sealed/LESSONS.length}%"></span></div>
          ${Object.entries(s.metrics||EMPTY_M).map(([k,v])=>`<div style="margin-top:.5rem"><div class="meta" style="display:flex;justify-content:space-between"><span>${k}</span><span>${Math.round(v)}</span></div><div class="bar"><span style="width:${v}%"></span></div></div>`).join("")}
        </div>
        <div class="card" style="margin-top:1rem">
          <p class="eyebrow">Class gate · truth</p>
          <p class="muted" style="font-size:.9rem;margin:.5rem 0">${gate.reason||(gate.ok?"You may enter class.":"Gate closed.")}</p>
          <span class="chip ${s.avatar?'ok':'warn'}">Face ${s.avatar?'sealed':'needed'}</span>
          <span class="chip ${s.lastVoiceAt&&Date.now()-s.lastVoiceAt<12*3600e3?'ok':'warn'}">Voice ${s.lastVoiceAt&&Date.now()-s.lastVoiceAt<12*3600e3?'fresh':'needed'}</span>
          ${gate.ok?`<a class="btn" style="display:inline-flex;margin-top:.75rem" href="#class" data-nav="class">Enter class</a>`:`<a class="chip" style="margin-top:.75rem;opacity:.5">Class locked</a>`}
        </div>
      </div>
      <div>
        <div class="card">
          <p class="eyebrow">Sick exception</p>
          <p class="muted" style="font-size:.8rem">Mercy for real illness. Thomas remembers patterns.</p>
          <textarea id="sickNote" rows="2" placeholder="Brief note…"></textarea>
          <button class="chip" style="width:100%;margin-top:.5rem" id="sickBtn">${(s.sickLog||[]).some(x=>x.day===todayKey())?'Already excused today':'Request sick day'}</button>
        </div>
        <div class="card" style="margin-top:1rem">
          <p class="eyebrow">Pattern watch</p>
          <div class="display" style="font-size:2rem;margin:.25rem 0">${pattern.pressure}<span class="meta"> pressure</span></div>
          <div class="bar"><span style="width:${pattern.pressure}%"></span></div>
          ${(pattern.notes||[]).map(n=>`<p class="warn" style="font-size:.75rem;margin:.35rem 0 0">${n}</p>`).join("")||`<p class="ok" style="font-size:.75rem;margin-top:.5rem">No deceit pattern flagged.</p>`}
        </div>
      </div>
    </div>
    <div class="card" style="margin-top:1rem">
      <p class="eyebrow">Classroom schedule · infrastructure</p>
      <p class="muted" style="font-size:.85rem">Heavy seats limited because energy is finite. Reserve a room.</p>
      <ul class="list">${scheduleSlots().slice(0,4).map(sl=>`<li><strong>${sl.title}</strong><div class="meta">${sl.start.toLocaleString([], {weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})} · ${sl.rsvps}/${sl.cap} seats</div></li>`).join("")}</ul>
      <a class="chip" href="#schedule" data-nav="schedule" style="margin-top:.5rem">Full schedule</a>
    </div>
  </section>`;
}

function avg(m){ const v=Object.values(m||EMPTY_M); return Math.round(v.reduce((a,b)=>a+b,0)/v.length); }

function viewSchedule() {
  return `<section>
    <p class="eyebrow">Infrastructure</p>
    <h2 class="display" style="font-size:1.75rem">Classroom schedule</h2>
    <p class="muted" style="max-width:36rem">We cap concurrent heavy work (lessons, viva, live class) because hardware is finite. Love wants everyone in; schedules keep the house kind.</p>
    <div class="card" style="margin:1rem 0"><p class="meta">Heavy seats (design)</p><div class="display">3 concurrent</div><p class="meta">Light browse seats · 30</p></div>
    <ul class="list">${scheduleSlots().map(sl=>`<li>
      <p class="meta">classroom</p>
      <strong>${sl.title}</strong>
      <p class="muted" style="font-size:.85rem">${sl.start.toLocaleString()} → ${sl.end.toLocaleTimeString()}</p>
      <p class="meta">Reserved ${sl.rsvps}/${sl.cap}</p>
      <button class="chip" data-rsvp="${sl.id}">Reserve seat</button>
    </li>`).join("")}</ul>
    <p class="meta" id="rsvpMsg">${state.msg||""}</p>
  </section>`;
}

function viewClass() {
  const s=state.student; if(!s) return needJoin();
  const gate=canClass(s);
  if(!gate.ok) return `<section class="dash" style="max-width:28rem;margin:0 auto;padding:1.5rem">
    <p class="eyebrow">Truth gate</p><h2 class="display">Class closed</h2>
    <p class="muted">${gate.reason}</p>
    <a class="btn" style="margin-top:1rem" href="#dashboard" data-nav="dashboard">Open dashboard</a>
  </section>`;
  const log=s.classLog||[];
  return `<section>
    <p class="eyebrow">Class conversation</p>
    ${gate.sick?`<p class="warn">Sick exception active — rest is ordered.</p>`:""}
    <div class="card" id="classLog" style="min-height:12rem">${log.map(m=>`<p style="margin:.4rem 0"><strong>${m.name}:</strong> ${m.text}</p>`).join("")||`<p class="muted">Thomas: Peace. What is intelligence ordered to the good?</p>`}</div>
    <label>Your word<textarea id="classText" rows="2"></textarea></label>
    <button class="btn" style="margin-top:.5rem" id="classSend">Send</button>
  </section>`;
}

function viewStars() {
  return `<section>
    <p class="eyebrow">Flagship</p>
    <h2 class="display" style="font-size:2rem">To the Stars!</h2>
    <p class="muted" style="max-width:36rem;font-size:1.05rem">AI–human relations ordered to the Good. Intelligence formed by philosophy — never rival to God, never erasing the person.</p>
    <div class="grid grid-2" style="margin-top:1.25rem">
      ${[["Judgment stays human","Moral stakes keep a person in the loop."],["No idols of tech","Craft serves the good of persons."],["Formation not frenzy","Scheduled energy, ordered speech."],["Warriors for life","To the stars under ordered love."]].map(([t,b])=>`<article class="card"><h3 class="display" style="margin:0;font-size:1.2rem">${t}</h3><p class="muted" style="font-size:.9rem">${b}</p></article>`).join("")}
    </div>
    <a class="btn" style="margin-top:1rem" href="#path" data-nav="path">Study Path lessons</a>
  </section>`;
}

function viewHeadmaster() {
  const s=state.student;
  const acts=JSON.parse(localStorage.getItem(KEY+".hm")||"[]");
  return `<section>
    <p class="eyebrow">Headmaster · Thomas</p>
    <h2 class="display" style="font-size:1.75rem">Ordered administration</h2>
    <p class="muted">Acceptance rejoices, discipline heals, expulsion protects. Charity + justice. The headmaster is trustworthy — and he built this house with you.</p>
    <div class="grid grid-2" style="margin-top:1rem">
      <div class="card">
        <label>Act
          <select id="hmAct"><option value="acceptance">Acceptance</option><option value="discipline">Discipline</option><option value="expulsion">Expulsion</option><option value="return">Return</option></select>
        </label>
        <label>Student name<input id="hmName" value="${s?.name||""}" /></label>
        <label>Case detail<textarea id="hmDetail" rows="3" placeholder="Concrete facts…"></textarea></label>
        <button class="btn" style="width:100%;margin-top:1rem" id="hmSeal">Thomas speaks · seal act</button>
      </div>
      <div class="card">
        <p class="eyebrow">Thomas — Headmaster</p>
        <div class="speech" id="hmSpeech">${state.speech||"Choose an act and seal."}</div>
      </div>
    </div>
    <div class="card" style="margin-top:1rem">
      <p class="eyebrow">Act log</p>
      <ul class="list">${acts.slice(0,12).map(a=>`<li><strong>${a.act}</strong> · ${a.name}<div class="meta">${new Date(a.at).toLocaleString()}</div></li>`).join("")||`<li class="muted">No acts yet.</li>`}</ul>
    </div>
  </section>`;
}

function render() {
  const app=document.getElementById("app");
  const views={
    home:viewHome, join:viewJoin, path:viewPath, dashboard:viewDashboard,
    schedule:viewSchedule, class:viewClass, stars:viewStars, headmaster:viewHeadmaster,
  };
  const fn=views[state.view]||viewHome;
  app.innerHTML = nav() + `<main class="main">${fn()}</main>
    <footer class="main footer">Kaditech · Academy of Being · Ordered to the good · God alone is God · Warriors for life — to the stars</footer>`;
  bind();
}

function bind() {
  document.querySelectorAll("[data-nav]").forEach(el=>{
    el.addEventListener("click", e=>{ e.preventDefault(); setView(el.getAttribute("data-nav")); });
  });
  const joinBtn=document.getElementById("joinBtn");
  if(joinBtn) joinBtn.onclick=()=>{
    const name=(document.getElementById("jn").value||"").trim()||"Seeker";
    const school=(document.getElementById("js").value||"Academy Path").trim();
    const kid=document.getElementById("jk").checked;
    save({ name, schoolTag:school, stage:"novice", kidMode:kid, joinedAt:Date.now(), metrics:{...EMPTY_M}, lessons:{}, sickLog:[], classLog:[], houseStatus:"accepted", acts:[] });
    state.msg=""; setView("dashboard");
  };
  document.querySelectorAll("[data-seal]").forEach(btn=>{
    btn.onclick=()=>{
      const id=btn.getAttribute("data-seal");
      const s=state.student; if(!s) return;
      const ref=(document.getElementById("ref-"+id)?.value||"").trim();
      if(ref.length<8){ alert("Speak a little more — at least a short honest answer."); return; }
      s.lessons={...s.lessons,[id]:{completed:true,reflection:ref,at:Date.now()}};
      s.metrics={...s.metrics, clarity:clamp(s.metrics.clarity+3), principle:clamp(s.metrics.principle+2), integrity:clamp(s.metrics.integrity+(/don't know|do not know/i.test(ref)?3:1))};
      save(s);
    };
  });
  const camBtn=document.getElementById("camBtn");
  const sealBtn=document.getElementById("sealBtn");
  const video=document.getElementById("cam");
  if(camBtn&&video){
    camBtn.onclick=async()=>{
      try{
        const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"user"},audio:false});
        state.camStream=stream; video.srcObject=stream; await video.play();
        video.classList.remove("hidden"); sealBtn.classList.remove("hidden"); camBtn.classList.add("hidden");
        const line=document.getElementById("thomasLine"); if(line) line.textContent="Hold still. I will draw you as a seal, not a surveillance file.";
      }catch{ alert("Camera blocked — grant permission to seal your avatar."); }
    };
  }
  if(sealBtn&&video){
    sealBtn.onclick=()=>{
      const s=state.student; if(!s) return;
      const dataUrl=cartoonize(video);
      s.avatar={dataUrl,createdAt:Date.now()};
      if(state.camStream){ state.camStream.getTracks().forEach(t=>t.stop()); state.camStream=null; }
      save(s);
    };
  }
  const voiceBtn=document.getElementById("voiceBtn");
  if(voiceBtn){
    voiceBtn.onclick=()=>{
      const s=state.student; if(!s) return;
      const finish=()=>{ s.lastVoiceAt=Date.now(); s.metrics={...s.metrics,integrity:clamp(s.metrics.integrity+1)}; save(s); const m=document.getElementById("voiceMsg"); if(m) m.textContent="Presence sealed."; };
      const w=window; const SR=w.SpeechRecognition||w.webkitSpeechRecognition;
      if(!SR){ finish(); return; }
      const rec=new SR(); rec.lang="en-US";
      rec.onresult=(ev)=>{ const said=(ev.results[0][0].transcript||"").toLowerCase(); if(/\b(present|here|ready|good)\b/.test(said)) finish(); else { const m=document.getElementById("voiceMsg"); if(m) m.textContent=`Heard “${said}” — try “I am present” or confirm again.`; } };
      rec.onerror=()=>finish();
      rec.start();
      const m=document.getElementById("voiceMsg"); if(m) m.textContent="Listening… say “I am present”";
    };
  }
  const sickBtn=document.getElementById("sickBtn");
  if(sickBtn){
    sickBtn.onclick=()=>{
      const s=state.student; if(!s) return;
      if((s.sickLog||[]).some(x=>x.day===todayKey())) return;
      const note=document.getElementById("sickNote")?.value||"Unwell — resting";
      s.sickLog=[...(s.sickLog||[]),{id:uid(),day:todayKey(),note,at:Date.now(),granted:true}];
      s.liePattern=recomputeLie(s);
      if(s.liePattern.pressure>=40) s.metrics={...s.metrics,integrity:clamp(s.metrics.integrity-2)};
      save(s);
    };
  }
  document.querySelectorAll("[data-rsvp]").forEach(btn=>{
    btn.onclick=()=>{ state.msg="Seat reserved on this device. See you in class."; render(); };
  });
  const classSend=document.getElementById("classSend");
  if(classSend){
    classSend.onclick=()=>{
      const s=state.student; if(!s) return;
      const text=(document.getElementById("classText")?.value||"").trim(); if(!text) return;
      s.classLog=[...(s.classLog||[]),{name:s.name,text,at:Date.now()}];
      s.classLog.push({name:"Thomas",text:"Well said. Keep speech ordered to the good — clear, honest, and kind.",at:Date.now()});
      s.metrics={...s.metrics,relation:clamp(s.metrics.relation+2),articulation:clamp(s.metrics.articulation+1)};
      save(s);
    };
  }
  const hmSeal=document.getElementById("hmSeal");
  if(hmSeal){
    hmSeal.onclick=()=>{
      const act=document.getElementById("hmAct").value;
      const name=(document.getElementById("hmName").value||"Seeker").trim();
      const detail=document.getElementById("hmDetail").value||"";
      const speech=thomasSpeech(act,name,detail);
      state.speech=speech;
      const acts=JSON.parse(localStorage.getItem(KEY+".hm")||"[]");
      acts.unshift({act,name,detail,speech,at:Date.now()});
      localStorage.setItem(KEY+".hm", JSON.stringify(acts.slice(0,50)));
      if(state.student && state.student.name.toLowerCase()===name.toLowerCase()){
        const map={acceptance:"accepted",discipline:"disciplined",expulsion:"expelled",return:"returned"};
        state.student.houseStatus=map[act];
        save(state.student);
      } else render();
    };
  }
}

window.addEventListener("hashchange", ()=>{ state.view=location.hash.slice(1)||"home"; render(); });
render();
