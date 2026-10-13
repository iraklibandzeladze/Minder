<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class ResourceShare extends Model
{
    public const ROLE_MODERATOR = 'moderator';

    public const ROLE_VIEWER = 'viewer';

    public const STATUS_PENDING = 'pending';

    public const STATUS_ACCEPTED = 'accepted';

    public const STATUS_REVOKED = 'revoked';

    public const TYPE_NOTE = 'note';

    public const TYPE_SHEET = 'sheet';

    protected $fillable = [
        'owner_user_id',
        'shareable_type',
        'shareable_id',
        'email',
        'role',
        'status',
        'token',
        'member_user_id',
        'accepted_at',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'accepted_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(User::class, 'member_user_id');
    }

    public function shareable(): MorphTo
    {
        return $this->morphTo(__FUNCTION__, 'shareable_type', 'shareable_id');
    }

    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    public function isAccepted(): bool
    {
        return $this->status === self::STATUS_ACCEPTED;
    }

    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }

    public function canEdit(): bool
    {
        return $this->role === self::ROLE_MODERATOR;
    }

    public function inviteUrl(): string
    {
        $base = rtrim((string) config('app.frontend_url', config('app.url')), '/');

        return $base.'/invite/'.$this->token;
    }
}
