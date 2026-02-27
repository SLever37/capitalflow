import fs from 'fs';

async function run() {
  const url = 'https://hzchchbxkhryextaymkn.supabase.co/rest/v1/?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6Y2hjaGJ4a2hyeWV4dGF5bWtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NTk2ODcsImV4cCI6MjA4MzMzNTY4N30.kX6FlTuPkl7XfycwVuZN2mI6e3ed8NaDUoyAHy9L3nc';
  const res = await fetch(url);
  const json = await res.json();
  
  const rpc = json.paths['/rpc/process_payment_atomic'];
  console.log(JSON.stringify(rpc, null, 2));
}

run();
