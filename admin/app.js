// Global Supabase Client
var client = null;
if (window.supabase && window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
  client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
}

// All 40 Designations
var DESIGNATIONS = [
  "PRINCIPAL",
  "PGT ENGLISH",
  "PGT HINDI",
  "PGT MATHS",
  "PGT CHEMISTRY",
  "PGT PHYSICS",
  "PGT BIOLOGY",
  "PGT HISTORY",
  "PGT GEOGRAPHY",
  "PGT COMMERCE",
  "PGT ECONOMICS",
  "PGT COMPUTE SCIENCE",
  "PGT ODIA",
  "TGT HINDI",
  "TGT ENGLISH",
  "TGT MATHS",
  "TGT ODIA",
  "TGT SOCIAL SCIENCE",
  "TGT SCIENCE",
  "TGT MUSIC",
  "TGT ART",
  "PET FEMALE",
  "PET MALE",
  "LIBRARIAN",
  "ACCOUNTANT",
  "COUNSELLOR",
  "HOSTEL WARDEN FEMALE",
  "HOSTEL WARDEN MALE",
  "STAFF NURSE",
  "CATERING ASSISTANT",
  "SENIOR SECRETARIAT ASSISTANT",
  "JUNIOR SECRETARIAT ASSISTANT",
  "COOK",
  "ELECTRICIAN-cum-PLUMBER",
  "DRIVER",
  "LAB ATTENDANT",
  "MESS HELPER",
  "SWEEPER",
  "CHOWKIDAR",
  "GARDENER"
];

function populateDesignations() {
  var sel = document.getElementById("staffDesignation");
  if (!sel) return;
  sel.innerHTML = DESIGNATIONS.map(function(d) {
    return '<option value="' + d + '">' + d + '</option>';
  }).join("");
}

// Setup Tabs
function initAdminTabs() {
  var tabBtns = document.querySelectorAll(".admin-tabs .tab-btn");
  var tabContents = document.querySelectorAll(".admin-tab-content");

  tabBtns.forEach(function(btn) {
    btn.addEventListener("click", function() {
      var target = btn.dataset.tab;
      tabBtns.forEach(function(b) { b.classList.remove("active"); });
      tabContents.forEach(function(c) { c.classList.remove("active"); });

      btn.classList.add("active");
      var activeContent = document.getElementById(target);
      if (activeContent) activeContent.classList.add("active");
    });
  });
}

// Check session
async function checkSession() {
  if (!client) return;
  var sessionRes = await client.auth.getSession();
  var session = sessionRes.data.session;

  var loginView = document.getElementById("loginView");
  var dashboardView = document.getElementById("dashboardView");
  var logoutBtn = document.getElementById("logoutBtn");

  if (session) {
    if (loginView) loginView.style.display = "none";
    if (dashboardView) dashboardView.style.display = "block";
    if (logoutBtn) logoutBtn.style.display = "inline-block";
    loadAllAdminData();
  } else {
    if (loginView) loginView.style.display = "block";
    if (dashboardView) dashboardView.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "none";
  }
}

function loadAllAdminData() {
  loadAdminStaff();
  loadAdminDocs();
  loadAdminNotices();
  loadAdminGallery();
}

document.addEventListener("DOMContentLoaded", function() {
  populateDesignations();
  initAdminTabs();

  // Forgot password toggling
  var showForgotBtn = document.getElementById("showForgotBtn");
  var backToLoginBtn = document.getElementById("backToLoginBtn");
  var loginSection = document.getElementById("loginSection");
  var forgotSection = document.getElementById("forgotSection");
  var sendResetBtn = document.getElementById("sendResetBtn");
  var resetMsg = document.getElementById("resetMsg");

  if (showForgotBtn) {
    showForgotBtn.addEventListener("click", function() {
      loginSection.style.display = "none";
      forgotSection.style.display = "block";
    });
  }

  if (backToLoginBtn) {
    backToLoginBtn.addEventListener("click", function() {
      forgotSection.style.display = "none";
      loginSection.style.display = "block";
    });
  }

  if (sendResetBtn) {
    sendResetBtn.addEventListener("click", async function() {
      var email = document.getElementById("resetEmail").value.trim();
      if (!email) {
        resetMsg.style.color = "#dc2626";
        resetMsg.textContent = "Please enter your registered email.";
        return;
      }
      resetMsg.style.color = "#0284c7";
      resetMsg.textContent = "Sending reset link...";

      var res = await client.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/admin/"
      });

      if (res.error) {
        resetMsg.style.color = "#dc2626";
        resetMsg.textContent = "Error: " + res.error.message;
      } else {
        resetMsg.style.color = "#16a34a";
        resetMsg.textContent = "Password reset email sent! Check your inbox.";
      }
    });
  }

  // Login handler
  var loginBtn = document.getElementById("loginBtn");
  if (loginBtn) {
    loginBtn.addEventListener("click", async function() {
      var email = document.getElementById("email").value.trim();
      var password = document.getElementById("password").value;
      var msg = document.getElementById("loginMsg");
      msg.textContent = "Signing in...";

      var res = await client.auth.signInWithPassword({ email: email, password: password });
      if (res.error) {
        msg.textContent = "Login failed: " + res.error.message;
      } else {
        msg.textContent = "";
        checkSession();
      }
    });
  }

  // Logout handler
  var logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async function() {
      await client.auth.signOut();
      checkSession();
    });
  }

  checkSession();
});

// ---------------- 1. STAFF CRUD (50 KB Validation + UPPERCASE) ----------------
var staffForm = document.getElementById("staffForm");
if (staffForm) {
  staffForm.addEventListener("submit", async function(e) {
    e.preventDefault();
    var status = document.getElementById("staffStatus");
    status.style.color = "#0284c7";
    status.textContent = "Validating and saving staff record...";

    var name = document.getElementById("staffName").value.trim().toUpperCase();
    var empId = document.getElementById("staffEmpId").value.trim().toUpperCase();
    var category = document.getElementById("staffCategory").value.toUpperCase();
    var designation = document.getElementById("staffDesignation").value.toUpperCase();
    var dojNests = document.getElementById("staffDojNests").value || null;
    var dojEmrs = document.getElementById("staffDojEmrs").value || null;
    var photoFile = document.getElementById("staffPhoto").files[0];

    // 50 KB limit validation
    if (!photoFile) {
      status.style.color = "#dc2626";
      status.textContent = "Please choose a photo.";
      return;
    }
    if (photoFile.size > 51200) {
      status.style.color = "#dc2626";
      status.textContent = "File too large (" + Math.round(photoFile.size / 1024) + " KB). Photo must be under 50 KB!";
      return;
    }

    try {
      var fileExt = photoFile.name.split('.').pop();
      var filePath = "staff_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7) + "." + fileExt;

      var upRes = await client.storage.from("staff-photos").upload(filePath, photoFile, {
        cacheControl: "3600",
        upsert: true
      });
      if (upRes.error) throw upRes.error;

      var pub = client.storage.from("staff-photos").getPublicUrl(filePath);

      var ins = await client.from("staff").insert([{
        name: name,
        employee_id: empId,
        category: category,
        designation: designation,
        doj_nests: dojNests,
        doj_emrs: dojEmrs,
        photo_url: pub.data.publicUrl
      }]);
      if (ins.error) throw ins.error;

      status.style.color = "#16a34a";
      status.textContent = "Staff member successfully added!";
      staffForm.reset();
      loadAdminStaff();
    } catch(err) {
      status.style.color = "#dc2626";
      status.textContent = "Error: " + err.message;
    }
  });
}

async function loadAdminStaff() {
  var tbody = document.getElementById("staffTableBody");
  if (!tbody) return;
  var res = await client.from("staff").select("*").order("created_at", { ascending: false });
  if (res.data && res.data.length > 0) {
    tbody.innerHTML = res.data.map(function(s) {
      return '<tr>' +
        '<td><img src="' + (s.photo_url || '') + '" style="width:40px; height:50px; object-fit:cover; border-radius:4px; border:1px solid #cbd5e1;" /></td>' +
        '<td><strong>' + (s.name || '') + '</strong></td>' +
        '<td>' + (s.employee_id || '') + '</td>' +
        '<td><span style="background:#e0f2fe; color:#0369a1; padding:2px 6px; border-radius:4px; font-weight:700; font-size:0.8rem;">' + (s.category || '') + '</span></td>' +
        '<td>' + (s.designation || '') + '</td>' +
        '<td>' + (s.doj_nests || '-') + '</td>' +
        '<td>' + (s.doj_emrs || '-') + '</td>' +
        '<td><button type="button" class="btn-danger" style="background:#ef4444; color:#fff; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;" onclick="deleteStaff(\'' + s.id + '\')">Delete</button></td>' +
      '</tr>';
    }).join("");
  } else {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #64748b;">No staff records yet.</td></tr>';
  }
}

window.deleteStaff = async function(id) {
  if (!confirm("Are you sure you want to delete this staff member?")) return;
  await client.from("staff").delete().eq("id", id);
  loadAdminStaff();
};

// ---------------- 2. DOCUMENTS CRUD ----------------
var docForm = document.getElementById("docForm");
if (docForm) {
  docForm.addEventListener("submit", async function(e) {
    e.preventDefault();
    var status = document.getElementById("docStatus");
    status.style.color = "#0284c7";
    status.textContent = "Uploading document...";

    var circNo = document.getElementById("docCircularNo").value.trim();
    var docDate = document.getElementById("docDate").value || null;
    var category = document.getElementById("docCategory").value;
    var title = document.getElementById("docTitle").value.trim();
    var file = document.getElementById("docFile").files[0];

    if (!file) return;

    try {
      var filePath = "docs_" + Date.now() + "_" + file.name.replace(/[^a-zA-Z0-9.]/g, "_");
      var upRes = await client.storage.from("documents").upload(filePath, file);
      if (upRes.error) throw upRes.error;

      var pub = client.storage.from("documents").getPublicUrl(filePath);
      var ins = await client.from("documents").insert([{
        circular_no: circNo,
        doc_date: docDate,
        category: category,
        title: title,
        file_url: pub.data.publicUrl
      }]);
      if (ins.error) throw ins.error;

      status.style.color = "#16a34a";
      status.textContent = "Document uploaded successfully!";
      docForm.reset();
      loadAdminDocs();
    } catch(err) {
      status.style.color = "#dc2626";
      status.textContent = "Error: " + err.message;
    }
  });
}

async function loadAdminDocs() {
  var tbody = document.getElementById("docTableBody");
  if (!tbody) return;
  var res = await client.from("documents").select("*").order("created_at", { ascending: false });
  if (res.data && res.data.length > 0) {
    tbody.innerHTML = res.data.map(function(d) {
      return '<tr>' +
        '<td>' + (d.circular_no || '-') + '</td>' +
        '<td>' + (d.doc_date || '-') + '</td>' +
        '<td>' + (d.category || '-') + '</td>' +
        '<td>' + (d.title || '-') + '</td>' +
        '<td><a href="' + d.file_url + '" target="_blank" style="color:#0284c7;">Download</a></td>' +
        '<td><button type="button" class="btn-danger" style="background:#ef4444; color:#fff; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;" onclick="deleteDoc(\'' + d.id + '\')">Delete</button></td>' +
      '</tr>';
    }).join("");
  } else {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #64748b;">No documents uploaded.</td></tr>';
  }
}

window.deleteDoc = async function(id) {
  if (!confirm("Delete this document?")) return;
  await client.from("documents").delete().eq("id", id);
  loadAdminDocs();
};

// ---------------- 3. NOTICES CRUD ----------------
var noticeForm = document.getElementById("noticeForm");
if (noticeForm) {
  noticeForm.addEventListener("submit", async function(e) {
    e.preventDefault();
    var status = document.getElementById("noticeStatus");
    status.style.color = "#0284c7";
    status.textContent = "Publishing notice...";

    var title = document.getElementById("noticeTitle").value.trim();
    var date = document.getElementById("noticeDate").value;
    var body = document.getElementById("noticeBody").value.trim();

    var ins = await client.from("notices").insert([{ title: title, notice_date: date, body: body }]);
    if (ins.error) {
      status.style.color = "#dc2626";
      status.textContent = "Error: " + ins.error.message;
    } else {
      status.style.color = "#16a34a";
      status.textContent = "Notice published successfully!";
      noticeForm.reset();
      loadAdminNotices();
    }
  });
}

async function loadAdminNotices() {
  var tbody = document.getElementById("noticeTableBody");
  if (!tbody) return;
  var res = await client.from("notices").select("*").order("notice_date", { ascending: false });
  if (res.data && res.data.length > 0) {
    tbody.innerHTML = res.data.map(function(n) {
      return '<tr>' +
        '<td>' + (n.notice_date || '-') + '</td>' +
        '<td><strong>' + (n.title || '') + '</strong></td>' +
        '<td>' + (n.body || '') + '</td>' +
        '<td><button type="button" class="btn-danger" style="background:#ef4444; color:#fff; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;" onclick="deleteNotice(\'' + n.id + '\')">Delete</button></td>' +
      '</tr>';
    }).join("");
  } else {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #64748b;">No notices posted.</td></tr>';
  }
}

window.deleteNotice = async function(id) {
  if (!confirm("Delete this notice?")) return;
  await client.from("notices").delete().eq("id", id);
  loadAdminNotices();
};

// ---------------- 4. GALLERY CRUD ----------------
var galleryForm = document.getElementById("galleryForm");
if (galleryForm) {
  galleryForm.addEventListener("submit", async function(e) {
    e.preventDefault();
    var status = document.getElementById("photoStatus");
    status.style.color = "#0284c7";
    status.textContent = "Uploading image...";

    var title = document.getElementById("photoTitle").value.trim();
    var file = document.getElementById("photoFile").files[0];
    var isSlider = document.getElementById("photoIsSlider").checked;

    if (!file) return;

    try {
      var filePath = "gallery_" + Date.now() + "_" + file.name.replace(/[^a-zA-Z0-9.]/g, "_");
      var upRes = await client.storage.from("gallery").upload(filePath, file);
      if (upRes.error) throw upRes.error;

      var pub = client.storage.from("gallery").getPublicUrl(filePath);
      var ins = await client.from("gallery").insert([{
        title: title,
        image_url: pub.data.publicUrl,
        is_slider: isSlider
      }]);
      if (ins.error) throw ins.error;

      status.style.color = "#16a34a";
      status.textContent = "Photo uploaded successfully!";
      galleryForm.reset();
      loadAdminGallery();
    } catch(err) {
      status.style.color = "#dc2626";
      status.textContent = "Error: " + err.message;
    }
  });
}

async function loadAdminGallery() {
  var tbody = document.getElementById("galleryTableBody");
  if (!tbody) return;
  var res = await client.from("gallery").select("*").order("created_at", { ascending: false });
  if (res.data && res.data.length > 0) {
    tbody.innerHTML = res.data.map(function(g) {
      return '<tr>' +
        '<td><img src="' + g.image_url + '" style="width:60px; height:45px; object-fit:cover; border-radius:4px;" /></td>' +
        '<td>' + (g.title || '-') + '</td>' +
        '<td>' + (g.is_slider ? 'Yes' : 'No') + '</td>' +
        '<td><button type="button" class="btn-danger" style="background:#ef4444; color:#fff; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;" onclick="deleteGallery(\'' + g.id + '\')">Delete</button></td>' +
      '</tr>';
    }).join("");
  } else {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #64748b;">No photos uploaded.</td></tr>';
  }
}

window.deleteGallery = async function(id) {
  if (!confirm("Delete this photo?")) return;
  await client.from("gallery").delete().eq("id", id);
  loadAdminGallery();
};
