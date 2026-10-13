<?php

namespace App\Actions;

use App\Models\Sheet;
use App\Models\SheetRow;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class RolloverSheetRows
{
    /**
     * Copy previous month's rows into an empty target month (idempotent).
     *
     * @return int Number of rows created
     */
    public function handle(User $user, Sheet $sheet, string $yearMonth): int
    {
        if (! in_array($sheet->kind, ['monthly_expenses', 'table'], true)) {
            return 0;
        }

        $existing = $sheet->rows()
            ->where('user_id', $user->id)
            ->where('year_month', $yearMonth)
            ->count();

        if ($existing > 0) {
            return 0;
        }

        $previous = Carbon::createFromFormat('Y-m', $yearMonth)->subMonth()->format('Y-m');

        $sourceRows = $sheet->rows()
            ->where('user_id', $user->id)
            ->where('year_month', $previous)
            ->orderBy('position')
            ->orderBy('id')
            ->get();

        if ($sourceRows->isEmpty()) {
            return 0;
        }

        $created = 0;
        $basePosition = (int) $sheet->rows()->max('position');

        DB::transaction(function () use ($user, $sheet, $yearMonth, $sourceRows, $basePosition, &$created) {
            foreach ($sourceRows as $index => $source) {
                SheetRow::query()->create([
                    'user_id' => $user->id,
                    'sheet_id' => $sheet->id,
                    'title' => $source->title,
                    'values' => $source->values ?? [],
                    'notes' => $source->notes,
                    'year_month' => $yearMonth,
                    'position' => $basePosition + $index + 1,
                ]);
                $created++;
            }
        });

        return $created;
    }
}
