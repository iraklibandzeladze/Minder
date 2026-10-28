<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreNoteRequest;
use App\Http\Resources\NoteResource;
use App\Models\Note;
use App\Support\ItemFolder;
use App\Support\PlanLimits;
use App\Support\ResourceUnlock;
use App\Support\ShareAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class NoteController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $notes = ShareAccess::noteQueryFor($request->user())
            ->orderBy('position')
            ->orderBy('id')
            ->get();

        foreach ($notes as $note) {
            if (ResourceUnlock::isNoteUnlocked($note, $request->user())) {
                $note->load('items');
            }
        }

        return NoteResource::collection($notes);
    }

    public function store(StoreNoteRequest $request): JsonResponse
    {
        $data = $request->validated();
        $user = $request->user();
        PlanLimits::assertCanCreateNote($user);

        $protected = (bool) ($data['password_protected'] ?? false);
        $password = $data['password'] ?? null;
        if ($protected) {
            PlanLimits::assertCanPasswordProtect($user);
        }

        $note = $user->notes()->create([
            'title' => $data['title'],
            'folder_id' => $data['folder_id'] ?? null,
            'is_pinned' => $data['is_pinned'] ?? false,
            'type' => $data['type'] ?? 'checklist',
            'content' => $data['content'] ?? null,
            'check_mode' => $data['check_mode'],
            'priced' => ($data['type'] ?? 'checklist') === 'checklist' && (bool) ($data['priced'] ?? false),
            'position' => $data['position'] ?? ((int) $user->notes()->max('position') + 1),
            'password_hash' => $protected && filled($password) ? Hash::make($password) : null,
        ]);

        // Only checklists need a starter empty line.
        if ($note->type === 'checklist') {
            $note->items()->create([
                'user_id' => $user->id,
                'body' => '',
                'checked' => false,
                'position' => 0,
            ]);
        }

        // Password-protected notes stay locked until explicit unlock.
        if (! ResourceUnlock::noteHasPassword($note)) {
            $note->load('items');
        }

        return (new NoteResource($note))->response()->setStatusCode(201);
    }

    public function update(StoreNoteRequest $request, Note $note): NoteResource
    {
        $this->authorize('update', $note);
        $data = $request->validated();
        if (array_diff(array_keys($data), ['folder_id', 'is_pinned'])) {
            ResourceUnlock::abortUnlessNoteUnlocked($note, $request->user());
        }
        ItemFolder::authorizeMetadata($request->user(), $note, $data);
        if (($data['type'] ?? $note->type) === 'rich_text') {
            $data['priced'] = false;
        }
        unset($data['password'], $data['password_protected'], $data['password_confirmation']);

        DB::transaction(function () use ($note, $data) {
            $switchingToRadio = ($data['check_mode'] ?? null) === 'radio'
                && $note->check_mode !== 'radio';

            $note->update($data);

            if ($switchingToRadio) {
                $firstChecked = $note->items()->where('checked', true)->orderBy('position')->orderBy('id')->first();
                $note->items()->update(['checked' => false]);
                if ($firstChecked !== null) {
                    $firstChecked->forceFill(['checked' => true])->save();
                }
            }
        });

        if (ResourceUnlock::isNoteUnlocked($note)) {
            $note->load('items');
        }

        return new NoteResource($note);
    }

    public function unlock(Request $request, Note $note): NoteResource|JsonResponse
    {
        $this->authorize('update', $note);

        $data = $request->validate([
            'password' => ['required', 'string', 'max:72'],
        ]);

        if (! ResourceUnlock::attemptNote($note, $data['password'])) {
            return response()->json([
                'message' => 'პაროლი არასწორია.',
                'errors' => ['password' => ['პაროლი არასწორია.']],
            ], 422);
        }

        $note->load('items');

        return new NoteResource($note);
    }

    public function lock(Note $note): NoteResource
    {
        $this->authorize('update', $note);
        ResourceUnlock::lockNote($note);
        $note->unsetRelation('items');

        return new NoteResource($note);
    }

    public function destroy(Request $request, Note $note): JsonResponse
    {
        $this->authorize('delete', $note);

        if (ResourceUnlock::noteHasPassword($note)) {
            $data = $request->validate([
                'password' => ['required', 'string', 'max:72'],
            ]);

            if (! Hash::check($data['password'], (string) $note->password_hash)) {
                return response()->json([
                    'message' => 'პაროლი არასწორია.',
                    'errors' => ['password' => ['პაროლი არასწორია.']],
                ], 422);
            }
        }

        $note->delete();

        return response()->json(['ok' => true]);
    }
}
