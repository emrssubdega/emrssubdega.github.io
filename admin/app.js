// Supabase Client
var client = null;
if (window.supabase && window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
  client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
}

// 40 Official Designations
var DESIGNATIONS = [
  "PRINCIPAL", "PGT ENGLISH", "PGT HINDI", "PGT MATHS", "PGT CHEMISTRY", "PGT PHYSICS", "PGT BIOLOGY",
  "PGT HISTORY", "PGT GEOGRAPHY", "PGT COMMERCE", "PGT ECONOMICS", "PGT COMPUTE SCIENCE", "PGT ODIA",
  "TGT HINDI", "TGT ENGLISH", "TGT MATHS", "TGT ODIA", "TGT SOCIAL SCIENCE", "TGT SCIENCE", "TGT MUSIC",
  "TGT ART", "PET FEMALE", "PET MALE", "LIBRARIAN", "ACCOUNTANT", "COUNSELLOR", "HOSTEL WARDEN FEMALE",
  "HOSTEL WARDEN MALE", "STAFF NURSE", "CATERING ASSISTANT", "SENIOR SECRETARIAT ASSISTANT",
  "JUNIOR SECRETARIAT ASSISTANT", "COOK", "ELECTRICIAN-cum-PLUMBER", "DRIVER", "LAB ATTENDANT",
  "MESS HELPER", "SWEEPER", "CHOWKIDAR", "GARDENER"
];

function populateDesignations() {
  var sel = document.getElementById("staffDesignation");
  if (!sel) return;
  sel.innerHTML = DESIGNATIONS.map(function(d) {
    return '<option value="' + d + '">' + d + '</option>';
  }).join("");
}

function formatDateDMY(dateStr) {
  if (!dateStr || dateStr === '-') return '-';
  var parts = dateStr.split('-');
  if (parts.length === 3) return parts[2] + '-' + parts[1] + '-' + parts[0];
  return dateStr;
}

window.switchAdminTab = function(tabId, btn) {
  var panes = document.querySelectorAll(".admin-tab-pane");
  panes.forEach(function(p) { p.classList.remove("show"); });

  var btns = document.querySelectorAll(".sidebar-btn");
  btns.forEach(function(b) { b.classList.remove("active"); });

  var activePane = document.getElementById(tabId);
  if (activePane) activePane.classList.add("show");
  if (btn) btn.classList.add("active");

  var heading = document.getElementById("pageTitleHeading");
  if (heading && btn) heading.textContent = btn.textContent.trim().replace(/^[^a-zA-Z0-9]+/, '');

  if (tabId === 'tab-results-admin') loadAdminStudentResults();
};

async function checkSession() {
  if (!client) return;
  var sessionRes = await client.auth.getSession();
  var session = sessionRes.data.session;

  var loginView = document.getElementById("loginView");
  var dashboardView = document.getElementById("dashboardView");
  var userBadge = document.getElementById("adminUserBadge");

  if (session) {
    if (loginView) loginView.style.display = "none";
    if (dashboardView) dashboardView.style.display = "flex";
    if (userBadge) userBadge.textContent = session.user.email;
    loadAllAdminData();
  } else {
    if (loginView) loginView.style.display = "flex";
    if (dashboardView) dashboardView.style.display = "none";
  }
}

function loadAllAdminData() {
  loadInstitutionDetails();
  loadAdminStudentResults();
  loadAdminStaff();
}

document.addEventListener("DOMContentLoaded", function() {
  populateDesignations();

  var loginBtn = document.getElementById("loginBtn");
  if (loginBtn) {
    loginBtn.addEventListener("click", async function() {
      var email = document.getElementById("email").value.trim();
      var password = document.getElementById("password").value;
      var msg = document.getElementById("loginMsg");
      msg.textContent = "Signing in...";

      var res = await client.auth.signInWithPassword({ email: email, password: password });
      if (res.error) msg.textContent = "Login failed: " + res.error.message;
      else { msg.textContent = ""; checkSession(); }
    });
  }

  var logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async function() {
      await client.auth.signOut();
      checkSession();
    });
  }

  checkSession();
});

// ---------------- 0. INSTITUTION DETAILS ----------------
var institutionForm = document.getElementById("institutionForm");
if (institutionForm) {
  institutionForm.addEventListener("submit", async function(e) {
    e.preventDefault();
    var status = document.getElementById("instStatus");
    status.style.color = "#0284c7";
    status.textContent = "Saving...";

    var res = await client.from("institution_details").upsert([{
      id: "primary",
      institution_name: document.getElementById("instName").value.trim(),
      location: document.getElementById("instLocation").value.trim(),
      governing_body: document.getElementById("instGovBody").value.trim(),
      curriculum: document.getElementById("instCurriculum").value.trim(),
      official_email: document.getElementById("instEmail").value.trim(),
      office_phone: document.getElementById("instOfficePhone").value.trim(),
      cbse_affiliation_no: document.getElementById("instCbseAff").value.trim(),
      school_code: document.getElementById("instSchoolCode").value.trim(),
      udise_code: document.getElementById("instUdise").value.trim(),
      academic_session: document.getElementById("instSession").value.trim(),
      updated_at: new Date().toISOString()
    }]);

    if (res.error) { status.style.color = "#dc2626"; status.textContent = res.error.message; }
    else { status.style.color = "#16a34a"; status.textContent = "Saved successfully!"; loadInstitutionDetails(); }
  });
}

async function loadInstitutionDetails() {
  if (!client) return;
  var res = await client.from("institution_details").select("*").eq("id", "primary").maybeSingle();
  if (res.data) {
    var d = res.data;
    function setDashVal(elId, val) {
      var el = document.getElementById(elId);
      if (!el) return;
      if (val && String(val).trim()) { el.textContent = val; el.classList.remove("empty"); }
      else { el.textContent = "-"; el.classList.add("empty"); }
    }
    setDashVal("viewInstName", d.institution_name);
    setDashVal("viewInstLoc", d.location);
    setDashVal("viewInstGov", d.governing_body);
    setDashVal("viewInstCurr", d.curriculum);
    setDashVal("viewInstEmail", d.official_email);
    setDashVal("viewInstCbseAff", d.cbse_affiliation_no);
    setDashVal("viewInstSchCode", d.school_code);
    setDashVal("viewInstSession", d.academic_session);

    if (document.getElementById("instName")) document.getElementById("instName").value = d.institution_name || "";
    if (document.getElementById("instLocation")) document.getElementById("instLocation").value = d.location || "";
    if (document.getElementById("instGovBody")) document.getElementById("instGovBody").value = d.governing_body || "";
    if (document.getElementById("instCurriculum")) document.getElementById("instCurriculum").value = d.curriculum || "";
    if (document.getElementById("instEmail")) document.getElementById("instEmail").value = d.official_email || "";
    if (document.getElementById("instOfficePhone")) document.getElementById("instOfficePhone").value = d.office_phone || "";
    if (document.getElementById("instCbseAff")) document.getElementById("instCbseAff").value = d.cbse_affiliation_no || "";
    if (document.getElementById("instSchoolCode")) document.getElementById("instSchoolCode").value = d.school_code || "";
    if (document.getElementById("instUdise")) document.getElementById("instUdise").value = d.udise_code || "";
    if (document.getElementById("instSession")) document.getElementById("instSession").value = d.academic_session || "";
  }
}

// ---------------- 1. STUDENT RESULTS & OPTION A PROMOTION ----------------
var studentResultForm = document.getElementById("studentResultForm");
if (studentResultForm) {
  studentResultForm.addEventListener("submit", async function(e) {
    e.preventDefault();
    var status = document.getElementById("srStatusMsg");
    status.style.color = "#0284c7";
    status.textContent = "Calculating and saving result...";

    var eng = parseFloat(document.getElementById("subEnglish").value) || 0;
    var hin = parseFloat(document.getElementById("subHindi").value) || 0;
    var mat = parseFloat(document.getElementById("subMaths").value) || 0;
    var sci = parseFloat(document.getElementById("subScience").value) || 0;
    var sst = parseFloat(document.getElementById("subSst").value) || 0;

    var total = eng + hin + mat + sci + sst;
    var percent = (total / 500) * 100;
    var grade = percent >= 90 ? 'A1' : (percent >= 80 ? 'A2' : (percent >= 70 ? 'B1' : (percent >= 60 ? 'B2' : (percent >= 50 ? 'C' : 'D'))));

    var subjectsArr = [
      { name: "English", max: 100, marks: eng, grade: eng >= 80 ? 'A' : 'B' },
      { name: "Hindi", max: 100, marks: hin, grade: hin >= 80 ? 'A' : 'B' },
      { name: "Mathematics", max: 100, marks: mat, grade: mat >= 80 ? 'A' : 'B' },
      { name: "Science", max: 100, marks: sci, grade: sci >= 80 ? 'A' : 'B' },
      { name: "Social Science", max: 100, marks: sst, grade: sst >= 80 ? 'A' : 'B' }
    ];

    var record = {
      roll_no: document.getElementById("srRoll").value.trim(),
      student_name: document.getElementById("srName").value.trim(),
      dob: document.getElementById("srDob").value,
      academic_session: document.getElementById("srSession").value,
      class_name: document.getElementById("srClass").value,
      section: document.getElementById("srSection").value.trim() || 'A',
      subjects: subjectsArr,
      total_marks: total,
      max_marks: 500,
      percentage: Math.round(percent * 10) / 10,
      grade: grade,
      result_status: document.getElementById("srStatus").value
    };

    var res = await client.from("student_results").insert([record]);
    if (res.error) {
      status.style.color = "#dc2626";
      status.textContent = "Error saving result: " + res.error.message;
    } else {
      status.style.color = "#16a34a";
      status.textContent = "Student result recorded successfully!";
      studentResultForm.reset();
      loadAdminStudentResults();
    }
  });
}

async function loadAdminStudentResults() {
  var tbody = document.getElementById("studentResultsTableBody");
  if (!tbody || !client) return;

  var res = await client.from("student_results").select("*").order("created_at", { ascending: false });
  if (res.data) {
    if (res.data.length > 0) {
      tbody.innerHTML = res.data.map(function(s) {
        return '<tr>' +
          '<td><strong>' + s.roll_no + '</strong></td>' +
          '<td>' + s.student_name + '</td>' +
          '<td>' + s.class_name + '</td>' +
          '<td>' + s.academic_session + '</td>' +
          '<td>' + s.total_marks + '/' + s.max_marks + '</td>' +
          '<td>' + s.percentage + '%</td>' +
          '<td><span style="color:' + (s.result_status === 'PASSED' ? '#16a34a' : '#dc2626') + '; font-weight:700;">' + s.result_status + '</span></td>' +
          '<td>' + (s.promoted_to_class ? (s.promoted_to_class + ' (' + s.promoted_session + ')') : '-') + '</td>' +
          '<td><button type="button" class="btn-delete" onclick="deleteStudentResult(\'' + s.id + '\')">Delete</button></td>' +
        '</tr>';
      }).join("");
    } else {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: #64748b;">No student results uploaded yet.</td></tr>';
    }
  }
}

window.deleteStudentResult = async function(id) {
  if (!confirm("Are you sure you want to delete this result entry?")) return;
  await client.from("student_results").delete().eq("id", id);
  loadAdminStudentResults();
};

// OPTION A: BATCH PROMOTION LOGIC
window.executeBatchPromotion = async function() {
  var fromSession = document.getElementById("promoFromSession").value;
  var fromClass = document.getElementById("promoFromClass").value;
  var toClass = document.getElementById("promoToClass").value;
  var toSession = document.getElementById("promoToSession").value.trim();
  var msg = document.getElementById("promoStatusMsg");

  if (!toSession) {
    alert("Please enter the Target New Session (e.g. 2026-2027).");
    return;
  }

  var confirmMsg = "Are you sure you want to promote all PASSED students from " + fromClass + " (" + fromSession + ") to " + toClass + " (" + toSession + ")?\n\nExisting records in other classes will remain untouched.";
  if (!confirm(confirmMsg)) return;

  msg.style.color = "#0284c7";
  msg.textContent = "Processing batch promotion...";

  // 1. Fetch all passed students in source batch
  var fetchRes = await client.from("student_results").select("*")
    .eq("academic_session", fromSession)
    .eq("class_name", fromClass)
    .eq("result_status", "PASSED");

  if (fetchRes.error) {
    msg.style.color = "#dc2626";
    msg.textContent = "Error fetching batch: " + fetchRes.error.message;
    return;
  }

  var students = fetchRes.data || [];
  if (students.length === 0) {
    msg.style.color = "#dc2626";
    msg.textContent = "No passed students found in " + fromClass + " (" + fromSession + ").";
    return;
  }

  // 2. Tag promotion on original records so marksheets show promotion
  var updateRes = await client.from("student_results")
    .update({ promoted_to_class: toClass, promoted_session: toSession })
    .eq("academic_session", fromSession)
    .eq("class_name", fromClass)
    .eq("result_status", "PASSED");

  if (updateRes.error) {
    msg.style.color = "#dc2626";
    msg.textContent = "Could not update promotion tag: " + updateRes.error.message;
    return;
  }

  msg.style.color = "#16a34a";
  msg.textContent = "Success! " + students.length + " students from " + fromClass + " have been promoted to " + toClass + " for Session " + toSession + ".";
  loadAdminStudentResults();
};

// ---------------- 2. STAFF CRUD ----------------
var staffForm = document.getElementById("staffForm");
if (staffForm) {
  staffForm.addEventListener("submit", async function(e) {
    e.preventDefault();
    var status = document.getElementById("staffStatus");
    status.style.color = "#0284c7";
    status.textContent = "Saving staff...";

    var name = document.getElementById("staffName").value.trim().toUpperCase();
    var empId = document.getElementById("staffEmpId").value.trim().toUpperCase();
    var category = document.getElementById("staffCategory").value.toUpperCase();
    var designation = document.getElementById("staffDesignation").value.toUpperCase();
    var dojNests = document.getElementById("staffDojNests").value || null;
    var dojEmrs = document.getElementById("staffDojEmrs").value || null;
    var photoFile = document.getElementById("staffPhoto").files[0];

    if (!photoFile) return;
    if (photoFile.size > 51200) {
      status.style.color = "#dc2626";
      status.textContent = "Photo must be under 50 KB!";
      return;
    }

    try {
      var fileExt = photoFile.name.split('.').pop();
      var filePath = "staff_" + Date.now() + "." + fileExt;
      var upRes = await client.storage.from("staff-photos").upload(filePath, photoFile, { upsert: true });
      if (upRes.error) throw upRes.error;

      var pub = client.storage.from("staff-photos").getPublicUrl(filePath);
      var ins = await client.from("staff").insert([{
        name: name, employee_id: empId, category: category, designation: designation,
        doj_nests: dojNests, doj_emrs: dojEmrs, photo_url: pub.data.publicUrl
      }]);
      if (ins.error) throw ins.error;

      status.style.color = "#16a34a";
      status.textContent = "Staff saved!";
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
  if (!tbody || !client) return;
  var res = await client.from("staff").select("*").order("created_at", { ascending: false });
  if (res.data) {
    tbody.innerHTML = res.data.map(function(s) {
      return '<tr>' +
        '<td><img src="' + (s.photo_url || '') + '" style="max-height:50px; max-width:50px;" /></td>' +
        '<td>' + s.name + '</td><td>' + s.employee_id + '</td><td>' + s.category + '</td><td>' + s.designation + '</td>' +
        '<td><button type="button" class="btn-delete" onclick="deleteStaff(\'' + s.id + '\')">Delete</button></td>' +
      '</tr>';
    }).join("");
  }
}

window.deleteStaff = async function(id) {
  if (!confirm("Delete staff member?")) return;
  await client.from("staff").delete().eq("id", id);
  loadAdminStaff();
};
