<?php

namespace App\Http\Controllers\Api;

use App\Actions\ResolveSocialUser;
use App\Exceptions\SocialAuthException;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\InvalidStateException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Throwable;

class SocialAuthController extends Controller
{
    private const PROVIDERS = ['google', 'facebook'];

    private const RETURN_KEY = 'social_auth.return';

    public function redirect(Request $request, string $provider): RedirectResponse
    {
        $this->assertProvider($provider);

        $request->session()->put(self::RETURN_KEY, $this->sanitizeReturnPath($request->query('return')));

        $driver = Socialite::driver($provider);
        if ($provider === 'google') {
            // Always show the account chooser so users with several Google accounts can switch.
            $driver = $driver->with(['prompt' => 'select_account']);
        }

        return $driver->redirect();
    }

    public function callback(Request $request, string $provider, ResolveSocialUser $resolve): RedirectResponse
    {
        $this->assertProvider($provider);

        $returnPath = (string) $request->session()->pull(self::RETURN_KEY, '/dashboard');

        if ($request->query('error') !== null) {
            // User cancelled on the provider's consent screen.
            return $this->failure($returnPath, 'cancelled');
        }

        try {
            $identity = Socialite::driver($provider)->user();
            $user = $resolve->handle($provider, $identity);
        } catch (SocialAuthException $e) {
            return $this->failure($returnPath, $e->reason);
        } catch (InvalidStateException) {
            return $this->failure($returnPath, 'state');
        } catch (Throwable $e) {
            Log::warning('Social auth failed', ['provider' => $provider, 'error' => $e->getMessage()]);

            return $this->failure($returnPath, 'provider');
        }

        if ($user->isBlocked()) {
            return $this->failure($returnPath, 'blocked');
        }

        Auth::guard('web')->login($user, true);
        $request->session()->regenerate();

        return redirect()->away($this->frontendUrl($returnPath));
    }

    private function assertProvider(string $provider): void
    {
        if (! in_array($provider, self::PROVIDERS, true)) {
            throw new NotFoundHttpException;
        }
    }

    private function failure(string $returnPath, string $code): RedirectResponse
    {
        $separator = str_contains($returnPath, '?') ? '&' : '?';

        return redirect()->away($this->frontendUrl($returnPath.$separator.'auth_error='.$code));
    }

    private function frontendUrl(string $path): string
    {
        $base = rtrim((string) config('app.frontend_url', config('app.url')), '/');

        return $base.$path;
    }

    /**
     * Only allow same-origin relative paths so the callback can never bounce to a foreign host.
     */
    private function sanitizeReturnPath(mixed $raw): string
    {
        if (! is_string($raw) || $raw === '') {
            return '/dashboard';
        }
        if (! Str::startsWith($raw, '/') || Str::startsWith($raw, '//') || str_contains($raw, '\\')) {
            return '/dashboard';
        }

        return $raw === '/' ? '/dashboard' : Str::limit($raw, 512, '');
    }
}
