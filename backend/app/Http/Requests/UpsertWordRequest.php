<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpsertWordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'english_word' => trim((string) $this->input('english_word', '')),
            'georgian_translation' => trim((string) $this->input('georgian_translation', '')),
            'example_sentence_en' => $this->blankToNull('example_sentence_en'),
            'example_sentence_ka' => $this->blankToNull('example_sentence_ka'),
        ]);
    }

    public function rules(): array
    {
        return [
            'english_word' => ['required', 'string', 'max:180'],
            'georgian_translation' => ['required', 'string', 'max:4000'],
            'example_sentence_en' => ['nullable', 'string', 'max:4000'],
            'category_ids' => ['sometimes', 'array'],
            'category_ids.*' => ['integer'],
        ];
    }

    private function blankToNull(string $key): ?string
    {
        $value = trim((string) $this->input($key, ''));

        return $value === '' ? null : $value;
    }
}
