fetch('/auth/session').then(response => response.json()).then(session => {
  if (!session.authenticated) return;
  const button = document.createElement('button');
  button.type = 'button'; button.textContent = '로그아웃';
  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      const response = await fetch('/auth/logout', { method: 'POST' });
      if (!response.ok) throw new Error('로그아웃하지 못했어요. 다시 시도해주세요.');
      location.replace('/login');
    } catch (error) { alert(error.message); button.disabled = false; }
  });
  document.querySelector('.deploy-bar').append(button);
}).catch(() => {});
