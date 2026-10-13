<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\SheetRowResource;
use App\Models\Sheet;
use App\Models\SheetRow;
use App\Support\ResourceUnlock;
use App\Support\ShareAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class SheetRowController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $data = $request->validate([
            'sheet_id' => ['required', 'integer'],
            'year_month' => ['nullable', 'regex:/^\d{4}-\d{2}$/'],
        ]);

        $sheet = ShareAccess::sheetQueryFor($request->user())->whereKey($data['sheet_id'])->firstOrFail();
        ResourceUnlock::abortUnlessSheetUnlocked($sheet, $request->user());

        $query = $sheet->rows()->where('user_id', $sheet->user_id);

        $isMonthly = in_array($sheet->kind, ['monthly_expenses', 'table'], true);

        if ($isMonthly && ! empty($data['year_month'])) {
            $query->where('year_month', $data['year_month']);
        } elseif ($sheet->kind === 'calculator') {
            // Continuous sheet — ignore year_month filter.
        } elseif (! empty($data['year_month'])) {
            $query->where(function ($q) use ($data) {
                $q->whereNull('year_month')->orWhere('year_month', $data['year_month']);
            });
        }

        return SheetRowResource::collection($query->orderBy('position')->orderBy('id')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'sheet_id' => ['required', 'integer'],
            'title' => ['nullable', 'string', 'max:180'],
            'values' => ['nullable', 'array'],
            'notes' => ['nullable', 'string'],
            'year_month' => ['nullable', 'regex:/^\d{4}-\d{2}$/'],
        ]);

        $sheet = ShareAccess::sheetQueryFor($request->user())->whereKey($data['sheet_id'])->firstOrFail();
        abort_unless(ShareAccess::canEdit($request->user(), $sheet), 403);
        ResourceUnlock::abortUnlessSheetUnlocked($sheet, $request->user());

        $row = SheetRow::query()->create([
            'user_id' => $sheet->user_id,
            'sheet_id' => $sheet->id,
            'title' => $data['title'] ?? '',
            'values' => $data['values'] ?? [],
            'notes' => $data['notes'] ?? null,
            'year_month' => $data['year_month'] ?? null,
            'position' => (int) $sheet->rows()->max('position') + 1,
        ]);

        return (new SheetRowResource($row))->response()->setStatusCode(201);
    }

    public function update(Request $request, SheetRow $sheetRow): SheetRowResource
    {
        $sheet = $sheetRow->sheet;
        abort_unless($sheet instanceof Sheet, 404);
        abort_unless(ShareAccess::canEdit($request->user(), $sheet), 403);
        ResourceUnlock::abortUnlessSheetUnlocked($sheet, $request->user());

        $data = $request->validate([
            'title' => ['sometimes', 'nullable', 'string', 'max:180'],
            'values' => ['sometimes', 'array'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'reminder_at' => ['sometimes', 'nullable', 'date'],
            'year_month' => ['sometimes', 'nullable', 'regex:/^\d{4}-\d{2}$/'],
            'position' => ['sometimes', 'integer', 'min:0'],
        ]);

        if (array_key_exists('values', $data) && is_array($data['values'])) {
            $data['values'] = array_merge($sheetRow->values ?? [], $data['values']);
        }

        if (array_key_exists('reminder_at', $data)) {
            $data['reminder_sent_at'] = null;
        }

        $sheetRow->update($data);

        return new SheetRowResource($sheetRow->refresh());
    }

    public function destroy(Request $request, SheetRow $sheetRow): JsonResponse
    {
        $sheet = $sheetRow->sheet;
        abort_unless($sheet instanceof Sheet, 404);
        abort_unless(ShareAccess::canEdit($request->user(), $sheet), 403);
        ResourceUnlock::abortUnlessSheetUnlocked($sheet, $request->user());
        $sheetRow->delete();

        return response()->json(['ok' => true]);
    }
}
