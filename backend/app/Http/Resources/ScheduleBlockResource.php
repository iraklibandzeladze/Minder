<?php

namespace App\Http\Resources;

use App\Models\ScheduleBlock;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin ScheduleBlock */
class ScheduleBlockResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'weekday' => (int) $this->weekday,
            'start_time' => $this->formatTime($this->start_time),
            'end_time' => $this->formatTime($this->end_time),
            'title' => $this->title,
            'schedule_template_id' => $this->schedule_template_id,
            'notes' => $this->notes,
            'position' => (int) $this->position,
            'template' => $this->whenLoaded('template', fn () => new ScheduleTemplateResource($this->template)),
        ];
    }

    private function formatTime(mixed $value): string
    {
        if ($value instanceof \DateTimeInterface) {
            return $value->format('H:i');
        }

        $raw = (string) $value;
        if (preg_match('/^(\d{2}:\d{2})/', $raw, $m)) {
            return $m[1];
        }

        return $raw;
    }
}
