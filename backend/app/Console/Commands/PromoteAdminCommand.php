<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class PromoteAdminCommand extends Command
{
    protected $signature = 'user:promote-admin {email : User email}';

    protected $description = 'Make a user a platform admin (and Pro plan)';

    public function handle(): int
    {
        $email = strtolower(trim((string) $this->argument('email')));
        $user = User::query()->whereRaw('lower(email) = ?', [$email])->first();

        if ($user === null) {
            $this->error("User not found: {$email}");

            return self::FAILURE;
        }

        $user->forceFill([
            'platform_role' => User::ROLE_ADMIN,
            'plan' => 'pro',
            'blocked_at' => null,
        ])->save();

        $this->info("Promoted {$user->email} to admin.");

        return self::SUCCESS;
    }
}
