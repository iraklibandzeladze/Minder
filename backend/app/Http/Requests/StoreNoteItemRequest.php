<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreNoteItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'note_id' => [$this->isMethod('post') ? 'required' : 'sometimes', 'integer'],
            'body' => ['nullable', 'string', 'max:500'],
            'checked' => ['sometimes', 'boolean'],
            'position' => ['nullable', 'integer', 'min:0'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->exists('body') && $this->input('body') === null) {
            $this->merge(['body' => '']);
        }
    }
}
