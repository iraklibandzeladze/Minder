<?php

namespace App\Actions;

use App\Models\Transaction;
use App\Models\User;

class CreateTransaction
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function handle(User $user, array $data): Transaction
    {
        $occurredOn = $data['occurred_on'] ?? now()->toDateString();
        $amount = number_format((float) ($data['amount'] ?? 0), 2, '.', '');
        $amountPaid = array_key_exists('amount_paid', $data)
            ? number_format((float) $data['amount_paid'], 2, '.', '')
            : null;
        $status = $data['status'] ?? null;

        if ($status && $amountPaid === null) {
            $synced = Transaction::amountsForStatus($status, $amount, '0.00');
            $amountPaid = $synced['amount_paid'];
            $status = $synced['status'];
        } else {
            $amountPaid = $amountPaid ?? '0.00';
            $status = Transaction::deriveStatus($amount, $amountPaid);
        }

        return Transaction::query()->create([
            'user_id' => $user->id,
            'sheet_id' => $data['sheet_id'] ?? $user->sheets()->where('kind', 'ledger')->value('id'),
            'account_id' => $data['account_id'] ?? null,
            'category_id' => $data['category_id'] ?? null,
            'related_account_id' => $data['related_account_id'] ?? null,
            'template_id' => $data['template_id'] ?? null,
            'type' => $data['type'] ?? 'expense',
            'amount' => $amount,
            'amount_paid' => $amountPaid,
            'currency' => $data['currency'] ?? 'GEL',
            'status' => $status,
            'occurred_on' => $occurredOn,
            'year_month' => Transaction::yearMonthFromDate($occurredOn),
            'title' => $data['title'] ?? 'Untitled',
            'notes' => $data['notes'] ?? null,
            'custom_fields' => $data['custom_fields'] ?? [],
        ]);
    }
}
