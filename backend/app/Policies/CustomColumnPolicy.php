<?php

namespace App\Policies;

use App\Models\CustomColumn;
use App\Models\User;

class CustomColumnPolicy
{
    public function view(User $user, CustomColumn $customColumn): bool
    {
        return $user->id === $customColumn->user_id;
    }

    public function update(User $user, CustomColumn $customColumn): bool
    {
        return $user->id === $customColumn->user_id;
    }

    public function delete(User $user, CustomColumn $customColumn): bool
    {
        return $user->id === $customColumn->user_id;
    }
}
