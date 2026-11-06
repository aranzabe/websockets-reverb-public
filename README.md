# WebSockets con Laravel Reverb: canales públicos

Este ejemplo muestra un chat sencillo en tiempo real con Laravel, Laravel Reverb,
un canal público y un cliente HTML independiente.

> Los comandos de Laravel deben ejecutarse desde la raíz del proyecto, es decir,
> desde la carpeta que contiene `artisan`. Para servir el cliente, usa siempre
> la carpeta `Cliente` de este proyecto.

## 📖 1. Conceptos Previos

### 🔹 ¿Qué es Reverb?

Reverb es el **servidor de WebSockets oficial de Laravel**, que permite comunicación en tiempo real sin depender de servicios externos como Pusher o Ably.

### 🔹 ¿Qué es Broadcasting?

“Broadcasting” significa **difundir eventos desde el backend hacia los clientes** (por WebSocket).

Laravel puede emitir eventos cuando ocurre algo, y los navegadores que estén escuchando los recibirán automáticamente.

### 🔹 Tipos de canales

Laravel tiene tres tipos de canales:

| Tipo | Acceso | Ejemplo |
| --- | --- | --- |
| **Public** | Cualquiera puede suscribirse | `Channel('chat')` |
| **Private** | Solo usuarios autenticados | `PrivateChannel('orders.1')` |
| **Presence** | Como los privados, pero además muestra quién está conectado | `PresenceChannel('chat')` |

En este ejemplo usaremos **solo canales públicos**, porque no requieren autenticación ni configuración extra.

---

## ⚙️ 2. Instalación de Laravel y Reverb

### 2.1 Crear el proyecto

```bash
composer create-project laravel/laravel chat-reverb
```

### 2.2 Instalar Reverb (si no viene activado)

```bash
composer require laravel/reverb
php artisan install:broadcasting
```

Cuando pregunte el driver, elige **Reverb:**

![image.png](9.-%20Websockets-reverb-publicos/image.png)

Instalamos las dependencias:

![image.png](9.-%20Websockets-reverb-publicos/image%201.png)

Esto configura automáticamente:

- `.env`
- `config/broadcasting.php`
- Crea el servidor Reverb listo para usarse.

---

## 🧾 3. Configuración básica

### 3.1 Archivo `.env`

Comprueba que tienes esta configuración:

```bash
APP_NAME=Laravel
APP_ENV=local
APP_KEY=base64:xxxxxxxxxxxxxxxxxxxxxxxxxx
APP_DEBUG=true
APP_URL=http://127.0.0.1:8000

BROADCAST_CONNECTION=reverb

# QUEUE_CONNECTION=database
QUEUE_CONNECTION=sync

REVERB_HOST=localhost
REVERB_PORT=8080
REVERB_SCHEME=http
REVERB_APP_ID=tu-id-local
REVERB_APP_KEY=tu-clave-local
REVERB_APP_SECRET=tu-secreto-local
REVERB_APP_CLUSTER=mt1

VITE_REVERB_APP_KEY="${REVERB_APP_KEY}"
VITE_REVERB_HOST="${REVERB_HOST}"
VITE_REVERB_PORT="${REVERB_PORT}"
VITE_REVERB_SCHEME="${REVERB_SCHEME}"

```

🔍 **Qué significa cada variable:**

| Variable | Explicación |
| --- | --- |
| `BROADCAST_CONNECTION` | Define que usamos Reverb como sistema de broadcasting |
| `REVERB_HOST` | Dirección IP donde se ejecuta Reverb |
| `REVERB_PORT` | Puerto TCP del servidor WebSocket |
| `REVERB_APP_KEY` | Identificador público de la aplicación |
| `REVERB_APP_SECRET` | Secreto interno usado para autenticación (no se usa en canales públicos) |
| `VITE_...` | Copias para que el front-end pueda leer la configuración |
| `QUEUE_CONNECTION=sync` | Procesa el evento inmediatamente dentro de la petición. No necesita `queue:work`. |

### `sync` frente a una cola

En este ejemplo se usa:

```env
QUEUE_CONNECTION=sync
```

Así, los eventos `ShouldBroadcast` se procesan inmediatamente. Es una opción
práctica para una demostración, pero la petición HTTP espera a que se procese
el evento.

En una aplicación real se suele usar una cola, por ejemplo:

```env
QUEUE_CONNECTION=database
```

En ese caso hay que ejecutar, en otra terminal:

```bash
php artisan queue:work
```

Si se cambia el `.env`, se puede forzar la lectura de la nueva configuración
con:

```bash
php artisan config:clear
```

---

## ⚙️ 4. Configuración de broadcasting

Abre `config/broadcasting.php` y asegúrate de tener esto:

```php
'default' => env('BROADCAST_CONNECTION', 'null'),

'connections' => [
    'reverb' => [
            'driver' => 'reverb',
            'key' => env('REVERB_APP_KEY'),
            'secret' => env('REVERB_APP_SECRET'),
            'app_id' => env('REVERB_APP_ID'),
            'options' => [
                'host' => env('REVERB_HOST', '127.0.0.1'),
                'port' => env('REVERB_PORT', 8080),
                'scheme' => env('REVERB_SCHEME', 'http'),
                'useTLS' => false,
                'encrypted' => false,
            ],
            // 'options' => [
            //     'host' => env('REVERB_HOST'),
            //     'port' => env('REVERB_PORT', 443),
            //     'scheme' => env('REVERB_SCHEME', 'https'),
            //     'useTLS' => env('REVERB_SCHEME', 'https') === 'https',
            // ],
            'client_options' => [
                // Guzzle client options: https://docs.guzzlephp.org/en/stable/request-options.html
            ],
        ],
],
```

👉 Reverb utiliza el protocolo compatible con Pusher para que el cliente
JavaScript pueda conectarse, pero no necesitas una cuenta ni un servidor externo
de Pusher. En Laravel el driver configurado es `reverb`.

---

## 💥 5. Crear el evento que se emitirá

Ejecuta en consola:

```bash
php artisan make:event MessageSent
```

Esto crea `app/Events/MessageSent.php`.

Ábrelo y reemplázalo por este código:

```php
<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageSent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $message;

    public function __construct($message)
    {
        $this->message = $message;
    }

    // Canal público "chat"
    public function broadcastOn(): Channel
    {
        return new Channel('chat');
    }

    // Nombre del evento en el cliente
    public function broadcastAs(): string
    {
        return 'message.sent';
    }

    // Datos que se envían al cliente
    public function broadcastWith(): array
    {
        return [
            'message' => $this->message,
        ];
    }
}

```

### 🧩 Explicación:

- `ShouldBroadcast`: le dice a Laravel que este evento debe enviarse a través de Reverb.
- `broadcastOn()`: indica el canal público.
- `broadcastAs()`: nombre del evento que se escuchará en el frontend.
- `broadcastWith()`: datos enviados (en formato JSON) a los clientes.

---

## 💬 6. Controlador para enviar los mensajes

Creamos un controlador para manejar el envío:

```bash
php artisan make:controller ChatController
```

Código del controlador (`app/Http/Controllers/ChatController.php`):

```php
<?php

namespace App\Http\Controllers;

use App\Events\MessageSent;
use Illuminate\Http\Request;

class ChatController extends Controller
{
    public function send(Request $request)
    {
        $msg = $request->input('message');

        // Emitimos el evento
        event(new MessageSent($msg));

        // Devolvemos confirmación
        return response()->json(['status' => 'ok']);
    }
}
```

Y en `routes/api.php` añadimos la ruta:

```php
use App\Http\Controllers\ChatController;

Route::post('/chat/send', [ChatController::class, 'send']);
```

---

## 🧠 7. Cómo funciona internamente

1. El cliente (HTML) envía un `fetch` POST a `/api/chat/send`.
2. Laravel recibe la petición y dispara `event(new MessageSent($msg))`.
3. Como `MessageSent` implementa `ShouldBroadcast`, Laravel lo envía al servidor **Reverb**.
4. Reverb reenvía el evento a todos los navegadores conectados al canal `chat`.
5. En el navegador, el código JS escucha ese canal y muestra el mensaje en pantalla.

---

## 💻 8. Cliente HTML (chat web)

Crea un archivo fuera de Laravel (por ejemplo en `Cliente/index.html`) y ejecuta
el servidor desde la raíz del proyecto:

```bash
php -S 127.0.0.1:9090 -t Cliente
```

Contenido de `index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Reverb Chat</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="container">
  <h1 class="mt-2">Reverb Chat</h1>

  <p>
    Server Status:
    <span id="lblOn" class="text-success">Online</span>
    <span id="lblOff" class="text-danger">Offline</span>
  </p>

  <!-- Mensaje público -->
  <div class="row mb-2">
    <div class="col">
      <h4>Mensaje público</h4>
      <input type="text" id="txtMensaje" class="form-control" placeholder="Escribe tu mensaje">
      <button id="btnEnviar" class="btn btn-primary mt-2">Enviar</button>
    </div>
  </div>

  <!-- Listas -->
  <ul id="messages" class="list-group mt-3"></ul>

  <!-- Pusher JS -->
  <script src="https://js.pusher.com/8.0/pusher.min.js"></script>
  <script src="./js/reverb-client.js"></script>
</body>
</html>
```

Contenido de `reverb-client.js`

```jsx
const lblOn      = document.querySelector('#lblOn');
const lblOff     = document.querySelector('#lblOff');
const txtMensaje = document.querySelector('#txtMensaje');
const btnEnviar  = document.querySelector('#btnEnviar');
const ulMessages = document.querySelector('#messages');

// Configuración Pusher para Reverb
// Debe coincidir con REVERB_APP_KEY del archivo .env.
const pusher = new Pusher('tu-clave-local', {
    wsHost: '127.0.0.1',
    wsPort: 8080,
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

// El cliente empieza desconectado hasta recibir el evento "connected".
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
    const li = document.createElement('li');
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
        //user_id: '1A',
        timestamp: new Date().toISOString(),
    };

    fetch('http://127.0.0.1:8000/api/chat/send', {
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

```

🔍 Explicación del cliente

| Línea | Qué hace |
| --- | --- |
| `new Pusher(...)` | Crea la conexión WebSocket con Reverb |
| `subscribe('chat')` | Se une al canal público |
| `bind('message.sent')` | Escucha el evento emitido por Laravel |
| `fetch('/api/chat/send')` | Envía un nuevo mensaje al servidor |

---

## 🧱 9. CORS (si el cliente está en otro puerto)

El cliente y Laravel se sirven en puertos distintos, por lo que el navegador
los considera orígenes diferentes. La petición `fetch` al endpoint de la API
debe estar permitida por CORS.

En las versiones actuales de Laravel, publica la configuración con:

```bash
php artisan config:publish cors
```

Después, en `config/cors.php`, indica el origen o los orígenes de los clientes:

```php
'paths' => ['api/*'],
'allowed_methods' => ['*'],
'allowed_origins' => [
    'http://127.0.0.1:9090',
    'http://127.0.0.1:9091',
    'http://127.0.0.1:9092',
],
'allowed_headers' => ['*'],
```

`127.0.0.1` y `localhost` no son el mismo origen. Si se cambia esta
configuración, ejecuta `php artisan config:clear`.

---

## 🚀 10. Arranque de servidores

Abre tres terminales. Si usas `QUEUE_CONNECTION=database`, necesitarás una
cuarta para el worker de cola:

1️⃣ Servidor Laravel

```bash
php artisan serve
```

2️⃣ Servidor Reverb

```bash
php artisan reverb:start
```

3️⃣ Cliente HTML

```bash
php -S 127.0.0.1:9090 -t Cliente
```

Para probar dos clientes simultáneamente, usa dos terminales adicionales:

```bash
php -S 127.0.0.1:9091 -t Cliente
```

```bash
php -S 127.0.0.1:9092 -t Cliente
```

Es importante que `-t Cliente` apunte a la carpeta `Cliente` de este proyecto.
Si se inicia el servidor desde otra carpeta, el navegador puede cargar una
copia antigua del cliente y utilizar una clave de Reverb incorrecta.

Si se usa `QUEUE_CONNECTION=database`, inicia además:

```bash
php artisan queue:work
```

---

## 🧩 11. Prueba final

- Abre `http://127.0.0.1:9091` y `http://127.0.0.1:9092` en dos ventanas.
- Escribe un mensaje en uno y observa cómo **aparece instantáneamente en ambos**.
- El indicador debe mostrar `Online` cuando el navegador reciba el evento
  `connected` de Reverb.

---

## ⚠️ 12. Errores comunes

| Problema | Solución |
| --- | --- |
| ❌ No se conecta a WebSocket | Verifica `REVERB_PORT` y `wsHost` en el cliente |
| ❌ No se emiten mensajes | Asegúrate de ejecutar `php artisan reverb:start` |
| ❌ Error CORS | Revisa `config/cors.php` y el origen exacto del cliente |
| ❌ 404 en `/api/chat/send` | La ruta no está en `routes/api.php` |
| ❌ La petición responde `ok`, pero no llega el mensaje | Con `QUEUE_CONNECTION=database`, ejecuta `php artisan queue:work` |
| ❌ Un cliente no se pone en línea y otro sí | Comprueba que ambos servidores sirven la carpeta correcta con `-t Cliente` |

### Diagnóstico rápido

1. En la consola del navegador debe aparecer `Conectado correctamente a Reverb`.
2. En la pestaña **Network** debe existir una conexión WebSocket a
   `ws://127.0.0.1:8080/app/<REVERB_APP_KEY>`.
3. Reverb debe estar escuchando en el puerto `8080`.
4. El archivo servido por el cliente debe contener la misma clave que
   `REVERB_APP_KEY` en `.env`.

Por ejemplo:

```bash
curl http://127.0.0.1:9091/js/reverb-client.js
```

No se debe probar el WebSocket con una petición HTTP normal a `/app/...`; una
conexión WebSocket necesita la negociación `Upgrade` que realiza el navegador.
