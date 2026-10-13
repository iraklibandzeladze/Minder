<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:80'],
            'currency' => ['required', 'string', 'max:8'],
            'opening_balance' => ['nullable', 'numeric'],
        ];
    }
}
