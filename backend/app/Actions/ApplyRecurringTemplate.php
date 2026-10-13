<?php

namespace App\Actions;

use App\Models\RecurringTemplate;
use App\Models\Transaction;
use App\Models\User;
use Carbon\Carbon;

class ApplyRecurringTemplate
{
    public function handle(User $user, RecurringTemplate $template, string $yearMonth): Transaction
    {
        $occurredOn = Carbon::createFromFormat('Y-m-d', $yearMonth.'-01')->toDateString();
        $already = Transaction::query()
            ->where('user_id', $user->id)
            ->where('template_id', $template->id)
            ->where('year_month', $yearMonth)
            ->exists();

        $amount = (string) $template->amount;
        $status = $template->default_status ?: 'pending';
        $paid = $status === 'paid' ? $amount : '0.00';

        return Transaction::query()->create([
            'user_id' => $user->id,
            'sheet_id' => $user->sheets()->where('kind', 'ledger')->value('id'),
            'account_id' => $template->account_id,
            'category_id' => $template->category_id,
            'template_id' => $already ? null : $template->id,
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
    }
}
