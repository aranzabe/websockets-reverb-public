<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\ChatController;

Route::post('/chat/send', [ChatController::class, 'send']);
