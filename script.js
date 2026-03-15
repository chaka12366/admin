/* ════════════════════════════════════════════════════════════
   FOOTBALL TRACKER — ORGANIZER DASHBOARD
   
   Handles all organizer operations:
   - Tournament management & creation
   - Team enrollment processing
   - Match scheduling & results monitoring
   - Tournament Manager accounts & assignment
   - Standings & leaderboards
   
   All data synced with PHP backend via REST API
════════════════════════════════════════════════════════════ */
'use strict';

/**
 * ═══════════════════════════════════════════════════════════
 * API ENDPOINTS
 * ═══════════════════════════════════════════════════════════
 */
const API = {
  dashboard:     '../php/api/dashboard_stats.php',
  tournaments:   '../php/api/tournaments.php',
  enrollments:   '../php/api/enrollments.php',
  matches:       '../php/api/matches.php',
  matchEvents:   '../php/api/match_events.php',
  managers:      '../php/api/managers.php',
  standings:     '../php/api/standings.php',
  enrolledTeams: '../php/api/enrolled_teams.php',
  notifications: '../php/api/notifications.php',
  bracket:       '../php/api/bracket.php',
};

/**
 * ═══════════════════════════════════════════════════════════
 * DATA CACHE
 * ═══════════════════════════════════════════════════════════
 */
const Cache = {
  tournaments: [],
  enrollments: [],
  matches: [],
  managers: [],
  notifications: []
};

/**
 * ═══════════════════════════════════════════════════════════
 * THEME & STYLING CONSTANTS
 * ═══════════════════════════════════════════════════════════
 */
const TEAM_COLORS = [
  'linear-gradient(135deg, #1a4db5, #2d7de8)',
  'linear-gradient(135deg, #7c3aed, #a78bfa)',
  'linear-gradient(135deg, #0e7490, #22d3ee)',
  'linear-gradient(135deg, #c2410c, #fb923c)',
  'linear-gradient(135deg, #166534, #4ade80)',
  'linear-gradient(135deg, #92400e, #fbbf24)',
  'linear-gradient(135deg, #be185d, #f9a8d4)',
  'linear-gradient(135deg, #1e3a5f, #4a9eda)',
];

/**
 * Fetch data from backend API using GET
 */
async function apiGet(url, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const fullUrl = qs ? `${url}?${qs}` : url;
  const res = await fetch(fullUrl, { 
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/**
 * Send data to backend API using POST
 */
async function apiPost(url, data = {}) {
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(data)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/**
 * ═══════════════════════════════════════════════════════════
 * UTILITY FUNCTIONS
 * ═══════════════════════════════════════════════════════════
 */

/**
 * Get team color gradient based on index
 */
function teamColor(i) {
  return TEAM_COLORS[Math.abs(i) % TEAM_COLORS.length];
}

/**
 * Extract initials from name
 */
function initials(n) {
  if (!n) return '?';
  return n.split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 3);
}

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Format date to readable format
 */
function formatDate(d) {
  if (!d) return '—';
  try {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return d;
  }
}

/**
 * Debounce function calls to prevent rapid execution
 */
function debounce(fn, ms) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}

/**
 * Get form field value by ID
 */
function val(id) {
  const e = document.getElementById(id);
  return e ? e.value : '';
}

/**
 * Set form field value by ID
 */
function setVal(id, v) {
  const e = document.getElementById(id);
  if (e) e.value = v;
}

/**
 * Clear all form inputs
 */
function clearForm(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.querySelectorAll('input,select,textarea').forEach(e => {
    if (e.tagName === 'SELECT') e.selectedIndex = 0;
    else e.value = '';
  });
}

/**
 * Generate empty state HTML
 */
function emptyStateHTML(icon, title, sub) {
  const icons = {
    calendar: `<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    package: `<svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>`,
    users: `<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>`
  };
  return `<div class="empty-state">
    ${icons[icon] || icons.package}
    <div class="empty-state-title">${escapeHtml(title)}</div>
    ${sub ? `<div class="empty-state-sub">${escapeHtml(sub)}</div>` : ''}
  </div>`;
}

/**
 * Upload organizer profile image to server
 */
function uploadProfileImage(file, avatarEl, fullName) {
  if (!file) return;
  
  // Validate file
  if (!file.type.startsWith('image/')) {
    showToast('error', 'Please select an image file');
    return;
  }
  
  if (file.size > 5 * 1024 * 1024) {
    showToast('error', 'File too large (max 5MB)');
    return;
  }
  
  // Create FormData
  const formData = new FormData();
  formData.append('profile_image', file);
  
  // Show loading state
  avatarEl.style.opacity = '0.5';
  
  // Upload
  fetch('../php/api/upload_profile_image.php', {
    method: 'POST',
    credentials: 'include',
    body: formData
  })
    .then(r => r.json())
    .then(data => {
      avatarEl.style.opacity = '1';
      if (data.error) {
        showToast('error', 'Error: ' + data.message);
        return;
      }
      
      // Update avatar image
      avatarEl.style.backgroundImage = `url('${data.image_url}?t=${Date.now()}')`;
      avatarEl.style.backgroundSize = 'cover';
      avatarEl.style.backgroundPosition = 'center';
      avatarEl.textContent = '';
      
      showToast('success', 'Profile image uploaded successfully');
    })
    .catch(err => {
      avatarEl.style.opacity = '1';
      console.error('Upload error:', err);
      showToast('error', 'Upload failed');
    });
}

// ── PAGE LOAD ──
document.addEventListener('DOMContentLoaded',()=>{
  if(typeof SessionHelper!=='undefined'){
    SessionHelper.getUserInfo(d=>{
      if(d.user){
        const u=d.user;
        const n=document.getElementById('orgName'),
              r=document.getElementById('orgRole'),
              a=document.getElementById('orgAvatar');
        
        if(n) n.textContent=u.full_name||'Organizer';
        if(r) r.textContent=u.role||'Organizer';
        
        // Set avatar with image or initials
        if(a && u.id){
          a.style.cursor='pointer';
          a.title='Click to upload profile image';
          
          // If user has profile image, show it
          if(u.profile_image){
            a.style.backgroundImage=`url('${u.profile_image}')`;
            a.style.backgroundSize='cover';
            a.style.backgroundPosition='center';
            a.textContent='';
          } else {
            // Show initials
            a.textContent=initials(u.full_name||'OR');
          }
          
          // Add click handler to upload image
          a.onclick=()=>{
            const input=document.createElement('input');
            input.type='file';
            input.accept='image/*';
            input.onchange=(e)=>uploadProfileImage(e.target.files[0],a,u.full_name);
            input.click();
          };
        }
      }
    });
  }
  navigate(sessionStorage.getItem('orgCurrentPage') || 'dashboard');
  loadNotifications();
  const gs=document.querySelector('.topbar-search input');
  if(gs)gs.addEventListener('input',debounce(handleGlobalSearch,300));
  document.addEventListener('click',e=>{const p=document.getElementById('notificationPanel'),b=document.getElementById('notifBtn');if(p&&b&&!p.contains(e.target)&&!b.contains(e.target))p.classList.remove('open');});
});

// ── NAVIGATION ──
const PAGE_META={dashboard:['Dashboard','Overview of your tournaments'],tournaments:['My Tournaments','Create and manage tournaments'],enrollment:['Team Enrollment','Review team enrollment requests'],schedule:['Match Schedule','Schedule and manage matches'],managers:['Tournament Managers','Create and assign managers to tournaments'],results:['Match Results','Monitor match results for your tournaments'],standings:['Standings','Live tournament standings & leaderboard'],bracket:['Tournament Bracket','Knockout elimination bracket & results']};
function navigate(page){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const pe=document.getElementById('page-'+page);if(!pe)return;pe.classList.add('active');
  document.querySelectorAll(`[data-page="${page}"]`).forEach(el=>el.classList.add('active'));
  const[title,sub]=PAGE_META[page]||['Dashboard',''];
  document.getElementById('pageTitle').textContent=title;document.getElementById('pageSub').textContent=sub;
  sessionStorage.setItem('orgCurrentPage', page);
  closeSidebar();window.scrollTo({top:0,behavior:'smooth'});
  switch(page){case'dashboard':loadDashboard();break;case'tournaments':loadTournaments();break;case'enrollment':loadEnrollments();break;case'schedule':loadMatches();break;case'managers':loadManagers();break;case'results':loadResults('all');break;case'standings':loadStandingsPage();break;case'bracket':loadBracketPage();break;}
}
document.querySelectorAll('.nav-item[data-page]').forEach(item=>item.addEventListener('click',e=>{e.preventDefault();navigate(item.dataset.page);}));

// ── SIDEBAR ──
function toggleSidebar(){document.getElementById('sidebar').classList.toggle('open');document.getElementById('sidebarOverlay').classList.toggle('open');}
function closeSidebar(){document.getElementById('sidebar').classList.remove('open');document.getElementById('sidebarOverlay').classList.remove('open');}
let tX=0,tY=0;
document.addEventListener('touchstart',e=>{tX=e.touches[0].clientX;tY=e.touches[0].clientY;},{passive:true});
document.addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-tX,dy=Math.abs(e.changedTouches[0].clientY-tY);if(dx<-60&&dy<80&&document.getElementById('sidebar').classList.contains('open'))closeSidebar();if(dx>60&&dy<80&&tX<24&&!document.getElementById('sidebar').classList.contains('open'))toggleSidebar();},{passive:true});
function logoutUser(){showConfirm('Logout?','Are you sure you want to logout?','Logout',()=>{showToast('info','Logging out…');setTimeout(()=>{if(typeof SessionHelper!=='undefined')SessionHelper.logout();else window.location.href='../index.html';},1200);},'primary');}

// ── NOTIFICATIONS ──
async function loadNotifications(){try{const d=await apiGet(API.notifications,{limit:30});Cache.notifications=d.data||[];renderNotifications();}catch{}}
function renderNotifications(){
  const list=document.getElementById('notificationList'),dot=document.querySelector('.notif-dot');if(!list)return;
  const unread=Cache.notifications.filter(n=>!n.read).length;if(dot)dot.style.display=unread>0?'block':'none';
  const badge=document.getElementById('orgEnrollmentBadge');if(badge){const p=Cache.notifications.filter(n=>!n.read&&n.type&&n.type.includes('enrollment')).length;badge.textContent=p>0?p:'';}
  if(!Cache.notifications.length){list.innerHTML='<div class="notif-empty">✓ You\'re all caught up!</div>';return;}
  const NC=['linear-gradient(135deg,#1a4db5,#2d7de8)','linear-gradient(135deg,#7c3aed,#a78bfa)','linear-gradient(135deg,#0e7490,#22d3ee)','linear-gradient(135deg,#c2410c,#fb923c)','linear-gradient(135deg,#166534,#4ade80)'];
  list.innerHTML=Cache.notifications.map((n,i)=>`<div class="notification-item${n.read?' read':''}" onclick="openNotification(${n.id})"><div class="notification-avatar" style="background:${NC[i%NC.length]}">${(n.title||'?')[0]}</div><div class="notification-content"><div class="notification-title">${escapeHtml(n.title)}</div><div class="notification-message">${escapeHtml(n.message)}</div><div class="notification-time">${n.time?new Date(n.time).toLocaleString():''}</div></div><button class="notification-close" onclick="event.stopPropagation();dismissNotification(${n.id})">×</button></div>`).join('');
}
function toggleNotifications(){document.getElementById('notificationPanel').classList.toggle('open');}
async function dismissNotification(id){const n=Cache.notifications.find(x=>x.id===id);if(n){n.read=true;renderNotifications();}try{await apiPost(API.notifications,{action:'dismiss',notif_id:id});}catch{}}
async function openNotification(id){const n=Cache.notifications.find(x=>x.id===id);if(!n)return;n.read=true;renderNotifications();document.getElementById('notificationPanel').classList.remove('open');showToast('info',`${n.title}: ${n.message}`,4000);try{await apiPost(API.notifications,{action:'mark_read',notif_id:id});}catch{}}

// ── DASHBOARD ──
async function loadDashboard(){
  try{
    const data=await apiGet(API.dashboard);
    const vals=document.querySelectorAll('.stats-grid .stat-value');
    if(vals.length>=4){vals[0].textContent=data.totalTournaments??0;vals[1].textContent=data.enrolledTeams??0;vals[2].textContent=data.matchesThisWeek??0;vals[3].textContent=data.pendingEnrollments??0;}
    const upcoming=data.upcomingMatches||[],dashList=document.getElementById('dashMatchList'),dashCards=document.getElementById('dashMatchCards'),dashSub=document.getElementById('dashMatchesSub');
    if(dashSub)dashSub.textContent=upcoming.length?`${upcoming.length} upcoming match${upcoming.length>1?'es':''}`:'No matches scheduled';
    if(dashList)dashList.innerHTML=upcoming.length?upcoming.map(matchItemHTML).join(''):emptyStateHTML('calendar','No upcoming matches','Schedule matches from the Match Schedule tab.');
    if(dashCards)dashCards.innerHTML=upcoming.length?upcoming.map(matchCardHTML).join(''):emptyStateHTML('calendar','No upcoming matches','');
    const pending=data.pendingList||[],dashEnroll=document.getElementById('dashEnrollList'),dashEnSub=document.getElementById('dashEnrollSub');
    if(dashEnSub)dashEnSub.textContent=pending.length?`${pending.length} request${pending.length>1?'s':''} awaiting decision`:'All reviewed';
    if(dashEnroll)dashEnroll.innerHTML=pending.length?pending.map((e,i)=>`<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--gray-100);"><div class="team-logo" style="background:${teamColor(i)};width:38px;height:38px;font-size:13px;">${initials(e.teamName)}</div><div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:700;color:var(--gray-800);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(e.teamName)}</div><div style="font-size:11.5px;color:var(--gray-400);">${escapeHtml(e.tournamentName||'—')}</div></div><div style="display:flex;gap:5px;"><button class="btn-icon success" onclick="quickEnroll(${e.id},'approve')" title="Approve"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></button><button class="btn-icon danger" onclick="quickEnroll(${e.id},'reject')" title="Reject"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div></div>`).join(''):'<div style="padding:24px 0;text-align:center;color:var(--gray-400);font-size:13.5px;">✓ All caught up! No pending enrollments.</div>';
    const badge=document.getElementById('orgEnrollmentBadge');if(badge)badge.textContent=(data.pendingEnrollments||0)>0?data.pendingEnrollments:'';
  }catch(err){showToast('error','Failed to load dashboard data.');console.error(err);}
}

// ── TOURNAMENTS ──
let _tournamentFilter='all';
async function loadTournaments(filter){filter=filter||_tournamentFilter;try{const data=await apiGet(API.tournaments,{filter});Cache.tournaments=data.data||[];renderTournaments(Cache.tournaments);}catch{showToast('error','Failed to load tournaments.');}}
function renderTournaments(list){
  const grid=document.getElementById('tournamentGrid');if(!grid)return;
  if(!list.length){grid.innerHTML=`<div style="grid-column:1/-1;">${emptyStateHTML('package','No tournaments yet','Click "New Tournament" to create your first tournament.')}</div>`;populateTournamentDropdowns();return;}
  grid.innerHTML=list.map(t=>`<div class="tournament-card" onclick="openEditTournament(${t.id})"><div class="tournament-card-banner ${t.status}"></div><div class="tournament-card-body"><div class="tournament-card-top"><div class="tournament-card-name">${escapeHtml(t.name)}</div><span class="badge badge-${t.status}">${t.status}</span></div><div class="tournament-meta">${t.startDate?`<div class="tournament-meta-row"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${formatDate(t.startDate)} — ${formatDate(t.endDate)}</div>`:''} ${t.venue?`<div class="tournament-meta-row"><svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>${escapeHtml(t.venue)}${t.location?' · '+escapeHtml(t.location):''}</div>`:''} ${t.division?`<div class="tournament-meta-row"><svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>${escapeHtml(t.division)}${t.ageGroup?' · '+escapeHtml(t.ageGroup):''}</div>`:''}</div></div><div class="tournament-card-footer"><div class="team-count"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>${t.teamCount||0} Teams · ${t.matchCount||0} Matches</div><div class="tournament-card-actions" onclick="event.stopPropagation()"><button class="btn-icon" title="Edit" onclick="openEditTournament(${t.id})"><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button><button class="btn-icon" title="View Matches" onclick="navigate('schedule')"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></button>${t.status==='ongoing'?`<button class="btn-icon" title="Close Tournament" onclick="event.stopPropagation();closeTournament(${t.id})" style="color:var(--orange);"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></button>`:''}<button class="btn-icon danger" title="Delete" onclick="deleteTournament(${t.id})"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg></button></div></div></div>`).join('');
  populateTournamentDropdowns();
}
function filterTournaments(filter,btn){_tournamentFilter=filter;document.querySelectorAll('#page-tournaments .tab-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');loadTournaments(filter);}
function populateTournamentDropdowns(){['enrollmentTournamentFilter','scheduleMatchTournament','scheduleMatchFilterTournament','standingsTournamentSelect','managerTournamentFilter','tmTournament','tmAssignTournament'].forEach(id=>{const el=document.getElementById(id);if(!el)return;const cur=el.value;while(el.options.length>1)el.remove(1);Cache.tournaments.forEach(t=>el.add(new Option(t.name,t.id)));if(cur)el.value=cur;});const bd=document.getElementById('bracketTournamentSelect');if(bd){const cur=bd.value;while(bd.options.length>1)bd.remove(1);Cache.tournaments.filter(t=>t.tournamentType==='knockout').forEach(t=>bd.add(new Option(t.name,t.id)));if(cur)bd.value=cur;}}
function openCreateTournament(){clearForm('createTournamentModal');openModal('createTournamentModal');}
async function createTournament(){
  const p={action:'create',name:val('ctName').trim(),description:val('ctDesc').trim(),division:val('ctDivision'),age_group:val('ctAge'),start_date:val('ctStart'),end_date:val('ctEnd'),venue_name:val('ctVenue').trim(),venue_location:val('ctLocation').trim(),tournament_type:val('ctType')||'league',team_count:val('ctTeamCount')||16};
  if(!p.name){showToast('error','Tournament name is required.');return;}
  try{const r=await apiPost(API.tournaments,p);if(r.error){showToast('error',r.message);return;}closeModal('createTournamentModal');clearForm('createTournamentModal');showToast('success',`Tournament "${p.name}" created!`);loadTournaments();loadDashboard();}catch{showToast('error','Failed to create tournament.');}
}
let _editingTournamentId=null;
function openEditTournament(id){const t=Cache.tournaments.find(x=>x.id===id);if(!t)return;_editingTournamentId=id;setVal('editTName',t.name);setVal('editTDivision',t.division||'');setVal('editTVenue',t.venue||'');setVal('editTLocation',t.location||'');setVal('editTStart',t.startDate||'');setVal('editTEnd',t.endDate||'');setVal('editTStatus',t.status);setVal('editTType',t.tournamentType||'league');openModal('editTournamentModal');}
async function saveTournament(){if(!_editingTournamentId)return;const t=Cache.tournaments.find(x=>x.id===_editingTournamentId);const p={action:'update',id:_editingTournamentId,name:val('editTName').trim()||(t?t.name:''),division:val('editTDivision'),venue_name:val('editTVenue').trim(),venue_location:val('editTLocation').trim(),start_date:val('editTStart'),end_date:val('editTEnd'),status:val('editTStatus'),tournament_type:val('editTType')||'league'};try{const r=await apiPost(API.tournaments,p);if(r.error){showToast('error',r.message);return;}closeModal('editTournamentModal');showToast('success','Tournament updated!');loadTournaments();loadDashboard();}catch{showToast('error','Failed to update.');}}
function deleteTournament(id){const t=Cache.tournaments.find(x=>x.id===id);if(!t)return;showConfirm('Delete Tournament',`Delete "${t.name}"? This cannot be undone.`,'Delete',async()=>{try{const r=await apiPost(API.tournaments,{action:'delete',id});if(r.error){showToast('error',r.message);return;}showToast('success','Tournament deleted.');loadTournaments();loadDashboard();}catch{showToast('error','Failed to delete.');}}, 'danger');}

// ── ENROLLMENTS ──
let _enrollFilter='all';
async function loadEnrollments(){const tournId=val('enrollmentTournamentFilter');const params={filter:'all'};if(tournId)params.tournament_id=tournId;try{const data=await apiGet(API.enrollments,params);Cache.enrollments=data.data||[];renderEnrollments(data.counts||{});}catch{showToast('error','Failed to load enrollments.');}}
function renderEnrollments(counts={}){
  const pending=Cache.enrollments.filter(e=>e.status==='pending');
  const subEl=document.querySelector('#page-enrollment .card:first-of-type .card-header-sub');if(subEl)subEl.textContent=`${pending.length} team${pending.length!==1?'s':''} awaiting decision`;
  const badgeEl=document.querySelector('#page-enrollment .card:first-of-type .badge');if(badgeEl){badgeEl.textContent=`${pending.length} Pending`;badgeEl.className=`badge badge-${pending.length>0?'pending':'approved'}`;}
  const pl=document.getElementById('pendingEnrollList');if(pl)pl.innerHTML=pending.length?pending.map((e,i)=>`<div class="enrollment-item"><div class="team-logo" style="background:${teamColor(i)}">${initials(e.teamName)}</div><div class="enrollment-info"><div class="enrollment-team">${escapeHtml(e.teamName)}</div><div class="enrollment-meta"><span>${escapeHtml(e.tournamentName||'—')}</span><span>·</span><span>${escapeHtml(e.division||'—')}</span><span>·</span><span>Submitted ${formatDate(e.submittedAt)}</span></div></div><div class="enrollment-actions"><button class="btn-approve-mobile" onclick="quickEnroll(${e.id},'approve')"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>Approve</button><button class="btn-reject-mobile" onclick="quickEnroll(${e.id},'reject')"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>Reject</button><button class="btn-icon" onclick="openEnrollNote(${e.id})"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg></button></div></div>`).join(''):'<div style="padding:20px;text-align:center;color:var(--gray-400);font-size:14px;">✓ No pending enrollments</div>';
  const pc=document.getElementById('pendingEnrollCards');if(pc)pc.innerHTML=pending.map((e,i)=>`<div class="mobile-enroll-card"><div class="mobile-enroll-top"><div class="team-logo" style="background:${teamColor(i)};width:44px;height:44px;">${initials(e.teamName)}</div><div style="flex:1;"><div style="font-size:14px;font-weight:700;color:var(--gray-800);">${escapeHtml(e.teamName)}</div><div style="font-size:12px;color:var(--gray-400);">${escapeHtml(e.tournamentName||'—')}</div></div></div><div style="display:flex;gap:8px;"><button class="btn-approve-mobile" onclick="quickEnroll(${e.id},'approve')"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>Approve</button><button class="btn-reject-mobile" onclick="quickEnroll(${e.id},'reject')"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>Reject</button></div></div>`).join('');
  renderEnrollTable(_enrollFilter);
}
function renderEnrollTable(filter){
  _enrollFilter=filter;let data=filter==='all'?Cache.enrollments:Cache.enrollments.filter(e=>e.status===filter);
  const tournId=val('enrollmentTournamentFilter');if(tournId)data=data.filter(e=>String(e.tournamentId)===tournId);
  const tbody=document.getElementById('enrollTableBody');if(tbody)tbody.innerHTML=data.length?data.map((e,i)=>`<tr><td><div class="user-cell"><div class="user-avatar" style="background:${teamColor(i)};border-radius:9px;">${initials(e.teamName)}</div><div class="user-info"><div class="uname">${escapeHtml(e.teamName)}</div><div class="uemail">${escapeHtml(e.coachName||'—')}</div></div></div></td><td style="font-size:13px;">${escapeHtml(e.tournamentName||'—')}</td><td style="font-size:13px;color:var(--gray-500);">${escapeHtml(e.division||'—')}</td><td style="font-size:13px;color:var(--gray-500);">${formatDate(e.submittedAt)}</td><td><span class="badge badge-${e.status}">${e.status}</span></td><td><div class="action-btns">${e.status==='pending'?`<button class="btn-icon success" onclick="quickEnroll(${e.id},'approve')"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></button><button class="btn-icon danger" onclick="quickEnroll(${e.id},'reject')"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button><button class="btn-icon" onclick="openEnrollNote(${e.id})"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></button>`:`<span style="font-size:12px;color:var(--gray-400);">Reviewed</span>`}</div></td></tr>`).join(''):'<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--gray-400);">No enrollments found</td></tr>';
  const cards=document.getElementById('enrollAllCards');if(cards)cards.innerHTML=data.map((e,i)=>`<div class="mobile-enroll-card" style="flex-direction:row;align-items:center;gap:12px;"><div class="team-logo" style="background:${teamColor(i)};width:40px;height:40px;font-size:13px;">${initials(e.teamName)}</div><div style="flex:1;min-width:0;"><div style="font-size:13.5px;font-weight:700;color:var(--gray-800);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(e.teamName)}</div><div style="font-size:11.5px;color:var(--gray-400);">${escapeHtml(e.tournamentName||'—')}</div></div><span class="badge badge-${e.status}">${e.status}</span></div>`).join('');
}
function filterEnrollTab(filter,btn){document.querySelectorAll('#page-enrollment .card:last-child .tab-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');renderEnrollTable(filter);}
function filterEnrollments(){loadEnrollments();}
async function quickEnroll(id,action){const e=Cache.enrollments.find(x=>x.id===id);try{const r=await apiPost(API.enrollments,{action,enroll_id:id});if(r.error){showToast('error',r.message);return;}showToast(action==='approve'?'success':'error',`${e?e.teamName:'Enrollment'} ${action==='approve'?'approved':'rejected'}!`);loadEnrollments();loadDashboard();}catch{showToast('error','Failed to process enrollment.');}}
let _enrollNoteId=null;
function openEnrollNote(id){const e=Cache.enrollments.find(x=>x.id===id);if(!e)return;_enrollNoteId=id;document.getElementById('enrollModalTitle').textContent='Review Enrollment';document.getElementById('enrollModalTeam').textContent=e.teamName;document.getElementById('enrollModalTournament').textContent=(e.tournamentName||'—')+(e.division?' · '+e.division:'');document.getElementById('enrollNoteText').value='';openModal('enrollNoteModal');}
async function doEnrollDecision(action){if(_enrollNoteId===null)return;const notes=document.getElementById('enrollNoteText').value.trim();try{const r=await apiPost(API.enrollments,{action,enroll_id:_enrollNoteId,notes});if(r.error){showToast('error',r.message);return;}closeModal('enrollNoteModal');showToast(action==='approve'?'success':'error',`Enrollment ${r.status||action+'d'}!`);loadEnrollments();loadDashboard();}catch{showToast('error','Failed to process enrollment.');}}

// ── MATCH SCHEDULE ──
async function loadMatches(params={}){const tId=val('scheduleMatchFilterTournament'),search=document.querySelector('#page-schedule .search-input-inline input')?.value?.trim()||'';if(tId)params.tournament_id=tId;if(search)params.search=search;try{const data=await apiGet(API.matches,params);Cache.matches=data.data||[];renderSchedule(Cache.matches);}catch{showToast('error','Failed to load matches.');}}
function renderSchedule(data){const list=document.getElementById('scheduleMatchList'),cards=document.getElementById('scheduleMatchCards');if(list)list.innerHTML=data.length?data.map(matchItemHTML).join(''):emptyStateHTML('calendar','No matches','Click "Schedule Match" to add a match.');if(cards)cards.innerHTML=data.length?data.map(matchCardHTML).join(''):emptyStateHTML('calendar','No matches','');}
function matchItemHTML(m){const d=m.date?new Date(m.date):null,day=d?d.getDate():'--',month=d?d.toLocaleString('default',{month:'short'}).toUpperCase():'---',scoreStr=m.status!=='scheduled'?`${m.homeScore??0} — ${m.awayScore??0}`:'vs';return`<div class="match-item ${m.status}"><div class="match-date-block"><div class="match-date-day">${day}</div><div class="match-date-month">${month}</div></div><div class="match-divider"></div><div class="match-teams"><div class="match-teams-row"><div class="match-team"><div class="match-team-name">${escapeHtml(m.homeTeam)}</div><div class="match-team-badge">${initials(m.homeTeam)}</div></div><div class="match-score">${scoreStr}</div><div class="match-team"><div class="match-team-name">${escapeHtml(m.awayTeam)}</div><div class="match-team-badge">${initials(m.awayTeam)}</div></div></div><div style="text-align:center;margin-top:6px;font-size:11px;color:var(--gray-400);">${escapeHtml(m.tournamentName||'')}${m.round?` &middot; <span style="background:linear-gradient(135deg,#7c3aed,#a78bfa);color:#fff;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:700;">${escapeHtml(m.round)}</span>`:''}</div></div><div class="match-divider"></div><div class="match-info-col"><div class="match-time">${m.time||'—'}</div><div class="match-venue">${escapeHtml(m.venue||'—')}</div><div style="margin-top:4px;"><span class="badge badge-${m.status}">${m.status}</span></div></div><div class="match-actions">${m.status==='played'||m.status==='confirmed'?`<button class="btn-icon success" onclick="openMatchEvents(${m.id})" title="View Events"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></button>`:''}<button class="btn-icon" onclick="openEditMatch(${m.id})"><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button><button class="btn-icon danger" onclick="deleteMatch(${m.id})"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg></button></div></div>`;}
function matchCardHTML(m){const scoreStr=m.status!=='scheduled'?`${m.homeScore??0}—${m.awayScore??0}`:'vs';return`<div class="mobile-match-card"><div class="mobile-match-card-top"><div style="position:absolute;left:0;top:0;bottom:0;width:3px;background:${m.status==='scheduled'?'var(--accent)':m.status==='confirmed'?'var(--green)':m.status==='disputed'?'var(--red)':'var(--gray-300)'};"></div><div class="mobile-match-vs" style="padding-left:8px;"><div class="mobile-team-name">${escapeHtml(m.homeTeam)}</div><div class="mobile-score-badge">${scoreStr}</div><div class="mobile-team-name">${escapeHtml(m.awayTeam)}</div></div></div><div class="mobile-match-card-footer"><div class="mobile-match-meta"><div>${formatDate(m.date)} · ${m.time||'—'}${m.round?` · <span style="background:linear-gradient(135deg,#7c3aed,#a78bfa);color:#fff;padding:1px 5px;border-radius:4px;font-size:10px;font-weight:700;">${escapeHtml(m.round)}</span>`:''}</div><div style="margin-top:2px;">${escapeHtml(m.venue||'—')} · <span class="badge badge-${m.status}" style="font-size:10px;padding:2px 7px;">${m.status}</span></div></div><div class="mobile-match-actions">${m.status==='played'||m.status==='confirmed'?`<button class="btn-icon success" onclick="openMatchEvents(${m.id})"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></button>`:''}<button class="btn-icon" onclick="openEditMatch(${m.id})"><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button></div></div></div>`;}
function filterScheduleSearch(v){loadMatches({search:v});}
function filterScheduleByTournament(v){loadMatches(v?{tournament_id:v}:{});}
function filterMatchStatus(v){loadMatches(v?{status:v}:{});}
async function openScheduleMatch(){clearForm('scheduleMatchModal');if(!Cache.tournaments.length)await loadTournaments();populateTournamentDropdowns();['scheduleMatchHomeTeam','scheduleMatchAwayTeam'].forEach(id=>{const el=document.getElementById(id);if(el)while(el.options.length>1)el.remove(1);});openModal('scheduleMatchModal');}
document.addEventListener('change',async e=>{
  if(e.target&&e.target.id==='scheduleMatchTournament'){const tId=e.target.value,homeEl=document.getElementById('scheduleMatchHomeTeam'),awayEl=document.getElementById('scheduleMatchAwayTeam');const rr=document.getElementById('scheduleRoundRow');if(rr)rr.style.display='none';[homeEl,awayEl].forEach(el=>{if(el)while(el.options.length>1)el.remove(1);});if(!tId)return;const tt=Cache.tournaments.find(t=>String(t.id)===tId);if(rr&&tt&&tt.tournamentType==='knockout')rr.style.display='block';try{const data=await apiGet(API.enrolledTeams,{tournament_id:tId});(data.data||[]).forEach(t=>{[homeEl,awayEl].forEach(el=>{if(el)el.add(new Option(t.teamName,t.id));});});}catch{}}
  if(e.target&&e.target.id==='editMatchStatus'){const sr=document.getElementById('editMatchScoreRow');if(sr)sr.style.display=e.target.value!=='scheduled'?'block':'none';}
  if(e.target&&e.target.id==='standingsTournamentSelect')renderStandings();
});
async function scheduleMatch(){const tId=val('scheduleMatchTournament'),homeId=val('scheduleMatchHomeTeam'),awayId=val('scheduleMatchAwayTeam'),date=val('scheduleMatchDate'),time=val('scheduleMatchTime'),venue=val('scheduleMatchVenue').trim();if(!homeId||!awayId){showToast('error','Please select both teams.');return;}if(homeId===awayId){showToast('error','Teams must be different.');return;}if(!date||!time){showToast('error','Date and time are required.');return;}try{const round=val('scheduleMatchRound');const r=await apiPost(API.matches,{action:'create',tournament_id:tId,home_team_id:homeId,away_team_id:awayId,date,time,venue,round});if(r.error){showToast('error',r.message);return;}closeModal('scheduleMatchModal');showToast('success','Match scheduled!');loadMatches();loadDashboard();}catch{showToast('error','Failed to schedule match.');}}
let _editMatchId=null;
function openEditMatch(id){const m=Cache.matches.find(x=>x.id===id);if(!m)return;_editMatchId=id;setVal('editMatchHome',m.homeTeam);setVal('editMatchAway',m.awayTeam);setVal('editMatchDate',m.date||'');setVal('editMatchTime',m.time||'');setVal('editMatchVenue',m.venue||'');setVal('editMatchStatus',m.status);const hS=document.getElementById('editMatchHomeScore'),aS=document.getElementById('editMatchAwayScore'),sr=document.getElementById('editMatchScoreRow');if(hS)hS.value=m.homeScore??0;if(aS)aS.value=m.awayScore??0;if(sr)sr.style.display=m.status!=='scheduled'?'block':'none';openModal('editMatchModal');}
async function saveMatch(){const p={action:'update',match_id:_editMatchId,date:val('editMatchDate'),time:val('editMatchTime'),venue:val('editMatchVenue').trim(),status:val('editMatchStatus'),home_score:document.getElementById('editMatchHomeScore')?.value||0,away_score:document.getElementById('editMatchAwayScore')?.value||0};try{const r=await apiPost(API.matches,p);if(r.error){showToast('error',r.message);return;}closeModal('editMatchModal');showToast('success','Match updated!');loadMatches();loadResults('all');loadDashboard();}catch{showToast('error','Failed to update match.');}}
function deleteMatch(id){const m=Cache.matches.find(x=>x.id===id);if(!m)return;showConfirm('Delete Match',`Delete "${m.homeTeam} vs ${m.awayTeam}"?`,'Delete',async()=>{try{const r=await apiPost(API.matches,{action:'delete',match_id:id});if(r.error){showToast('error',r.message);return;}showToast('success','Match deleted.');loadMatches();loadDashboard();}catch{showToast('error','Failed to delete.');}}, 'danger');}

// ── TOURNAMENT MANAGERS ──
async function loadManagers(){
  const tournId=val('managerTournamentFilter');
  const params={};if(tournId)params.tournament_id=tournId;
  try{const data=await apiGet(API.managers,params);Cache.managers=data.data||[];renderManagers();}
  catch{showToast('error','Failed to load managers.');}
}
function renderManagers(){
  const tbody=document.getElementById('managersTableBody'),cards=document.getElementById('managersMobileCards'),count=document.getElementById('managerCount');
  if(count)count.textContent=`${Cache.managers.length} manager${Cache.managers.length!==1?'s':''} assigned`;
  if(!Cache.managers.length){if(tbody)tbody.innerHTML='<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--gray-400);">No managers assigned yet. Click "Add Tournament Manager" to get started.</td></tr>';if(cards)cards.innerHTML='';return;}
  if(tbody)tbody.innerHTML=Cache.managers.map((m,i)=>`<tr><td><div class="user-cell"><div class="user-avatar" style="background:${teamColor(i)};border-radius:9px;">${initials(m.fullName||m.name)}</div><div class="user-info"><div class="uname">${escapeHtml(m.fullName||m.name)}</div><div class="uemail">${escapeHtml(m.email)}</div></div></div></td><td style="font-size:13px;color:var(--gray-500);">${escapeHtml(m.email)}</td><td style="font-size:13px;">${escapeHtml(m.tournamentName||'—')}</td><td style="font-size:13px;color:var(--gray-500);">${m.assignedAt?formatDate(m.assignedAt):'—'}</td><td><div class="action-btns"><button class="btn-icon danger" title="Remove assignment" onclick="removeManager(${m.assignmentId||m.id})"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg></button></div></td></tr>`).join('');
  if(cards)cards.innerHTML=Cache.managers.map((m,i)=>`<div class="mobile-enroll-card" style="flex-direction:row;align-items:center;gap:12px;"><div class="team-logo" style="background:${teamColor(i)};width:40px;height:40px;font-size:13px;">${initials(m.fullName||m.name)}</div><div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:700;color:var(--gray-800);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(m.fullName||m.name)}</div><div style="font-size:11.5px;color:var(--gray-400);">${escapeHtml(m.tournamentName||'—')}</div></div><button class="btn-icon danger" onclick="removeManager(${m.assignmentId||m.id})"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg></button></div>`).join('');
}
function openCreateManager(){
  clearForm('addManagerModal');
  if(!Cache.tournaments.length) loadTournaments().then(populateTournamentDropdowns); else populateTournamentDropdowns();
  setTMModalMode('create');
  openModal('addManagerModal');
}

/** Switch between "Create New" and "Assign Existing" tabs in the Add Manager modal */
function setTMModalMode(mode){
  const createSec=document.getElementById('tmCreateSection'),assignSec=document.getElementById('tmAssignSection');
  const tabCreate=document.getElementById('tmTabCreate'),tabAssign=document.getElementById('tmTabAssign');
  const lbl=document.getElementById('tmModalSubmitLabel');
  const isCreate=(mode==='create');
  if(createSec)createSec.style.display=isCreate?'':'none';
  if(assignSec)assignSec.style.display=isCreate?'none':'';
  if(tabCreate){tabCreate.style.background=isCreate?'var(--primary,#4f46e5)':'transparent';tabCreate.style.color=isCreate?'#fff':'var(--text-muted,#666)';}
  if(tabAssign){tabAssign.style.background=isCreate?'transparent':'var(--primary,#4f46e5)';tabAssign.style.color=isCreate?'var(--text-muted,#666)':'#fff';}
  if(lbl)lbl.innerHTML=isCreate?'Create &amp; Assign':'Assign Manager';
  if(!isCreate) populateExistingManagersDropdown();
}

/** Populate the "Assign Existing" select with deduplicated TM accounts from Cache.managers */
function populateExistingManagersDropdown(){
  const sel=document.getElementById('tmExistingManagerSelect');
  if(!sel)return;
  while(sel.options.length>1)sel.remove(1);
  // Deduplicate managers by userId so each person appears only once
  const seen=new Set();
  Cache.managers.forEach(m=>{
    const uid=m.userId||m.user_id||m.id;
    if(uid&&!seen.has(uid)){seen.add(uid);sel.add(new Option((m.fullName||m.name)+' ('+m.email+')',uid));}
  });
  // If Cache.managers is empty, load them first
  if(!Cache.managers.length) loadManagers().then(()=>{
    Cache.managers.forEach(m=>{
      const uid=m.userId||m.user_id||m.id;
      if(uid&&!seen.has(uid)){seen.add(uid);sel.add(new Option((m.fullName||m.name)+' ('+m.email+')',uid));}
    });
  });
}

/** Called by the modal footer button — delegates to the correct action based on active tab */
function submitTMModal(){
  const assignSec=document.getElementById('tmAssignSection');
  if(assignSec&&assignSec.style.display!=='none') assignExistingManager();
  else createTournamentManager();
}

/** Assign an existing TM account to an additional tournament */
async function assignExistingManager(){
  const userId=val('tmExistingManagerSelect'),tournId=val('tmAssignTournament');
  if(!userId){showToast('error','Please select a manager.');return;}
  if(!tournId){showToast('error','Please select a tournament to assign.');return;}
  try{
    const r=await apiPost(API.managers,{action:'assign_existing',user_id:userId,tournament_id:tournId});
    if(r.error){showToast('error',r.message);return;}
    closeModal('addManagerModal');
    showToast('success','Manager assigned to tournament!');
    loadManagers();
  }catch{showToast('error','Failed to assign manager.');}
}
async function createTournamentManager(){const fullName=val('tmFullName').trim(),email=val('tmEmail').trim(),phone=val('tmPhone').trim(),tournId=val('tmTournament');if(!fullName){showToast('error','Full name is required.');return;}if(!email){showToast('error','Email is required.');return;}if(!tournId){showToast('error','Please select a tournament to assign.');return;}try{const r=await apiPost(API.managers,{action:'create_and_assign',full_name:fullName,email,phone,tournament_id:tournId});if(r.error){showToast('error',r.message);return;}closeModal('addManagerModal');showToast('success',`Manager "${fullName}" created and assigned!`);if(r.tempPassword)showToast('info',`Temporary password: ${r.tempPassword}`,10000);loadManagers();}catch{showToast('error','Failed to create tournament manager.');}}
function removeManager(id){showConfirm('Remove Manager','Remove this manager assignment? The user account will remain active.','Remove',async()=>{try{const r=await apiPost(API.managers,{action:'remove',assignment_id:id});if(r.error){showToast('error',r.message);return;}showToast('success','Manager assignment removed.');loadManagers();}catch{showToast('error','Failed to remove manager.');}}, 'danger');}

// ── TOURNAMENT UTILITIES ──
function closeTournament(id){const t=Cache.tournaments.find(x=>x.id===id);if(!t)return;showConfirm('Close Tournament',`Mark "${t.name}" as completed? This action closes the tournament.`,'Close Tournament',async()=>{try{const r=await apiPost(API.tournaments,{action:'update',id,status:'completed',name:t.name,tournament_type:t.tournamentType||'league'});if(r.error){showToast('error',r.message);return;}showToast('success',`"${t.name}" has been closed.`);loadTournaments();loadDashboard();}catch{showToast('error','Failed to close tournament.');}}, 'primary');}
function updateTeamCountInfo(){const count=parseInt(val('ctTeamCount'))||16,type=val('ctType'),infoEl=document.getElementById('ctTeamCountInfo');if(!infoEl)return;if(type==='league'){infoEl.style.display='block';infoEl.textContent=`League: All ${count} teams play each other once.`;return;}const m={10:'2 groups of 5 · Top 2 qualify → Semi-Finals + Final (no R16)',12:'2 groups of 6 · Top 2 qualify → Semi-Finals + Final (no R16)',16:'4 groups of 4 · Top 2 qualify → R16 → QF → SF → Final',20:'4 groups of 5 · Top 2 qualify → QF → SF → Final',32:'8 groups of 4 · Top 2 qualify → R16 → QF → SF → Final'};infoEl.style.display='block';infoEl.textContent=m[count]||`${count} teams`;}

// ── MATCH RESULTS ──
async function loadResults(filter){const params={};if(filter&&filter!=='all')params.status=filter;try{const data=await apiGet(API.matches,params);Cache.matches=data.data||[];renderResults(filter);}catch{showToast('error','Failed to load results.');}}
function renderResults(filter){
  const data=filter&&filter!=='all'?Cache.matches.filter(m=>m.status===filter):Cache.matches;
  const tbody=document.getElementById('resultsBody'),cards=document.getElementById('resultsMobileCards');
  if(tbody)tbody.innerHTML=data.length?data.map((m,i)=>`<tr><td><div style="font-size:13.5px;font-weight:700;">${escapeHtml(m.homeTeam)} vs ${escapeHtml(m.awayTeam)}</div><div style="font-size:11px;color:var(--gray-400);">${escapeHtml(m.tournamentName||'—')}</div></td><td><span style="font-family:'Poppins',sans-serif;font-size:20px;font-weight:700;color:var(--gray-800);">${m.homeScore??'—'} — ${m.awayScore??'—'}</span></td><td style="font-size:13px;color:var(--gray-500);">${formatDate(m.date)}</td><td><span class="badge badge-${m.status}">${m.status}</span></td><td><div class="action-btns"><button class="btn-icon" onclick="openMatchEvents(${m.id})" title="View Events"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></button></div></td></tr>`).join(''):'<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--gray-400);">No results found</td></tr>';
  if(cards)cards.innerHTML=data.map((m,i)=>`<div class="mobile-match-card"><div class="mobile-match-card-top" style="position:relative;"><div style="position:absolute;left:0;top:0;bottom:0;width:3px;background:${m.status==='confirmed'?'var(--green)':m.status==='disputed'?'var(--red)':'var(--gray-300)'};"></div><div class="mobile-match-vs" style="padding-left:8px;flex-direction:column;gap:4px;align-items:flex-start;"><div style="font-size:14px;font-weight:700;color:var(--gray-800);">${escapeHtml(m.homeTeam)} vs ${escapeHtml(m.awayTeam)}</div><div style="font-size:22px;font-weight:700;color:var(--gray-800);">${m.homeScore??'—'} — ${m.awayScore??'—'}</div></div><div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;"><span class="badge badge-${m.status}">${m.status}</span></div></div><div class="mobile-match-card-footer"><div class="mobile-match-meta">${formatDate(m.date)} · ${escapeHtml(m.venue||'—')}</div><div class="mobile-match-actions"><button class="btn-icon" onclick="openMatchEvents(${m.id})"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></button></div></div></div>`).join('');
}
function filterResults(filter,btn){document.querySelectorAll('#page-results .tab-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');loadResults(filter);}
let _eventsMatchId=null;
async function openMatchEvents(id){_eventsMatchId=id;try{const data=await apiGet(API.matchEvents,{match_id:id});const m=data.match;document.getElementById('eventsMatchTitle').textContent=`${m.homeTeam} vs ${m.awayTeam}`;document.getElementById('eventsScore').textContent=`${m.homeScore} — ${m.awayScore}`;document.getElementById('eventsMatchMeta').textContent=`${formatDate(m.date)} · ${m.time||'—'} · ${m.venue||'—'}`;const EI={goal:{icon:'⚽',label:'Goal'},yellow_card:{icon:'🟨',label:'Yellow Card'},red_card:{icon:'🟥',label:'Red Card'},assist:{icon:'🅰️',label:'Assist'},own_goal:{icon:'⚽',label:'Own Goal'}};const events=data.events||[];document.getElementById('eventsList').innerHTML=events.length?events.map((ev,i)=>{const cfg=EI[ev.type]||{icon:'•',label:ev.type};return`<div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:${i<events.length-1?'1px solid var(--gray-100)':'none'};"><div style="font-family:'Poppins',sans-serif;font-size:13px;font-weight:700;color:var(--gray-400);min-width:36px;text-align:center;">${ev.min}'</div><div style="font-size:18px;flex-shrink:0;">${cfg.icon}</div><div style="flex:1;"><div style="font-size:13.5px;font-weight:700;color:var(--gray-800);">${escapeHtml(ev.player||'—')}</div><div style="font-size:11.5px;color:var(--gray-400);">${escapeHtml(ev.team||'—')} · ${cfg.label}</div></div></div>`;}).join(''):'<div style="padding:24px;text-align:center;color:var(--gray-400);font-size:13px;">No match events recorded</div>';openModal('matchEventsModal');}catch{showToast('error','Failed to load match events.');}}

// ── STANDINGS ──
async function loadStandingsPage(){if(!Cache.tournaments.length)await loadTournaments();populateTournamentDropdowns();renderStandings();}
async function renderStandings(){const tId=val('standingsTournamentSelect'),t=Cache.tournaments.find(x=>String(x.id)===String(tId));document.getElementById('standingsTitleHeader').textContent=t?t.name:'Select a tournament';document.getElementById('standingSubHeader').textContent=t?`${t.status} · ${t.division||''}`:'';if(!tId||!t){document.getElementById('standingsBody').innerHTML='<tr><td colspan="10" style="text-align:center;padding:32px;color:var(--gray-400);">Select a tournament to view standings</td></tr>';return;}try{const data=await apiGet(API.standings,{tournament_id:tId});const rows=data.standings||[];document.getElementById('standingsBody').innerHTML=rows.length?rows.map((s,idx)=>{const rank=idx+1,rc=rank<=3?`rank-${rank}`:'rank-other',isKo=!!(data.tournament&&data.tournament.tournamentType==='knockout');return`<tr${isKo&&s.eliminated?' style="opacity:0.6;"':''}><td><div class="rank-badge ${rc}">${rank}</div></td><td><div class="user-cell"><div class="user-avatar" style="background:${isKo&&s.eliminated?'#ef4444':teamColor(idx)};border-radius:9px;">${initials(s.team)}</div><div class="user-info"><div class="uname">${escapeHtml(s.team)}${isKo&&s.eliminated?'<span style="margin-left:6px;background:#ef4444;color:#fff;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:700;">OUT</span>':''}</div></div></div></td><td style="text-align:center;font-weight:700;">${s.played}</td><td style="text-align:center;color:var(--green-dark);font-weight:700;">${s.won}</td><td style="text-align:center;color:var(--gray-500);">${s.drawn}</td><td style="text-align:center;color:var(--red);">${s.lost}</td><td style="text-align:center;">${s.gf}</td><td style="text-align:center;">${s.ga}</td><td style="text-align:center;font-weight:600;color:${s.gd>0?'var(--green-dark)':s.gd<0?'var(--red)':'var(--gray-500)'};">${s.gd>0?'+':''}${s.gd}</td><td><div class="team-points">${s.pts}</div></td></tr>`;}).join(''):'<tr><td colspan="10" style="text-align:center;padding:32px;color:var(--gray-400);">No completed matches yet</td></tr>';}catch{showToast('error','Failed to load standings.');}}
function exportStandings(){const rows=document.querySelectorAll('#standingsBody tr');if(!rows.length){showToast('error','No standings data to export.');return;}let csv='Rank,Team,P,W,D,L,GF,GA,GD,PTS\n';rows.forEach(row=>{const cells=Array.from(row.querySelectorAll('td')).map(td=>`"${td.textContent.trim().replace(/"/g,'""')}"`);if(cells.length)csv+=cells.join(',')+'\n';});const blob=new Blob([csv],{type:'text/csv'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='standings.csv';a.click();URL.revokeObjectURL(url);showToast('success','Standings exported as CSV!');}

// ── GLOBAL SEARCH ──
function handleGlobalSearch(e){const q=e.target.value.trim();if(!q)return;const r=[...Cache.tournaments.filter(t=>t.name.toLowerCase().includes(q.toLowerCase())),...Cache.enrollments.filter(e=>e.teamName.toLowerCase().includes(q.toLowerCase())),...Cache.matches.filter(m=>m.homeTeam.toLowerCase().includes(q.toLowerCase())||m.awayTeam.toLowerCase().includes(q.toLowerCase()))];if(r.length>0)showToast('info',`Found ${r.length} result(s) for "${q}"`);}

// ── MODALS ──
function openModal(id){const el=document.getElementById(id);if(el)el.classList.add('open');}
function closeModal(id){const el=document.getElementById(id);if(el)el.classList.remove('open');}
document.querySelectorAll('.modal-overlay').forEach(overlay=>overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.classList.remove('open');}));
function showConfirm(title,msg,okLabel,onOk,variant='primary'){document.getElementById('confirmModalTitle').textContent=title;document.getElementById('confirmModalMessage').textContent=msg;const iconEl=document.getElementById('confirmModalIcon');if(iconEl){iconEl.style.background='#fef3c7';iconEl.style.color='#d97706';}const okBtn=document.getElementById('confirmModalOk');okBtn.textContent=okLabel;okBtn.className='btn-confirm';okBtn.style.background=variant==='danger'?'linear-gradient(135deg,#ef4444,#f97316)':'';document.getElementById('confirmModalCancel').onclick=()=>closeConfirmModal();okBtn.onclick=()=>{closeConfirmModal();onOk();};openModal('confirmModalOverlay');}
function closeConfirmModal(){closeModal('confirmModalOverlay');}

// ── TOAST ──
(function(){if(document.getElementById('toastKF'))return;const s=document.createElement('style');s.id='toastKF';s.textContent=`@keyframes toastIn{from{transform:translateX(110%);opacity:0}to{transform:translateX(0);opacity:1}}@keyframes toastOut{from{transform:translateX(0);opacity:1}to{transform:translateX(110%);opacity:0}}@keyframes toastProg{from{width:100%}to{width:0%}}.toast-item{animation:toastIn .4s cubic-bezier(.34,1.56,.64,1) forwards}.toast-item.hide{animation:toastOut .3s ease-in forwards}.toast-prog{position:absolute;bottom:0;left:0;height:3px;border-radius:0 0 0 8px;animation:toastProg linear forwards}`;document.head.appendChild(s);})();
function getToastContainer(){let c=document.getElementById('toastContainer');if(!c){c=document.createElement('div');c.id='toastContainer';c.style.cssText='position:fixed;bottom:16px;right:16px;display:flex;flex-direction:column;gap:10px;z-index:9999;max-width:380px;pointer-events:none;';document.body.appendChild(c);}return c;}
function showToast(type='info',message,duration=4000){const T={success:{bg:'#388e3c',label:'Success',icon:'✓'},error:{bg:'#d32f2f',label:'Error',icon:'!'},info:{bg:'#1976d2',label:'Info',icon:'i'},warning:{bg:'#b45309',label:'Warning',icon:'⚠'}};const t=T[type]||T.info,c=getToastContainer(),el=document.createElement('div');el.className='toast-item';el.style.cssText=`position:relative;display:flex;align-items:flex-start;gap:10px;background:${t.bg};color:#fff;padding:10px 12px 14px;border-radius:10px;font-family:'Poppins',sans-serif;font-size:.78rem;box-shadow:0 4px 20px rgba(0,0,0,.25);pointer-events:all;width:100%;box-sizing:border-box;overflow:hidden;`;el.innerHTML=`<button style="flex-shrink:0;background:none;border:none;color:#fff;font-size:1rem;cursor:pointer;opacity:.65;padding:0;line-height:1;" onclick="dismissToast(this.parentElement)">✕</button><div style="flex:1;min-width:0;"><div style="font-weight:700;font-size:.82rem;margin-bottom:1px;">${t.label}</div><div style="font-size:.76rem;opacity:.92;line-height:1.4;">${escapeHtml(String(message))}</div></div><div style="flex-shrink:0;width:26px;height:26px;border-radius:50%;background:rgba(0,0,0,.15);display:flex;align-items:center;justify-content:center;font-size:.85rem;font-weight:700;">${t.icon}</div><div class="toast-prog" style="background:rgba(255,255,255,.4);animation-duration:${duration}ms;"></div>`;c.appendChild(el);const timer=setTimeout(()=>dismissToast(el),duration);el._timer=timer;}
function dismissToast(el){if(!el||el._dismissed)return;el._dismissed=true;clearTimeout(el._timer);el.classList.add('hide');setTimeout(()=>el.remove(),320);}

// ── BRACKET ──
async function loadBracketPage(){if(!Cache.tournaments.length)await loadTournaments();populateTournamentDropdowns();const sel=document.getElementById('bracketTournamentSelect');if(sel&&sel.value)loadBracket(sel.value);}

async function loadBracket(tournId){
  const cont=document.getElementById('bracketContent');
  if(!tournId){if(cont)cont.innerHTML='<div style="text-align:center;padding:60px 20px;color:var(--gray-400);"><div style="font-size:16px;font-weight:600;color:var(--gray-600);margin-bottom:6px;">Select a knockout tournament</div><div style="font-size:13px;">Only tournaments with Knockout format appear here.</div></div>';return;}
  const tourn=Cache.tournaments.find(t=>String(t.id)===String(tournId));
  if(tourn&&tourn.tournamentType!=='knockout'){if(cont)cont.innerHTML='<div class="card"><div class="card-body" style="padding:32px;text-align:center;color:var(--gray-500);font-size:13.5px;">This is a <strong>league</strong> tournament. Brackets are only for Knockout format tournaments.</div></div>';return;}
  try{const data=await apiGet(API.bracket,{tournament_id:tournId});renderBracket(data,tournId);}catch{showToast('error','Failed to load bracket.');}
}

function renderBracket(data,tournId){
  const cont=document.getElementById('bracketContent');
  if(!cont)return;
  const teams=data.teams||[],rounds=data.rounds||{},remaining=data.remainingTeams||0,hasMatches=data.hasMatches||false;
  const semiFinals=data.semiFinals||[],finalMatch=data.finalMatch||null,champion=data.champion||null;
  const active=teams.filter(t=>!t.eliminated),elim=teams.filter(t=>t.eliminated);
  let html='';

  // ── Champion banner ──
  if(champion){
    html+=`<div style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border-radius:14px;padding:18px 24px;margin-bottom:16px;display:flex;align-items:center;gap:16px;box-shadow:0 4px 20px rgba(245,158,11,0.35);">
      <div style="font-size:36px;">🏆</div>
      <div><div style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;opacity:0.85;margin-bottom:3px;">Tournament Champion</div>
      <div style="font-size:22px;font-weight:800;">${escapeHtml(champion)}</div></div>
    </div>`;
  }

  // ── Teams overview card ──
  if(teams.length>0){
    html+=`<div class="card" style="margin-bottom:16px;"><div class="card-header"><div><div class="card-header-title">Teams &nbsp;<span style="font-weight:400;font-size:12px;color:var(--gray-400);">${active.length} active · ${elim.length} eliminated</span></div></div>
    <div style="display:flex;gap:8px;align-items:center;">
      ${!hasMatches?`<button class="btn-primary" style="font-size:12px;padding:7px 14px;" onclick="openGenerateBracket('first','${tournId}')"><svg viewBox="0 0 24 24" width="13" height="13" style="stroke:currentColor;fill:none;stroke-width:2.5;margin-right:4px;vertical-align:-2px;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>Generate Bracket</button>`:''}
    </div></div>
    <div style="padding:12px 16px;display:flex;flex-wrap:wrap;gap:8px;">
      ${[...active,...elim].map((t,i)=>`<div style="display:flex;align-items:center;gap:8px;padding:6px 12px;border-radius:8px;background:${t.eliminated?'rgba(239,68,68,0.07)':'var(--gray-50)'};border:1px solid ${t.eliminated?'rgba(239,68,68,0.2)':'var(--gray-200)'};${t.eliminated?'opacity:0.65;':''}"><div style="width:26px;height:26px;border-radius:6px;background:${t.eliminated?'#ef4444':teamColor(i)};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;">${initials(t.teamName)}</div><span style="font-size:12.5px;font-weight:600;color:${t.eliminated?'var(--gray-400)':'var(--gray-800)'};${t.eliminated?'text-decoration:line-through;':''}">${escapeHtml(t.teamName)}</span>${t.eliminated?'<span style="font-size:10px;background:#ef4444;color:#fff;padding:1px 6px;border-radius:4px;font-weight:700;flex-shrink:0;">OUT</span>':'<span style="font-size:10px;background:#388e3c;color:#fff;padding:1px 6px;border-radius:4px;font-weight:700;flex-shrink:0;">IN</span>'}</div>`).join('')}
    </div></div>`;
  }

  // ── FIFA-style bracket tree (Semi-Finals + Final) ──
  if(semiFinals.length>=2||(semiFinals.length>=1&&finalMatch)){
    html+=renderFifaTree(semiFinals,finalMatch,champion,teams);
  } else if(Object.keys(rounds).length===0){
    html+=`<div class="card"><div class="card-body" style="text-align:center;padding:40px;color:var(--gray-400);">No bracket matches yet. ${teams.length>=2?'Click <strong>Generate Bracket</strong> to start.':'Add and approve teams first.'}</div></div>`;
  } else {
    // Older rounds (Quarter-Finals, Round of 16, etc.) as cards
    Object.keys(rounds).forEach(roundName=>{
      if(roundName==='Semi-Finals'||roundName==='Final')return;
      const ms=rounds[roundName];
      html+=`<div class="card" style="margin-bottom:16px;"><div class="card-header"><div class="card-header-title" style="display:flex;align-items:center;gap:10px;"><span style="background:linear-gradient(135deg,#1a4db5,#2d7de8);color:#fff;padding:4px 12px;border-radius:6px;font-size:11px;font-weight:700;letter-spacing:0.04em;">${escapeHtml(roundName)}</span><span style="font-size:12px;color:var(--gray-400);">${ms.length} match${ms.length!==1?'es':''}</span></div></div><div style="padding:12px 16px;display:flex;flex-direction:column;gap:10px;">${ms.map(m=>{const hs=m.homeScore,as=m.awayScore,scored=hs!==null&&as!==null,hw=scored&&hs>as,aw=scored&&as>hs;return`<div style="display:grid;grid-template-columns:1fr auto 1fr;gap:12px;align-items:center;padding:12px;background:var(--gray-50);border-radius:10px;border:1px solid var(--gray-200);"><div style="text-align:right;"><div style="font-size:13.5px;font-weight:${hw?'700':'500'};color:${m.homeEliminated?'var(--gray-400)':hw?'var(--gray-800)':'var(--gray-600)'};${m.homeEliminated||(!hw&&scored)?'opacity:0.75;':''}">${escapeHtml(m.homeTeam)}</div>${hw?'<div style="font-size:10px;color:#388e3c;font-weight:700;margin-top:2px;">WINNER ✓</div>':''}</div><div style="text-align:center;min-width:80px;">${scored?`<div style="font-size:22px;font-weight:700;color:var(--gray-800);">${hs} — ${as}</div>`:`<div style="font-size:14px;font-weight:600;color:var(--gray-400);">vs</div>`}<span class="badge badge-${m.status}" style="font-size:10px;padding:2px 7px;">${m.status}</span></div><div style="text-align:left;"><div style="font-size:13.5px;font-weight:${aw?'700':'500'};color:${m.awayEliminated?'var(--gray-400)':aw?'var(--gray-800)':'var(--gray-600)'};${m.awayEliminated||(!aw&&scored)?'opacity:0.75;':''}">${escapeHtml(m.awayTeam)}</div>${aw?'<div style="font-size:10px;color:#388e3c;font-weight:700;margin-top:2px;">WINNER ✓</div>':''}</div></div>`;}).join('')}</div></div>`;
    });
    // Add Semi-Finals + Final tree at end if present
    if(semiFinals.length>0||finalMatch){
      html+=renderFifaTree(semiFinals,finalMatch,champion,teams);
    }
  }

  cont.innerHTML=html;
}

function _bracketMatchCard(m,labelTop,labelColor){
  if(!m) return `<div style="border:2px dashed var(--gray-200);border-radius:12px;padding:20px 16px;min-width:200px;text-align:center;color:var(--gray-400);font-size:13px;font-weight:600;">TBD</div>`;
  const hs=m.homeScore,as=m.awayScore,scored=hs!==null&&as!==null,hw=scored&&hs>as,aw=scored&&as>hs;
  const statusColor=m.status==='confirmed'?'#388e3c':m.status==='played'?'#1976d2':m.status==='disputed'?'#ef4444':'var(--gray-400)';
  return `<div style="border:2px solid ${scored&&m.status==='confirmed'?'rgba(245,158,11,0.4)':'var(--gray-200)'};border-radius:12px;padding:14px 16px;min-width:200px;max-width:240px;background:${scored&&m.status==='confirmed'?'rgba(245,158,11,0.04)':'#fff'};box-shadow:0 2px 10px rgba(0,0,0,0.06);">
    ${labelTop?`<div style="font-size:10px;font-weight:800;letter-spacing:0.08em;color:${labelColor||'#1a4db5'};text-transform:uppercase;margin-bottom:10px;">${labelTop}</div>`:''}
    <div style="display:flex;flex-direction:column;gap:8px;">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;border-radius:8px;background:${hw?'rgba(56,142,60,0.08)':'var(--gray-50)'};">
        <span style="font-size:13px;font-weight:${hw?'700':'500'};color:${hw?'#1a4db5':'var(--gray-700)'};">${escapeHtml(m.homeTeam||'TBD')}</span>
        <span style="font-size:16px;font-weight:800;color:${hw?'#388e3c':'var(--gray-500)'};">${hs!==null?hs:'—'}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;border-radius:8px;background:${aw?'rgba(56,142,60,0.08)':'var(--gray-50)'};">
        <span style="font-size:13px;font-weight:${aw?'700':'500'};color:${aw?'#1a4db5':'var(--gray-700)'};">${escapeHtml(m.awayTeam||'TBD')}</span>
        <span style="font-size:16px;font-weight:800;color:${aw?'#388e3c':'var(--gray-500)'};">${as!==null?as:'—'}</span>
      </div>
    </div>
    <div style="margin-top:8px;display:flex;justify-content:space-between;align-items:center;">
      <span style="font-size:10px;color:var(--gray-400);">${m.date?formatDate(m.date):''}</span>
      <span style="font-size:10px;font-weight:700;color:${statusColor};">${m.status.toUpperCase()}</span>
    </div>
  </div>`;
}

function renderFifaTree(semiFinals,finalMatch,champion,teams){
  const sf1=semiFinals[0]||null,sf2=semiFinals[1]||null;
  const connColor=champion?'#f59e0b':'#c7d2fe';
  return `<div class="card" style="margin-bottom:16px;">
    <div class="card-header">
      <div class="card-header-title" style="display:flex;align-items:center;gap:10px;">
        <span style="background:linear-gradient(135deg,#1a4db5,#2d7de8);color:#fff;padding:4px 12px;border-radius:6px;font-size:11px;font-weight:700;letter-spacing:0.04em;">KNOCKOUT BRACKET</span>
        ${champion?`<span style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700;">🏆 ${escapeHtml(champion)}</span>`:''}
      </div>
    </div>
    <div style="padding:20px;overflow-x:auto;">
      <!-- Desktop/tablet bracket tree -->
      <div style="display:flex;align-items:center;gap:0;min-width:560px;">
        <!-- Semi-Finals column -->
        <div style="display:flex;flex-direction:column;gap:0;flex:1;min-width:220px;">
          <div style="padding:8px 0 0 0;">
            <div style="font-size:10px;font-weight:800;letter-spacing:0.08em;color:#6366f1;text-transform:uppercase;margin-bottom:8px;padding-left:4px;">Semi-Final 1</div>
            ${_bracketMatchCard(sf1,'','#6366f1')}
          </div>
          <!-- gap between SF1 and SF2 -->
          <div style="height:24px;"></div>
          <div style="padding:0 0 8px 0;">
            <div style="font-size:10px;font-weight:800;letter-spacing:0.08em;color:#6366f1;text-transform:uppercase;margin-bottom:8px;padding-left:4px;">Semi-Final 2</div>
            ${_bracketMatchCard(sf2,'','#6366f1')}
          </div>
        </div>
        <!-- Connector lines -->
        <div style="display:flex;flex-direction:column;width:48px;align-self:stretch;flex-shrink:0;">
          <div style="flex:1;border-right:3px solid ${connColor};border-bottom:3px solid ${connColor};border-radius:0 0 10px 0;margin-top:60px;"></div>
          <div style="flex:1;border-right:3px solid ${connColor};border-top:3px solid ${connColor};border-radius:0 10px 0 0;margin-bottom:60px;"></div>
        </div>
        <div style="width:32px;flex-shrink:0;border-top:3px solid ${connColor};align-self:center;margin-top:0;"></div>
        <!-- Final column -->
        <div style="flex:1;min-width:220px;display:flex;flex-direction:column;justify-content:center;align-self:center;">
          <div style="font-size:10px;font-weight:800;letter-spacing:0.08em;color:${champion?'#d97706':'#1a4db5'};text-transform:uppercase;margin-bottom:8px;padding-left:4px;">Final</div>
          ${finalMatch?_bracketMatchCard(finalMatch,'',champion?'#d97706':'#1a4db5'):`<div style="border:2px dashed ${connColor};border-radius:12px;padding:24px 16px;text-align:center;background:rgba(99,102,241,0.03);">
            <div style="font-size:13px;font-weight:700;color:var(--gray-500);">Final</div>
            <div style="font-size:11px;color:var(--gray-400);margin-top:4px;">Auto-created when both<br>semi-finals are confirmed</div>
          </div>`}
        </div>
      </div>
    </div>
  </div>`;
}

let _genBracketAction='first',_genBracketTournId=null;
function openGenerateBracket(action,tournId){_genBracketAction=action;_genBracketTournId=tournId;document.getElementById('generateBracketModalTitle').textContent=action==='first'?'Generate First Round':'Generate Next Round';document.getElementById('genBracketDate').value='';document.getElementById('genBracketTime').value='10:00';document.getElementById('genBracketVenue').value='';openModal('generateBracketModal');}
async function doGenerateBracket(){const date=val('genBracketDate'),time=val('genBracketTime')||'10:00',venue=val('genBracketVenue').trim();if(!date){showToast('error','Please select a date for the matches.');return;}const action=_genBracketAction==='first'?'generate_bracket':'generate_next_round';try{const r=await apiPost(API.bracket,{action,tournament_id:_genBracketTournId,date,time,venue});if(r.error){showToast('error',r.message);return;}closeModal('generateBracketModal');showToast('success',r.message);loadBracket(_genBracketTournId);loadMatches();}catch{showToast('error','Failed to generate bracket.');}}
