<?php

namespace App\Http\Resources;

use App\Models\RecurringTemplate;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin RecurringTemplate */
class RecurringTemplateResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'label' => $this->label,
            'amount' => $this->amount,
            'currency' => $this->currency,
            'type' => $this->type,
            'default_status' => $this->default_status,
            'cadence' => $this->cadence,
            'is_active' => $this->is_active,
            'account_id' => $this->account_id,
            'category_id' => $this->category_id,
            'account' => new AccountResource($this->whenLoaded('account')),
            'category' => new CategoryResource($this->whenLoaded('category')),
        ];
    }
}
