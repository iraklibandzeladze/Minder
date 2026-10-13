<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScheduleBlock extends Model
{
    protected $fillable = [
        'user_id',
        'weekday',
        'start_time',
        'end_time',
        'title',
        'schedule_template_id',
        'notes',
        'position',
    ];

    protected function casts(): array
    {
        return [
            'weekday' => 'integer',
            'position' => 'integer',
            'schedule_template_id' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(ScheduleTemplate::class, 'schedule_template_id');
    }
}
