<?php

namespace App\Actions;

use App\Models\Transaction;

class UpdateTransaction
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function handle(Transaction $transaction, array $data): Transaction
    {
        if (array_key_exists('occurred_on', $data) && $data['occurred_on']) {
            $data['year_month'] = Transaction::yearMonthFromDate($data['occurred_on']);
        }

        if (array_key_exists('custom_fields', $data) && is_array($data['custom_fields'])) {
            $data['custom_fields'] = array_merge($transaction->custom_fields ?? [], $data['custom_fields']);
        }

        $amount = number_format((float) ($data['amount'] ?? $transaction->amount), 2, '.', '');
        $amountPaid = number_format((float) ($data['amount_paid'] ?? $transaction->amount_paid), 2, '.', '');

        if (array_key_exists('status', $data) && ! array_key_exists('amount_paid', $data)) {
            $synced = Transaction::amountsForStatus((string) $data['status'], $amount, (string) $transaction->amount_paid);
            $data['amount_paid'] = $synced['amount_paid'];
            $data['status'] = $synced['status'];
        } else {
            $data['amount'] = $amount;
            $data['amount_paid'] = $amountPaid;
            $data['status'] = Transaction::deriveStatus($amount, $amountPaid);
        }

        $transaction->fill($data);
        $transaction->save();

        return $transaction->refresh()->load(['account', 'category', 'relatedAccount']);
    }
}
