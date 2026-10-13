<?php

use App\Console\Commands\SendDueReminders;
use Illuminate\Support\Facades\Schedule;

Schedule::command(SendDueReminders::class)->everyMinute();
