import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  const url = process.env.VITE_SUPABASE_URL + '/rest/v1/?apikey=' + process.env.VITE_SUPABASE_ANON_KEY;
  const res = await fetch(url);
  const json = await res.json();
  
  const rpc = json.paths['/rpc/process_payment_atomic'];
  console.log(JSON.stringify(rpc, null, 2));
}

run();
