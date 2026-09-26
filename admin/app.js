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
  sel.innerHTML = DESIGNATIONS.map(function(d) { return '<option value="' + d + '">' + d + '</option>'; }).join("");
}

function formatDateDMY(dateStr) {
  if (!dateStr || dateStr === '-') return '-';
  var parts = dateStr.split('-');
  if (parts.length === 3) return parts[2] + '-' + parts[1] + '-' + parts[0];
  return dateStr;
}

function convertDateToWords(dateStr) {
  if (!dateStr) return '';
  var parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  var y = parseInt(parts[0], 10);
  var m = parseInt(parts[1], 10);
  var d = parseInt(parts[2], 10);

  var days = ["", "First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth", "Tenth",
    "Eleventh", "Twelfth", "Thirteenth", "Fourteenth", "Fifteenth", "Sixteenth", "Seventeenth", "Eighteenth", "Nineteenth", "Twentieth",
    "Twenty-First", "Twenty-Second", "Twenty-Third", "Twenty-Fourth", "Twenty-Fifth", "Twenty-Sixth", "Twenty-Seventh", "Twenty-Eighth", "Twenty-Ninth", "Thirtieth", "Thirty-First"];
  var months = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  var tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function numToWords(n) {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " " + numToWords(n % 100) : "");
    if (n < 1000000) return numToWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 !== 0 ? " " + numToWords(n % 1000) : "");
    return String(n);
  }

  var dayWord = (d >= 1 && d <= 31) ? days[d] : String(d);
  var monthWord = (m >= 1 && m <= 12) ? months[m] : String(m);
  var yearWord = numToWords(y);

  return (dayWord + " " + monthWord + " " + yearWord).toUpperCase();
}

window.autoFillDobWords = function(dateStr) {
  var target = document.getElementById("srDobWords");
  if (target && dateStr) {
    target.value = convertDateToWords(dateStr);
  }
};

window.switchAdminTab = function(tabId, btn, updateHash) {
  if (updateHash === undefined) updateHash = true;

  var panes = document.querySelectorAll(".admin-tab-pane");
  panes.forEach(function(p) { p.classList.remove("show"); });

  var btns = document.querySelectorAll(".sidebar-btn");
  btns.forEach(function(b) { b.classList.remove("active"); });

  var activePane = document.getElementById(tabId);
  if (activePane) activePane.classList.add("show");

  if (!btn) {
    btns.forEach(function(b) {
      var attr = b.getAttribute("onclick") || "";
      if (attr.indexOf(tabId) !== -1) {
        btn = b;
      }
    });
  }
  if (btn) btn.classList.add("active");

  var heading = document.getElementById("pageTitleHeading");
  if (heading && btn) heading.textContent = btn.textContent.trim().replace(/^[^a-zA-Z0-9]+/, '');

  if (updateHash) {
    var key = tabId.replace("tab-", "").replace("-admin", "");
    history.pushState(null, null, "#" + key);
  }

  if (tabId === 'tab-results-admin') loadAdminStudentResults();
  if (tabId === 'tab-docs') loadAdminDocs();
  if (tabId === 'tab-notices') loadAdminNotices();
  if (tabId === 'tab-gallery') loadAdminGallery();
  if (tabId === 'tab-staff') loadAdminStaff();
  if (tabId === 'tab-institution') loadInstitutionDetails();
  if (tabId === 'tab-enquiries') loadAdminEnquiries();
};

window.applyAdminHashRoute = function() {
  var hash = window.location.hash.replace("#", "").trim().toLowerCase();
  var tabMap = {
    "dashboard": "tab-dashboard",
    "institution": "tab-institution",
    "campus": "tab-institution",
    "enquiries": "tab-enquiries",
    "results": "tab-results-admin",
    "student-results": "tab-results-admin",
    "staff": "tab-staff",
    "docs": "tab-docs",
    "documents": "tab-docs",
    "notices": "tab-notices",
    "gallery": "tab-gallery"
  };

  var targetTabId = tabMap[hash] || "tab-dashboard";
  window.switchAdminTab(targetTabId, null, false);
};

window.addEventListener("popstate", window.applyAdminHashRoute);

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
    window.applyAdminHashRoute();
  } else {
    if (loginView) loginView.style.display = "flex";
    if (dashboardView) dashboardView.style.display = "none";
  }
}

function loadAllAdminData() {
  loadInstitutionDetails();
  loadAdminEnquiries();
  loadAdminStudentResults();
  loadAdminStaff();
  loadAdminDocs();
  loadAdminNotices();
  loadAdminGallery();
}

// ---------------- 0. CAMPUS & INSTITUTIONAL DETAILS CRUD ----------------
var institutionForm = document.getElementById("institutionForm");
if (institutionForm) {
  institutionForm.addEventListener("submit", async function(e) {
    e.preventDefault();
    var status = document.getElementById("instStatus");
    status.style.color = "#0284c7";
    status.textContent = "Saving details...";

    var name = document.getElementById("instName").value.trim();
    var loc = document.getElementById("instLocation").value.trim();
    var gov = document.getElementById("instGovBody").value.trim();
    var curr = document.getElementById("instCurriculum").value.trim();
    var email = document.getElementById("instEmail").value.trim();
    var phone = document.getElementById("instOfficePhone").value.trim();
    var cbseAff = document.getElementById("instCbseAff").value.trim();
    var schCode = document.getElementById("instSchoolCode").value.trim();
    var udise = document.getElementById("instUdise").value.trim();
    var session = document.getElementById("instSession").value.trim();
    var principal = document.getElementById("instPrincipal").value.trim();

    var res = await client.from("institution_details").upsert([{
      id: "primary",
      institution_name: name,
      location: loc,
      governing_body: gov,
      curriculum: curr,
      official_email: email,
      office_phone: phone,
      cbse_affiliation_no: cbseAff,
      school_code: schCode,
      udise_code: udise,
      academic_session: session,
      principal_name: principal,
      updated_at: new Date().toISOString()
    }]);

    if (res.error) {
      status.style.color = "#dc2626";
      status.textContent = "Error: " + res.error.message;
    } else {
      status.style.color = "#16a34a";
      status.textContent = "Institutional details updated successfully!";
      loadInstitutionDetails();
    }
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
      if (val && String(val).trim()) {
        el.textContent = val;
        el.classList.remove("empty");
      } else {
        el.textContent = "(Not set - hidden on live site)";
        el.classList.add("empty");
      }
    }

    setDashVal("viewInstName", d.institution_name);
    setDashVal("viewInstLoc", d.location);
    setDashVal("viewInstGov", d.governing_body);
    setDashVal("viewInstCurr", d.curriculum);
    setDashVal("viewInstEmail", d.official_email);
    setDashVal("viewInstPhone", d.office_phone);
    setDashVal("viewInstCbseAff", d.cbse_affiliation_no);
    setDashVal("viewInstSchCode", d.school_code);
    setDashVal("viewInstUdise", d.udise_code);
    setDashVal("viewInstPrincipal", d.principal_name);
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
    if (document.getElementById("instPrincipal")) document.getElementById("instPrincipal").value = d.principal_name || "";
  }
}

// ---------------- RESTORED: ENQUIRIES CRUD ----------------
async function loadAdminEnquiries() {
  var tbody = document.getElementById("enquiryTableBody");
  var badge = document.getElementById("enquiryCountBadge");
  if (!tbody || !client) return;

  var res = await client.from("enquiries").select("*").order("created_at", { ascending: false });
  if (res.data) {
    if (badge) {
      if (res.data.length > 0) {
        badge.textContent = res.data.length;
        badge.style.display = "inline-block";
      } else {
        badge.style.display = "none";
      }
    }

    if (res.data.length > 0) {
      tbody.innerHTML = res.data.map(function(enq) {
        var rawDate = enq.created_at ? enq.created_at.split('T')[0] : '-';
        var dmyDate = formatDateDMY(rawDate);
        return '<tr>' +
          '<td>' + dmyDate + '</td>' +
          '<td><strong>' + (enq.name || '') + '</strong></td>' +
          '<td><a href="tel:' + (enq.phone || '') + '" style="color:#0284c7; text-decoration:none; font-weight:600;">' + (enq.phone || '') + '</a></td>' +
          '<td>' + (enq.email ? '<a href="mailto:' + enq.email + '" style="color:#0284c7;">' + enq.email + '</a>' : '-') + '</td>' +
          '<td><span style="background:#e0f2fe; color:#0369a1; padding:2px 8px; border-radius:4px; font-weight:700; font-size:0.8rem;">' + (enq.enquiry_type || 'General') + '</span></td>' +
          '<td style="text-align:left; max-width:280px; word-break:break-word;">' + (enq.message || '') + '</td>' +
          '<td><button type="button" class="btn-delete" onclick="deleteEnquiry(\'' + enq.id + '\')">Delete</button></td>' +
        '</tr>';
      }).join("");
    } else {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #64748b;">No enquiries submitted yet.</td></tr>';
    }
  }
}

window.deleteEnquiry = async function(id) {
  if (!confirm("Are you sure you want to delete this enquiry?")) return;
  await client.from("enquiries").delete().eq("id", id);
  loadAdminEnquiries();
};

// ---------------- DYNAMIC CUSTOM SUBJECT EDITOR ----------------
var DEFAULT_SUBJECTS = ["English", "Hindi", "Mathematics", "Science", "Social Science"];

window.addNewSubjectRow = function(name, max, marks) {
  var container = document.getElementById("dynamicSubjectsContainer");
  if (!container) return;

  var div = document.createElement("div");
  div.className = "subject-row";
  div.innerHTML = 
    '<input type="text" class="sub-name" placeholder="Subject Name (e.g. Odia, Physics)" value="' + (name || '') + '" required />' +
    '<input type="number" class="sub-max mark-input" placeholder="Max" value="' + (max != null ? max : 100) + '" required />' +
    '<input type="number" class="sub-marks mark-input" placeholder="Marks" value="' + (marks != null ? marks : '') + '" required />' +
    '<button type="button" onclick="this.parentElement.remove()" class="btn-remove-sub" title="Remove Subject">✕</button>';
  container.appendChild(div);
};

function initDefaultSubjects() {
  var container = document.getElementById("dynamicSubjectsContainer");
  if (!container) return;
  container.innerHTML = "";
  DEFAULT_SUBJECTS.forEach(function(sub) {
    addNewSubjectRow(sub, 100, 80);
  });
}

// ---------------- 1. STUDENT RESULTS CRUD & EDIT ----------------
var studentResultForm = document.getElementById("studentResultForm");
if (studentResultForm) {
  studentResultForm.addEventListener("submit", async function(e) {
    e.preventDefault();
    var status = document.getElementById("srStatusMsg");
    status.style.color = "#0284c7";
    status.textContent = "Calculating and saving result...";

    var subRows = document.querySelectorAll("#dynamicSubjectsContainer .subject-row");
    if (subRows.length === 0) {
      status.style.color = "#dc2626";
      status.textContent = "Please add at least one subject.";
      return;
    }

    var subjectsArr = [];
    var totalMarks = 0;
    var maxTotal = 0;

    subRows.forEach(function(row) {
      var sName = row.querySelector(".sub-name").value.trim();
      var sMax = parseFloat(row.querySelector(".sub-max").value) || 100;
      var sMarks = parseFloat(row.querySelector(".sub-marks").value) || 0;
      var sPercent = (sMarks / sMax) * 100;
      var sGrade = sPercent >= 90 ? 'A1' : (sPercent >= 80 ? 'A2' : (sPercent >= 70 ? 'B1' : (sPercent >= 60 ? 'B2' : (sPercent >= 50 ? 'C' : 'D'))));

      totalMarks += sMarks;
      maxTotal += sMax;

      subjectsArr.push({ name: sName, max: sMax, marks: sMarks, grade: sGrade });
    });

    var overallPercent = maxTotal > 0 ? (totalMarks / maxTotal) * 100 : 0;
    var overallGrade = overallPercent >= 90 ? 'A1' : (overallPercent >= 80 ? 'A2' : (overallPercent >= 70 ? 'B1' : (overallPercent >= 60 ? 'B2' : (overallPercent >= 50 ? 'C' : 'D'))));

    var dobVal = document.getElementById("srDob").value;
    var dobWords = document.getElementById("srDobWords").value.trim() || convertDateToWords(dobVal);
    var recordId = document.getElementById("editingRecordId").value.trim();

    var record = {
      roll_no: document.getElementById("srRoll").value.trim(),
      student_name: document.getElementById("srName").value.trim(),
      father_name: document.getElementById("srFatherName").value.trim(),
      mother_name: document.getElementById("srMotherName").value.trim(),
      dob: dobVal,
      dob_in_words: dobWords,
      academic_session: document.getElementById("srSession").value,
      class_name: document.getElementById("srClass").value,
      section: document.getElementById("srSection").value.trim() || 'A',
      subjects: subjectsArr,
      total_marks: totalMarks,
      max_marks: maxTotal,
      percentage: Math.round(overallPercent * 10) / 10,
      grade: overallGrade,
      result_status: document.getElementById("srStatus").value
    };

    var res;
    if (recordId) {
      res = await client.from("student_results").update(record).eq("id", recordId);
    } else {
      res = await client.from("student_results").insert([record]);
    }

    if (res.error) {
      status.style.color = "#dc2626";
      status.textContent = "Error saving result: " + res.error.message;
    } else {
      status.style.color = "#16a34a";
      status.textContent = recordId ? "Student record updated successfully!" : "Student result recorded successfully!";
      resetStudentResultForm();
      loadAdminStudentResults();
    }
  });
}

window.editStudentResult = async function(id) {
  var res = await client.from("student_results").select("*").eq("id", id).maybeSingle();
  if (res.error || !res.data) {
    alert("Could not load student record for editing.");
    return;
  }

  var d = res.data;
  document.getElementById("editingRecordId").value = d.id;
  document.getElementById("srRoll").value = d.roll_no;
  document.getElementById("srName").value = d.student_name;
  document.getElementById("srFatherName").value = d.father_name || '';
  document.getElementById("srMotherName").value = d.mother_name || '';
  document.getElementById("srDob").value = d.dob;
  document.getElementById("srDobWords").value = d.dob_in_words || convertDateToWords(d.dob);
  document.getElementById("srSession").value = d.academic_session;
  document.getElementById("srClass").value = d.class_name;
  document.getElementById("srSection").value = d.section || 'A';
  document.getElementById("srStatus").value = d.result_status || 'PASSED';

  var container = document.getElementById("dynamicSubjectsContainer");
  container.innerHTML = "";
  var subs = d.subjects || [];
  if (subs.length > 0) {
    subs.forEach(function(s) { addNewSubjectRow(s.name, s.max, s.marks); });
  } else {
    initDefaultSubjects();
  }

  document.getElementById("formModeTitle").textContent = "✏️ Edit Student Result: " + d.student_name;
  document.getElementById("srSubmitBtn").textContent = "Update Result";
  document.getElementById("srCancelEditBtn").style.display = "inline-block";
  document.getElementById("studentFormPanel").scrollIntoView({ behavior: 'smooth' });
};

window.resetStudentResultForm = function() {
  document.getElementById("editingRecordId").value = "";
  document.getElementById("studentResultForm").reset();
  document.getElementById("formModeTitle").textContent = "Add Student Marksheet";
  document.getElementById("srSubmitBtn").textContent = "Save Student Result";
  document.getElementById("srCancelEditBtn").style.display = "none";
  initDefaultSubjects();
};

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
          '<td>' + (s.father_name || '-') + '</td>' +
          '<td>' + s.class_name + '</td>' +
          '<td>' + s.academic_session + '</td>' +
          '<td>' + s.total_marks + '/' + s.max_marks + '</td>' +
          '<td>' + s.percentage + '%</td>' +
          '<td><span style="color:' + (s.result_status === 'PASSED' ? '#16a34a' : '#dc2626') + '; font-weight:700;">' + s.result_status + '</span></td>' +
          '<td>' +
            '<button type="button" class="btn-edit" onclick="editStudentResult(\'' + s.id + '\')">✏️ Edit</button>' +
            '<button type="button" class="btn-delete" onclick="deleteStudentResult(\'' + s.id + '\')">Delete</button>' +
          '</td>' +
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

// ---------------- EXCEL / CSV EXPORT & IMPORT ----------------
window.exportClassResultsCSV = async function() {
  var targetClass = document.getElementById("bulkClassSelect").value;
  var targetSession = document.getElementById("bulkSessionSelect").value;

  var res = await client.from("student_results").select("*")
    .eq("class_name", targetClass)
    .eq("academic_session", targetSession);

  var rows = res.data || [];
  var csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "roll_no,student_name,father_name,mother_name,dob,academic_session,class_name,section,english,hindi,mathematics,science,social_science,result_status\n";

  if (rows.length > 0) {
    rows.forEach(function(r) {
      var sMap = {};
      (r.subjects || []).forEach(function(s) { sMap[s.name.toLowerCase()] = s.marks; });
      var eng = sMap["english"] != null ? sMap["english"] : 80;
      var hin = sMap["hindi"] != null ? sMap["hindi"] : 80;
      var mat = sMap["mathematics"] != null ? sMap["mathematics"] : 80;
      var sci = sMap["science"] != null ? sMap["science"] : 80;
      var sst = sMap["social science"] != null ? sMap["social science"] : 80;

      csvContent += [
        '"' + r.roll_no + '"',
        '"' + r.student_name + '"',
        '"' + (r.father_name || '') + '"',
        '"' + (r.mother_name || '') + '"',
        r.dob,
        r.academic_session,
        r.class_name,
        r.section || 'A',
        eng, hin, mat, sci, sst,
        r.result_status || 'PASSED'
      ].join(",") + "\n";
    });
  } else {
    csvContent += "01,Sample Student Name,Father Name,Mother Name,2013-05-15," + targetSession + "," + targetClass + ",A,85,78,92,88,81,PASSED\n";
  }

  var encodedUri = encodeURI(csvContent);
  var link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "EMRS_" + targetClass.replace(/\s+/g, '_') + "_" + targetSession + ".csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

window.importClassResultsCSV = function() {
  var fileInput = document.getElementById("bulkCsvFileInput");
  var status = document.getElementById("bulkStatusMsg");
  var file = fileInput.files[0];

  if (!file) {
    alert("Please select a CSV file to upload.");
    return;
  }

  status.style.color = "#0284c7";
  status.textContent = "Processing CSV file...";

  var reader = new FileReader();
  reader.onload = async function(e) {
    var text = e.target.result;
    var lines = text.split(/\r\n|\n/).filter(function(line) { return line.trim() !== ""; });
    if (lines.length <= 1) {
      status.style.color = "#dc2626";
      status.textContent = "CSV file is empty.";
      return;
    }

    var records = [];
    for (var i = 1; i < lines.length; i++) {
      var cols = lines[i].split(",").map(function(c) { return c.replace(/^["']|["']$/g, "").trim(); });
      if (cols.length >= 7) {
        var roll = cols[0];
        var name = cols[1];
        var father = cols[2] || '';
        var mother = cols[3] || '';
        var dob = cols[4];
        var session = cols[5];
        var cls = cols[6];
        var sec = cols[7] || 'A';
        var eng = parseFloat(cols[8]) || 0;
        var hin = parseFloat(cols[9]) || 0;
        var mat = parseFloat(cols[10]) || 0;
        var sci = parseFloat(cols[11]) || 0;
        var sst = parseFloat(cols[12]) || 0;
        var stat = cols[13] || 'PASSED';

        var total = eng + hin + mat + sci + sst;
        var percent = Math.round((total / 500) * 1000) / 10;
        var grade = percent >= 90 ? 'A1' : (percent >= 80 ? 'A2' : (percent >= 70 ? 'B1' : (percent >= 60 ? 'B2' : (percent >= 50 ? 'C' : 'D'))));

        records.push({
          roll_no: roll,
          student_name: name,
          father_name: father,
          mother_name: mother,
          dob: dob,
          dob_in_words: convertDateToWords(dob),
          academic_session: session,
          class_name: cls,
          section: sec,
          subjects: [
            { name: "English", max: 100, marks: eng, grade: eng >= 80 ? 'A' : 'B' },
            { name: "Hindi", max: 100, marks: hin, grade: hin >= 80 ? 'A' : 'B' },
            { name: "Mathematics", max: 100, marks: mat, grade: mat >= 80 ? 'A' : 'B' },
            { name: "Science", max: 100, marks: sci, grade: sci >= 80 ? 'A' : 'B' },
            { name: "Social Science", max: 100, marks: sst, grade: sst >= 80 ? 'A' : 'B' }
          ],
          total_marks: total,
          max_marks: 500,
          percentage: percent,
          grade: grade,
          result_status: stat
        });
      }
    }

    if (records.length === 0) {
      status.style.color = "#dc2626";
      status.textContent = "No valid records parsed from CSV.";
      return;
    }

    var upRes = await client.from("student_results").insert(records);
    if (upRes.error) {
      status.style.color = "#dc2626";
      status.textContent = "Upload failed: " + upRes.error.message;
    } else {
      status.style.color = "#16a34a";
      status.textContent = "Successfully uploaded " + records.length + " student results!";
      fileInput.value = "";
      loadAdminStudentResults();
    }
  };
  reader.readAsText(file);
};

// ---------------- 2. BATCH PROMOTION ----------------
window.executeBatchPromotion = async function() {
  var fromSession = document.getElementById("promoFromSession").value;
  var fromClass = document.getElementById("promoFromClass").value;
  var toClass = document.getElementById("promoToClass").value;
  var toSession = document.getElementById("promoToSession").value.trim();
  var msg = document.getElementById("promoStatusMsg");

  if (!toSession) { alert("Please enter the Target New Session."); return; }
  if (!confirm("Promote all PASSED students from " + fromClass + " (" + fromSession + ") to " + toClass + " (" + toSession + ")?")) return;

  msg.style.color = "#0284c7";
  msg.textContent = "Processing batch promotion...";

  var updateRes = await client.from("student_results")
    .update({ promoted_to_class: toClass, promoted_session: toSession })
    .eq("academic_session", fromSession)
    .eq("class_name", fromClass)
    .eq("result_status", "PASSED");

  if (updateRes.error) {
    msg.style.color = "#dc2626";
    msg.textContent = "Error: " + updateRes.error.message;
  } else {
    msg.style.color = "#16a34a";
    msg.textContent = "Batch promotion completed successfully!";
    loadAdminStudentResults();
  }
};

// ---------------- 3. DOCUMENTS CRUD & TABLE SYNC ----------------
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
  if (!tbody || !client) return;

  var res = await client.from("documents").select("*").order("created_at", { ascending: false });
  if (res.data) {
    if (res.data.length > 0) {
      tbody.innerHTML = res.data.map(function(d) {
        return '<tr>' +
          '<td>' + (d.circular_no || '-') + '</td>' +
          '<td>' + formatDateDMY(d.doc_date) + '</td>' +
          '<td>' + (d.category || '-') + '</td>' +
          '<td>' + (d.title || '-') + '</td>' +
          '<td><a href="' + d.file_url + '" target="_blank" style="color:#0284c7; font-weight:600;">Download</a></td>' +
          '<td><button type="button" class="btn-delete" onclick="deleteDoc(\'' + d.id + '\')">Delete</button></td>' +
        '</tr>';
      }).join("");
    } else {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #64748b;">No documents uploaded.</td></tr>';
    }
  }
}

window.deleteDoc = async function(id) {
  if (!confirm("Delete this document?")) return;
  await client.from("documents").delete().eq("id", id);
  loadAdminDocs();
};

// ---------------- 4. NOTICE BOARD CRUD & TABLE SYNC ----------------
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
  if (!tbody || !client) return;

  var res = await client.from("notices").select("*").order("notice_date", { ascending: false });
  if (res.data) {
    if (res.data.length > 0) {
      tbody.innerHTML = res.data.map(function(n) {
        return '<tr>' +
          '<td>' + formatDateDMY(n.notice_date) + '</td>' +
          '<td><strong>' + (n.title || '') + '</strong></td>' +
          '<td>' + (n.body || '') + '</td>' +
          '<td><button type="button" class="btn-delete" onclick="deleteNotice(\'' + n.id + '\')">Delete</button></td>' +
        '</tr>';
      }).join("");
    } else {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #64748b;">No notices posted.</td></tr>';
    }
  }
}

window.deleteNotice = async function(id) {
  if (!confirm("Delete this notice?")) return;
  await client.from("notices").delete().eq("id", id);
  loadAdminNotices();
};

// ---------------- 5. PHOTO GALLERY & SLIDER CRUD ----------------
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
  if (!tbody || !client) return;

  var res = await client.from("gallery").select("*").order("created_at", { ascending: false });
  if (res.data) {
    if (res.data.length > 0) {
      tbody.innerHTML = res.data.map(function(g) {
        return '<tr>' +
          '<td><img src="' + g.image_url + '" style="width:65px; height:48px; object-fit:cover; border-radius:4px; border:1px solid #cbd5e1;" /></td>' +
          '<td>' + (g.title || '-') + '</td>' +
          '<td>' + (g.is_slider ? '<span style="color:#16a34a; font-weight:700;">★ In Slider</span>' : 'Gallery Only') + '</td>' +
          '<td><button type="button" class="btn-delete" onclick="deleteGallery(\'' + g.id + '\')">Delete</button></td>' +
        '</tr>';
      }).join("");
    } else {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #64748b;">No photos uploaded yet.</td></tr>';
    }
  }
}

window.deleteGallery = async function(id) {
  if (!confirm("Delete this photo?")) return;
  await client.from("gallery").delete().eq("id", id);
  loadAdminGallery();
};

// ---------------- 6. STAFF CRUD ----------------
var staffForm = document.getElementById("staffForm");
if (staffForm) {
  staffForm.addEventListener("submit", async function(e) {
    e.preventDefault();
    var status = document.getElementById("staffStatus");
    status.style.color = "#0284c7";
    status.textContent = "Saving staff record...";

    var editingId = document.getElementById("editingStaffId").value.trim();
    var existingPhoto = document.getElementById("existingStaffPhotoUrl").value.trim();
    var photoFile = document.getElementById("staffPhoto").files[0];

    if (!editingId && !photoFile) {
      status.style.color = "#dc2626";
      status.textContent = "Please select a staff photo (max 50 KB).";
      return;
    }

    if (photoFile && photoFile.size > 51200) {
      status.style.color = "#dc2626";
      status.textContent = "File too large (" + Math.round(photoFile.size / 1024) + " KB). Photo must be under 50 KB!";
      return;
    }

    try {
      var photoUrl = existingPhoto;

      if (photoFile) {
        var filePath = "staff_" + Date.now() + ".jpg";
        var upRes = await client.storage.from("staff-photos").upload(filePath, photoFile, { upsert: true });
        if (upRes.error) throw upRes.error;
        var pub = client.storage.from("staff-photos").getPublicUrl(filePath);
        photoUrl = pub.data.publicUrl;
      }

      var record = {
        name: document.getElementById("staffName").value.trim().toUpperCase(),
        employee_id: document.getElementById("staffEmpId").value.trim().toUpperCase(),
        category: document.getElementById("staffCategory").value.toUpperCase(),
        designation: document.getElementById("staffDesignation").value.toUpperCase(),
        doj_nests: document.getElementById("staffDojNests").value || null,
        doj_emrs: document.getElementById("staffDojEmrs").value || null,
        photo_url: photoUrl
      };

      var res;
      if (editingId) {
        res = await client.from("staff").update(record).eq("id", editingId);
      } else {
        res = await client.from("staff").insert([record]);
      }

      if (res.error) throw res.error;

      status.style.color = "#16a34a";
      status.textContent = editingId ? "Staff member updated successfully!" : "Staff member added successfully!";
      resetStaffForm();
      loadAdminStaff();
    } catch(err) {
      status.style.color = "#dc2626";
      status.textContent = "Error: " + err.message;
    }
  });
}

window.editStaff = async function(id) {
  var res = await client.from("staff").select("*").eq("id", id).maybeSingle();
  if (res.error || !res.data) {
    alert("Could not load staff record for editing.");
    return;
  }

  var s = res.data;
  document.getElementById("editingStaffId").value = s.id;
  document.getElementById("existingStaffPhotoUrl").value = s.photo_url || '';
  document.getElementById("staffName").value = s.name || '';
  document.getElementById("staffEmpId").value = s.employee_id || '';
  document.getElementById("staffCategory").value = s.category || 'PRINCIPAL';
  document.getElementById("staffDesignation").value = s.designation || '';
  document.getElementById("staffDojNests").value = s.doj_nests || '';
  document.getElementById("staffDojEmrs").value = s.doj_emrs || '';

  document.getElementById("staffPhoto").required = false;
  document.getElementById("staffPhotoLabel").textContent = "Update Staff Photo (Optional, leave blank to keep current)";
  document.getElementById("staffPhotoHelp").textContent = "Leave blank to keep existing photo. If uploading new, max size 50 KB.";

  document.getElementById("staffFormModeTitle").textContent = "✏️ Edit Staff Member: " + s.name;
  document.getElementById("saveStaffBtn").textContent = "Update Staff Member";
  document.getElementById("cancelStaffEditBtn").style.display = "inline-block";
  document.getElementById("staffFormPanel").scrollIntoView({ behavior: 'smooth' });
};

window.resetStaffForm = function() {
  document.getElementById("editingStaffId").value = "";
  document.getElementById("existingStaffPhotoUrl").value = "";
  document.getElementById("staffForm").reset();
  document.getElementById("staffPhoto").required = true;
  document.getElementById("staffPhotoLabel").textContent = "Staff Photo (Max 50 KB, .jpg / .png) *";
  document.getElementById("staffPhotoHelp").textContent = "Maximum file size allowed is 50 KB.";
  document.getElementById("staffFormModeTitle").textContent = "Add New Staff Member";
  document.getElementById("saveStaffBtn").textContent = "Add Staff Member";
  document.getElementById("cancelStaffEditBtn").style.display = "none";
};

async function loadAdminStaff() {
  var tbody = document.getElementById("staffTableBody");
  if (!tbody || !client) return;

  var res = await client.from("staff").select("*").order("created_at", { ascending: false });
  if (res.data) {
    if (res.data.length > 0) {
      tbody.innerHTML = res.data.map(function(s) {
        return '<tr>' +
          '<td><img src="' + (s.photo_url || '') + '" style="max-height:48px; max-width:48px; object-fit:contain; border-radius:4px; border:1px solid #cbd5e1;" /></td>' +
          '<td><strong>' + s.name + '</strong></td>' +
          '<td>' + s.employee_id + '</td>' +
          '<td><span style="background:#e0f2fe; color:#0369a1; padding:2px 8px; border-radius:4px; font-weight:700; font-size:0.8rem;">' + s.category + '</span></td>' +
          '<td>' + s.designation + '</td>' +
          '<td>' + formatDateDMY(s.doj_nests) + '</td>' +
          '<td>' + formatDateDMY(s.doj_emrs) + '</td>' +
          '<td>' +
            '<button type="button" class="btn-edit" onclick="editStaff(\'' + s.id + '\')">✏️ Edit</button>' +
            '<button type="button" class="btn-delete" onclick="deleteStaff(\'' + s.id + '\')">Delete</button>' +
          '</td>' +
        '</tr>';
      }).join("");
    } else {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#64748b;">No staff records yet.</td></tr>';
    }
  }
}

window.deleteStaff = async function(id) {
  if (!confirm("Delete this staff member?")) return;
  await client.from("staff").delete().eq("id", id);
  loadAdminStaff();
};

document.addEventListener("DOMContentLoaded", function() {
  populateDesignations();
  initDefaultSubjects();

  var loginBtn = document.getElementById("loginBtn");
  if (loginBtn) {
    loginBtn.addEventListener("click", async function() {
      var res = await client.auth.signInWithPassword({
        email: document.getElementById("email").value.trim(),
        password: document.getElementById("password").value
      });
      if (res.error) document.getElementById("loginMsg").textContent = res.error.message;
      else checkSession();
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
