(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const STORE = "jukwaa-demo-v1";
  const state = Object.assign({ user: null, paid: {}, liked: [], passed: [], reports: {}, filter: "All", creatorProfile: null, earnings: 0, payments: [] },
    JSON.parse(localStorage.getItem(STORE) || "{}"));
  const save = () => localStorage.setItem(STORE, JSON.stringify(state));
  const byId = id => CREATORS.find(c => c.id === id);
  let currentRoom = null, roomTimers = [], camStream = null;

  // ---------- helpers ----------
  const trustScore = c => Math.max(0, c.trust - (state.reports[c.id] ? 15 : 0));
  function trustBadge(c) {
    const t = trustScore(c);
    const cls = t >= 80 ? "good" : t >= 50 ? "mid" : "bad";
    const label = t >= 80 ? "Trusted" : t >= 50 ? "Caution" : "High risk";
    return `<span class="trust ${cls}">${label} · ${t}%</span>`;
  }
  const isPaid = c => !!state.paid[c.id];
  const fmt = n => n >= 1000 ? (n / 1000).toFixed(1) + "k" : n;
  const handle = () => state.user ? state.user.name : "guest";
  const streamHTML = c => `<div class="stream" style="--c1:${c.colors[0]};--c2:${c.colors[1]}"><div class="figure">${c.emoji}</div>${c.faceHidden ? '<div class="mask">Face hidden by creator</div>' : ""}</div>`;
  const watermark = () => `<div class="watermark">${Array(40).fill(`@${handle()} · Jukwaa`).map(t => `<span>${t}</span>`).join("")}</div>`;
  const colorFor = s => `hsl(${[...s].reduce((a, ch) => a + ch.charCodeAt(0), 0) * 37 % 360} 70% 55%)`;

  function toast(html, action) {
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = `<div class="grow">${html}</div>${action ? `<button>${action.label}</button>` : ""}`;
    if (action) el.querySelector("button").onclick = () => { el.remove(); action.fn(); };
    $("#toasts").appendChild(el);
    setTimeout(() => el.remove(), action ? 7000 : 3200);
  }

  function show(name) {
    $$(".screen").forEach(s => s.classList.toggle("active", s.id === "screen-" + name));
    if (name !== "room") leaveRoom();
    if (name === "discover") renderDeck();
    if (name === "liked") renderLiked();
    if (name === "studio") renderStudio();
    if (name !== "studio") stopCam();
  }

  function openModal(html) { $("#sheet").innerHTML = html; $("#modal").hidden = false; }
  function closeModal() { $("#modal").hidden = true; }
  $("#modal").addEventListener("click", e => { if (e.target.id === "modal") closeModal(); });

  // ---------- accounts ----------
  function signupSheet(kind) {
    openModal(`<h3>${kind === "creator" ? "Become a creator" : "Create your free account"}</h3>
      <p>${kind === "creator" ? "One-time KES 50 registration via M-Pesa. Creators must be 18+ and pass ID verification." : "Free forever. Pay only for the shows you join."}</p>
      <div class="col">
        <input id="su-name" placeholder="Username" maxlength="20" />
        <input id="su-phone" placeholder="M-Pesa number e.g. 0712 345 678" inputmode="tel" />
        <label style="display:flex;gap:8px;align-items:center;color:var(--muted);font-size:14px"><input type="checkbox" id="su-age" style="width:auto"> I confirm I am 18 years or older</label>
        <button class="btn ${kind === "creator" ? "gold" : "primary"} big" id="su-go">${kind === "creator" ? "Pay KES 50 & continue" : "Create account"}</button>
      </div>`);
    $("#su-go").onclick = () => {
      const name = $("#su-name").value.trim().replace(/\s+/g, "_");
      const phone = $("#su-phone").value.trim();
      if (!name) return toast("Pick a username");
      if (!$("#su-age").checked) return toast("You must confirm you are 18+");
      const finish = () => {
        state.user = { name, phone, role: kind };
        if (kind === "creator") state.creatorProfile = { category: "Music", price: 150, faceHidden: false, bio: "" };
        save(); closeModal(); show(kind === "creator" ? "studio" : "discover");
        toast(`Welcome, <b>@${name}</b>!`);
      };
      if (kind === "creator") mpesaFlow({ amount: 50, label: "Creator registration", phone, onSuccess: finish });
      else finish();
    };
  }

  // ---------- M-Pesa (simulated STK push) ----------
  function mpesaFlow({ amount, label, phone = state.user?.phone || "", onSuccess }) {
    openModal(`<div class="mpesa-head"><span class="mpesa-logo">M-PESA</span><b>${label}</b></div>
      <h3>Pay KES ${amount}</h3><p>We'll send a payment prompt to your phone.</p>
      <div class="col"><input id="mp-phone" value="${phone}" placeholder="07XX XXX XXX" inputmode="tel" />
      <button class="btn mpesa big" id="mp-send">Send M-Pesa prompt</button>
      <button class="btn ghost" id="mp-cancel">Cancel</button></div>`);
    $("#mp-cancel").onclick = closeModal;
    $("#mp-send").onclick = () => {
      const ph = $("#mp-phone").value.replace(/\s/g, "");
      if (!/^(0|\+?254)?[17]\d{8}$/.test(ph)) return toast("Enter a valid Safaricom number");
      $("#sheet").innerHTML = `<div class="mpesa-head"><span class="mpesa-logo">M-PESA</span><b>Check your phone</b></div>
        <div class="phone-prompt"><b>M-PESA</b><br>Do you want to pay KES ${amount}.00 to JUKWAA LTD for ${label}?<br>Enter M-PESA PIN:
        <input id="mp-pin" type="password" maxlength="4" inputmode="numeric" placeholder="••••" />
        <button class="btn mpesa big" id="mp-ok">OK</button></div>
        <p style="text-align:center">Simulated phone prompt — any 4 digits work.</p>`;
      $("#mp-pin").focus();
      $("#mp-ok").onclick = () => {
        if (!/^\d{4}$/.test($("#mp-pin").value)) return toast("PIN must be 4 digits");
        $("#sheet").innerHTML = `<h3 style="text-align:center">Confirming payment…</h3><div class="spinner"></div>`;
        setTimeout(() => {
          const code = "S" + Math.random().toString(36).slice(2, 11).toUpperCase();
          state.payments.unshift({ code, amount, label, at: Date.now() }); save();
          $("#sheet").innerHTML = `<div class="success"><div class="tick">✅</div><h3>Payment confirmed</h3>
            <div class="receipt">${code} Confirmed. KES ${amount}.00 paid to JUKWAA LTD.</div>
            <button class="btn primary big" id="mp-done">Continue</button></div>`;
          $("#mp-done").onclick = () => { closeModal(); onSuccess(code); };
        }, 1600);
      };
    };
  }

  function payForShow(c, after) {
    if (!state.user) {
      toast("Create a free account to pay and join", { label: "Sign up", fn: () => signupSheet("fan") });
      return;
    }
    if (trustScore(c) < 50 && !confirm(`${c.name} has a HIGH RISK trust score (${trustScore(c)}%) and ${c.reports + (state.reports[c.id] ? 1 : 0)} reports. Pay anyway?`)) return;
    mpesaFlow({ amount: c.price, label: `${c.name}'s show`, onSuccess: () => {
      state.paid[c.id] = true; if (!state.liked.includes(c.id)) state.liked.push(c.id); save();
      toast(`🔓 Unlocked <b>${c.name}</b> — enjoy the show!`);
      after ? after() : openRoom(c.id);
    }});
  }

  // ---------- discover / swipe ----------
  function renderFilters() {
    $("#filters").innerHTML = CATEGORIES.map(f => `<button class="${f === state.filter ? "on" : ""}" data-filter="${f}">${f}</button>`).join("");
    $("#me-btn").textContent = state.user ? state.user.name[0].toUpperCase() : "?";
    $("#liked-count").textContent = state.liked.length;
  }
  const deckList = () => CREATORS.filter(c => (state.filter === "All" || c.category === state.filter) && !state.passed.includes(c.id) && !state.liked.includes(c.id));

  function cardHTML(c) {
    const paid = isPaid(c);
    return `<div class="media ${paid ? "" : "locked"}">${streamHTML(c)}
        ${paid ? "" : `<div class="lock-msg"><span>🔒</span>Pay to unblur & join</div>`}</div>
      <div class="live-badge ${c.live ? "" : "off"}">${c.live ? "● LIVE" : "Offline"}</div>
      ${c.live ? `<div class="viewers-badge">👁 ${fmt(c.viewers)} watching</div>` : ""}
      <div class="stamp like">LIKE</div><div class="stamp nope">NOPE</div>
      <div class="info">
        <h3>${c.name} <small>${c.age}</small> ${c.verified ? '<span class="verified" title="ID verified">✔</span>' : ""}</h3>
        <div class="meta">${trustBadge(c)} <span>⭐ ${c.rating}</span> <span>${c.category}</span> <span>📍 ${c.city}</span></div>
        <div style="color:#ccc;font-size:14px">${c.bio}</div>
        <div class="pay-row">
          <div class="price">Entry<b>KES ${c.price}</b></div>
          <button class="pay-btn ${paid ? "paid" : ""}" data-pay="${c.id}">${paid ? "▶ Enter show" : `Pay KES ${c.price} to join`}</button>
        </div>
      </div>`;
  }

  function renderDeck() {
    renderFilters();
    const list = deckList();
    const deck = $("#deck");
    deck.innerHTML = "";
    $("#deck-empty").hidden = list.length > 0;
    list.slice(0, 3).reverse().forEach((c, i, arr) => {
      const el = document.createElement("div");
      el.className = "card";
      el.dataset.id = c.id;
      const depth = arr.length - 1 - i;
      el.style.transform = `scale(${1 - depth * 0.04}) translateY(${depth * 14}px)`;
      el.innerHTML = cardHTML(c);
      deck.appendChild(el);
    });
    const top = deck.lastElementChild;
    if (top) attachSwipe(top);
  }

  function attachSwipe(el) {
    let sx = 0, sy = 0, dx = 0, dy = 0, dragging = false;
    const like = $(".stamp.like", el), nope = $(".stamp.nope", el);
    el.addEventListener("pointerdown", e => {
      if (e.target.closest("button")) return;
      dragging = true; sx = e.clientX; sy = e.clientY; el.setPointerCapture(e.pointerId); el.classList.remove("anim");
    });
    el.addEventListener("pointermove", e => {
      if (!dragging) return;
      dx = e.clientX - sx; dy = e.clientY - sy;
      el.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx / 14}deg)`;
      like.style.opacity = Math.max(0, dx / 100); nope.style.opacity = Math.max(0, -dx / 100);
    });
    const end = () => {
      if (!dragging) return; dragging = false;
      if (dx > 110) fling(el, 1); else if (dx < -110) fling(el, -1);
      else if (dy < -120) { reset(); openRoom(el.dataset.id); }
      else reset();
      dx = dy = 0;
    };
    const reset = () => { el.classList.add("anim"); el.style.transform = ""; like.style.opacity = nope.style.opacity = 0; };
    el.addEventListener("pointerup", end); el.addEventListener("pointercancel", end);
    el.addEventListener("click", e => { if (!e.target.closest("button") && Math.abs(dx) < 5) openRoom(el.dataset.id); });
  }

  function fling(el, dir) {
    const id = el.dataset.id, c = byId(id);
    el.classList.add("anim");
    el.style.transform = `translate(${dir * 600}px, -40px) rotate(${dir * 30}deg)`;
    el.style.opacity = 0;
    if (dir > 0) {
      state.liked.push(id);
      if (c.live && !isPaid(c)) setTimeout(() => toast(`💚 You liked <b>${c.name}</b> — she's live now with ${fmt(c.viewers)} viewers`, { label: `Join KES ${c.price}`, fn: () => payForShow(c) }), 350);
    } else state.passed.push(id);
    save();
    setTimeout(renderDeck, 300);
  }
  const topCard = () => $("#deck").lastElementChild;

  // ---------- room ----------
  function openRoom(id) {
    const c = byId(id);
    currentRoom = c;
    show("room");
    $("#room-title").innerHTML = `${c.name} ${c.verified ? '<span class="verified">✔</span>' : ""}`;
    renderRoom("live");
  }

  function renderRoom(tab) {
    const c = currentRoom, paid = isPaid(c);
    roomTimers.forEach(clearInterval); roomTimers = [];
    const risky = trustScore(c) < 50;
    $("#room").innerHTML = `
      ${risky ? `<div class="warn">⚠️ <b>High-risk creator.</b> ${c.reports + (state.reports[c.id] ? 1 : 0)} users reported this account (late starts, cancelled shows, no refunds). Proceed with caution.</div>` : ""}
      <div class="stage ${paid ? "" : "locked"}" id="stage">
        ${streamHTML(c)}
        <div class="live-badge ${c.live ? "" : "off"}">${c.live ? "● LIVE" : "Offline"}</div>
        <div class="viewers-badge" id="vcount">👁 ${fmt(c.viewers)}</div>
        ${paid ? watermark() + `<div class="chat" id="chat"></div>
          <div class="reactions"><button data-react="❤️">❤️</button><button data-react="🔥">🔥</button><button data-react="😂">😂</button><button data-react="👏">👏</button></div>`
        : `<div class="overlay-pay"><div style="font-size:44px">🔒</div><b style="font-size:20px">${c.live ? "Live now" : "Next show soon"} · KES ${c.price}</b>
            <div style="color:#ddd;font-size:14px">Pay once to unblur the live show, photos and videos.</div>
            <button class="pay-btn" data-pay="${c.id}">Pay KES ${c.price} with M-Pesa</button></div>`}
      </div>
      ${paid ? `<div class="chatbar"><input id="chat-input" placeholder="Say something…" maxlength="120"><button class="btn primary" id="chat-send">Send</button></div>` : ""}
      <div class="section" style="padding-bottom:0">
        <div class="meta" style="margin:0">${trustBadge(c)} <span>⭐ ${c.rating}</span> <span>${c.category}</span> <span>📍 ${c.city}</span>
        <span class="viewer-strip">${FAN_NAMES.slice(0, 6).map(n => `<i style="background:${colorFor(n)}">${n[0].toUpperCase()}</i>`).join("")}</span></div>
      </div>
      <div class="tabs">${["live", "photos", "videos", "history"].map(t => `<button class="${t === tab ? "on" : ""}" data-tab="${t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join("")}</div>
      <div class="section ${paid ? "" : "locked"}" id="tab-body">${tabBody(c, tab, paid)}</div>`;
    if (paid && c.live) startRoomSim(c);
    else if (c.live) roomTimers.push(setInterval(() => bumpViewers(c), 1500));
  }

  function tabBody(c, tab, paid) {
    if (tab === "live") return `<h4>About</h4><div style="color:#ccc">${c.bio}</div>
      <p style="color:var(--muted);font-size:13px">Unlimited members can watch together. ${c.faceHidden ? "This creator keeps her face hidden — fans can request a face reveal." : ""}</p>
      ${c.faceHidden && paid ? `<button class="btn small" id="req-face">🙋 Request face reveal</button>` : ""}`;
    if (tab === "photos" || tab === "videos") {
      const isVid = tab === "videos";
      return `<div class="grid">${Array.from({ length: 9 }, (_, i) => `<div class="tile">
        <div class="bgfill" style="background:linear-gradient(${i * 40}deg, ${c.colors[0]}, ${c.colors[1]})"></div>
        <span class="tile-emoji">${c.emoji}</span>${paid ? "" : '<span class="lock">🔒</span>'}${isVid ? `<span class="dur">${2 + i}:${(i * 7 % 60).toString().padStart(2, "0")}</span>` : ""}</div>`).join("")}</div>
        <p style="color:var(--muted);font-size:12px">${paid ? "Streaming only · watermarked with your username · downloads disabled" : `Pay KES ${c.price} to unlock.`}</p>`;
    }
    const t = trustScore(c), col = t >= 80 ? "var(--green)" : t >= 50 ? "var(--amber)" : "var(--red)";
    return `<h4>Trust & credibility</h4>
      <div class="meter"><i style="width:${t}%;background:${col}"></i></div>
      <div class="stats"><div><b>${t}%</b><span>Trust</span></div><div><b>${c.shows}</b><span>Shows</span></div><div><b>⭐${c.rating}</b><span>Rating</span></div><div><b>${c.reports + (state.reports[c.id] ? 1 : 0)}</b><span>Reports</span></div></div>
      <p style="font-size:13px;color:var(--muted)">${c.verified ? "✔ ID verified (18+)" : "✖ ID not yet verified"} · Score is based on ratings, completed shows and user reports.</p>
      <h4>Show history</h4>
      ${c.history.map(([title, when, n, r]) => `<div class="row"><div class="thumb" style="background:linear-gradient(135deg,${c.colors[0]},${c.colors[1]})">${c.emoji}</div>
        <div class="grow"><b>${title}</b><div class="sub">${when} · ${n} watched</div></div><div>⭐ ${r}</div></div>`).join("")}`;
  }

  function bumpViewers(c) {
    c.viewers = Math.max(1, c.viewers + Math.round((Math.random() - 0.35) * 8));
    const v = $("#vcount"); if (v) v.textContent = `👁 ${fmt(c.viewers)}`;
  }
  function addChat(name, text) {
    const chat = $("#chat"); if (!chat) return;
    const d = document.createElement("div");
    d.innerHTML = `<b>${name}</b>`; d.append(text);
    chat.appendChild(d);
    while (chat.children.length > 8) chat.firstChild.remove();
  }
  function floatEmoji(e) {
    const s = $("#stage"); if (!s) return;
    const f = document.createElement("div"); f.className = "float"; f.textContent = e;
    f.style.right = 14 + Math.random() * 30 + "px"; s.appendChild(f); setTimeout(() => f.remove(), 2000);
  }
  function startRoomSim(c) {
    addChat("Jukwaa", `You joined ${c.name}'s show. Be kind 💚`);
    roomTimers.push(setInterval(() => {
      bumpViewers(c);
      addChat(FAN_NAMES[Math.random() * FAN_NAMES.length | 0], CHAT_LINES[Math.random() * CHAT_LINES.length | 0]);
      if (Math.random() < .4) floatEmoji(["❤️", "🔥", "👏", "😂"][Math.random() * 4 | 0]);
    }, 1400));
  }
  function leaveRoom() { roomTimers.forEach(clearInterval); roomTimers = []; }

  function reportSheet() {
    const c = currentRoom;
    openModal(`<h3>Report ${c.name}</h3><p>Reports lower the creator's trust score and are reviewed by moderators.</p>
      <div class="col">${["Show didn't happen / scam", "Content not as described", "Harassment or abuse", "Creator may be under 18", "Other"].map(r => `<button class="btn" data-reason="${r}">${r}</button>`).join("")}
      <button class="btn ghost" id="rp-cancel">Cancel</button></div>`);
    $("#rp-cancel").onclick = closeModal;
    $$("[data-reason]", $("#sheet")).forEach(b => b.onclick = () => {
      state.reports[c.id] = b.dataset.reason; save(); closeModal(); renderRoom("history");
      toast("Thanks — report submitted. Trust score updated.");
    });
  }

  // ---------- liked ----------
  function renderLiked() {
    const list = state.liked.map(byId).filter(Boolean);
    $("#liked-list").innerHTML = list.length ? list.map(c => `<div class="row" data-open="${c.id}">
      <div class="thumb" style="background:linear-gradient(135deg,${c.colors[0]},${c.colors[1]})">${c.emoji}</div>
      <div class="grow"><b>${c.name}</b> ${c.live ? '<span style="color:var(--red);font-size:12px;font-weight:800">● LIVE</span>' : ""}<div class="sub">${c.category} · ${trustBadge(c)}</div></div>
      ${isPaid(c) ? `<button class="btn small primary" data-open="${c.id}">Enter</button>` : `<button class="btn small mpesa" data-pay="${c.id}">KES ${c.price}</button>`}</div>`).join("")
      + (state.payments.length ? `<h4 style="margin:18px 0 8px">Payment history</h4>${state.payments.map(p => `<div class="row"><div class="grow"><b>${p.label}</b><div class="sub">${p.code} · ${new Date(p.at).toLocaleString()}</div></div><b>KES ${p.amount}</b></div>`).join("")}` : "")
      : `<div class="empty" style="position:static;padding:60px 0">Swipe right on creators you like.</div>`;
  }

  // ---------- studio ----------
  function renderStudio() {
    const u = state.user;
    if (!u || u.role !== "creator") {
      $("#studio").innerHTML = `<div class="earnings"><b>Earn from your talent</b>Go live, set your own entry price and get paid to M-Pesa.</div>
        <button class="btn gold big" data-action="signup-creator">Become a creator · KES 50</button>
        <p style="color:var(--muted);font-size:13px">Creators must be 18+ and verify their ID before going live.</p>`;
      return;
    }
    const p = state.creatorProfile;
    $("#studio").innerHTML = `
      <div class="earnings"><span>Earnings (demo)</span><b>KES ${state.earnings.toLocaleString()}</b><span id="live-fans">Not live</span></div>
      <label>Category<select id="st-cat">${CATEGORIES.slice(1).map(x => `<option ${x === p.category ? "selected" : ""}>${x}</option>`).join("")}</select></label>
      <label>Entry price (KES)<input id="st-price" type="number" min="20" step="10" value="${p.price}"></label>
      <label>Bio<input id="st-bio" value="${p.bio}" placeholder="What's your show about?"></label>
      <div class="switch"><span>Hide my face</span><input type="checkbox" id="st-face" ${p.faceHidden ? "checked" : ""} style="width:auto"></div>
      <div class="cam" id="cam">Camera preview</div>
      <button class="btn primary big" id="st-live">● Go live</button>`;
    const sync = () => { p.category = $("#st-cat").value; p.price = +$("#st-price").value || 50; p.bio = $("#st-bio").value; p.faceHidden = $("#st-face").checked; save(); updateMask(); };
    $$("#st-cat,#st-price,#st-bio,#st-face").forEach(i => i.addEventListener("change", sync));
    $("#st-live").onclick = () => camStream ? stopCam(true) : startCam();
  }
  function updateMask() {
    const cam = $("#cam"); if (!cam) return;
    $(".facemask", cam)?.remove();
    if (state.creatorProfile.faceHidden && camStream) cam.insertAdjacentHTML("beforeend", `<div class="facemask">face hidden</div>`);
  }
  let liveSim = null;
  async function startCam() {
    const cam = $("#cam");
    try {
      camStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      cam.innerHTML = ""; const v = document.createElement("video"); v.autoplay = v.muted = v.playsInline = true; v.srcObject = camStream; cam.appendChild(v);
    } catch {
      camStream = "sim";
      cam.innerHTML = streamHTML({ colors: ["#ff3d6e", "#7c3aed"], emoji: "🎤", faceHidden: false });
    }
    updateMask();
    $("#st-live").textContent = "■ End show"; $("#st-live").classList.replace("primary", "danger-outline");
    let fans = 0;
    liveSim = setInterval(() => {
      if (Math.random() < .5) {
        fans++; state.earnings += state.creatorProfile.price; save();
        $(".earnings b").textContent = `KES ${state.earnings.toLocaleString()}`;
        toast(`💰 <b>${FAN_NAMES[Math.random() * FAN_NAMES.length | 0]}</b> paid KES ${state.creatorProfile.price} and joined`);
      }
      $("#live-fans").textContent = `● LIVE · ${fans} paying fans`;
    }, 2500);
  }
  function stopCam(rerender) {
    clearInterval(liveSim); liveSim = null;
    if (camStream && camStream !== "sim") camStream.getTracks().forEach(t => t.stop());
    camStream = null;
    if (rerender) renderStudio();
  }

  // ---------- global events ----------
  document.addEventListener("click", e => {
    const t = e.target.closest("[data-action],[data-nav],[data-filter],[data-pay],[data-open],[data-tab],[data-react],#chat-send,#req-face,#me-btn");
    if (!t) return;
    if (t.dataset.pay) { e.stopPropagation(); const c = byId(t.dataset.pay); return isPaid(c) ? openRoom(c.id) : payForShow(c, () => currentRoom?.id === c.id && $("#screen-room").classList.contains("active") ? renderRoom("live") : openRoom(c.id)); }
    if (t.dataset.nav) return show(t.dataset.nav);
    if (t.dataset.filter) { state.filter = t.dataset.filter; save(); return renderDeck(); }
    if (t.dataset.open) return openRoom(t.dataset.open);
    if (t.dataset.tab) return renderRoom(t.dataset.tab);
    if (t.dataset.react) return floatEmoji(t.dataset.react);
    if (t.id === "chat-send") { const i = $("#chat-input"); if (i.value.trim()) { addChat("@" + handle(), i.value.trim()); i.value = ""; } return; }
    if (t.id === "req-face") { toast(`Request sent. ${currentRoom.name} will see that fans want a face reveal.`); t.disabled = true; return; }
    if (t.id === "me-btn") {
      return openModal(state.user ? `<h3>@${state.user.name}</h3><p>${state.user.role === "creator" ? "Creator account" : "Fan account"} · ${state.user.phone || "no phone"}</p>
        <div class="col"><button class="btn" id="me-reset">Reset demo data</button><button class="btn danger-outline" id="me-out">Log out</button></div>`
        : `<h3>Browsing as guest</h3><p>Shows stay blurred until you sign up and pay.</p><div class="col"><button class="btn primary big" data-action="signup-fan">Create free account</button></div>`) ||
        (["me-out", "me-reset"].forEach(id => { const b = $("#" + id); if (b) b.onclick = () => { if (id === "me-reset") localStorage.removeItem(STORE); else { state.user = null; save(); } location.reload(); }; }));
    }
    switch (t.dataset.action) {
      case "guest": state.user = null; save(); return show("discover");
      case "signup-fan": return signupSheet("fan");
      case "signup-creator": return signupSheet("creator");
      case "reset-deck": state.passed = []; state.liked = state.liked.filter(id => isPaid(byId(id))); save(); return renderDeck();
      case "nope": case "like": { const c = topCard(); if (c) fling(c, t.dataset.action === "like" ? 1 : -1); return; }
      case "info": { const c = topCard(); if (c) openRoom(c.dataset.id); return; }
      case "report": return reportSheet();
    }
  });

  document.addEventListener("keydown", e => {
    if (e.target.tagName === "INPUT") { if (e.key === "Enter" && e.target.id === "chat-input") $("#chat-send").click(); return; }
    if (!$("#screen-discover").classList.contains("active") || !$("#modal").hidden) return;
    const c = topCard(); if (!c) return;
    if (e.key === "ArrowRight") fling(c, 1);
    if (e.key === "ArrowLeft") fling(c, -1);
    if (e.key === "ArrowUp") openRoom(c.dataset.id);
  });

  // ---------- content protection (deterrents; no website can fully block screen capture) ----------
  document.addEventListener("contextmenu", e => { if (e.target.closest(".protected,.card")) e.preventDefault(); });
  document.addEventListener("dragstart", e => e.preventDefault());
  const shield = on => { $("#shield").hidden = !on; };
  window.addEventListener("blur", () => { if ($("#screen-room").classList.contains("active") && isPaid(currentRoom)) shield(true); });
  window.addEventListener("focus", () => shield(false));
  document.addEventListener("visibilitychange", () => shield(document.hidden && $("#screen-room").classList.contains("active")));
  document.addEventListener("keyup", e => { if (e.key === "PrintScreen") { navigator.clipboard?.writeText(""); shield(true); setTimeout(() => shield(false), 1500); toast("Screenshots are not allowed on protected content"); } });
  document.addEventListener("keydown", e => { if ((e.ctrlKey || e.metaKey) && ["s", "p"].includes(e.key.toLowerCase())) { e.preventDefault(); toast("Saving is disabled"); } });

  // ---------- "quick prompt" notifications ----------
  setInterval(() => {
    if (!$("#screen-discover").classList.contains("active") || !$("#modal").hidden) return;
    const pool = CREATORS.filter(c => c.live && !isPaid(c) && trustScore(c) >= 50);
    const c = pool[Math.random() * pool.length | 0]; if (!c) return;
    toast(`🔴 <b>${c.name}</b> is live · ${fmt(c.viewers)} watching`, { label: `Join KES ${c.price}`, fn: () => payForShow(c) });
  }, 20000);

  // boot
  if (state.user || localStorage.getItem(STORE)) show("discover");
})();
