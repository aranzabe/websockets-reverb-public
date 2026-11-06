// === Referencias DOM ===
const lblOn      = document.querySelector('#lblOn');
const lblOff     = document.querySelector('#lblOff');
const txtMensaje = document.querySelector('#txtMensaje');
const btnEnviar  = document.querySelector('#btnEnviar');
const ulMessages = document.querySelector('#messages');

// === Parámetros de conexión ===
const wsHost = '127.0.0.1';
const wsPort = '8080';
const apiPort = '8000';

const userId = crypto.randomUUID();  // Generamos un ID de usuario único para esta sesión

// Configuración Pusher para Reverb
const pusher = new Pusher('wcx1ovp8nygqv3gxm0c3', {
    wsHost: wsHost,
    wsPort: wsPort,
    forceTLS: false,
    enabledTransports: ['ws'],
    cluster: 'mt1',
    disableStats: true,  // Evita llamadas externas
    enabled: true
    // Evitamos reconexión automática infinita
    //reconnectAttempts: 0,
    //reconnectDelay: 0,
});

// Canal público
const channel = pusher.subscribe('chat');

// ======== Estado Online / Offline ========
function setOnline() {
    lblOn.style.display = '';
    lblOff.style.display = 'none';
}

function setOffline() {
    lblOn.style.display = 'none';
    lblOff.style.display = '';
}

setOffline();

// ======== Eventos globales de conexión ========
pusher.connection.bind('connected', () => {
    //console.log('Conectado a Reverb');
    console.info('✅ Conectado correctamente a Reverb');
    setOnline();
});


pusher.connection.bind('error', (err) => {
    if (err?.data?.code === 1006) {
        console.warn('⚠️ Conexión perdida con Reverb');
    } else {
        console.error('⚠️ Error WebSocket:', err);
    }
    setOffline();
});

// ======== Recepción de mensajes en tiempo real ========
channel.bind('message.sent', (data) => {
    console.log('Mensaje recibido desde servidor:', data.message);
    console.log('ID de usuario:', data.user_id);
    console.log('Marca de tiempo:', data.timestamp);
    const li = document.createElement('li');
    // Agregamos el mensaje a la lista
    //li.textContent = data.message + ' (ID: ' + data.user_id + ', Timestamp: ' + data.timestamp + ')';
    li.textContent = data.message;

    li.classList.add('list-group-item');
    ulMessages.appendChild(li);
});

// ======== Enviar mensaje al backend ========
btnEnviar.addEventListener('click', () => {
    const mensaje = txtMensaje.value.trim();
    if (!mensaje) return;

    const payload = {
        message: mensaje,
        //user_id: userId,
        //timestamp: new Date().toISOString(),
    };

    // Usamos wsHost para construir la URL dinámicamente
    const url = `http://${wsHost}:${apiPort}/api/chat/send`;

    fetch(url, {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
    })
    .then(res => res.json())
    .then(resp => {
        console.log('Confirmación del servidor:', resp);
        txtMensaje.value = '';
    })
    .catch(err => console.error('Error al enviar:', err));
});





