<?php

namespace App\Console\Commands;

use App\Mail\RowReminderMail;
use App\Models\SheetRow;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class SendDueReminders extends Command
{
    protected $signature = 'reminders:send';

    protected $description = 'Send emails for sheet-row reminders that are due';

    public function handle(): int
    {
        $now = now();
        $sent = 0;

        SheetRow::query()
            ->with(['user', 'sheet'])
            ->whereNotNull('reminder_at')
            ->whereNull('reminder_sent_at')
            ->where('reminder_at', '<=', $now)
            ->whereHas('sheet', fn ($q) => $q->where('reminders_enabled', true))
            ->orderBy('id')
            ->chunkById(100, function ($rows) use (&$sent) {
                foreach ($rows as $row) {
                    if ($row->sheet === null || ! $row->sheet->reminders_enabled) {
                        continue;
                    }

                    $user = $row->user;
                    if ($user === null || blank($user->email)) {
                        $row->forceFill(['reminder_sent_at' => now()])->save();
                        continue;
                    }

                    Mail::to($user->email)->send(new RowReminderMail($row));
                    $row->forceFill(['reminder_sent_at' => now()])->save();
                    $sent++;
                }
            });

        $this->info("Sent {$sent} reminder(s).");

        return self::SUCCESS;
    }
}
