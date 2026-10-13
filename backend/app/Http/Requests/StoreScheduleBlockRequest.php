<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreScheduleBlockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $required = $this->isMethod('post') ? 'required' : 'sometimes';
        $userId = $this->user()?->id;

        return [
            'weekday' => [$required, 'integer', 'min:1', 'max:7'],
            'start_time' => [$required, 'date_format:H:i'],
            'end_time' => [$required, 'date_format:H:i'],
            'title' => [$required, 'string', 'max:120'],
            'schedule_template_id' => [
                $required,
                'integer',
                Rule::exists('schedule_templates', 'id')->where(fn ($q) => $q->where('user_id', $userId)),
            ],
            'notes' => ['nullable', 'string', 'max:2000'],
            'position' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
