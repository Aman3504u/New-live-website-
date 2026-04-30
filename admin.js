import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// Same project as script.js. The anon key is fine to expose publicly —
// real access control is enforced by RLS + Supabase Auth.
const SUPABASE_URL = 'https://lfdtxuzewghjyxyrhdua.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmZHR4dXpld2doanl4eXJoZHVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzI0MDksImV4cCI6MjA5MzA0ODQwOX0.DdOqAgfwhcQJka0P-HVYx9QeAp0eOAXBYqvMZj5Ms7I';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---- DOM ---------------------------------------------------------------
const loginView   = document.getElementById('loginView');
const resultsView = document.getElementById('resultsView');
const loginForm   = document.getElementById('loginForm');
const loginBtn    = document.getElementById('loginBtn');
const loginErr    = document.getElementById('loginErr');
const whoBox      = document.getElementById('whoBox');
const whoText     = document.getElementById('whoText');
const logoutBtn   = document.getElementById('logoutBtn');
const refreshBtn  = document.getElementById('refreshBtn');
const searchInput = document.getElementById('searchInput');
const tableSelect = document.getElementById('tableSelect');
const countText   = document.getElementById('countText');
const errBanner   = document.getElementById('errBanner');
const rowsHead    = document.getElementById('rowsHead');
const rowsBody    = document.getElementById('rowsBody');

// ---- Table config ------------------------------------------------------
// Each entry describes one Supabase table the admin can browse.
const TABLES = {
  results: {
    label:           'CBSE results',
    preferredCols:   ['id', 'created_at', 'roll', 'school', 'admit', 'dob'],
    searchHint:      'Filter in page (roll / school / admit / dob)…',
  },
  feedbacks: {
    label:           'Peace Ghost feedbacks',
    preferredCols:   ['id', 'created_at', 'name', 'feedback'],
    searchHint:      'Filter in page (name / feedback)…',
  },
};

// ---- State -------------------------------------------------------------
let allRows = [];
let filterText = '';
let currentTable =
  (tableSelect && TABLES[tableSelect.value]) ? tableSelect.value : 'results';

// ---- View toggling -----------------------------------------------------
function showLoggedOut() {
  loginView.classList.remove('hidden');
  resultsView.classList.add('hidden');
  whoBox.classList.add('hidden');
  whoText.textContent = '';
  loginErr.textContent = '';
  allRows = [];
  renderRows();
}

function showLoggedIn(user) {
  loginView.classList.add('hidden');
  resultsView.classList.remove('hidden');
  whoBox.classList.remove('hidden');
  whoText.textContent = user?.email ? `Signed in as ${user.email}` : 'Signed in';
}

// ---- Auth --------------------------------------------------------------
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginErr.textContent = '';
  loginBtn.disabled = true;
  try {
    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      loginErr.textContent = error.message || 'Sign-in failed.';
    }
    // onAuthStateChange will swap the view on success.
  } catch (err) {
    loginErr.textContent = String(err?.message || err);
  } finally {
    loginBtn.disabled = false;
  }
});

logoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
});

// supabase-js v2 fires an INITIAL_SESSION event on subscription, so this
// one listener handles both the first page load (stored session or not)
// and later sign-in/sign-out transitions — no separate getSession() call
// needed, which would otherwise trigger a duplicate loadRows() on reload.
supabase.auth.onAuthStateChange((_event, session) => {
  if (session?.user) {
    showLoggedIn(session.user);
    loadRows();
  } else {
    showLoggedOut();
  }
});

// ---- Data load ---------------------------------------------------------
async function loadRows() {
  errBanner.classList.add('hidden');
  errBanner.textContent = '';
  countText.textContent = 'Loading…';

  const table = currentTable;

  // Try to order by created_at if the column exists. If not, fall back
  // to an unordered select.
  let resp = await supabase
    .from(table)
    .select('*')
    .order('created_at', { ascending: false });

  if (resp.error && /created_at/i.test(resp.error.message || '')) {
    resp = await supabase.from(table).select('*');
  }

  if (resp.error) {
    allRows = [];
    countText.textContent = '—';
    errBanner.classList.remove('hidden');
    errBanner.textContent =
      `Failed to load rows from "${table}": ${resp.error.message}\n\n` +
      `If this says "permission denied", add a SELECT policy for the ` +
      `"authenticated" role on public.${table} in the Supabase dashboard. ` +
      `If it says the table doesn't exist, run the table-creation SQL ` +
      `from the README.`;
    renderRows();
    return;
  }

  allRows = Array.isArray(resp.data) ? resp.data : [];
  renderRows();
}

refreshBtn.addEventListener('click', loadRows);

searchInput.addEventListener('input', (e) => {
  filterText = e.target.value.trim().toLowerCase();
  renderRows();
});

if (tableSelect) {
  tableSelect.addEventListener('change', (e) => {
    const next = e.target.value;
    if (!TABLES[next]) return;
    currentTable = next;
    searchInput.placeholder = TABLES[next].searchHint;
    // Reset filter text so a roll-number filter doesn't carry over to
    // a feedbacks search and confuse the user.
    filterText = '';
    searchInput.value = '';
    loadRows();
  });
}

// Initialise the search hint to whatever table is selected on load.
if (tableSelect && TABLES[currentTable]) {
  searchInput.placeholder = TABLES[currentTable].searchHint;
}

// ---- Render ------------------------------------------------------------
function renderRows() {
  // Figure out columns from the first row, with a nice default order if
  // common columns are present.
  const preferred = TABLES[currentTable]?.preferredCols ?? ['id', 'created_at'];
  const seen = new Set();
  const cols = [];
  for (const name of preferred) {
    if (allRows.length && Object.prototype.hasOwnProperty.call(allRows[0], name)) {
      cols.push(name);
      seen.add(name);
    }
  }
  if (allRows.length) {
    for (const name of Object.keys(allRows[0])) {
      if (!seen.has(name)) cols.push(name);
    }
  }

  // Header
  rowsHead.innerHTML = '';
  if (cols.length) {
    const tr = document.createElement('tr');
    for (const name of cols) {
      const th = document.createElement('th');
      th.textContent = name;
      tr.appendChild(th);
    }
    rowsHead.appendChild(tr);
  }

  // Filtered body
  const filtered = filterText
    ? allRows.filter((row) =>
        cols.some((c) => String(row[c] ?? '').toLowerCase().includes(filterText))
      )
    : allRows;

  rowsBody.innerHTML = '';
  if (!filtered.length) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = Math.max(cols.length, 1);
    td.className = 'empty';
    td.textContent = allRows.length
      ? 'No rows match the filter.'
      : 'No submissions yet.';
    tr.appendChild(td);
    rowsBody.appendChild(tr);
  } else {
    for (const row of filtered) {
      const tr = document.createElement('tr');
      for (const c of cols) {
        const td = document.createElement('td');
        const val = row[c];
        if (c === 'created_at' && val) {
          const d = new Date(val);
          td.textContent = isNaN(d.getTime()) ? String(val) : d.toLocaleString();
        } else if (c === 'dob' && val) {
          // Postgres `date` comes back as "yyyy-mm-dd"; parse as local to
          // avoid timezone shifting it a day earlier/later.
          const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(val));
          if (m) {
            const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
            td.textContent = d.toLocaleDateString();
          } else {
            td.textContent = String(val);
          }
        } else if (val === null || val === undefined) {
          td.textContent = '';
        } else if (typeof val === 'object') {
          td.textContent = JSON.stringify(val);
        } else {
          td.textContent = String(val);
        }
        tr.appendChild(td);
      }
      rowsBody.appendChild(tr);
    }
  }

  countText.textContent =
    allRows.length === 0
      ? '0 rows'
      : filterText
        ? `${filtered.length} of ${allRows.length} rows`
        : `${allRows.length} row${allRows.length === 1 ? '' : 's'}`;
}
