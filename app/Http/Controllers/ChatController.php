<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Events\MessageSent;

class ChatController extends Controller
{
    public function send(Request $request)
    {
        $msg = $request->input('message'); // <-- recoge el input

        // Emitimos el evento
        event(new MessageSent($msg)); // <-- lo reenvía a los oyentes.

        // Devolvemos confirmación
        return response()->json(['status' => 'ok']);
    }
}
