<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SheetRow extends Model
{
    protected $fillable = [
        'user_id',
        'sheet_id',
        'title',
        'values',
        'notes',
        'reminder_at',
        'reminder_sent_at',
        'year_month',
        'position',
    ];

    protected function casts(): array
    {
        return [
            'values' => 'array',
            'position' => 'integer',
            'reminder_at' => 'datetime',
            'reminder_sent_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function sheet(): BelongsTo
    {
        return $this->belongsTo(Sheet::class);
    }
}
