<?php

namespace App\Services;

use App\Models\Account;
use App\Models\Category;
use App\Models\User;

class QuickEntryParser
{
    /**
     * @return array{
     *     amount: float|null,
     *     currency: string|null,
     *     status: string|null,
     *     account_id: int|null,
     *     account_name: string|null,
     *     category_id: int|null,
     *     category_name: string|null,
     *     title: string|null,
     *     raw: string,
     *     unmatched: list<string>
     * }
     */
    public function parse(User $user, string $input): array
    {
        $raw = trim($input);
        $remaining = $raw;

        $amount = null;
        if (preg_match('/(\d+(?:[.,]\d+)?)/u', $remaining, $amountMatch)) {
            $amount = (float) str_replace(',', '.', $amountMatch[1]);
            $remaining = $this->removeFirst($remaining, $amountMatch[0]);
        }

        $currency = 'GEL';
        if (preg_match('/\b(GEL|USD|EUR|₾|\$)\b/ui', $remaining, $currencyMatch)) {
            $currency = $this->normalizeCurrency($currencyMatch[1]);
            $remaining = $this->removeFirst($remaining, $currencyMatch[0]);
        }

        $status = 'pending';
        $statusMap = [
            'paid' => 'paid',
            'pending' => 'pending',
            'partial' => 'partial',
            'გადახდილი' => 'paid',
            'მოლოდინში' => 'pending',
            'ნაწილობრივი' => 'partial',
            'ნაწილობრივ' => 'partial',
        ];

        foreach ($statusMap as $keyword => $value) {
            if (preg_match('/\b'.preg_quote($keyword, '/').'\b/ui', $remaining)) {
                $status = $value;
                $remaining = preg_replace('/\b'.preg_quote($keyword, '/').'\b/ui', ' ', $remaining) ?? $remaining;
                break;
            }
        }

        $accounts = $user->accounts()->whereNull('archived_at')->get(['id', 'name']);
        $account = $this->matchNamed($remaining, $accounts->all(), fn (Account $a) => $a->name);
        if ($account) {
            $remaining = $this->removeFirst($remaining, $account['matched']);
        }

        $categories = $user->categories()->get(['id', 'name']);
        $category = $this->matchNamed($remaining, $categories->all(), fn (Category $c) => $c->name);
        if ($category) {
            $remaining = $this->removeFirst($remaining, $category['matched']);
        }

        $title = trim(preg_replace('/\s+/u', ' ', $remaining) ?? '');
        $unmatched = $title === '' ? [] : (preg_split('/\s+/u', $title) ?: []);

        if ($title === '' && $category) {
            $title = $category['name'];
        }

        return [
            'amount' => $amount,
            'currency' => $currency,
            'status' => $status,
            'account_id' => $account['id'] ?? null,
            'account_name' => $account['name'] ?? null,
            'category_id' => $category['id'] ?? null,
            'category_name' => $category['name'] ?? null,
            'title' => $title !== '' ? $title : ($category['name'] ?? 'Quick entry'),
            'raw' => $raw,
            'unmatched' => $unmatched,
        ];
    }

    private function normalizeCurrency(string $value): string
    {
        return match (mb_strtoupper($value)) {
            '$', 'USD' => 'USD',
            'EUR' => 'EUR',
            default => 'GEL',
        };
    }

    /**
     * @template T of object
     * @param  list<T>  $items
     * @param  callable(T): string  $name
     * @return array{id:int,name:string,matched:string}|null
     */
    private function matchNamed(string $haystack, array $items, callable $name): ?array
    {
        $haystackLower = mb_strtolower($haystack);
        $best = null;
        $bestScore = 0;

        foreach ($items as $item) {
            $label = $name($item);
            $labelLower = mb_strtolower($label);
            if ($labelLower === '' || ! str_contains($haystackLower, $labelLower)) {
                continue;
            }

            $score = mb_strlen($label);
            if ($score > $bestScore) {
                $bestScore = $score;
                $best = [
                    'id' => (int) $item->id,
                    'name' => $label,
                    'matched' => $label,
                ];
            }
        }

        return $best;
    }

    private function removeFirst(string $haystack, string $needle): string
    {
        $pos = mb_stripos($haystack, $needle);
        if ($pos === false) {
            return $haystack;
        }

        return mb_substr($haystack, 0, $pos).' '.mb_substr($haystack, $pos + mb_strlen($needle));
    }
}
