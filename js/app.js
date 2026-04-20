// ==================== State ====================

const state = {
  screen: 'dashboard',
  kidId: null,
  parentTab: 'approve',
  parentUnlocked: false,
  pinSetupMode: false,
  moreTab: 'tasks',
  calendarTab: 'events',
  calendarDate: new Date(),
  shopTab: 'list',
  dailySpecialId: null,
  weekOffset: 0,
  kids: [], chores: [], prizes: [], pending: [], history: [],
  shoppingItems: [], tasks: [], events: [], meals: [], messages: []
};

const AVATARS = ['🕵️','🦸','🥷','🦊','🐱','🦁','🐯','🐻','🦄','🚀','👾','🤖','🎯','⭐','🐶','🐰'];
const DAYS_HE = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
const MONTHS_HE = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
const SHOP_CATS = [
  { id:'produce', name:'ירקות ופירות', icon:'🥬' },
  { id:'dairy', name:'מוצרי חלב', icon:'🥛' },
  { id:'meat', name:'בשר ודגים', icon:'🥩' },
  { id:'bakery', name:'מאפים', icon:'🍞' },
  { id:'cleaning', name:'ניקיון', icon:'🧹' },
  { id:'snacks', name:'חטיפים ומשקאות', icon:'🍿' },
  { id:'other', name:'אחר', icon:'📦' }
];
const SHOP_PRESETS = {
  dairy: ['חלב','ביצים','גבינה צהובה','גבינה לבנה','קוטג׳','שמנת','חמאה','יוגורט','שוקו','מילקי','שמנת מתוקה','לבן','שוקולד חלב','גבינת שמנת'],
  produce: ['עגבניות','מלפפון','בצל','תפוחי אדמה','גזר','לימון','בננות','תפוחים','פלפל','אבוקדו','חסה','כוסברה','פטרוזיליה','שום','תפוזים','אשכולית','ענבים','שזיפים','קישוא','חציל','בטטה','פטריות','תירס'],
  meat: ['חזה עוף','שניצל','בשר טחון','כנפיים','פרגית','נקניקיות','סלמון','טונה בקופסא','שוקיים','קבב','המבורגר'],
  bakery: ['לחם לבן','לחם מלא','פיתות','חלה','לחמניות','טורטייה','בייגלה','עוגת שמרים','קרואסון'],
  cleaning: ['סבון כלים','אקונומיקה','נייר טואלט','מגבות נייר','שקיות אשפה','מרכך כביסה','אבקת כביסה','סבון ידיים','ספוגים','שקיות פריזר'],
  snacks: ['במבה','ביסלי','שוקולד','עוגיות','חטיף','מים','מיץ','קולה','ספרייט','פופקורן','קרקר','אגוזים','חמאת בוטנים','ריבה','נוטלה','דבש'],
  other: ['קפה','תה','סוכר','מלח','שמן','חומץ','רוטב סויה','רוטב עגבניות','אורז','פסטה','קמח','שימורים','זיתים','טחינה','חומוס']
};
const PRIORITY = { high:'🔴 דחוף', normal:'🟡 רגיל', low:'🟢 לא דחוף' };
const EVENT_COLORS = ['#f0a500','#4ecca3','#e94560','#3b82f6','#a855f7','#ec4899'];

function dateStr(d) { return d.toISOString().split('T')[0]; }
function todayStr() { return dateStr(new Date()); }

const DAILY_BONUS = 5;

async function loadDailySpecial() {
  const saved = await Store.getDailySpecial();
  const today = todayStr();
  if (saved && saved.date === today && state.chores.find(c => c.id === saved.choreId)) {
    state.dailySpecialId = saved.choreId;
  } else if (state.chores.length > 0) {
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(),0,0)) / 86400000);
    const idx = dayOfYear % state.chores.length;
    state.dailySpecialId = state.chores[idx].id;
    await Store.setDailySpecial(state.dailySpecialId, today);
  }
}

function getWeekRange(offset = 0) {
  const now = new Date();
  const day = now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() - day + (offset * 7));
  start.setHours(0,0,0,0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23,59,59,999);
  return { start, end };
}
function formatDate(s) {
  const d = new Date(s + 'T00:00:00');
  return `${DAYS_HE[d.getDay()]}׳, ${d.getDate()} ${MONTHS_HE[d.getMonth()]}`;
}

// ==================== Init ====================

async function init() {
  try {
    const pin = await Store.getPin();
    if (!pin) { state.pinSetupMode = true; state.screen = 'pin'; }
    await Store.seedDefaults();
    await loadData();
    render();
    setupNav();
  } catch (err) {
    document.getElementById('main').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <div class="empty-text">שגיאה בחיבור למסד הנתונים<br><small style="color:var(--text-dim)">${err.message}</small></div>
      </div>`;
  }
}

async function loadData() {
  const [kids, chores, prizes, pending, shoppingItems, tasks, events, meals, messages] = await Promise.all([
    Store.getKids(), Store.getChores(), Store.getPrizes(), Store.getPending(),
    Store.getShoppingItems(), Store.getTasks(), Store.getEvents(), Store.getMeals(), Store.getMessages()
  ]);
  Object.assign(state, { kids, chores, prizes, pending, shoppingItems, tasks, events, meals, messages });
  await loadDailySpecial();
}

// ==================== Navigation ====================

function setupNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const screen = btn.dataset.screen;
      navigate(screen);
    });
  });
  document.getElementById('btn-back').addEventListener('click', () => {
    if (state.screen === 'kid' || state.screen === 'shop-kid') navigate('rewards');
    else navigate('dashboard');
  });
}

function navigate(screen, data = {}) {
  state.screen = screen;
  Object.assign(state, data);
  render();
}

function updateNavActive(screen) {
  const map = { kid:'rewards', 'shop-kid':'rewards', pin:'more', parent:'more' };
  const base = map[screen] || screen;
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.screen === base);
  });
  const backBtn = document.getElementById('btn-back');
  backBtn.style.display = ['kid','shop-kid'].includes(screen) ? 'block' : 'none';

  const titles = {
    dashboard:'Mission Impossipoints', rewards:'הסוכנים', kid: state.kids.find(k=>k.id===state.kidId)?.name||'סוכן',
    shop:'חנות הפרסים', 'shop-kid':'חנות הפרסים', shopping:'רשימת קניות', calendar:'יומן משפחתי',
    more:'עוד', pin: state.pinSetupMode?'הגדרת קוד סודי':'קוד סודי', parent:'מרכז הפיקוד'
  };
  document.getElementById('header-title').textContent = titles[screen] || 'Mission Impossipoints';
  updatePendingBadge();
}

function updatePendingBadge() {
  const parentBtn = document.querySelector('.nav-btn[data-screen="rewards"]');
  let badge = parentBtn.querySelector('.nav-badge');
  if (state.pending.length > 0) {
    if (!badge) { badge = document.createElement('span'); badge.className = 'nav-badge'; parentBtn.appendChild(badge); }
    badge.textContent = state.pending.length;
  } else if (badge) { badge.remove(); }
}

// ==================== Render ====================

async function render() {
  const main = document.getElementById('main');
  updateNavActive(state.screen);
  switch (state.screen) {
    case 'dashboard': main.innerHTML = renderDashboard(); break;
    case 'rewards': main.innerHTML = renderRewards(); break;
    case 'kid': main.innerHTML = await renderKid(); break;
    case 'shop-kid': main.innerHTML = renderShopKid(); break;
    case 'shopping': main.innerHTML = renderShopping(); break;
    case 'calendar': main.innerHTML = renderCalendar(); break;
    case 'more': main.innerHTML = renderMore(); break;
    case 'pin': main.innerHTML = renderPin(); setupPinPad(); break;
    case 'parent': main.innerHTML = await renderParent(); break;
    default: main.innerHTML = renderDashboard();
  }
  main.scrollTop = 0;
  attachEvents();
}

// ==================== Dashboard ====================

function renderDashboard() {
  const unchecked = state.shoppingItems.filter(i => !i.checked).length;
  const undoneTasks = state.tasks.filter(t => !t.done).length;
  const todayEvents = state.events.filter(e => e.date === todayStr());
  const todayMeals = state.meals.filter(m => m.date === todayStr());
  const pinnedMsgs = state.messages.filter(m => m.pinned);
  const topKid = [...state.kids].sort((a,b) => b.points - a.points)[0];

  const dailyChore = state.chores.find(c => c.id === state.dailySpecialId);

  return `<div class="screen-content">
    ${dailyChore ? `
      <div class="daily-special-banner" data-action="nav" data-to="rewards">
        <div class="daily-special-star">🌟</div>
        <div class="daily-special-text">
          <div class="daily-special-label">משימת היום</div>
          <div class="daily-special-name">${dailyChore.name}</div>
        </div>
        <div class="daily-special-bonus">+${dailyChore.points + DAILY_BONUS} ⭐</div>
      </div>
    ` : ''}
    <div class="dash-grid">
      <div class="dash-tile dash-wide" data-action="nav" data-to="rewards">
        <div class="dash-tile-icon">⭐</div>
        <div class="dash-tile-info">
          <div class="dash-tile-title">פרסים וילדים</div>
          <div class="dash-tile-sub">${state.kids.length} סוכנים${state.pending.length ? ` · ${state.pending.length} ממתינים` : ''}${topKid ? ` · 🏆 ${topKid.name}` : ''}</div>
        </div>
      </div>

      <div class="dash-tile" data-action="nav" data-to="shopping">
        <div class="dash-tile-icon">🛒</div>
        <div class="dash-tile-info">
          <div class="dash-tile-title">קניות</div>
          <div class="dash-tile-sub">${unchecked ? unchecked + ' פריטים' : 'הרשימה ריקה'}</div>
        </div>
      </div>

      <div class="dash-tile" data-action="nav" data-to="calendar">
        <div class="dash-tile-icon">📅</div>
        <div class="dash-tile-info">
          <div class="dash-tile-title">יומן</div>
          <div class="dash-tile-sub">${todayEvents.length ? todayEvents.length + ' אירועים היום' : 'אין אירועים היום'}</div>
        </div>
      </div>

      <div class="dash-tile" data-action="nav" data-to="calendar" data-tab="meals">
        <div class="dash-tile-icon">🍽️</div>
        <div class="dash-tile-info">
          <div class="dash-tile-title">ארוחות היום</div>
          <div class="dash-tile-sub">${todayMeals.map(m => m.type === 'lunch' ? '🌤️ ' + m.description : '🌙 ' + m.description).join(' · ') || 'לא תוכנן'}</div>
        </div>
      </div>

      <div class="dash-tile" data-action="nav" data-to="more" data-tab="tasks">
        <div class="dash-tile-icon">📋</div>
        <div class="dash-tile-info">
          <div class="dash-tile-title">משימות הורים</div>
          <div class="dash-tile-sub">${undoneTasks ? undoneTasks + ' משימות פתוחות' : 'הכל בוצע ✓'}</div>
        </div>
      </div>

      <div class="dash-tile" data-action="nav" data-to="more" data-tab="messages">
        <div class="dash-tile-icon">📌</div>
        <div class="dash-tile-info">
          <div class="dash-tile-title">הודעות</div>
          <div class="dash-tile-sub">${pinnedMsgs.length ? '📌 ' + pinnedMsgs[0].text.slice(0,25) : state.messages.length ? state.messages[0].text.slice(0,25) : 'אין הודעות'}</div>
        </div>
      </div>
    </div>

    ${state.kids.length > 0 ? `
      <div class="section-title" style="margin-top:20px">🕵️ סוכנים</div>
      <div class="kids-scroll">
        ${state.kids.map(k => `
          <div class="kid-mini" data-action="open-kid" data-kid-id="${k.id}">
            <span class="kid-mini-icon">${k.icon}</span>
            <span class="kid-mini-name">${k.name}</span>
            <span class="kid-mini-pts">⭐${k.points}</span>
          </div>
        `).join('')}
      </div>
    ` : ''}
  </div>`;
}

// ==================== Rewards (Kids List) ====================

function renderRewards() {
  if (state.kids.length === 0) {
    return `<div class="screen-content"><div class="welcome">
      <div class="welcome-logo">🕵️</div><h2>!ברוכים הבאים</h2>
      <h3 style="color:var(--gold);font-weight:900;margin-bottom:8px">Mission Impossipoints</h3>
      <p>משימות בלתי אפשריות מתחילות כאן!<br>הוסיפו את הסוכנים הראשונים שלכם</p>
      <button class="btn btn-gold" data-action="nav" data-to="more" data-tab="parent">🔐 מרכז הפיקוד</button>
    </div></div>`;
  }
  return `<div class="screen-content">
    <div class="section-title">🕵️ הסוכנים</div>
    <div class="kids-grid">
      ${state.kids.map(kid => `
        <div class="card kid-card" data-action="open-kid" data-kid-id="${kid.id}">
          <div class="card-row">
            <div class="card-icon">${kid.icon}</div>
            <div class="card-info"><div class="card-name">${kid.name}</div><div class="card-sub">סוכן/ת מיוחד/ת</div></div>
            <div class="card-badge">⭐ ${kid.points}</div>
          </div>
        </div>
      `).join('')}
    </div>
    <div class="section-title" style="margin-top:20px">🎁 חנות הפרסים</div>
    ${state.kids.length === 1
      ? `<button class="btn btn-gold" data-action="open-shop-single">🎁 פתח חנות</button>`
      : state.kids.map(kid => `
        <button class="btn btn-outline" style="margin-bottom:8px" data-action="open-shop-kid" data-kid-id="${kid.id}">${kid.icon} חנות של ${kid.name}</button>
      `).join('')}
  </div>`;
}

// ==================== Kid Screen ====================

async function renderKid() {
  const kid = state.kids.find(k => k.id === state.kidId);
  if (!kid) return renderRewards();
  state.history = await Store.getKidHistory(kid.id);
  const pendingIds = state.pending.filter(p => p.kidId === kid.id && p.type === 'chore').map(p => p.itemId);

  return `<div class="screen-content">
    <div class="points-display"><div class="points-number">${kid.points}</div><div class="points-label">⭐ נקודות</div></div>
    <div class="section-title">🎯 משימות</div>
    ${state.chores.filter(c => c.active !== false).map(chore => {
      const isPending = pendingIds.includes(chore.id);
      const isSpecial = chore.id === state.dailySpecialId;
      const pts = isSpecial ? chore.points + DAILY_BONUS : chore.points;
      return `<div class="mission-item ${isSpecial ? 'daily-special' : ''}">
        ${isSpecial ? '<div class="daily-badge">🌟 משימת היום! +' + DAILY_BONUS + ' בונוס</div>' : ''}
        <div class="mission-info"><div class="mission-name">${chore.name}</div><div class="mission-points">+${pts} נקודות${isSpecial ? ' ⚡' : ''}</div></div>
        ${isPending ? `<span class="mission-btn pending">ממתין ⏳</span>` : `<button class="mission-btn" data-action="complete-chore" data-chore-id="${chore.id}">בוצע! ✓</button>`}
      </div>`;
    }).join('')}
    <button class="btn btn-gold" style="margin-top:16px" data-action="go-shop-kid">🎁 חנות הפרסים</button>
    ${state.history.length > 0 ? `<div class="section-title" style="margin-top:24px">📋 היסטוריה</div>
      ${state.history.slice(0,15).map(h => `<div class="history-item">
        <span class="history-icon">${h.type==='chore'?'🎯':'🎁'}</span>
        <div class="history-info">${h.itemName}<span style="color:var(--text-dim)"> · ${h.type==='chore'?'+':'-'}${h.points}</span></div>
        <span class="history-status status-${h.status}">${h.status==='approved'?'✓ אושר':h.status==='pending'?'⏳ ממתין':'✗ נדחה'}</span>
      </div>`).join('')}` : ''}
  </div>`;
}

function renderShopKid() {
  const kid = state.kids.find(k => k.id === state.kidId);
  if (!kid) return renderRewards();
  return `<div class="screen-content">
    <div class="points-display"><div class="points-number">${kid.points}</div><div class="points-label">⭐ הנקודות של ${kid.name}</div></div>
    <div class="section-title">🎁 פרסים</div>
    ${state.prizes.filter(p => p.active !== false).map(prize => {
      const canAfford = kid.points >= prize.cost;
      return `<div class="prize-item">
        <span class="prize-icon">🏆</span>
        <div class="prize-info"><div class="prize-name">${prize.name}</div><div class="prize-cost">${prize.cost} נקודות</div></div>
        <button class="prize-btn" data-action="redeem-prize" data-prize-id="${prize.id}" ${!canAfford?'disabled':''}>${canAfford?'לממש! 🎉':'לא מספיק'}</button>
      </div>`;
    }).join('')}
  </div>`;
}

// ==================== Shopping List ====================

function renderShopping() {
  const unchecked = state.shoppingItems.filter(i => !i.checked);
  const checked = state.shoppingItems.filter(i => i.checked);
  const grouped = {};
  unchecked.forEach(item => {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  });
  const existingNames = state.shoppingItems.map(i => i.name);
  const activeTab = state.shopTab || 'list';

  return `<div class="screen-content">
    <div class="shop-tabs">
      <button class="shop-tab ${activeTab==='list'?'active':''}" data-action="shop-tab" data-tab="list">🛒 הרשימה ${unchecked.length?'('+unchecked.length+')':''}</button>
      <button class="shop-tab ${activeTab==='add'?'active':''}" data-action="shop-tab" data-tab="add">➕ הוסף מוצרים</button>
    </div>

    ${activeTab === 'add' ? renderShopPresets(existingNames) : renderShopList(grouped, checked, unchecked)}
  </div>`;
}

function renderShopList(grouped, checked, unchecked) {
  return `
    <div class="quick-add">
      <input class="form-input" id="shop-input" type="text" placeholder="הוסף פריט ידנית..." style="flex:1">
      <select class="form-select" id="shop-cat">
        ${SHOP_CATS.map(c => `<option value="${c.id}">${c.icon}</option>`).join('')}
      </select>
      <button class="btn btn-gold btn-sm" data-action="add-shop-item" style="width:auto">➕</button>
    </div>

    ${unchecked.length === 0 && checked.length === 0 ? `
      <div class="empty-state"><div class="empty-icon">🛒</div><div class="empty-text">הרשימה ריקה<br><small style="color:var(--text-dim)">לחצו על "הוסף מוצרים" לבחירה מהירה</small></div></div>
    ` : ''}

    ${SHOP_CATS.filter(c => grouped[c.id]).map(cat => `
      <div class="section-title">${cat.icon} ${cat.name}</div>
      ${grouped[cat.id].map(item => `
        <div class="shop-item" data-action="toggle-shop" data-id="${item.id}">
          <span class="shop-check">☐</span>
          <span class="shop-name">${item.name}</span>
          <button class="manage-btn manage-btn-delete" data-action="delete-shop" data-id="${item.id}">🗑️</button>
        </div>
      `).join('')}
    `).join('')}

    ${checked.length > 0 ? `
      <div class="section-title" style="opacity:0.5">✓ נלקחו (${checked.length})</div>
      ${checked.map(item => `
        <div class="shop-item checked" data-action="toggle-shop" data-id="${item.id}">
          <span class="shop-check">☑</span>
          <span class="shop-name">${item.name}</span>
        </div>
      `).join('')}
      <button class="btn btn-outline btn-sm" style="margin-top:8px" data-action="clear-checked">🗑️ נקה פריטים שנלקחו</button>
    ` : ''}
  `;
}

function renderShopPresets(existingNames) {
  return SHOP_CATS.filter(c => SHOP_PRESETS[c.id]).map(cat => `
    <div class="section-title">${cat.icon} ${cat.name}</div>
    <div class="preset-grid">
      ${SHOP_PRESETS[cat.id].map(name => {
        const inList = existingNames.includes(name);
        return `<button class="preset-chip ${inList?'in-list':''}" data-action="add-preset" data-name="${name}" data-cat="${cat.id}" ${inList?'disabled':''}>${inList?'✓ ':''} ${name}</button>`;
      }).join('')}
    </div>
  `).join('');
}

// ==================== Calendar ====================

function renderCalendar() {
  const today = new Date();
  const viewDate = state.calendarDate;
  const startOfWeek = new Date(viewDate);
  startOfWeek.setDate(viewDate.getDate() - viewDate.getDay());
  const weekDays = Array.from({length:7}, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  return `<div class="screen-content">
    <div class="parent-tabs" style="margin-bottom:8px">
      <button class="parent-tab ${state.calendarTab==='events'?'active':''}" data-action="cal-tab" data-tab="events">📅 אירועים</button>
      <button class="parent-tab ${state.calendarTab==='meals'?'active':''}" data-action="cal-tab" data-tab="meals">🍽️ ארוחות</button>
    </div>

    <div class="cal-nav">
      <button class="cal-arrow" data-action="cal-prev">→</button>
      <span class="cal-month">${MONTHS_HE[viewDate.getMonth()]} ${viewDate.getFullYear()}</span>
      <button class="cal-arrow" data-action="cal-next">←</button>
    </div>

    <div class="cal-week">
      ${weekDays.map(d => {
        const ds = dateStr(d);
        const isToday = ds === todayStr();
        const hasEvents = state.events.some(e => e.date === ds);
        const hasMeals = state.meals.some(m => m.date === ds);
        return `<div class="cal-day ${isToday ? 'today' : ''}" data-action="cal-select" data-date="${ds}">
          <div class="cal-day-name">${DAYS_HE[d.getDay()].slice(0,2)}׳</div>
          <div class="cal-day-num">${d.getDate()}</div>
          ${hasEvents || hasMeals ? '<div class="cal-day-dot"></div>' : ''}
        </div>`;
      }).join('')}
    </div>

    ${state.calendarTab === 'events' ? renderCalendarEvents() : renderCalendarMeals(weekDays)}
  </div>`;
}

function renderCalendarEvents() {
  const ds = dateStr(state.calendarDate);
  const dayEvents = state.events.filter(e => e.date === ds).sort((a,b) => (a.time||'').localeCompare(b.time||''));

  return `
    <div class="section-title">📅 ${formatDate(ds)}</div>
    ${dayEvents.length === 0 ? '<div class="empty-state" style="padding:20px"><div class="empty-text">אין אירועים ביום זה</div></div>' : ''}
    ${dayEvents.map(ev => `
      <div class="event-item" style="border-right-color:${ev.color || '#f0a500'}">
        <div class="event-info">
          <div class="event-title">${ev.title}</div>
          <div class="event-meta">${ev.time || 'כל היום'}${ev.member ? ' · ' + ev.member : ''}</div>
        </div>
        <button class="manage-btn manage-btn-delete" data-action="delete-event" data-id="${ev.id}">🗑️</button>
      </div>
    `).join('')}
    <button class="btn btn-gold" style="margin-top:12px" data-action="add-event">➕ הוסף אירוע</button>
  `;
}

function renderCalendarMeals(weekDays) {
  return `
    <div class="section-title">🍽️ ארוחות השבוע</div>
    ${weekDays.map(d => {
      const ds = dateStr(d);
      const lunch = state.meals.find(m => m.date === ds && m.type === 'lunch');
      const dinner = state.meals.find(m => m.date === ds && m.type === 'dinner');
      const isToday = ds === todayStr();
      return `<div class="meal-day ${isToday ? 'meal-today' : ''}">
        <div class="meal-day-name">${DAYS_HE[d.getDay()]}׳ ${d.getDate()}/${d.getMonth()+1}</div>
        <div class="meal-slots">
          <div class="meal-slot" data-action="set-meal" data-date="${ds}" data-type="lunch">
            <span class="meal-type">🌤️</span>
            <span class="meal-desc">${lunch ? lunch.description : '—'}</span>
          </div>
          <div class="meal-slot" data-action="set-meal" data-date="${ds}" data-type="dinner">
            <span class="meal-type">🌙</span>
            <span class="meal-desc">${dinner ? dinner.description : '—'}</span>
          </div>
        </div>
      </div>`;
    }).join('')}
  `;
}

// ==================== More Menu ====================

function renderMore() {
  const tabs = [
    { id:'tasks', label:'משימות', icon:'📋' },
    { id:'messages', label:'הודעות', icon:'📌' },
    { id:'parent', label:'מרכז פיקוד', icon:'🔐' }
  ];
  let content = '';
  switch(state.moreTab) {
    case 'tasks': content = renderTasks(); break;
    case 'messages': content = renderMessages(); break;
    case 'parent': content = state.parentUnlocked ? '' : ''; break;
  }

  if (state.moreTab === 'parent') {
    if (!state.parentUnlocked) { navigate('pin'); return ''; }
    return renderParentSync();
  }

  return `<div class="screen-content">
    <div class="parent-tabs">
      ${tabs.map(t => `<button class="parent-tab ${state.moreTab===t.id?'active':''}" data-action="more-tab" data-tab="${t.id}">${t.icon} ${t.label}</button>`).join('')}
    </div>
    ${content}
  </div>`;
}

// ==================== Parent Tasks ====================

function renderTasks() {
  const undone = state.tasks.filter(t => !t.done).sort((a,b) => {
    const p = {high:0,normal:1,low:2};
    return (p[a.priority]||1) - (p[b.priority]||1);
  });
  const done = state.tasks.filter(t => t.done);

  return `
    <div class="quick-add">
      <input class="form-input" id="task-input" type="text" placeholder="משימה חדשה..." style="flex:1">
      <button class="btn btn-gold btn-sm" data-action="add-task-quick" style="width:auto">➕</button>
    </div>
    ${undone.length === 0 && done.length === 0 ? '<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-text">אין משימות</div></div>' : ''}
    ${undone.map(t => `
      <div class="task-item">
        <button class="task-check" data-action="toggle-task" data-id="${t.id}">☐</button>
        <div class="task-info">
          <div class="task-title">${t.title}</div>
          <div class="task-meta">${PRIORITY[t.priority]||''}${t.assignedTo?' · '+t.assignedTo:''}${t.dueDate?' · '+t.dueDate:''}</div>
        </div>
        <button class="manage-btn manage-btn-delete" data-action="delete-task" data-id="${t.id}">🗑️</button>
      </div>
    `).join('')}
    ${done.length > 0 ? `
      <div class="section-title" style="opacity:0.5;margin-top:16px">✓ הושלמו (${done.length})</div>
      ${done.map(t => `
        <div class="task-item done">
          <button class="task-check" data-action="toggle-task" data-id="${t.id}">☑</button>
          <div class="task-info"><div class="task-title">${t.title}</div></div>
          <button class="manage-btn manage-btn-delete" data-action="delete-task" data-id="${t.id}">🗑️</button>
        </div>
      `).join('')}
    ` : ''}
  `;
}

// ==================== Family Messages ====================

function renderMessages() {
  const pinned = state.messages.filter(m => m.pinned);
  const others = state.messages.filter(m => !m.pinned);

  return `
    <div class="quick-add">
      <input class="form-input" id="msg-input" type="text" placeholder="הודעה חדשה..." style="flex:1">
      <button class="btn btn-gold btn-sm" data-action="add-message" style="width:auto">📩</button>
    </div>
    ${state.messages.length === 0 ? '<div class="empty-state"><div class="empty-icon">📌</div><div class="empty-text">אין הודעות</div></div>' : ''}
    ${pinned.map(m => `
      <div class="msg-item pinned">
        <span class="msg-pin">📌</span>
        <div class="msg-text">${m.text}</div>
        <div class="msg-actions">
          <button class="manage-btn manage-btn-edit" data-action="unpin-msg" data-id="${m.id}">📌</button>
          <button class="manage-btn manage-btn-delete" data-action="delete-msg" data-id="${m.id}">🗑️</button>
        </div>
      </div>
    `).join('')}
    ${others.map(m => `
      <div class="msg-item">
        <span class="msg-author">${m.author}</span>
        <div class="msg-text">${m.text}</div>
        <div class="msg-actions">
          <button class="manage-btn manage-btn-edit" data-action="pin-msg" data-id="${m.id}">📌</button>
          <button class="manage-btn manage-btn-delete" data-action="delete-msg" data-id="${m.id}">🗑️</button>
        </div>
      </div>
    `).join('')}
  `;
}

// ==================== PIN Screen ====================

let pinValue = '';

function renderPin() {
  return `<div class="pin-screen">
    <div class="pin-title">${state.pinSetupMode ? '🔐 בחרו קוד סודי' : '🔐 הכניסו קוד סודי'}</div>
    <div class="pin-subtitle">${state.pinSetupMode ? 'קוד 4 ספרות לגישת הורים' : 'רק הורים יכולים להיכנס'}</div>
    <div class="pin-dots">
      ${[0,1,2,3].map(i => `<div class="pin-dot ${pinValue.length > i ? 'filled' : ''}"></div>`).join('')}
    </div>
    <div class="pin-error" id="pin-error"></div>
    <div class="pin-pad">
      ${[1,2,3,4,5,6,7,8,9].map(n => `<button class="pin-key" data-digit="${n}">${n}</button>`).join('')}
      <button class="pin-key empty"></button>
      <button class="pin-key" data-digit="0">0</button>
      <button class="pin-key backspace" data-digit="back">⌫</button>
    </div>
  </div>`;
}

function setupPinPad() {
  pinValue = '';
  document.querySelectorAll('.pin-key').forEach(key => {
    key.addEventListener('click', () => handlePinKey(key.dataset.digit));
  });
}

async function handlePinKey(digit) {
  if (digit === 'back') { pinValue = pinValue.slice(0,-1); playSound('tap'); }
  else if (pinValue.length < 4) { pinValue += digit; playSound('pin'); }
  document.querySelectorAll('.pin-dot').forEach((dot, i) => dot.classList.toggle('filled', i < pinValue.length));
  if (pinValue.length === 4) {
    if (state.pinSetupMode) {
      await Store.setPin(pinValue);
      state.pinSetupMode = false;
      state.parentUnlocked = true;
      playSound('success');
      toast('✓ הקוד הסודי נשמר');
      state.moreTab = 'parent';
      navigate('parent');
    } else {
      const correctPin = await Store.getPin();
      if (pinValue === correctPin) {
        playSound('success');
        state.parentUnlocked = true;
        state.moreTab = 'parent';
        navigate('parent');
      } else {
        playSound('error');
        document.getElementById('pin-error').textContent = 'קוד שגוי, נסו שוב';
        pinValue = '';
        document.querySelectorAll('.pin-dot').forEach(d => d.classList.remove('filled'));
        setTimeout(() => { const e = document.getElementById('pin-error'); if(e) e.textContent=''; }, 2000);
      }
    }
  }
}

// ==================== Parent Panel ====================

async function renderParentSync() {
  await loadData();
  return renderParentFull();
}

async function renderParentFull() {
  const main = document.getElementById('main');
  main.innerHTML = await renderParentInner();
  attachEvents();
  return '';
}

async function renderParent() {
  if (!state.parentUnlocked) { navigate('pin'); return ''; }
  await loadData();
  return renderParentInner();
}

async function renderParentInner() {
  const tabs = [
    { id:'approve', label:`אישור (${state.pending.length})`, icon:'✓' },
    { id:'kids', label:'ילדים', icon:'👤' },
    { id:'chores', label:'משימות', icon:'🎯' },
    { id:'prizes', label:'פרסים', icon:'🎁' },
    { id:'points', label:'נקודות', icon:'⭐' },
    { id:'weekly', label:'שבועי', icon:'📊' },
    { id:'settings', label:'הגדרות', icon:'⚙️' }
  ];
  let content = '';
  switch(state.parentTab) {
    case 'approve': content = renderParentApprove(); break;
    case 'kids': content = renderParentKids(); break;
    case 'chores': content = renderParentChores(); break;
    case 'prizes': content = renderParentPrizes(); break;
    case 'points': content = renderParentPoints(); break;
    case 'weekly': content = await renderParentWeekly(); break;
    case 'settings': content = renderParentSettings(); break;
  }
  return `<div class="screen-content">
    <div class="parent-tabs">${tabs.map(t => `<button class="parent-tab ${state.parentTab===t.id?'active':''}" data-action="parent-tab" data-tab="${t.id}">${t.icon} ${t.label}</button>`).join('')}</div>
    ${content}
  </div>`;
}

function renderParentApprove() {
  if (!state.pending.length) return '<div class="empty-state"><div class="empty-icon">✓</div><div class="empty-text">אין משימות ממתינות לאישור</div></div>';
  return state.pending.map(p => `<div class="pending-card">
    <div class="pending-top"><span class="pending-kid">${p.kidName}</span><span class="pending-mission">${p.itemName}</span><span class="pending-points">+${p.points} ⭐</span></div>
    <div class="btn-row">
      <button class="btn btn-success btn-sm" data-action="approve" data-id="${p.id}" data-kid-id="${p.kidId}" data-points="${p.points}">✓ אשר</button>
      <button class="btn btn-danger btn-sm" data-action="reject" data-id="${p.id}">✗ דחה</button>
    </div>
  </div>`).join('');
}

function renderParentKids() {
  return `${state.kids.map(kid => `<div class="manage-item">
    <span style="font-size:1.5rem">${kid.icon}</span>
    <div class="manage-item-info"><div class="manage-item-name">${kid.name}</div><div class="manage-item-detail">${kid.points} נקודות</div></div>
    <div class="manage-actions">
      <button class="manage-btn manage-btn-edit" data-action="edit-kid" data-kid-id="${kid.id}">✏️</button>
      <button class="manage-btn manage-btn-delete" data-action="delete-kid" data-kid-id="${kid.id}">🗑️</button>
    </div>
  </div>`).join('')}
  <button class="btn btn-gold" style="margin-top:12px" data-action="add-kid">➕ הוסף ילד/ה</button>`;
}

function renderParentChores() {
  return `${state.chores.map(c => `<div class="manage-item">
    <span style="font-size:1.2rem">🎯</span>
    <div class="manage-item-info"><div class="manage-item-name">${c.name}</div><div class="manage-item-detail">${c.points} נקודות</div></div>
    <div class="manage-actions">
      <button class="manage-btn manage-btn-edit" data-action="edit-chore" data-chore-id="${c.id}">✏️</button>
      <button class="manage-btn manage-btn-delete" data-action="delete-chore" data-chore-id="${c.id}">🗑️</button>
    </div>
  </div>`).join('')}
  <button class="btn btn-gold" style="margin-top:12px" data-action="add-chore">➕ הוסף משימה</button>`;
}

function renderParentPrizes() {
  return `${state.prizes.map(p => `<div class="manage-item">
    <span style="font-size:1.2rem">🏆</span>
    <div class="manage-item-info"><div class="manage-item-name">${p.name}</div><div class="manage-item-detail">${p.cost} נקודות</div></div>
    <div class="manage-actions">
      <button class="manage-btn manage-btn-edit" data-action="edit-prize" data-prize-id="${p.id}">✏️</button>
      <button class="manage-btn manage-btn-delete" data-action="delete-prize" data-prize-id="${p.id}">🗑️</button>
    </div>
  </div>`).join('')}
  <button class="btn btn-gold" style="margin-top:12px" data-action="add-prize">➕ הוסף פרס</button>`;
}

function renderParentPoints() {
  if (!state.kids.length) return '<div class="empty-state"><div class="empty-icon">👤</div><div class="empty-text">הוסיפו ילדים קודם</div></div>';
  return `<div class="section-title">⭐ הוסף / הפחת נקודות</div>
    ${state.kids.map(kid => `<div class="manage-item" style="flex-wrap:wrap;gap:8px">
      <span style="font-size:1.5rem">${kid.icon}</span>
      <div class="manage-item-info"><div class="manage-item-name">${kid.name}</div><div class="manage-item-detail">${kid.points} נקודות</div></div>
      <div class="btn-row" style="width:100%">
        <button class="btn btn-success btn-sm" data-action="adjust-points" data-kid-id="${kid.id}" data-amount="10">+10</button>
        <button class="btn btn-success btn-sm" data-action="adjust-points" data-kid-id="${kid.id}" data-amount="25">+25</button>
        <button class="btn btn-danger btn-sm" data-action="adjust-points" data-kid-id="${kid.id}" data-amount="-10">-10</button>
        <button class="btn btn-outline btn-sm" data-action="custom-points" data-kid-id="${kid.id}">מותאם</button>
      </div>
      <button class="btn btn-danger btn-sm" style="width:100%;margin-top:4px;opacity:0.8" data-action="reset-kid-points" data-kid-id="${kid.id}" data-kid-name="${kid.name}">🔄 אפס נקודות של ${kid.name}</button>
    </div>`).join('')}
    ${state.kids.length > 1 ? `
      <button class="btn btn-danger" style="margin-top:16px;width:100%" data-action="reset-all-points">🔄 אפס נקודות לכל הילדים</button>
    ` : ''}`;
}

async function renderParentWeekly() {
  const { start, end } = getWeekRange(state.weekOffset);
  const weekHistory = await Store.getWeekHistory(start, end);

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }

  const isThisWeek = state.weekOffset === 0;
  const weekLabel = isThisWeek ? 'השבוע הנוכחי' : `${start.getDate()}/${start.getMonth()+1} - ${end.getDate()}/${end.getMonth()+1}`;

  return `
    <div class="week-nav">
      <button class="btn btn-outline btn-sm" data-action="week-prev">→ שבוע קודם</button>
      <span class="week-label">${weekLabel}</span>
      <button class="btn btn-outline btn-sm" data-action="week-next" ${isThisWeek?'disabled':''}>שבוע הבא ←</button>
    </div>
    ${state.kids.map(kid => {
      const kidHistory = weekHistory.filter(h => h.kidId === kid.id && h.type === 'chore');
      const weekTotal = kidHistory.length;
      const totalPoints = kidHistory.reduce((s,h) => s + (h.points||0), 0);
      return `
        <div class="week-kid-card">
          <div class="week-kid-header">
            <span class="week-kid-avatar">${kid.icon}</span>
            <span class="week-kid-name">${kid.name}</span>
            <span class="week-kid-summary">${weekTotal} משימות · ${totalPoints} ⭐</span>
          </div>
          <div class="week-days-grid">
            ${days.map((d, i) => {
              const dayStr = dateStr(d);
              const isToday = dayStr === todayStr();
              const dayTasks = kidHistory.filter(h =>
                h.createdAt && dateStr(h.createdAt.toDate ? h.createdAt.toDate() : new Date(h.createdAt)) === dayStr
              );
              return `
                <div class="week-day-col ${isToday?'week-today':''}">
                  <div class="week-day-label">${DAYS_HE[i]}׳ <small>${d.getDate()}/${d.getMonth()+1}</small></div>
                  ${dayTasks.length === 0
                    ? '<div class="week-day-empty">—</div>'
                    : dayTasks.map(t => `<div class="week-task-chip">🎯 ${t.itemName} <span class="week-task-pts">+${t.points}</span></div>`).join('')
                  }
                </div>`;
            }).join('')}
          </div>
        </div>`;
    }).join('')}
  `;
}

function renderParentSettings() {
  const dailyChore = state.chores.find(c => c.id === state.dailySpecialId);
  return `<div class="section-title">🌟 משימת היום</div>
    <div class="manage-item" style="flex-wrap:wrap;gap:8px">
      <span style="font-size:1.5rem">🌟</span>
      <div class="manage-item-info">
        <div class="manage-item-name">${dailyChore ? dailyChore.name : 'לא נבחרה'}</div>
        <div class="manage-item-detail">+${DAILY_BONUS} נקודות בונוס · מתחלף אוטומטית כל יום</div>
      </div>
    </div>
    <div class="section-title" style="margin-top:8px">🔄 שנה משימת היום</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px">
      ${state.chores.filter(c => c.active !== false).map(c => `
        <button class="preset-chip ${c.id===state.dailySpecialId?'in-list':''}" data-action="set-daily-special" data-chore-id="${c.id}">${c.id===state.dailySpecialId?'✓ ':''}${c.name}</button>
      `).join('')}
    </div>
    <div class="section-title">⚙️ הגדרות</div>
    <button class="btn btn-outline" style="margin-bottom:10px" data-action="change-pin">🔐 שנה קוד סודי</button>
    <button class="btn btn-outline" data-action="lock-parent">🔒 נעל מרכז פיקוד</button>`;
}

// ==================== Event Delegation ====================

function attachEvents() {
  const main = document.getElementById('main');
  main.removeEventListener('click', handleClick);
  main.addEventListener('click', handleClick);
}

async function handleClick(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;

  switch(action) {
    // Navigation
    case 'nav': {
      const tab = btn.dataset.tab;
      if (tab === 'meals') state.calendarTab = 'meals';
      else if (tab === 'tasks') state.moreTab = 'tasks';
      else if (tab === 'messages') state.moreTab = 'messages';
      else if (tab === 'parent') { state.moreTab = 'parent'; if (!state.parentUnlocked) { navigate('pin'); return; } }
      navigate(btn.dataset.to);
      break;
    }
    case 'more-tab': state.moreTab = btn.dataset.tab;
      if (btn.dataset.tab === 'parent' && !state.parentUnlocked) { navigate('pin'); return; }
      if (btn.dataset.tab === 'parent') { navigate('parent'); return; }
      render(); break;

    // Kids / Rewards
    case 'open-kid': state.kidId = btn.dataset.kidId; navigate('kid'); break;
    case 'open-shop-kid': state.kidId = btn.dataset.kidId; navigate('shop-kid'); break;
    case 'open-shop-single': state.kidId = state.kids[0].id; navigate('shop-kid'); break;
    case 'go-shop-kid': navigate('shop-kid'); break;

    case 'complete-chore': {
      const chore = state.chores.find(c => c.id === btn.dataset.choreId);
      const kid = state.kids.find(k => k.id === state.kidId);
      if (chore && kid) {
        const isSpecial = chore.id === state.dailySpecialId;
        const pts = isSpecial ? chore.points + DAILY_BONUS : chore.points;
        await Store.addRequest(kid.id, kid.name, chore.id, chore.name, 'chore', pts);
        await loadData(); celebrate('stars');
        toast(isSpecial ? `🌟 משימת היום! +${pts} נקודות (כולל בונוס!)` : '✓ נשלח לאישור ההורים');
        render();
      } break;
    }
    case 'redeem-prize': {
      const prize = state.prizes.find(p => p.id === btn.dataset.prizeId);
      const kid = state.kids.find(k => k.id === state.kidId);
      if (prize && kid && kid.points >= prize.cost) {
        await Store.addRequest(kid.id, kid.name, prize.id, prize.name, 'redeem', prize.cost);
        await Store.addPoints(kid.id, -prize.cost);
        await loadData(); celebrate('big'); toast(`🎉 ${kid.name} מימש/ה: ${prize.name}`); render();
      } break;
    }

    // Parent Panel
    case 'parent-tab': state.parentTab = btn.dataset.tab; render(); break;
    case 'approve':
      await Store.approveRequest(btn.dataset.id, btn.dataset.kidId, Number(btn.dataset.points));
      await loadData(); celebrate('stars'); toast('✓ אושר!'); render(); break;
    case 'reject':
      await Store.rejectRequest(btn.dataset.id);
      await loadData(); playSound('reject'); toast('✗ נדחה'); render(); break;
    case 'add-kid': showKidModal(); break;
    case 'edit-kid': showKidModal(btn.dataset.kidId); break;
    case 'delete-kid':
      if (confirm('למחוק את הילד/ה?')) { await Store.deleteKid(btn.dataset.kidId); await loadData(); toast('נמחק'); render(); } break;
    case 'add-chore': showChoreModal(); break;
    case 'edit-chore': showChoreModal(btn.dataset.choreId); break;
    case 'delete-chore':
      if (confirm('למחוק?')) { await Store.deleteChore(btn.dataset.choreId); await loadData(); render(); } break;
    case 'add-prize': showPrizeModal(); break;
    case 'edit-prize': showPrizeModal(btn.dataset.prizeId); break;
    case 'delete-prize':
      if (confirm('למחוק?')) { await Store.deletePrize(btn.dataset.prizeId); await loadData(); render(); } break;
    case 'adjust-points': {
      const amt = Number(btn.dataset.amount);
      await Store.addPoints(btn.dataset.kidId, amt);
      await loadData(); toast(`${amt>0?'+':''}${amt} נקודות`); render(); break;
    }
    case 'custom-points': showCustomPointsModal(btn.dataset.kidId); break;
    case 'reset-kid-points': {
      if (confirm(`לאפס את הנקודות של ${btn.dataset.kidName} ל-0?`)) {
        await Store.updateKid(btn.dataset.kidId, { points: 0 });
        await loadData(); toast(`🔄 הנקודות של ${btn.dataset.kidName} אופסו`); render();
      } break;
    }
    case 'reset-all-points': {
      if (confirm('לאפס את הנקודות של כל הילדים ל-0?')) {
        for (const kid of state.kids) { await Store.updateKid(kid.id, { points: 0 }); }
        await loadData(); toast('🔄 כל הנקודות אופסו'); render();
      } break;
    }
    case 'set-daily-special': {
      await Store.setDailySpecial(btn.dataset.choreId, todayStr());
      state.dailySpecialId = btn.dataset.choreId;
      const name = state.chores.find(c => c.id === btn.dataset.choreId)?.name;
      toast(`🌟 משימת היום: ${name}`); render(); break;
    }
    case 'week-prev': state.weekOffset--; render(); break;
    case 'week-next': if (state.weekOffset < 0) { state.weekOffset++; render(); } break;
    case 'change-pin': state.pinSetupMode = true; navigate('pin'); break;
    case 'lock-parent': state.parentUnlocked = false; navigate('dashboard'); toast('🔒 מרכז הפיקוד ננעל'); break;

    // Shopping
    case 'shop-tab': state.shopTab = btn.dataset.tab; render(); break;
    case 'add-shop-item': {
      const input = document.getElementById('shop-input');
      const cat = document.getElementById('shop-cat').value;
      if (input.value.trim()) {
        await Store.addShoppingItem(input.value.trim(), cat);
        await loadData(); input.value = ''; playSound('tap'); render();
      } break;
    }
    case 'add-preset': {
      await Store.addShoppingItem(btn.dataset.name, btn.dataset.cat);
      await loadData(); playSound('tap');
      btn.classList.add('in-list'); btn.disabled = true; btn.textContent = '✓ ' + btn.dataset.name;
      break;
    }
    case 'toggle-shop': {
      const item = state.shoppingItems.find(i => i.id === btn.dataset.id);
      if (item) { await Store.toggleShoppingItem(item.id, !item.checked); await loadData(); playSound('tap'); render(); } break;
    }
    case 'delete-shop':
      await Store.deleteShoppingItem(btn.dataset.id); await loadData(); render(); break;
    case 'clear-checked':
      await Store.clearCheckedItems(); await loadData(); toast('✓ נוקה'); render(); break;

    // Tasks
    case 'add-task-quick': {
      const ti = document.getElementById('task-input');
      if (ti.value.trim()) {
        await Store.addTask(ti.value.trim()); await loadData(); ti.value=''; playSound('tap'); render();
      } break;
    }
    case 'toggle-task': {
      const task = state.tasks.find(t => t.id === btn.dataset.id);
      if (task) { await Store.toggleTask(task.id, !task.done); await loadData(); playSound(task.done?'tap':'chore'); render(); } break;
    }
    case 'delete-task':
      await Store.deleteTask(btn.dataset.id); await loadData(); render(); break;

    // Messages
    case 'add-message': {
      const mi = document.getElementById('msg-input');
      if (mi.value.trim()) {
        await Store.addMessage(mi.value.trim()); await loadData(); mi.value=''; playSound('tap'); render();
      } break;
    }
    case 'pin-msg': await Store.togglePinMessage(btn.dataset.id, true); await loadData(); render(); break;
    case 'unpin-msg': await Store.togglePinMessage(btn.dataset.id, false); await loadData(); render(); break;
    case 'delete-msg': await Store.deleteMessage(btn.dataset.id); await loadData(); render(); break;

    // Calendar
    case 'cal-tab': state.calendarTab = btn.dataset.tab; render(); break;
    case 'cal-prev': state.calendarDate.setDate(state.calendarDate.getDate()-7); render(); break;
    case 'cal-next': state.calendarDate.setDate(state.calendarDate.getDate()+7); render(); break;
    case 'cal-select': state.calendarDate = new Date(btn.dataset.date + 'T00:00:00'); render(); break;
    case 'add-event': showEventModal(); break;
    case 'delete-event': await Store.deleteEvent(btn.dataset.id); await loadData(); render(); break;
    case 'set-meal': showMealModal(btn.dataset.date, btn.dataset.type); break;
  }
}

// ==================== Modals ====================

function showModal(html) {
  const overlay = document.getElementById('modal-overlay');
  overlay.querySelector('#modal').innerHTML = html;
  overlay.classList.remove('hidden');
  overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };
}
function closeModal() { document.getElementById('modal-overlay').classList.add('hidden'); }

function showKidModal(kidId) {
  const kid = kidId ? state.kids.find(k => k.id === kidId) : null;
  let chosenIcon = kid ? kid.icon : AVATARS[0];
  showModal(`<div class="modal-title">${kid?'ערוך ילד/ה':'הוסף ילד/ה'}</div>
    <div class="form-group"><label class="form-label">שם</label><input class="form-input" id="modal-name" type="text" placeholder="שם הילד/ה" value="${kid?kid.name:''}"></div>
    <div class="form-group"><label class="form-label">אייקון</label><div class="icon-picker">${AVATARS.map(i=>`<div class="icon-option ${i===chosenIcon?'selected':''}" data-icon="${i}">${i}</div>`).join('')}</div></div>
    <div class="btn-row" style="margin-top:20px"><button class="btn btn-gold" id="modal-save">💾 שמור</button><button class="btn btn-outline" onclick="closeModal()">ביטול</button></div>`);
  document.querySelectorAll('.icon-option').forEach(o => o.addEventListener('click',()=>{
    document.querySelectorAll('.icon-option').forEach(x=>x.classList.remove('selected'));
    o.classList.add('selected'); chosenIcon=o.dataset.icon;
  }));
  document.getElementById('modal-save').addEventListener('click', async()=>{
    const name=document.getElementById('modal-name').value.trim();
    if(!name) return toast('הכניסו שם');
    kid ? await Store.updateKid(kidId,{name,icon:chosenIcon}) : await Store.addKid(name,chosenIcon);
    await loadData(); closeModal(); toast(kid?'✓ עודכן':'✓ נוסף'); render();
  });
}

function showChoreModal(choreId) {
  const chore = choreId ? state.chores.find(c=>c.id===choreId) : null;
  showModal(`<div class="modal-title">${chore?'ערוך משימה':'הוסף משימה'}</div>
    <div class="form-group"><label class="form-label">שם המשימה</label><input class="form-input" id="modal-name" type="text" placeholder="למשל: לסדר את המיטה" value="${chore?chore.name:''}"></div>
    <div class="form-group"><label class="form-label">נקודות</label><input class="form-input" id="modal-points" type="number" placeholder="10" value="${chore?chore.points:''}" min="1" inputmode="numeric"></div>
    <div class="btn-row" style="margin-top:20px"><button class="btn btn-gold" id="modal-save">💾 שמור</button><button class="btn btn-outline" onclick="closeModal()">ביטול</button></div>`);
  document.getElementById('modal-save').addEventListener('click', async()=>{
    const n=document.getElementById('modal-name').value.trim(), p=document.getElementById('modal-points').value;
    if(!n||!p) return toast('מלאו את כל השדות');
    chore ? await Store.updateChore(choreId,{name:n,points:Number(p)}) : await Store.addChore(n,Number(p));
    await loadData(); closeModal(); render();
  });
}

function showPrizeModal(prizeId) {
  const prize = prizeId ? state.prizes.find(p=>p.id===prizeId) : null;
  showModal(`<div class="modal-title">${prize?'ערוך פרס':'הוסף פרס'}</div>
    <div class="form-group"><label class="form-label">שם הפרס</label><input class="form-input" id="modal-name" type="text" placeholder="למשל: מתנה קטנה" value="${prize?prize.name:''}"></div>
    <div class="form-group"><label class="form-label">עלות (נקודות)</label><input class="form-input" id="modal-cost" type="number" placeholder="50" value="${prize?prize.cost:''}" min="1" inputmode="numeric"></div>
    <div class="btn-row" style="margin-top:20px"><button class="btn btn-gold" id="modal-save">💾 שמור</button><button class="btn btn-outline" onclick="closeModal()">ביטול</button></div>`);
  document.getElementById('modal-save').addEventListener('click', async()=>{
    const n=document.getElementById('modal-name').value.trim(), c=document.getElementById('modal-cost').value;
    if(!n||!c) return toast('מלאו את כל השדות');
    prize ? await Store.updatePrize(prizeId,{name:n,cost:Number(c)}) : await Store.addPrize(n,Number(c));
    await loadData(); closeModal(); render();
  });
}

function showCustomPointsModal(kidId) {
  const kid = state.kids.find(k=>k.id===kidId);
  showModal(`<div class="modal-title">⭐ נקודות ל${kid.name}</div>
    <div class="form-group"><label class="form-label">כמות</label><input class="form-input" id="modal-points" type="number" placeholder="10" inputmode="numeric"></div>
    <div class="btn-row" style="margin-top:20px"><button class="btn btn-gold" id="modal-save">💾 שמור</button><button class="btn btn-outline" onclick="closeModal()">ביטול</button></div>`);
  document.getElementById('modal-save').addEventListener('click', async()=>{
    const pts=Number(document.getElementById('modal-points').value);
    if(!pts) return toast('הכניסו מספר');
    await Store.addPoints(kidId,pts); await loadData(); closeModal();
    toast(`${pts>0?'+':''}${pts} נקודות ל${kid.name}`); render();
  });
}

function showEventModal() {
  const ds = dateStr(state.calendarDate);
  showModal(`<div class="modal-title">📅 אירוע חדש</div>
    <div class="form-group"><label class="form-label">כותרת</label><input class="form-input" id="modal-title" type="text" placeholder="למשל: רופא שיניים"></div>
    <div class="form-group"><label class="form-label">תאריך</label><input class="form-input" id="modal-date" type="date" value="${ds}"></div>
    <div class="form-group"><label class="form-label">שעה (לא חובה)</label><input class="form-input" id="modal-time" type="time"></div>
    <div class="form-group"><label class="form-label">בן משפחה (לא חובה)</label><input class="form-input" id="modal-member" type="text" placeholder="למשל: אמא"></div>
    <div class="form-group"><label class="form-label">צבע</label>
      <div class="icon-picker">${EVENT_COLORS.map((c,i)=>`<div class="color-option ${i===0?'selected':''}" data-color="${c}" style="background:${c}"></div>`).join('')}</div>
    </div>
    <div class="btn-row" style="margin-top:20px"><button class="btn btn-gold" id="modal-save">💾 שמור</button><button class="btn btn-outline" onclick="closeModal()">ביטול</button></div>`);
  let chosenColor = EVENT_COLORS[0];
  document.querySelectorAll('.color-option').forEach(o => o.addEventListener('click',()=>{
    document.querySelectorAll('.color-option').forEach(x=>x.classList.remove('selected'));
    o.classList.add('selected'); chosenColor=o.dataset.color;
  }));
  document.getElementById('modal-save').addEventListener('click', async()=>{
    const t=document.getElementById('modal-title').value.trim();
    if(!t) return toast('הכניסו כותרת');
    await Store.addEvent(t, document.getElementById('modal-date').value, document.getElementById('modal-time').value,
      document.getElementById('modal-member').value.trim(), chosenColor);
    await loadData(); closeModal(); playSound('tap'); render();
  });
}

function showMealModal(date, type) {
  const existing = state.meals.find(m => m.date===date && m.type===type);
  const label = type==='lunch' ? '🌤️ ארוחת צהריים' : '🌙 ארוחת ערב';
  showModal(`<div class="modal-title">${label} — ${formatDate(date)}</div>
    <div class="form-group"><label class="form-label">מה אוכלים?</label><input class="form-input" id="modal-desc" type="text" placeholder="למשל: פסטה" value="${existing?existing.description:''}"></div>
    <div class="btn-row" style="margin-top:20px"><button class="btn btn-gold" id="modal-save">💾 שמור</button><button class="btn btn-outline" onclick="closeModal()">ביטול</button></div>`);
  document.getElementById('modal-save').addEventListener('click', async()=>{
    const d=document.getElementById('modal-desc').value.trim();
    if(!d) return toast('מה אוכלים?');
    await Store.setMeal(date, type, d);
    await loadData(); closeModal(); playSound('tap'); render();
  });
}

// ==================== Toast ====================

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.classList.remove('hidden');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.add('hidden'), 2500);
}

// ==================== Celebrations ====================

function celebrate(type = 'stars') {
  haptic(); playSound(type === 'big' ? 'prize' : 'chore');
  const container = document.createElement('div');
  container.className = 'celebration-container';
  document.body.appendChild(container);
  const count = type==='big' ? 30 : 15;
  const emojis = type==='big' ? ['🎉','🎊','⭐','✨','🌟','🏆','💛','🥳'] : ['⭐','✨','🌟','💫','💛'];
  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    p.className = 'celebration-particle';
    p.textContent = emojis[Math.floor(Math.random()*emojis.length)];
    p.style.left = (30+Math.random()*40)+'%'; p.style.top = (40+Math.random()*20)+'%';
    const angle = Math.random()*Math.PI*2, dist = 80+Math.random()*200;
    p.style.setProperty('--tx', Math.cos(angle)*dist+'px');
    p.style.setProperty('--ty', (Math.sin(angle)*dist-100)+'px');
    p.style.animationDuration = (0.6+Math.random()*0.8)+'s';
    p.style.animationDelay = (Math.random()*0.3)+'s';
    p.style.fontSize = (1.2+Math.random()*1.2)+'rem';
    container.appendChild(p);
  }
  setTimeout(() => container.remove(), 2000);
}

function haptic() { if (navigator.vibrate) navigator.vibrate(30); }

// ==================== Sound Effects ====================

let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}
function playTone(freq, dur, delay=0, type='sine', vol=0.3) {
  const ctx=getAudioCtx(), osc=ctx.createOscillator(), gain=ctx.createGain();
  osc.type=type; osc.frequency.value=freq;
  gain.gain.setValueAtTime(vol, ctx.currentTime+delay);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+delay+dur);
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(ctx.currentTime+delay); osc.stop(ctx.currentTime+delay+dur);
}
function playSound(name) {
  try { switch(name) {
    case 'chore': playTone(523,.15,0); playTone(659,.15,.12); playTone(784,.25,.24,undefined,.3); break;
    case 'prize': playTone(523,.1,0,undefined,.2); playTone(659,.1,.08,undefined,.2); playTone(784,.1,.16); playTone(1047,.3,.24,undefined,.3); playTone(784,.15,.45,'triangle',.15); playTone(1047,.4,.55); break;
    case 'approve': playTone(600,.12,0,undefined,.2); playTone(800,.2,.1); break;
    case 'reject': playTone(300,.2,0,'square',.15); playTone(250,.3,.15,'square',.12); break;
    case 'tap': playTone(700,.06,0,undefined,.1); break;
    case 'pin': playTone(500+pinValue.length*80,.08,0,undefined,.12); break;
    case 'success': playTone(880,.15,0,undefined,.2); playTone(1100,.25,.12); break;
    case 'error': playTone(330,.15,0,'square',.12); playTone(260,.25,.12,'square',.1); break;
  }} catch(_){}
}

// ==================== Start ====================
document.addEventListener('DOMContentLoaded', init);
