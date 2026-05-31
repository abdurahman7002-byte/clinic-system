const params = new URLSearchParams(window.location.search);
const labId = params.get("id");

let currentUserId = null;
window.editingWorkId = null;

/* =========================
GET USER
========================= */

async function getUserId(){

    const { data:{user} } =
        await supabaseClient.auth.getUser();

    return user?.id || null;
}

/* =========================
LOAD LAB INFO
========================= */

async function loadLabInfo(){

    const { data, error } = await supabaseClient
        .from("labs")
        .select("*")
        .eq("id", labId)
        .single();

    if(error){
        console.log("LOAD ERROR:", error);
        return;
    }

    if(!data) return;

    document.getElementById("labName").innerText = data.lab_name || "-";
    document.getElementById("labSpec").innerText = data.specialization || "-";
    document.getElementById("labAddress").innerText = data.address || "-";
    document.getElementById("labPhone").innerText = data.phone || "-";
}


/* =========================
ENABLE EDIT MODE
========================= */

function enableEditLab(){

    document.getElementById("labViewMode").style.display = "none";
    document.getElementById("labEditMode").style.display = "block";

    document.getElementById("edit_labName").value =
        document.getElementById("labName").innerText;

    document.getElementById("edit_labSpec").value =
        document.getElementById("labSpec").innerText;

    document.getElementById("edit_labAddress").value =
        document.getElementById("labAddress").innerText;

    document.getElementById("edit_labPhone").value =
        document.getElementById("labPhone").innerText;
}


/* =========================
CANCEL EDIT
========================= */

function cancelEditLab(){

    document.getElementById("labEditMode").style.display = "none";
    document.getElementById("labViewMode").style.display = "block";
}


/* =========================
SAVE EDIT
========================= */

async function saveLabEdit(){

    console.log("LAB ID:", labId);

    const payload = {
        lab_name: document.getElementById("edit_labName").value,
        specialization: document.getElementById("edit_labSpec").value,
        address: document.getElementById("edit_labAddress").value,
        phone: document.getElementById("edit_labPhone").value
    };

    const { data, error } = await supabaseClient
        .from("labs")
        .update(payload)
        .eq("id", labId)
        .select(); // 🔥 مهم جدًا للتأكد أن التحديث حصل

    if(error){
        console.log("UPDATE ERROR:", error);
        alert(error.message);
        return;
    }

    if(!data || data.length === 0){
        alert("❌ No row updated. Check labId or RLS policy");
        console.log("NO UPDATE RESULT:", data);
        return;
    }

    console.log("UPDATED SUCCESS:", data);

    // 🔥 إعادة تحميل البيانات من قاعدة البيانات
    await loadLabInfo();

    cancelEditLab();

    alert("✅ Lab updated successfully");
}

/* =========================
AUTO DELETE OLD WORKS (6 MONTHS)
========================= */

async function autoDeleteOldWorks(){

    const userId = await getUserId();
    if(!userId || !labId) return;

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { error } = await supabaseClient
        .from("lab_works")
        .delete()
        .eq("user_id", userId)
        .eq("lab_id", labId)
        .lt("created_at", sixMonthsAgo.toISOString()); // 🔥 الشرط الأساسي

    if(error){
        console.log("Auto delete error:", error);
    }
}

/* =========================
SAVE WORK (INSERT ONLY)
========================= */

async function saveWork(){

    const { data: { user } } =
        await supabaseClient.auth.getUser();

    const userId = user?.id;

    if(!userId || !labId){
        alert("Missing user or labId");
        return;
    }

    const workName = document.getElementById("workName").value.trim();

    if(!workName){
        alert("Work Name is required");
        return;
    }

    const payload = {
        user_id: userId,
        lab_id: labId,

        doctor_name: document.getElementById("doctorName").value || null,
        patient_name: document.getElementById("patientName").value || null,
        work_name: workName,
        work_type: document.getElementById("workType").value || null,

        lab_cost: document.getElementById("labCost").value
            ? parseFloat(document.getElementById("labCost").value)
            : null,

        patient_amount: document.getElementById("patientAmount").value
            ? parseFloat(document.getElementById("patientAmount").value)
            : null,

        delivery_date: document.getElementById("deliveryDate").value || null,
        notes: document.getElementById("notes").value || null
    };

    const { error } = await supabaseClient
        .from("lab_works")
        .insert([payload]);

    if(error){
        console.log(error);
        alert(error.message);
        return;
    }

    clearWorkForm();
    loadWorks();
    loadDashboard();
}

/* =========================
START EDIT
========================= */

function startEdit(id){
    window.editingWorkId = id;
    loadWorks();
}

/* =========================
CANCEL EDIT
========================= */

function cancelEdit(){
    window.editingWorkId = null;
    loadWorks();
}

/* =========================
INLINE SAVE EDIT
========================= */

async function saveInlineEdit(id){

    const payload = {
        doctor_name: document.getElementById(`edit_doctor_${id}`).value,
        patient_name: document.getElementById(`edit_patient_${id}`).value,
        work_name: document.getElementById(`edit_work_${id}`).value,
        work_type: document.getElementById(`edit_type_${id}`).value,
        lab_cost: parseFloat(document.getElementById(`edit_cost_${id}`).value || 0),
        patient_amount: parseFloat(document.getElementById(`edit_paid_${id}`).value || 0),
        delivery_date: document.getElementById(`edit_date_${id}`).value,
        notes: document.getElementById(`edit_notes_${id}`).value
    };

    const { error } = await supabaseClient
        .from("lab_works")
        .update(payload)
        .eq("id", id);

    if(error){
        alert(error.message);
        return;
    }

    window.editingWorkId = null;
    loadWorks();
    loadDashboard();
}

/* =========================
DELETE WORK
========================= */

async function deleteWork(id){

    if(!confirm("Delete this work?")) return;

    const { error } = await supabaseClient
        .from("lab_works")
        .delete()
        .eq("id", id);

    if(error){
        alert(error.message);
        return;
    }

    loadWorks();
    loadDashboard();
}

/* =========================
CLEAR FORM
========================= */

function clearWorkForm(){

    document.getElementById("doctorName").value = "";
    document.getElementById("patientName").value = "";
    document.getElementById("workName").value = "";
    document.getElementById("workType").value = "";
    document.getElementById("labCost").value = "";
    document.getElementById("patientAmount").value = "";
    document.getElementById("deliveryDate").value = "";
    document.getElementById("notes").value = "";
}

/* =========================
LOAD WORKS
========================= */

async function loadWorks(){

    const userId = await getUserId();
    if(!userId || !labId) return;

    /* 🔥 تشغيل الحذف التلقائي */
    await autoDeleteOldWorks();

    const { data, error } = await supabaseClient
        .from("lab_works")
        .select("*")
        .eq("user_id", userId)
        .eq("lab_id", labId)
        .order("id", { ascending:false });

    const container = document.getElementById("worksContainer");
    container.innerHTML = "";

    if(error){
        console.log(error);
        return;
    }

    if(!data || data.length === 0){
        container.innerHTML = "<p style='color:#94a3b8'>No Works</p>";
        return;
    }

    const editingId = window.editingWorkId;

    data.forEach(w => {

        const isEditing = editingId === w.id;

        container.innerHTML += `
        <div class="item">

            ${isEditing ? `

            <div class="edit-grid">

                <input id="edit_doctor_${w.id}" value="${w.doctor_name || ""}">
                <input id="edit_patient_${w.id}" value="${w.patient_name || ""}">
                <input id="edit_work_${w.id}" value="${w.work_name || ""}">
                <input id="edit_type_${w.id}" value="${w.work_type || ""}">

                <input id="edit_cost_${w.id}" value="${w.lab_cost || 0}">
                <input id="edit_paid_${w.id}" value="${w.patient_amount || 0}">

                <input id="edit_date_${w.id}" type="date" value="${w.delivery_date || ""}">

                <textarea id="edit_notes_${w.id}">${w.notes || ""}</textarea>

            </div>

            <div class="actions">
                <button class="btn save-btn" onclick="saveInlineEdit(${w.id})">Save</button>
                <button class="btn cancel-btn" onclick="cancelEdit()">Cancel</button>
            </div>

            ` : `

            <div class="title">${w.work_name}</div>

            <div class="small">

                👨‍⚕️ Doctor: ${w.doctor_name || "-"} <br>
                🧑 Patient: ${w.patient_name || "-"} <br>
                🧪 Type: ${w.work_type || "-"} <br>

                💰 Cost: ${w.lab_cost || 0} <br>
                💵 Paid: ${w.patient_amount || 0} <br>
                📅 Delivery: ${w.delivery_date || "-"} <br>

                🟢 Profit: ${
                    ((Number(w.patient_amount || 0)) - (Number(w.lab_cost || 0))).toFixed(2)
                } <br>

                📝 Notes: ${w.notes || "-"} <br>

            </div>

            <div class="actions">
                <button class="btn edit-btn" onclick="startEdit(${w.id})">Edit</button>
                <button class="btn delete-btn" onclick="deleteWork(${w.id})">Delete</button>
            </div>

            `}
        </div>
        `;
    });
}

/* =========================
DASHBOARD
========================= */

async function loadDashboard(){

    const { data } = await supabaseClient
        .from("lab_works")
        .select("*")
        .eq("lab_id", labId);

    let totalCost = 0;
    let totalRevenue = 0;

    data.forEach(w => {
        totalCost += Number(w.lab_cost || 0);
        totalRevenue += Number(w.patient_amount || 0);
    });

    const profit = totalRevenue - totalCost;

    document.getElementById("dash").innerHTML = `
        <div>اجمالي عدد التركيبات: ${data.length}</div>
        <div>اجمالي حساب المعمل:  ${totalCost}</div>
        <div>اجمالي المحصل من المرضى:  ${totalRevenue}</div>
        <div style="color:#10b981;font-weight:700">
            اجمالي الربح:  ${profit}
        </div>
    `;
}

/* =========================
INIT
========================= */

window.onload = async () => {

    const { data: { user } } = await supabaseClient.auth.getUser();

    if(!user){
        window.location.href = "login.html";
        return;
    }

    currentUserId = user.id;

    await loadLabInfo();
    await loadWorks();
    await loadDashboard();
};

function goToRegister(){
    window.location.href = "labs.html";
}
function goHome(){
    window.location.href = "dashboard.html";
}