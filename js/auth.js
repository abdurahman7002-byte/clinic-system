// =========================
// CHECK USER LOGIN
// =========================

async function checkUser(){

    const { data } = await supabaseClient.auth.getUser();

    if(!data.user){
        window.location.href = "login.html";
    }

    return data.user;
}


// =========================
// GET CURRENT USER ROLE
// =========================

async function getRole(){

    const user = await checkUser();

    const userId = user.id;

    const { data, error } = await supabaseClient
        .from("user_roles")
        .select("*")
        .eq("id", userId)
        .single();

    if(error){
        console.log("Role error:", error);
        return null;
    }

    return data.role;
}


// =========================
// LOGOUT
// =========================

async function logout() {
    await supabaseClient.auth.signOut();

    localStorage.clear();
    sessionStorage.clear();

    window.location.replace("login.html");
}

// roles 
async function getRole(){

    const { data: userData } =
        await supabaseClient.auth.getUser();

    const userId = userData.user.id;

    const { data } = await supabaseClient
        .from("user_roles")
        .select("*")
        .eq("id", userId)
        .single();

    return data.role;
}