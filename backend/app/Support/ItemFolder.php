<?php

namespace App\Support;

use App\Models\Folder;
use App\Models\Note;
use App\Models\Sheet;
use App\Models\User;
use Illuminate\Validation\Rule;

class ItemFolder
{
    public static function rules(User $user, string $type): array
    {
        return ['sometimes', 'nullable', 'integer', Rule::exists(Folder::class, 'id')->where(fn ($q) => $q->where('user_id', $user->id)->where('type', $type))];
    }

    public static function authorizeMetadata(User $user, Note|Sheet $item, array $data): void
    {
        if (array_key_exists('folder_id', $data) || array_key_exists('is_pinned', $data)) {
            abort_unless(ShareAccess::isOwner($user, $item), 403);
        }
    }
}
