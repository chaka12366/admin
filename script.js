// ═══════════════════════════════════════
// DATA
// ═══════════════════════════════════════
const avatarColors = [
  'linear-gradient(135deg,#1a4db5,#2d7de8)',
  'linear-gradient(135deg,#7c3aed,#a78bfa)',
  'linear-gradient(135deg,#0e7490,#22d3ee)',
  'linear-gradient(135deg,#c2410c,#fb923c)',
  'linear-gradient(135deg,#166534,#4ade80)',
  'linear-gradient(135deg,#92400e,#fbbf24)',
];

const usersData = [
  { id:1, name:'Admin User',     email:'admin@ft.bz',       role:'Admin',     status:'active',      joined:'Jan 10, 2025', last:'Today' },
  { id:2, name:'Juan Cruz',      email:'juan@ft.bz',        role:'Organizer', status:'active',      joined:'Jan 15, 2025', last:'Yesterday' },
  { id:3, name:'Maria Santos',   email:'maria@ft.bz',       role:'Coach',     status:'active',      joined:'Feb 01, 2025', last:'2 days ago' },
  { id:4, name:'Carlos Reyes',   email:'carlos@ft.bz',      role:'Referee',   status:'active',      joined:'Feb 05, 2025', last:'Today' },
  { id:5, name:'Luis Mendoza',   email:'luis@ft.bz',        role:'Player',    status:'suspended',   joined:'Feb 08, 2025', last:'1 week ago' },
  { id:6, name:'Ana Gonzalez',   email:'ana@ft.bz',         role:'Coach',     status:'active',      joined:'Jan 20, 2025', last:'Today' },
  { id:7, name:'Pedro Bol',      email:'pedro@ft.bz',       role:'Player',    status:'active',      joined:'Feb 10, 2025', last:'3 days ago' },
  { id:8, name:'Rosa Marin',     email:'rosa@ft.bz',        role:'Player',    status:'deactivated', joined:'Jan 25, 2025', last:'1 month ago' },
  { id:9, name:'Diego Castillo', email:'diego@ft.bz',       role:'Organizer', status:'active',      joined:'Jan 12, 2025', last:'Yesterday' },
  { id:10, name:'Lucia Torres',  email:'lucia@ft.bz',       role:'Referee',   status:'active',      joined:'Feb 03, 2025', last:'Today' },
];

const appsData = [
  { id:1, name:'Maria Santos',   email:'maria@ft.bz',   role:'Coach',     applied:'2 min ago',   status:'pending' },
  { id:2, name:'Joel Castillo',  email:'joel@ft.bz',    role:'Referee',   applied:'4 hrs ago',   status:'pending' },
  { id:3, name:'Sandra Cruz',    email:'sandra@ft.bz',  role:'Organizer', applied:'1 day ago',   status:'pending' },
  { id:4, name:'Ricky Mena',     email:'ricky@ft.bz',   role:'Player',    applied:'2 days ago',  status:'pending' },
  { id:5, name:'Carlos Reyes',   email:'carlos@ft.bz',  role:'Referee',   applied:'5 days ago',  status:'approved' },
  { id:6, name:'Ana Gonzalez',   email:'ana@ft.bz',     role:'Coach',     applied:'6 days ago',  status:'approved' },
  { id:7, name:'Ken Teck',       email:'ken@ft.bz',     role:'Admin',     applied:'8 days ago',  status:'rejected' },
];

let currentAppFilter = 'all';
let currentReviewId = null;

const notificationsData = [
  { id:1, avatar:'M', color:'linear-gradient(135deg,#1a4db5,#2d7de8)', title:'New user registered', message:'Maria Santos applied for Coach role', time:'2 minutes ago', read:false },
  { id:2, avatar:'J', color:'linear-gradient(135deg,#c2410c,#fb923c)', title:'Tournament created', message:'Summer League 2025 by Juan Cruz', time:'18 minutes ago', read:false },
  { id:3, avatar:'C', color:'linear-gradient(135deg,#0e7490,#22d3ee)', title:'Role application approved', message:'Carlos Reyes is now a Referee', time:'1 hour ago', read:true },
  { id:4, avatar:'L', color:'linear-gradient(135deg,#92400e,#fbbf24)', title:'Account suspended', message:'Luis Mendoza - Violation of terms', time:'3 hours ago', read:true },
];

// ═══════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════
const pageTitles = {
  dashboard:    ['Dashboard', 'Overview of your Football Tracker system'],
  users:        ['User Management', 'Manage all registered users'],
  applications: ['Role Applications', 'Review role requests'],
  settings:     ['System Settings', 'Configure platform-wide settings'],
  about:        ['About / My Group', 'System information and team'],
};

function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.bottom-nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.querySelector(`[data-page="${page}"]`)?.classList.add('active');
  document.querySelector(`.bottom-nav-item[data-page="${page}"]`)?.classList.add('active');
  const [title, sub] = pageTitles[page] || ['Dashboard', ''];
  document.getElementById('pageTitle').textContent = title;
  document.getElementById('pageSub').textContent = sub;
  closeSidebar();
  window.scrollTo(0, 0);
}

document.querySelectorAll('.nav-item[data-page]').forEach(item => {
  item.addEventListener('click', e => { e.preventDefault(); navigate(item.dataset.page); });
});

// ═══════════════════════════════════════
// SIDEBAR (mobile)
// ═══════════════════════════════════════
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('open');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
}

// ═══════════════════════════════════════
// CONFIRMATION MODAL
// ═══════════════════════════════════════
let confirmCallback = null;

function showConfirmModal(title, message, onConfirm, cancelText = 'Cancel', confirmText = 'Confirm') {
  document.getElementById('confirmModalTitle').textContent = title;
  document.getElementById('confirmModalMessage').textContent = message;
  document.getElementById('confirmModalCancel').textContent = cancelText;
  document.getElementById('confirmModalOk').textContent = confirmText;
  document.getElementById('confirmModalOverlay').classList.add('show');
  confirmCallback = onConfirm;
}

function closeConfirmModal() {
  document.getElementById('confirmModalOverlay').classList.remove('show');
  confirmCallback = null;
}

// Setup confirmation modal event listeners
(() => {
  const okBtn = document.getElementById('confirmModalOk');
  const cancelBtn = document.getElementById('confirmModalCancel');
  const overlay = document.getElementById('confirmModalOverlay');
  
  if (okBtn) okBtn.addEventListener('click', () => {
    if (confirmCallback) confirmCallback();
    closeConfirmModal();
  });
  
  if (cancelBtn) cancelBtn.addEventListener('click', closeConfirmModal);
  
  if (overlay) overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeConfirmModal();
  });
})();

// ═══════════════════════════════════════
// RENDER USERS TABLE
// ═══════════════════════════════════════
function roleBadgeClass(role) {
  return { Admin:'badge-admin', Organizer:'badge-organizer', Coach:'badge-coach', Referee:'badge-referee', Player:'badge-player' }[role] || '';
}

function statusBadgeClass(s) {
  return { active:'badge-active', suspended:'badge-suspended', deactivated:'badge-deactivated' }[s] || '';
}

function renderUsers(data) {
  const tbody = document.getElementById('usersBody');
  tbody.innerHTML = data.map((u, i) => `
    <tr>
      <td>
        <div class="user-cell">
          <div class="user-avatar" style="background:${avatarColors[i % avatarColors.length]}">${u.name[0]}</div>
          <div class="user-info">
            <div class="uname">${u.name}</div>
            <div class="uemail">${u.email}</div>
          </div>
        </div>
      </td>
      <td><span class="role-badge ${roleBadgeClass(u.role)}">${u.role}</span></td>
      <td><span class="badge ${statusBadgeClass(u.status)}">${u.status}</span></td>
      <td style="color:var(--gray-500);font-size:13px;">${u.joined}</td>
      <td style="color:var(--gray-500);font-size:13px;">${u.last}</td>
      <td>
        <div class="action-btns">
          <button class="btn-icon" onclick='openEditUser(${JSON.stringify(u)})' title="Edit">
            <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon danger" onclick="deleteUser(${u.id})" title="Deactivate">
            <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          </button>
          ${u.status === 'active'
            ? `<button class="btn-icon" onclick="suspendUser(${u.id})" title="Suspend" style="color:var(--orange);">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
               </button>`
            : `<button class="btn-icon success" onclick="activateUser(${u.id})" title="Activate">
                <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
               </button>`
          }
        </div>
      </td>
    </tr>
  `).join('');
}

let usersFiltered = [...usersData];

function filterUsers(q) {
  q = q.toLowerCase();
  usersFiltered = usersData.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  renderUsers(usersFiltered);
}

function filterByStatus(val) {
  usersFiltered = val ? usersData.filter(u => u.status === val) : [...usersData];
  renderUsers(usersFiltered);
}

function filterByRole(val) {
  usersFiltered = val ? usersData.filter(u => u.role === val) : [...usersData];
  renderUsers(usersFiltered);
}

// ═══════════════════════════════════════
// RENDER APPLICATIONS TABLE
// ═══════════════════════════════════════
function renderApps(filter = 'all') {
  const data = filter === 'all' ? appsData : appsData.filter(a => a.status === filter);
  const appsGrid = document.getElementById('appsBody');
  appsGrid.innerHTML = data.map((a, i) => {
    const roleClass = roleBadgeClass(a.role);
    const roleColor = {
      'badge-admin': { bg: 'rgba(25, 118, 210, 0.1)', color: '#1976d2' },
      'badge-organizer': { bg: 'rgba(139,92,246,0.1)', color: '#7c3aed' },
      'badge-coach': { bg: 'rgba(6,182,212,0.1)', color: '#0e7490' },
      'badge-referee': { bg: 'rgba(249,115,22,0.1)', color: '#c2410c' },
      'badge-player': { bg: 'rgba(56, 142, 60, 0.1)', color: '#2e7d32' },
    }[roleClass] || { bg: 'rgba(100,116,139,0.1)', color: '#475569' };
    
    return `
      <div class="app-card" data-app-id="${a.id}" data-status="${a.status}">
        <div class="app-card-left">
          <div class="app-avatar" style="background:${avatarColors[i % avatarColors.length]}">${a.name[0]}</div>
          <div class="app-info">
            <div class="app-applicant">
              <div class="app-name">${a.name}</div>
              <div class="app-email">${a.email}</div>
            </div>
            <div style="display:flex;align-items:center;gap:12px;">
              <span class="app-role-badge" style="background:${roleColor.bg};color:${roleColor.color};">${a.role}</span>
              <span class="app-time">${a.applied}</span>
            </div>
          </div>
        </div>
        <div class="app-card-right">
          <span class="app-status ${a.status}">${a.status}</span>
          <div class="app-actions">
            ${a.status === 'pending' ? `
              <button class="btn-approve" onclick="quickApprove(${a.id})" title="Approve"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></button>
              <button class="btn-reject" onclick="quickReject(${a.id})" title="Reject"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            ` : `<span class="app-reviewed">Already reviewed</span>`}
          </div>
        </div>
      </div>
    `;
  }).join('');
}


function filterApps(filter, btn) {
  currentAppFilter = filter;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderApps(filter);
}

// ═══════════════════════════════════════
// MODALS
// ═══════════════════════════════════════
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });
});

function openEditUser(user) {
  document.getElementById('editName').value = user.name;
  document.getElementById('editEmail').value = user.email;
  document.getElementById('editRole').value = user.role;
  document.getElementById('editStatus').value = user.status;
  openModal('editUserModal');
}

function openReview(id) {
  const app = appsData.find(a => a.id === id);
  if (!app) return;
  currentReviewId = id;
  document.getElementById('reviewAvatar').textContent = app.name[0];
  document.getElementById('reviewName').textContent = app.name;
  document.getElementById('reviewEmail').textContent = app.email;
  document.getElementById('reviewRole').textContent = app.role;
  document.getElementById('reviewNotes').value = '';
  openModal('reviewAppModal');
}

// ═══════════════════════════════════════
// ACTIONS
// ═══════════════════════════════════════
function addUser() {
  closeModal('addUserModal');
  showToast('User created successfully!', 'success');
}

function saveUser() {
  closeModal('editUserModal');
  showToast('User updated successfully!', 'success');
}

function deleteUser(id) {
  const user = usersData.find(u => u.id === id);
  if (!user) return;
  showConfirmModal(
    'Deactivate User?',
    `Are you sure you want to deactivate ${user.name}? You can reactivate them later.`,
    () => {
      user.status = 'deactivated';
      renderUsers(usersData);
      showToast('User deactivated successfully.', 'info');
    },
    'Cancel',
    'Deactivate User'
  );
}

function suspendUser(id) {
  const user = usersData.find(u => u.id === id);
  if (!user) return;
  showConfirmModal(
    'Suspend User?',
    `Are you sure you want to suspend ${user.name}? They won't be able to login.`,
    () => {
      user.status = 'suspended';
      renderUsers(usersData);
      showToast(`${user.name} has been suspended.`, 'warning');
    },
    'Cancel',
    'Suspend User'
  );
}

function activateUser(id) {
  const user = usersData.find(u => u.id === id);
  if (!user) return;
  showConfirmModal(
    'Activate User?',
    `Activate ${user.name}'s account? They will be able to login again.`,
    () => {
      user.status = 'active';
      renderUsers(usersData);
      showToast(`${user.name} is now active!`, 'success');
    },
    'Cancel',
    'Activate User'
  );
}

function approveApp(btn) {
  showConfirmModal(
    'Approve This Application?',
    'Are you sure you want to approve this application? This action cannot be undone.',
    () => {
      btn.closest('.activity-item').remove();
      showToast('Application approved!', 'success');
    },
    'Cancel',
    'Approve Application'
  );
}

function rejectApp(btn) {
  showConfirmModal(
    'Reject This Application?',
    'Are you sure you want to reject this application? The user will be notified.',
    () => {
      btn.closest('.activity-item').remove();
      showToast('Application rejected.', 'error');
    },
    'Cancel',
    'Reject Application'
  );
}

function quickApprove(id) {
  const app = appsData.find(a => a.id === id);
  if (!app) return;
  showConfirmModal(
    'Approve Application?',
    `Approve ${app.name}'s request for ${app.role}? Confirm to proceed.`,
    () => {
      app.status = 'approved';
      renderApps(currentAppFilter);
      showToast(`${app.name}'s application approved!`, 'success');
    },
    'Cancel',
    'Approve Application'
  );
}

function quickReject(id) {
  const app = appsData.find(a => a.id === id);
  if (!app) return;
  showConfirmModal(
    'Reject Application?',
    `Reject ${app.name}'s request for ${app.role}? They can reapply later.`,
    () => {
      app.status = 'rejected';
      renderApps(currentAppFilter);
      showToast(`${app.name}'s application rejected.`, 'error');
    },
    'Cancel',
    'Reject Application'
  );
}

function submitReview(decision) {
  if (currentReviewId) {
    const app = appsData.find(a => a.id === currentReviewId);
    if (app) app.status = decision;
    renderApps(currentAppFilter);
  }
  closeModal('reviewAppModal');
  showToast(
    decision === 'approved' ? 'Application approved!' : 'Application rejected.',
    decision === 'approved' ? 'success' : 'error'
  );
}

function saveSettings() {
  showToast('Settings saved successfully!', 'success');
}

// ═══════════════════════════════════════
// TOAST SYSTEM
// ═══════════════════════════════════════

// Inject keyframe animation once
(function injectToastStyles() {
    if (document.getElementById('toastStyles')) return;
    const style = document.createElement('style');
    style.id = 'toastStyles';
    style.textContent = `
        @keyframes toastSlideIn {
            from { transform: translateX(110%); opacity: 0; }
            to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes toastSlideOut {
            from { transform: translateX(0);    opacity: 1; }
            to   { transform: translateX(110%); opacity: 0; }
        }
        .toast-banner {
            animation: toastSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .toast-banner.hide {
            animation: toastSlideOut 0.35s ease-in forwards;
        }
        .toast-progress {
            position: absolute;
            bottom: 0;
            left: 0;
            height: 3px;
            border-radius: 0 0 0 10px;
            animation: toastProgress linear forwards;
        }
        @keyframes toastProgress {
            from { width: 100%; }
            to   { width: 0%; }
        }
        .toast-close-btn:hover {
            opacity: 1 !important;
        }

        /* Mobile: smaller and tighter */
        @media (max-width: 480px) {
            #toastContainer {
                top: 10px !important;
                right: 10px !important;
                width: 220px !important;
            }
            .toast-banner {
                font-size: 0.72rem !important;
                padding: 8px 10px 12px 10px !important;
                border-radius: 7px !important;
            }
        }
    `;
    document.head.appendChild(style);
})();

// Ensure toast container exists (top-right)
function getToastContainer() {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = `
      position: fixed;
      top: 12px;
      right: 12px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 8px;
      align-items: flex-end;
      pointer-events: none;
      width: 240px;
      box-sizing: border-box;
        `;
        document.body.appendChild(container);
    }
    return container;
}

/**
 * Show a banner toast notification
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 * @param {number} duration  ms before auto-dismiss (default 4000)
 */
function showToast(message, type = 'info', duration = 4000) {
    const container = getToastContainer();

    const themes = {
        success: {
            bg:         '#388e3c',
            iconBg:     'rgba(0,0,0,0.15)',
            text:       '#ffffff',
            label:      'Success',
            icon:       '✓',
            progressBg: 'rgba(255,255,255,0.5)',
        },
        error: {
            bg:         '#d32f2f',
            iconBg:     'rgba(0,0,0,0.15)',
            text:       '#ffffff',
            label:      'Error',
            icon:       '!',
            progressBg: 'rgba(255,255,255,0.5)',
        },
        info: {
            bg:         '#1976d2',
            iconBg:     'rgba(0,0,0,0.15)',
            text:       '#ffffff',
            label:      'Info',
            icon:       'i',
            progressBg: 'rgba(255,255,255,0.5)',
        },
    };

    const t = themes[type] || themes.info;

    const toast = document.createElement('div');
    toast.className = 'toast-banner';
    toast.style.cssText = `
        position: relative;
        display: flex;
        align-items: flex-start;
        gap: 10px;
        background: ${t.bg};
        color: ${t.text};
      padding: 8px 10px 10px 10px;
      border-radius: 7px;
      font-family: 'Poppins', sans-serif;
      font-size: 0.72rem;
        box-shadow: 0 4px 16px rgba(0,0,0,0.22);
        pointer-events: all;
        width: 100%;
        box-sizing: border-box;
        overflow: hidden;
    `;

    toast.innerHTML = `
        <!-- Close button (left) -->
        <button class="toast-close-btn" style="
            flex-shrink: 0;
            background: none;
            border: none;
            color: ${t.text};
            font-size: 1rem;
            cursor: pointer;
            opacity: 0.6;
            padding: 0;
            margin-top: 1px;
            line-height: 1;
            transition: opacity 0.2s;
        ">✕</button>

        <!-- Text content -->
        <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 700; font-size: 0.82rem; margin-bottom: 2px;">${t.label}</div>
            <div style="font-weight: 400; font-size: 0.76rem; opacity: 0.92; line-height: 1.4;">${message}</div>
        </div>

        <!-- Icon circle (right) -->
        <div style="
            flex-shrink: 0;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: ${t.iconBg};
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.9rem;
            font-weight: 700;
            margin-top: 1px;
        ">${t.icon}</div>

        <!-- Progress bar -->
        <div class="toast-progress" style="
          background: ${t.progressBg};
          animation-duration: ${duration}ms;
        "></div>
    `;

    // Close button
    toast.querySelector('.toast-close-btn').addEventListener('click', () => dismissToast(toast));

    container.appendChild(toast);

    // Auto dismiss
    const timer = setTimeout(() => dismissToast(toast), duration);
    toast._timer = timer;
}

function dismissToast(toast) {
    if (toast._dismissed) return;
    toast._dismissed = true;
    clearTimeout(toast._timer);
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 380);
}

// ═══════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════
function toggleNotifications() {
  const panel = document.getElementById('notificationPanel');
  if (!panel) return;
  
  const isOpen = panel.classList.contains('open');
  if (!isOpen) {
    renderNotifications();
  }
  panel.classList.toggle('open');
}

function renderNotifications() {
  const list = document.getElementById('notificationList');
  if (!list) return;
  
  const unreadCount = notificationsData.filter(n => !n.read).length;
  const badge = document.querySelector('.notif-dot');
  if (badge) {
    badge.style.display = unreadCount > 0 ? 'block' : 'none';
  }
  
  list.innerHTML = notificationsData.map(n => `
    <div class="notification-item${n.read ? ' read' : ''}" onclick="openNotification(${n.id})" role="button" tabindex="0">
      <div class="notification-avatar" style="background:${n.color}">${n.avatar}</div>
      <div class="notification-content">
        <div class="notification-title">${n.title}</div>
        <div class="notification-message">${n.message}</div>
        <div class="notification-time">${n.time}</div>
      </div>
      <button class="notification-close" onclick="event.stopPropagation(); dismissNotification(${n.id})">×</button>
    </div>
  `).join('');
}

function dismissNotification(id) {
  const notif = notificationsData.find(n => n.id === id);
  if (notif) {
    notif.read = true;
    renderNotifications();
  }
}

// Open a notification: mark read, close panel, and show a brief toast
function openNotification(id) {
  const notif = notificationsData.find(n => n.id === id);
  if (!notif) return;
  notif.read = true;
  renderNotifications();
  const panel = document.getElementById('notificationPanel');
  if (panel) panel.classList.remove('open');
  try {
    showToast(notif.title + ': ' + notif.message, 'info', 3500);
  } catch (e) {
    // showToast may be defined elsewhere (login/dashboard); ignore if missing
  }
}

// ═══════════════════════════════════════
// INIT
// ═══════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  renderUsers(usersData);
  renderApps('all');
  // Initialize notifications badge/list on load
  renderNotifications();
});

