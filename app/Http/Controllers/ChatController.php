<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Events\MessageSent;

class ChatController extends Controller
{
    public function send(Request $request)
    {
        $msg = $request->input('message'); // <-- recoge el input
        $user_id = $request->input('user_id'); // <-- recoge el user_id
        $timestamp = $request->input('timestamp'); // <-- recoge el timestamp

        // Emitimos el evento
        event(new MessageSent($msg, $user_id, $timestamp)); // <-- lo reenvía a los oyentes.

        // Devolvemos confirmación
        return response()->json(['status' => 'ok']);
    }
}
