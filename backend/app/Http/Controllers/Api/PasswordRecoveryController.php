<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\SheetResource;
use App\Models\Sheet;
use App\Models\User;
use App\Support\ResourceUnlock;
use App\Support\ShareAccess;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;

class PasswordRecoveryController extends Controller
{
    public function forgot(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => ['required', 'email', 'max:255']]);
        Password::sendResetLink($data);

        // Identical response for known, unknown and recently requested addresses.
        return response()->json(['message' => 'თუ ანგარიში არსებობს, აღდგენის ბმულს ელფოსტაზე მიიღებ.']);
    }

    public function reset(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string'], 'email' => ['required', 'email'],
            'password' => ['required', 'confirmed', PasswordRule::min(8)],
        ]);
        $resetUserId = null;
        $status = Password::reset([...$data, 'password_confirmation' => $request->input('password_confirmation')], function (User $user, string $password) use (&$resetUserId) {
            $resetUserId = $user->id;
            $user->forceFill(['password' => Hash::make($password), 'remember_token' => Str::random(60)])->save();
            if (config('session.driver') === 'database') {
                DB::table(config('session.table', 'sessions'))->where('user_id', $user->id)->delete();
            }
            if (Schema::hasTable('personal_access_tokens')) {
                $user->tokens()->delete();
            }
            event(new PasswordReset($user));
        });
        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages(['email' => 'ბმული არასწორია ან ვადა გაუვიდა. მოითხოვე ახალი ბმული.']);
        }

        if ($request->user()?->id === $resetUserId) {
            Auth::guard('web')->logout();
            if ($request->hasSession()) {
                $request->session()->invalidate();
                $request->session()->regenerateToken();
            }
        }

        return response()->json(['message' => 'პაროლი განახლდა. შედი ახალი პაროლით.']);
    }

    public function sheet(Request $request, Sheet $sheet): SheetResource
    {
        abort_unless(ShareAccess::isOwner($request->user(), $sheet), 403);
        $data = $request->validate(['account_password' => ['required', 'string', 'max:255']]);
        $user = $request->user();
        if (! $user->hasPassword() || ! Hash::check($data['account_password'], (string) $user->password)) {
            throw ValidationException::withMessages(['account_password' => 'ანგარიშის პაროლი არასწორია.']);
        }
        $sheet->update(['password_hash' => null]);
        ResourceUnlock::lockSheet($sheet);

        return new SheetResource($sheet);
    }
}
