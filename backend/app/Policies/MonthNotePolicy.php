<?php

namespace App\Policies;

use App\Models\MonthNote;
use App\Models\User;

class MonthNotePolicy
{
    public function view(User $user, MonthNote $monthNote): bool
    {
        return $user->id === $monthNote->user_id;
    }

    public function update(User $user, MonthNote $monthNote): bool
    {
        return $user->id === $monthNote->user_id;
    }
}
