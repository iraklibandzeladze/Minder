<?php

namespace App\Http\Controllers\Api;

use App\Actions\EnsureMonthRollover;
use App\Http\Controllers\Controller;
use App\Models\MonthNote;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MonthController extends Controller
{
    public function show(Request $request, EnsureMonthRollover $rollover): JsonResponse
    {
        $yearMonth = $request->query('year_month', now()->format('Y-m'));
        $user = $request->user();
        $created = $rollover->handle($user, $yearMonth);

        $note = MonthNote::query()->firstOrCreate(
            ['user_id' => $user->id, 'year_month' => $yearMonth],
            ['body' => '']
        );

        $rows = $user->transactions()->where('year_month', $yearMonth)->get();

        $total = (float) $rows->where('type', 'expense')->sum('amount');
        $paid = (float) $rows->where('type', 'expense')->sum('amount_paid');
        $income = (float) $rows->where('type', 'income')->sum('amount_paid');

        return response()->json([
            'year_month' => $yearMonth,
            'rollover_created' => $created,
            'note' => [
                'id' => $note->id,
                'year_month' => $note->year_month,
                'body' => $note->body,
            ],
            'totals' => [
                'expense_total' => number_format($total, 2, '.', ''),
                'expense_paid' => number_format($paid, 2, '.', ''),
                'expense_remaining' => number_format($total - $paid, 2, '.', ''),
                'income_paid' => number_format($income, 2, '.', ''),
            ],
        ]);
    }

    public function updateNote(Request $request): JsonResponse
    {
        $data = $request->validate([
            'year_month' => ['required', 'regex:/^\d{4}-\d{2}$/'],
            'body' => ['nullable', 'string'],
        ]);

        $note = MonthNote::query()->updateOrCreate(
            ['user_id' => $request->user()->id, 'year_month' => $data['year_month']],
            ['body' => $data['body'] ?? '']
        );

        $this->authorize('update', $note);

        return response()->json([
            'id' => $note->id,
            'year_month' => $note->year_month,
            'body' => $note->body,
        ]);
    }
}
