var client = null;
if (window.supabase && window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
  client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
}

// CENTRAL GOVT (CCS LEAVE RULES, 1972 & DoPT HOLIDAY RULES) MASTER LIST
var CCS_LEAVE_MASTER = [
  { code: "CL", name: "Casual Leave (CL)", defaultDays: 8 },
  { code: "RH", name: "Restricted Holiday (RH)", defaultDays: 2 },
  { code: "SCL", name: "Special Casual Leave (SCL)", defaultDays: 15 },
  { code: "EL", name: "Earned Leave (EL)", defaultDays: 30 },
  { code: "HPL", name: "Half Pay Leave (HPL)", defaultDays: 20 },
  { code: "COMMUTED", name: "Commuted Leave (Medical)", defaultDays: 20 },
  { code: "MATERNITY", name: "Maternity Leave", defaultDays: 180 },
  { code: "PATERNITY", name: "Paternity Leave", defaultDays: 15 },
  { code: "CCL", name: "Child Care Leave (CCL)", defaultDays: 730 },
  { code: "STUDY", name: "Study Leave", defaultDays: 730 },
  { code: "DUTY", name: "Duty Leave / Special OD", defaultDays: 10 },
  { code: "EOL", name: "Extraordinary Leave (EOL)", defaultDays: 90 }
];

function formatDateDMY(dateStr) {
  if (!dateStr || dateStr === '-') return '-';
  var parts = dateStr.split('-');
  if (parts.length === 3) return parts[2] + '-' + parts[1] + '-' + parts[0];
  return dateStr;
}

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
      if (attr.indexOf(tabId) !== -1) btn = b;
    });
  }
  if (btn) btn.classList.add("active");

  var heading = document.getElementById("pageTitleHeading");
  if (heading && btn) heading.textContent = btn.textContent.trim().replace(/^[^a-zA-Z0-9]+/, '');

  if (updateHash) {
    var key = tabId.replace("tab-", "").replace("-admin", "");
    history.pushState(null, null, "#" + key);
  }

  if (tabId === 'tab-leaves') { loadAdminLeaves(); populateStaffSelectForAssign(); }
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
    "leaves": "tab-leaves",
    "enquiries": "tab-enquiries",
    "results": "tab-results-admin",
    "staff": "tab-staff",
    "docs": "tab-docs",
    "notices": "tab-notices",
    "gallery": "tab-gallery"
  };
  window.switchAdminTab(tabMap[hash] || "tab-dashboard", null, false);
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
  loadAdminLeaves();
  populateStaffSelectForAssign();
  loadAdminEnquiries();
  loadAdminStudentResults();
  loadAdminStaff();
  loadAdminDocs();
  loadAdminNotices();
  loadAdminGallery();
}

// ---------------- 1. LEAVE MANAGEMENT ENGINE ----------------

async function populateStaffSelectForAssign() {
  var sel = document.getElementById("assignStaffSelect");
  if (!sel || !client) return;

  var res = await client.from("staff").select("id, name, employee_id, designation").order("name");
  if (res.data) {
    sel.innerHTML = '<option value="">-- Choose Staff Member --</option>' +
      res.data.map(function(s) {
        return '<option value="' + s.employee_id + '" data-name="' + s.name + '">' +
          s.name + ' (' + s.employee_id + ') - ' + (s.designation || '') +
        '</option>';
      }).join('');
  }
  renderCcsCheckboxes([]);
}

function renderCcsCheckboxes(assignedList) {
  var cont = document.getElementById("ccsLeaveTypesContainer");
  if (!cont) return;

  var map = {};
  (assignedList || []).forEach(function(item) { map[item.code] = item; });

  cont.innerHTML = CCS_LEAVE_MASTER.map(function(master) {
    var isChecked = map[master.code] ? 'checked' : '';
    var totalVal = map[master.code] ? map[master.code].total : master.defaultDays;

    return '<div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:10px;">' +
      '<label style="display:flex; align-items:center; gap:8px; font-weight:700; color:#0b3c5d; cursor:pointer;">' +
        '<input type="checkbox" class="ccs-check" value="' + master.code + '" data-name="' + master.name + '" ' + isChecked + ' />' +
        master.name +
      '</label>' +
      '<div style="margin-top:6px; display:flex; align-items:center; gap:8px;">' +
        '<span style="font-size:0.75rem; color:#64748b; font-weight:bold;">DAYS / YR:</span>' +
        '<input type="number" class="ccs-days" data-code="' + master.code + '" value="' + totalVal + '" min="1" style="width:75px; padding:4px 6px; font-size:0.85rem; border:1px solid #cbd5e1; border-radius:4px;" />' +
      '</div>' +
    '</div>';
  }).join('');
}

window.loadEmployeeAssignedLeaves = async function(empId) {
  if (!empId) { renderCcsCheckboxes([]); return; }
  var res = await client.from("staff_leave_balances").select("*").eq("employee_id", empId).maybeSingle();
  if (res.data && res.data.assigned_types) {
    renderCcsCheckboxes(res.data.assigned_types);
  } else {
    // Default allocations include CL, RH (2 days), EL, HPL
    renderCcsCheckboxes([
      { code: "CL", name: "Casual Leave (CL)", total: 8, used: 0 },
      { code: "RH", name: "Restricted Holiday (RH)", total: 2, used: 0 },
      { code: "EL", name: "Earned Leave (EL)", total: 10, used: 0 },
      { code: "HPL", name: "Half Pay Leave (HPL)", total: 20, used: 0 }
    ]);
  }
};

window.saveAssignedLeaves = async function(e) {
  e.preventDefault();
  var sel = document.getElementById("assignStaffSelect");
  var empId = sel.value;
  var staffName = sel.options[sel.selectedIndex].getAttribute("data-name") || "Staff Member";
  var status = document.getElementById("assignStatusMsg");

  var checks = document.querySelectorAll(".ccs-check:checked");
  if (checks.length === 0) {
    alert("Please select at least one leave entitlement for this employee.");
    return;
  }

  status.style.color = "#0284c7";
  status.textContent = "Saving...";

  var existingRes = await client.from("staff_leave_balances").select("*").eq("employee_id", empId).maybeSingle();
  var existingUsedMap = {};
  if (existingRes.data && existingRes.data.assigned_types) {
    existingRes.data.assigned_types.forEach(function(x) { existingUsedMap[x.code] = x.used || 0; });
  }

  var assignedArray = [];
  checks.forEach(function(chk) {
    var code = chk.value;
    var name = chk.getAttribute("data-name");
    var daysInput = document.querySelector('.ccs-days[data-code="' + code + '"]');
    var totalDays = parseInt(daysInput ? daysInput.value : 10, 10);
    var usedDays = existingUsedMap[code] || 0;

    assignedArray.push({
      code: code,
      name: name,
      total: totalDays,
      used: usedDays
    });
  });

  var res = await client.from("staff_leave_balances").upsert([{
    employee_id: empId,
    staff_name: staffName,
    assigned_types: assignedArray,
    updated_at: new Date().toISOString()
  }]);

  if (res.error) {
    status.style.color = "#dc2626";
    status.textContent = "Error: " + res.error.message;
  } else {
    status.style.color = "#16a34a";
    status.textContent = "Leaves assigned successfully! Employee will only see these.";
  }
};

async function loadAdminLeaves() {
  var tbody = document.getElementById("leaveQueueTableBody");
  var badge = document.getElementById("leavePendingBadge");
  if (!tbody || !client) return;

  var res = await client.from("staff_leave_applications").select("*").order("created_at", { ascending: false });
  if (res.data) {
    var pendingCount = res.data.filter(function(l) { return l.status === 'PENDING' || l.cancel_requested; }).length;
    if (badge) {
      if (pendingCount > 0) {
        badge.textContent = pendingCount;
        badge.style.display = "inline-block";
      } else {
        badge.style.display = "none";
      }
    }

    if (res.data.length > 0) {
      tbody.innerHTML = res.data.map(function(l) {
        var appliedDate = l.created_at ? l.created_at.split('T')[0] : '-';
        var daysCount = l.is_curtailed ? (l.actual_days_taken + 'd (Curtailed)') : (l.total_days + 'd');

        var actionBtns = '';
        if (l.status === 'PENDING') {
          actionBtns = 
            '<button type="button" class="btn-approve" onclick="approveLeave(\'' + l.id + '\', \'' + l.employee_id + '\', \'' + l.leave_type + '\', ' + l.total_days + ')">Approve</button>' +
            '<button type="button" class="btn-reject" onclick="rejectLeave(\'' + l.id + '\')">Reject</button>';
        } else if (l.status === 'APPROVED') {
          actionBtns += '<button type="button" class="btn-order-slip" onclick="printSanctionOrderAdmin(\'' + encodeURIComponent(JSON.stringify(l)) + '\')">📄 Order</button>';

          if (l.cancel_requested) {
            actionBtns += '<button type="button" class="btn-cancel-app" onclick="confirmCancelAndReverse(\'' + l.id + '\', \'' + l.employee_id + '\', \'' + l.leave_type + '\', ' + (l.actual_days_taken || l.total_days) + ')">Confirm Cancel</button>';
          } else if (!l.is_curtailed) {
            actionBtns += '<button type="button" class="btn-curtail" onclick="curtailEarlyJoining(\'' + l.id + '\', \'' + l.employee_id + '\', \'' + l.leave_type + '\', ' + l.total_days + ', \'' + l.start_date + '\')">Early Join</button>';
          }
          actionBtns += '<button type="button" class="btn-delete" onclick="deleteLeaveRecord(\'' + l.id + '\')">Del</button>';
        } else {
          actionBtns = '<button type="button" class="btn-delete" onclick="deleteLeaveRecord(\'' + l.id + '\')">Del</button>';
        }

        var statusBadge = '<span class="badge-status ' + (l.is_curtailed ? 'CURTAILED' : l.status) + '">' + (l.is_curtailed ? 'CURTAILED' : l.status) + '</span>';
        if (l.cancel_requested) {
          statusBadge += '<br/><small style="color:#b45309; font-weight:bold;">Cancel Req: ' + (l.cancel_reason || '') + '</small>';
        }

        return '<tr>' +
          '<td>' + formatDateDMY(appliedDate) + '</td>' +
          '<td><strong>' + l.staff_name + '</strong></td>' +
          '<td>' + l.employee_id + '</td>' +
          '<td>' + l.leave_type + '</td>' +
          '<td>' + formatDateDMY(l.start_date) + ' to ' + formatDateDMY(l.end_date) + '</td>' +
          '<td>' + daysCount + '</td>' +
          '<td>' + (l.station_leave ? 'Yes' : 'No') + '</td>' +
          '<td style="text-align:left; max-width:180px;">' + l.reason + '</td>' +
          '<td>' + statusBadge + '</td>' +
          '<td>' + actionBtns + '</td>' +
        '</tr>';
      }).join("");
    } else {
      tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; color: #64748b;">No leave applications found.</td></tr>';
    }
  }
}

window.approveLeave = async function(id, empId, leaveType, days) {
  var remarks = prompt("Sanction Remarks (Optional):", "Sanctioned under Central Govt. Rules");
  if (remarks === null) return;

  var orderNo = "EMRS/SUB/" + new Date().getFullYear() + "/LV-" + Math.floor(1000 + Math.random() * 9000);

  await client.from("staff_leave_applications")
    .update({ status: "APPROVED", admin_remarks: remarks, order_no: orderNo, reviewed_at: new Date().toISOString() })
    .eq("id", id);

  await adjustLeaveBalance(empId, leaveType, days, "DEDUCT");
  loadAdminLeaves();
};

window.rejectLeave = async function(id) {
  var remarks = prompt("Rejection Reason:", "Duty exigency / No substitute available");
  if (remarks === null) return;

  await client.from("staff_leave_applications")
    .update({ status: "REJECTED", admin_remarks: remarks, reviewed_at: new Date().toISOString() })
    .eq("id", id);

  loadAdminLeaves();
};

window.confirmCancelAndReverse = async function(id, empId, leaveType, daysToRestore) {
  if (!confirm("Confirm cancellation? All " + daysToRestore + " days will be credited back to employee's balance.")) return;

  await client.from("staff_leave_applications")
    .update({ status: "CANCELLED", cancel_requested: false, admin_remarks: "Sanction cancelled and restored to balance", reviewed_at: new Date().toISOString() })
    .eq("id", id);

  await adjustLeaveBalance(empId, leaveType, daysToRestore, "RESTORE");
  loadAdminLeaves();
};

window.curtailEarlyJoining = async function(id, empId, leaveType, totalSanctionedDays, startDateStr) {
  var actualConsumedStr = prompt(
    "Employee applied for " + totalSanctionedDays + " days.\n" +
    "How many days did the employee ACTUALLY take before resuming duty?",
    Math.floor(totalSanctionedDays / 2)
  );

  if (!actualConsumedStr) return;
  var actualConsumed = parseInt(actualConsumedStr, 10);
  if (isNaN(actualConsumed) || actualConsumed < 0 || actualConsumed >= totalSanctionedDays) {
    alert("Invalid days. Must be less than original " + totalSanctionedDays + " days.");
    return;
  }

  var earlyJoinDate = prompt("Date of early duty resumption (YYYY-MM-DD):", new Date().toISOString().split("T")[0]);
  if (!earlyJoinDate) return;

  var unusedDaysToRefund = totalSanctionedDays - actualConsumed;

  await client.from("staff_leave_applications")
    .update({
      is_curtailed: true,
      actual_days_taken: actualConsumed,
      early_joining_date: earlyJoinDate,
      admin_remarks: "Curtailed: Resumed duty on " + earlyJoinDate + ". " + unusedDaysToRefund + " unused days credited back.",
      reviewed_at: new Date().toISOString()
    })
    .eq("id", id);

  await adjustLeaveBalance(empId, leaveType, unusedDaysToRefund, "RESTORE");
  alert("Leave curtailed successfully! " + unusedDaysToRefund + " unused days refunded to employee balance.");
  loadAdminLeaves();
};

async function adjustLeaveBalance(empId, leaveType, days, operation) {
  var res = await client.from("staff_leave_balances").select("*").eq("employee_id", empId).maybeSingle();
  if (res.data && res.data.assigned_types) {
    var types = res.data.assigned_types;
    var modified = false;

    types.forEach(function(item) {
      if (item.name === leaveType || leaveType.includes(item.code)) {
        if (operation === "DEDUCT") {
          item.used = (item.used || 0) + days;
        } else if (operation === "RESTORE") {
          item.used = Math.max(0, (item.used || 0) - days);
        }
        modified = true;
      }
    });

    if (modified) {
      await client.from("staff_leave_balances").update({ assigned_types: types }).eq("employee_id", empId);
    }
  }
}

window.printSanctionOrderAdmin = function(appJsonStr) {
  var d = JSON.parse(decodeURIComponent(appJsonStr));
  var orderNo = d.order_no || ('EMRS/SUB/' + new Date().getFullYear() + '/LV-' + d.id.substring(0, 5).toUpperCase());
  var win = window.open('', '_blank');
  win.document.write(
    '<!DOCTYPE html><html><head><title>Sanction Order - ' + d.staff_name + '</title>' +
    '<style>' +
      'body { font-family: "Georgia", serif; padding: 40px; color: #1e293b; line-height: 1.6; }' +
      '.box { border: 2px solid #0b3c5d; padding: 30px; max-width: 800px; margin: 0 auto; }' +
      '.head { text-align: center; border-bottom: 2px solid #0b3c5d; padding-bottom: 15px; margin-bottom: 25px; }' +
      'h2 { margin: 0; color: #0b3c5d; font-size: 1.35rem; }' +
      'h3 { margin: 6px 0; color: #f97316; font-size: 1.1rem; }' +
      '.memo { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 25px; font-size: 0.95rem; }' +
      '.body-text { font-size: 1.05rem; text-align: justify; margin: 25px 0; line-height: 1.8; }' +
      '.sign { margin-top: 60px; text-align: right; font-weight: bold; }' +
    '</style></head><body>' +
    '<div class="box">' +
      '<div class="head">' +
        '<h2>EKLAVYA MODEL RESIDENTIAL SCHOOL, SUBDEGA</h2>' +
        '<h3>OFFICE OF THE PRINCIPAL / HEAD OF OFFICE</h3>' +
        '<p style="margin:0; font-size:0.85rem;">Sundargarh, Odisha - 770014 | Under NESTS, Ministry of Tribal Affairs</p>' +
      '</div>' +
      '<div class="memo">' +
        '<div>Office Order No: <u>' + orderNo + '</u></div>' +
        '<div>Date: <u>' + formatDateDMY(d.reviewed_at ? d.reviewed_at.split("T")[0] : new Date().toISOString().split("T")[0]) + '</u></div>' +
      '</div>' +
      '<h3 style="text-align:center; text-decoration:underline;">SANCTION ORDER (LEAVE)</h3>' +
      '<p class="body-text">' +
        'In terms of Central Civil Services (Leave) Rules, 1972 & DoPT orders, sanction of the Principal, EMRS Subdega is hereby accorded to the grant of ' +
        '<strong>' + d.leave_type + '</strong> for a period of <strong>' + (d.actual_days_taken || d.total_days) + ' days</strong> ' +
        'from <strong>' + formatDateDMY(d.start_date) + '</strong> to <strong>' + formatDateDMY(d.end_date) + '</strong> ' +
        'to <strong>' + d.staff_name.toUpperCase() + '</strong>, Employee ID: <strong>' + d.employee_id + '</strong>, ' +
        'on the grounds of <em>"' + d.reason + '"</em>.' +
        (d.station_leave ? '<br/><br/><strong>Station Leave Permission:</strong> Permission to leave station/headquarters during the leave period is hereby <strong>ACCORDED</strong>.' : '') +
        (d.is_curtailed ? '<br/><br/><em>Note: The leave period stands curtailed due to early resumption of duty on ' + formatDateDMY(d.early_joining_date) + '.</em>' : '') +
      '</p>' +
      '<p style="font-size:0.95rem;">2. Certified that the incumbent will join the same post on expiry of leave.</p>' +
      '<div class="sign">' +
        'Principal / Sanctioning Authority<br/>EMRS Subdega, Sundargarh' +
      '</div>' +
    '</div>' +
    '<script>window.onload = function() { window.print(); }<\/script>' +
    '</body></html>'
  );
  win.document.close();
};

window.deleteLeaveRecord = async function(id) {
  if (!confirm("Delete this leave record?")) return;
  await client.from("staff_leave_applications").delete().eq("id", id);
  loadAdminLeaves();
};

// ---------------- 2. OTHER ADMIN SECTIONS ----------------
async function loadAdminStaff() {
  var tbody = document.getElementById("staffTableBody");
  if (!tbody || !client) return;
  var res = await client.from("staff").select("*").order("created_at", { ascending: false });
  if (res.data) {
    tbody.innerHTML = res.data.map(function(s) {
      return '<tr>' +
        '<td><img src="' + (s.photo_url || '') + '" style="max-height:45px;" /></td>' +
        '<td><strong>' + s.name + '</strong></td>' +
        '<td>' + s.employee_id + '</td>' +
        '<td>' + s.category + '</td>' +
        '<td>' + s.designation + '</td>' +
        '<td>' + formatDateDMY(s.doj_nests) + '</td>' +
        '<td>' + formatDateDMY(s.doj_emrs) + '</td>' +
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
        return '<tr>' +
          '<td>' + formatDateDMY(rawDate) + '</td>' +
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
  if (!confirm("Delete enquiry?")) return;
  await client.from("enquiries").delete().eq("id", id);
  loadAdminEnquiries();
};

async function loadAdminStudentResults() {
  var tbody = document.getElementById("studentResultsTableBody");
  if (!tbody || !client) return;
  var res = await client.from("student_results").select("*").order("created_at", { ascending: false });
  if (res.data) {
    tbody.innerHTML = res.data.map(function(s) {
      return '<tr>' +
        '<td>' + s.roll_no + '</td><td>' + s.student_name + '</td><td>' + s.class_name + '</td><td>' + s.academic_session + '</td>' +
        '<td>' + s.total_marks + '/' + s.max_marks + '</td><td>' + s.percentage + '%</td><td>' + s.result_status + '</td>' +
        '<td><button type="button" class="btn-delete" onclick="deleteResult(\'' + s.id + '\')">Delete</button></td>' +
      '</tr>';
    }).join("");
  }
}

window.deleteResult = async function(id) {
  if (!confirm("Delete result?")) return;
  await client.from("student_results").delete().eq("id", id);
  loadAdminStudentResults();
};

async function loadAdminDocs() {
  var tbody = document.getElementById("docTableBody");
  if (!tbody || !client) return;
  var res = await client.from("documents").select("*").order("created_at", { ascending: false });
  if (res.data) {
    tbody.innerHTML = res.data.map(function(d) {
      return '<tr>' +
        '<td>' + (d.circular_no || '-') + '</td><td>' + formatDateDMY(d.doc_date) + '</td><td>' + (d.category || '-') + '</td>' +
        '<td>' + d.title + '</td><td><a href="' + d.file_url + '" target="_blank">Download</a></td>' +
        '<td><button type="button" class="btn-delete" onclick="deleteDoc(\'' + d.id + '\')">Delete</button></td>' +
      '</tr>';
    }).join("");
  }
}

window.deleteDoc = async function(id) {
  if (!confirm("Delete document?")) return;
  await client.from("documents").delete().eq("id", id);
  loadAdminDocs();
};

async function loadAdminNotices() {
  var tbody = document.getElementById("noticeTableBody");
  if (!tbody || !client) return;
  var res = await client.from("notices").select("*").order("notice_date", { ascending: false });
  if (res.data) {
    tbody.innerHTML = res.data.map(function(n) {
      return '<tr>' +
        '<td>' + formatDateDMY(n.notice_date) + '</td><td>' + n.title + '</td><td>' + n.body + '</td>' +
        '<td><button type="button" class="btn-delete" onclick="deleteNotice(\'' + n.id + '\')">Delete</button></td>' +
      '</tr>';
    }).join("");
  }
}

window.deleteNotice = async function(id) {
  if (!confirm("Delete notice?")) return;
  await client.from("notices").delete().eq("id", id);
  loadAdminNotices();
};

async function loadAdminGallery() {
  var tbody = document.getElementById("galleryTableBody");
  if (!tbody || !client) return;
  var res = await client.from("gallery").select("*").order("created_at", { ascending: false });
  if (res.data) {
    tbody.innerHTML = res.data.map(function(g) {
      return '<tr>' +
        '<td><img src="' + g.image_url + '" style="height:40px;" /></td><td>' + (g.title || '-') + '</td>' +
        '<td>' + (g.is_slider ? 'In Slider' : 'Gallery') + '</td>' +
        '<td><button type="button" class="btn-delete" onclick="deleteGallery(\'' + g.id + '\')">Delete</button></td>' +
      '</tr>';
    }).join("");
  }
}

window.deleteGallery = async function(id) {
  if (!confirm("Delete photo?")) return;
  await client.from("gallery").delete().eq("id", id);
  loadAdminGallery();
};

async function loadInstitutionDetails() {
  if (!client) return;
  var res = await client.from("institution_details").select("*").eq("id", "primary").maybeSingle();
  if (res.data) {
    var d = res.data;
    if (document.getElementById("viewInstName")) document.getElementById("viewInstName").textContent = d.institution_name;
    if (document.getElementById("viewInstLoc")) document.getElementById("viewInstLoc").textContent = d.location;
    if (document.getElementById("viewInstGov")) document.getElementById("viewInstGov").textContent = d.governing_body;
    if (document.getElementById("viewInstEmail")) document.getElementById("viewInstEmail").textContent = d.official_email;
  }
}

document.addEventListener("DOMContentLoaded", function() {
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
