<?php

namespace App\Http\Resources;

use App\Models\User;
use App\Support\PlanLimits;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin User */
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'avatar_url' => $this->avatar_url,
            'has_password' => $this->hasPassword(),
            'platform_role' => $this->platform_role ?? User::ROLE_USER,
            'plan' => $this->plan ?? 'free',
            'is_admin' => $this->isAdmin(),
            'limits' => PlanLimits::for($this->resource),
        ];
    }
}
