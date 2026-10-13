<?php

namespace App\Policies;

use App\Models\SheetRow;
use App\Models\User;

class SheetRowPolicy
{
    public function update(User $user, SheetRow $sheetRow): bool
    {
        return $user->id === $sheetRow->user_id;
    }

    public function delete(User $user, SheetRow $sheetRow): bool
    {
        return $user->id === $sheetRow->user_id;
    }
}
