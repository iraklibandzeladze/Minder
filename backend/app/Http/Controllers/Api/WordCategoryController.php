<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\WordCategory;
use App\Support\PlanLimits;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WordCategoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        PlanLimits::assertCanUseDictionary($user);

        $categories = $user->wordCategories()->orderBy('name')->get(['id', 'name']);

        return response()->json(['data' => $categories]);
    }

    public function store(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        PlanLimits::assertCanUseDictionary($user);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80'],
        ]);
        $name = trim($data['name']);
        if ($name === '') {
            return response()->json(['message' => 'სახელი ცარიელია.'], 422);
        }

        $existing = $user->wordCategories()
            ->whereRaw('lower(name) = ?', [mb_strtolower($name)])
            ->first();
        if ($existing !== null) {
            return response()->json(['data' => $existing], 200);
        }

        $category = $user->wordCategories()->create(['name' => $name]);

        return response()->json(['data' => $category], 201);
    }

    public function destroy(Request $request, WordCategory $wordCategory): JsonResponse
    {
        $this->authorize('delete', $wordCategory);
        PlanLimits::assertCanUseDictionary($request->user());
        $wordCategory->delete();

        return response()->json(['ok' => true]);
    }
}
