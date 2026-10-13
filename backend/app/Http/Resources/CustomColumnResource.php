<?php

namespace App\Http\Resources;

use App\Models\CustomColumn;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin CustomColumn */
class CustomColumnResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'sheet_id' => $this->sheet_id,
            'name' => $this->name,
            'slug' => $this->slug,
            'type' => $this->type,
            'options' => array_values(is_array($this->options) ? $this->options : []),
            'formula' => $this->formula,
            'role' => $this->role,
            'summable' => (bool) $this->summable,
            'position' => $this->position,
        ];
    }
}
