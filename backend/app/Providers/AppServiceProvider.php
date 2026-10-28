<?php

namespace App\Providers;

use App\Models\Note;
use App\Models\Sheet;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        ResetPassword::createUrlUsing(fn ($user, string $token) => rtrim(config('app.frontend_url'), '/').'/reset-password?'.http_build_query(['token' => $token, 'email' => $user->email])
        );
        ResetPassword::toMailUsing(fn ($user, string $token) => (new MailMessage)
            ->subject('Minder — პაროლის აღდგენა')
            ->line('ანგარიშის პაროლის შესაცვლელად გახსენი ბმული.')
            ->action('პაროლის აღდგენა', rtrim(config('app.frontend_url'), '/').'/reset-password?'.http_build_query(['token' => $token, 'email' => $user->email]))
            ->line('ბმული მოქმედებს '.config('auth.passwords.users.expire', 60).' წუთის განმავლობაში. თუ აღდგენა არ მოგითხოვია, გამოტოვე ეს წერილი.')
        );
        Relation::enforceMorphMap([
            'note' => Note::class,
            'sheet' => Sheet::class,
        ]);
    }
}
