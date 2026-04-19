// ==================== State ====================

const state = {
  screen: 'home',
  kidId: null,
  parentTab: 'approve',
  parentUnlocked: false,
  kids: [],
  chores: [],
  prizes: [],
  pending: [],
  history: [],
  pinSetupMode: false
};

const AVATARS = ['🕵️','🦸','🥷','🦊','🐱','🦁','🐯','🐻','🦄','🚀','👾','🤖','🎯','⭐','🐶','🐰'];

// ==================== Init ====================

async function init() {
  try {
    await loadData();
    const pin = await Store.getPin();
    if (!pin) {
      state.pinSetupMode = true;
      state.screen = 'pin';
    }
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
  const [kids, chores, prizes, pending] = await Promise.all([
    Store.getKids(),
    Store.getChores(),
    Store.getPrizes(),
    Store.getPending()
  ]);
  state.kids = kids;
  state.chores = chores;
  state.prizes = prizes;
  state.pending = pending;
}

// ==================== Navigation ====================

function setupNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const screen = btn.dataset.screen;
      if (screen === 'parent' && !state.parentUnlocked) {
        navigate('pin');
      } else {
        navigate(screen);
      }
    });
  });

  document.getElementById('btn-back').addEventListener('click', () => {
    if (state.screen === 'kid' || state.screen === 'shop-kid') {
      navigate('home');
    } else if (state.screen.startsWith('parent')) {
      navigate('parent');
    } else {
      navigate('home');
    }
  });
}

function navigate(screen, data = {}) {
  state.screen = screen;
  Object.assign(state, data);
  render();
}

function updateNavActive(screen) {
  const base = screen === 'kid' ? 'home' : screen === 'shop-kid' ? 'shop' : screen === 'pin' ? 'parent' : screen;
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.screen === base);
  });

  const backBtn = document.getElementById('btn-back');
  const showBack = ['kid', 'shop-kid'].includes(screen);
  backBtn.style.display = showBack ? 'block' : 'none';

  const title = document.getElementById('header-title');
  const titles = {
    home: 'Mission Impossipoints',
    kid: state.kids.find(k => k.id === state.kidId)?.name || 'סוכן',
    shop: 'חנות הפרסים',
    'shop-kid': 'חנות הפרסים',
    pin: state.pinSetupMode ? 'הגדרת קוד סודי' : 'קוד סודי',
    parent: 'מרכז הפיקוד'
  };
  title.textContent = titles[screen] || 'Mission Impossipoints';

  updatePendingBadge();
}

function updatePendingBadge() {
  const parentBtn = document.querySelector('.nav-btn[data-screen="parent"]');
  let badge = parentBtn.querySelector('.nav-badge');
  if (state.pending.length > 0) {
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'nav-badge';
      parentBtn.appendChild(badge);
    }
    badge.textContent = state.pending.length;
  } else if (badge) {
    badge.remove();
  }
}

// ==================== Render ====================

async function render() {
  const main = document.getElementById('main');
  updateNavActive(state.screen);

  switch (state.screen) {
    case 'home': main.innerHTML = renderHome(); break;
    case 'kid': main.innerHTML = await renderKid(); break;
    case 'shop': main.innerHTML = renderShop(); break;
    case 'shop-kid': main.innerHTML = renderShopKid(); break;
    case 'pin': main.innerHTML = renderPin(); setupPinPad(); break;
    case 'parent': main.innerHTML = await renderParent(); break;
    default: main.innerHTML = renderHome();
  }

  main.scrollTop = 0;
  attachEvents();
}

// ==================== Home Screen ====================

function renderHome() {
  if (state.kids.length === 0) {
    return `
      <div class="screen-content">
        <div class="welcome">
          <div class="welcome-logo">🕵️</div>
          <h2>!ברוכים הבאים</h2>
          <p>הוסיפו את הסוכנים הראשונים שלכם דרך לוח הבקרה של ההורים</p>
          <button class="btn btn-gold" onclick="navigate('pin')">🔐 מרכז הפיקוד</button>
        </div>
      </div>`;
  }

  return `
    <div class="screen-content">
      <div class="section-title">🕵️ הסוכנים</div>
      <div class="kids-grid">
        ${state.kids.map(kid => `
          <div class="card kid-card" data-action="open-kid" data-kid-id="${kid.id}">
            <div class="card-row">
              <div class="card-icon">${kid.icon}</div>
              <div class="card-info">
                <div class="card-name">${kid.name}</div>
                <div class="card-sub">סוכן/ת מיוחד/ת</div>
              </div>
              <div class="card-badge">⭐ ${kid.points}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>`;
}

// ==================== Kid Screen ====================

async function renderKid() {
  const kid = state.kids.find(k => k.id === state.kidId);
  if (!kid) return renderHome();

  state.history = await Store.getKidHistory(kid.id);

  const pendingIds = state.pending
    .filter(p => p.kidId === kid.id && p.type === 'chore')
    .map(p => p.itemId);

  return `
    <div class="screen-content">
      <div class="points-display">
        <div class="points-number">${kid.points}</div>
        <div class="points-label">⭐ נקודות</div>
      </div>

      <div class="section-title">🎯 משימות</div>
      ${state.chores.filter(c => c.active !== false).map(chore => {
        const isPending = pendingIds.includes(chore.id);
        return `
          <div class="mission-item">
            <div class="mission-info">
              <div class="mission-name">${chore.name}</div>
              <div class="mission-points">+${chore.points} נקודות</div>
            </div>
            ${isPending
              ? `<span class="mission-btn pending">ממתין ⏳</span>`
              : `<button class="mission-btn" data-action="complete-chore" data-chore-id="${chore.id}">בוצע! ✓</button>`
            }
          </div>`;
      }).join('')}

      <div class="section-title" style="margin-top:24px">🎁 לחנות הפרסים</div>
      <button class="btn btn-gold" data-action="go-shop-kid">🎁 פתח את חנות הפרסים</button>

      ${state.history.length > 0 ? `
        <div class="section-title" style="margin-top:24px">📋 היסטוריה</div>
        ${state.history.slice(0, 15).map(h => `
          <div class="history-item">
            <span class="history-icon">${h.type === 'chore' ? '🎯' : '🎁'}</span>
            <div class="history-info">
              ${h.itemName}
              <span style="color:var(--text-dim)"> · ${h.type === 'chore' ? '+' : '-'}${h.points}</span>
            </div>
            <span class="history-status status-${h.status}">${
              h.status === 'approved' ? '✓ אושר' :
              h.status === 'pending' ? '⏳ ממתין' : '✗ נדחה'
            }</span>
          </div>
        `).join('')}
      ` : ''}
    </div>`;
}

// ==================== Shop Screen ====================

function renderShop() {
  if (state.kids.length === 0) {
    return `
      <div class="screen-content">
        <div class="empty-state">
          <div class="empty-icon">🎁</div>
          <div class="empty-text">הוסיפו ילדים קודם דרך לוח הבקרה</div>
        </div>
      </div>`;
  }

  if (state.kids.length === 1) {
    state.kidId = state.kids[0].id;
    return renderShopKid();
  }

  return `
    <div class="screen-content">
      <div class="section-title">🎁 בחרו סוכן/ת</div>
      <div class="kids-grid">
        ${state.kids.map(kid => `
          <div class="card kid-card" data-action="open-shop-kid" data-kid-id="${kid.id}">
            <div class="card-row">
              <div class="card-icon">${kid.icon}</div>
              <div class="card-info">
                <div class="card-name">${kid.name}</div>
              </div>
              <div class="card-badge">⭐ ${kid.points}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>`;
}

function renderShopKid() {
  const kid = state.kids.find(k => k.id === state.kidId);
  if (!kid) return renderShop();

  return `
    <div class="screen-content">
      <div class="points-display">
        <div class="points-number">${kid.points}</div>
        <div class="points-label">⭐ הנקודות של ${kid.name}</div>
      </div>

      <div class="section-title">🎁 פרסים</div>
      ${state.prizes.filter(p => p.active !== false).map(prize => {
        const canAfford = kid.points >= prize.cost;
        return `
          <div class="prize-item">
            <span class="prize-icon">🏆</span>
            <div class="prize-info">
              <div class="prize-name">${prize.name}</div>
              <div class="prize-cost">${prize.cost} נקודות</div>
            </div>
            <button class="prize-btn" data-action="redeem-prize" data-prize-id="${prize.id}"
              ${!canAfford ? 'disabled' : ''}>
              ${canAfford ? 'לממש! 🎉' : 'לא מספיק'}
            </button>
          </div>`;
      }).join('')}
    </div>`;
}

// ==================== PIN Screen ====================

let pinValue = '';

function renderPin() {
  return `
    <div class="pin-screen">
      <div class="pin-title">${state.pinSetupMode ? '🔐 בחרו קוד סודי' : '🔐 הכניסו קוד סודי'}</div>
      <div class="pin-subtitle">${state.pinSetupMode ? 'קוד 4 ספרות לגישת הורים' : 'רק הורים יכולים להיכנס'}</div>
      <div class="pin-dots">
        <div class="pin-dot ${pinValue.length >= 1 ? 'filled' : ''}"></div>
        <div class="pin-dot ${pinValue.length >= 2 ? 'filled' : ''}"></div>
        <div class="pin-dot ${pinValue.length >= 3 ? 'filled' : ''}"></div>
        <div class="pin-dot ${pinValue.length >= 4 ? 'filled' : ''}"></div>
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
  if (digit === 'back') {
    pinValue = pinValue.slice(0, -1);
  } else if (pinValue.length < 4) {
    pinValue += digit;
  }

  document.querySelectorAll('.pin-dot').forEach((dot, i) => {
    dot.classList.toggle('filled', i < pinValue.length);
  });

  if (pinValue.length === 4) {
    if (state.pinSetupMode) {
      await Store.setPin(pinValue);
      state.pinSetupMode = false;
      state.parentUnlocked = true;
      toast('✓ הקוד הסודי נשמר');
      navigate('parent');
    } else {
      const correctPin = await Store.getPin();
      if (pinValue === correctPin) {
        state.parentUnlocked = true;
        navigate('parent');
      } else {
        document.getElementById('pin-error').textContent = 'קוד שגוי, נסו שוב';
        pinValue = '';
        document.querySelectorAll('.pin-dot').forEach(d => d.classList.remove('filled'));
        setTimeout(() => {
          const err = document.getElementById('pin-error');
          if (err) err.textContent = '';
        }, 2000);
      }
    }
  }
}

// ==================== Parent Panel ====================

async function renderParent() {
  await loadData();

  const tabs = [
    { id: 'approve', label: `אישור (${state.pending.length})`, icon: '✓' },
    { id: 'kids', label: 'ילדים', icon: '👤' },
    { id: 'chores', label: 'משימות', icon: '🎯' },
    { id: 'prizes', label: 'פרסים', icon: '🎁' },
    { id: 'points', label: 'נקודות', icon: '⭐' },
    { id: 'settings', label: 'הגדרות', icon: '⚙️' }
  ];

  let content = '';
  switch (state.parentTab) {
    case 'approve': content = renderParentApprove(); break;
    case 'kids': content = renderParentKids(); break;
    case 'chores': content = renderParentChores(); break;
    case 'prizes': content = renderParentPrizes(); break;
    case 'points': content = renderParentPoints(); break;
    case 'settings': content = renderParentSettings(); break;
  }

  return `
    <div class="screen-content">
      <div class="parent-tabs">
        ${tabs.map(t => `
          <button class="parent-tab ${state.parentTab === t.id ? 'active' : ''}"
            data-action="parent-tab" data-tab="${t.id}">
            ${t.icon} ${t.label}
          </button>
        `).join('')}
      </div>
      ${content}
    </div>`;
}

function renderParentApprove() {
  if (state.pending.length === 0) {
    return `<div class="empty-state"><div class="empty-icon">✓</div><div class="empty-text">אין משימות ממתינות לאישור</div></div>`;
  }

  return state.pending.map(p => `
    <div class="pending-card">
      <div class="pending-top">
        <span class="pending-kid">${p.kidName}</span>
        <span class="pending-mission">${p.itemName}</span>
        <span class="pending-points">+${p.points} ⭐</span>
      </div>
      <div class="btn-row">
        <button class="btn btn-success btn-sm" data-action="approve" data-id="${p.id}" data-kid-id="${p.kidId}" data-points="${p.points}">✓ אשר</button>
        <button class="btn btn-danger btn-sm" data-action="reject" data-id="${p.id}">✗ דחה</button>
      </div>
    </div>
  `).join('');
}

function renderParentKids() {
  return `
    ${state.kids.map(kid => `
      <div class="manage-item">
        <span style="font-size:1.5rem">${kid.icon}</span>
        <div class="manage-item-info">
          <div class="manage-item-name">${kid.name}</div>
          <div class="manage-item-detail">${kid.points} נקודות</div>
        </div>
        <div class="manage-actions">
          <button class="manage-btn manage-btn-edit" data-action="edit-kid" data-kid-id="${kid.id}">✏️</button>
          <button class="manage-btn manage-btn-delete" data-action="delete-kid" data-kid-id="${kid.id}">🗑️</button>
        </div>
      </div>
    `).join('')}
    <button class="btn btn-gold" style="margin-top:12px" data-action="add-kid">➕ הוסף ילד/ה</button>
  `;
}

function renderParentChores() {
  return `
    ${state.chores.map(chore => `
      <div class="manage-item">
        <span style="font-size:1.2rem">🎯</span>
        <div class="manage-item-info">
          <div class="manage-item-name">${chore.name}</div>
          <div class="manage-item-detail">${chore.points} נקודות</div>
        </div>
        <div class="manage-actions">
          <button class="manage-btn manage-btn-edit" data-action="edit-chore" data-chore-id="${chore.id}">✏️</button>
          <button class="manage-btn manage-btn-delete" data-action="delete-chore" data-chore-id="${chore.id}">🗑️</button>
        </div>
      </div>
    `).join('')}
    <button class="btn btn-gold" style="margin-top:12px" data-action="add-chore">➕ הוסף משימה</button>
  `;
}

function renderParentPrizes() {
  return `
    ${state.prizes.map(prize => `
      <div class="manage-item">
        <span style="font-size:1.2rem">🏆</span>
        <div class="manage-item-info">
          <div class="manage-item-name">${prize.name}</div>
          <div class="manage-item-detail">${prize.cost} נקודות</div>
        </div>
        <div class="manage-actions">
          <button class="manage-btn manage-btn-edit" data-action="edit-prize" data-prize-id="${prize.id}">✏️</button>
          <button class="manage-btn manage-btn-delete" data-action="delete-prize" data-prize-id="${prize.id}">🗑️</button>
        </div>
      </div>
    `).join('')}
    <button class="btn btn-gold" style="margin-top:12px" data-action="add-prize">➕ הוסף פרס</button>
  `;
}

function renderParentPoints() {
  if (state.kids.length === 0) {
    return `<div class="empty-state"><div class="empty-icon">👤</div><div class="empty-text">הוסיפו ילדים קודם</div></div>`;
  }

  return `
    <div class="section-title">⭐ הוסף / הפחת נקודות</div>
    ${state.kids.map(kid => `
      <div class="manage-item" style="flex-wrap:wrap;gap:8px">
        <span style="font-size:1.5rem">${kid.icon}</span>
        <div class="manage-item-info">
          <div class="manage-item-name">${kid.name}</div>
          <div class="manage-item-detail">${kid.points} נקודות</div>
        </div>
        <div class="btn-row" style="width:100%">
          <button class="btn btn-success btn-sm" data-action="adjust-points" data-kid-id="${kid.id}" data-amount="10">+10</button>
          <button class="btn btn-success btn-sm" data-action="adjust-points" data-kid-id="${kid.id}" data-amount="25">+25</button>
          <button class="btn btn-danger btn-sm" data-action="adjust-points" data-kid-id="${kid.id}" data-amount="-10">-10</button>
          <button class="btn btn-outline btn-sm" data-action="custom-points" data-kid-id="${kid.id}">מותאם</button>
        </div>
      </div>
    `).join('')}
  `;
}

function renderParentSettings() {
  return `
    <div class="section-title">⚙️ הגדרות</div>
    <button class="btn btn-outline" style="margin-bottom:10px" data-action="change-pin">🔐 שנה קוד סודי</button>
    <button class="btn btn-outline" data-action="lock-parent">🔒 נעל מרכז פיקוד</button>
  `;
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

  switch (action) {
    case 'open-kid':
      state.kidId = btn.dataset.kidId;
      navigate('kid');
      break;

    case 'open-shop-kid':
      state.kidId = btn.dataset.kidId;
      navigate('shop-kid');
      break;

    case 'go-shop-kid':
      navigate('shop-kid');
      break;

    case 'complete-chore': {
      const choreId = btn.dataset.choreId;
      const chore = state.chores.find(c => c.id === choreId);
      const kid = state.kids.find(k => k.id === state.kidId);
      if (chore && kid) {
        await Store.addRequest(kid.id, kid.name, chore.id, chore.name, 'chore', chore.points);
        await loadData();
        toast('✓ נשלח לאישור ההורים');
        render();
      }
      break;
    }

    case 'redeem-prize': {
      const prizeId = btn.dataset.prizeId;
      const prize = state.prizes.find(p => p.id === prizeId);
      const kid = state.kids.find(k => k.id === state.kidId);
      if (prize && kid && kid.points >= prize.cost) {
        await Store.addRequest(kid.id, kid.name, prize.id, prize.name, 'redeem', prize.cost);
        await Store.addPoints(kid.id, -prize.cost);
        await loadData();
        toast(`🎉 ${kid.name} מימש/ה: ${prize.name}`);
        render();
      }
      break;
    }

    case 'parent-tab':
      state.parentTab = btn.dataset.tab;
      render();
      break;

    case 'approve': {
      await Store.approveRequest(btn.dataset.id, btn.dataset.kidId, Number(btn.dataset.points));
      await loadData();
      toast('✓ אושר!');
      render();
      break;
    }

    case 'reject': {
      await Store.rejectRequest(btn.dataset.id);
      await loadData();
      toast('✗ נדחה');
      render();
      break;
    }

    case 'add-kid':
      showKidModal();
      break;

    case 'edit-kid':
      showKidModal(btn.dataset.kidId);
      break;

    case 'delete-kid':
      if (confirm('למחוק את הילד/ה? כל הנתונים יימחקו')) {
        await Store.deleteKid(btn.dataset.kidId);
        await loadData();
        toast('נמחק');
        render();
      }
      break;

    case 'add-chore':
      showChoreModal();
      break;

    case 'edit-chore':
      showChoreModal(btn.dataset.choreId);
      break;

    case 'delete-chore':
      if (confirm('למחוק את המשימה?')) {
        await Store.deleteChore(btn.dataset.choreId);
        await loadData();
        render();
      }
      break;

    case 'add-prize':
      showPrizeModal();
      break;

    case 'edit-prize':
      showPrizeModal(btn.dataset.prizeId);
      break;

    case 'delete-prize':
      if (confirm('למחוק את הפרס?')) {
        await Store.deletePrize(btn.dataset.prizeId);
        await loadData();
        render();
      }
      break;

    case 'adjust-points': {
      const amount = Number(btn.dataset.amount);
      await Store.addPoints(btn.dataset.kidId, amount);
      await loadData();
      toast(`${amount > 0 ? '+' : ''}${amount} נקודות`);
      render();
      break;
    }

    case 'custom-points':
      showCustomPointsModal(btn.dataset.kidId);
      break;

    case 'change-pin':
      state.pinSetupMode = true;
      navigate('pin');
      break;

    case 'lock-parent':
      state.parentUnlocked = false;
      navigate('home');
      toast('🔒 מרכז הפיקוד ננעל');
      break;
  }
}

// ==================== Modals ====================

function showModal(html) {
  const overlay = document.getElementById('modal-overlay');
  const modal = document.getElementById('modal');
  modal.innerHTML = html;
  overlay.classList.remove('hidden');
  overlay.onclick = (e) => {
    if (e.target === overlay) closeModal();
  };
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

function showKidModal(kidId) {
  const kid = kidId ? state.kids.find(k => k.id === kidId) : null;
  const selectedIcon = kid ? kid.icon : AVATARS[0];

  showModal(`
    <div class="modal-title">${kid ? 'ערוך ילד/ה' : 'הוסף ילד/ה'}</div>
    <div class="form-group">
      <label class="form-label">שם</label>
      <input class="form-input" id="modal-name" type="text" placeholder="שם הילד/ה" value="${kid ? kid.name : ''}" autofocus>
    </div>
    <div class="form-group">
      <label class="form-label">אייקון</label>
      <div class="icon-picker">
        ${AVATARS.map(icon => `
          <div class="icon-option ${icon === selectedIcon ? 'selected' : ''}" data-icon="${icon}">${icon}</div>
        `).join('')}
      </div>
    </div>
    <div class="btn-row" style="margin-top:20px">
      <button class="btn btn-gold" id="modal-save">💾 שמור</button>
      <button class="btn btn-outline" onclick="closeModal()">ביטול</button>
    </div>
  `);

  let chosenIcon = selectedIcon;
  document.querySelectorAll('.icon-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.icon-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      chosenIcon = opt.dataset.icon;
    });
  });

  document.getElementById('modal-save').addEventListener('click', async () => {
    const name = document.getElementById('modal-name').value.trim();
    if (!name) return toast('הכניסו שם');
    if (kid) {
      await Store.updateKid(kidId, { name, icon: chosenIcon });
    } else {
      await Store.addKid(name, chosenIcon);
    }
    await loadData();
    closeModal();
    toast(kid ? '✓ עודכן' : '✓ נוסף');
    render();
  });
}

function showChoreModal(choreId) {
  const chore = choreId ? state.chores.find(c => c.id === choreId) : null;

  showModal(`
    <div class="modal-title">${chore ? 'ערוך משימה' : 'הוסף משימה'}</div>
    <div class="form-group">
      <label class="form-label">שם המשימה</label>
      <input class="form-input" id="modal-name" type="text" placeholder="למשל: לסדר את המיטה" value="${chore ? chore.name : ''}">
    </div>
    <div class="form-group">
      <label class="form-label">נקודות</label>
      <input class="form-input" id="modal-points" type="number" placeholder="10" value="${chore ? chore.points : ''}" min="1" inputmode="numeric">
    </div>
    <div class="btn-row" style="margin-top:20px">
      <button class="btn btn-gold" id="modal-save">💾 שמור</button>
      <button class="btn btn-outline" onclick="closeModal()">ביטול</button>
    </div>
  `);

  document.getElementById('modal-save').addEventListener('click', async () => {
    const name = document.getElementById('modal-name').value.trim();
    const points = document.getElementById('modal-points').value;
    if (!name || !points) return toast('מלאו את כל השדות');
    if (chore) {
      await Store.updateChore(choreId, { name, points: Number(points) });
    } else {
      await Store.addChore(name, Number(points));
    }
    await loadData();
    closeModal();
    render();
  });
}

function showPrizeModal(prizeId) {
  const prize = prizeId ? state.prizes.find(p => p.id === prizeId) : null;

  showModal(`
    <div class="modal-title">${prize ? 'ערוך פרס' : 'הוסף פרס'}</div>
    <div class="form-group">
      <label class="form-label">שם הפרס</label>
      <input class="form-input" id="modal-name" type="text" placeholder="למשל: מתנה קטנה" value="${prize ? prize.name : ''}">
    </div>
    <div class="form-group">
      <label class="form-label">עלות (נקודות)</label>
      <input class="form-input" id="modal-cost" type="number" placeholder="50" value="${prize ? prize.cost : ''}" min="1" inputmode="numeric">
    </div>
    <div class="btn-row" style="margin-top:20px">
      <button class="btn btn-gold" id="modal-save">💾 שמור</button>
      <button class="btn btn-outline" onclick="closeModal()">ביטול</button>
    </div>
  `);

  document.getElementById('modal-save').addEventListener('click', async () => {
    const name = document.getElementById('modal-name').value.trim();
    const cost = document.getElementById('modal-cost').value;
    if (!name || !cost) return toast('מלאו את כל השדות');
    if (prize) {
      await Store.updatePrize(prizeId, { name, cost: Number(cost) });
    } else {
      await Store.addPrize(name, Number(cost));
    }
    await loadData();
    closeModal();
    render();
  });
}

function showCustomPointsModal(kidId) {
  const kid = state.kids.find(k => k.id === kidId);

  showModal(`
    <div class="modal-title">⭐ נקודות ל${kid.name}</div>
    <div class="form-group">
      <label class="form-label">כמות (מספר חיובי להוספה, שלילי להפחתה)</label>
      <input class="form-input" id="modal-points" type="number" placeholder="10" inputmode="numeric">
    </div>
    <div class="form-group">
      <label class="form-label">סיבה (לא חובה)</label>
      <input class="form-input" id="modal-reason" type="text" placeholder="בונוס מיוחד">
    </div>
    <div class="btn-row" style="margin-top:20px">
      <button class="btn btn-gold" id="modal-save">💾 שמור</button>
      <button class="btn btn-outline" onclick="closeModal()">ביטול</button>
    </div>
  `);

  document.getElementById('modal-save').addEventListener('click', async () => {
    const pts = Number(document.getElementById('modal-points').value);
    if (!pts || pts === 0) return toast('הכניסו מספר');
    await Store.addPoints(kidId, pts);
    await loadData();
    closeModal();
    toast(`${pts > 0 ? '+' : ''}${pts} נקודות ל${kid.name}`);
    render();
  });
}

// ==================== Toast ====================

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.add('hidden'), 2500);
}

// ==================== Start ====================

document.addEventListener('DOMContentLoaded', init);
