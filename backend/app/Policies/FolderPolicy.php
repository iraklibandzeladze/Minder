<?php

namespace App\Policies;

use App\Models\Folder;
use App\Models\User;

class FolderPolicy
{
    public function update(User $user, Folder $folder): bool
    {
        return (int) $folder->user_id === (int) $user->id;
    }

    public function delete(User $user, Folder $folder): bool
    {
        return $this->update($user, $folder);
    }
}
