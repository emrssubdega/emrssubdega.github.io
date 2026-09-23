/* ================= SESSION & AUTH ================= */
async function checkSession() {
  const { data: { session } } = await client.auth.getSession();
  const loginSection = document.getElementById('loginSection');
  const adminDashboard = document.getElementById('adminDashboard');

  if (session) {
    if (loginSection) loginSection.style.display = 'none';
    if (adminDashboard) adminDashboard.style.display = 'block';
    loadAdminNotices();
    loadGallery();
    loadAdminDocuments();
  } else {
    if (loginSection) loginSection.style.display = 'block';
    if (adminDashboard) adminDashboard.style.display = 'none';
  }
}

const loginBtn = document.getElementById('loginBtn');
if (loginBtn) {
  loginBtn.addEventListener('click', async () => {
    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value.trim();
    const errorMsg = document.getElementById('loginError');

    errorMsg.textContent = '';
    const { data, error } = await client.auth.signInWithPassword({ email, password });

    if (error) {
      errorMsg.textContent = error.message;
    } else {
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

/* ================= NOTICE BOARD MANAGEMENT ================= */
const noticeForm = document.getElementById('noticeForm');
let editingNoticeId = null;

async function loadAdminNotices() {
  const noticeTable = document.getElementById('adminNoticeList');
  if (!noticeTable) return;

  const { data, error } = await client
    .from('notices')
    .select('*')
    .order('notice_date', { ascending: false });

  if (error) {
    noticeTable.innerHTML = `<p style="color:red">Error loading notices: ${escapeHtml(error.message)}</p>`;
    return;
  }

  if (!data || data.length === 0) {
    noticeTable.innerHTML = '<p>No notices found.</p>';
    return;
  }

  noticeTable.innerHTML = data.map(n => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; margin-bottom:8px;">
      <div>
        <strong>${escapeHtml(n.title)}</strong>
        <span style="font-size:0.85rem; color:#64748b; margin-left:8px;">[${escapeHtml(n.notice_date || '')}]</span>
        <span style="font-size:0.8rem; margin-left:6px; color:${n.published ? '#16a34a' : '#dc2626'};">(${n.published ? 'Published' : 'Draft'})</span>
      </div>
      <div style="display:flex; gap:8px;">
        <button style="padding:4px 8px; font-size:0.8rem;" onclick='editNotice(${JSON.stringify(n)})'>Edit</button>
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

    let error;
    if (editingNoticeId) {
      const res = await client.from('notices').update(payload).eq('id', editingNoticeId);
      error = res.error;
    } else {
      const res = await client.from('notices').insert(payload);
      error = res.error;
    }

    if (error) {
      msg.textContent = 'Error: ' + error.message;
    } else {
      msg.textContent = 'Notice saved successfully!';
      clearNoticeForm();
      loadAdminNotices();
    }
  });
}

function editNotice(n) {
  editingNoticeId = n.id;
  document.getElementById('noticeTitle').value = n.title;
  document.getElementById('noticeDate').value = n.notice_date || '';
  document.getElementById('noticeBody').value = n.body || '';
  document.getElementById('noticePublished').checked = n.published;
  document.getElementById('noticeSubmitBtn').textContent = 'Update Notice';
}

function clearNoticeForm() {
  editingNoticeId = null;
  document.getElementById('noticeTitle').value = '';
  document.getElementById('noticeDate').value = '';
  document.getElementById('noticeBody').value = '';
  document.getElementById('noticePublished').checked = true;
  const btn = document.getElementById('noticeSubmitBtn');
  if (btn) btn.textContent = 'Publish Notice';
}

async function deleteNotice(id) {
  if (!confirm('Are you sure you want to delete this notice?')) return;
  await client.from('notices').delete().eq('id', id);
  loadAdminNotices();
}

/* ================= GALLERY & SLIDER MANAGEMENT ================= */
const uploadGalleryBtn = document.getElementById('uploadGallery');

async function loadGallery() {
  const galleryGrid = document.getElementById('galleryGrid');
  if (!galleryGrid) return;

  const { data, error } = await client
    .from('gallery')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    galleryGrid.innerHTML = `<p style="color:red">Error: ${escapeHtml(error.message)}</p>`;
    return;
  }

  if (!data || data.length === 0) {
    galleryGrid.innerHTML = '<p>No photos uploaded yet.</p>';
    return;
  }

  galleryGrid.innerHTML = data.map(photo => `
    <div style="border:1px solid #cbd5e1; border-radius:8px; padding:10px; background:#ffffff; display:flex; flex-direction:column; gap:8px;">
      <img src="${escapeHtml(photo.image_url)}" style="width:100%; height:130px; object-fit:cover; border-radius:4px;" />
      <strong style="font-size:0.9rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(photo.title || 'Untitled')}</strong>
      <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
        <button style="padding:4px 8px; font-size:0.75rem; background:${photo.is_slider ? '#f97316' : '#64748b'}; color:white; border:none; border-radius:4px; cursor:pointer;" onclick="toggleSliderStatus(${Number(photo.id)}, ${Boolean(photo.is_slider)})">
          ${photo.is_slider ? '★ In Slider' : '+ Add to Slider'}
        </button>
        <button class="danger" style="padding:4px 8px; font-size:0.75rem;" onclick="deleteGallery(${Number(photo.id)}, '${escapeHtml(photo.image_url)}')">Delete</button>
      </div>
    </div>
  `).join('');
}

if (uploadGalleryBtn) {
  uploadGalleryBtn.addEventListener('click', async () => {
    const titleInput = document.getElementById('galleryTitle');
    const fileInput = document.getElementById('galleryFile');
    const isSliderInput = document.getElementById('galleryIsSlider');
    const msg = document.getElementById('galleryMsg');
    const file = fileInput.files[0];

    if (!file) {
      msg.textContent = 'Please choose a photo.';
      return;
    }

    msg.textContent = 'Uploading photo...';

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = Date.now() + '_' + safeName;

    const { error: uploadError } = await client.storage
      .from('gallery')
      .upload(filePath, file, { cacheControl: '3600', upsert: false });

    if (uploadError) {
      msg.textContent = 'Upload failed: ' + uploadError.message;
      return;
    }

    const { data: publicData } = client.storage.from('gallery').getPublicUrl(filePath);
    const imageUrl = publicData.publicUrl;
    const isSlider = isSliderInput ? isSliderInput.checked : false;

    const { error: dbError } = await client.from('gallery').insert({
      title: titleInput.value.trim(),
      image_url: imageUrl,
      is_slider: isSlider
    });

    if (dbError) {
      msg.textContent = 'Database error: ' + dbError.message;
      return;
    }

    msg.textContent = 'Photo uploaded successfully!';
    titleInput.value = '';
    fileInput.value = '';
    if (isSliderInput) isSliderInput.checked = false;
    loadGallery();
  });
}

window.toggleSliderStatus = async function(id, currentStatus) {
  const { error } = await client
    .from('gallery')
    .update({ is_slider: !currentStatus })
    .eq('id', id);

  if (error) {
    alert('Error: ' + error.message);
  } else {
    loadGallery();
  }
};

async function deleteGallery(id, imageUrl) {
  if (!confirm('Delete this photo?')) return;
  try {
    const url = new URL(imageUrl);
    const marker = '/storage/v1/object/public/gallery/';
    const index = url.pathname.indexOf(marker);
    if (index !== -1) {
      const filePath = decodeURIComponent(url.pathname.substring(index + marker.length));
      await client.storage.from('gallery').remove([filePath]);
    }
  } catch (e) {}

  await client.from('gallery').delete().eq('id', id);
  loadGallery();
}

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

/* ================= HELPERS ================= */
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

checkSession();
