<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageSent implements ShouldBroadcast
{
   use Dispatchable, InteractsWithSockets, SerializesModels;

    public $message;
    public $user_id;
    public $timestamp;

    public function __construct($message, $user_id = null, $timestamp = null)
    {
        $this->message = $message;
        $this->user_id = $user_id;
        $this->timestamp = $timestamp;
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
            //'user_id' => $this->user_id,
            //'timestamp' => $this->timestamp,
        ];
    }
}
