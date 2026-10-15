<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AdminUserResource;
use App\Mail\PlanUpgradedMail;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;
use Throwable;

class AdminUserController extends Controller
{
    public function stats(Request $request): JsonResponse
    {
        return response()->json([
            'users' => User::query()->count(),
            'blocked' => User::query()->whereNotNull('blocked_at')->count(),
            'pro' => User::query()->where('plan', 'pro')->count(),
            'pending_pro' => User::query()->whereNotNull('pro_requested_at')->where('plan', '!=', 'pro')->count(),
            'admins' => User::query()->where('platform_role', User::ROLE_ADMIN)->count(),
            'sheets' => DB::table('sheets')->count(),
            'notes' => DB::table('notes')->count(),
        ]);
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $q = trim((string) $request->query('q', ''));
        $pendingOnly = $request->boolean('pending');

        $users = User::query()
            ->withCount(['sheets', 'notes'])
            ->when($q !== '', function ($query) use ($q) {
                $query->where(function ($inner) use ($q) {
                    $inner->where('name', 'ilike', '%'.$q.'%')
                        ->orWhere('email', 'ilike', '%'.$q.'%');
                });
            })
            ->when($pendingOnly, fn ($query) => $query->whereNotNull('pro_requested_at')->where('plan', '!=', 'pro'))
            // Pending Pro requests float to the top so admins see them first.
            ->orderByRaw('CASE WHEN pro_requested_at IS NOT NULL AND plan <> \'pro\' THEN 0 ELSE 1 END')
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
            // Clears a pending Pro request without changing the plan.
            'reject_pro_request' => ['sometimes', 'boolean'],
        ]);

        if ($actor->id === $user->id) {
            if (array_key_exists('platform_role', $data) && $data['platform_role'] !== User::ROLE_ADMIN) {
                return response()->json(['message' => 'საკუთარ თავს ადმინის როლს ვერ მოხსნი.'], 422);
            }
            if (array_key_exists('blocked', $data) && $data['blocked'] === true) {
                return response()->json(['message' => 'საკუთარ თავს ვერ დაბლოკავ.'], 422);
            }
        }

        $upgradedFromRequest = false;

        if (array_key_exists('plan', $data)) {
            $upgradedFromRequest = $data['plan'] === 'pro' && $user->hasPendingProRequest();
            $user->plan = $data['plan'];
            // Any explicit plan decision resolves the pending request.
            $user->pro_requested_at = null;
            $user->pro_request_note = null;
        }
        if (! empty($data['reject_pro_request'])) {
            $user->pro_requested_at = null;
            $user->pro_request_note = null;
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

        if ($upgradedFromRequest && filled($user->email)) {
            try {
                Mail::to($user->email)->send(new PlanUpgradedMail($user));
            } catch (Throwable $e) {
                Log::warning('Plan upgraded mail failed', ['user_id' => $user->id, 'error' => $e->getMessage()]);
            }
        }

        $user->loadCount(['sheets', 'notes']);

        return new AdminUserResource($user);
    }
}
