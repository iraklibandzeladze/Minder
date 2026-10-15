<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::query()->updateOrCreate(
            ['email' => 'demo@minder.ge'],
            [
                'name' => 'დემო',
                'password' => Hash::make('password'),
                'platform_role' => User::ROLE_ADMIN,
                'plan' => 'pro',
                'blocked_at' => null,
            ]
        );
    }
}
