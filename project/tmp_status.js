import fs from 'fs';
const env = fs.readFileSync('.env', 'utf-8');
const urlMatches = env.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatches = env.match(/VITE_SUPABASE_SERVICE_ROLE_KEY=(.*)/);

const url = urlMatches[1].trim();
const key = keyMatches[1].trim();

async function run() {
    const req1 = await fetch(`${url}/rest/v1/user_profiles?email=eq.chieko3998@uorak.com&select=id`, {
        headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    const up = await req1.json();
    const id = up[0].id;

    const req2 = await fetch(`${url}/rest/v1/scholarship_applications?student_id=eq.${id}&select=*`, {
        headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    const apps = await req2.json();
    console.log(JSON.stringify(apps, null, 2));

    // Modify to acceptance status
    if (apps.length > 0) {
        const appId = apps[0].id;
        const req3 = await fetch(`${url}/rest/v1/scholarship_applications?id=eq.${appId}`, {
            method: 'PATCH',
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                status: 'approved',
                acceptance_letter_status: 'sent',
                is_application_fee_paid: true
            })
        });
        const updated = await req3.json();
        console.log("Updated Application:", JSON.stringify(updated, null, 2));
    }
}
run();
