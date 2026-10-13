<?php

namespace App\Actions;

use App\Exceptions\SocialAuthException;
use App\Models\SocialAccount;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Socialite\Contracts\User as ProviderUser;

class ResolveSocialUser
{
    public function __construct(private readonly ProvisionUserDefaults $provision)
    {
    }

    /**
     * Find or create the local user for an OAuth identity.
     *
     * Order: existing link → same e-mail (auto-link, providers only return verified e-mails) → new user.
     */
    public function handle(string $provider, ProviderUser $identity): User
    {
        $providerId = (string) $identity->getId();
        $email = Str::lower(trim((string) ($identity->getEmail() ?? '')));
        $name = trim((string) ($identity->getName() ?: $identity->getNickname() ?: ''));
        $avatar = $identity->getAvatar() ?: null;

        return DB::transaction(function () use ($provider, $providerId, $email, $name, $avatar): User {
            $link = SocialAccount::query()
                ->where('provider', $provider)
                ->where('provider_id', $providerId)
                ->lockForUpdate()
                ->first();

            if ($link !== null) {
                $link->fill([
                    'email' => $email !== '' ? $email : $link->email,
                    'name' => $name !== '' ? $name : $link->name,
                    'avatar_url' => $avatar ?? $link->avatar_url,
                ])->save();

                /** @var User $user */
                $user = $link->user()->firstOrFail();
                if ($user->avatar_url === null && $avatar !== null) {
                    $user->forceFill(['avatar_url' => $avatar])->save();
                }

                return $user;
            }

            if ($email === '') {
                throw new SocialAuthException('no_email');
            }

            $user = User::query()->whereRaw('lower(email) = ?', [$email])->lockForUpdate()->first();
            $created = false;

            if ($user === null) {
                $user = User::query()->create([
                    'name' => $name !== '' ? Str::limit($name, 80, '') : Str::before($email, '@'),
                    'email' => $email,
                    'password' => null,
                    'avatar_url' => $avatar,
                    'email_verified_at' => now(),
                ]);
                $created = true;
            } elseif ($user->avatar_url === null && $avatar !== null) {
                $user->forceFill(['avatar_url' => $avatar])->save();
            }

            $user->socialAccounts()->create([
                'provider' => $provider,
                'provider_id' => $providerId,
                'email' => $email,
                'name' => $name !== '' ? $name : null,
                'avatar_url' => $avatar,
            ]);

            if ($created) {
                $this->provision->handle($user);
            }

            return $user;
        });
    }
}
