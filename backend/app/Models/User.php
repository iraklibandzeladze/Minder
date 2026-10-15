<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    public const ROLE_USER = 'user';

    public const ROLE_ADMIN = 'admin';

    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'avatar_url',
        'password',
        'email_verified_at',
        'platform_role',
        'plan',
        'pro_requested_at',
        'pro_request_note',
        'blocked_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'pro_requested_at' => 'datetime',
            'blocked_at' => 'datetime',
        ];
    }

    public function isPro(): bool
    {
        return $this->plan === 'pro' || $this->isAdmin();
    }

    public function hasPendingProRequest(): bool
    {
        return $this->pro_requested_at !== null && ! $this->isPro();
    }

    public function isAdmin(): bool
    {
        return $this->platform_role === self::ROLE_ADMIN;
    }

    public function isBlocked(): bool
    {
        return $this->blocked_at !== null;
    }

    public function hasPassword(): bool
    {
        return $this->password !== null && $this->password !== '';
    }

    public function socialAccounts(): HasMany
    {
        return $this->hasMany(SocialAccount::class);
    }

    public function accounts(): HasMany
    {
        return $this->hasMany(Account::class);
    }

    public function categories(): HasMany
    {
        return $this->hasMany(Category::class);
    }

    public function customColumns(): HasMany
    {
        return $this->hasMany(CustomColumn::class);
    }

    public function sheets(): HasMany
    {
        return $this->hasMany(Sheet::class);
    }

    public function sheetRows(): HasMany
    {
        return $this->hasMany(SheetRow::class);
    }

    public function recurringTemplates(): HasMany
    {
        return $this->hasMany(RecurringTemplate::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }

    public function monthNotes(): HasMany
    {
        return $this->hasMany(MonthNote::class);
    }

    public function scheduleBlocks(): HasMany
    {
        return $this->hasMany(ScheduleBlock::class);
    }

    public function scheduleTemplates(): HasMany
    {
        return $this->hasMany(ScheduleTemplate::class);
    }

    public function notes(): HasMany
    {
        return $this->hasMany(Note::class);
    }

    public function words(): HasMany
    {
        return $this->hasMany(Word::class);
    }

    public function wordCategories(): HasMany
    {
        return $this->hasMany(WordCategory::class);
    }

    public function noteItems(): HasMany
    {
        return $this->hasMany(NoteItem::class);
    }
}
