<?php

namespace App\Http\Resources;

use App\Models\Sheet;
use App\Support\ResourceUnlock;
use App\Support\ShareAccess;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Sheet */
class SheetResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user = $request->user();
        $locked = ResourceUnlock::sheetHasPassword($this->resource);
        $role = $user ? ShareAccess::roleFor($user, $this->resource) : 'none';
        $isOwner = $user ? ShareAccess::isOwner($user, $this->resource) : false;
        $unlocked = ResourceUnlock::isSheetUnlocked($this->resource, $user);

        return [
            'id' => $this->id,
            'folder_id' => $isOwner ? $this->folder_id : null,
            'is_pinned' => (bool) $this->is_pinned,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'name' => $this->name,
            'slug' => $this->slug,
            'kind' => $this->kind,
            'position' => $this->position,
            'is_default' => $this->is_default,
            'budget' => $this->budget,
            'reminders_enabled' => (bool) $this->reminders_enabled,
            'is_locked' => $locked && $isOwner,
            'is_unlocked' => $unlocked,
            'my_role' => $role,
            'is_owner' => $isOwner,
        ];
    }
}
