<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Mail\ProRequestMail;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

class ProRequestController extends Controller
{
    /** User asks to be upgraded to Pro; admins get an e-mail. */
    public function store(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $data = $request->validate([
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        if ($user->isPro()) {
            return response()->json(['message' => 'უკვე Pro გეგმაზე ხარ.'], 422);
        }
        if ($user->hasPendingProRequest()) {
            return response()->json(['message' => 'მოთხოვნა უკვე გაგზავნილია.'], 422);
        }

        $user->forceFill([
            'pro_requested_at' => now(),
            'pro_request_note' => isset($data['note']) ? trim((string) $data['note']) ?: null : null,
        ])->save();

        $this->notifyAdmins($user);

        return response()->json((new UserResource($user))->resolve(), 201);
    }

    /** User withdraws a pending request. */
    public function destroy(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $user->forceFill([
            'pro_requested_at' => null,
            'pro_request_note' => null,
        ])->save();

        return response()->json((new UserResource($user))->resolve());
    }

    private function notifyAdmins(User $requester): void
    {
        $emails = User::query()
            ->where('platform_role', User::ROLE_ADMIN)
            ->whereNull('blocked_at')
            ->where('id', '!=', $requester->id)
            ->pluck('email')
            ->filter()
            ->values()
            ->all();

        if ($emails === []) {
            return;
        }

        try {
            Mail::to($emails)->send(new ProRequestMail($requester));
        } catch (Throwable $e) {
            // Mail failure must not block the request itself; admins still see it in the panel.
            Log::warning('Pro request mail failed', ['user_id' => $requester->id, 'error' => $e->getMessage()]);
        }
    }
}
