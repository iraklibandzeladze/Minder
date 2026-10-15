<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreNoteItemRequest;
use App\Http\Resources\NoteItemResource;
use App\Models\NoteItem;
use App\Support\ResourceUnlock;
use App\Support\ShareAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NoteItemController extends Controller
{
    public function store(StoreNoteItemRequest $request): JsonResponse
    {
        $data = $request->validated();
        $user = $request->user();
        $note = ShareAccess::noteQueryFor($user)->whereKey($data['note_id'])->firstOrFail();
        abort_unless(ShareAccess::canEdit($user, $note), 403);
        ResourceUnlock::abortUnlessNoteUnlocked($note, $user);

        $checked = (bool) ($data['checked'] ?? false);

        $item = DB::transaction(function () use ($user, $note, $data, $checked) {
            if ($checked && $note->check_mode === 'radio') {
                $note->items()->update(['checked' => false]);
            }

            return $note->items()->create([
                'user_id' => $user->id,
                'body' => $data['body'] ?? '',
                'amount' => $data['amount'] ?? null,
                'checked' => $checked,
                'position' => $data['position'] ?? ((int) $note->items()->max('position') + 1),
            ]);
        });

        return (new NoteItemResource($item))->response()->setStatusCode(201);
    }

    public function update(StoreNoteItemRequest $request, NoteItem $noteItem): NoteItemResource
    {
        $this->authorize('update', $noteItem);
        $note = $noteItem->note;
        if ($note !== null) {
            ResourceUnlock::abortUnlessNoteUnlocked($note, $request->user());
        }
        $data = $request->validated();

        DB::transaction(function () use ($noteItem, $data) {
            $note = $noteItem->note;
            if (
                array_key_exists('checked', $data)
                && $data['checked']
                && $note !== null
                && $note->check_mode === 'radio'
            ) {
                $note->items()->where('id', '!=', $noteItem->id)->update(['checked' => false]);
            }

            $noteItem->update(collect($data)->only(['body', 'amount', 'checked', 'position'])->all());
        });

        return new NoteItemResource($noteItem->fresh());
    }

    public function destroy(Request $request, NoteItem $noteItem): JsonResponse
    {
        $this->authorize('delete', $noteItem);
        $note = $noteItem->note;
        if ($note !== null) {
            ResourceUnlock::abortUnlessNoteUnlocked($note, $request->user());
        }
        $noteItem->delete();

        return response()->json(['ok' => true]);
    }
}
