<?php

namespace App\Policies;

use App\Models\NoteItem;
use App\Models\User;
use App\Support\ShareAccess;

class NoteItemPolicy
{
    public function update(User $user, NoteItem $noteItem): bool
    {
        $note = $noteItem->note;
        if ($note === null) {
            return false;
        }

        return ShareAccess::canEdit($user, $note);
    }

    public function delete(User $user, NoteItem $noteItem): bool
    {
        $note = $noteItem->note;
        if ($note === null) {
            return false;
        }

        return ShareAccess::canEdit($user, $note);
    }
}
