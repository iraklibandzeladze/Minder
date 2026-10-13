<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAccountRequest;
use App\Http\Resources\AccountResource;
use App\Models\Account;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class AccountController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        $accounts = $user->accounts()->orderBy('name')->get();

        $balances = DB::table('transactions')
            ->selectRaw("account_id, COALESCE(SUM(CASE
                WHEN type = 'income' THEN amount_paid
                WHEN type = 'expense' THEN -amount_paid
                ELSE 0
            END), 0) as movement")
            ->where('user_id', $user->id)
            ->whereNotNull('account_id')
            ->groupBy('account_id')
            ->pluck('movement', 'account_id');

        $accounts->each(function (Account $account) use ($balances) {
            $account->computed_balance = number_format(
                (float) $account->opening_balance + (float) ($balances[$account->id] ?? 0),
                2,
                '.',
                ''
            );
        });

        return AccountResource::collection($accounts);
    }

    public function store(StoreAccountRequest $request): JsonResponse
    {
        $account = $request->user()->accounts()->create($request->validated());

        return (new AccountResource($account))->response()->setStatusCode(201);
    }

    public function update(StoreAccountRequest $request, Account $account): AccountResource
    {
        $this->authorize('update', $account);
        $account->update($request->validated());

        return new AccountResource($account);
    }

    public function destroy(Account $account): JsonResponse
    {
        $this->authorize('delete', $account);
        $account->delete();

        return response()->json(['ok' => true]);
    }
}
