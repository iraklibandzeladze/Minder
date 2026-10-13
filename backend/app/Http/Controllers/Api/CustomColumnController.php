<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCustomColumnRequest;
use App\Http\Resources\CustomColumnResource;
use App\Models\CustomColumn;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Str;

class CustomColumnController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = $request->user()->customColumns()->orderBy('position');

        if ($request->filled('sheet_id')) {
            $query->where('sheet_id', $request->integer('sheet_id'));
        }

        return CustomColumnResource::collection($query->get());
    }

    public function store(StoreCustomColumnRequest $request): JsonResponse
    {
        $data = $request->validated();
        $user = $request->user();
        $sheet = $user->sheets()->findOrFail($data['sheet_id']);

        $baseSlug = Str::slug($data['name']);
        if ($baseSlug === '') {
            $baseSlug = 'col_'.Str::lower(Str::random(6));
        }
        $slug = $baseSlug;
        $i = 1;
        while ($sheet->columns()->where('slug', $slug)->exists()) {
            $slug = $baseSlug.'-'.$i++;
        }

        $type = $data['type'];
        $role = $data['role'] ?? null;
        if ($role) {
            $sheet->columns()->where('role', $role)->update(['role' => null]);
        }

        $column = $user->customColumns()->create([
            'sheet_id' => $sheet->id,
            'name' => $data['name'],
            'slug' => $slug,
            'type' => $type,
            'options' => array_values($data['options'] ?? []),
            'formula' => $type === 'formula' ? ($data['formula'] ?? null) : null,
            'role' => $role,
            'summable' => (bool) ($data['summable'] ?? in_array($type, ['number', 'formula'], true)),
            'position' => $data['position'] ?? ((int) $sheet->columns()->max('position') + 1),
        ]);

        return (new CustomColumnResource($column))->response()->setStatusCode(201);
    }

    public function update(StoreCustomColumnRequest $request, CustomColumn $customColumn): CustomColumnResource
    {
        $this->authorize('update', $customColumn);
        $data = $request->safe()->only(['name', 'type', 'options', 'formula', 'role', 'summable', 'position']);

        if (array_key_exists('role', $data) && $data['role']) {
            CustomColumn::query()
                ->where('sheet_id', $customColumn->sheet_id)
                ->where('id', '!=', $customColumn->id)
                ->where('role', $data['role'])
                ->update(['role' => null]);
        }

        $customColumn->update($data);

        return new CustomColumnResource($customColumn);
    }

    public function reorder(Request $request): JsonResponse
    {
        $data = $request->validate([
            'sheet_id' => ['required', 'integer'],
            'ordered_ids' => ['required', 'array', 'min:1'],
            'ordered_ids.*' => ['integer'],
        ]);

        $sheet = $request->user()->sheets()->findOrFail($data['sheet_id']);

        foreach ($data['ordered_ids'] as $index => $id) {
            $sheet->columns()->where('id', $id)->where('user_id', $request->user()->id)->update([
                'position' => $index,
            ]);
        }

        return response()->json([
            'data' => CustomColumnResource::collection(
                $sheet->columns()->orderBy('position')->get()
            )->resolve(),
        ]);
    }

    public function destroy(CustomColumn $customColumn): JsonResponse
    {
        $this->authorize('delete', $customColumn);
        $customColumn->delete();

        return response()->json(['ok' => true]);
    }
}
