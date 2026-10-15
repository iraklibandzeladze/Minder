<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NoteItem extends Model
{
    protected $fillable = [
        'user_id',
        'note_id',
        'body',
        'amount',
        'checked',
        'position',
    ];

    protected function casts(): array
    {
        return [
            'checked' => 'boolean',
            'position' => 'integer',
            'amount' => 'decimal:2',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function note(): BelongsTo
    {
        return $this->belongsTo(Note::class);
    }
}
