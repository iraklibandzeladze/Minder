<?php

namespace App\Http\Resources;

use App\Models\Note;
use App\Support\ResourceUnlock;
use App\Support\ShareAccess;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Note */
class NoteResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user = $request->user();
        $locked = ResourceUnlock::noteHasPassword($this->resource);
        $role = $user ? ShareAccess::roleFor($user, $this->resource) : 'none';
        $isOwner = $user ? ShareAccess::isOwner($user, $this->resource) : false;
        $unlocked = ResourceUnlock::isNoteUnlocked($this->resource, $user);

        return [
            'id' => $this->id,
            'folder_id' => $isOwner ? $this->folder_id : null,
            'is_pinned' => (bool) $this->is_pinned,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'title' => $this->title,
            'type' => $this->type,
            'content' => $unlocked ? $this->content : null,
            'check_mode' => $this->check_mode,
            'priced' => (bool) $this->priced,
            'position' => (int) $this->position,
            'is_locked' => $locked && $isOwner,
            'is_unlocked' => $unlocked,
            'my_role' => $role,
            'is_owner' => $isOwner,
            'items' => ($unlocked && $this->relationLoaded('items'))
                ? NoteItemResource::collection($this->items)
                : [],
        ];
    }
}
