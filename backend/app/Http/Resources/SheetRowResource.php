<?php

namespace App\Http\Resources;

use App\Models\SheetRow;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin SheetRow */
class SheetRowResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'sheet_id' => $this->sheet_id,
            'title' => $this->title,
            'values' => $this->values ?? [],
            'notes' => $this->notes,
            'reminder_at' => optional($this->reminder_at)?->toIso8601String(),
            'reminder_sent_at' => optional($this->reminder_sent_at)?->toIso8601String(),
            'year_month' => $this->year_month,
            'position' => $this->position,
        ];
    }
}
