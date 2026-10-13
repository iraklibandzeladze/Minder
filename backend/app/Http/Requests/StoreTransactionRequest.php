<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTransactionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:180'],
            'amount' => ['required', 'numeric'],
            'amount_paid' => ['nullable', 'numeric'],
            'currency' => ['nullable', 'string', 'max:8'],
            'type' => ['nullable', Rule::in(['expense', 'income', 'transfer'])],
            'status' => ['nullable', Rule::in(['paid', 'pending', 'partial'])],
            'occurred_on' => ['nullable', 'date'],
            'sheet_id' => ['nullable', 'integer'],
            'account_id' => ['nullable', 'integer'],
            'category_id' => ['nullable', 'integer'],
            'related_account_id' => ['nullable', 'integer'],
            'notes' => ['nullable', 'string'],
            'custom_fields' => ['nullable', 'array'],
        ];
    }
}
