<?php

namespace App\Actions;

use App\Models\User;
use Illuminate\Support\Str;

class SeedScheduleTemplates
{
    /**
     * @return array<string, int> slug => id
     */
    public function handle(User $user): array
    {
        $existing = $user->scheduleTemplates()->get()->keyBy('slug');
        if ($existing->isNotEmpty()) {
            return $existing->map(fn ($t) => (int) $t->id)->all();
        }

        $defaults = [
            ['slug' => 'sleep', 'name' => 'ძილი', 'color' => '#5b6b8a'],
            ['slug' => 'spiritual', 'name' => 'სულიერი', 'color' => '#7a6a9a'],
            ['slug' => 'physical', 'name' => 'ფიზიკური', 'color' => '#3d9a7a'],
            ['slug' => 'family', 'name' => 'ოჯახი', 'color' => '#c17a4a'],
            ['slug' => 'work', 'name' => 'სამუშაო', 'color' => '#3b82c4'],
            ['slug' => 'reading', 'name' => 'კითხვა', 'color' => '#b8860b'],
            ['slug' => 'leisure', 'name' => 'დასვენება', 'color' => '#6b8f71'],
        ];

        $map = [];
        foreach ($defaults as $i => $def) {
            $tpl = $user->scheduleTemplates()->create([
                'name' => $def['name'],
                'slug' => $def['slug'],
                'color' => $def['color'],
                'position' => $i,
            ]);
            $map[$def['slug']] = $tpl->id;
        }

        return $map;
    }

    public static function uniqueSlug(User $user, string $name, ?int $ignoreId = null): string
    {
        $base = Str::slug($name);
        if ($base === '') {
            $base = 'tpl_'.Str::lower(Str::random(6));
        }

        $slug = $base;
        $i = 1;
        while (
            $user->scheduleTemplates()
                ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
                ->where('slug', $slug)
                ->exists()
        ) {
            $slug = $base.'-'.$i++;
        }

        return $slug;
    }
}
