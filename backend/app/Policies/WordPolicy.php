<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Word;

class WordPolicy
{
    public function update(User $user, Word $word): bool
    {
        return $user->id === $word->user_id;
    }

    public function delete(User $user, Word $word): bool
    {
        return $user->id === $word->user_id;
    }
}
