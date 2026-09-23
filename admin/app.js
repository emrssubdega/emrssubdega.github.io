/* Global Supabase Client Initialization */
var client = null;
if (window.supabase && window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
  client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
}

/* ================= AUTHENTICATION ================= */
async function checkSession() {
  if (!client) return;
  const { data: { session } } = await client.auth.getSession();
  const loginSection = document.getElementById('loginSection');
  const adminDashboard = document.getElementById('adminDashboard');
  const logoutBtn = document.getElementById('logoutBtn');
  const sideUserName = document.getElementById('sideUserName');
  const cardUserName = document.getElementById('cardUserName');
  const activeUserEmail = document.getElementById('activeUserEmail');

  if (session) {
    if (loginSection) loginSection.style.display = 'none';
    if (adminDashboard) adminDashboard.style.display = 'flex';
    if (logoutBtn) logoutBtn.style.display = 'block';

    const emailName = session.user.email ? session.user.email.split('@')[0].toUpperCase() : 'ADMIN';
    if (sideUserName) sideUserName.textContent = emailName;
    if (cardUserName) cardUserName.textContent = emailName;
    if (activeUserEmail) activeUserEmail.textContent = session.user.email;

    loadAdminNotices();
    loadGallery();
    loadAdminDocuments();
  } else {
    if (loginSection) loginSection.style.display = 'block';
    if (adminDashboard) adminDashboard.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'none';
  }
}

const loginBtn = document.getElementById('loginBtn');
if (loginBtn) {
  loginBtn.addEventListener('click', async () => {
    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value.trim();
    const errorMsg = document.getElementById('loginError');

    if (!email || !password) {
      errorMsg.textContent = 'Please enter your email and password.';
      return;
    }

    errorMsg.textContent = 'Signing in...';
    const { data, error } = await client.auth.signInWithPassword({ email, password });

    if (error) {
      errorMsg.textContent = error.message;
    } else {
      errorMsg.textContent = '';
      checkSession();
    }
  });
}

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    await client.auth.signOut();
    checkSession();
  });
}

/* ================= NOTICES ================= */
const noticeForm = document.getElementById('noticeForm');
let editingNoticeId = null;

async function loadAdminNotices() {
  const container = document.getElementById('adminNoticeList');
  if (!container || !client) return;

  const { data, error } = await client
    .from('notices')
    .select('*')
    .order('notice_date', { ascending: false });

  if (error || !data || data.length === 0) {
    container.innerHTML = '<p style="color:#64748b; padding:10px 0;">No notices found.</p>';
    return;
  }

  container.innerHTML = data.map(n => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:4px; margin-bottom:8px;">
      <div>
        <strong>${escapeHtml(n.title)}</strong>
        <span style="font-size:0.85rem; color:#64748b; margin-left:8px;">[${escapeHtml(n.notice_date || '')}]</span>
        <span style="font-size:0.8rem; margin-left:6px; color:${n.published ? '#16a34a' : '#dc2626'}; font-weight:600;">(${n.published ? 'Published' : 'Draft'})</span>
      </div>
      <div style="display:flex; gap:8px;">
        <button style="padding:4px 8px; font-size:0.8rem; cursor:pointer;" onclick='editNotice(${JSON.stringify(n)})'>Edit</button>
        <button class="danger" style="padding:4px 8px; font-size:0.8rem;" onclick="deleteNotice(${Number(n.id)})">Delete</button>
      </div>
    </div>
  `).join('');
}

if (noticeForm) {
  noticeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('noticeTitle').value.trim();
    const notice_date = document.getElementById('noticeDate').value;
    const body = document.getElementById('noticeBody').value.trim();
    const published = document.getElementById('noticePublished').checked;
    const msg = document.getElementById('noticeMsg');

    msg.textContent = 'Saving notice...';
    const payload = { title, notice_date, body, published };

    let res = editingNoticeId 
      ? await client.from('notices').update(payload).eq('id', editingNoticeId)
      : await client.from('notices').insert(payload);

    if (res.error) {
      msg.textContent = 'Error: ' + res.error.message;
    } else {
      msg.textContent = 'Notice saved!';
      editingNoticeId = null;
      document.getElementById('noticeTitle').value = '';
      document.getElementById('noticeDate').value = '';
      document.getElementById('noticeBody').value = '';
      document.getElementById('noticeSubmitBtn').textContent = 'Publish Notice';
      loadAdminNotices();
    }
  });
}

window.editNotice = function(n) {
  editingNoticeId = n.id;
  document.getElementById('noticeTitle').value = n.title;
  document.getElementById('noticeDate').value = n.notice_date || '';
  document.getElementById('noticeBody').value = n.body || '';
  document.getElementById('noticePublished').checked = n.published;
  document.getElementById('noticeSubmitBtn').textContent = 'Update Notice';
};

window.deleteNotice = async function(id) {
  if (!confirm('Delete this notice?')) return;
  await client.from('notices').delete().eq('id', id);
  loadAdminNotices();
};

/* ================= GALLERY & SLIDER ================= */
async function loadGallery() {
  const grid = document.getElementById('galleryGrid');
  if (!grid || !client) return;

  const { data, error } = await client
    .from('gallery')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !data || data.length === 0) {
    grid.innerHTML = '<p style="color:#64748b; padding:10px 0;">No photos uploaded yet.</p>';
    return;
  }

  grid.innerHTML = data.map(photo => `
    <div style="border:1px solid #cbd5e1; border-radius:6px; padding:8px; background:#ffffff; display:flex; flex-direction:column; gap:8px;">
      <img src="${escapeHtml(photo.image_url)}" style="width:100%; height:110px; object-fit:cover; border-radius:4px;" />
      <strong style="font-size:0.85rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(photo.title || 'Untitled')}</strong>
      <div style="display:flex; justify-content:space-between; align-items:center; gap:4px;">
        <button style="padding:4px 8px; font-size:0.75rem; background:${photo.is_slider ? '#f97316' : '#64748b'}; color:white; border:none; border-radius:4px; cursor:pointer;" onclick="toggleSliderStatus(${Number(photo.id)}, ${Boolean(photo.is_slider)})">
          ${photo.is_slider ? '★ In Slider' : '+ Add to Slider'}
        </button>
        <button class="danger" style="padding:4px 8px; font-size:0.75rem;" onclick="deleteGallery(${Number(photo.id)}, '${escapeHtml(photo.image_url)}')">Delete</button>
      </div>
    </div>
  `).join('');
}

/* Upload Helper */
async function handlePhotoUpload(title, file, isSlider, msgEl) {
  if (!file) {
    msgEl.textContent = 'Please choose a photo.';
    return;
  }
  msgEl.textContent = 'Uploading photo...';
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = Date.now() + '_' + safeName;

  const { error: uploadError } = await client.storage
    .from('gallery')
    .upload(filePath, file, { cacheControl: '3600', upsert: false });

  if (uploadError) {
    msgEl.textContent = 'Upload error: ' + uploadError.message;
    return;
  }

  const { data: publicData } = client.storage.from('gallery').getPublicUrl(filePath);

  const { error: dbError } = await client.from('gallery').insert({
    title: title.trim(),
    image_url: publicData.publicUrl,
    is_slider: isSlider
  });

  if (dbError) {
    msgEl.textContent = 'Database error: ' + dbError.message;
  } else {
    msgEl.textContent = 'Photo uploaded successfully!';
    loadGallery();
  }
}

/* Gallery View Upload */
const uploadGalleryBtn = document.getElementById('uploadGallery');
if (uploadGalleryBtn) {
  uploadGalleryBtn.addEventListener('click', () => {
    const title = document.getElementById('galleryTitle').value;
    const file = document.getElementById('galleryFile').files[0];
    const isSlider = document.getElementById('galleryIsSlider').checked;
    const msg = document.getElementById('galleryMsg');
    handlePhotoUpload(title, file, isSlider, msg);
  });
}

/* Dedicated Slider Upload */
const uploadSliderBtn = document.getElementById('uploadSliderBtn');
if (uploadSliderBtn) {
  uploadSliderBtn.addEventListener('click', () => {
    const title = document.getElementById('sliderPhotoTitle').value;
    const file = document.getElementById('sliderPhotoFile').files[0];
    const msg = document.getElementById('sliderMsg');
    handlePhotoUpload(title, file, true, msg);
  });
}

window.toggleSliderStatus = async function(id, currentStatus) {
  const { error } = await client.from('gallery').update({ is_slider: !currentStatus }).eq('id', id);
  if (error) alert('Error: ' + error.message);
  else loadGallery();
};

window.deleteGallery = async function(id, imageUrl) {
  if (!confirm('Delete this photo?')) return;
  try {
    const url = new URL(imageUrl);
    const marker = '/storage/v1/object/public/gallery/';
    const idx = url.pathname.indexOf(marker);
    if (idx !== -1) {
      const path = decodeURIComponent(url.pathname.substring(idx + marker.length));
      await client.storage.from('gallery').remove([path]);
    }
  } catch (e) {}

  await client.from('gallery').delete().eq('id', id);
  loadGallery();
};

/* ================= DOCUMENTS ================= */
const docForm = document.getElementById('docForm');

async function loadAdminDocuments() {
  const container = document.getElementById('adminDocList');
  if (!container || !client) return;

  const { data, error } = await client
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !data || data.length === 0) {
    container.innerHTML = '<p style="color:#64748b; padding:10px 0;">No documents uploaded yet.</p>';
    return;
  }

  container.innerHTML = data.map(doc => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:4px; margin-bottom:8px;">
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
    const catInput = document.getElementById('docCategory');
    const fileInput = document.getElementById('docFile');
    const msg = document.getElementById('docMsg');
    const file = fileInput.files[0];

    if (!file) {
      msg.textContent = 'Please select a file.';
      return;
    }

    msg.textContent = 'Uploading document...';
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = Date.now() + '_' + safeName;

    const { error: uploadError } = await client.storage
      .from('documents')
      .upload(filePath, file, { cacheControl: '3600', upsert: false });

    if (uploadError) {
      msg.textContent = 'Upload error: ' + uploadError.message;
      return;
    }

    const { data: publicData } = client.storage.from('documents').getPublicUrl(filePath);

    const { error: dbError } = await client.from('documents').insert({
      title: titleInput.value.trim(),
      category: catInput.value,
      file_url: publicData.publicUrl
    });

    if (dbError) {
      msg.textContent = 'Database error: ' + dbError.message;
    } else {
      msg.textContent = 'Document uploaded successfully!';
      titleInput.value = '';
      fileInput.value = '';
      loadAdminDocuments();
    }
  });
}

window.deleteDocument = async function(id) {
  if (!confirm('Delete this document?')) return;
  await client.from('documents').delete().eq('id', id);
  loadAdminDocuments();
};

function escapeHtml(val) {
  return String(val == null ? '' : val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

checkSession();
