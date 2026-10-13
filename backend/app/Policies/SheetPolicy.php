<?php

namespace App\Policies;

use App\Models\Sheet;
use App\Models\User;
use App\Support\ShareAccess;

class SheetPolicy
{
    public function view(User $user, Sheet $sheet): bool
    {
        return ShareAccess::canView($user, $sheet);
    }

    public function update(User $user, Sheet $sheet): bool
    {
        return ShareAccess::canEdit($user, $sheet);
    }

    public function delete(User $user, Sheet $sheet): bool
    {
        return ShareAccess::isOwner($user, $sheet);
    }
}
