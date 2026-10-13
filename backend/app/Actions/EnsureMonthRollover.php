<?php

namespace App\Actions;

use App\Models\Transaction;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class EnsureMonthRollover
{
    public function handle(User $user, string $yearMonth): int
    {
        if (! preg_match('/^\d{4}-\d{2}$/', $yearMonth)) {
            return 0;
        }

        $occurredOn = Carbon::createFromFormat('Y-m-d', $yearMonth.'-01')->toDateString();
        $created = 0;

        DB::transaction(function () use ($user, $yearMonth, $occurredOn, &$created) {
            $templates = $user->recurringTemplates()->where('is_active', true)->get();

            foreach ($templates as $template) {
                $exists = Transaction::query()
                    ->where('user_id', $user->id)
                    ->where('template_id', $template->id)
                    ->where('year_month', $yearMonth)
                    ->exists();

                if ($exists) {
                    continue;
                }

                $amount = (string) $template->amount;
                $status = $template->default_status ?: 'pending';
                $paid = $status === 'paid' ? $amount : '0.00';

                Transaction::query()->create([
                    'user_id' => $user->id,
                    'sheet_id' => $user->sheets()->where('kind', 'ledger')->value('id'),
                    'account_id' => $template->account_id,
                    'category_id' => $template->category_id,
                    'template_id' => $template->id,
                    'type' => $template->type,
                    'amount' => $amount,
                    'amount_paid' => $paid,
                    'currency' => $template->currency,
                    'status' => Transaction::deriveStatus($amount, $paid),
                    'occurred_on' => $occurredOn,
                    'year_month' => $yearMonth,
                    'title' => $template->label,
                    'notes' => null,
                    'custom_fields' => [],
                ]);

                $created++;
            }
        });

        return $created;
    }
}
