<?php

namespace App\Policies;

use App\Models\ScheduleBlock;
use App\Models\User;

class ScheduleBlockPolicy
{
    public function update(User $user, ScheduleBlock $scheduleBlock): bool
    {
        return $user->id === $scheduleBlock->user_id;
    }

    public function delete(User $user, ScheduleBlock $scheduleBlock): bool
    {
        return $user->id === $scheduleBlock->user_id;
    }
}
