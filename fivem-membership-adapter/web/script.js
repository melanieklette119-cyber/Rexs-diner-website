const closeNui = () => {
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

    if (data.action === 'open' || data.action === 'openExternal') {
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