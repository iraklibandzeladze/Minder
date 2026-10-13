<?php

namespace App\Policies;

use App\Models\User;
use App\Models\WordCategory;

class WordCategoryPolicy
{
    public function delete(User $user, WordCategory $wordCategory): bool
    {
        return $user->id === $wordCategory->user_id;
    }
}
