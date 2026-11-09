<?php

namespace App\Actions;

use App\Models\Sheet;
use App\Models\Transaction;
use App\Models\User;
use App\Support\PlanLimits;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DuplicateSheet
{
    public function handle(User $user, Sheet $source): Sheet
    {
        return DB::transaction(function () use ($user, $source) {
            // Serialize creation requests for this user when checking the plan limit.
            $user->newQuery()->whereKey($user->id)->lockForUpdate()->firstOrFail();
            PlanLimits::assertCanCreateSheet($user);

            $name = Str::substr($source->name, 0, 73).' (copy)';
            $baseSlug = Str::slug($name) ?: 'sheet_'.Str::lower(Str::random(6));
            $slug = $baseSlug;
            $suffix = 1;
            while ($user->sheets()->where('slug', $slug)->exists()) {
                $slug = $baseSlug.'-'.$suffix++;
            }

            $copy = $source->replicate();
            $copy->name = $name;
            $copy->slug = $slug;
            $copy->is_default = false;
            $copy->position = (int) $user->sheets()->max('position') + 1;
            $copy->save();

            foreach ([$source->columns(), $source->rows(), $source->transactions()] as $relation) {
                foreach ($relation->lazy(500) as $record) {
                    $item = $record->replicate();
                    $item->sheet_id = $copy->id;
                    // Recurring occurrences are unique per template/month; a copy is independent.
                    if ($item instanceof Transaction) {
                        $item->template_id = null;
                    }
                    $item->save();
                }
            }

            return $copy;
        });
    }
}
