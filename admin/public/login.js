document.getElementById('loginForm').addEventListener('submit', async event => {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button');
  const status = document.getElementById('status');
  button.disabled = true; status.textContent = '로그인 중…';
  try {
    const response = await fetch('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: document.getElementById('username').value.trim(), password: document.getElementById('password').value }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || '로그인하지 못했어요.');
    location.replace('/');
  } catch (error) { status.textContent = error.message; } finally { button.disabled = false; }
});
