<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreFolderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => [$this->isMethod('post') ? 'required' : 'sometimes', 'string', 'max:120'],
            'type' => [$this->isMethod('post') ? 'required' : 'prohibited', Rule::in(['notes', 'tables'])],
            'parent_id' => ['sometimes', 'nullable', 'integer'],
        ];
    }
}
