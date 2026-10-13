<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AdminUserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AdminUserController extends Controller
{
    public function stats(Request $request): JsonResponse
    {
        return response()->json([
            'users' => User::query()->count(),
            'blocked' => User::query()->whereNotNull('blocked_at')->count(),
            'pro' => User::query()->where('plan', 'pro')->count(),
            'admins' => User::query()->where('platform_role', User::ROLE_ADMIN)->count(),
            'sheets' => DB::table('sheets')->count(),
            'notes' => DB::table('notes')->count(),
        ]);
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $q = trim((string) $request->query('q', ''));

        $users = User::query()
            ->withCount(['sheets', 'notes'])
            ->when($q !== '', function ($query) use ($q) {
                $query->where(function ($inner) use ($q) {
                    $inner->where('name', 'ilike', '%'.$q.'%')
                        ->orWhere('email', 'ilike', '%'.$q.'%');
                });
            })
            ->orderByDesc('id')
            ->paginate(50);

        return AdminUserResource::collection($users);
    }

    public function update(Request $request, User $user): AdminUserResource|JsonResponse
    {
        /** @var User $actor */
        $actor = $request->user();

        $data = $request->validate([
            'plan' => ['sometimes', Rule::in(['free', 'pro'])],
            'platform_role' => ['sometimes', Rule::in([User::ROLE_USER, User::ROLE_ADMIN])],
            'blocked' => ['sometimes', 'boolean'],
        ]);

        if ($actor->id === $user->id) {
            if (array_key_exists('platform_role', $data) && $data['platform_role'] !== User::ROLE_ADMIN) {
                return response()->json(['message' => 'საკუთარ თავს ადმინის როლს ვერ მოხსნი.'], 422);
            }
            if (array_key_exists('blocked', $data) && $data['blocked'] === true) {
                return response()->json(['message' => 'საკუთარ თავს ვერ დაბლოკავ.'], 422);
            }
        }

        if (array_key_exists('plan', $data)) {
            $user->plan = $data['plan'];
        }
        if (array_key_exists('platform_role', $data)) {
            $user->platform_role = $data['platform_role'];
        }
        if (array_key_exists('blocked', $data)) {
            $user->blocked_at = $data['blocked'] ? now() : null;
        }

        $user->save();

        if ($user->isBlocked()) {
            DB::table('sessions')->where('user_id', $user->id)->delete();
        }

        $user->loadCount(['sheets', 'notes']);

        return new AdminUserResource($user);
    }
}
