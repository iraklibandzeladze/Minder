<?php

namespace App\Http\Resources;

use App\Models\NoteItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin NoteItem */
class NoteItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'note_id' => $this->note_id,
            'body' => $this->body,
            'amount' => $this->amount === null ? null : (string) $this->amount,
            'checked' => (bool) $this->checked,
            'position' => (int) $this->position,
        ];
    }
}
