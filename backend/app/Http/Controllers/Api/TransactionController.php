<?php

namespace App\Http\Controllers\Api;

use App\Actions\CreateTransaction;
use App\Actions\EnsureMonthRollover;
use App\Actions\UpdateTransaction;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTransactionRequest;
use App\Http\Requests\UpdateTransactionRequest;
use App\Http\Resources\TransactionResource;
use App\Models\Transaction;
use App\Support\ResourceUnlock;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class TransactionController extends Controller
{
    public function index(Request $request, EnsureMonthRollover $rollover): AnonymousResourceCollection
    {
        $yearMonth = $request->query('year_month', now()->format('Y-m'));
        $rollover->handle($request->user(), $yearMonth);

        if ($request->filled('sheet_id')) {
            $sheet = $request->user()->sheets()->findOrFail($request->integer('sheet_id'));
            ResourceUnlock::abortUnlessSheetUnlocked($sheet);
        }

        $query = $request->user()
            ->transactions()
            ->with(['account', 'category'])
            ->where('year_month', $yearMonth)
            ->orderBy('occurred_on')
            ->orderBy('id');

        if ($request->filled('sheet_id')) {
            $query->where('sheet_id', $request->integer('sheet_id'));
        }

        return TransactionResource::collection($query->get());
    }

    public function store(StoreTransactionRequest $request, CreateTransaction $create): JsonResponse
    {
        $data = $request->validated();
        if (! empty($data['sheet_id'])) {
            $sheet = $request->user()->sheets()->findOrFail($data['sheet_id']);
            ResourceUnlock::abortUnlessSheetUnlocked($sheet);
        }

        $transaction = $create->handle($request->user(), $data);

        return (new TransactionResource($transaction->load(['account', 'category'])))
            ->response()
            ->setStatusCode(201);
    }

    public function update(UpdateTransactionRequest $request, Transaction $transaction, UpdateTransaction $update): TransactionResource
    {
        $this->authorize('update', $transaction);
        if ($transaction->sheet_id) {
            $sheet = $request->user()->sheets()->find($transaction->sheet_id);
            if ($sheet) {
                ResourceUnlock::abortUnlessSheetUnlocked($sheet);
            }
        }

        return new TransactionResource($update->handle($transaction, $request->validated()));
    }

    public function destroy(Request $request, Transaction $transaction): JsonResponse
    {
        $this->authorize('delete', $transaction);
        if ($transaction->sheet_id) {
            $sheet = $request->user()->sheets()->find($transaction->sheet_id);
            if ($sheet) {
                ResourceUnlock::abortUnlessSheetUnlocked($sheet);
            }
        }
        $transaction->delete();

        return response()->json(['ok' => true]);
    }
}
