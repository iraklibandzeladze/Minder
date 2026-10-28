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
        'folder_id',
        'is_pinned',
        'title',
        'type',
        'content',
        'check_mode',
        'priced',
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
            'folder_id' => 'integer',
            'is_pinned' => 'boolean',
            'priced' => 'boolean',
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
