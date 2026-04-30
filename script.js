import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// 🔑 Supabase connection
const supabase = createClient(
  'https://lfdtxuzewghjyxyrhdua.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmZHR4dXpld2doanl4eXJoZHVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzI0MDksImV4cCI6MjA5MzA0ODQwOX0.DdOqAgfwhcQJka0P-HVYx9QeAp0eOAXBYqvMZj5Ms7I' // ← keep your anon key here
)

// 🎯 Elements
const form = document.getElementById('resultForm');

// Log the form submission to Supabase alongside the inline UI handler in
// index.html. We intentionally do NOT preventDefault / toggle any UI here —
// that's owned by the inline script. This listener only records the attempt.
form.addEventListener('submit', async function () {
  const roll   = document.getElementById('roll').value.trim();
  const school = document.getElementById('school').value.trim();
  const admit  = document.getElementById('admit').value.trim();
  const dob    = document.getElementById('dob').value; // ISO yyyy-mm-dd from <input type="date">

  if (!roll || !school || !admit || !dob) return;

  const { data, error } = await supabase
    .from('results')
    .insert([{ roll, school, admit, dob }]);

  if (error) {
    console.error('[supabase] insert failed:', error);
  } else {
    console.log('[supabase] insert ok:', data);
  }
});
