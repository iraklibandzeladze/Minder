<?php

namespace App\Http\Controllers\Api;

use App\Actions\CreateTransaction;
use App\Http\Controllers\Controller;
use App\Http\Requests\QuickEntryRequest;
use App\Http\Resources\TransactionResource;
use App\Services\QuickEntryParser;
use Illuminate\Http\JsonResponse;

class QuickEntryController extends Controller
{
    public function preview(QuickEntryRequest $request, QuickEntryParser $parser): JsonResponse
    {
        return response()->json([
            'parsed' => $parser->parse($request->user(), $request->validated('input')),
        ]);
    }

    public function store(QuickEntryRequest $request, QuickEntryParser $parser, CreateTransaction $create): JsonResponse
    {
        $parsed = $parser->parse($request->user(), $request->validated('input'));
        $yearMonth = $request->validated('year_month') ?? now()->format('Y-m');
        $occurredOn = $request->validated('occurred_on') ?? $yearMonth.'-'.now()->format('d');

        if (! str_starts_with($occurredOn, $yearMonth)) {
            $occurredOn = $yearMonth.'-01';
        }

        $transaction = $create->handle($request->user(), [
            'title' => $parsed['title'],
            'amount' => $parsed['amount'] ?? 0,
            'currency' => $parsed['currency'] ?? 'GEL',
            'status' => $parsed['status'] ?? 'pending',
            'account_id' => $parsed['account_id'],
            'category_id' => $parsed['category_id'],
            'occurred_on' => $occurredOn,
            'type' => 'expense',
        ]);

        return (new TransactionResource($transaction->load(['account', 'category'])))
            ->response()
            ->setStatusCode(201)
            ->setData([
                'data' => (new TransactionResource($transaction->load(['account', 'category'])))->resolve(),
                'parsed' => $parsed,
            ]);
    }
}
