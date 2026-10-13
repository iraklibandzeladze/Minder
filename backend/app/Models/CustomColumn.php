<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomColumn extends Model
{
    protected $fillable = [
        'user_id',
        'sheet_id',
            'name',
            'slug',
            'type',
            'options',
            'formula',
            'role',
            'summable',
            'position',
    ];

    protected function casts(): array
    {
        return [
            'options' => 'array',
            'summable' => 'boolean',
            'position' => 'integer',
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
