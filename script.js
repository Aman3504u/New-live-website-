const form = document.getElementById('resultForm');

form.addEventListener('submit', function (e) {
  e.preventDefault();

  const roll   = document.getElementById('roll').value.trim();
  const school = document.getElementById('school').value.trim();
  const admit  = document.getElementById('admit').value.trim();

  if (!roll || !school || !admit) {
    alert('Please fill all fields as given on your admit card.');
    return;
  }

  document.getElementById('result').innerText = "Form submitted successfully!";
});
