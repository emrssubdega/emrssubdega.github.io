const client = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

const loginBox = document.getElementById('loginBox');
const dashboard = document.getElementById('dashboard');
const loginMsg = document.getElementById('loginMsg');

function configReady() {
  return window.SUPABASE_URL && !window.SUPABASE_URL.includes("PASTE_") &&
         window.SUPABASE_ANON_KEY && !window.SUPABASE_ANON_KEY.includes("PASTE_");
}

async function checkSession() {
  if (!configReady()) {
    loginMsg.textContent = "First configure supabase-config.js.";
    return;
  }
  const { data } = await client.auth.getSession();
  if (data.session) showDashboard();
}
function showDashboard() {
  loginBox.classList.add('hidden');
  dashboard.classList.remove('hidden');
  loadContent();
  loadNotices();
}
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!configReady()) { loginMsg.textContent = "Supabase configuration is missing."; return; }
  loginMsg.textContent = "Signing in...";
  const { error } = await client.auth.signInWithPassword({
    email: document.getElementById('email').value.trim(),
    password: document.getElementById('password').value
  });
  loginMsg.textContent = error ? error.message : "";
  if (!error) showDashboard();
});
document.getElementById('logoutBtn').addEventListener('click', async () => {
  await client.auth.signOut();
  dashboard.classList.add('hidden');
  loginBox.classList.remove('hidden');
});

async function loadContent() {
  const { data, error } = await client.from('site_content').select('*').eq('id',1).maybeSingle();
  if (error) { document.getElementById('contentMsg').textContent = error.message; return; }
  if (!data) return;
  document.getElementById('address').value = data.address || '';
  document.getElementById('phone').value = data.phone || '';
  document.getElementById('schoolEmail').value = data.email || '';
  document.getElementById('aboutText').value = data.about_text || '';
  document.getElementById('principalMessage').value = data.principal_message || '';
}
document.getElementById('saveContent').addEventListener('click', async () => {
  const payload = {
    id: 1,
    address: document.getElementById('address').value,
    phone: document.getElementById('phone').value,
    email: document.getElementById('schoolEmail').value,
    about_text: document.getElementById('aboutText').value,
    principal_message: document.getElementById('principalMessage').value,
    updated_at: new Date().toISOString()
  };
  const { error } = await client.from('site_content').upsert(payload);
  document.getElementById('contentMsg').textContent = error ? error.message : "Saved successfully.";
});

async function loadNotices() {
  const { data, error } = await client.from('notices').select('*').order('date',{ascending:false}).order('id',{ascending:false});
  const box = document.getElementById('noticeTable');
  if (error) { box.innerHTML = `<p>${escapeHtml(error.message)}</p>`; return; }
  box.innerHTML = (data || []).map(n => `
    <div class="noticeRow">
      <h3>${escapeHtml(n.title)}</h3>
      <div>${escapeHtml(n.body)}</div>
      <small>${escapeHtml(n.date || '')} • ${n.published ? 'Published' : 'Hidden'}</small>
      <div class="noticeActions">
        <button onclick='editNotice(${JSON.stringify(n).replace(/'/g,"&#39;")})'>Edit</button>
        <button class="danger" onclick="deleteNotice(${Number(n.id)})">Delete</button>
      </div>
    </div>
  `).join('') || '<p>No notices yet.</p>';
}
function editNotice(n) {
  document.getElementById('noticeId').value = n.id;
  document.getElementById('noticeTitle').value = n.title || '';
  document.getElementById('noticeBody').value = n.body || '';
  document.getElementById('noticeDate').value = n.date || '';
  document.getElementById('noticePublished').checked = !!n.published;
  window.scrollTo({top: document.getElementById('noticeForm').offsetTop - 30, behavior:'smooth'});
}
document.getElementById('noticeForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('noticeId').value;
  const payload = {
    title: document.getElementById('noticeTitle').value.trim(),
    body: document.getElementById('noticeBody').value.trim(),
    date: document.getElementById('noticeDate').value,
    published: document.getElementById('noticePublished').checked
  };
  let result = id ? await client.from('notices').update(payload).eq('id', id) : await client.from('notices').insert(payload);
  document.getElementById('noticeMsg').textContent = result.error ? result.error.message : "Notice saved successfully.";
  if (!result.error) { clearNoticeForm(); loadNotices(); }
});
document.getElementById('cancelNotice').addEventListener('click', clearNoticeForm);
function clearNoticeForm() {
  document.getElementById('noticeId').value='';
  document.getElementById('noticeTitle').value='';
  document.getElementById('noticeBody').value='';
  document.getElementById('noticeDate').value=new Date().toISOString().slice(0,10);
  document.getElementById('noticePublished').checked=true;
}
async function deleteNotice(id) {
  if (!confirm('Delete this notice?')) return;
  const { error } = await client.from('notices').delete().eq('id', id);
  document.getElementById('noticeMsg').textContent = error ? error.message : "Notice deleted.";
  loadNotices();
}
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}
clearNoticeForm();
checkSession();
