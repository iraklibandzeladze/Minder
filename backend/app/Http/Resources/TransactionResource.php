<?php

namespace App\Http\Resources;

use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Transaction */
class TransactionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'type' => $this->type,
            'amount' => $this->amount,
            'amount_paid' => $this->amount_paid,
            'remaining' => number_format((float) $this->amount - (float) $this->amount_paid, 2, '.', ''),
            'currency' => $this->currency,
            'status' => $this->status,
            'occurred_on' => $this->occurred_on?->toDateString(),
            'year_month' => $this->year_month,
            'notes' => $this->notes,
            'custom_fields' => $this->custom_fields ?? [],
            'account_id' => $this->account_id,
            'category_id' => $this->category_id,
            'related_account_id' => $this->related_account_id,
            'template_id' => $this->template_id,
            'account' => new AccountResource($this->whenLoaded('account')),
            'category' => new CategoryResource($this->whenLoaded('category')),
        ];
    }
}
