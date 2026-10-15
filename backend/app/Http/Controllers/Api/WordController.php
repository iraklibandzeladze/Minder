<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpsertWordRequest;
use App\Http\Resources\WordResource;
use App\Models\User;
use App\Models\Word;
use App\Models\WordCategory;
use App\Support\PlanLimits;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class WordController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        /** @var User $user */
        $user = $request->user();
        PlanLimits::assertCanUseDictionary($user);

        $filters = [
            'english_word' => trim((string) $request->query('english', '')),
            'georgian_translation' => trim((string) $request->query('georgian', '')),
            'example_sentence_en' => trim((string) $request->query('example_en', '')),
            'example_sentence_ka' => trim((string) $request->query('example_ka', '')),
        ];

        $query = $user->words();

        foreach ($filters as $column => $value) {
            if ($value === '') {
                continue;
            }
            $like = '%'.addcslashes($value, '\\%_').'%';
            $query->where($column, 'ilike', $like);
        }

        $categoryId = (int) $request->query('category_id', 0);
        if ($categoryId > 0) {
            $query->whereHas('categories', function ($inner) use ($user, $categoryId) {
                $inner->where('word_categories.id', $categoryId)
                    ->where('word_categories.user_id', $user->id);
            });
        }

        $sort = (string) $request->query('sort', 'created_at');
        $dir = strtolower((string) $request->query('dir', 'desc')) === 'asc' ? 'asc' : 'desc';
        if (! in_array($sort, ['created_at', 'english_word', 'georgian_translation'], true)) {
            $sort = 'created_at';
        }

        if ($sort === 'english_word') {
            $query->orderByRaw('lower(english_word) '.$dir)->orderBy('id');
        } elseif ($sort === 'georgian_translation') {
            $query->orderBy('georgian_translation', $dir)->orderBy('id');
        } else {
            $query->orderBy('created_at', $dir)->orderBy('id', $dir);
        }

        return WordResource::collection($query->with('categories')->limit(80)->get());
    }

    public function store(UpsertWordRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        PlanLimits::assertCanCreateWord($user);

        $word = $user->words()->create($request->safe()->except(['category_ids']));
        $this->syncCategories($user, $word, $request->validated('category_ids') ?? []);
        $word->load('categories');

        return (new WordResource($word))->response()->setStatusCode(201);
    }

    public function update(UpsertWordRequest $request, Word $word): WordResource
    {
        $this->authorize('update', $word);
        PlanLimits::assertCanUseDictionary($request->user());
        $word->update($request->safe()->except(['category_ids']));
        $this->syncCategories($request->user(), $word, $request->validated('category_ids') ?? []);
        $word->load('categories');

        return new WordResource($word);
    }

    public function destroy(Word $word): JsonResponse
    {
        $this->authorize('delete', $word);
        PlanLimits::assertCanUseDictionary($request->user());
        $word->delete();

        return response()->json(['ok' => true]);
    }

    /**
     * @param  list<int>  $ids
     */
    private function syncCategories(User $user, Word $word, array $ids): void
    {
        $owned = WordCategory::query()
            ->where('user_id', $user->id)
            ->whereIn('id', $ids)
            ->pluck('id');
        $word->categories()->sync($owned);
    }
}
