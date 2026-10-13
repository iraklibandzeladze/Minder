<?php

namespace App\Actions;

use App\Models\User;

class ProvisionUserDefaults
{
    /**
     * New users start empty — they only create tables via „+ ცხრილი“.
     * Ledger defaults, templates, and quick-entry seeds are disabled for now.
     */
    public function handle(User $user): void
    {
        //
    }
}
