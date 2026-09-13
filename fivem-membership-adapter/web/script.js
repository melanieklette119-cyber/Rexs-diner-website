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
        if (data.url) {
            const iframe = panel.querySelector('iframe');
            if (iframe) iframe.src = data.url;
        }
        panel.classList.add('visible');
        return;
    }

    panel.classList.remove('visible');
});

document.onkeyup = function (data) {
    if (data.which == 27) {
        setTimeout(closeNui, 150);
    }
};

const closeButton = document.getElementById('closeTablet');
if (closeButton) {
    closeButton.addEventListener('click', closeNui);
}
