<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreNoteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $required = $this->isMethod('post') ? 'required' : 'sometimes';

        return [
            'title' => [$required, 'string', 'max:120'],
            'check_mode' => [$required, 'string', Rule::in(['checkbox', 'radio'])],
            'priced' => ['sometimes', 'boolean'],
            'position' => ['nullable', 'integer', 'min:0'],
            'password_protected' => ['sometimes', 'boolean'],
            'password' => [
                'nullable',
                'required_if:password_protected,true',
                'string',
                'min:4',
                'max:72',
                'confirmed',
            ],
        ];
    }
}
