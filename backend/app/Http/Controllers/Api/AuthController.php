<?php

namespace App\Http\Controllers\Api;

use App\Actions\ProvisionUserDefaults;
use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    public function register(Request $request, ProvisionUserDefaults $provision): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);

        $user = User::query()->create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
        ]);

        $provision->handle($user);
        Auth::login($user);
        $request->session()->regenerate();

        return response()->json(['user' => (new UserResource($user))->resolve()], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (! Auth::attempt($credentials, true)) {
            $existing = User::query()->where('email', $credentials['email'])->first();
            if ($existing !== null && ! $existing->hasPassword()) {
                return response()->json([
                    'message' => 'ამ ანგარიშს პაროლი არ აქვს — შედი Google-ით ან Facebook-ით.',
                ], 422);
            }

            return response()->json(['message' => 'ელფოსტა ან პაროლი არასწორია.'], 422);
        }

        /** @var User $user */
        $user = $request->user();
        if ($user->isBlocked()) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return response()->json(['message' => 'ანგარიში დაბლოკილია.'], 403);
        }

        $request->session()->regenerate();

        return response()->json(['user' => (new UserResource($user))->resolve()]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['ok' => true]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json((new UserResource($request->user()))->resolve());
    }

    public function update(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $data = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email,'.$user->id],
            // Social-only accounts have no password yet, so they may set one without the current one.
            'current_password' => [
                'nullable',
                $user->hasPassword() ? 'required_with:password' : 'sometimes',
                'string',
            ],
            'password' => ['nullable', 'confirmed', Password::min(8)],
        ]);

        if (! empty($data['password'])) {
            if ($user->hasPassword() && ! Hash::check((string) ($data['current_password'] ?? ''), (string) $user->password)) {
                return response()->json([
                    'message' => 'მიმდინარე პაროლი არასწორია.',
                    'errors' => ['current_password' => ['მიმდინარე პაროლი არასწორია.']],
                ], 422);
            }
            $user->password = $data['password'];
        }

        $user->name = $data['name'];
        $user->email = $data['email'];
        $user->save();

        return response()->json((new UserResource($user))->resolve());
    }
}
