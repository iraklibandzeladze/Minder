<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class QuickEntryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'input' => ['required', 'string', 'max:500'],
            'year_month' => ['nullable', 'regex:/^\d{4}-\d{2}$/'],
            'occurred_on' => ['nullable', 'date'],
        ];
    }
}
