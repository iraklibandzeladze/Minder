<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Note extends Model
{
    protected $fillable = [
        'user_id',
        'title',
        'check_mode',
        'position',
        'password_hash',
    ];

    protected $hidden = [
        'password_hash',
    ];

    protected function casts(): array
    {
        return [
            'position' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(NoteItem::class)->orderBy('position')->orderBy('id');
    }

    public function shares(): MorphMany
    {
        return $this->morphMany(ResourceShare::class, 'shareable');
    }
}
