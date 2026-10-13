<?php

namespace App\Policies;

use App\Models\ScheduleTemplate;
use App\Models\User;

class ScheduleTemplatePolicy
{
    public function update(User $user, ScheduleTemplate $scheduleTemplate): bool
    {
        return $user->id === $scheduleTemplate->user_id;
    }

    public function delete(User $user, ScheduleTemplate $scheduleTemplate): bool
    {
        return $user->id === $scheduleTemplate->user_id;
    }
}
