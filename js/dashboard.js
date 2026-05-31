let currentUserId = null;

async function initUser(){
    const { data } = await supabaseClient.auth.getUser();
    currentUserId = data.user.id;
}

document.addEventListener("DOMContentLoaded", async () => {

    const { data } =
        await supabaseClient.auth.getSession();

    if (!data.session) {

        window.location.replace("login.html");

        return;
    }

    loadPatients();

    loadAppointments();
});

/* =========================
   PREVENT BACK AFTER LOGOUT
========================= */

window.addEventListener("pageshow", async (event) => {

    const { data } =
        await supabaseClient.auth.getSession();

    if (event.persisted || !data.session) {

        window.location.replace("login.html");
    }
});

/* =========================
   AUTH STATE
========================= */

supabaseClient.auth.onAuthStateChange((event, session) => {

    if (!session) {

        window.location.replace("login.html");
    }
});

/* =========================
   GLOBAL
========================= */

let allPatients = [];

/* =========================
   LOAD PATIENTS
========================= */

async function loadPatients(){

    // 👤 current user
    const { data: userData } =
        await supabaseClient.auth.getUser();

    const userId = userData.user.id;

    const { data, error } =
        await supabaseClient
        .from("patients")
        .select("*")
        .eq("user_id", userId)
        .order("id", { ascending: false });

    if(error){

        console.log(error);

        return;
    }

    allPatients = data;

    renderTable(allPatients);

    document.getElementById("totalPatients")
        .innerText = data.length;
}

/* =========================
   RENDER TABLE
========================= */

function renderTable(patients){

    const tbody =
        document.querySelector(
            "#patientsTable tbody"
        );

    tbody.innerHTML = "";

    patients.forEach(p => {

        tbody.innerHTML += `

        <tr>

            <td>${p.full_name || "-"}</td>

            
<td>
        ${p.birth_date ? calculateAge(p.birth_date) + " years" : "-"}
    </td>
           

            <td>

                <a 
                    href="patient-file.html?id=${p.id}" 
                    class="open-file-btn"
                >

                    <i class="fa-solid fa-folder-open"></i>

                    Open File

                </a>

            </td>

        </tr>

        `;
    });
}

// doctors page 

function goToDoctors() {
    window.location.href = "doctors.html";
}

/* =========================
   SEARCH
========================= */

function searchPatients(){

    const value =
        document.getElementById("searchInput")
        .value
        .toLowerCase();

    const filtered =
        allPatients.filter(p =>

            (p.full_name || "")
            .toLowerCase()
            .includes(value)

            ||

            (p.phone || "")
            .toLowerCase()
            .includes(value)

            ||

            (p.address || "")
            .toLowerCase()
            .includes(value)
        );

    renderTable(filtered);
}

/* =========================
   NAVIGATION
========================= */

function openAddPatient(){

    window.location.href =
        "patients.html";
}

/* =========================
   LOAD APPOINTMENTS
========================= */

async function loadAppointments(){

    // 👤 current user
    const { data: userData } =
        await supabaseClient.auth.getUser();

    const userId = userData.user.id;

    /* IMPORTANT:
       show appointments from last 3 hours
       + upcoming appointments
    */

    const threeHoursAgo = new Date(
        Date.now() - 3 * 60 * 60 * 1000
    ).toISOString();

    const { data, error } =
        await supabaseClient
        .from("patient_visits")
        .select(`
            *,
            patients(full_name, phone)
        `)
        .eq("user_id", userId)
        .gte("next_appointment", threeHoursAgo)
        .order("next_appointment", {
            ascending:true
        })
        .limit(10);

    if(error){

        console.log(error);

        return;
    }

    const container =
        document.getElementById(
            "appointmentsContainer"
        );

    container.innerHTML = "";

    /* EMPTY */

    if(!data || data.length === 0){

        container.innerHTML = `

        <div class="no-appointments">

            <i class="fa-solid fa-calendar-xmark"></i>

            <br><br>

            No upcoming appointments

        </div>

        `;

        return;
    }

    /* LOOP */

    data.forEach(async (v) => {

        const appointmentTime =
            new Date(v.next_appointment);

        const now = new Date();

        const diffHours =
            (now - appointmentTime) /
            (1000 * 60 * 60);

        /* REMOVE AFTER 3 HOURS */

        if(diffHours >= 3){

            await supabaseClient
                .from("patient_visits")
                .update({
                    next_appointment: null
                })
                .eq("id", v.id);

            return;
        }

        container.innerHTML += `

        <div class="appointment-card">

            <!-- LEFT -->

            <div class="appointment-info">

                <div class="appointment-name">

                    <i class="fa-solid fa-user-clock"></i>

                    ${v.patients?.full_name || "Unknown"}

                </div>

                <div class="appointment-phone">

                    <i class="fa-solid fa-phone"></i>

                    ${v.patients?.phone || "No Phone"}

                </div>

                <div class="appointment-date">

                    <i class="fa-solid fa-calendar-days"></i>

                    ${
                    new Date(
                        v.next_appointment
                    ).toLocaleString('en-GB', {

                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',

                        hour: '2-digit',
                        minute: '2-digit',

                        hour12: true
                    })
                    }

                </div>

            </div>

            <!-- RIGHT -->

            <div class="appointment-actions">

                <div class="appointment-badge">

                    Upcoming Visit

                </div>

                <button 
                    onclick="deleteAppointment(${v.id})"
                    class="delete-appointment-btn"
                >

                    <i class="fa-solid fa-trash"></i>

                    Delete Appointment

                </button>

            </div>

        </div>

        `;
    });
}
/* =========================
   DELETE APPOINTMENT
========================= */

async function deleteAppointment(visitId){

    const confirmDelete = confirm(
        "Delete this appointment?"
    );

    if(!confirmDelete) return;

    const { error } =
        await supabaseClient
        .from("patient_visits")
        .update({

            next_appointment: null

        })
        .eq("id", visitId);

    if(error){

        alert(error.message);

        return;
    }

    showToast("appointment deleted successfully");

    loadAppointments();
}


function goToMyPage(){
    window.location.href = "pricing.html";
}

function goToAnalytics(){
    document.getElementById("analyticsSection")
        .scrollIntoView({ behavior: "smooth" });
}

// toast 
function showToast(message){
    const toast = document.getElementById("toast");

    toast.innerText = message;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

// patienta button 
function goToPatients(){

    document
        .getElementById("patientsSection")
        .scrollIntoView({

            behavior:"smooth"

        });
}


async function loadCurrentMonthDashboard(){

    const currentUserId = await getUserId();

    if(!currentUserId){
        console.log("No user");
        return;
    }

    const { data, error } = await supabaseClient
        .from("patientt_services")
        .select("*")
        .eq("user_id", currentUserId);

    if(error){
        console.log(error);
        return;
    }

    /* =========================
       FIXED DATE RANGE (UTC SAFE)
    ========================= */

    const now = new Date();

    const startOfMonth = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        1, 0, 0, 0
    ));

    const startOfNextMonth = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth() + 1,
        1, 0, 0, 0
    ));

    let total = 0;
    let paid = 0;
    let remaining = 0;
    let servicesCount = 0;

    let labCost = 0;
    let billsCost = 0;

    /* =========================
       SERVICES
    ========================= */

    data.forEach(item => {

        if(!item.created_at) return;

        const date = new Date(item.created_at);

        if(date >= startOfMonth && date < startOfNextMonth){

            total += Number(item.total_amount || 0);
            paid += Number(item.paid_amount || 0);
            remaining += Number(item.remain_amount || 0);

            servicesCount++;
        }
    });

    /* =========================
       PATIENTS
    ========================= */

    const { data: patientsData, error: patientsError } =
        await supabaseClient
            .from("patients")
            .select("id")
            .eq("user_id", currentUserId)
            .gte("created_at", startOfMonth.toISOString())
            .lt("created_at", startOfNextMonth.toISOString());

    if(patientsError){
        console.log(patientsError);
    }

    const patientsCount = patientsData?.length || 0;

    /* =========================
       LAB COST
    ========================= */

    const { data: labWorks } =
        await supabaseClient
        .from("lab_works")
        .select("lab_cost, created_at")
        .eq("user_id", currentUserId);

    labWorks?.forEach(item => {

        if(!item.created_at) return;

        const d = new Date(item.created_at);

        if(d >= startOfMonth && d < startOfNextMonth){
            labCost += Number(item.lab_cost || 0);
        }
    });

    /* =========================
       BILLS
    ========================= */

    const { data: bills } =
        await supabaseClient
        .from("bills")
        .select("amount, created_at")
        .eq("user_id", currentUserId);

    bills?.forEach(item => {

        if(!item.created_at) return;

        const d = new Date(item.created_at);

        if(d >= startOfMonth && d < startOfNextMonth){
            billsCost += Number(item.amount || 0);
        }
    });

    /* =========================
       NET PROFIT
    ========================= */

    const netProfit = total - labCost - billsCost;

    /* =========================
       UI
    ========================= */

    document.getElementById("monthTotal").innerText =
        total.toFixed(2) + " EGP";

    document.getElementById("monthPaid").innerText =
        paid.toFixed(2) + " EGP";

    document.getElementById("monthRemaining").innerText =
        remaining.toFixed(2) + " EGP";

    document.getElementById("monthPatients").innerText =
        servicesCount;

    const patientsEl = document.getElementById("monthUniquePatients");
    if(patientsEl){
        patientsEl.innerText = patientsCount;
    }

    const profitEl = document.getElementById("monthProfit");
    if(profitEl){
        profitEl.innerText = netProfit.toFixed(2) + " EGP";
    }
}

/* =========================
START
========================= */

loadCurrentMonthDashboard();

/* AUTO REFRESH */
setInterval(loadCurrentMonthDashboard, 5000);

/* =========================
LOAD FINANCIAL DASHBOARD
========================= */

async function loadFinancialDashboard(){

    const { data, error } = await supabaseClient
.from("patientt_services")
.select("*")
.eq("user_id", currentUserId);

    if(error){
        console.log(error);
        return;
    }

    let total = 0;
    let paid = 0;
    let remaining = 0;

    data.forEach(item => {

        total += Number(item.total_amount || 0);

        paid += Number(item.paid_amount || 0);

        remaining += Number(item.remain_amount || 0);

    });

    document.getElementById("dashboardTotal").innerText =
        total.toFixed(2) + " EGP";

    document.getElementById("dashboardPaid").innerText =
        paid.toFixed(2) + " EGP";

    document.getElementById("dashboardRemaining").innerText =
        remaining.toFixed(2) + " EGP";

}

/* START */

loadFinancialDashboard();

/* AUTO REFRESH */

setInterval(loadFinancialDashboard, 5000);



async function loadDailyDashboard(){

    const currentUserId = await getUserId();

    if(!currentUserId){
        console.log("No user");
        return;
    }

    /* =========================
       UTC SAFE DAY RANGE
    ========================= */

    const now = new Date();

    const todayStart = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0, 0, 0
    ));

    const tomorrowStart = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        0, 0, 0
    ));

    const from = todayStart.toISOString();
    const to = tomorrowStart.toISOString();

    /* =========================
       SERVICES TODAY
    ========================= */

    const { data: services } = await supabaseClient
        .from("patientt_services")
        .select("total_amount, paid_amount, created_at")
        .eq("user_id", currentUserId)
        .gte("created_at", from)
        .lt("created_at", to);

    let total = 0;
    let paid = 0;
    let servicesCount = 0;

    services?.forEach(item=>{
        total += Number(item.total_amount || 0);
        paid += Number(item.paid_amount || 0);
        servicesCount++;
    });

    const remain = total - paid;

    /* =========================
       LAB COST TODAY
    ========================= */

    let labCost = 0;

    const { data: labWorks } = await supabaseClient
        .from("lab_works")
        .select("lab_cost, created_at")
        .eq("user_id", currentUserId)
        .gte("created_at", from)
        .lt("created_at", to);

    labWorks?.forEach(item => {
        labCost += Number(item.lab_cost || 0);
    });

    /* =========================
       PATIENTS TODAY
    ========================= */

    const { data: patients } = await supabaseClient
        .from("patients")
        .select("id")
        .eq("user_id", currentUserId)
        .gte("created_at", from)
        .lt("created_at", to);

    /* =========================
       PROFIT TODAY
    ========================= */

    const profit = total - labCost;

    /* =========================
       UI
    ========================= */

    document.getElementById("dailyTotal").innerText =
        total.toFixed(2) + " EGP";

    document.getElementById("dailyPaid").innerText =
        paid.toFixed(2) + " EGP";

    document.getElementById("dailyRemain").innerText =
        remain.toFixed(2) + " EGP";

    document.getElementById("dailyServices").innerText =
        servicesCount;

    document.getElementById("dailyPatients").innerText =
        patients?.length || 0;

    document.getElementById("dailyProfit").innerText =
        profit.toFixed(2) + " EGP";
}

/* =========================
   START
========================= */

window.addEventListener("load", ()=>{
    loadDailyDashboard();
});

// custom chart 

async function loadCustomStats(){

    const userId = await getUserId();

    const from =
        document.getElementById("statsFrom").value;

    const to =
        document.getElementById("statsTo").value;

    if(!from || !to){
        alert("اختر التاريخ");
        return;
    }


    // =========================
    // SERVICES
    // =========================

    const { data: services, error } = await supabaseClient
    .from("patientt_services")
    .select("*")
    .eq("user_id", userId)
    .gte("created_at", from)
    .lte("created_at", to + "T23:59:59");

    if(error){
        alert(error.message);
        return;
    }

    let total = 0;
    let paid = 0;

    services.forEach(service => {

        total += Number(service.total_amount || 0);
        paid += Number(service.paid_amount || 0);

    });

    const remain = total - paid;


    // =========================
    // PATIENTS
    // =========================

    const { data: patients } = await supabaseClient
    .from("patients")
    .select("id")
    .eq("user_id", userId)
    .gte("created_at", from)
    .lte("created_at", to + "T23:59:59");

    // =========================
    // UI
    // =========================

    document.getElementById("customTotal")
    .innerText = total + " EGP";

    document.getElementById("customPaid")
    .innerText = paid + " EGP";

    document.getElementById("customRemain")
    .innerText = remain + " EGP";

    document.getElementById("customServices")
    .innerText = services.length;

    document.getElementById("customPatients")
    .innerText = patients.length;
}


// رسم بياني ومقارنة

let monthlyChart;


/* =========================
MONTHLY CHART
========================= */

async function loadMonthlyComparison(){

    const userId = await getUserId();

    const now = new Date();

    let labels = [];
    let totals = [];
    let paids = [];

    // آخر 6 شهور

    for(let i = 5; i >= 0; i--){

        const year = now.getUTCFullYear();
        const month = now.getUTCMonth() - i;

        const start = new Date(Date.UTC(year, month, 1, 0, 0, 0));
        const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59));

        const monthName =
            start.toLocaleString("en-US", {
                month: "short"
            });

        labels.push(monthName);



        // =========================
        // GET SERVICES
        // =========================

        const { data, error } = await supabaseClient
        .from("patientt_services")
        .select("*")
        .eq("user_id", userId)
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());

        if(error){
            console.log(error);
            continue;
        }

        let total = 0;
        let paid = 0;

        data.forEach(item=>{

            total += Number(item.total_amount || 0);

            paid += Number(item.paid_amount || 0);

        });

        totals.push(total);

        paids.push(paid);
    }

    // =========================
    // DESTROY OLD CHART
    // =========================

    if(monthlyChart){
        monthlyChart.destroy();
    }

    // =========================
    // CREATE CHART
    // =========================

    const ctx =
        document.getElementById("monthlyChart");

    monthlyChart = new Chart(ctx, {

        type:"bar",

        data:{

            labels:labels,

            datasets:[

                {
                    label:"Total Revenue",
                    data:totals,
                    backgroundColor:"#4cc9f0",
                    borderRadius:10
                },

                {
                    label:"Paid",
                    data:paids,
                    backgroundColor:"#80ffdb",
                    borderRadius:10
                }

            ]
        },

        options:{

            responsive:true,

            plugins:{

                legend:{
                    labels:{
                        color:"white"
                    }
                }
            },

            scales:{

                x:{
                    ticks:{
                        color:"#cbd5e1"
                    },
                    grid:{
                        color:"rgba(255,255,255,.05)"
                    }
                },

                y:{
                    ticks:{
                        color:"#cbd5e1"
                    },
                    grid:{
                        color:"rgba(255,255,255,.05)"
                    }
                }
            }
        }
    });
}

window.addEventListener("load", ()=>{

    loadMonthlyComparison();

});



async function loadTopService(){

    const userId = await getUserId();

    const { data, error } = await supabaseClient
    .from("patientt_services")
    .select("service_name")
    .eq("user_id", userId);

    if(error){
        console.log(error);
        return;
    }

    let counter = {};

    data.forEach(item=>{

        const name = item.service_name || "Unknown";

        counter[name] = (counter[name] || 0) + 1;
    });

    let topName = "---";
    let topCount = 0;

    for(let service in counter){
        if(counter[service] > topCount){
            topName = service;
            topCount = counter[service];
        }
    }

    document.getElementById("topServiceName").innerText = topName;
    document.getElementById("topServiceCount").innerText = topCount + " Times";
}




let servicesChart;

/* =========================
LOAD SERVICES ANALYTICS
========================= */

async function loadServicesAnalytics(){

    const userId = await getUserId();

    /* =========================
       DATE FILTER
    ========================= */

    const fromInput = document.getElementById("analyticsFrom")?.value;
    const toInput = document.getElementById("analyticsTo")?.value;

    let query = supabaseClient
        .from("patientt_services")
        .select("*")
        .eq("user_id", userId);

if(fromInput){

        const fromDate = new Date(fromInput);

        const fromUTC = new Date(Date.UTC(
            fromDate.getFullYear(),
            fromDate.getMonth(),
            fromDate.getDate(),
            0, 0, 0
        ));

        query = query.gte("created_at", fromUTC.toISOString());
    }

 if(toInput){

        const toDate = new Date(toInput);

        const toUTC = new Date(Date.UTC(
            toDate.getFullYear(),
            toDate.getMonth(),
            toDate.getDate(),
            23, 59, 59
        ));

        query = query.lte("created_at", toUTC.toISOString());
    }

    const { data, error } = await query;

console.log("DATA FROM SUPABASE:", data);
console.log("ERROR:", error);

    if(error){
        console.log(error);
        return;
    }

    /* =========================
       IMPORTANT FIX (EMPTY DATA)
    ========================= */

    const table = document.getElementById("servicesAnalyticsTable");
    const canvas = document.getElementById("servicesChart");

    // لو مفيش بيانات
    if(!data || data.length === 0){

        table.innerHTML = `
            <tr>
                <td colspan="5" style="padding:20px;color:#fff;text-align:center;">
                    لا توجد بيانات في هذه الفترة
                </td>
            </tr>
        `;

        document.getElementById("topService").innerText = "---";
        document.getElementById("servicesCount").innerText = 0;

        if(window.servicesChart){
            window.servicesChart.destroy();
        }

        return;
    }

    /* =========================
       STATS
    ========================= */

    const stats = {};
    let totalServices = 0;

    data.forEach(service => {

        const name = service.service_name || "Unnamed";

        const total = Number(service.total_amount || 0);
        const paid = Number(service.paid_amount || 0);
        const remain = Number(service.remain_amount || 0);

        if(!stats[name]){
            stats[name] = {
                count:0,
                total:0,
                paid:0,
                remain:0
            };
        }

        stats[name].count += 1;
        stats[name].total += total;
        stats[name].paid += paid;
        stats[name].remain += remain;

        totalServices++;
    });

    /* =========================
       TABLE
    ========================= */

    table.innerHTML = "";

    let topName = "---";
    let topCount = 0;

    Object.keys(stats).forEach(name => {

        const item = stats[name];

        if(item.count > topCount){
            topCount = item.count;
            topName = name;
        }

        table.innerHTML += `
        <tr style="background:#1e293b;border-bottom:1px solid rgba(255,255,255,.05);">

            <td style="padding:14px;color:white;">${name}</td>
            <td style="padding:14px;color:#4cc9f0;">${item.count}</td>
            <td style="padding:14px;color:#80ffdb;">${item.total.toFixed(2)} EGP</td>
            <td style="padding:14px;color:#38bdf8;">${item.paid.toFixed(2)} EGP</td>
            <td style="padding:14px;color:#ff8fa3;">${item.remain.toFixed(2)} EGP</td>

        </tr>`;
    });

    /* =========================
       TOP STATS
    ========================= */

    document.getElementById("topService").innerText = topName;
    document.getElementById("servicesCount").innerText = totalServices;

    /* =========================
       CHART DATA
    ========================= */

    const labels = Object.keys(stats);
    const values = labels.map(label => stats[label].count);

    /* =========================
       DESTROY OLD CHART
    ========================= */

    
if(window.servicesChart && typeof window.servicesChart.destroy === "function"){
    window.servicesChart.destroy();
}
    /* =========================
       CREATE CHART (SAFE)
    ========================= */

    window.servicesChart = new Chart(canvas, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                label: "عدد مرات الخدمة",
                data: values,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: { color: "white" }
                }
            },
            scales: {
                x: { ticks: { color: "white" } },
                y: { ticks: { color: "white" } }
            }
        }
    });
}

/* =========================
AUTO LOAD
========================= */





async function getUserId() {
    const { data } = await supabaseClient.auth.getUser();
    return data.user.id;
}


window.addEventListener("load", async () => {

    await initUser();

    loadCurrentMonthDashboard();
    loadFinancialDashboard();
    loadDailyDashboard();
    loadMonthlyComparison();
    loadTopService();

    // 🔥 استدعاء واحد فقط
    await loadServicesAnalytics();
});


// احصائيات العمر 
function calculateAge(birthDate){

    if(!birthDate) return 0;

    const today = new Date();
    const birth = new Date(birthDate);

    let age = today.getFullYear() - birth.getFullYear();

    const m = today.getMonth() - birth.getMonth();

    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
    }

    return age;
}

async function loadAgeStats(){

    const userId = await getUserId();
    if(!userId) return;

    const filter = document.getElementById("timeFilter")?.value || "all";

    let query = supabaseClient
        .from("patients")
        .select("birth_date, created_at")
        .eq("user_id", userId);

    const now = new Date();

    /* =========================
   FILTER LOGIC (UTC SAFE)
========================= */

if(filter === "today"){

    const nowUTC = new Date();

    const startUTC = new Date(Date.UTC(
        nowUTC.getUTCFullYear(),
        nowUTC.getUTCMonth(),
        nowUTC.getUTCDate(),
        0,0,0
    ));

    query = query.gte(
        "created_at",
        startUTC.toISOString()
    );
}

else if(filter === "week"){

    const weekAgoUTC = new Date();

    weekAgoUTC.setUTCDate(
        weekAgoUTC.getUTCDate() - 7
    );

    query = query.gte(
        "created_at",
        weekAgoUTC.toISOString()
    );
}

else if(filter === "month"){

    const monthAgoUTC = new Date();

    monthAgoUTC.setUTCMonth(
        monthAgoUTC.getUTCMonth() - 1
    );

    query = query.gte(
        "created_at",
        monthAgoUTC.toISOString()
    );
}

    /* ALL TIME → لا شيء (default) */

    const { data, error } = await query;

    if(error){
        console.log("SUPABASE ERROR:", error);
        return;
    }

    if(!data){
        return;
    }

    /* =========================
       AGE GROUPS
    ========================= */

    let groups = {
        "0-10": 0,
        "11-20": 0,
        "21-40": 0,
        "41-60": 0,
        "60+": 0
    };

    data.forEach(p => {

        if(!p.birth_date) return;

        const age = calculateAge(p.birth_date);

        if(isNaN(age)) return;

        if(age <= 10) groups["0-10"]++;
        else if(age <= 20) groups["11-20"]++;
        else if(age <= 40) groups["21-40"]++;
        else if(age <= 60) groups["41-60"]++;
        else groups["60+"]++;
    });

    /* =========================
       RENDER TABLE
    ========================= */

    const container = document.getElementById("ageStats");

    container.innerHTML = `
<tr>
    <td><div class="table-badge blue">👶 Kids</div></td>
    <td>0 - 10</td>
    <td class="count">${groups["0-10"]}</td>
</tr>

<tr>
    <td><div class="table-badge green">🧑 Young</div></td>
    <td>11 - 20</td>
    <td class="count">${groups["11-20"]}</td>
</tr>

<tr>
    <td><div class="table-badge purple">👨 Adults</div></td>
    <td>21 - 40</td>
    <td class="count">${groups["21-40"]}</td>
</tr>

<tr>
    <td><div class="table-badge orange">🧔 Middle</div></td>
    <td>41 - 60</td>
    <td class="count">${groups["41-60"]}</td>
</tr>

<tr>
    <td><div class="table-badge red">👴 Seniors</div></td>
    <td>60+</td>
    <td class="count">${groups["60+"]}</td>
</tr>
`;
}

window.onload = () => {
    loadAgeStats();
};

function goToLabs(){
    window.location.href = "labs.html";
}

function goToBills(){
    window.location.href = "Bill.html";
}






async function loadNetProfit(){

    const userId = await getUserId();

    /* =========================
       SAFE FILTER
    ========================= */

    const filterElement =
        document.getElementById("profitFilter");

    if(!filterElement){
        console.error("profitFilter not found");
        return;
    }

    let filter = filterElement.value;

    // 🔥 DEFAULT = MONTH
    if(!filter || filter === ""){
        filter = "month";
        filterElement.value = "month";
    }

    const now = new Date();

    let fromDate = new Date();
    let toDate = new Date();

    /* =========================
       DATE FILTERS (UTC SAFE)
    ========================= */

    switch(filter){

        case "today":
            fromDate = new Date();
            fromDate.setHours(0,0,0,0);
            toDate = new Date();
            break;

        case "week":
            fromDate = new Date();
            fromDate.setDate(now.getDate() - 7);
            toDate = new Date();
            break;

        case "month":
            fromDate = new Date(Date.UTC(
                now.getUTCFullYear(),
                now.getUTCMonth(),
                1
            ));
            toDate = new Date();
            break;

        case "last_month":
            fromDate = new Date(Date.UTC(
                now.getUTCFullYear(),
                now.getUTCMonth() - 1,
                1
            ));

            toDate = new Date(Date.UTC(
                now.getUTCFullYear(),
                now.getUTCMonth(),
                0
            ));
            break;

        case "3m":
            fromDate = new Date();
            fromDate.setMonth(now.getMonth() - 3);
            toDate = new Date();
            break;

        case "6m":
            fromDate = new Date();
            fromDate.setMonth(now.getMonth() - 6);
            toDate = new Date();
            break;
    }

    const from = fromDate.toISOString();
    const to = toDate.toISOString();

    /* =========================
       SERVICES
    ========================= */

    const { data: services } =
        await supabaseClient
        .from("patientt_services")
        .select("total_amount")
        .eq("user_id", userId)
        .gte("created_at", from)
        .lte("created_at", to);

    let servicesTotal = 0;

    services?.forEach(i => {
        servicesTotal += Number(i.total_amount || 0);
    });

    /* =========================
       LAB COST
    ========================= */

    const { data: labWorks } =
        await supabaseClient
        .from("lab_works")
        .select("lab_cost")
        .eq("user_id", userId)
        .gte("created_at", from)
        .lte("created_at", to);

    let labTotal = 0;

    labWorks?.forEach(i => {
        labTotal += Number(i.lab_cost || 0);
    });

    /* =========================
       BILLS
    ========================= */

    const { data: bills } =
        await supabaseClient
        .from("bills")
        .select("amount")
        .eq("user_id", userId)
        .gte("created_at", from)
        .lte("created_at", to);

    let billsTotal = 0;

    bills?.forEach(i => {
        billsTotal += Number(i.amount || 0);
    });

    /* =========================
       NET PROFIT
    ========================= */

    const netProfit =
        servicesTotal - labTotal - billsTotal;

    /* =========================
       UI
    ========================= */

    document.getElementById("netProfit").innerHTML = `
        <div style="font-size:18px;font-weight:700">
            ${netProfit.toFixed(2)} EGP
        </div>

        <div style="color:#94a3b8;font-size:13px;margin-top:5px">
            Income: ${servicesTotal.toFixed(2)} <br>
            Lab Cost: ${labTotal.toFixed(2)} <br>
            Bills: ${billsTotal.toFixed(2)}
        </div>
    `;
}

/* =========================
   AUTO LOAD (FIXED)
========================= */

window.addEventListener("load", async () => {

    const filter = document.getElementById("profitFilter");

    if(filter){
        filter.value = "month";
    }

    await loadNetProfit();
});