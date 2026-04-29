const form = document.getElementById('resultForm');

form.addEventListener('submit', function (e) {
  e.preventDefault(); // stops page reload

  const roll   = document.getElementById('roll').value.trim();
  const school = document.getElementById('school').value.trim();
  const admit  = document.getElementById('admit').value.trim();

  if (!roll || !school || !admit) {
    alert('Please fill all fields as given on your admit card.');
    return;
  }

  // temporary test
  alert("Form is working 🚀");
});
