<?php

namespace App\Http\Requests;

use App\Support\ItemFolder;
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
            'folder_id' => ItemFolder::rules($this->user(), 'notes'),
            'is_pinned' => ['sometimes', 'boolean'],
            'title' => [$required, 'string', 'max:120'],
            'check_mode' => [$required, 'string', Rule::in(['checkbox', 'radio'])],
            'type' => ['sometimes', 'string', Rule::in(['checklist', 'rich_text'])],
            'content' => ['sometimes', 'nullable', 'string', 'max:1000000'],
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
