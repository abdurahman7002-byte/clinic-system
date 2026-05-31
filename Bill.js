
let editingBillId = null;

/* =========================
GET USER
========================= */

async function getUserId(){

    const { data:{user} } =
        await supabaseClient.auth.getUser();

    return user?.id || null;
}

/* =========================
SAVE / UPDATE BILL
========================= */

async function saveBill(){

    const userId = await getUserId();

    const beneficiary =
        document.getElementById("beneficiary")
        .value
        .trim();

    const reason =
        document.getElementById("reason")
        .value
        .trim();

    const amount =
        parseFloat(
            document.getElementById("amount").value
        );

    if(!beneficiary){
        alert("Beneficiary is required");
        return;
    }

    if(!reason){
        alert("Reason is required");
        return;
    }

    if(!amount){
        alert("Amount is required");
        return;
    }

    const payload = {
        user_id: userId,
        beneficiary,
        reason,
        amount
    };

    let error;

    // =========================
    // UPDATE MODE
    // =========================
    if(editingBillId){

        ({ error } = await supabaseClient
            .from("bills")
            .update(payload)
            .eq("id", editingBillId)
        );

        editingBillId = null;

    } else {

        // =========================
        // INSERT MODE
        // =========================
        ({ error } = await supabaseClient
            .from("bills")
            .insert([payload])
        );
    }

    if(error){
        alert(error.message);
        return;
    }

    clearForm();
    loadBills();

    document.querySelector(".save-btn").innerText =
        "Save Bill";
}

/* =========================
EDIT BILL
========================= */

function editBill(bill){

    document.getElementById("beneficiary").value =
        bill.beneficiary || "";

    document.getElementById("reason").value =
        bill.reason || "";

    document.getElementById("amount").value =
        bill.amount || "";

    editingBillId = bill.id;

    document.querySelector(".save-btn").innerText =
        "Update Bill";

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

/* =========================
CLEAR FORM
========================= */

function clearForm(){

    document.getElementById("beneficiary").value = "";
    document.getElementById("reason").value = "";
    document.getElementById("amount").value = "";
}

/* =========================
LOAD BILLS
========================= */

async function loadBills(){

    const userId = await getUserId();

    // 🔥 فلتر: آخر 6 أشهر فقط
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data, error } =
        await supabaseClient
        .from("bills")
        .select("*")
        .eq("user_id", userId)
        .gte("created_at", sixMonthsAgo.toISOString()) // 👈 هنا الفلتر
        .order("id",{ascending:false});

    if(error){
        console.log(error);
        return;
    }

    const container =
        document.getElementById("billsContainer");

    container.innerHTML = "";

    if(!data || data.length === 0){
        container.innerHTML =
        "<p>No Bills Found</p>";
        return;
    }

    data.forEach(bill => {

        container.innerHTML += `

        <div class="bill-item">

            <div class="bill-title">
                ${bill.beneficiary}
            </div>

            <div>
                ${bill.reason}
            </div>

            <div class="amount">
                ${bill.amount} EGP
            </div>

            <div class="bill-date">
                ${new Date(bill.created_at).toLocaleString()}
            </div>

            <div style="display:flex;gap:8px;margin-top:10px;">

                <button
                    onclick='editBill(${JSON.stringify(bill)})'
                    class="edit-btn"
                    style="
                        background: linear-gradient(135deg, #3b82f6, #06b6d4);
                        color: white;
                        border: none;
                        padding: 8px 14px;
                        border-radius: 10px;
                        cursor: pointer;
                        font-weight: 600;
                        font-size: 13px;
                        box-shadow: 0 6px 16px rgba(59, 130, 246, 0.25);
                        transition: 0.3s;
                    "
                    onmouseover="this.style.transform='translateY(-2px)'"
                    onmouseout="this.style.transform='translateY(0)'"
                >
                    ✏️ Edit
                </button>

                <button
                    class="delete-btn"
                    onclick="deleteBill(${bill.id})">

                    Delete

                </button>

            </div>

        </div>

        `;
    });
}
/* =========================
DELETE BILL
========================= */

async function deleteBill(id){

    if(!confirm("Delete Bill?"))
        return;

    const { error } =
        await supabaseClient
        .from("bills")
        .delete()
        .eq("id", id);

    if(error){
        alert(error.message);
        return;
    }

    loadBills();
}

/* =========================
GO DASHBOARD
========================= */

function goDashboard(){

    window.location.href =
        "dashboard.html";
}

/* =========================
INIT
========================= */

loadBills();