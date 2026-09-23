const client = supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);

const loginBox = document.getElementById('loginBox');
const dashboard = document.getElementById('dashboard');
const loginMsg = document.getElementById('loginMsg');

function configReady() {
  return window.SUPABASE_URL &&
         !window.SUPABASE_URL.includes("PASTE_") &&
         window.SUPABASE_ANON_KEY &&
         !window.SUPABASE_ANON_KEY.includes("PASTE_");
}

/* ---------------- LOGIN ---------------- */

async function checkSession() {
  if (!configReady()) {
    loginMsg.textContent = "First configure supabase-config.js.";
    return;
  }

  const { data } = await client.auth.getSession();

  if (data.session) {
    showDashboard();
  }
}

function showDashboard() {
  loginBox.classList.add('hidden');
  dashboard.classList.remove('hidden');

  loadContent();
  loadNotices();
  loadGallery();
}

document.getElementById('loginForm')
.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!configReady()) {
    loginMsg.textContent = "Supabase configuration is missing.";
    return;
  }

  loginMsg.textContent = "Signing in...";

  const { error } = await client.auth.signInWithPassword({
    email: document.getElementById('email').value.trim(),
    password: document.getElementById('password').value
  });

  loginMsg.textContent = error ? error.message : "";

  if (!error) {
    showDashboard();
  }
});

document.getElementById('logoutBtn')
.addEventListener('click', async () => {
  await client.auth.signOut();
  dashboard.classList.add('hidden');
  loginBox.classList.remove('hidden');
});

/* ---------------- SCHOOL INFORMATION ---------------- */

async function loadContent() {
  const { data, error } = await client
    .from('site_content')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    document.getElementById('contentMsg').textContent = error.message;
    return;
  }

  if (!data) return;

  document.getElementById('address').value = data.address || '';
  document.getElementById('phone').value = data.phone || '';
  document.getElementById('schoolEmail').value = data.email || '';
  document.getElementById('aboutText').value = data.about_text || '';
  document.getElementById('principalMessage').value = data.principal_message || '';
}

document.getElementById('saveContent')
.addEventListener('click', async () => {
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

/* ---------------- NOTICES ---------------- */

async function loadNotices() {
  const { data, error } = await client
    .from('notices')
    .select('*')
    .order('date', { ascending: false })
    .order('id', { ascending: false });

  const box = document.getElementById('noticeTable');

  if (error) {
    box.innerHTML = `<p>${escapeHtml(error.message)}</p>`;
    return;
  }

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

  window.scrollTo({
    top: document.getElementById('noticeForm').offsetTop - 30,
    behavior: 'smooth'
  });
}

document.getElementById('noticeForm')
.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = document.getElementById('noticeId').value;
  const payload = {
    title: document.getElementById('noticeTitle').value.trim(),
    body: document.getElementById('noticeBody').value.trim(),
    date: document.getElementById('noticeDate').value,
    published: document.getElementById('noticePublished').checked
  };

  let result;
  if (id) {
    result = await client.from('notices').update(payload).eq('id', id);
  } else {
    result = await client.from('notices').insert(payload);
  }

  document.getElementById('noticeMsg').textContent = result.error ? result.error.message : "Notice saved successfully.";

  if (!result.error) {
    clearNoticeForm();
    loadNotices();
  }
});

document.getElementById('cancelNotice').addEventListener('click', clearNoticeForm);

function clearNoticeForm() {
  document.getElementById('noticeId').value = '';
  document.getElementById('noticeTitle').value = '';
  document.getElementById('noticeBody').value = '';
  document.getElementById('noticeDate').value = new Date().toISOString().slice(0, 10);
  document.getElementById('noticePublished').checked = true;
}

async function deleteNotice(id) {
  if (!confirm('Delete this notice?')) return;

  const { error } = await client.from('notices').delete().eq('id', id);
  document.getElementById('noticeMsg').textContent = error ? error.message : "Notice deleted.";
  loadNotices();
}

/* ---------------- GALLERY ---------------- */

async function loadGallery() {
  const { data, error } = await client
    .from('gallery')
    .select('*')
    .order('created_at', { ascending: false });

  const grid = document.getElementById('galleryGrid');

  if (error) {
    grid.innerHTML = `<p>${escapeHtml(error.message)}</p>`;
    return;
  }

  if (!data || data.length === 0) {
    grid.innerHTML = '<p>No photos uploaded yet.</p>';
    return;
  }

  grid.innerHTML = data.map(photo => `
    <div class="gallery-card">
      <img src="${escapeHtml(photo.image_url)}" alt="${escapeHtml(photo.title || 'Gallery photo')}">
      <strong>${escapeHtml(photo.title || '')}</strong>
      <button class="danger" onclick="deleteGallery(${Number(photo.id)}, '${escapeHtml(photo.image_url)}')">Delete Photo</button>
    </div>
  `).join('');
}

/* UPLOAD PHOTO */
document.getElementById('uploadGallery')
.addEventListener('click', async () => {
  const fileInput = document.getElementById('galleryFile');
  const titleInput = document.getElementById('galleryTitle');
  const msg = document.getElementById('galleryMsg');
  const file = fileInput.files[0];

  if (!file) {
    msg.textContent = "Please select a photo first.";
    return;
  }

  msg.textContent = "Uploading photo...";

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
  const filePath = Date.now() + '-' + safeName;

  const { error: uploadError } = await client.storage
    .from('gallery')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type
    });

  if (uploadError) {
    msg.textContent = uploadError.message;
    return;
  }

  const { data: publicData } = client.storage
    .from('gallery')
    .getPublicUrl(filePath);

  const imageUrl = publicData.publicUrl;

  const { error: dbError } = await client
    .from('gallery')
    .insert({
      title: titleInput.value.trim(),
      image_url: imageUrl
    });

  if (dbError) {
    msg.textContent = dbError.message;
    return;
  }

  msg.textContent = "Photo uploaded successfully.";
  titleInput.value = '';
  fileInput.value = '';

  loadGallery();
});

/* DELETE PHOTO */
async function deleteGallery(id, imageUrl) {
  if (!confirm('Delete this photo?')) return;

  try {
    const url = new URL(imageUrl);
    const marker = '/storage/v1/object/public/gallery/';
    const index = url.pathname.indexOf(marker);

    if (index !== -1) {
      const filePath = decodeURIComponent(
        url.pathname.substring(index + marker.length)
      );

      await client.storage.from('gallery').remove([filePath]);
    }

    const { error } = await client
      .from('gallery')
      .delete()
      .eq('id', id);

    if (error) {
      document.getElementById('galleryMsg').textContent = error.message;
      return;
    }

    document.getElementById('galleryMsg').textContent = "Photo deleted.";
    loadGallery();
  } catch (err) {
    document.getElementById('galleryMsg').textContent = err.message;
  }
}

/* ---------------- HELPERS ---------------- */

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/[&<>"']/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[c]));
}

clearNoticeForm();
checkSession();
/* ================= DOCUMENT UPLOAD & MANAGEMENT ================= */
const docForm = document.getElementById('docForm');

async function loadAdminDocuments() {
  const listContainer = document.getElementById('adminDocList');
  if (!listContainer) return;

  const { data, error } = await client
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    listContainer.innerHTML = `<p style="color:red">Error: ${escapeHtml(error.message)}</p>`;
    return;
  }

  if (!data || data.length === 0) {
    listContainer.innerHTML = '<p>No documents uploaded yet.</p>';
    return;
  }

  listContainer.innerHTML = data.map(doc => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; background:#f1f5f9; border-radius:6px; margin-bottom:6px;">
      <div>
        <strong>${escapeHtml(doc.title)}</strong>
        <span style="font-size:0.85rem; color:#64748b; margin-left:8px;">[${escapeHtml(doc.category)}]</span>
      </div>
      <div style="display:flex; gap:10px; align-items:center;">
        <a href="${escapeHtml(doc.file_url)}" target="_blank" style="font-size:0.85rem; color:#0284c7;">View</a>
        <button class="danger" style="padding:4px 8px; font-size:0.8rem;" onclick="deleteDocument(${Number(doc.id)})">Delete</button>
      </div>
    </div>
  `).join('');
}

if (docForm) {
  docForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const titleInput = document.getElementById('docTitle');
    const categoryInput = document.getElementById('docCategory');
    const fileInput = document.getElementById('docFile');
    const msg = document.getElementById('docMsg');
    const file = fileInput.files[0];

    if (!file) {
      msg.textContent = 'Please choose a file.';
      return;
    }

    msg.textContent = 'Uploading document...';

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = Date.now() + '_' + safeName;

    const { error: uploadError } = await client.storage
      .from('documents')
      .upload(filePath, file, { cacheControl: '3600', upsert: false });

    if (uploadError) {
      msg.textContent = 'Upload failed: ' + uploadError.message;
      return;
    }

    const { data: publicData } = client.storage.from('documents').getPublicUrl(filePath);
    const fileUrl = publicData.publicUrl;

    const { error: dbError } = await client.from('documents').insert({
      title: titleInput.value.trim(),
      category: categoryInput.value,
      file_url: fileUrl
    });

    if (dbError) {
      msg.textContent = 'Database error: ' + dbError.message;
      return;
    }

    msg.textContent = 'Document uploaded successfully!';
    titleInput.value = '';
    fileInput.value = '';
    loadAdminDocuments();
  });
}

async function deleteDocument(id) {
  if (!confirm('Are you sure you want to delete this document?')) return;
  await client.from('documents').delete().eq('id', id);
  loadAdminDocuments();
}

// Load documents on admin startup
loadAdminDocuments();
