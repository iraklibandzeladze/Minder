<?php

namespace App\Policies;

use App\Models\RecurringTemplate;
use App\Models\User;

class RecurringTemplatePolicy
{
    public function view(User $user, RecurringTemplate $recurringTemplate): bool
    {
        return $user->id === $recurringTemplate->user_id;
    }

    public function update(User $user, RecurringTemplate $recurringTemplate): bool
    {
        return $user->id === $recurringTemplate->user_id;
    }

    public function delete(User $user, RecurringTemplate $recurringTemplate): bool
    {
        return $user->id === $recurringTemplate->user_id;
    }
}
