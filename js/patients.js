
async function savePatient(){

    // 👤 current logged user
    const { data: userData } =
        await supabaseClient.auth.getUser();

    const userId = userData.user.id;

    // ✅ required field
    const name = document.getElementById("name").value;

    if(!name){
        alert("Patient name is required");
        return;
    }

    const patient = {

        full_name: name,

        phone:
            document.getElementById("phone").value || null,

        gender:
            document.getElementById("gender").value || null,

        address:
            document.getElementById("address").value || null,

        birth_date:
            document.getElementById("birth").value || null,

        medical_history:
            document.getElementById("medical").value || null,

        dental_history:
            document.getElementById("dental").value || null,

        
        // 🔥 important
        user_id: userId

    };

    const { error } =
        await supabaseClient
        .from("patients")
        .insert([patient]);

    if(error){
        alert(error.message);
        return;
    }

    showToast("patient added successfully");

    document.getElementById("patientForm").reset();

    loadPatients();
}

async function loadPatients(){

    // 👤 current logged user
    const { data: userData } =
        await supabaseClient.auth.getUser();

    const userId = userData.user.id;

    // 🔥 load ONLY this user's patients
    const { data, error } =
        await supabaseClient
        .from("patients")
        .select("*")
        .eq("user_id", userId)
        .order("id", { ascending:false });

    if(error){

        console.log(error);

        return;
    }

    const tableBody =
        document.querySelector(
            "#patientsTable tbody"
        );

    tableBody.innerHTML = "";

    data.forEach(patient => {

        tableBody.innerHTML += `

        <tr>

            <td>${patient.full_name || "-"}</td>

            <td>${patient.phone || "-"}</td>

            <td>${patient.paid_amount || 0}</td>

            <td>${patient.remaining_amount || 0}</td>

        </tr>

        `;
    });
}

loadPatients();

function goToDashboard(){

    window.location.href =
        "dashboard.html";
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