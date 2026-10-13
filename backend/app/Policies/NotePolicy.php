<?php

namespace App\Policies;

use App\Models\Note;
use App\Models\User;
use App\Support\ShareAccess;

class NotePolicy
{
    public function view(User $user, Note $note): bool
    {
        return ShareAccess::canView($user, $note);
    }

    public function update(User $user, Note $note): bool
    {
        return ShareAccess::canEdit($user, $note);
    }

    public function delete(User $user, Note $note): bool
    {
        return ShareAccess::isOwner($user, $note);
    }
}
