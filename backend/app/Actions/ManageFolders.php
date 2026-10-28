<?php

namespace App\Actions;

use App\Models\Folder;
use App\Models\Note;
use App\Models\Sheet;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class ManageFolders
{
    public function save(User $user, array $data, ?Folder $folder = null): Folder
    {
        return DB::transaction(function () use ($user, $data, $folder) {
            // Serialize tree edits so concurrent reparenting cannot introduce cycles.
            User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            $type = $folder?->type ?? $data['type'];
            $parentId = $data['parent_id'] ?? null;
            if ($parentId !== null) {
                $parent = Folder::where('user_id', $user->id)->where('type', $type)->find($parentId);
                if (! $parent) {
                    throw ValidationException::withMessages(['parent_id' => 'საქაღალდე ვერ მოიძებნა.']);
                }
                while ($parent) {
                    if ($parent->id === $folder?->id) {
                        throw ValidationException::withMessages(['parent_id' => 'საქაღალდე საკუთარ ქვესაქაღალდეში ვერ გადავა.']);
                    }
                    $parent = $parent->parent_id ? Folder::find($parent->parent_id) : null;
                }
            }
            if ($folder) {
                $folder->update($data);

                return $folder->refresh();
            }

            return Folder::create([...$data, 'user_id' => $user->id]);
        });
    }

    public function delete(User $user, Folder $folder, bool $deleteContents, ?string $password): void
    {
        if ($deleteContents && (! $user->hasPassword() || ! Hash::check((string) $password, (string) $user->password))) {
            throw ValidationException::withMessages(['account_password' => 'წაშლისთვის მიუთითე ანგარიშის სწორი პაროლი.']);
        }
        DB::transaction(function () use ($user, $folder, $deleteContents) {
            User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            $ids = [$folder->id];
            $tree = Folder::where('user_id', $user->id)->get();
            for ($i = 0; $i < count($ids); $i++) {
                foreach ($tree as $child) {
                    if ($child->parent_id === $ids[$i]) {
                        $ids[] = $child->id;
                    }
                }
            }
            foreach ([Note::class, Sheet::class] as $model) {
                $items = $model::where('user_id', $user->id)->whereIn('folder_id', $ids);
                if ($deleteContents) {
                    // Delete through models to preserve share cleanup observers.
                    $items->get()->each(function ($item) {
                        $item->shares()->delete();
                        $item->delete();
                    });
                } else {
                    $items->update(['folder_id' => null]);
                }
            }
            Folder::where('user_id', $user->id)->whereIn('id', $ids)->delete();
        });
    }
}
