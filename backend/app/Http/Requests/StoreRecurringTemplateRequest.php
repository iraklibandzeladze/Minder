<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRecurringTemplateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'label' => ['required', 'string', 'max:120'],
            'amount' => ['required', 'numeric'],
            'currency' => ['nullable', 'string', 'max:8'],
            'type' => ['nullable', Rule::in(['expense', 'income', 'transfer'])],
            'default_status' => ['nullable', Rule::in(['paid', 'pending', 'partial'])],
            'cadence' => ['nullable', 'string', 'max:32'],
            'account_id' => ['nullable', 'integer'],
            'category_id' => ['nullable', 'integer'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }
}
