<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ResourceShareResource;
use App\Mail\ResourceInviteMail;
use App\Models\Note;
use App\Models\ResourceShare;
use App\Models\Sheet;
use App\Models\User;
use App\Support\PlanLimits;
use App\Support\ShareAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ResourceShareController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $data = $request->validate([
            'shareable_type' => ['required', Rule::in(['note', 'sheet'])],
            'shareable_id' => ['required', 'integer'],
        ]);

        $resource = $this->findShareable($request->user(), $data['shareable_type'], (int) $data['shareable_id']);
        abort_unless(ShareAccess::canManageShares($request->user(), $resource), 403);

        $shares = ResourceShare::query()
            ->with('member')
            ->where('shareable_type', $data['shareable_type'])
            ->where('shareable_id', $resource->id)
            ->whereIn('status', [ResourceShare::STATUS_PENDING, ResourceShare::STATUS_ACCEPTED])
            ->orderByDesc('id')
            ->get();

        return ResourceShareResource::collection($shares);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'shareable_type' => ['required', Rule::in(['note', 'sheet'])],
            'shareable_id' => ['required', 'integer'],
            'email' => ['required', 'email', 'max:255'],
            'role' => ['required', Rule::in([ResourceShare::ROLE_MODERATOR, ResourceShare::ROLE_VIEWER])],
        ]);

        $user = $request->user();
        PlanLimits::assertCanShare($user);
        $resource = $this->findShareable($user, $data['shareable_type'], (int) $data['shareable_id']);
        abort_unless(ShareAccess::canManageShares($user, $resource), 403);
        abort_unless(ShareAccess::canInviteRole($user, $resource, $data['role']), 403, 'ამ როლის მოწვევა შეუძლებელია.');

        $email = Str::lower(trim($data['email']));
        if ($email === Str::lower($user->email)) {
            return response()->json(['message' => 'საკუთარ თავს ვერ მოიწვევ.'], 422);
        }

        $existing = ResourceShare::query()
            ->where('shareable_type', $data['shareable_type'])
            ->where('shareable_id', $resource->id)
            ->where('email', $email)
            ->first();

        if ($existing !== null && in_array($existing->status, [ResourceShare::STATUS_PENDING, ResourceShare::STATUS_ACCEPTED], true)) {
            return response()->json(['message' => 'ეს ელფოსტა უკვე მოწვეულია.'], 422);
        }

        if ($existing !== null) {
            $existing->update([
                'owner_user_id' => $resource->user_id,
                'role' => $data['role'],
                'status' => ResourceShare::STATUS_PENDING,
                'token' => Str::random(48),
                'member_user_id' => null,
                'accepted_at' => null,
                'expires_at' => now()->addDays(14),
            ]);
            $share = $existing->fresh();
        } else {
            $share = ResourceShare::query()->create([
                'owner_user_id' => $resource->user_id,
                'shareable_type' => $data['shareable_type'],
                'shareable_id' => $resource->id,
                'email' => $email,
                'role' => $data['role'],
                'status' => ResourceShare::STATUS_PENDING,
                'token' => Str::random(48),
                'expires_at' => now()->addDays(14),
            ]);
        }

        $title = $resource instanceof Note ? $resource->title : $resource->name;
        Mail::to($email)->send(new ResourceInviteMail($share, $title, $user->name));

        return (new ResourceShareResource($share))->response()->setStatusCode(201);
    }

    public function destroy(Request $request, ResourceShare $resourceShare): JsonResponse
    {
        $user = $request->user();
        $resource = $this->resolveShareable($resourceShare);
        abort_unless($resource !== null, 404);

        $isOwner = ShareAccess::isOwner($user, $resource);
        $isSelf = (int) $resourceShare->member_user_id === (int) $user->id
            || Str::lower($resourceShare->email) === Str::lower($user->email);

        if (! $isOwner && ! $isSelf) {
            abort(403);
        }

        $resourceShare->update(['status' => ResourceShare::STATUS_REVOKED]);

        return response()->json(['ok' => true]);
    }

    public function preview(string $token): JsonResponse
    {
        $share = ResourceShare::query()->where('token', $token)->firstOrFail();
        if ($share->status === ResourceShare::STATUS_REVOKED || $share->isExpired()) {
            return response()->json(['message' => 'მოწვევა ვადაგასულია ან გაუქმებულია.'], 410);
        }

        $resource = $this->resolveShareable($share);
        abort_unless($resource !== null, 404);

        $owner = User::query()->find($share->owner_user_id);

        return response()->json([
            'token' => $share->token,
            'email' => $share->email,
            'role' => $share->role,
            'status' => $share->status,
            'shareable_type' => $share->shareable_type,
            'shareable_id' => $share->shareable_id,
            'resource_title' => $resource instanceof Note ? $resource->title : $resource->name,
            'inviter_name' => $owner?->name ?? 'მომხმარებელი',
            'expires_at' => $share->expires_at?->toIso8601String(),
        ]);
    }

    public function accept(Request $request, string $token): JsonResponse
    {
        $user = $request->user();
        $share = ResourceShare::query()->where('token', $token)->firstOrFail();

        if ($share->status === ResourceShare::STATUS_REVOKED || $share->isExpired()) {
            return response()->json(['message' => 'მოწვევა ვადაგასულია ან გაუქმებულია.'], 410);
        }

        if (Str::lower($user->email) !== Str::lower($share->email)) {
            return response()->json([
                'message' => 'მოწვევა გაგზავნილია სხვა ელფოსტაზე: '.$share->email,
            ], 422);
        }

        if ($share->status === ResourceShare::STATUS_ACCEPTED
            && (int) $share->member_user_id === (int) $user->id) {
            return response()->json([
                'share' => (new ResourceShareResource($share))->resolve(),
                'already_accepted' => true,
            ]);
        }

        $share->update([
            'status' => ResourceShare::STATUS_ACCEPTED,
            'member_user_id' => $user->id,
            'accepted_at' => now(),
        ]);

        return response()->json([
            'share' => (new ResourceShareResource($share->fresh()))->resolve(),
            'already_accepted' => false,
        ]);
    }

    private function findShareable(User $user, string $type, int $id): Note|Sheet
    {
        if ($type === ResourceShare::TYPE_NOTE) {
            $note = ShareAccess::noteQueryFor($user)->whereKey($id)->firstOrFail();

            return $note;
        }

        return ShareAccess::sheetQueryFor($user)->whereKey($id)->firstOrFail();
    }

    private function resolveShareable(ResourceShare $share): Note|Sheet|null
    {
        if ($share->shareable_type === ResourceShare::TYPE_NOTE) {
            return Note::query()->find($share->shareable_id);
        }
        if ($share->shareable_type === ResourceShare::TYPE_SHEET) {
            return Sheet::query()->find($share->shareable_id);
        }

        return null;
    }
}
