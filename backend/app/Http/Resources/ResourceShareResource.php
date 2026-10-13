<?php

namespace App\Http\Resources;

use App\Models\ResourceShare;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin ResourceShare */
class ResourceShareResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'shareable_type' => $this->shareable_type,
            'shareable_id' => $this->shareable_id,
            'email' => $this->email,
            'role' => $this->role,
            'status' => $this->status,
            'member_user_id' => $this->member_user_id,
            'member_name' => $this->whenLoaded('member', fn () => $this->member?->name),
            'invite_url' => $this->when(
                $this->status === ResourceShare::STATUS_PENDING,
                fn () => $this->inviteUrl()
            ),
            'accepted_at' => $this->accepted_at?->toIso8601String(),
            'expires_at' => $this->expires_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
