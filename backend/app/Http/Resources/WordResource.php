<?php

namespace App\Http\Resources;

use App\Models\Word;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Word */
class WordResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'english_word' => $this->english_word,
            'georgian_translation' => $this->georgian_translation,
            'example_sentence_en' => $this->example_sentence_en,
            'example_sentence_ka' => $this->example_sentence_ka,
            'categories' => $this->whenLoaded('categories', function () {
                return $this->categories
                    ->map(fn ($category) => [
                        'id' => $category->id,
                        'name' => $category->name,
                    ])
                    ->values();
            }),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
