<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCustomColumnRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'sheet_id' => [$this->isMethod('post') ? 'required' : 'sometimes', 'integer'],
            'name' => [$this->isMethod('post') ? 'required' : 'sometimes', 'string', 'max:80'],
            'type' => [$this->isMethod('post') ? 'required' : 'sometimes', Rule::in(['number', 'text', 'select', 'status', 'date', 'formula'])],
            'options' => ['nullable', 'array'],
            'options.*' => ['string', 'max:80'],
            'formula' => ['nullable', 'string', 'max:255'],
            'role' => ['nullable', 'string', Rule::in(['payable', 'paid', 'remaining'])],
            'summable' => ['nullable', 'boolean'],
            'position' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
