<?php

namespace App\Providers;

use App\Models\Note;
use App\Models\Sheet;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Relation::enforceMorphMap([
            'note' => Note::class,
            'sheet' => Sheet::class,
        ]);
    }
}
