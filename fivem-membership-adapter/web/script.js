const panel = document.getElementById('googledocs');
const lockScreen = document.getElementById('lockScreen');
const statusScreen = document.getElementById('statusScreen');
const statusIcon = document.getElementById('statusIcon');
const statusTitle = document.getElementById('statusTitle');
const statusCopy = document.getElementById('statusCopy');
const statusEyebrow = document.getElementById('statusEyebrow');
const progressBar = document.getElementById('progressBar');
const oauthButton = document.getElementById('oauthButton');
const swipeTrack = document.getElementById('swipeTrack');
const swipeThumb = document.getElementById('swipeThumb');
let authUrl = null;
let swipeStartY = null;
let swipeUnlocked = false;

const resetTablet = () => {
    lockScreen?.classList.remove('hidden');
    statusScreen?.classList.add('hidden');
    oauthButton?.classList.add('hidden');
    progressBar?.classList.remove('hidden');
    swipeUnlocked = false;
    authUrl = null;
    if (swipeThumb) swipeThumb.style.transform = '';
};

const showStatus = (title, copy, type = 'loading') => {
    statusScreen?.classList.remove('hidden');
    lockScreen?.classList.add('hidden');
    statusTitle.textContent = title;
    statusCopy.textContent = copy;
    statusIcon.textContent = type === 'success' ? '✓' : type === 'error' ? '!' : '◌';
    statusIcon.style.color = type === 'success' ? '#3ddc97' : type === 'error' ? '#f07865' : '#e2a34d';
    statusEyebrow.textContent = type === 'success' ? 'REX CONNECT VERIFIED' : type === 'error' ? 'REX CONNECT ERROR' : 'REX CONNECT';
    progressBar?.classList.toggle('hidden', type !== 'loading');
};

const closeNui = () => {
    const panel = document.getElementById('googledocs');
    panel?.classList.remove('visible');
    fetch(`https://${GetParentResourceName()}/NUIFocusOff`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify({ close: true })
    }).catch(() => {});
};

window.addEventListener('message', function(event) {
    const data = event.data || {};
    const panel = document.getElementById('googledocs');

    if (data.action === 'openExternal') {
        if (data.url && typeof window.invokeNative === 'function') {
            window.invokeNative('openUrl', data.url);
        } else if (data.url) {
            window.open(data.url, '_blank', 'noopener,noreferrer');
        }
        panel.classList.remove('visible');
        return;
    }

    if (data.action === 'open') {
        if (!panel) return;
        resetTablet();
        panel.classList.add('visible');
        return;
    }

    if (data.action === 'authenticating') {
        showStatus('Du wirst angemeldet', 'Deine Discord-Verbindung wird sicher geprüft.');
        return;
    }

    if (data.action === 'authSuccess') {
        authUrl = data.url;
        showStatus('Login erfolgreich', 'Willkommen zurück. Die Website wird geladen.', 'success');
        setTimeout(() => {
            const iframe = panel.querySelector('iframe');
            if (iframe && authUrl) iframe.src = authUrl;
            statusScreen?.classList.add('hidden');
            iframe?.style.setProperty('visibility', 'visible');
        }, 5000);
        return;
    }

    if (data.action === 'authFailed') {
        showStatus('Login fehlgeschlagen', data.message || 'Bitte autorisiere dich im Browser mit Discord.', 'error');
        authUrl = data.loginUrl || null;
        oauthButton?.classList.toggle('hidden', !authUrl);
        return;
    }

    panel.classList.remove('visible');
});

document.onkeyup = function (data) {
    if (data.which == 27) {
        setTimeout(closeNui, 150);
    }
};

const startAuthentication = () => {
    if (swipeUnlocked) return;
    swipeUnlocked = true;
    showStatus('Du wirst angemeldet', 'Deine Discord-Verbindung wird sicher geprüft.');
    fetch(`https://${GetParentResourceName()}/startAuth`, { method: 'POST', body: '{}' }).catch(() => {});
};

const handleSwipeStart = (event) => {
    swipeStartY = event.touches?.[0]?.clientY ?? event.clientY;
};

const handleSwipeEnd = (event) => {
    if (swipeStartY === null) return;
    const endY = event.changedTouches?.[0]?.clientY ?? event.clientY;
    if (swipeStartY - endY > 35) startAuthentication();
    swipeStartY = null;
};

swipeTrack?.addEventListener('touchstart', handleSwipeStart, { passive: true });
swipeTrack?.addEventListener('touchend', handleSwipeEnd, { passive: true });
swipeTrack?.addEventListener('pointerdown', (event) => { swipeStartY = event.clientY; swipeTrack.setPointerCapture?.(event.pointerId); });
swipeTrack?.addEventListener('pointerup', handleSwipeEnd);
swipeTrack?.addEventListener('click', startAuthentication);
swipeTrack?.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') startAuthentication(); });
oauthButton?.addEventListener('click', () => {
    if (authUrl) {
        if (typeof window.invokeNative === 'function') window.invokeNative('openUrl', authUrl);
        else window.open(authUrl, '_blank', 'noopener,noreferrer');
    }
});

const closeButton = document.getElementById('closeTablet');
if (closeButton) closeButton.addEventListener('click', closeNui);
