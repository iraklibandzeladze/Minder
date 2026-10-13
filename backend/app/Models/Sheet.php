<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Sheet extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'slug',
        'kind',
        'position',
        'is_default',
        'budget',
        'reminders_enabled',
        'password_hash',
    ];

    protected $hidden = [
        'password_hash',
    ];

    protected function casts(): array
    {
        return [
            'position' => 'integer',
            'is_default' => 'boolean',
            'budget' => 'decimal:2',
            'reminders_enabled' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function columns(): HasMany
    {
        return $this->hasMany(CustomColumn::class)->orderBy('position');
    }

    public function rows(): HasMany
    {
        return $this->hasMany(SheetRow::class)->orderBy('position')->orderBy('id');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }

    public function shares(): MorphMany
    {
        return $this->morphMany(ResourceShare::class, 'shareable');
    }
}
