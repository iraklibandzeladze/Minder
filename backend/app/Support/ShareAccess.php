<?php

namespace App\Support;

use App\Models\Note;
use App\Models\ResourceShare;
use App\Models\Sheet;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

class ShareAccess
{
    public static function noteQueryFor(User $user): Builder
    {
        return Note::query()->where(function (Builder $q) use ($user) {
            $q->where('user_id', $user->id)
                ->orWhereIn('id', self::acceptedShareableIds($user, ResourceShare::TYPE_NOTE));
        });
    }

    public static function sheetQueryFor(User $user): Builder
    {
        return Sheet::query()->where(function (Builder $q) use ($user) {
            $q->where('user_id', $user->id)
                ->orWhereIn('id', self::acceptedShareableIds($user, ResourceShare::TYPE_SHEET));
        });
    }

    /** @return list<int> */
    public static function acceptedShareableIds(User $user, string $type): array
    {
        return ResourceShare::query()
            ->where('shareable_type', $type)
            ->where('status', ResourceShare::STATUS_ACCEPTED)
            ->where('member_user_id', $user->id)
            ->pluck('shareable_id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    public static function membership(User $user, Note|Sheet $resource): ?ResourceShare
    {
        $type = $resource instanceof Note ? ResourceShare::TYPE_NOTE : ResourceShare::TYPE_SHEET;

        return ResourceShare::query()
            ->where('shareable_type', $type)
            ->where('shareable_id', $resource->id)
            ->where('status', ResourceShare::STATUS_ACCEPTED)
            ->where('member_user_id', $user->id)
            ->first();
    }

    public static function isOwner(User $user, Note|Sheet $resource): bool
    {
        return (int) $resource->user_id === (int) $user->id;
    }

    public static function canView(User $user, Note|Sheet $resource): bool
    {
        return self::isOwner($user, $resource) || self::membership($user, $resource) !== null;
    }

    public static function canEdit(User $user, Note|Sheet $resource): bool
    {
        if (self::isOwner($user, $resource)) {
            return true;
        }
        $share = self::membership($user, $resource);

        return $share !== null && $share->canEdit();
    }

    public static function canManageShares(User $user, Note|Sheet $resource): bool
    {
        if (self::isOwner($user, $resource)) {
            return true;
        }
        $share = self::membership($user, $resource);

        return $share !== null && $share->role === ResourceShare::ROLE_MODERATOR;
    }

    public static function canInviteRole(User $user, Note|Sheet $resource, string $role): bool
    {
        if (self::isOwner($user, $resource)) {
            return in_array($role, [ResourceShare::ROLE_MODERATOR, ResourceShare::ROLE_VIEWER], true);
        }
        // Moderators may only invite viewers.
        return self::canManageShares($user, $resource) && $role === ResourceShare::ROLE_VIEWER;
    }

    public static function roleFor(User $user, Note|Sheet $resource): string
    {
        if (self::isOwner($user, $resource)) {
            return 'owner';
        }
        $share = self::membership($user, $resource);

        return $share?->role ?? 'none';
    }
}
