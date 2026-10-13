<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Transaction extends Model
{
    protected $fillable = [
        'user_id',
        'sheet_id',
        'account_id',
        'category_id',
        'related_account_id',
        'template_id',
        'type',
        'amount',
        'amount_paid',
        'currency',
        'status',
        'occurred_on',
        'year_month',
        'title',
        'notes',
        'custom_fields',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'amount_paid' => 'decimal:2',
            'occurred_on' => 'date',
            'custom_fields' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function relatedAccount(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'related_account_id');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(RecurringTemplate::class, 'template_id');
    }

    public function sheet(): BelongsTo
    {
        return $this->belongsTo(Sheet::class);
    }

    public static function yearMonthFromDate(string $date): string
    {
        return substr($date, 0, 7);
    }

    public static function deriveStatus(string $amount, string $amountPaid): string
    {
        if (bccomp($amountPaid, '0', 2) === 0) {
            return 'pending';
        }

        if (bccomp($amountPaid, $amount, 2) >= 0) {
            return 'paid';
        }

        return 'partial';
    }

    public static function amountsForStatus(string $status, string $amount, string $currentPaid): array
    {
        return match ($status) {
            'paid' => ['amount_paid' => $amount, 'status' => 'paid'],
            'pending' => ['amount_paid' => '0.00', 'status' => 'pending'],
            'partial' => [
                'amount_paid' => bccomp($currentPaid, '0', 2) === 0 || bccomp($currentPaid, $amount, 2) >= 0
                    ? bcdiv($amount, '2', 2)
                    : $currentPaid,
                'status' => 'partial',
            ],
            default => ['amount_paid' => $currentPaid, 'status' => self::deriveStatus($amount, $currentPaid)],
        };
    }
}
