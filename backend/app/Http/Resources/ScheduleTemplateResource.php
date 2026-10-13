<?php

namespace App\Http\Resources;

use App\Models\ScheduleTemplate;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin ScheduleTemplate */
class ScheduleTemplateResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'color' => $this->color,
            'position' => (int) $this->position,
        ];
    }
}
