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
            'title' => $this->title,
            'check_mode' => $this->check_mode,
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
