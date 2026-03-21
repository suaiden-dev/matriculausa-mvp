import fs from 'fs';
const env = fs.readFileSync('.env', 'utf-8');
const urlMatches = env.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatches = env.match(/VITE_SUPABASE_SERVICE_ROLE_KEY=(.*)/);

if (!urlMatches || !keyMatches) {
    console.error("No url or key");
    process.exit(1);
}

const url = urlMatches[1].trim();
const key = keyMatches[1].trim();

async function checkRpc() {
    const req = await fetch(`${url}/rest/v1/rpc/get_admin_student_full_details`, {
        method: 'POST',
        headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ target_profile_id: '4ac9e7c3-3755-46aa-abcd-33e9d8e57930' }) // Some mock or just try
    });

    const res = await req.json();
    console.log(JSON.stringify(res, null, 2));
}

checkRpc();
