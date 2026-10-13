<?php

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin User */
class AdminUserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'platform_role' => $this->platform_role,
            'plan' => $this->plan,
            'blocked_at' => $this->blocked_at?->toIso8601String(),
            'is_blocked' => $this->isBlocked(),
            'sheets_count' => (int) ($this->sheets_count ?? 0),
            'notes_count' => (int) ($this->notes_count ?? 0),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
