<?php

namespace App\Actions;

use App\Models\CustomColumn;
use App\Models\Sheet;

class SeedSheetDefaults
{
    public function handle(Sheet $sheet): void
    {
        if ($sheet->kind === 'monthly_expenses') {
            $this->createColumn($sheet, 'გადასახდელი', 'amount', 'number', [], true, 0, null, 'payable');
            $this->createColumn($sheet, 'გადახდილი', 'paid', 'number', [], true, 1, null, 'paid');
            $this->createColumn($sheet, 'დარჩენილი', 'remaining', 'formula', [], true, 2, '=amount-paid', 'remaining');
            $this->createColumn($sheet, 'სტატუსი', 'status', 'status', [
                'მოლოდინში',
                'ნაწილობრივი',
                'გადახდილი',
            ], false, 3, null, null);

            return;
        }

        if ($sheet->kind === 'calculator') {
            $this->createColumn($sheet, 'რაოდენობა', 'qty', 'number', [], false, 0, null, null);
            $this->createColumn($sheet, 'ფასი', 'price', 'number', [], false, 1, null, null);
            $this->createColumn($sheet, 'ჯამი', 'total', 'formula', [], true, 2, '=qty*price', null);
        }
    }

    /**
     * @param  list<string>  $options
     */
    private function createColumn(
        Sheet $sheet,
        string $name,
        string $slug,
        string $type,
        array $options,
        bool $summable,
        int $position,
        ?string $formula,
        ?string $role,
    ): void {
        CustomColumn::query()->create([
            'user_id' => $sheet->user_id,
            'sheet_id' => $sheet->id,
            'name' => $name,
            'slug' => $slug,
            'type' => $type,
            'options' => $options,
            'formula' => $formula,
            'role' => $role,
            'summable' => $summable,
            'position' => $position,
        ]);
    }
}
