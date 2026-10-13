<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTransactionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'max:180'],
            'amount' => ['sometimes', 'numeric'],
            'amount_paid' => ['sometimes', 'numeric'],
            'currency' => ['sometimes', 'string', 'max:8'],
            'type' => ['sometimes', Rule::in(['expense', 'income', 'transfer'])],
            'status' => ['sometimes', Rule::in(['paid', 'pending', 'partial'])],
            'occurred_on' => ['sometimes', 'date'],
            'account_id' => ['sometimes', 'nullable', 'integer'],
            'category_id' => ['sometimes', 'nullable', 'integer'],
            'related_account_id' => ['sometimes', 'nullable', 'integer'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'custom_fields' => ['sometimes', 'array'],
        ];
    }
}
